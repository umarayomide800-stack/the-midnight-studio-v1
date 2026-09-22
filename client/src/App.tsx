import { AnimatePresence, motion, type Variants } from 'framer-motion';
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
  RotateCcw,
  ShieldCheck,
  Skull,
  Sparkles,
  X
} from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { AddOn, Show as ApiShow, Slot, TestConfirmResponse, TicketCategory } from '@the-midnight-studio/types';

export interface EnrichedShow extends ApiShow {
  eyebrow: string;
  accent: string;
  image: string;
}

const showMetadata: Record<string, { eyebrow: string; accent: string; image: string }> = {
  'the-black-salt-oath': {
    eyebrow: 'The condemned wing',
    accent: 'from-[#a11a14] to-[#3c0b0b]',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=85'
  },
  'house-of-hollow-bells': {
    eyebrow: 'Quarantine district',
    accent: 'from-[#6a5a22] to-[#201d10]',
    image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=85'
  },
  'red-veil-society': {
    eyebrow: 'The old gallows',
    accent: 'from-[#44513c] to-[#121714]',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=85'
  }
};

const defaultFallbackShows: EnrichedShow[] = [
  {
    id: '1',
    title: 'The Black Salt Oath',
    slug: 'the-black-salt-oath',
    eyebrow: 'The condemned wing',
    shortDescription: 'A forbidden rite beneath the old quarter.',
    fullDescription: 'Follow the trail of a vanished order through flooded crypts, sealed chambers, and a secret that refuses to stay buried.',
    scareLevel: 4,
    durationMinutes: 75,
    ageRestriction: 16,
    sensoryAdvisories: 'Low lighting, smoke effects, sudden sounds, confined spaces',
    coverImageUrl: null,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=85',
    accent: 'from-[#a11a14] to-[#3c0b0b]'
  },
  {
    id: '2',
    title: 'The House of Hollow Bells',
    slug: 'house-of-hollow-bells',
    eyebrow: 'Quarantine district',
    shortDescription: 'A cursed manor where every bell tolls for someone.',
    fullDescription: 'Enter the abandoned Bellwether house and uncover why its bells still ring long after the family disappeared.',
    scareLevel: 3,
    durationMinutes: 60,
    ageRestriction: 14,
    sensoryAdvisories: 'Flashing lights, theatrical fog, sudden sounds',
    coverImageUrl: null,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=85',
    accent: 'from-[#6a5a22] to-[#201d10]'
  },
  {
    id: '3',
    title: 'The Red Veil Society',
    slug: 'red-veil-society',
    eyebrow: 'The old gallows',
    shortDescription: 'A secret society is recruiting, and you are on the list.',
    fullDescription: 'Solve the Society\'s riddles, earn your invitation, and decide how much of yourself you are willing to leave behind.',
    scareLevel: 2,
    durationMinutes: 50,
    ageRestriction: 12,
    sensoryAdvisories: 'Low lighting, theatrical fog',
    coverImageUrl: null,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=85',
    accent: 'from-[#44513c] to-[#121714]'
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
  confirmedTicket: TestConfirmResponse | null;
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

function BookingProvider({ children }: { children: ReactNode }) {
  const [shows, setShows] = useState<EnrichedShow[]>(defaultFallbackShows);
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);

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
        setTicketCategories(categories);
      } catch (err) {
        console.warn('Could not load categories:', err);
      }

      try {
        const fetchedAddOns = await api.getAddOns();
        setAddOns(fetchedAddOns);
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
    date: '',
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
    // Initial tickets default: 2 adults if category exists
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

  // Generate 7 selectable calendar dates starting from today
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });

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
          const futureSlots = data.slots.filter((s) => new Date(s.startsAt).getTime() > now);
          setAvailableSlots(futureSlots);
          setLoadingSlots(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load timeslots:', err);
          setAvailableSlots([]);
          setLoadingSlots(false);
        }
      });

    return () => {
      active = false;
    };
  }, [state.show?.slug, state.date]);

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

  // Handle slot hold reservation (Step 3 -> Step 4)
  async function handleHoldTickets() {
    if (!state.slot) return;
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
    } catch (err: any) {
      setActionError(err.message || 'The selected timeslot is no longer available. Please select another slot.');
    } finally {
      setHolding(false);
    }
  }

  // Handle final payment/checkout confirmation (Step 5)
  async function handleCheckout() {
    if (!state.bookingId || !state.slot) {
      setActionError('Hold session is missing. Please restart booking.');
      return;
    }
    if (!state.guestName.trim() || !state.guestEmail.trim()) {
      setActionError('Please enter your name and email address.');
      return;
    }

    setCheckingOut(true);
    setActionError(null);

    try {
      const addOnPayload = Object.entries(state.addons)
        .filter(([, quantity]) => quantity > 0)
        .map(([addOnId, quantity]) => ({ addOnId, quantity }));

      // Create checkout intent
      await api.createCheckoutIntent({
        bookingId: state.bookingId,
        slotId: state.slot.id,
        customerEmail: state.guestEmail.trim(),
        addOns: addOnPayload
      });

      const confirmed = await api.confirmTestBooking(state.bookingId);

      update({
        confirmedTicket: confirmed
      });
    } catch (err: any) {
      setActionError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
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
        <div className="mx-auto max-w-5xl border border-white/10 bg-[#151617] shadow-2xl">
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
                      Step 1 / Choose the room
                    </p>
                    <h3 className="mt-3 font-display text-3xl">Where are you entering?</h3>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {shows.map((show) => (
                        <button
                          className={`relative min-h-36 overflow-hidden border p-4 text-left transition ${
                            state.show.slug === show.slug ? 'border-ember ring-1 ring-ember' : 'border-white/10 hover:border-white/30'
                          }`}
                          onClick={() => update({ show })}
                          key={show.slug}
                        >
                          <img className="absolute inset-0 h-full w-full object-cover opacity-35" src={show.image} alt="" />
                          <div className={`absolute inset-0 bg-gradient-to-t ${show.accent} opacity-60`} />
                          <span className="relative z-10 block font-display text-lg leading-tight">{show.title}</span>
                          <span className="relative z-10 mt-2 block text-[10px] uppercase tracking-wider text-white/60">
                            {show.durationMinutes} min · Age {show.ageRestriction}+
                          </span>
                        </button>
                      ))}
                    </div>

                    <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">Select a date</p>
                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {dates.map((date) => {
                        const value = date.toISOString().slice(0, 10);
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
                            const isSoldOut = slot.remainingCapacity <= 0;
                            const isLow = slot.remainingCapacity > 0 && slot.remainingCapacity <= 5;

                            return (
                              <button
                                disabled={isSoldOut}
                                className={`border px-3 py-4 text-left transition ${
                                  isSelected
                                    ? 'border-ember bg-ember text-obsidian ring-1 ring-ember'
                                    : isSoldOut
                                    ? 'cursor-not-allowed border-white/5 text-white/20 line-through bg-black/20'
                                    : 'border-white/10 text-white/80 hover:border-ember bg-white/[0.01]'
                                }`}
                                onClick={() => update({ slot })}
                                key={slot.id}
                              >
                                <div className="flex items-center justify-between">
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
                                <span
                                  className={`mt-2 block text-[9px] uppercase tracking-wider ${
                                    isSelected
                                      ? 'text-obsidian/80 font-bold'
                                      : isSoldOut
                                      ? 'text-white/20'
                                      : isLow
                                      ? 'text-fiery font-bold'
                                      : 'text-white/40'
                                  }`}
                                >
                                  {isSoldOut
                                    ? 'Sold out'
                                    : isLow
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
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fiery">Step 3 / Your party</p>
                    <h3 className="mt-3 font-display text-3xl">Who is joining the descent?</h3>

                    <div className="mt-7 space-y-3">
                      {ticketCategories.map((category) => {
                        const count = state.tickets[category.id] ?? 0;
                        const price = getCategoryPrice(category);
                        return (
                          <div
                            className="flex items-center justify-between border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20"
                            key={category.id}
                          >
                            <div>
                              <p className="font-display text-lg">{category.name}</p>
                              <p className="mt-1 text-xs text-white/40">
                                {category.description} · £{price}
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
                      Step 4 / Optional keepsakes
                    </p>
                    <h3 className="mt-3 font-display text-3xl">Take a keepsake before you leave.</h3>

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

                    {/* Payment note */}
                    <div className="mt-5 border border-white/10 bg-[#121314] p-5">
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={20} className="text-ember" />
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-wider">Secure reservation</p>
                          <p className="text-[11px] text-white/50">
                            Test mode enabled. Your hold will be confirmed in a secure checkout and the timeslot capacity will update automatically.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        className="text-xs uppercase tracking-widest text-white/50 hover:text-ember"
                        onClick={() => update({ step: 4 })}
                      >
                        Back
                      </button>
                      <button
                        className="ember-button w-full bg-ember px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] text-obsidian inline-flex items-center justify-center disabled:opacity-40 sm:w-auto"
                        disabled={checkingOut || !state.guestName.trim() || !state.guestEmail.trim()}
                        onClick={handleCheckout}
                      >
                        {checkingOut ? (
                          <>
                            <Loader2 className="mr-2 animate-spin text-obsidian" size={15} />
                            Issuing tickets...
                          </>
                        ) : (
                          `Confirm & Pay £${grandTotal}`
                        )}
                      </button>
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

function Portal() {
  const [selectedShow, setSelectedShow] = useState<EnrichedShow | null>(null);
  const [advisoryShow, setAdvisoryShow] = useState<EnrichedShow | null>(null);
  const { open, shows } = useBooking();

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
          <a className="group flex items-center gap-3" href="#top" aria-label="The Midnight Studio home">
            <span className="grid h-9 w-9 place-items-center border border-ember/70 bg-[#0c0f13] text-ember transition group-hover:bg-ember group-hover:text-obsidian">
              <Sparkles size={16} />
            </span>
            <span className="font-display text-[10px] tracking-[0.22em] sm:text-sm">THE MIDNIGHT STUDIO</span>
          </a>
          <nav className="hidden items-center gap-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55 md:flex">
            <a className="transition hover:text-ember" href="#experiences">
              Experiences
            </a>
            <a className="transition hover:text-ember" href="#visit">
              Visit
            </a>
            <a className="transition hover:text-ember" href="#guide">
              Guide
            </a>
            <a className="transition hover:text-ember" href="#faq">
              FAQ
            </a>
          </nav>
          <button
            className="ember-button px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] sm:px-5"
            onClick={() => open()}
          >
            Book tickets
          </button>
        </div>
      </header>

      <section id="top" aria-labelledby="hero-heading" className="relative flex min-h-[760px] items-end overflow-hidden pb-20 pt-32 sm:min-h-screen lg:pb-28">
        <div className="hero-image absolute inset-0" />
        <div className="hero-vignette absolute inset-0" />
        <div className="stone-noise absolute inset-0 opacity-30" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.38em] text-ember">
              <span className="h-px w-10 bg-ember" /> Beneath the old quarter
            </div>
            <h1 id="hero-heading" className="max-w-4xl font-display text-4xl leading-[0.9] tracking-tight text-white sm:text-6xl lg:text-[7.4rem]">
              Enter the room.
              <br />
              <span className="text-ember">Stay until it remembers you.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
              Three live horror experiences built in the bones of the city. One locked door. No one leaves unchanged.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                className="ember-button inline-flex items-center justify-center gap-3 bg-crimson px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] sm:w-auto w-full"
                onClick={() => open()}
              >
                Book tickets now <ArrowRight size={16} />
              </button>
              <a
                className="inline-flex items-center justify-center gap-2 px-3 py-4 text-xs font-bold uppercase tracking-[0.16em] text-white/65 transition hover:text-ember sm:justify-start"
                href="#experiences"
              >
                Explore the stories <ArrowDown size={16} />
              </a>
            </div>
          </motion.div>
          <div className="mt-16 grid max-w-2xl grid-cols-3 gap-4 border-t border-white/20 pt-5 text-[10px] uppercase tracking-[0.16em] text-white/50 sm:mt-24">
            <span>
              <strong className="block font-display text-xl text-white">03</strong> live stories
            </span>
            <span>
              <strong className="block font-display text-xl text-white">75</strong> minutes inside
            </span>
            <span>
              <strong className="block font-display text-xl text-white">16+</strong> recommended
            </span>
          </div>
        </div>
      </section>

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
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.38em] text-fiery">Choose your room</p>
              <h2 id="experiences-heading" className="max-w-xl font-display text-4xl leading-none sm:text-6xl">
                Three ways to lose
                <br />
                <span className="text-ember">your way back out.</span>
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-white/45">
              Each experience is intimate, immersive, and designed to make the walls feel a little too close.
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
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.38em] text-ember">Your night begins here</p>
            <h2 id="visit-heading" className="max-w-2xl font-display text-4xl leading-tight sm:text-6xl">
              Bring the ones who
              <br />
              <span className="text-fiery">cannot leave quietly.</span>
            </h2>
            <div className="mt-8 flex flex-wrap gap-7 text-sm text-white/55">
              <span className="flex items-center gap-2">
                <MapPin size={16} className="text-ember" /> The Old Quarter
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays size={16} className="text-ember" /> Open after dark
              </span>
              <span className="flex items-center gap-2">
                <BellRing size={16} className="text-ember" /> Groups of 2-12
              </span>
            </div>
          </div>
          <button
            className="ember-button inline-flex items-center justify-center gap-3 bg-ember px-7 py-4 text-xs font-bold uppercase tracking-[0.16em] text-obsidian"
            onClick={() => open()}
          >
            Find a time <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section id="guide" aria-labelledby="guide-heading" className="stone-section border-t border-white/10 px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.38em] text-fiery">Plan your descent</p>
            <h2 id="guide-heading" className="font-display text-4xl leading-tight sm:text-6xl">
              Know the rules
              <br />
              <span className="text-ember">before the door opens.</span>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/55">
              Arrive ready, leave room for the unexpected, and give yourself enough time to cross from the street into the story.
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
              ['01', 'Arrive early', 'Please arrive 20 minutes before your booked time for check-in and briefing.'],
              ['02', 'Dress for movement', 'Wear closed shoes and clothes you can move through narrow, atmospheric spaces in.'],
              ['03', 'Stay together', 'Our experiences are designed for groups. Keep your party together once inside.'],
              ['04', 'Ask for help', 'Tell the team about access needs, sensory concerns, or anything that would help you feel comfortable.']
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
              ['Is this suitable for everyone?', 'Each story has its own age guidance and sensory notes. Read the notes on an experience card before booking, and contact the team if you need specific access information.'],
              ['How long should I allow?', 'Plan for around 90 minutes at the venue, including arrival, briefing, and the experience itself. Your exact duration depends on the story you choose.'],
              ['Can I change my booking?', 'Contact the studio as soon as possible with your booking reference. We will help where availability allows.'],
              ['What happens if I feel overwhelmed?', 'You can tell an actor or member of the team at any time. Your comfort matters, and stepping out is always permitted.']
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
          <span>The Midnight Studio · The Old Quarter</span>
          <a className="transition hover:text-ember" href="#top">Return to the entrance</a>
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
