import { eq, and } from 'drizzle-orm/sql/expressions/conditions';
import { db } from './index';
import { branches, inventory } from './schema';

const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3001';

interface CatalogLens {
  id: string;
  modelName: string;
  manufacturerName: string;
}

const seedBranches = [
  { code: 'KB-JKT-S', name: 'Suilens - Jakarta Selatan', address: 'Kebayoran Baru, Jakarta Selatan' }, //Main Branch, stock banyak
  { code: 'KB-JKT-E', name: 'Suilens - jakarta Timur', address: 'Jatinegara, Jakarta Timur' }, //Secondary Branch
  { code: 'KB-JKT-N', name: 'Suilens - Jakarta Utara', address: 'Kelapa Gading, Jakarta Utara' }, //New Branch, stock sedikit
];

async function fetchLenses(): Promise<CatalogLens[]> {
  const res = await fetch(`${CATALOG_SERVICE_URL}/api/lenses`);
  if (!res.ok) {
    throw new Error(`Failed to fetch lenses from catalog-service: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<CatalogLens[]>;
}

async function seed() {
  const lenses = await fetchLenses();
  const lensIdByModel = new Map(lenses.map((l) => [l.modelName, l.id]));
  console.log(`Fetched ${lenses.length} lenses.`);

  console.log('Seeding branches...');
  await db.insert(branches).values(seedBranches).onConflictDoNothing({target: branches.code});
  console.log(`Seeded ${seedBranches.length} branches.`);

  const seedInventory: any[] = [];
  
  lenses.forEach((lens) => {  
    seedInventory.push({
      lensId: lens.id,
      branchCode: 'KB-JKT-S',
      totalQuantity: 5,
      availableQuantity: 5
    });
    seedInventory.push({
      lensId: lens.id,
      branchCode: 'KB-JKT-E',
      totalQuantity: 3,
      availableQuantity: 3
    });
    seedInventory.push({
      lensId: lens.id,
      branchCode: 'KB-JKT-N',
      totalQuantity: 2,
      availableQuantity: 2
    });
  });

  console.log('Seeding inventory...');
  for (const row of seedInventory) {
    // Cek apakah data sudah ada
    const existing = await db.select().from(inventory)
      .where(
        and(
          eq(inventory.lensId, row.lensId), 
          eq(inventory.branchCode, row.branchCode)
        )
      );

    // Jika belum ada, baru di-insert
    if (existing.length === 0) {
      await db.insert(inventory).values(row);
    }
  }
  console.log(`Seeded ${seedInventory.length} inventory records.`);

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
