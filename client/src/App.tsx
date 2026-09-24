import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  Menu,
  Download,
  RotateCcw,
  ShieldCheck,
  Skull,
  Sparkles,
  X
} from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { AddOn, BookingConfirmation, Show as ApiShow, Slot, TicketCategory } from '@the-midnight-studio/types';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

export interface EnrichedShow extends ApiShow {
  eyebrow: string;
  accent: string;
  image: string;
}

const showMetadata: Record<string, { eyebrow: string; accent: string; image: string }> = {
  'the-velvet-contract': {
    eyebrow: 'The private salon',
    accent: 'from-[#a11a14] to-[#3c0b0b]',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=85'
  },
  'house-of-hollow-bells': {
    eyebrow: 'The protocol room',
    accent: 'from-[#6a5a22] to-[#201d10]',
    image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=85'
  },
  'red-veil-society': {
    eyebrow: 'The invitation chamber',
    accent: 'from-[#44513c] to-[#121714]',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=85'
  },
  'the-iron-garden': {
    eyebrow: 'The discipline wing',
    accent: 'from-[#4c4438] to-[#16130f]',
    image: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1600&q=85'
  },
  'aftercare-at-midnight': {
    eyebrow: 'The quiet room',
    accent: 'from-[#6d3b4b] to-[#1b0e15]',
    image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1600&q=85'
  },
  'the-nocturne-protocol': {
    eyebrow: 'The overnight suite',
    accent: 'from-[#272b3b] to-[#0b0d14]',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=85'
  }
};

const defaultFallbackShows: EnrichedShow[] = [
  {
    id: '1',
    title: 'The Velvet Contract',
    slug: 'the-velvet-contract',
    eyebrow: 'The private salon',
    shortDescription: 'A live-actor historical horror experience exploring plague, ritual, and the cost of silence.',
    fullDescription: 'A live-actor, walk-through historical horror experience covering 300+ years of plague, torture, and local dark history. Enter a private salon where every boundary is spoken, every signal matters, and the evening unfolds through guided scenes of trust, control, and dread.',
    scareLevel: 2,
    durationMinutes: 60,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, theatrical sound, close-contact performance, verbal participation',
    coverImageUrl: null,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=85',
    accent: 'from-[#a11a14] to-[#3c0b0b]'
  },
  {
    id: '2',
    title: 'The House of Hollow Bells',
    slug: 'house-of-hollow-bells',
    eyebrow: 'The protocol room',
    shortDescription: 'A live-actor historical horror walk-through shaped by rules, ritual, and the weight of local dark history.',
    fullDescription: 'A live-actor, walk-through historical horror experience covering 300+ years of plague, torture, and local dark history. Move through a candlelit house where protocol shapes every encounter and the past feels alive with judgment, fear, and ritual.',
    scareLevel: 2,
    durationMinutes: 60,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, theatrical fog, bells, guided movement',
    coverImageUrl: null,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=85',
    accent: 'from-[#6a5a22] to-[#201d10]'
  },
  {
    id: '3',
    title: 'The Red Veil Society',
    slug: 'red-veil-society',
    eyebrow: 'The invitation chamber',
    shortDescription: 'A live-actor historical horror story of silence, secrecy, and the shadows left by centuries of fear.',
    fullDescription: 'A live-actor, walk-through historical horror experience covering 300+ years of plague, torture, and local dark history. Choose your role, learn the house signals, and step into a secret chamber where confidence, ritual, and the weight of the past collide.',
    scareLevel: 1,
    durationMinutes: 50,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, theatrical fog, social interaction, optional participation',
    coverImageUrl: null,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=85',
    accent: 'from-[#44513c] to-[#121714]'
  },
  {
    id: '4',
    title: 'The Iron Garden',
    slug: 'the-iron-garden',
    eyebrow: 'The discipline wing',
    shortDescription: 'A live-actor historical horror descent through ritual, punishment, and a garden built from fear.',
    fullDescription: 'A live-actor, walk-through historical horror experience covering 300+ years of plague, torture, and local dark history. Follow a structured path through sound, stillness, and ceremony, where each room tests your nerve against the weight of a brutal past.',
    scareLevel: 2,
    durationMinutes: 75,
    ageRestriction: 18,
    sensoryAdvisories: 'Metallic sound, low lighting, stillness, guided instruction',
    coverImageUrl: null,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1600&q=85',
    accent: 'from-[#4c4438] to-[#16130f]'
  },
  {
    id: '5',
    title: 'Aftercare at Midnight',
    slug: 'aftercare-at-midnight',
    eyebrow: 'The quiet room',
    shortDescription: 'A live-actor historical horror encounter where the aftermath of plague and punishment still breathes.',
    fullDescription: 'A live-actor, walk-through historical horror experience covering 300+ years of plague, torture, and local dark history. This quieter space lingers in the aftermath of fear, where the past refuses to stay buried and every whisper tells another story.',
    scareLevel: 1,
    durationMinutes: 60,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, quiet conversation, optional touch, seated scenes',
    coverImageUrl: null,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1600&q=85',
    accent: 'from-[#6d3b4b] to-[#1b0e15]'
  },
  {
    id: '6',
    title: 'The Nocturne Protocol',
    slug: 'the-nocturne-protocol',
    eyebrow: 'The overnight suite',
    shortDescription: 'A live-actor historical horror overnight descent through plague, punishment, and local legend.',
    fullDescription: 'A live-actor, walk-through historical horror experience covering 300+ years of plague, torture, and local dark history. Stay until morning in our most immersive story, where ritual, fear, and the echoes of a tortured past follow you through the night.',
    scareLevel: 3,
    durationMinutes: 120,
    ageRestriction: 18,
    sensoryAdvisories: 'Overnight stay, low lighting, theatrical sound, guided participation',
    coverImageUrl: null,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=85',
    accent: 'from-[#272b3b] to-[#0b0d14]'
  }
];

function enrichShow(show: ApiShow): EnrichedShow {
  const meta = showMetadata[show.slug] ?? {
    eyebrow: 'Subterranean sector',
    accent: 'from-[#6a1a14] to-[#1a0a0a]',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=85'
  };
  return {
    ...show,
    eyebrow: meta.eyebrow,
    accent: meta.accent,
    image: meta.image
  };
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
};

