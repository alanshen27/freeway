export type ShopItem = {
  slug: string;
  name: string;
  emoji: string;
  price: number;
  description: string;
};

/** Spendable decor for the virtual room. */
export const SHOP_ITEMS: ShopItem[] = [
  { slug: "plant", name: "Potted plant", emoji: "🪴", price: 40, description: "Adds some green." },
  { slug: "poster", name: "Motivational poster", emoji: "🖼️", price: 30, description: "Stay inspired." },
  { slug: "lamp", name: "Desk lamp", emoji: "💡", price: 60, description: "Cozy lighting." },
  { slug: "desk", name: "Study desk", emoji: "🪑", price: 120, description: "A proper workspace." },
  { slug: "bookshelf", name: "Bookshelf", emoji: "📚", price: 100, description: "Show off your reads." },
  { slug: "cat", name: "Study cat", emoji: "🐈", price: 200, description: "Emotional support animal." },
  { slug: "coffee", name: "Coffee mug", emoji: "☕", price: 25, description: "Fuel for late sessions." },
  { slug: "globe", name: "Desk globe", emoji: "🌍", price: 80, description: "World-class learner." },
];

export const SHOP_BY_SLUG = Object.fromEntries(SHOP_ITEMS.map((i) => [i.slug, i]));

export type InventoryEntry = { slug: string; qty: number };
export type PlacedItem = { slug: string; x: number; y: number };

export function parseInventory(raw: unknown): InventoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is InventoryEntry =>
      !!e &&
      typeof e === "object" &&
      typeof (e as InventoryEntry).slug === "string" &&
      typeof (e as InventoryEntry).qty === "number"
  );
}

export function parseHouseLayout(raw: unknown): PlacedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is PlacedItem =>
      !!e &&
      typeof e === "object" &&
      typeof (e as PlacedItem).slug === "string" &&
      typeof (e as PlacedItem).x === "number" &&
      typeof (e as PlacedItem).y === "number"
  );
}

export function parseBadges(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is string => typeof b === "string");
}

export function addToInventory(
  inventory: InventoryEntry[],
  slug: string,
  qty = 1
): InventoryEntry[] {
  const next = inventory.map((e) => ({ ...e }));
  const row = next.find((e) => e.slug === slug);
  if (row) row.qty += qty;
  else next.push({ slug, qty });
  return next;
}

export function takeFromInventory(
  inventory: InventoryEntry[],
  slug: string,
  qty = 1
): InventoryEntry[] | null {
  const row = inventory.find((e) => e.slug === slug);
  if (!row || row.qty < qty) return null;
  const next = inventory
    .map((e) => (e.slug === slug ? { ...e, qty: e.qty - qty } : e))
    .filter((e) => e.qty > 0);
  return next;
}
