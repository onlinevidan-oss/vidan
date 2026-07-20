/**
 * Улаанбаатар хотын хаягийн лавлах өгөгдөл.
 * Дүүрэг бүрийн хорооны тоо — 2023 оны шинэ зохион байгуулалтаар (нийт 204).
 */

export const UB_DISTRICTS: { name: string; khoroos: number }[] = [
  { name: "Баянгол", khoroos: 34 },
  { name: "Баянзүрх", khoroos: 43 },
  { name: "Сонгинохайрхан", khoroos: 43 },
  { name: "Сүхбаатар", khoroos: 20 },
  { name: "Хан-Уул", khoroos: 25 },
  { name: "Чингэлтэй", khoroos: 24 },
  { name: "Налайх", khoroos: 8 },
  { name: "Багануур", khoroos: 5 },
  { name: "Багахангай", khoroos: 2 },
];

/** "Баянгол" → ["1-р хороо", ..., "34-р хороо"] */
export function khoroosOf(districtName: string): string[] {
  const d = UB_DISTRICTS.find((x) => x.name === districtName);
  if (!d) return [];
  return Array.from({ length: d.khoroos }, (_, i) => `${i + 1}-р хороо`);
}

/** Хаягийн тэмдэглэгээний урьдчилсан сонголтууд */
export const ADDRESS_LABELS = ["Гэр", "Ажил"] as const;
