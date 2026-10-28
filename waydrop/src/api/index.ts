/**
 * Onboarding and Task endpoints.
 * Screens only ever import `api` from here. All calls hit the backend API directly via http.
 */
import { http, ApiError } from './http';
import type { BuyItem, PriceRule, StockRule } from '@/lib/buyCatalog';

export { ApiError };

export type Tokens = {
  access_token: string;
  refresh_token: string;
  expires_at?: number | string;
  expires_in?: number;
};
export type Area = { id: string; name: string; subtitle: string; lat: number; lng: number; distance_km?: number; runners_active?: number };
export type WalletInfo = {
  balance_kobo: number;
  escrow_kobo: number;
  virtual_bank_name?: string | null;
  virtual_account_nuban?: string | null;
};

export type Me = {
  id: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  area_id: string | null;
  area?: Area | null;
  role?: 'user' | 'runner' | 'admin' | string;
  runner_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  rating?: number | null;
  trips_count?: number;
  wallet?: WalletInfo | null;
  referral_code?: string;
};
export type LatLng = { lat: number; lng: number };
export type HomeData = {
  site_id: string;
  area?: Area | null;
  balance: number; // kobo
  escrow?: number; // kobo held for errands
  wallet?: WalletInfo | null;
  profile?: {
    rating: number | null;
    trips_count: number;
    runner_status: string;
    referral_code: string;
  };
  unread: number;
  runners_nearby: number;
  runners: LatLng[]; // rounded positions, for the map only
  busy_spots: { place_id?: string | null; lat: number; lng: number; count: number; label: string }[];
  places: { id: string; name: string; lat: number; lng: number; kind?: string }[];
  routes?: { from: string; to: string; path: LatLng[]; kind?: string }[];
  roads?: { id?: string; name: string; position?: string }[];
  active_task?: {
    id: string;
    item: string;
    from: string;
    to: string;
    status: string;
    status_text: string;
    type?: 'move' | 'buy';
    is_buy?: boolean;
    runner_first_name?: string | null;
    is_requester?: boolean;
  } | null;
  send_again: { id: string; item: string; from: string; to: string; price: number }[];
  saved_places: { id: string; label: string; name: string }[];
  earn: { today: number; week: number; week_errands: number; rating: number };
};

export type ApiNotification = {
  id: string;
  type: 'money' | 'errand' | 'rating' | 'bank' | 'invite' | 'message' | 'call';
  title: string;
  desc: string;
  read: boolean;
  created_at: string | null;
  data?: Record<string, unknown> | null;
};
export type NotificationsPage = {
  items: ApiNotification[];
  unread_count: number;
  current_page: number;
  last_page: number;
  total: number;
};

export type Quote = {
  distance_m: number;
  duration_s: number;
  suggested_min: number;
  suggested_max: number;
  fee_rate: number;
  runners_nearby: number;
};

export type NewTask = {
  type?: 'move' | 'buy';
  site_id: string;
  item: string;
  note: string;
  pickup: { id: string; name: string; lat?: number; lng?: number };
  dropoff: { id: string; name: string; lat?: number; lng?: number };
  bounty: number; // in kobo (or fee)
  // Buy For Me specifics
  items?: BuyItem[];
  source?: { mode: 'any' | 'shop'; name?: string };
  budget_kobo?: number;
  rules?: { price: PriceRule; stock: StockRule };
  seat_photo?: boolean;
  seat_photo_url?: string | null;
  live_share?: boolean;
};

export type TaskAsk = {
  id: string;
  type: 'price' | 'swap';
  item_name: string;
  current_price?: number;
  diff_kobo?: number;
  new_price_kobo?: number;
  replacement?: string;
  expires_at: number;
};

export type TaskMessage = {
  id: string;
  task_id: string;
  sender_id?: string | null;
  sender_name: string;
  text: string;
  is_runner: boolean;
  created_at: number;
};

export type CallSessionInfo = {
  call_session_id?: string;
  task_id: string;
  channel: string;
  mode?: 'agora';
  masked_number?: string;
  contact_name: string;
  direct_phone?: string;
  guarantee: string;
  status: 'connecting' | 'connected' | 'ended';
};

export type PendingCallInfo = CallSessionInfo & {
  caller_id?: string;
  caller_name?: string;
  receiver_id?: string;
  receiver_name?: string;
  receiver_is_runner?: boolean;
  task_type?: string;
};

export type AgoraCallToken = {
  call_session_id: string;
  task_id: string;
  app_id: string;
  channel: string;
  token: string;
  uid: number;
  expires_in: number;
};

export type RatingPayload = {
  rating: number;
  tags?: string[];
  note?: string;
  tip_kobo?: number;
};

