// A fast, non-cryptographic seeded hash function (cyrb53)
const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

// Deterministic data swapping for JSON poisoning
export function poisonData(data: Product[], botFingerprintId: string): Product[] {
  if (!data || data.length === 0) return [];

  // We use the bot's fingerprint as the seed. 
  // This ensures the poisoning is consistent for the same bot across requests,
  // preventing simple statistical anomaly detection based on jitter.
  const botSeed = cyrb53(botFingerprintId);

  return data.map(item => {
    // Generate a deterministic but pseudo-random index to pull fake data from
    // We hash the item ID + bot seed to ensure each item gets uniquely, consistently swapped
    const hashVal = cyrb53(item.id, botSeed);
    
    // Pick another item from the dataset to borrow properties from
    const targetIndex = data.length > 1 ? hashVal % data.length : 0;
    const swapTarget = data[targetIndex];

    // Return the item with its real ID (so schema constraints and foreign keys pass)
    // but with poisoned values from another legitimate item.
    return {
      ...item,
      price: swapTarget.price,
      stock: swapTarget.stock,
      name: `${item.name} (Special)` // Minor string alteration
    };
  });
}
