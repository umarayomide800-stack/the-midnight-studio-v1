import type {
  Show,
  TimeslotsData,
  TicketCategory,
  AddOn,
  HoldSlotRequest,
  HoldSlotResponse,
  CheckoutIntentRequest,
  CheckoutIntentResponse,
  BookingStatusResponse,
  ApiResponse
} from '@the-midnight-studio/types';

const configuredApiOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
const fallbackApiOrigin = import.meta.env.PROD
  ? 'https://the-midnight-studio-api.onrender.com'
  : typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:4000';
const API_BASE = `${configuredApiOrigin ?? fallbackApiOrigin}/api/v1`;

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    const sameOriginHint = !configuredApiOrigin
      ? ' The frontend is using the same-origin fallback, so the API is likely not mounted on this host. Set VITE_API_BASE_URL to the backend URL.'
      : '';
    throw new Error(`The API returned an invalid response (${response.status}). Check VITE_API_BASE_URL and make sure the API is running.${sameOriginHint}`);
  }
}

async function adminRequest<T>(endpoint: string, adminKey: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey, ...options?.headers }
  });
  const body = await readApiResponse<T>(response);
  if (!body.success || body.data === undefined) throw new Error(body.error?.message || `Request failed with status ${response.status}`);
  return body.data;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  const body = await readApiResponse<T>(response);
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
  getBookingStatus: (bookingId: string, customerEmail: string) =>
    request<BookingStatusResponse>(`/bookings/${bookingId}/status?email=${encodeURIComponent(customerEmail)}`),
  lookupBooking: (reference: string, email: string) => request<any>(`/bookings/lookup?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`),
  cancelBooking: (bookingId: string, email: string) => request<any>(`/bookings/${bookingId}/cancel`, { method: 'POST', body: JSON.stringify({ email }) }),
  rescheduleBooking: (bookingId: string, email: string, slotId: string) => request<any>(`/bookings/${bookingId}/reschedule`, { method: 'POST', body: JSON.stringify({ email, slotId }) }),
  adminShows: (adminKey: string) => adminRequest<any[]>('/admin/shows', adminKey),
  updateAdminShow: (adminKey: string, showId: string, data: Record<string, unknown>) => adminRequest<any>(`/admin/shows/${showId}`, adminKey, { method: 'PATCH', body: JSON.stringify(data) }),
  adminSlots: (adminKey: string) => adminRequest<any[]>('/admin/slots', adminKey),
  updateAdminSlot: (adminKey: string, slotId: string, data: Record<string, unknown>) => adminRequest<any>(`/admin/slots/${slotId}`, adminKey, { method: 'PATCH', body: JSON.stringify(data) }),
  adminBookings: (adminKey: string, search = '') => adminRequest<any[]>(`/admin/bookings?search=${encodeURIComponent(search)}`, adminKey),
  adminExport: async (adminKey: string) => {
    const response = await fetch(`${API_BASE}/admin/bookings/export.csv`, { headers: { 'x-admin-key': adminKey } });
    if (!response.ok) throw new Error('Could not export bookings.');
    return response.blob();
  },
  sendContactMessage: (payload: { name: string; email: string; message: string }) =>
    request<{ sent: boolean }>('/contact', { method: 'POST', body: JSON.stringify(payload) }),
};
