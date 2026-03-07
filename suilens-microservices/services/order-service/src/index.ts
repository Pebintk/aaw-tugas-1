import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { orders } from './db/schema';
import { eq } from 'drizzle-orm';
import { publishEvent } from './events';

const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';

interface CatalogLens {
  id: string;
  modelName: string;
  manufacturerName: string;
  dayPrice: string;
}

const app = new Elysia()
  .use(cors())
  .post('/api/orders', async ({ body, set }) => {
    const lensResponse = await fetch(`${CATALOG_SERVICE_URL}/api/lenses/${body.lensId}`);
    if (!lensResponse.ok) {
      set.status = 404;
      return { error: 'Lens not found' };
    }
    const lens = await lensResponse.json() as CatalogLens;

    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) {
      set.status = 400;
      return { error: 'End date must be after start date' };
    }
    const totalPrice = (days * parseFloat(lens.dayPrice)).toFixed(2);

    const [order] = await db.insert(orders).values({
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      lensId: body.lensId,
      lensSnapshot: {
        modelName: lens.modelName,
        manufacturerName: lens.manufacturerName,
        dayPrice: lens.dayPrice,
      },
      branchCode: body.branchCode,
      startDate: start,
      endDate: end,
      totalPrice,
      status: 'pending',
    }).returning();
    if (!order) {
      set.status = 500;
      return { error: 'Failed to create order' };
    }

    const reservationResponse = await fetch(`${INVENTORY_SERVICE_URL}/api/inventory/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        lensId: body.lensId,
        branchCode: body.branchCode,
        startDate: body.startDate,
        endDate: body.endDate,
        quantity: 1,
      }),
    });

    if (!reservationResponse.ok) {
      // Reservation failed — mark the order as cancelled and surface the reason
      await db.update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.id, order.id));

      const errBody = await reservationResponse.json() as { message?: string };
      const isNotFound = reservationResponse.status === 404;
      set.status = isNotFound ? 404 : 409;
      return {
        error: isNotFound
          ? `Branch '${body.branchCode}' does not have this type of lens`
          : (errBody.message ?? 'Insufficient stock at the selected branch'),
      };
    }

    const [confirmed] = await db.update(orders)
      .set({ status: 'confirmed' })
      .where(eq(orders.id, order.id))
      .returning();

    await publishEvent('order.placed', {
      orderId: confirmed!.id,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      lensName: lens.modelName,
      branchCode: body.branchCode,
    });

    set.status = 201;
    return confirmed;
  }, {
    body: t.Object({
      customerName: t.String(),
      customerEmail: t.String({ format: 'email' }),
      lensId: t.String({ format: 'uuid' }),
      branchCode: t.String({ minLength: 1 }),
      startDate: t.String(),
      endDate: t.String(),
    }),
  })

  .get('/api/orders', async () => db.select().from(orders))
  .get('/api/orders/:id', async ({ params, set }) => {
    const results = await db.select().from(orders).where(eq(orders.id, params.id));
    if (!results[0]) {
      set.status = 404;
      return { error: 'Order not found' };
    }
    return results[0];
  })

  .patch('/api/orders/:id/cancel', async ({ params, set  }) => {
    const [order] = await db.select()
    .from(orders)
    .where(eq(orders.id, params.id));

    if (!order) {
      set.status = 404;
      return { error: 'Order not found' };
    }

    if (order.status === 'confirmed' || order.status === 'active') {
      await fetch(`${INVENTORY_SERVICE_URL}/api/inventory/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
    } else {
      set.status = 409;
      return { error: `Order has already cancelled with status: ${order.status}` };
    }

    const [updated] = await db.update(orders)
      .set({ status: 'cancelled' })
      .where(eq(orders.id, params.id))
      .returning();

    await publishEvent('order.cancelled', {
      orderId: updated!.id,
      customerName: updated!.customerName,
      customerEmail: updated!.customerEmail,
      branchCode: updated!.branchCode,
    });

    return updated;
  })
  .get('/health', () => ({ status: 'ok', service: 'order-service' }))
  .listen(3002);

console.log(`Order Service running on port ${app.server?.port}`);