export type ReceiptData = {
  task_id: string;
  reference: string;
  date: string;
  requester: { name: string };
  runner: { name: string; rating: number; trips: number };
  item: string;
  note?: string;
  pickup: string;
  dropoff: string;
  duration_minutes: number;
  bounty_kobo: number;
  platform_fee_kobo: number;
  runner_payout_kobo: number;
  tip_kobo: number;
  total_paid_kobo: number;
  payment_method: string;
  status: string;
};

export type DisputePayload = {
  reason: 'wrong_item' | 'damaged' | 'never_arrived' | 'overcharged' | 'unreachable' | 'safety' | string;
  explanation?: string;
  evidence_urls?: string[];
};

export type DisputeResult = {
  ticket_id: string;
  dispute_id: string;
  task_id: string;
  reason: string;
  status: string;
  sla: string;
  message: string;
  safety_alert?: boolean;
};

export type Task = {
  id: string;
  user_id?: string;
  runner_id?: string;
  type?: 'move' | 'buy';
  status: 'pending' | 'accepted' | 'in_transit' | 'picked_up' | 'arrived' | 'completed' | 'cancelled' | 'disputed' | 'shopping' | 'bought';
  item: string;
  pickup: { id: string; name: string; lat?: number; lng?: number };
  dropoff: { id: string; name: string; lat?: number; lng?: number };
  bounty: number; // fee in kobo
  platform_fee?: number;
  runner_payout_kobo?: number;
  suggested_min: number;
  lo?: number;
  pin: string;
  created_at: number;
  accepted_at?: number | null;
  picked_up_at?: number | null;
  arrived_at?: number | null;
  completed_at?: number | null;
  pickup_photo_url?: string | null;
  dropoff_photo_url?: string | null;
  rating?: number | null;
  rating_tags?: string[];
  rating_note?: string | null;
  tip_kobo?: number;
  is_late?: boolean;
  unread_messages_count?: number;
  note?: string;

  // Buy For Me properties
  items?: (BuyItem & { got?: boolean; real_price?: number })[];
  source?: { mode: 'any' | 'shop'; name?: string };
  budget_kobo?: number;
  spent_kobo?: number;
  refund_kobo?: number;
  rules?: { price: PriceRule; stock: StockRule };
  seat_photo?: boolean;
  live_share?: boolean;
  beacon_active?: boolean;
  active_ask?: TaskAsk | null;
  vendor_payment?: {
    account_number: string;
    bank: string;
    account_name: string;
    amount_kobo: number;
    receipt_url?: string;
  } | null;
  cash_purchase?: {
    amount_kobo: number;
    receipt_url?: string;
  } | null;

  search: {
    notified?: number;
    viewing?: number;
    viewing_runner?: string | null;
    viewing_runners?: string[];
    no_match: boolean;
  };
  runner: {
    id?: string;
    name?: string;
    first_name: string;
    last_name?: string;
    avatar_url?: string | null;
    rating?: number | null;
    trips: number;
    trips_count?: number;
    phone_masked?: string;
    eta_s?: number | null;
    lat?: number;
    lng?: number;
    location?: { lat: number; lng: number };
  } | null;
  requester?: {
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    phone_masked?: string;
  } | null;
  balance_after: number;
};

export interface BankOption {
  code: string;
  nipCode: string;
  name: string;
  provider: 'squad' | 'zainpay';
}

export interface Api {
  requestOtp(phone: string): Promise<{ expires_in: number; resend_after: number }>;
  verifyOtp(phone: string, code: string): Promise<Tokens & { is_new_user: boolean; me: Me }>;
  oauth(provider: 'google' | 'apple', id_token: string): Promise<Tokens & { needs_phone: boolean; me: Me }>;
  getMe(): Promise<Me>;
  updateMe(patch: Partial<Pick<Me, 'first_name' | 'last_name' | 'area_id'>>): Promise<Me>;
  uploadPhoto(uri: string): Promise<{ photo_url: string }>;
  uploadErrandPhoto(uri: string): Promise<{ url: string }>;
  nearbyArea(lat: number, lng: number): Promise<{ area: Area | null; runners_active: number; nearby_areas?: Area[] }>;
  searchAreas(q: string): Promise<Area[]>;
  registerDevice(push_token: string, platform: 'ios' | 'android' | 'web', locale: string): Promise<void>;
  home(site_id: string, mode: 'request' | 'earn'): Promise<HomeData>;
  quote(site_id: string, from_id: string, to_id: string): Promise<Quote>;
  createTask(t: NewTask): Promise<Task>;
  getTask(id: string): Promise<Task>;
  acceptTask(id: string, runner_id?: string): Promise<Task>;
  listAvailableTasks(site_id?: string, destination?: string, destination_id?: string): Promise<{ count: number; tasks: any[]; heading?: string | null; on_route_count?: number }>;
  raiseBounty(id: string, bounty: number): Promise<Task>;
  cancelTask(id: string): Promise<Task>;
  topup(amount_kobo: number, method: 'transfer' | 'card' | 'ussd'): Promise<{ balance_kobo: number; transaction_id: string }>;
  verifyRunner(data: { matric_number: string; faculty?: string; department?: string; document_type?: string }): Promise<Me>;
  unverifyRunner(): Promise<Me>;
  listNotifications(): Promise<NotificationsPage>;
  markNotificationRead(id: string): Promise<{ unread_count: number }>;
  markAllNotificationsRead(): Promise<{ unread_count: number }>;

