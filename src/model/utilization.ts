import { type NodeRecord } from '../types';
import { val, type Qty } from './quantity';
import { utilColor } from './scale';

/** Utilization ratio |value| / capacity for the active quantity. `capacity` is
 *  expressed in the current display units (same as `val`). */
export function utilization(r: NodeRecord, q: Qty, uf: number, capacity: number): number {
  if (!(capacity > 0)) return 0;
  return Math.abs(val(r, q, uf)) / capacity;
}

export function utilFill(ratio: number): string {
  return utilColor(Math.max(0, Math.min(1, ratio)));
}

export const isOverloaded = (ratio: number): boolean => ratio > 1;
