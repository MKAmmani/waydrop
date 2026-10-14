/** The errand being written right now. Lives only in memory; nothing is sent until "Lock". */
import { create } from 'zustand';
import type { PickedPlace } from '@/lib/places';

type Draft = { text: string; item: string; note: string; pickup: PickedPlace | null; dropoff: PickedPlace | null; pickupQuery: string; dropoffQuery: string; offer: number | null };
export const emptyDraft: Draft = { text: '', item: '', note: '', pickup: null, dropoff: null, pickupQuery: '', dropoffQuery: '', offer: null };
export const useDraft = create<Draft & { set(p: Partial<Draft>): void; reset(): void }>((set) => ({ ...emptyDraft, set: (p) => set(p), reset: () => set(emptyDraft) }));