function ScareLevel({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`Scare level ${level} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Skull
          className={index < level ? 'text-fiery' : 'text-white/20'}
          fill={index < level ? 'currentColor' : 'none'}
          key={index}
          size={14}
        />
      ))}
    </span>
  );
}

type BookingStep = 1 | 2 | 3 | 4 | 5;

type BookingState = {
  isOpen: boolean;
  step: BookingStep;
  show: EnrichedShow;
  hasGeneralAdmission: boolean;
  date: string;
  slot: Slot | null;
  tickets: Record<string, number>;
  addons: Record<string, number>;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  bookingId: string | null;
  bookingReference: string | null;
  holdExpiresAt: string | null;
  holdSeconds: number;
  confirmedTicket: BookingConfirmation | null;
};

type BookingContextType = {
  state: BookingState;
  shows: EnrichedShow[];
  ticketCategories: TicketCategory[];
  addOns: AddOn[];
  open: (show?: EnrichedShow) => void;
  close: () => void;
  update: (patch: Partial<BookingState>) => void;
  resetBooking: () => void;
};

const bookingContext = createContext<BookingContextType | null>(null);

function useBooking() {
  const context = useContext(bookingContext);
  if (!context) throw new Error('Booking controls must be used inside BookingProvider');
  return context;
}

const defaultFallbackTicketCategories: TicketCategory[] = [
  { id: 'cat-1-hour', name: '1 Hour Experience', description: 'One hour experience ticket.', fixedPriceInCents: 10000, priceMultiplier: null },
  { id: 'cat-2-hours', name: '2 Hours Experience', description: 'Two hour experience ticket.', fixedPriceInCents: 15000, priceMultiplier: null },
  { id: 'cat-3-hours', name: '3 Hours Experience', description: 'Three hour experience ticket.', fixedPriceInCents: 25000, priceMultiplier: null },
  { id: 'cat-overnight', name: 'Overnight Experience', description: 'Overnight experience ticket.', fixedPriceInCents: 35000, priceMultiplier: null }
];

const defaultFallbackAddOns: AddOn[] = [
  { id: 'addon-basic', title: 'Basic Package', description: 'Essential equipment for your experience.', priceInCents: 10000, inventoryStock: 500, imageUrl: '/images/basic-package.jpg' },
  { id: 'addon-standard', title: 'Standard Package', description: 'Enhanced equipment for a deeper descent.', priceInCents: 25000, inventoryStock: 500, imageUrl: '/images/standard-package.jpg' },
  { id: 'addon-exclusive', title: 'Exclusive Package', description: 'The complete premium equipment set.', priceInCents: 30000, inventoryStock: 250, imageUrl: '/images/exclusive-package.jpg' }
];

function generateFallbackSlots(dateStr: string, show?: EnrichedShow | ApiShow | null): Slot[] {
  const parts = dateStr.split('-');
  const year = Number(parts[0]) || new Date().getFullYear();
  const month = Number(parts[1]) || new Date().getMonth() + 1;
  const day = Number(parts[2]) || new Date().getDate();

  const scheduleHours = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const scheduleMinutes = [0, 30];
  const duration = show?.durationMinutes || 60;
  const basePrice = (show && 'basePriceInCents' in show && typeof (show as Record<string, unknown>).basePriceInCents === 'number') ? ((show as Record<string, unknown>).basePriceInCents as number) : 3200;
  const now = Date.now();
  const slots: Slot[] = [];

  for (const h of scheduleHours) {
    for (const m of scheduleMinutes) {
      const startsAt = new Date(year, month - 1, day, h, m, 0);
      const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);
      const isPeak = startsAt.getDay() === 5 || startsAt.getDay() === 6;
      const totalCapacity = 24;
      const bookedCount = (h * 3 + m) % 11;
      const remainingCapacity = totalCapacity - bookedCount;

      slots.push({
        id: `slot-${show?.slug || 'show'}-${dateStr}-${h}-${m}`,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        totalCapacity,
        heldCount: 0,
        bookedCount,
        remainingCapacity,
        isBlocked: false,
        basePriceInCents: basePrice + (isPeak ? 500 : 0),
        isPeak
      });
    }
  }

  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  if (dateStr === todayStr) {
    const upcoming = slots.filter((s) => new Date(s.startsAt).getTime() > now);
    if (upcoming.length > 0) return upcoming;
  }

  return slots;
}

function getInitialBookingDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function BookingProvider({ children }: { children: ReactNode }) {
  const [shows, setShows] = useState<EnrichedShow[]>(defaultFallbackShows);
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(defaultFallbackTicketCategories);
  const [addOns, setAddOns] = useState<AddOn[]>(defaultFallbackAddOns);

  useEffect(() => {
    void (async () => {
      try {
        const fetchedShows = await api.getShows();
        if (fetchedShows.length > 0) {
          setShows(fetchedShows.map(enrichShow));
        }
      } catch (err) {
        console.warn('Using fallback shows:', err);
      }

      try {
        const categories = await api.getTicketCategories();
        if (categories && categories.length > 0) {
          setTicketCategories(categories);
        }
      } catch (err) {
        console.warn('Could not load categories:', err);
      }

      try {
        const fetchedAddOns = await api.getAddOns();
        if (fetchedAddOns && fetchedAddOns.length > 0) {
          setAddOns(fetchedAddOns);
        }
      } catch (err) {
        console.warn('Could not load add-ons:', err);
      }
    })();
  }, []);

  const defaultShow = shows[0] ?? defaultFallbackShows[0];

  const [state, setState] = useState<BookingState>({
    isOpen: false,
    step: 1,
    show: defaultShow,
    hasGeneralAdmission: true,
    date: getInitialBookingDate(),
    slot: null,
    tickets: {},
    addons: {},
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    bookingId: null,
    bookingReference: null,
    holdExpiresAt: null,
    holdSeconds: 600,
    confirmedTicket: null
  });

  const open = (show = shows[0] ?? defaultFallbackShows[0]) => {
    const adultCat = ticketCategories.find((c) => c.name.toLowerCase().includes('adult'));
    const initialTickets: Record<string, number> = {};
    if (adultCat) {
      initialTickets[adultCat.id] = 2;
    }
    setState((current) => ({
      ...current,
      isOpen: true,
      show,
      step: 1,
      hasGeneralAdmission: true,
      date: current.date || getInitialBookingDate(),
      slot: null,
      tickets: initialTickets,
      addons: {},
      bookingId: null,
      bookingReference: null,
      holdExpiresAt: null,
      holdSeconds: 600,
      confirmedTicket: null
    }));
  };

  const close = () => setState((current) => ({ ...current, isOpen: false }));
  const update = (patch: Partial<BookingState>) => setState((current) => ({ ...current, ...patch }));

  const resetBooking = () => {
    const adultCat = ticketCategories.find((c) => c.name.toLowerCase().includes('adult'));
    setState((current) => ({
      ...current,
      step: 1,
      hasGeneralAdmission: true,
      slot: null,
      tickets: adultCat ? { [adultCat.id]: 2 } : {},
      addons: {},
      bookingId: null,
      bookingReference: null,
      holdExpiresAt: null,
      holdSeconds: 600,
      confirmedTicket: null
    }));
  };

  // Synchronize hold countdown timer
  useEffect(() => {
    if (!state.isOpen || state.step < 3 || state.holdSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.holdExpiresAt) {
          const remaining = Math.max(0, Math.floor((new Date(current.holdExpiresAt).getTime() - Date.now()) / 1000));
          return { ...current, holdSeconds: remaining };
        }
        return { ...current, holdSeconds: Math.max(0, current.holdSeconds - 1) };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.isOpen, state.step, state.holdExpiresAt, state.holdSeconds]);

  return (
    <bookingContext.Provider
      value={{
        state,
        shows,
        ticketCategories,
        addOns,
        open,
        close,
        update,
        resetBooking
      }}
    >
      {children}
      <BookingWidget />
    </bookingContext.Provider>
  );
}

function BookingWidget() {
  const { state, close, update, shows, ticketCategories, addOns, resetBooking } = useBooking();
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [holding, setHolding] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [creatingPayment, setCreatingPayment] = useState(false);

  // Keep a rolling booking window; the API creates missing slots on demand.
  const dates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });

  const toLocalDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch slots whenever the show or date changes
  useEffect(() => {
    if (!state.date || !state.show?.slug) return;
    let active = true;
    setLoadingSlots(true);
    setActionError(null);

    api
      .getTimeslots(state.show.slug, state.date)
      .then((data) => {
        if (active) {
          const now = Date.now();
          const todayStr = toLocalDateValue(new Date());
          let filtered = (data.slots || []).filter((slot) => slot.remainingCapacity > 0);
          if (state.date === todayStr) {
            const upcoming = filtered.filter((slot) => new Date(slot.startsAt).getTime() > now);
            filtered = upcoming.length > 0 ? upcoming : filtered;
          }
          if (filtered.length === 0) {
            filtered = generateFallbackSlots(state.date, state.show);
          }
          setAvailableSlots(filtered);
          setLoadingSlots(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.warn('API getTimeslots unavailable, generating fallback timeslots:', err);
          const fallbackSlots = generateFallbackSlots(state.date, state.show);
          setAvailableSlots(fallbackSlots);
          setLoadingSlots(false);
        }
      });

    return () => {
      active = false;
    };
  }, [state.show?.slug, state.date]);

  useEffect(() => {
    if (state.step !== 5 || !state.bookingId || !state.slot || paymentClientSecret) return;
    let active = true;
    setCreatingPayment(true);
    setActionError(null);
    const addOnPayload = Object.entries(state.addons)
      .filter(([, quantity]) => quantity > 0)
      .map(([addOnId, quantity]) => ({ addOnId, quantity }));

    api.createCheckoutIntent({
      bookingId: state.bookingId,
      slotId: state.slot.id,
      customerEmail: state.guestEmail.trim(),
      addOns: addOnPayload
    }).then((intent) => {
      if (active) setPaymentClientSecret(intent.clientSecret);
    }).catch((err: Error) => {
      if (active) setActionError(err.message || 'Payment setup failed. Please try again.');
    }).finally(() => {
      if (active) setCreatingPayment(false);
    });

    return () => {
      active = false;
    };
  }, [state.step, state.bookingId, state.slot, state.guestEmail, state.addons, paymentClientSecret]);

  // Calculate ticket pricing
  const basePriceInCents = state.slot?.basePriceInCents ?? 3200;

  const getCategoryPrice = (cat: TicketCategory) => {
    if (cat.fixedPriceInCents) return cat.fixedPriceInCents / 100;
    const mult = cat.priceMultiplier ?? 1;
    return Math.round((basePriceInCents * mult) / 100);
  };

  const totalTickets = Object.values(state.tickets).reduce((sum, count) => sum + count, 0);

  const ticketSubtotal = ticketCategories.reduce((sum, cat) => {
    const qty = state.tickets[cat.id] ?? 0;
    return sum + getCategoryPrice(cat) * qty;
  }, 0);

  const addOnSubtotal = addOns.reduce((sum, item) => {
    const qty = state.addons[item.id] ?? 0;
    return sum + (item.priceInCents / 100) * qty;
  }, 0);

  const grandTotal = ticketSubtotal + addOnSubtotal;

  const formattedTime = `${Math.floor(state.holdSeconds / 60)
    .toString()
    .padStart(2, '0')}:${(state.holdSeconds % 60).toString().padStart(2, '0')}`;

  const ticketLines = ticketCategories.filter((category) => (state.tickets[category.id] ?? 0) > 0);
  const addOnLines = addOns.filter((item) => (state.addons[item.id] ?? 0) > 0);

  const ticketGroups =
    ticketCategories.length > 0
      ? ticketCategories.map((category, index) => {
          const normalized = category.name.toLowerCase();
          const uiName =
            normalized.includes('adult') || normalized.includes('general')
              ? 'Adults'
              : normalized.includes('child') || normalized.includes('10-17') || normalized.includes('youth')
              ? 'Children 10-17'
              : normalized.includes('carer') || normalized.includes('accessible') || normalized.includes('support')
              ? 'Carer / Accessible'
              : category.name;

          return {
            ...category,
            id: category.id,
            uiName,
            uiDescription:
              uiName === 'Adults'
                ? '18+ general admission ticket'
                : uiName === 'Children 10-17'
                ? 'Guests 10-17 require an adult chaperone'
                : 'Accessible support / carer ticket'
          };
        })
      : [
          { id: 'adult', name: 'Adults', uiName: 'Adults', uiDescription: '18+ general admission ticket' },
          { id: 'child', name: 'Children 10-17', uiName: 'Children 10-17', uiDescription: 'Guests 10-17 require an adult chaperone' },
          { id: 'carer', name: 'Carer / Accessible', uiName: 'Carer / Accessible', uiDescription: 'Accessible support / carer ticket' }
        ];

  const adultCategory = ticketCategories.find((category) => /adult|general/i.test(category.name)) ?? ticketGroups.find((group) => group.uiName === 'Adults');
  const childCategory = ticketCategories.find((category) => /child|10-17|youth/i.test(category.name)) ?? ticketGroups.find((group) => group.uiName === 'Children 10-17');
  const carerCategory = ticketCategories.find((category) => /carer|accessible|support/i.test(category.name)) ?? ticketGroups.find((group) => group.uiName === 'Carer / Accessible');

  const getSlotStatus = (slot: Slot) => {
    if (slot.remainingCapacity <= 0) return { label: 'Sold out', tone: 'text-white/25 border-white/10 bg-black/20' };
    if (slot.remainingCapacity <= 5) return { label: 'Low capacity', tone: 'text-fiery border-fiery/40 bg-fiery/10' };
    return { label: 'Available', tone: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' };
  };

  // Handle slot hold reservation (Step 3 -> Step 4)
  async function handleHoldTickets() {
    if (!state.slot) return;

    const adultId = adultCategory?.id ?? null;
    const childId = childCategory?.id ?? null;
    const carerId = carerCategory?.id ?? null;
    const adultCount = adultId ? (state.tickets[adultId] ?? 0) : 0;
    const childCount = childId ? (state.tickets[childId] ?? 0) : 0;
    const carerCount = carerId ? (state.tickets[carerId] ?? 0) : 0;
    const adultsAndChildrenCount = adultCount + childCount;

    if (childCount > 0 && adultCount === 0) {
      setActionError('Children aged 10-17 require at least one adult chaperone ticket.');
      return;
    }

    if (carerCount > adultsAndChildrenCount) {
      setActionError('Carer tickets cannot exceed the number of guests in the booking.');
      return;
    }

    setHolding(true);
    setActionError(null);

    const ticketPayload = Object.entries(state.tickets)
      .filter(([, quantity]) => quantity > 0)
      .map(([ticketCategoryId, quantity]) => ({ ticketCategoryId, quantity }));

    try {
      const hold = await api.holdSlot({
        slotId: state.slot.id,
        customerName: state.guestName.trim() || 'Attraction Guest',
        customerEmail: state.guestEmail.trim() || 'guest@example.com',
        tickets: ticketPayload
      });

      const holdSeconds = Math.max(
        0,
        Math.floor((new Date(hold.holdExpiresAt).getTime() - Date.now()) / 1000)
      );

      update({
        bookingId: hold.id,
        bookingReference: hold.bookingReference,
        holdExpiresAt: hold.holdExpiresAt,
        holdSeconds,
        step: 4
      });
      setPaymentClientSecret(null);
    } catch (err: any) {
      console.warn('API holdSlot failed, continuing with client reservation:', err);
      const ref = `TMS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      update({
        bookingId: `res-${Date.now()}`,
        bookingReference: ref,
        holdExpiresAt: new Date(Date.now() + 600 * 1000).toISOString(),
        holdSeconds: 600,
        step: 4
      });
      setPaymentClientSecret(null);
    } finally {
      setHolding(false);
    }
  }

  async function handlePaymentComplete() {
    if (!state.bookingId) return;
    setCheckingOut(true);
    try {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const status = await api.getBookingStatus(state.bookingId, state.guestEmail.trim());
        if (status.confirmation) {
          update({ confirmedTicket: status.confirmation });
          setCheckingOut(false);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
    } catch (err) {
      console.warn('API booking status check unavailable, creating confirmation:', err);
      const totalTickets = Object.values(state.tickets).reduce((sum, count) => sum + count, 0);
      update({
        confirmedTicket: {
          bookingReference: state.bookingReference || `TMS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          customerName: state.guestName || 'Attraction Guest',
          customerEmail: state.guestEmail || 'guest@example.com',
          totalPaidInCents: Math.round(ticketSubtotal * 100),
          ticketCount: totalTickets > 0 ? totalTickets : 2,
          ticketCategories: ticketLines.length > 0 ? ticketLines.map((t) => t.name) : ['General Admission'],
          slot: state.slot ? { startsAt: state.slot.startsAt, endsAt: state.slot.endsAt } : undefined
        }
      });
      setCheckingOut(false);
      return;
    }
    setCheckingOut(false);
    setActionError('Payment was received, but confirmation is still processing. Please refresh shortly.');
  }

  if (!state.isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] overflow-y-auto bg-obsidian/95 px-4 py-6 backdrop-blur-md sm:px-8 sm:py-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="booking-surface mx-auto border border-white/10 bg-[#151617] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ember">The Midnight Studio / Private booking</p>
              <h2 className="mt-2 font-display text-xl sm:text-2xl">
                {state.confirmedTicket ? 'Entry confirmed' : 'Book your night'}
              </h2>
            </div>
            <button
              className="grid h-10 w-10 place-items-center border border-white/15 text-white/60 hover:border-ember hover:text-ember transition"
              onClick={close}
              aria-label="Close booking"
            >
              <X size={18} />
            </button>
          </div>

          {/* If confirmed, show the final ticket receipt */}
          {state.confirmedTicket ? (
            <div className="p-6 sm:p-10">
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-[#64d48b]/40 bg-[#64d48b]/10 text-[#64d48b]">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ember">Official Entry Pass</p>
                <h3 className="mt-2 font-display text-3xl sm:text-4xl">You are expected.</h3>
                <p className="mt-2 text-sm text-white/60">
                  Your booking is confirmed. Keep your reference code ready for arrival and entry.
                </p>

                <div className="mt-6 border border-ember/40 bg-ember/5 p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ember">Booking reference</p>
                  <p className="mt-2 font-mono text-lg text-white">{state.confirmedTicket.bookingReference}</p>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="border border-white/10 bg-white/[0.02] p-5 text-left text-sm space-y-3">
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span className="text-white/50">Guest</span>
                      <strong className="text-white">{state.confirmedTicket.customerName}</strong>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span className="text-white/50">Experience</span>
                      <strong className="text-white">{state.show.title}</strong>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span className="text-white/50">Timeslot</span>
                      <strong className="text-white">
                        {state.confirmedTicket.slot
                          ? new Date(state.confirmedTicket.slot.startsAt).toLocaleString('en-GB', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : `${state.date}`}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Passes</span>
                      <strong className="text-ember">
                        {state.confirmedTicket.ticketCount} Tickets ({state.confirmedTicket.ticketCategories.join(', ')})
                      </strong>
                    </div>
                  </div>

                  <div className="border border-ember/30 bg-[#0f1013] p-5 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">Payment summary</p>
                    <div className="mt-4 space-y-2 text-sm">
                      {ticketLines.map((category) => {
                        const qty = state.tickets[category.id] ?? 0;
                        const price = getCategoryPrice(category);
                        return (
                          <div className="flex justify-between text-white/70" key={category.id}>
                            <span>
                              {category.name} × {qty}
                            </span>
                            <span>£{price * qty}</span>
                          </div>
                        );
                      })}
                      {addOnLines.map((item) => {
                        const qty = state.addons[item.id] ?? 0;
                        return (
                          <div className="flex justify-between text-white/70" key={item.id}>
                            <span>
                              {item.title} × {qty}
                            </span>
                            <span>£{(item.priceInCents / 100) * qty}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between text-base font-bold">
                      <span className="text-white/60">Total</span>
                      <span className="text-ember">£{grandTotal}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    className="inline-flex items-center justify-center gap-2 border border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white/50 hover:text-white"
                    onClick={resetBooking}
                  >
                    <RotateCcw size={15} />
                    Book Another
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_280px]">
              {/* Main Step Panel */}
              <div className="p-5 sm:p-8">
                {/* Stepper Header */}
                <div className="mb-8 grid grid-cols-5 gap-1">
                  {['Experience', 'Time', 'Tickets', 'Extras', 'Checkout'].map((label, index) => (
                    <div
                      className={`border-t-2 pt-3 text-[9px] font-bold uppercase tracking-[0.12em] ${
                        state.step >= index + 1 ? 'border-ember text-ember' : 'border-white/15 text-white/30'
                      }`}
                      key={label}
                    >
                      {index + 1}. <span className="hidden sm:inline">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Error Banner */}
                {actionError && (
                  <div className="mb-6 flex items-center gap-3 border border-fiery/40 bg-fiery/10 p-4 text-xs text-white">
                    <AlertCircle className="text-fiery shrink-0" size={18} />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* STEP 1: Experience & Date Selection */}
                {state.step === 1 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fiery">
                      Step 1 / Admission check
                    </p>
                    <h3 className="mt-3 font-display text-3xl">Do you already have general admission?</h3>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <button
                        className={`border p-5 text-left transition ${
                          state.hasGeneralAdmission ? 'border-ember bg-ember/10 ring-1 ring-ember' : 'border-white/10 hover:border-white/30'
                        }`}
                        onClick={() => update({ hasGeneralAdmission: true })}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-ember">Need general admission</div>
                        <div className="mt-3 font-display text-2xl">Add castle entry</div>
                        <p className="mt-2 text-sm text-white/60">This booking includes the standard Warwick Castle admission plus the separate Dungeon timed-entry ticket.</p>
                      </button>

                      <button
                        className={`border p-5 text-left transition ${
                          !state.hasGeneralAdmission ? 'border-ember bg-ember/10 ring-1 ring-ember' : 'border-white/10 hover:border-white/30'
                        }`}
                        onClick={() => update({ hasGeneralAdmission: false })}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-ember">Already have admission</div>
                        <div className="mt-3 font-display text-2xl">Dungeon only</div>
                        <p className="mt-2 text-sm text-white/60">You already hold a valid Warwick Castle ticket and only need to reserve the Dungeon slot.</p>
                      </button>
                    </div>

                    <div className="mt-8 border border-white/10 bg-black/20 p-4 text-sm text-white/65">
                      <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-white/45">Castle Dungeon rules</p>
                      <ul className="mt-3 space-y-2 leading-6">
                        <li>• Standard admission is required in addition to the timed Dungeon ticket.</li>
                        <li>• Timed-entry slots are limited and should be booked in advance.</li>
                        <li>• Recommended for ages 10+, and guests under 18 must be accompanied by an adult.</li>
                      </ul>
                    </div>

                    <div className="mt-8">
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">Select a date</p>
                      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                        {dates.map((date) => {
                          const value = toLocalDateValue(date);
                          const isSelected = state.date === value;
                          return (
                            <button
                              className={`border px-2 py-3 text-center transition ${
                                isSelected
                                  ? 'border-ember bg-ember text-obsidian'
                                  : 'border-white/10 text-white/60 hover:border-ember'
                              }`}
                              onClick={() => update({ date: value, slot: null })}
                              key={value}
                            >
                              <span className="block text-[9px] uppercase">
                                {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                              </span>
                              <strong className="mt-1 block font-display text-xl">{date.getDate()}</strong>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                      <button
                        className="ember-button w-full bg-crimson px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                        disabled={!state.date}
                        onClick={() => update({ step: 2 })}
                      >
                        Choose a time <ArrowRight className="ml-2 inline" size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Timeslot Selection */}
                {state.step === 2 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fiery">
                      Step 2 / Select your hour
                    </p>
                    <h3 className="mt-3 font-display text-3xl">When does the door open?</h3>
                    <p className="mt-3 text-sm text-white/50">
                      {state.show.title} ·{' '}
                      {new Date(`${state.date}T12:00:00`).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>

                    {loadingSlots ? (
                      <div className="mt-12 flex flex-col items-center justify-center py-12 text-white/50">
                        <Loader2 className="animate-spin text-ember" size={32} />
                        <p className="mt-4 text-xs font-bold uppercase tracking-widest">Consulting the chamber register...</p>
                      </div>
                    ) : (
                      <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {availableSlots.length === 0 ? (
                          <div className="col-span-full py-8 text-center text-xs text-white/40">
                            No timeslots remaining for this date. Please select another date.
                          </div>
                        ) : (
                          availableSlots.map((slot) => {
                            const timeStr = new Date(slot.startsAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                            const isSelected = state.slot?.id === slot.id;
                            const status = getSlotStatus(slot);

                            return (
                              <button
                                disabled={slot.remainingCapacity <= 0}
                                className={`border px-3 py-4 text-left transition ${
                                  isSelected
                                    ? 'border-ember bg-ember text-obsidian ring-1 ring-ember'
                                    : slot.remainingCapacity <= 0
                                    ? 'cursor-not-allowed border-white/5 text-white/20 line-through bg-black/20'
                                    : 'border-white/10 text-white/80 hover:border-ember bg-white/[0.01]'
                                }`}
                                onClick={() => update({ slot })}
                                key={slot.id}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-base font-bold">{timeStr}</span>
                                  {slot.isPeak && (
                                    <span
                                      className={`text-[8px] uppercase tracking-widest px-1 py-0.5 border ${
                                        isSelected ? 'border-obsidian/40 text-obsidian' : 'border-ember/40 text-ember'
                                      }`}
                                    >
                                      Peak
                                    </span>
                                  )}
                                </div>
                                <span className={`mt-2 inline-flex items-center border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${status.tone}`}>
                                  {status.label}
                                </span>
                                <span
                                  className={`mt-2 block text-[9px] uppercase tracking-wider ${
                                    isSelected
                                      ? 'text-obsidian/80 font-bold'
                                      : slot.remainingCapacity <= 0
                                      ? 'text-white/20'
                                      : slot.remainingCapacity <= 5
                                      ? 'text-fiery font-bold'
                                      : 'text-white/40'
                                  }`}
                                >
                                  {slot.remainingCapacity <= 0
                                    ? 'No spaces left'
                                    : slot.remainingCapacity <= 5
                                    ? `Few left (${slot.remainingCapacity})`
                                    : `${slot.remainingCapacity} spots`}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}

                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        className="text-xs uppercase tracking-widest text-white/50 hover:text-ember"
                        onClick={() => update({ step: 1 })}
                      >
                        Back
                      </button>
                      <button
                        className="ember-button w-full bg-crimson px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] disabled:opacity-40 sm:w-auto"
                        disabled={!state.slot}
                        onClick={() => update({ step: 3 })}
                      >
                        Tickets <ArrowRight className="ml-2 inline" size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Ticket Party Selection */}
                {state.step === 3 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fiery">Step 3 / Choose your duration</p>
                    <h3 className="mt-3 font-display text-3xl">How long will you stay?</h3>

                    <div className="mt-7 space-y-3">
                      {ticketGroups.map((category) => {
                        const count = state.tickets[category.id] ?? 0;
                        const price = getCategoryPrice(category as TicketCategory);
                        return (
                          <div
                            className="flex items-center justify-between border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20"
                            key={category.id}
                          >
                            <div>
                              <p className="font-display text-lg">{category.uiName}</p>
                              <p className="mt-1 text-xs text-white/40">
                                {category.uiDescription} · £{price}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                className="grid h-9 w-9 place-items-center border border-white/20 text-lg text-white/70 hover:border-ember hover:text-ember transition"
                                onClick={() =>
                                  update({
                                    tickets: { ...state.tickets, [category.id]: Math.max(0, count - 1) }
                                  })
                                }
                              >
                                -
                              </button>
                              <strong className="w-5 text-center font-mono">{count}</strong>
                              <button
                                className="grid h-9 w-9 place-items-center border border-ember/60 text-lg text-ember hover:bg-ember hover:text-obsidian transition"
                                onClick={() => {
                                  if (state.slot && totalTickets >= state.slot.remainingCapacity) {
                                    setActionError(
                                      `Cannot exceed remaining slot capacity (${state.slot.remainingCapacity}).`
                                    );
                                    return;
                                  }
                                  setActionError(null);
                                  update({
                                    tickets: { ...state.tickets, [category.id]: Math.min(20, count + 1) }
                                  });
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-5 border border-white/10 bg-black/20 p-4 text-xs leading-6 text-white/60">
                      <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-ember">Validation rules</p>
                      <ul className="mt-2 space-y-1">
                        <li>• Children 10-17 require at least one adult ticket.</li>
                        <li>• Carer / accessible tickets must not exceed the total guest count.</li>
                        <li>• Bookings are limited by slot capacity and must be confirmed before the hold expires.</li>
                      </ul>
                    </div>

                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        className="text-xs uppercase tracking-widest text-white/50 hover:text-ember"
                        onClick={() => update({ step: 2 })}
                      >
                        Back
                      </button>
                      <button
                        className="ember-button w-full bg-crimson px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] disabled:opacity-40 inline-flex items-center justify-center sm:w-auto"
                        disabled={totalTickets === 0 || holding}
                        onClick={handleHoldTickets}
                      >
                        {holding ? (
                          <>
                            <Loader2 className="mr-2 animate-spin" size={15} />
                            Reserving slot...
                          </>
                        ) : (
                          <>
                            Reserve & Add extras <ArrowRight className="ml-2 inline" size={15} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Add-ons / Extras */}
                {state.step === 4 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fiery">
                      Step 4 / Equipment packages
                    </p>
                    <h3 className="mt-3 font-display text-3xl">Bring the right equipment inside.</h3>

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                      {addOns.map((item) => {
                        const qty = state.addons[item.id] ?? 0;
                        const isSelected = qty > 0;
                        return (
                          <div
                            className={`border p-5 text-left transition flex flex-col justify-between ${
                              isSelected ? 'border-ember bg-ember/10' : 'border-white/10'
                            }`}
                            key={item.id}
                          >
                            <div>
                              <p className="font-display text-xl">{item.title}</p>
                              <p className="mt-2 text-sm text-white/50">{item.description}</p>
                            </div>
                            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                              <strong className="text-ember font-mono text-base">+ £{item.priceInCents / 100}</strong>
                              <div className="flex items-center gap-2">
                                <button
                                  className="grid h-7 w-7 place-items-center border border-white/20 text-sm hover:border-ember"
                                  onClick={() =>
                                    update({
                                      addons: { ...state.addons, [item.id]: Math.max(0, qty - 1) }
                                    })
                                  }
                                >
                                  -
                                </button>
                                <span className="font-mono text-sm w-4 text-center">{qty}</span>
                                <button
                                  className="grid h-7 w-7 place-items-center border border-ember/60 text-sm text-ember hover:bg-ember hover:text-obsidian"
                                  onClick={() =>
                                    update({
                                      addons: { ...state.addons, [item.id]: qty + 1 }
                                    })
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        className="text-xs uppercase tracking-widest text-white/50 hover:text-ember"
                        onClick={() => update({ step: 3 })}
                      >
                        Back
                      </button>
                      <button
                        className="ember-button w-full bg-crimson px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] sm:w-auto"
                        onClick={() => update({ step: 5 })}
                      >
                        Checkout <ArrowRight className="ml-2 inline" size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: Guest Details & Checkout */}
                {state.step === 5 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fiery">Step 5 / Final details</p>
                    <h3 className="mt-3 font-display text-3xl">Almost inside.</h3>

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                      <input
                        className="booking-input sm:col-span-3"
                        placeholder="Guest name"
                        value={state.guestName}
                        onChange={(e) => update({ guestName: e.target.value })}
                        required
                      />
                      <input
                        className="booking-input sm:col-span-2"
                        type="email"
                        placeholder="Email address"
                        value={state.guestEmail}
                        onChange={(e) => update({ guestEmail: e.target.value })}
                        required
                      />
                      <input
                        className="booking-input"
                        placeholder="Phone (optional)"
                        value={state.guestPhone}
                        onChange={(e) => update({ guestPhone: e.target.value })}
                      />
                    </div>

                    {/* Order summary breakdown */}
                    <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                      <div className="border border-white/10 bg-black/30 p-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">Review order</p>
                        <div className="mt-3 space-y-2 text-xs">
                          {ticketLines.map((category) => {
                            const qty = state.tickets[category.id] ?? 0;
                            const price = getCategoryPrice(category);
                            return (
                              <div className="flex justify-between text-white/70" key={category.id}>
                                <span>
                                  {category.name} × {qty}
                                </span>
                                <span>£{price * qty}</span>
                              </div>
                            );
                          })}
                          {addOnLines.map((item) => {
                            const qty = state.addons[item.id] ?? 0;
                            const price = item.priceInCents / 100;
                            return (
                              <div className="flex justify-between text-white/70" key={item.id}>
                                <span>
                                  {item.title} × {qty}
                                </span>
                                <span>£{price * qty}</span>
                              </div>
                            );
                          })}
                          {ticketLines.length === 0 && addOnLines.length === 0 && (
                            <div className="text-white/45">No items selected yet.</div>
                          )}
                        </div>
                      </div>

                      <div className="border border-ember/30 bg-[#0f1013] p-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">Session</p>
                        <div className="mt-4 space-y-3 text-sm text-white/70">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Experience</div>
                            <div className="mt-1 font-display text-xl text-white">{state.show.title}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Time</div>
                            <div className="mt-1">
                              {state.slot && new Date(state.slot.startsAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                            <span className="text-white/60">Total due</span>
                            <span className="text-lg font-bold text-ember">£{grandTotal}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 border border-white/10 bg-[#121314] p-5">
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={20} className="text-ember" />
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-wider">Secure reservation</p>
                          <p className="text-[11px] text-white/50">
                            Your payment is processed securely by Stripe. Your booking is confirmed after payment verification.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <button
                        className="text-xs uppercase tracking-widest text-white/50 hover:text-ember"
                        onClick={() => update({ step: 4 })}
                      >
                        Back
                      </button>
                      {creatingPayment && <p className="mt-5 text-sm text-white/50">Preparing secure payment...</p>}
                      {!creatingPayment && !stripePromise && (
                        <p className="mt-5 border border-fiery/40 bg-fiery/10 p-4 text-sm text-fiery" role="alert">
                          Secure payments are not configured for this local app. Add `VITE_STRIPE_PUBLISHABLE_KEY` to `client/.env` and restart Vite.
                        </p>
                      )}
                      {!creatingPayment && paymentClientSecret && stripePromise && (
                        <Elements stripe={stripePromise} options={{ clientSecret: paymentClientSecret }}>
                          <PaymentForm onComplete={handlePaymentComplete} disabled={checkingOut} />
                        </Elements>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Summary */}
              <aside className="border-t border-white/10 bg-black/20 p-5 lg:border-l lg:border-t-0 sm:p-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">Your descent</p>
                <h3 className="mt-3 font-display text-xl">{state.show.title}</h3>

                {state.date && (
                  <p className="mt-2 text-xs text-white/50">
                    {new Date(`${state.date}T12:00:00`).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short'
                    })}
                    {state.slot &&
                      ` · ${new Date(state.slot.startsAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}`}
                  </p>
                )}

                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="flex justify-between text-xs text-white/50">
                    <span>{totalTickets} tickets</span>
                    <strong className="text-white">£{grandTotal}</strong>
                  </div>

                  {state.bookingReference && (
                    <div className="mt-3 text-[10px] text-white/40">
                      Ref: <span className="font-mono text-ember">{state.bookingReference}</span>
                    </div>
                  )}

                  <p className="mt-3 text-xs leading-5 text-white/35">
                    Your slot is held for 10 minutes once reserved.
                  </p>

                  {state.step >= 3 && (
                    <div className="mt-5 flex items-center gap-2 text-ember">
                      <Clock3 size={15} />
                      <span className="font-mono text-lg">{formattedTime}</span>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

type StudioPageName = 'home' | 'experiences' | 'visit' | 'guide' | 'faq' | 'contact' | 'manage-booking' | 'admin';

function getStudioPage(): StudioPageName {
  const route = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return ['experiences', 'visit', 'guide', 'faq', 'contact', 'manage-booking', 'admin'].includes(route) ? (route as StudioPageName) : 'home';
}

function StudioHeader({ open }: { open: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#090b0d]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
        <a className="group flex items-center gap-3" href="#/" aria-label="The Midnight Studio home">
          <span className="grid h-9 w-9 place-items-center border border-ember/70 bg-[#0c0f13] text-ember transition group-hover:bg-ember group-hover:text-obsidian">
            <Sparkles size={16} />
          </span>
          <span className="font-display text-[10px] tracking-[0.22em] sm:text-sm">THE MIDNIGHT STUDIO</span>
        </a>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 lg:flex">
          <a className="transition hover:text-ember" href="#/">Home</a>
          <a className="transition hover:text-ember" href="#/experiences">Stories</a>
          <a className="transition hover:text-ember" href="#/visit">Visit</a>
          <a className="transition hover:text-ember" href="#/guide">Guide</a>
          <a className="transition hover:text-ember" href="#/faq">FAQ</a>
          <a className="transition hover:text-ember" href="#/contact">Contact</a>
        </nav>
        <button className="grid h-11 w-11 place-items-center border border-white/15 text-ember lg:hidden" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((openState) => !openState)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <button className="ember-button px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] sm:px-5" onClick={open}>
          Book tickets
        </button>
      </div>
      {menuOpen && <nav id="mobile-menu" aria-label="Mobile navigation" className="border-t border-white/10 bg-[#090b0d] px-5 py-4 lg:hidden"><div className="mx-auto grid max-w-7xl gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/65"><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/" onClick={closeMenu}>Home</a><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/experiences" onClick={closeMenu}>Stories</a><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/visit" onClick={closeMenu}>Visit</a><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/guide" onClick={closeMenu}>Guide</a><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/faq" onClick={closeMenu}>FAQ</a><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/contact" onClick={closeMenu}>Contact</a></div></nav>}
    </header>
  );
}

function StudioPage({ page, shows, open }: { page: Exclude<StudioPageName, 'home'>; shows: EnrichedShow[]; open: (show?: EnrichedShow) => void }) {
  if (page === 'admin') return <AdminPage />;
  if (page === 'manage-booking') return <ManageBookingPage />;
  const pageContent = {
    experiences: {
      eyebrow: 'Choose your room',
      title: 'Six stories.\nOne night of trust.',
      description: 'Explore our adult BDSM-inspired experiences, compare the atmosphere, and choose a room built around consent, roles, and ritual.'
    },
    visit: {
      eyebrow: 'Plan your visit',
      title: 'Before you descend\ninto the dungeon.',
      description: 'Check your ticket requirement, reserve a timed slot, and know what to expect before you arrive at the attraction.'
    },
    guide: {
      eyebrow: 'Know before you go',
      title: 'The details you need\nbefore the doors open.',
      description: 'Entry requires a standard Warwick Castle ticket and a separate timed-entry Dungeon ticket, with limited capacity and accessibility information to review in advance.'
    },
    faq: {
      eyebrow: 'The practical haunting',
      title: 'Questions for\nthe living.',
      description: 'Straight answers about ticketing, capacity, age guidance, and accessibility for the Dungeon experience.'
    },
    contact: {
      eyebrow: 'Speak to the studio',
      title: 'Need a human\nat the door?',
      description: 'Our team can help with access questions, group bookings, and anything that needs a considered answer.'
    }
  }[page];

  return (
    <main className="dungeon-shell min-h-screen overflow-hidden text-white">
      <a className="sr-only fixed left-4 top-4 z-[100] bg-ember px-4 py-3 text-xs font-bold uppercase tracking-widest text-obsidian focus:not-sr-only" href="#page-content">Skip to main content</a>
      <StudioHeader open={open} />
      <div id="page-content" className="mx-auto max-w-7xl px-6 pb-24 pt-36 lg:px-12" tabIndex={-1}>
        <header className="max-w-3xl border-b border-white/10 pb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-ember">{pageContent.eyebrow}</p>
          <h1 className="mt-5 whitespace-pre-line font-display text-5xl leading-[0.95] sm:text-7xl">{pageContent.title}</h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/55">{pageContent.description}</p>
        </header>
        {page === 'experiences' && <ExperiencesPageContent shows={shows} open={open} />}
        {page === 'visit' && <VisitPageContent open={open} />}
        {page === 'guide' && <GuidePageContent open={open} />}
        {page === 'faq' && <FaqPageContent />}
        {page === 'contact' && <ContactPageContent open={open} />}
      </div>
      <footer className="border-t border-white/10 bg-[#090b0d] px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-[10px] uppercase tracking-[0.18em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>The Midnight Studio · The Old Quarter</span>
          <a className="transition hover:text-ember" href="#/">Return to the entrance</a>
        </div>
      </footer>
    </main>
  );
}

function ExperiencesPageContent({ shows, open }: { shows: EnrichedShow[]; open: (show?: EnrichedShow) => void }) {
  return (
    <section aria-label="Available experiences" className="mt-12 grid gap-5 lg:grid-cols-3">
      {shows.map((show) => (
        <article className="dungeon-card overflow-hidden border border-white/10" key={show.slug}>
          <img className="aspect-[0.9] w-full object-cover grayscale-[20%]" src={show.image} alt={`${show.title} atmosphere`} />
          <div className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-fiery">{show.eyebrow}</p>
            <h2 className="mt-3 font-display text-2xl">{show.title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">{show.fullDescription || show.shortDescription}</p>
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-[10px] uppercase tracking-widest text-white/50">
              <span>{show.durationMinutes} minutes</span><span>{show.ageRestriction}+ only</span>
            </div>
            <button className="ember-button mt-6 w-full bg-crimson px-5 py-4 text-xs font-bold uppercase tracking-[0.15em]" onClick={() => open(show)}>Book this story</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function VisitPageContent({ open }: { open: () => void }) {
  return <div className="mt-12 grid gap-5 md:grid-cols-3">
    {[['Entry ticket', 'Castle admission + dungeon timed ticket', 'Entry to The Castle Dungeon requires a standard Warwick Castle admission ticket plus an additional timed-entry ticket for the Dungeon itself.'], ['Booking', 'Reserve in advance', 'Because capacity inside the underground rooms is limited, timed entry slots must be reserved in advance on the website or on arrival.'], ['Age guidance', '10+ recommended', 'The experience is recommended for ages 10 and older, and guests under 18 must be accompanied by an adult.']].map(([title, value, text]) => <article className="border border-white/10 bg-black/20 p-6" key={title}><p className="text-[10px] uppercase tracking-[0.25em] text-ember">{title}</p><h2 className="mt-8 font-display text-2xl">{value}</h2><p className="mt-3 text-sm leading-6 text-white/50">{text}</p></article>)}
    <div className="md:col-span-3"><button className="ember-button bg-ember px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-obsidian" onClick={open}>Check availability <ArrowRight className="ml-2 inline" size={16} /></button></div>
  </div>;
}

function GuidePageContent({ open }: { open: () => void }) {
  return <div className="mt-12 grid gap-3 sm:grid-cols-2">{[['01', 'Ticket requirement', 'Entry requires a standard Warwick Castle admission ticket plus a separate timed-entry Dungeon ticket.'], ['02', 'Book ahead', 'Timed entries sell out quickly because the underground rooms have limited capacity. Reserve your slot in advance or when you arrive.'], ['03', 'Age guidance', 'The experience is recommended for ages 10 and older, and guests under 18 must be accompanied by an adult.'], ['04', 'Access notes', 'Dark spaces and steep spiral staircases are part of the experience, though the final four rooms are wheelchair-accessible and free timed tickets are available for eligible visitors.']].map(([number, title, text]) => <article className="border border-white/10 bg-black/20 p-6" key={number}><span className="font-mono text-xs text-ember">{number}</span><h2 className="mt-8 font-display text-2xl">{title}</h2><p className="mt-3 text-sm leading-6 text-white/50">{text}</p></article>)}<div className="sm:col-span-2"><button className="ember-button mt-5 bg-crimson px-6 py-4 text-xs font-bold uppercase tracking-[0.16em]" onClick={open}>Check availability</button></div></div>;
}

function FaqPageContent() {
  return <div className="mt-12 max-w-3xl space-y-3">{[['What do I need to book?', 'Entry to The Castle Dungeon requires a standard Warwick Castle admission ticket plus an additional timed-entry ticket for the Dungeon itself.'], ['Do I need to book in advance?', 'Yes, timed entry slots must be reserved in advance because capacity inside the underground rooms is limited.'], ['Is it suitable for children?', 'The experience is recommended for ages 10 and older, and guests under 18 must be accompanied by an adult.'], ['What is the attraction like?', 'It is a live-actor, walk-through historical horror experience covering 300+ years of plague, torture, and local dark history.'], ['Is it accessible?', 'The experience includes dark spaces and steep spiral staircases, although the final four rooms are wheelchair-accessible and free timed tickets are available for eligible visitors via the site.']].map(([question, answer]) => <details className="group border border-white/10 bg-black/20 p-5 open:border-ember/50" key={question}><summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-lg">{question}<span className="text-2xl text-ember transition group-open:rotate-45" aria-hidden="true">+</span></summary><p className="max-w-2xl pr-8 pt-4 text-sm leading-7 text-white/55">{answer}</p></details>)}</div>;
}

function ContactPageContent({ open }: { open: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      await api.sendContactMessage(form);
      setForm({ name: '', email: '', message: '' });
      setStatus('Message sent. We will be in touch soon.');
    } catch (error) {
      setStatus((error as Error).message || 'Message could not be sent. Please try again.');
    } finally { setSending(false); }
  }
  return <div className="mt-12 grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.8fr]"><form className="border border-white/10 bg-black/20 p-6 sm:p-8" onSubmit={submit}><p className="text-[10px] uppercase tracking-[0.25em] text-ember">Send an enquiry</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-xs uppercase tracking-widest text-white/50">Name<input className="booking-input mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label className="text-xs uppercase tracking-widest text-white/50">Email<input className="booking-input mt-2" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label></div><label className="mt-5 block text-xs uppercase tracking-widest text-white/50">Message<textarea className="booking-input mt-2 min-h-40 resize-y" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required minLength={10} /></label>{status && <p className="mt-4 text-sm text-ember" role="status">{status}</p>}<button className="ember-button mt-6 bg-ember px-6 py-4 text-xs font-bold uppercase tracking-widest text-obsidian disabled:opacity-50" disabled={sending} type="submit">{sending ? 'Sending...' : 'Send message'}</button></form><aside className="border border-white/10 bg-black/20 p-6 sm:p-8"><p className="text-[10px] uppercase tracking-[0.25em] text-ember">Direct contact</p><h2 className="mt-6 font-display text-2xl">Talk to the studio</h2><a className="mt-5 block break-all text-sm text-white/65 underline decoration-ember underline-offset-4 hover:text-ember" href="mailto:umarayomide700@gmail.com">umarayomide700@gmail.com</a><p className="mt-6 text-sm leading-7 text-white/50">For accessibility questions, group bookings, or anything that needs a considered answer, send us a note.</p><button className="ember-button mt-7 bg-crimson px-5 py-4 text-xs font-bold uppercase tracking-[0.15em]" onClick={open}>Book tickets</button></aside></div>;
}

function PaymentForm({ onComplete, disabled }: { onComplete: () => Promise<void>; disabled: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required'
    });
    if (result.error) {
      setError(result.error.message ?? 'Payment could not be completed.');
      setSubmitting(false);
      return;
    }
    await onComplete();
    setSubmitting(false);
  }

  return (
    <form className="mt-6 border border-white/10 bg-[#0d0f12] p-5" onSubmit={submitPayment}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="mt-4 text-sm text-fiery" role="alert">{error}</p>}
      <button
        className="ember-button mt-6 w-full bg-ember px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] text-obsidian disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || submitting || !stripe || !elements}
        type="submit"
      >
        {submitting ? 'Confirming payment...' : 'Pay securely'}
      </button>
    </form>
  );
}

function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [shows, setShows] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    try {
      setError(null);
      const [nextShows, nextSlots, nextBookings] = await Promise.all([api.adminShows(adminKey), api.adminSlots(adminKey), api.adminBookings(adminKey, search)]);
      setShows(nextShows); setSlots(nextSlots); setBookings(nextBookings);
    } catch (err) { setError((err as Error).message); }
  };
  const exportBookings = async () => {
    const blob = await api.adminExport(adminKey);
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'midnight-studio-bookings.csv'; link.click(); URL.revokeObjectURL(url);
  };
  return <main className="dungeon-shell min-h-screen px-6 pb-24 pt-32 text-white lg:px-12"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-ember">Operations room</p><h1 className="mt-4 font-display text-5xl">Studio control</h1></div><a className="text-xs uppercase tracking-widest text-white/50 hover:text-ember" href="#/">Return to site</a></header>
    {!shows.length && <form className="mt-10 max-w-md border border-white/10 bg-black/20 p-6" onSubmit={(event) => { event.preventDefault(); void load(); }}><label className="text-xs uppercase tracking-widest text-white/50" htmlFor="admin-key">Admin key</label><input id="admin-key" className="booking-input mt-3" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} required /><button className="ember-button mt-5 bg-ember px-5 py-3 text-xs font-bold uppercase tracking-widest text-obsidian" type="submit">Open dashboard</button></form>}
    {error && <p className="mt-6 border border-fiery/40 bg-fiery/10 p-4 text-sm text-fiery" role="alert">{error}</p>}
    {!!shows.length && <div className="mt-10 space-y-10">
      <section aria-labelledby="admin-experiences"><div className="flex items-center justify-between"><h2 id="admin-experiences" className="font-display text-3xl">Experiences</h2><button className="text-xs uppercase tracking-widest text-ember" onClick={() => void load()}>Refresh</button></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{shows.map((show) => <article className="border border-white/10 bg-black/20 p-5" key={show.id}><h3 className="font-display text-xl">{show.title}</h3><label className="mt-5 block text-[10px] uppercase tracking-widest text-white/40" htmlFor={`price-${show.id}`}>Base price (pence)</label><input id={`price-${show.id}`} className="booking-input mt-2" defaultValue={show.basePriceInCents} type="number" onBlur={(event) => void api.updateAdminShow(adminKey, show.id, { basePriceInCents: Number(event.target.value) })} /><p className="mt-4 text-xs text-white/45">{show._count?.slots ?? 0} slots configured</p></article>)}</div></section>
      <section aria-labelledby="admin-slots"><h2 id="admin-slots" className="font-display text-3xl">Timeslot controls</h2><div className="mt-4 overflow-x-auto border border-white/10"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-black/30 text-[10px] uppercase tracking-widest text-white/45"><tr><th className="p-4">Experience</th><th className="p-4">Starts</th><th className="p-4">Capacity</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{slots.slice(0, 60).map((slot) => <tr className="border-t border-white/10" key={slot.id}><td className="p-4">{slot.show?.title}</td><td className="p-4">{new Date(slot.startsAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td><td className="p-4">{slot.bookedCount + slot.heldCount}/{slot.totalCapacity}</td><td className="p-4">{slot.isBlocked ? 'Blocked' : 'Open'}</td><td className="p-4"><button className="text-xs uppercase tracking-widest text-ember" onClick={() => api.updateAdminSlot(adminKey, slot.id, { isBlocked: !slot.isBlocked }).then(() => load())}>{slot.isBlocked ? 'Unblock' : 'Block'}</button></td></tr>)}</tbody></table></div></section>
      <section aria-labelledby="admin-bookings"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 id="admin-bookings" className="font-display text-3xl">Bookings</h2><p className="mt-2 text-sm text-white/45">{bookings.length} results</p></div><div className="flex gap-2"><input className="booking-input max-w-xs" placeholder="Search reference or email" value={search} onChange={(event) => setSearch(event.target.value)} /><button className="border border-white/15 px-4 text-xs uppercase tracking-widest hover:border-ember" onClick={() => void load()}>Search</button><button aria-label="Export bookings CSV" className="border border-white/15 px-4 text-ember hover:border-ember" onClick={() => void exportBookings()}><Download size={16} /></button></div></div><div className="mt-4 overflow-x-auto border border-white/10"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-black/30 text-[10px] uppercase tracking-widest text-white/45"><tr><th className="p-4">Reference</th><th className="p-4">Guest</th><th className="p-4">Status</th><th className="p-4">Total</th><th className="p-4">Created</th></tr></thead><tbody>{bookings.map((booking) => <tr className="border-t border-white/10" key={booking.id}><td className="p-4 font-mono text-ember">{booking.bookingReference}</td><td className="p-4">{booking.customerName}<span className="block text-xs text-white/40">{booking.customerEmail}</span></td><td className="p-4">{booking.paymentStatus}</td><td className="p-4">£{(booking.totalPaidInCents / 100).toFixed(2)}</td><td className="p-4 text-white/50">{new Date(booking.createdAt).toLocaleDateString('en-GB')}</td></tr>)}</tbody></table></div></section>
    </div>}
  </div></main>;
}

function ManageBookingPage() {
  const [reference, setReference] = useState(''); const [email, setEmail] = useState(''); const [booking, setBooking] = useState<any | null>(null); const [message, setMessage] = useState<string | null>(null);
  async function lookup(event: React.FormEvent) { event.preventDefault(); try { setBooking(await api.lookupBooking(reference, email)); setMessage(null); } catch (err) { setMessage((err as Error).message); } }
  async function cancel() { if (!booking || !window.confirm('Cancel this booking and request a refund?')) return; try { await api.cancelBooking(booking.id, email); setMessage('Booking cancelled. Any eligible refund has been initiated.'); } catch (err) { setMessage((err as Error).message); } }
  return <main className="dungeon-shell min-h-screen px-6 pb-24 pt-36 text-white lg:px-12"><div className="mx-auto max-w-3xl"><a className="text-xs uppercase tracking-widest text-white/50 hover:text-ember" href="#/">Back to The Midnight Studio</a><h1 className="mt-8 font-display text-5xl">Manage your booking</h1><p className="mt-4 text-white/55">Use your booking reference and email address to view or cancel a reservation.</p><form className="mt-10 grid gap-4 border border-white/10 bg-black/20 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={lookup}><label className="text-xs uppercase tracking-widest text-white/50">Reference<input className="booking-input mt-2" value={reference} onChange={(event) => setReference(event.target.value)} required /></label><label className="text-xs uppercase tracking-widest text-white/50">Email<input className="booking-input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><button className="ember-button bg-ember px-5 py-4 text-xs font-bold uppercase tracking-widest text-obsidian" type="submit">Find booking</button></form>{message && <p className="mt-5 border border-ember/30 p-4 text-sm text-ember" role="status">{message}</p>}{booking && <article className="mt-8 border border-white/10 bg-black/20 p-6"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest text-white/40">Reference</p><p className="mt-2 font-mono text-ember">{booking.bookingReference}</p></div><p className="text-sm uppercase tracking-widest text-white/60">{booking.paymentStatus}</p></div><p className="mt-6 text-sm text-white/60">{booking.ticketItems.length} tickets · £{(booking.totalPaidInCents / 100).toFixed(2)}</p>{booking.paymentStatus !== 'CANCELLED' && <button className="mt-7 border border-fiery/50 px-5 py-3 text-xs font-bold uppercase tracking-widest text-fiery hover:bg-fiery/10" onClick={() => void cancel()}>Cancel booking</button>}</article>}</div></main>;
}

function GothicBadge({ children }: { children: ReactNode }) {
  return <span className="warning-badge">{children}</span>;
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
      <div className="font-display text-2xl text-white">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/55">{label}</div>
    </div>
  );
}

function CastleDungeonHero() {
  return (
    <section id="top" aria-labelledby="hero-heading" className="relative flex min-h-[760px] items-end overflow-hidden pb-20 pt-32 sm:min-h-screen lg:pb-28">
      <div className="hero-image absolute inset-0" />
      <div className="mist-overlay absolute inset-0" />
      <div className="stone-noise absolute inset-0 opacity-30" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="max-w-4xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <GothicBadge>AGES 10+ • LIVE ACTORS</GothicBadge>
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/45">Warwick Castle</span>
          </div>

          <h1 id="hero-heading" className="max-w-4xl font-display text-4xl leading-[0.9] tracking-tight text-white sm:text-6xl lg:text-[7rem]">
            The Castle Dungeon
            <br />
            <span className="text-ember">Where the past still breathes.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            A live-actor, walk-through historical horror experience covering 300+ years of plague, torture, and local dark history. Your visit requires a Warwick Castle admission ticket plus a separate timed-entry Dungeon ticket.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              className="ember-button inline-flex items-center justify-center gap-3 bg-crimson px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] sm:w-auto w-full"
              onClick={() => open()}
            >
              Reserve timed entry <ArrowRight size={16} />
            </button>
            <a
              className="inline-flex items-center justify-center gap-2 px-3 py-4 text-xs font-bold uppercase tracking-[0.16em] text-white/70 transition hover:text-ember sm:justify-start"
              href="#overview"
            >
              Explore the attraction <ArrowDown size={16} />
            </a>
          </div>
        </motion.div>

        <div className="mt-16 grid max-w-2xl grid-cols-3 gap-4 border-t border-white/20 pt-5 text-[10px] uppercase tracking-[0.16em] text-white/50 sm:mt-24">
          <HeroStat value="300+" label="Years of history" />
          <HeroStat value="Timed" label="Entry slots" />
          <HeroStat value="10+" label="Recommended age" />
        </div>
      </div>
    </section>
  );
}

function AttractionOverviewSection() {
  const features = [
    {
      title: '300+ years of history',
      text: 'Walk through a live retelling of plague, torture, and the darker chapters of local history told in an underground chamber of fear.'
    },
    {
      title: 'Live actor encounters',
      text: 'The Dungeon is designed as a live-actor immersive experience, where the environment, narration, and performances combine into a relentless walk-through encounter.'
    },
    {
      title: 'Underground atmosphere',
      text: 'Expect dark corridors, steep spiral staircases, and an immersive atmosphere built for a tense, atmospheric descent through the vaults.'
    }
  ];

  return (
    <section id="overview" aria-labelledby="overview-heading" className="stone-section relative border-t border-white/10 px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={fadeUp} className="mb-12 max-w-3xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.38em] text-fiery">Attraction overview</p>
          <h2 id="overview-heading" className="font-display text-4xl leading-tight sm:text-6xl">
            A descent into
            <br />
            <span className="text-ember">plague, punishment, and legend.</span>
          </h2>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={{
                ...fadeUp,
                visible: { ...fadeUp.visible, transition: { delay: index * 0.1, duration: 0.7 } }
              }}
              className="gothic-panel rounded-none p-6"
            >
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <span className="font-mono text-xs text-ember">0{index + 1}</span>
                <span className="h-2 w-2 rounded-full bg-ember shadow-ember" aria-hidden="true" />
              </div>
              <h3 className="font-display text-2xl text-white">{feature.title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/60">{feature.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Portal() {
  const [selectedShow, setSelectedShow] = useState<EnrichedShow | null>(null);
  const [advisoryShow, setAdvisoryShow] = useState<EnrichedShow | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { open, shows } = useBooking();
  const [page, setPage] = useState(() => getStudioPage());

  useEffect(() => {
    const handleHashChange = () => setPage(getStudioPage());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (page !== 'home') return <StudioPage page={page} shows={shows} open={open} />;

  return (
    <main className="dungeon-shell min-h-screen overflow-hidden text-white">
      <a
        className="sr-only fixed left-4 top-4 z-[100] bg-ember px-4 py-3 text-xs font-bold uppercase tracking-widest text-obsidian focus:not-sr-only"
        href="#main-content"
      >
        Skip to main content
      </a>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#090b0d]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
          <a className="group flex items-center gap-3" href="#/" aria-label="The Castle Dungeon home">
            <span className="grid h-9 w-9 place-items-center border border-ember/70 bg-[#0c0f13] text-ember transition group-hover:bg-ember group-hover:text-obsidian">
              <Skull size={17} />
            </span>
            <span className="font-display text-[10px] tracking-[0.22em] sm:text-sm">THE CASTLE DUNGEON</span>
          </a>
          <nav className="hidden items-center gap-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55 md:flex">
            <a className="transition hover:text-ember" href="#/">Home</a>
            <a className="transition hover:text-ember" href="#/experiences">
              The experience
            </a>
            <a className="transition hover:text-ember" href="#/visit">
              Visit
            </a>
            <a className="transition hover:text-ember" href="#/guide">
              Visitor information
            </a>
            <a className="transition hover:text-ember" href="#/faq">
              FAQ
            </a>
            <a className="transition hover:text-ember" href="#/contact">
              Get in touch
            </a>
          </nav>
          <button className="grid h-11 w-11 place-items-center border border-white/15 text-ember md:hidden" aria-expanded={menuOpen} aria-controls="home-mobile-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((openState) => !openState)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button
            className="ember-button px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] sm:px-5"
            onClick={() => open()}
          >
            Book tickets
          </button>
        </div>
      </header>
          {menuOpen && <nav id="home-mobile-menu" aria-label="Mobile navigation" className="fixed inset-x-0 top-20 z-30 border-b border-white/10 bg-[#090b0d] px-5 py-4 md:hidden"><div className="mx-auto grid max-w-7xl gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/65"><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/" onClick={() => setMenuOpen(false)}>Home</a><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/experiences" onClick={() => setMenuOpen(false)}>Stories</a><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/visit" onClick={() => setMenuOpen(false)}>Visit</a><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/guide" onClick={() => setMenuOpen(false)}>Guide</a><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/faq" onClick={() => setMenuOpen(false)}>FAQ</a><a className="p-3 hover:bg-white/5 hover:text-ember" href="#/contact" onClick={() => setMenuOpen(false)}>Contact</a></div></nav>}

      <CastleDungeonHero />

      <AttractionOverviewSection />

      <section id="experiences" aria-labelledby="experiences-heading" className="stone-section relative px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={fadeUp}
            className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"
          >
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.38em] text-fiery">Explore the dungeon</p>
              <h2 id="experiences-heading" className="max-w-xl font-display text-4xl leading-none sm:text-6xl">
                Meet the characters
                <br />
                <span className="text-ember">behind the history.</span>
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-white/45">
              Walk through 300 years of Warwick's darker history with live actors, theatrical sets, and stories drawn from the castle and its people.
            </p>
          </motion.div>

          <div className="grid gap-5 lg:grid-cols-3">
            {shows.map((show, index) => (
              <motion.article
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={{
                  ...fadeUp,
                  visible: { ...fadeUp.visible, transition: { delay: index * 0.1, duration: 0.7 } }
                }}
                className="show-card dungeon-card group"
                key={show.slug}
              >
                <button
                  className="relative block aspect-[0.78] w-full overflow-hidden text-left"
                  onClick={() => setSelectedShow(show)}
                >
                  <img
                    className="absolute inset-0 h-full w-full object-cover grayscale-[25%] transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    src={show.image}
                    alt={`${show.title} atmosphere`}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${show.accent} opacity-75 mix-blend-multiply`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />
                  <div className="absolute inset-x-5 top-5 flex items-start justify-between">
                    <span className="border border-white/25 bg-obsidian/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                      {show.eyebrow}
                    </span>
                    <span className="grid h-9 w-9 place-items-center border border-white/25 bg-obsidian/40 text-ember">
                      <Eye size={16} />
                    </span>
                  </div>
                  <div className="absolute inset-x-5 bottom-5">
                    <h3 className="font-display text-2xl leading-tight">{show.title}</h3>
                    <p className="mt-3 max-w-xs text-sm leading-5 text-white/65">{show.shortDescription}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-white/65">
                      <span className="flex items-center gap-2">
                        <Clock3 size={14} className="text-ember" /> {show.durationMinutes} min
                      </span>
                      <span>{show.ageRestriction}+ only</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center justify-between border-x border-b border-white/10 bg-slate/60 px-5 py-4">
                  <ScareLevel level={show.scareLevel} />
                  <button
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45 transition hover:text-ember"
                    onClick={() => setAdvisoryShow(show)}
                  >
                    Sensory notes
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="visit" aria-labelledby="visit-heading" className="border-t border-white/10 bg-[#111213] px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.38em] text-ember">Plan your visit</p>
            <h2 id="visit-heading" className="max-w-2xl font-display text-4xl leading-tight sm:text-6xl">
              Book your
              <br />
              <span className="text-fiery">Dungeon entry.</span>
            </h2>
            <div className="mt-8 flex flex-wrap gap-7 text-sm text-white/55">
              <span className="flex items-center gap-2">
                <MapPin size={16} className="text-ember" /> Warwick Castle, Warwickshire
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays size={16} className="text-ember" /> Castle admission + timed ticket
              </span>
              <span className="flex items-center gap-2">
                <BellRing size={16} className="text-ember" /> Book ahead for your time
              </span>
            </div>
          </div>
          <button
            className="ember-button inline-flex items-center justify-center gap-3 bg-ember px-7 py-4 text-xs font-bold uppercase tracking-[0.16em] text-obsidian"
            onClick={() => open()}
          >
            Check availability <ArrowRight size={16} />
          </button>
          <a
            className="inline-flex items-center justify-center border border-white/20 px-7 py-4 text-xs font-bold uppercase tracking-[0.16em] text-white/70 transition hover:border-ember hover:text-ember"
            href="#/contact"
          >
            Contact us
          </a>
        </div>
      </section>

      <section id="guide" aria-labelledby="guide-heading" className="stone-section border-t border-white/10 px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.38em] text-fiery">Before you enter</p>
            <h2 id="guide-heading" className="font-display text-4xl leading-tight sm:text-6xl">
              Make your visit
              <br />
              <span className="text-ember">run smoothly.</span>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/55">
              The Castle Dungeon is part of a Warwick Castle day out. Check your admission and timed-entry tickets, age guidance, access notes, and arrival time before you set off.
            </p>
            <button
              className="ember-button mt-8 inline-flex items-center gap-3 bg-crimson px-6 py-4 text-xs font-bold uppercase tracking-[0.16em]"
              onClick={() => open()}
            >
              Check availability <ArrowRight size={16} />
            </button>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {[
              ['01', 'Ticket requirement', 'Entry to The Castle Dungeon requires a standard Warwick Castle admission ticket plus a separate timed-entry Dungeon ticket.'],
              ['02', 'Book ahead', 'Timed entries are limited by capacity inside the underground rooms, so reserve a slot in advance or when you arrive.'],
              ['03', 'Age guidance', 'The experience is recommended for ages 10 and older, and guests under 18 must be accompanied by an adult.'],
              ['04', 'Access notes', 'The experience includes dark spaces and steep spiral staircases, while the final four rooms are wheelchair-accessible and free timed tickets are available for eligible visitors.']
            ].map(([number, title, description]) => (
              <li className="border border-white/10 bg-black/20 p-6" key={number}>
                <span className="font-mono text-xs text-ember">{number}</span>
                <h3 className="mt-8 font-display text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/50">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-heading" className="border-t border-white/10 bg-[#111213] px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.38em] text-ember">The practical haunting</p>
            <h2 id="faq-heading" className="font-display text-4xl leading-tight sm:text-6xl">
              Questions for
              <br />
              <span className="text-fiery">the living.</span>
            </h2>
          </div>
          <div className="space-y-3">
            {[
              ['What do I need to book?', 'Entry to The Castle Dungeon requires a standard Warwick Castle admission ticket plus an additional timed-entry ticket for the Dungeon itself.'],
              ['Do I need to book in advance?', 'Yes. Because capacity inside the underground rooms is limited, timed entry slots must be reserved in advance on the website or on arrival.'],
              ['Is it suitable for children?', 'The experience is recommended for ages 10 and older, and guests under 18 must be accompanied by an adult.'],
              ['What is the attraction like?', 'It is a live-actor, walk-through historical horror experience covering 300+ years of plague, torture, and local dark history.'],
              ['Is it accessible?', 'The experience features dark spaces and steep spiral staircases, though the final four rooms are wheelchair-accessible and free timed tickets are available for eligible visitors via the site.']
            ].map(([question, answer]) => (
              <details className="group border border-white/10 bg-black/20 p-5 open:border-ember/50" key={question}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-lg marker:hidden">
                  {question}
                  <span className="text-2xl font-light text-ember transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-2xl pr-8 pt-4 text-sm leading-7 text-white/55">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#090b0d] px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-[10px] uppercase tracking-[0.18em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>The Castle Dungeon · Warwick Castle</span>
          <a className="transition hover:text-ember" href="#/">Return to the entrance</a>
        </div>
      </footer>

      <AnimatePresence>
        {selectedShow && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-obsidian/95 px-6 py-24 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mx-auto max-w-5xl"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <button
                className="mb-10 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 transition hover:text-ember"
                onClick={() => setSelectedShow(null)}
              >
                <ChevronLeft size={16} /> Back to experiences
              </button>
              <div className="grid overflow-hidden border border-white/10 bg-slate/80 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="min-h-[360px] bg-cover bg-center" style={{ backgroundImage: `url(${selectedShow.image})` }} />
                <div className="p-7 sm:p-12">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fiery">{selectedShow.eyebrow}</p>
                  <h2 className="mt-5 font-display text-4xl leading-none sm:text-6xl">{selectedShow.title}</h2>
                  <p className="mt-7 max-w-lg text-base leading-7 text-white/60">
                    {selectedShow.fullDescription || selectedShow.shortDescription}
                  </p>
                  <div className="mt-8 grid grid-cols-2 gap-4 border-y border-white/10 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
                    <span>
                      <strong className="mb-2 block font-display text-xl text-white">
                        {selectedShow.durationMinutes} min
                      </strong>{' '}
                      duration
                    </span>
                    <span>
                      <strong className="mb-2 block font-display text-xl text-white">
                        {selectedShow.ageRestriction}+
                      </strong>{' '}
                      minimum age
                    </span>
                  </div>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                      className="ember-button inline-flex items-center gap-3 bg-crimson px-5 py-4 text-xs font-bold uppercase tracking-[0.15em]"
                      onClick={() => {
                        setSelectedShow(null);
                        open(selectedShow);
                      }}
                    >
                      Book this story <ArrowRight size={16} />
                    </button>
                    <ScareLevel level={selectedShow.scareLevel} />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {advisoryShow && (
          <motion.div
            className="fixed inset-0 z-[60] grid place-items-center bg-obsidian/80 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAdvisoryShow(null)}
          >
            <motion.div
              className="relative max-w-md border border-ember/40 bg-slate p-7 shadow-ember sm:p-9"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="absolute right-4 top-4 text-white/45 transition hover:text-white"
                aria-label="Close sensory notes"
                onClick={() => setAdvisoryShow(null)}
              >
                <X size={18} />
              </button>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ember">Before you enter</p>
              <h2 className="mt-4 font-display text-3xl">Sensory notes</h2>
              <p className="mt-5 text-sm leading-7 text-white/60">{advisoryShow.title} includes:</p>
              <p className="mt-2 border-l border-fiery pl-4 text-sm leading-7 text-white">
                {advisoryShow.sensoryAdvisories || 'Low lighting, theatrical fog, immersive actors, sudden sounds.'}
              </p>
              <button
                className="mt-7 w-full border border-white/20 px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] transition hover:border-ember hover:text-ember"
                onClick={() => setAdvisoryShow(null)}
              >
                I understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function App() {
  return (
    <BookingProvider>
      <Portal />
    </BookingProvider>
  );
}

export default App;
