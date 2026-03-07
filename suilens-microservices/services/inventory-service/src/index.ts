import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { branches, inventory, reservations } from './db/schema';
import { eq, and } from 'drizzle-orm';


const app = new Elysia()   
  .use(cors())

  // Available Branches
  .get('/api/branches', async () => db.select().from(branches))

  // Available Reservations, optionally filtered by branchCode or lensId
  .get('/api/reservations', async ({ query }) => {
    const conditions = [];
    if (query.branchCode) {
      conditions.push(eq(reservations.branchCode, query.branchCode));
    }
    if (query.lensId) {
      conditions.push(eq(reservations.lensId, query.lensId));
    }    
    if (conditions.length > 0) {
      return db.select().from(reservations).where(and(...conditions));
    }
    return db.select().from(reservations);
  }, {
    query: t.Object({
      branchCode: t.Optional(t.String()),
      lensId: t.Optional(t.String({ format: 'uuid' })),
    }),
  })

  // Each Branch available inventory, optionally filtered by branchCode
  .get('/api/inventory/branch', async ({ query }) => {
    if (query.branchCode) {
      return db.select().from(inventory).where(eq(inventory.branchCode, query.branchCode));
    }
    return db.select().from(inventory);
  }, {
    query: t.Object({ branchCode: t.Optional(t.String()) }),
  })

  // Stock for a specific lens across all branches (joins branch metadata)
  .get('/api/inventory/lenses/:lensId', async ({ params }) => {
    return db
      .select({
        inventoryId: inventory.id,
        lensId: inventory.lensId,
        branchCode: inventory.branchCode,
        branchName: branches.name,
        branchAddress: branches.address,
        totalQuantity: inventory.totalQuantity,
        availableQuantity: inventory.availableQuantity,
        updatedAt: inventory.updatedAt,
      })
      .from(inventory)
      .innerJoin(branches, eq(inventory.branchCode, branches.code))
      .where(eq(inventory.lensId, params.lensId));
  })

  // Reserve lenses for an order
  // Called synchronously by Order Service when an order is placed.
  .post('/api/inventory/reserve', async ({ body, set }) => {
    const { orderId, lensId, branchCode, quantity } = body;

    const result = await db.transaction(async (tx) => {
      // If there are duplicate reservations for the same order -> reject
      const [existing] = await tx.select().from(reservations)
        .where(eq(reservations.orderId, orderId));
      if (existing) {
        return { _err: 'DUPLICATE' as const, message: 'Reservation already exists for this order' };
      }

      // Fetch the inventory row
      const [item] = await tx.select().from(inventory)
        .where(and(eq(inventory.lensId, lensId), eq(inventory.branchCode, branchCode)));
      if (!item) {
        return { _err: 'NOT_FOUND' as const, message: 'No inventory found for the given lens and branch' };
      }

      if (item.availableQuantity < quantity) {
        return {
          _err: 'INSUFFICIENT_STOCK' as const,
          message: `Insufficient stock. Available: ${item.availableQuantity}, requested: ${quantity}`,
          available: item.availableQuantity,
        };
      }

      // Decrement available quantity
      await tx.update(inventory)
        .set({ availableQuantity: item.availableQuantity - quantity, updatedAt: new Date() })
        .where(eq(inventory.id, item.id));

      // Create reservation record
      const [reservation] = await tx.insert(reservations)
        .values({ orderId, lensId, branchCode, quantity })
        .returning();

      return { _ok: true as const, reservation };
    });

    if ('_err' in result) {
      set.status = result._err === 'NOT_FOUND' ? 404 : 409;
      const { _err, ...rest } = result;
      return rest;
    }

    set.status = 201;
    return result.reservation;
  }, {
    body: t.Object({
      orderId: t.String({ format: 'uuid' }),
      lensId: t.String({ format: 'uuid' }),
      branchCode: t.String(),
      quantity: t.Integer({ minimum: 1 }),
    }),
  })

  // Release a reservation (called by Order Service when an order is cancelled or expires)
  .post('/api/inventory/release', async ({ body, set }) => {
    const { orderId } = body;

    const result = await db.transaction(async (tx) => {
      // Fetch the reservation
      const [reservation] = await tx.select().from(reservations)
        .where(eq(reservations.orderId, orderId));
      if (!reservation) {
        return { _err: 'NOT_FOUND' as const, message: 'No reservation found for this order ID' };
      }
      if (reservation.status === 'released') {
        return { _err: 'ALREADY_RELEASED' as const, message: 'Stock for this order has already been released' };
      }

      const [item] = await tx.select().from(inventory)
        .where(and(
          eq(inventory.lensId, reservation.lensId),
          eq(inventory.branchCode, reservation.branchCode),
        ));
      if (!item) {
        return { _err: 'NOT_FOUND' as const, message: 'Inventory record not found' };
      }

      // Restore quantity, capped at totalQuantity
      const newAvailable = Math.min(item.availableQuantity + reservation.quantity, item.totalQuantity);
      await tx.update(inventory)
        .set({ availableQuantity: newAvailable, updatedAt: new Date() })
        .where(eq(inventory.id, item.id));

      const [updated] = await tx.update(reservations)
        .set({ status: 'released', updatedAt: new Date() })
        .where(eq(reservations.id, reservation.id))
        .returning();

      return { _ok: true as const, reservation: updated };
    });

    if ('_err' in result) {
      set.status = result._err === 'ALREADY_RELEASED' ? 409 : 404;
      const { _err, ...rest } = result;
      return rest;
    }

    return result.reservation;
  }, {
    body: t.Object({
      orderId: t.String({ format: 'uuid' }),
    }),
  })
  
  .get('/health', () => ({ status: 'ok', service: 'inventory-service' }))
  .listen(3004);
  
  // startConsumer().catch(console.error);

console.log(`Inventory Service running on port ${app.server?.port}`);
