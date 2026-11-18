/**
 * Жимсний кг-ын нөөц (0053). Нөөц бараа (POOL-*) үлдэгдлээ 0.5кг-ын
 * НЭГЖЭЭР хадгална; зарагдах бараа бүр stock_unit_qty нэгжийг хасна
 * (1кг = 2, 1.5кг = 3, 8кг = 16, 12кг = 24).
 */
export const FRUIT_POOL_UNIT_KG = 0.5;

/** Нэгж → кг (харуулах) */
export function poolUnitsToKg(units: number): number {
  return units * FRUIT_POOL_UNIT_KG;
}

/** Кг → нэгж. 0.5-ын үржвэр биш бол null */
export function kgToPoolUnits(kg: number): number | null {
  const units = kg / FRUIT_POOL_UNIT_KG;
  if (!Number.isFinite(units) || Math.abs(units - Math.round(units)) > 1e-9) return null;
  return Math.round(units);
}

/** "80 кг", "12.5 кг" */
export function formatKg(kg: number): string {
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} кг`;
}
