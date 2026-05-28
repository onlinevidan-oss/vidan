/**
 * Бүтээгдэхүүн → UI metadata
 * Phase 5-д Supabase Storage-аас бодит зураг татах хүртэл түр ашиглана.
 */

const SKU_META: Record<string, { emoji: string; bg: string }> = {
  "VDN-001": { emoji: "🥒", bg: "bg-gradient-to-br from-[#f0f7d8] to-[#d6e88a]" },
  "VDN-014": { emoji: "🍓", bg: "bg-gradient-to-br from-[#fde6e6] to-[#fbc4c4]" },
  "VDN-022": { emoji: "👶", bg: "bg-gradient-to-br from-[#fff2e9] to-[#ffd9c0]" },
  "VDN-008": { emoji: "🍑", bg: "bg-gradient-to-br from-[#f5efe3] to-[#e6d8be]" },
  "VDN-100": { emoji: "🎁", bg: "bg-gradient-to-br from-[#fff8d8] to-[#ffe899]" },
  "VDN-016": { emoji: "🫐", bg: "bg-gradient-to-br from-[#fde6e6] to-[#fbc4c4]" },
  "VDN-005": { emoji: "🥗", bg: "bg-gradient-to-br from-[#f0f7d8] to-[#b5d33d]" },
  "VDN-024": { emoji: "🍎", bg: "bg-gradient-to-br from-[#fff2e9] to-[#ffd9c0]" },
};

const FALLBACK = {
  emoji: "🫙",
  bg: "bg-gradient-to-br from-[#f5efe3] to-[#e6d8be]",
};

export function getProductMeta(sku: string) {
  return SKU_META[sku] ?? FALLBACK;
}

export function getProductTag(p: {
  is_new: boolean;
  is_bio: boolean;
  old_price: number | null;
  price: number;
}): { tag: "new" | "bio" | "discount" | null; tagText: string | null } {
  if (p.old_price && p.old_price > p.price) {
    const pct = Math.round(((p.old_price - p.price) / p.old_price) * 100);
    return { tag: "discount", tagText: `−${pct}%` };
  }
  if (p.is_new) return { tag: "new", tagText: "ШИНЭ" };
  if (p.is_bio) return { tag: "bio", tagText: "BIO" };
  return { tag: null, tagText: null };
}
