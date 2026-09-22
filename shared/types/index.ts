export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Show {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  scareLevel: number;
  durationMinutes: number;
  ageRestriction: number;
  sensoryAdvisories: string | null;
  coverImageUrl: string | null;
  isActive: boolean;
}

export interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  totalCapacity: number;
  bookedCount: number;
  heldCount: number;
  remainingCapacity: number;
  basePriceInCents: number;
  isPeak: boolean;
  isBlocked: boolean;
}

export interface TimeslotsData {
  date: string;
  slots: Slot[];
}

export interface TicketCategory {
  id: string;
  name: string;
  priceMultiplier: number | null;
  fixedPriceInCents: number | null;
  description: string;
}

export interface AddOn {
  id: string;
  title: string;
  description: string;
  priceInCents: number;
  inventoryStock: number;
  imageUrl: string | null;
}

export interface HoldTicketRequest {
  ticketCategoryId: string;
  quantity: number;
}

export interface HoldSlotRequest {
  slotId: string;
  customerName: string;
  customerEmail: string;
  tickets: HoldTicketRequest[];
}

export interface HoldSlotResponse {
  id: string;
  bookingReference: string;
  totalPaidInCents: number;
  paymentStatus: BookingStatus;
  holdExpiresAt: string;
  ticketItems: { slotId: string }[];
}

export interface CheckoutIntentRequest {
  bookingId: string;
  slotId: string;
  customerEmail: string;
  addOns: { addOnId: string; quantity: number }[];
}

export interface CheckoutIntentResponse {
  clientSecret: string | null;
  paymentIntentId: string;
  bookingId: string;
  amount?: number;
}

export interface BookingStatusResponse {
  status: BookingStatus;
  confirmation: BookingConfirmation | null;
}

export interface BookingConfirmation {
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  totalPaidInCents: number;
  ticketCount: number;
  ticketCategories: string[];
  slot?: { startsAt: string; endsAt: string };
}

export interface HealthResponse {
  status: 'ok';
  service: 'the-midnight-studio-api';
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
}
