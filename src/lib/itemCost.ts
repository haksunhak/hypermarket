import type { ItemCost } from '../types';

export function buildCostMap(itemCosts: ItemCost[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of itemCosts) map.set(c.itemCode, c.unitCost);
  return map;
}