  // Batch 4: Live Delivery methods
  progressTask(taskId: string, phase: string, is_late?: boolean, pickup_photo_url?: string): Promise<Task>;
  pickupTask(taskId: string, pickup_photo_url?: string): Promise<Task>;
  uploadDeliveryPhoto(taskId: string, uri: string): Promise<{ dropoff_photo_url: string }>;
  arriveTask(taskId: string): Promise<Task>;
  verifyTaskPin(taskId: string, pin: string): Promise<Task & { success: boolean; payout_kobo?: number }>;
  getTaskMessages(taskId: string): Promise<{ task_id: string; count: number; messages: TaskMessage[] }>;
  sendTaskMessage(taskId: string, text: string, sender_name?: string, is_runner?: boolean): Promise<TaskMessage>;
  callRunner(taskId: string): Promise<CallSessionInfo>;
  getCallToken(taskId: string, callSessionId?: string): Promise<AgoraCallToken>;
  endCall(taskId: string, callSessionId: string): Promise<{ call_session_id: string; status: 'ended' }>;
  getPendingCall(): Promise<{ call: PendingCallInfo | null }>;
  rateTask(taskId: string, payload: RatingPayload): Promise<{ id: string; rating: number; tip_kobo: number; message: string }>;
  getTaskReceipt(taskId: string): Promise<ReceiptData>;
  disputeTask(taskId: string, payload: DisputePayload): Promise<DisputeResult>;
  cancelRunner(taskId: string, reason?: string): Promise<Task>;

  // Batch 3B: Buy For Me methods
  listBanks(query?: string): Promise<{ banks: BankOption[] }>;
  resolveBankAccount(account: string, bankCode: string): Promise<{ account_name: string }>;
  submitVendorPayment(taskId: string, data: { bank: string; bank_code: string; account: string; account_name: string; amount_kobo: number; receipt_photo: string }): Promise<{ success: boolean; spent_kobo: number; refund_kobo: number }>;
  submitCashPurchase(taskId: string, data: { amount_kobo: number; receipt_photo: string }): Promise<{ success: boolean; reimbursable_kobo: number }>;
  toggleBeacon(taskId: string, on: boolean): Promise<{ beacon_active: boolean }>;
  askBeacon(taskId: string): Promise<{ success: boolean }>;
  createAsk(taskId: string, ask: { type: 'price' | 'swap'; item_name: string; diff_kobo?: number; new_price_kobo?: number; replacement?: string }): Promise<{ ask_id: string }>;
  answerAsk(taskId: string, askId: string, answer: 'approve' | 'fewer' | 'skip'): Promise<{ success: boolean; budget_kobo: number }>;
  updateShoppingItem(taskId: string, itemIdx: number, got: boolean, price_kobo?: number): Promise<{ success: boolean; spent_kobo: number }>;
  verifyPinAndPayout(taskId: string, pin: string): Promise<{ payout_kobo: number; cash_refund_kobo: number; success: boolean }>;
}

