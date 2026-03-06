import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { branches, inventory, reservations } from './db/schema';
import { eq, and } from 'drizzle-orm';


const app = new Elysia()   
  .use(cors())

  // Available Branches
  .get('/api/branches', async () => db.select().from(branches))

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

  .get('/health', () => ({ status: 'ok', service: 'inventory-service' }))
  .listen(3004);
  
  // startConsumer().catch(console.error);

console.log(`Inventory Service running on port ${app.server?.port}`);
