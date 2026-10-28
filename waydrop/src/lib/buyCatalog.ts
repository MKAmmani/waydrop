/**
 * Buy For Me item catalog, price estimations, and budget calculation helpers.
 * Matches Batch 3B specification in 03B_Buy_For_Me.html.
 */

export type BuyItem = {
  id?: string;
  name: string;
  qty: number;
  est: number | null; // in Naira (e.g. 300)
  ic: 'drop' | 'cookie' | 'bag' | 'pkg' | 'cart';
  det?: string; // brand, size, color
  photo?: boolean;
  photo_url?: string | null;
};

export type PriceRule = 'ask' | '300' | 'fit';
export type StockRule = 'ask' | 'similar' | 'skip';

export const ITEM_GUESS: Record<string, [string, number, 'drop' | 'cookie' | 'bag' | 'pkg' | 'cart']> = {
  water: ['Bottled water, 75cl', 300, 'drop'],
  gala: ['Gala sausage roll', 200, 'cookie'],
  'soft drink': ['Soft drink, 50cl', 400, 'drop'],
  coke: ['Coca-Cola, 50cl', 400, 'drop'],
  biscuit: ['Biscuits', 150, 'cookie'],
  bread: ['Bread, small', 700, 'bag'],
  plantain: ['Plantain chips', 300, 'cookie'],
  indomie: ['Indomie noodles', 250, 'bag'],
  'pure water': ['Pure water sachet', 30, 'drop'],
  sachet: ['Pure water sachet', 30, 'drop'],
  suya: ['Suya', 1000, 'bag'],
  egg: ['Eggs', 150, 'bag'],
};

export const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

export const roundUp = (n: number, step = 100) => Math.ceil(n / step) * step;

export const calcItemsEst = (items: BuyItem[]): number => {
  return items.reduce((sum, item) => sum + item.qty * (item.est || 0), 0);
};

export const calcUnknownItems = (items: BuyItem[]): BuyItem[] => {
  return items.filter((item) => item.est == null);
};

export const calcBudget = (
  items: BuyItem[],
  maxBudget: number | null,
  budgetExtra: number = 0
): number => {
  const estTotal = calcItemsEst(items);
  const base = maxBudget != null ? maxBudget : roundUp(estTotal * 1.1);
  return base + budgetExtra;
};

export const calcFee = (items: BuyItem[], fromMode: 'any' | 'shop' = 'any'): number => {
  return 350 + Math.max(0, items.length - 1) * 50 + (fromMode === 'any' ? 50 : 0);
};
