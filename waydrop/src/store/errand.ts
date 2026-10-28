/** The errand being written right now. Lives only in memory; nothing is sent until "Lock". */
import { create } from 'zustand';
import type { PickedPlace } from '@/lib/places';
import type { BuyItem, PriceRule, StockRule } from '@/lib/buyCatalog';

export type ErrandKind = 'move' | 'buy';

export type Draft = {
  kind: ErrandKind;
  text: string;
  item: string;
  category: string;
  note: string;
  pickup: PickedPlace | null;
  dropoff: PickedPlace | null;
  pickupQuery: string;
  dropoffQuery: string;
  offer: number | null; // in kobo

  // Buy For Me specifics (Batch 3B)
  items: BuyItem[];
  fromMode: 'any' | 'shop';
  shopName: string;
  priceRule: PriceRule;
  stockRule: StockRule;
  seatPhoto: boolean;
  seatPhotoUri?: string | null;
  liveShare: boolean;
  maxBudget: number | null; // in Naira
  runnerFee: number | null; // in Naira
  budgetExtra: number; // in Naira
};

export const emptyDraft: Draft = {
  kind: 'move',
  text: '',
  item: '',
  category: 'Parcel',
  note: '',
  pickup: null,
  dropoff: null,
  pickupQuery: '',
  dropoffQuery: '',
  offer: null,

  items: [],
  fromMode: 'any',
  shopName: '',
  priceRule: 'ask',
  stockRule: 'similar',
  seatPhoto: false,
  seatPhotoUri: null,
  liveShare: true,
  maxBudget: null,
  runnerFee: null,
  budgetExtra: 0,
};

export const useDraft = create<Draft & { set(p: Partial<Draft>): void; reset(): void }>((set) => ({
  ...emptyDraft,
  set: (p) => set((prev) => ({ ...prev, ...p })),
  reset: () => set(emptyDraft),
}));
