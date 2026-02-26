/**
 * Compare Store
 * Module-level store for products selected to be compared.
 * Max 3 products can be compared at once.
 */

import type { Product } from '@/constants/mock-data';

const MAX_COMPARE = 3;

let compareList: Product[] = [];
const listeners: (() => void)[] = [];

export function getCompareList(): Product[] {
  return compareList;
}

export function getCompareCount(): number {
  return compareList.length;
}

export function getMaxCompare(): number {
  return MAX_COMPARE;
}

export function isInCompare(id: string): boolean {
  return compareList.some(p => p.id === id);
}

/** Returns true if added, false if list is full */
export function addToCompare(product: Product): boolean {
  if (isInCompare(product.id)) return true;
  if (compareList.length >= MAX_COMPARE) return false;
  compareList = [...compareList, product];
  notify();
  return true;
}

/** Toggle: add if not present, remove if present */
export function toggleCompare(product: Product): boolean {
  if (isInCompare(product.id)) {
    removeFromCompare(product.id);
    return false;
  }
  return addToCompare(product);
}

export function removeFromCompare(id: string): void {
  compareList = compareList.filter(p => p.id !== id);
  notify();
}

export function clearCompare(): void {
  compareList = [];
  notify();
}

export function subscribeCompare(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notify() {
  listeners.forEach(fn => fn());
}