const real: Api = {
  requestOtp: (phone) => http('POST', '/auth/otp/request', { phone }),
  verifyOtp: (phone, code) => http('POST', '/auth/otp/verify', { phone, code }),
  oauth: (provider, id_token) => http('POST', '/auth/oauth', { provider, id_token }),
  getMe: () => http('GET', '/me'),
  updateMe: (patch) => http('PATCH', '/me', patch),
  uploadPhoto: (uri) => http('POST', '/me/photo', { uri }, { multipartFile: uri }),
  uploadErrandPhoto: (uri) => http('POST', '/uploads/errand-photo', { uri }, { multipartFile: uri }),
  nearbyArea: (lat, lng) => http('GET', `/areas/nearby?lat=${lat}&lng=${lng}`),
  searchAreas: (q) => http('GET', `/areas?q=${encodeURIComponent(q)}`),
  registerDevice: (push_token, platform, locale) => http('POST', '/devices', { push_token, platform, locale }),
  home: (site_id, mode) => http('GET', `/home?site=${site_id}&mode=${mode}`),
  quote: (site_id, from_id, to_id) => http('POST', '/quotes', { site_id, pickup: from_id, dropoff: to_id }),
  createTask: (t) => http('POST', '/tasks', t, { idempotent: true }),
  getTask: (id) => http('GET', `/tasks/${id}`),
  acceptTask: (id, runner_id) => http('POST', `/tasks/${id}/accept`, { runner_id }, { idempotent: true }),
  listAvailableTasks: (site_id, destination, destination_id) => {
    const params = new URLSearchParams();
    params.set('site_id', site_id ?? 'buk-new');
    if (destination) params.set('destination', destination);
    if (destination_id) params.set('destination_id', destination_id);
    return http('GET', `/tasks/available?${params.toString()}`);
  },
  raiseBounty: (id, bounty) => http('POST', `/tasks/${id}/bounty`, { bounty }, { idempotent: true }),
  cancelTask: (id) => http('POST', `/tasks/${id}/cancel`, {}, { idempotent: true }),
  topup: (amount_kobo, method) => http('POST', '/wallet/topups', { amount: amount_kobo, method }),
  verifyRunner: (data) => http('POST', '/runners/verify', data),
  unverifyRunner: () => http('POST', '/runners/unverify', {}),
  listNotifications: () => http('GET', '/notifications'),
  markNotificationRead: (id) => http('POST', `/notifications/${id}/read`, {}),
  markAllNotificationsRead: () => http('POST', '/notifications/read-all', {}),

  // Batch 4: Live Delivery real calls
  progressTask: (taskId, phase, is_late, pickup_photo_url) => http('POST', `/tasks/${taskId}/progress`, { phase, is_late, pickup_photo_url }),
  pickupTask: (taskId, pickup_photo_url) => http('POST', `/tasks/${taskId}/pickup`, { pickup_photo_url }),
  uploadDeliveryPhoto: (taskId, uri) => http('POST', `/tasks/${taskId}/delivery-photo`, { uri }, { multipartFile: uri }),
  arriveTask: (taskId) => http('POST', `/tasks/${taskId}/arrive`, {}),
  verifyTaskPin: (taskId, pin) => http('POST', `/tasks/${taskId}/verify-pin`, { pin }),
  getTaskMessages: (taskId) => http('GET', `/tasks/${taskId}/messages`),
  sendTaskMessage: (taskId, text, sender_name, is_runner) => http('POST', `/tasks/${taskId}/messages`, { text, sender_name, is_runner }),
  callRunner: (taskId) => http('POST', `/tasks/${taskId}/call`, {}),
  getCallToken: (taskId, callSessionId) => http('GET', `/tasks/${taskId}/call/token${callSessionId ? `?call_session_id=${encodeURIComponent(callSessionId)}` : ''}`),
  endCall: async (taskId, callSessionId) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await http('POST', `/tasks/${taskId}/call/${callSessionId}/end`, {});
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  },
  getPendingCall: () => http('GET', '/calls/pending'),
  rateTask: (taskId, payload) => http('POST', `/tasks/${taskId}/rating`, payload),
  getTaskReceipt: (taskId) => http('GET', `/tasks/${taskId}/receipt`),
  disputeTask: (taskId, payload) => http('POST', `/tasks/${taskId}/disputes`, payload),
  cancelRunner: (taskId, reason) => http('POST', `/tasks/${taskId}/runner-cancel`, { reason }),

  // Batch 3B
  listBanks: async (query) => {
    const res: any = await http('GET', `/banks${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    return {
      banks: (res.banks ?? []).map((bank: any) => ({
        code: bank.code,
        nipCode: bank.nip_code ?? bank.code,
        name: bank.name,
        provider: bank.provider === 'squad' ? 'squad' : 'zainpay',
      })),
    };
  },
  resolveBankAccount: (account, bankCode) => http(
    'GET',
    `/banks/resolve?account=${encodeURIComponent(account)}&bank_code=${encodeURIComponent(bankCode)}`,
  ),
  submitVendorPayment: (taskId, data) => http('POST', `/tasks/${taskId}/vendor_payments`, data, { idempotent: true }),
  submitCashPurchase: (taskId, data) => http('POST', `/tasks/${taskId}/cash_purchases`, data, { idempotent: true }),
  toggleBeacon: (taskId, on) => http('POST', `/tasks/${taskId}/beacon`, { on }),
  askBeacon: (taskId) => http('POST', `/tasks/${taskId}/beacon_request`, {}),
  createAsk: (taskId, ask) => http('POST', `/tasks/${taskId}/asks`, ask),
  answerAsk: (taskId, askId, answer) => http('POST', `/tasks/${taskId}/asks/${askId}`, { answer }),
  updateShoppingItem: (taskId, itemIdx, got, price_kobo) => http('PATCH', `/tasks/${taskId}/items/${itemIdx}`, { got, price: price_kobo }),
  verifyPinAndPayout: (taskId, pin) => http('POST', `/tasks/${taskId}/verify_pin`, { pin }),
};

export const api: Api = real;
