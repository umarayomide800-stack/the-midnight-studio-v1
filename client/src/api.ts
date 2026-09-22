import type {
  Show,
  TimeslotsData,
  TicketCategory,
  AddOn,
  HoldSlotRequest,
  HoldSlotResponse,
  CheckoutIntentRequest,
  CheckoutIntentResponse,
  TestConfirmResponse,
  ApiResponse
} from '@the-midnight-studio/types';

const configuredApiOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const API_BASE = `${configuredApiOrigin}/api/v1`;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success || !body.data) {
    const errorMsg = body.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as Error & { code?: string };
    err.code = body.error?.code;
    throw err;
  }

  return body.data;
}

export const api = {
  getShows: () => request<Show[]>('/shows'),
  getTimeslots: (slug: string, date: string) =>
    request<TimeslotsData>(`/shows/${slug}/timeslots?date=${date}`),
  getTicketCategories: () => request<TicketCategory[]>('/ticket-categories'),
  getAddOns: () => request<AddOn[]>('/addons'),
  holdSlot: (payload: HoldSlotRequest) =>
    request<HoldSlotResponse>('/bookings/hold-slot', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  createCheckoutIntent: (payload: CheckoutIntentRequest) =>
    request<CheckoutIntentResponse>('/checkout/create-intent', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  confirmTestBooking: (bookingId: string) =>
    request<TestConfirmResponse>('/checkout/test-confirm', {
      method: 'POST',
      body: JSON.stringify({ bookingId })
    })
};
