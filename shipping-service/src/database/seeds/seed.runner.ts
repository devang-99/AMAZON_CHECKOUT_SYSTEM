import { DataSource } from 'typeorm';
import { seedInventory } from './inventory.seed';

export async function runSeeds(dataSource: DataSource) {
  console.log('Running database seeds...');

  await seedInventory(dataSource);

  console.log('All seeds completed');
}
