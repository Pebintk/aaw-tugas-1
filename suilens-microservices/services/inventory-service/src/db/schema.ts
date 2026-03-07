// services/inventory-service/src/db/schema.ts
import { pgTable, uuid, varchar, integer, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';

export const reservationStatusEnum = pgEnum('reservation_status', ['reserved', 'released']);

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).unique().notNull(), // e.g. 'KB-JKT-S'
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 500 }).notNull(),
});

export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  lensId: uuid('lens_id').notNull(), // ID from Catalog Service (no FK cross-service)
  branchCode: varchar('branch_code', { length: 20 }).references(() => branches.code).notNull(),
  totalQuantity: integer('total_quantity').notNull().default(0),
  availableQuantity: integer('available_quantity').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
},(t) => ({
  // Mencegah duplikasi lensa yang sama di cabang yang sama
  unq: unique().on(t.lensId, t.branchCode), 
}));

export const reservations = pgTable('reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().unique(),
  lensId: uuid('lens_id').notNull(),
  branchCode: varchar('branch_code', { length: 20 }).notNull(),
  quantity: integer('quantity').notNull(),
  status: reservationStatusEnum('status').notNull().default('reserved'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});