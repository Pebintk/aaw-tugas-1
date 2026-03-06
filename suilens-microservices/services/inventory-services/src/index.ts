import { Elysia } from 'elysia';
// import { startConsumer } from './consumer';

const app = new Elysia()
  .get('/health', () => ({ status: 'ok', service: 'inventory-service' }))
  .listen(3004);

// startConsumer().catch(console.error);

console.log(`Inventory Service running on port ${app.server?.port}`);
