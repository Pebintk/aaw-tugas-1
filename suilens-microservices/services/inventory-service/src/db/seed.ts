import { db } from './index';
import { branches, inventory } from './schema';

const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3001';

interface CatalogLens {
  id: string;
  modelName: string;
  manufacturerName: string;
}

const inventoryTemplate = [
  // Cabang Selatan (Stok Banyak)
  { modelName: 'Summilux-M 35mm f/1.4 ASPH.', branchCode: 'KB-JKT-S', total: 5, available: 5 },
  { modelName: 'Art 24-70mm f/2.8 DG DN', branchCode: 'KB-JKT-S', total: 4, available: 4 },
  { modelName: 'NIKKOR Z 70-200mm f/2.8 VR S', branchCode: 'KB-JKT-S', total: 3, available: 3 },

  // Cabang Timur (Stok Menengah)
  { modelName: 'Summilux-M 35mm f/1.4 ASPH.', branchCode: 'KB-JKT-E', total: 2, available: 2 },
  { modelName: 'Art 24-70mm f/2.8 DG DN', branchCode: 'KB-JKT-E', total: 2, available: 2 },

  // Cabang Utara (Stok Sedikit)
  { modelName: 'Art 24-70mm f/2.8 DG DN', branchCode: 'KB-JKT-N', total: 1, available: 1 },
  { modelName: 'NIKKOR Z 70-200mm f/2.8 VR S', branchCode: 'KB-JKT-N', total: 1, available: 0 }, 
];

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

  // 3. Build and seed inventory rows
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
  await db.insert(inventory).values(seedInventory).onConflictDoNothing();
  console.log(`Seeded ${seedInventory.length} inventory records.`);

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
