import { exclusive } from "./exclusive";
import { customerPlates, regkingStock } from "./stock";
import { platePrice } from "./shopify";

/**
 * A plate's reg and price from its Shopify handle, for its page's title and description:
 * live from Shopify when connected, otherwise from the saved October copy of the store.
 */
export async function plateByHandle(handle: string): Promise<{ reg: string; price: number } | null> {
  try {
    const live = await platePrice(handle);
    if (live) return live;
  } catch {
    // Shopify unreachable: fall back to the saved copy
  }
  const saved = [...exclusive, ...regkingStock, ...customerPlates].find((p) => p.handle === handle);
  return saved ? { reg: saved.reg, price: saved.price } : null;
}
