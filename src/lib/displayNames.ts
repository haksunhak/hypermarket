import type { ChannelTypeAssignment, DisplayNameDimension, DisplayNameOverride } from '../types';

export function makeOverrideId(dimension: DisplayNameDimension, rawValue: string): string {
  return `${dimension}::${rawValue}`;
}

export function buildDisplayMap(
  overrides: DisplayNameOverride[],
  dimension: DisplayNameDimension
): Map<string, string> {
  const map = new Map<string, string>();
  for (const o of overrides) {
    if (o.dimension === dimension) map.set(o.rawValue, o.displayName);
  }
  return map;
}

export function resolveDisplay(map: Map<string, string>, rawValue: string): string {
  return map.get(rawValue) || rawValue;
}

export function buildChannelTypeMap(assignments: ChannelTypeAssignment[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of assignments) map.set(a.channelName, a.channelType);
  return map;
}

export function resolveChannelLabel(
  displayMap: Map<string, string>,
  typeMap: Map<string, string>,
  rawChannelName: string
): string {
  const name = resolveDisplay(displayMap, rawChannelName);
  const type = typeMap.get(rawChannelName);
  return type ? `[${type}] ${name}` : name;
}
