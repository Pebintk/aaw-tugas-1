import amqplib from 'amqplib';
import { db } from './db';
import { inventory, reservations } from './db/schema';
import { eq, and } from 'drizzle-orm';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'suilens.events';
const QUEUE_NAME = 'inventory-service.order-events';

/**
 * Idempotent stock release for a single order.
 * Processing the same orderId twice has no side-effects because
 * we check reservation.status === 'released' before acting.
 */
async function releaseStockForOrder(orderId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [reservation] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.orderId, orderId));

    // Idempotency guard: nothing to do if there is no reservation or it is
    // already in the released state.
    if (!reservation || reservation.status === 'released') {
      return;
    }

    const [item] = await tx
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.lensId, reservation.lensId),
          eq(inventory.branchCode, reservation.branchCode),
        ),
      );

    if (!item) {
      // Inventory row missing — mark reservation released anyway so we don't
      // keep re-processing the event.
      await tx
        .update(reservations)
        .set({ status: 'released', updatedAt: new Date() })
        .where(eq(reservations.id, reservation.id));
      return;
    }

    // Restore quantity, capped at totalQuantity to prevent overshooting.
    const newAvailable = Math.min(
      item.availableQuantity + reservation.quantity,
      item.totalQuantity,
    );

    await tx
      .update(inventory)
      .set({ availableQuantity: newAvailable, updatedAt: new Date() })
      .where(eq(inventory.id, item.id));

    await tx
      .update(reservations)
      .set({ status: 'released', updatedAt: new Date() })
      .where(eq(reservations.id, reservation.id));
  });
}

export async function startConsumer(): Promise<void> {
  const connection = await amqplib.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'order.cancelled');

  // Process one message at a time so DB transactions don't race.
  channel.prefetch(1);

  console.log(`Inventory Service listening on queue: ${QUEUE_NAME}`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString()) as {
        event: string;
        data: { orderId: string; lensId: string; branchCode: string; quantity: number };
      };

      console.log(`Received event: ${event.event}`, event.data);

      if (event.event === 'order.cancelled') {
        const { orderId } = event.data;
        await releaseStockForOrder(orderId);
        console.log(`Stock released for cancelled order ${orderId}`);
      }

      channel.ack(msg);
    } catch (error) {
      console.error('Error processing message:', error);
      // Requeue once; if it keeps failing the broker will dead-letter it.
      channel.nack(msg, false, true);
    }
  });
}
