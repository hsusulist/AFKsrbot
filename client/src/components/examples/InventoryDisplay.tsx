import InventoryDisplay from '../InventoryDisplay';

export default function InventoryDisplayExample() {
  // todo: remove mock functionality
  const mockItems = [
    {
      id: '1',
      name: 'Diamond Sword',
      count: 1,
      slot: 0,
      type: 'weapon' as const
    },
    {
      id: '2',
      name: 'Iron Chestplate',
      count: 1,
      slot: 1,
      type: 'armor' as const
    },
    {
      id: '3',
      name: 'Cooked Beef',
      count: 32,
      slot: 2,
      type: 'food' as const
    },
    {
      id: '4',
      name: 'Oak Wood',
      count: 64,
      slot: 3,
      type: 'block' as const
    },
    {
      id: '5',
      name: 'Iron Pickaxe',
      count: 1,
      slot: 4,
      type: 'tool' as const
    }
  ];

  return <InventoryDisplay items={mockItems} totalSlots={36} />;
}