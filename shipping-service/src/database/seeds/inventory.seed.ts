import { DataSource } from 'typeorm';
import { InventoryEntity } from '../../shipping/entities/inventory.entity';

export async function seedInventory(dataSource: DataSource) {
  const repo = dataSource.getRepository(InventoryEntity);

  const seedData = [
    { productId: 'product-1', quantityAvailable: 100 },
    { productId: 'product-2', quantityAvailable: 50 },
    { productId: 'product-3', quantityAvailable: 75 },
  ];

  for (const item of seedData) {
    const existing = await repo.findOne({
      where: { productId: item.productId },
    });

    if (!existing) {
      await repo.save(repo.create(item));
    } else {
      existing.quantityAvailable = item.quantityAvailable;
      await repo.save(existing);
    }
  }

  console.log('✅ Inventory seeded');
}
