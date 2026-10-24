import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Ban, BookOpen, CheckCircle2, ChevronDown, ChevronUp,
  Download, Mail, RefreshCw, Search, Send, Settings, ToggleLeft,
  ToggleRight, TrendingUp, X, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { api } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenueInCents: number;
  upcomingSlots: number;
}

interface AdminShow {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  basePriceInCents: number;
  _count?: { slots: number };
}

interface AdminSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  totalCapacity: number;
  bookedCount: number;
  heldCount: number;
  isBlocked: boolean;
  show?: { title: string; slug: string };
}

interface AdminBooking {
  id: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  paymentStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalPaidInCents: number;
  createdAt: string;
  ticketItems?: any[];
  addOns?: any[];
}

type Tab = 'overview' | 'bookings' | 'rooms' | 'slots';

const EMAIL_TEMPLATES = [
  { key: 'booking_confirmed', label: 'Booking Confirmed', vars: [] },
  { key: 'payment_request', label: 'Payment Request', vars: ['paymentLink'] },
  { key: 'location_reveal', label: 'Location Reveal', vars: ['date', 'time', 'address'] },
  { key: 'protocol_reminder', label: 'Protocol Reminder', vars: [] },
  { key: 'cancellation', label: 'Cancellation', vars: [] },
  { key: 'custom', label: 'Custom Message', vars: ['subject', 'body'] },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, string> = {
    CONFIRMED: 'bg-green-900/40 text-green-400 border-green-700/50',
    PENDING: 'bg-amber-900/40 text-amber-400 border-amber-700/50',
    CANCELLED: 'bg-red-900/40 text-red-400 border-red-700/50',
  };
  return `inline-flex items-center rounded-xs border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? 'border-white/20 text-white/50'}`;
}

function fmt(cents: number) {
  return `£${(cents / 100).toFixed(2)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="border border-white/10 bg-black/20 p-5">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">{label}</p>
        <span className="text-ember">{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );
}

function EmailModal({ booking, adminKey, onClose }: { booking: AdminBooking; adminKey: string; onClose: () => void }) {
  const [template, setTemplate] = useState<string>('booking_confirmed');
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = EMAIL_TEMPLATES.find(t => t.key === template)!;

  async function send() {
    setSending(true);
    setError(null);
    try {
      await api.adminSendEmail(adminKey, booking.id, template, vars);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg border border-ember/40 bg-[#111213] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ember">Send Email</p>
            <h3 className="mt-1 font-display text-xl text-white">{booking.customerName}</h3>
            <p className="text-xs text-white/40">{booking.customerEmail}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-ember"><X size={18} /></button>
        </div>

        {sent ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 size={32} className="text-green-400" />
            <p className="font-display text-lg text-white">Email sent</p>
            <p className="text-xs text-white/40">Delivered to {booking.customerEmail}</p>
            <button onClick={onClose} className="mt-4 border border-white/20 px-6 py-2 text-xs uppercase tracking-widest hover:border-ember hover:text-ember">Close</button>
          </div>
        ) : (
          <>
            <div className="mt-5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Template</label>
              <select
                className="mt-2 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-ember focus:outline-none"
                value={template}
                onChange={e => { setTemplate(e.target.value); setVars({}); }}
              >
                {EMAIL_TEMPLATES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            {selectedTemplate.vars.length > 0 && (
              <div className="mt-4 space-y-3">
                {selectedTemplate.vars.map(v => (
                  <div key={v}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 capitalize">{v.replace(/_/g, ' ')}</label>
                    {v === 'body' ? (
                      <textarea
                        className="mt-1.5 w-full border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-ember focus:outline-none"
                        rows={4}
                        value={vars[v] ?? ''}
                        onChange={e => setVars(prev => ({ ...prev, [v]: e.target.value }))}
                        placeholder={`Enter ${v}...`}
                      />
                    ) : (
                      <input
                        className="mt-1.5 w-full border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-ember focus:outline-none"
                        value={vars[v] ?? ''}
                        onChange={e => setVars(prev => ({ ...prev, [v]: e.target.value }))}
                        placeholder={`Enter ${v}...`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && <p className="mt-4 border border-red-500/40 bg-red-900/20 p-3 text-xs text-red-400">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button onClick={onClose} className="flex-1 border border-white/15 py-3 text-xs uppercase tracking-widest text-white/60 hover:border-ember hover:text-ember">Cancel</button>
              <button
                onClick={send}
                disabled={sending}
                className="flex flex-1 items-center justify-center gap-2 bg-ember py-3 text-xs font-bold uppercase tracking-widest text-obsidian disabled:opacity-50"
              >
                <Send size={14} />
                {sending ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BookingRow({ booking, adminKey, onRefresh }: { booking: AdminBooking; adminKey: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [emailTarget, setEmailTarget] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function updateStatus(status: 'CONFIRMED' | 'CANCELLED') {
    if (!window.confirm(`Mark this booking as ${status}?`)) return;
    setUpdating(true);
    try {
      await api.adminUpdateBookingStatus(adminKey, booking.id, status);
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <tr className="border-t border-white/10 hover:bg-white/[0.02]">
        <td className="p-4 font-mono text-xs text-ember">{booking.bookingReference}</td>
        <td className="p-4">
          <p className="text-sm text-white">{booking.customerName}</p>
          <p className="text-xs text-white/40">{booking.customerEmail}</p>
        </td>
        <td className="p-4"><span className={statusBadge(booking.paymentStatus)}>{booking.paymentStatus}</span></td>
        <td className="p-4 text-sm text-white">{fmt(booking.totalPaidInCents)}</td>
        <td className="p-4 text-xs text-white/40">{new Date(booking.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <button
              title="Send email"
              onClick={() => setEmailTarget(true)}
              className="rounded border border-white/10 p-1.5 text-white/50 hover:border-ember hover:text-ember"
            ><Mail size={13} /></button>
            {booking.paymentStatus === 'PENDING' && (
              <button
                title="Mark confirmed"
                disabled={updating}
                onClick={() => updateStatus('CONFIRMED')}
                className="rounded border border-green-700/40 p-1.5 text-green-400 hover:border-green-500 disabled:opacity-40"
              ><CheckCircle2 size={13} /></button>
            )}
            {booking.paymentStatus !== 'CANCELLED' && (
              <button
                title="Cancel booking"
                disabled={updating}
                onClick={() => updateStatus('CANCELLED')}
                className="rounded border border-red-700/40 p-1.5 text-red-400 hover:border-red-500 disabled:opacity-40"
              ><Ban size={13} /></button>
            )}
            <button
              title={expanded ? 'Collapse' : 'Expand'}
              onClick={() => setExpanded(v => !v)}
              className="rounded border border-white/10 p-1.5 text-white/40 hover:border-ember hover:text-ember"
            >{expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>
          </div>
        </td>
      </tr>
      {expanded && booking.ticketItems && (
        <tr className="border-t border-white/5">
          <td colSpan={6} className="bg-black/20 px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">Tickets</p>
            <div className="space-y-1">
              {booking.ticketItems.map((t: any, i: number) => (
                <p key={i} className="text-xs text-white/60">
                  {t.ticketCategory?.name ?? 'Ticket'} — {t.slot ? new Date(t.slot.startsAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'} — {fmt(t.priceInCents)}
                </p>
              ))}
            </div>
            {booking.addOns && booking.addOns.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-white/35">Add-ons</p>
                {booking.addOns.map((a: any, i: number) => (
                  <p key={i} className="text-xs text-white/60">{a.addOn?.title} × {a.quantity} — {fmt(a.unitPriceInCents * a.quantity)}</p>
                ))}
              </>
            )}
          </td>
        </tr>
      )}
      {emailTarget && <EmailModal booking={booking} adminKey={adminKey} onClose={() => setEmailTarget(false)} />}
    </>
  );
}

// ─── Main AdminDashboard component ───────────────────────────────────────────

export function AdminDashboard() {
  const [adminKey, setAdminKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [shows, setShows] = useState<AdminShow[]>([]);
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (key = adminKey, q = search) => {
    setLoading(true);
    setError(null);
    try {
      const [s, sh, sl, bk] = await Promise.all([
        api.adminStats(key),
        api.adminShows(key),
        api.adminSlots(key),
        api.adminBookings(key, q),
      ]);
      setStats(s);
      setShows(sh);
      setSlots(sl);
      setBookings(bk);
      setAdminKey(key);
    } catch (err) {
      setError((err as Error).message);
      setAdminKey('');
    } finally {
      setLoading(false);
    }
  }, [adminKey, search]);

  async function exportCsv() {
    try {
      const blob = await api.adminExport(adminKey);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'thornfun-bookings.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert((err as Error).message); }
  }

  async function toggleRoom(show: AdminShow) {
    try {
      await api.updateAdminShow(adminKey, show.id, { isActive: !show.isActive });
      setShows(prev => prev.map(s => s.id === show.id ? { ...s, isActive: !s.isActive } : s));
    } catch (err) { alert((err as Error).message); }
  }

  async function toggleSlot(slot: AdminSlot) {
    try {
      await api.updateAdminSlot(adminKey, slot.id, { isBlocked: !slot.isBlocked });
      await load();
    } catch (err) { alert((err as Error).message); }
  }

  const isLoggedIn = !!adminKey;
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Activity size={15} /> },
    { key: 'bookings', label: `Bookings${bookings.length ? ` (${bookings.length})` : ''}`, icon: <BookOpen size={15} /> },
    { key: 'rooms', label: 'Rooms', icon: <Settings size={15} /> },
    { key: 'slots', label: 'Timeslots', icon: <TrendingUp size={15} /> },
  ];

  return (
    <main className="dungeon-shell min-h-screen px-6 pb-24 pt-32 text-white lg:px-12">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-ember">Thornfun Depths</p>
            <h1 className="mt-3 font-display text-5xl">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn && (
              <button
                onClick={() => load()}
                disabled={loading}
                className="flex items-center gap-2 border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/50 hover:border-ember hover:text-ember disabled:opacity-40"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            )}
            <a href="#/" className="text-xs uppercase tracking-widest text-white/40 hover:text-ember">← Back to site</a>
          </div>
        </header>

        {/* Login */}
        {!isLoggedIn && (
          <div className="mt-12 max-w-sm">
            <p className="mb-6 text-sm text-white/50">Enter your admin key to access the dashboard.</p>
            <form
              onSubmit={e => { e.preventDefault(); void load(inputKey); }}
              className="space-y-4 border border-white/10 bg-black/20 p-6"
            >
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40" htmlFor="admin-key-input">Admin Key</label>
                <div className="relative mt-2">
                  <input
                    id="admin-key-input"
                    type={showKey ? 'text' : 'password'}
                    className="w-full border border-white/15 bg-black/40 px-3 py-2.5 pr-10 text-sm text-white focus:border-ember focus:outline-none"
                    value={inputKey}
                    onChange={e => setInputKey(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && <p className="border border-red-500/40 bg-red-900/20 p-3 text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ember py-3 text-xs font-bold uppercase tracking-widest text-obsidian disabled:opacity-50"
              >
                {loading ? 'Opening…' : 'Open Dashboard'}
              </button>
            </form>
          </div>
        )}

        {/* Dashboard */}
        {isLoggedIn && (
          <div className="mt-8">
            {/* Tabs */}
            <nav className="flex gap-1 border-b border-white/10">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition ${
                    tab === t.key
                      ? 'border-b-2 border-ember text-ember'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </nav>

            {/* ── Overview ── */}
            {tab === 'overview' && stats && (
              <div className="mt-8 space-y-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard label="Total Bookings" value={stats.totalBookings} icon={<BookOpen size={16} />} />
                  <StatCard label="Confirmed" value={stats.confirmedBookings} sub="paid & locked in" icon={<CheckCircle2 size={16} />} />
                  <StatCard label="Pending" value={stats.pendingBookings} sub="awaiting payment" icon={<AlertTriangle size={16} />} />
                  <StatCard label="Cancelled" value={stats.cancelledBookings} icon={<Ban size={16} />} />
                  <StatCard label="Total Revenue" value={fmt(stats.totalRevenueInCents)} sub="confirmed bookings only" icon={<TrendingUp size={16} />} />
                  <StatCard label="Active Upcoming Slots" value={stats.upcomingSlots} sub="with at least 1 booking" icon={<Activity size={16} />} />
                </div>

                <div className="border border-white/10 bg-black/10 p-6">
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Quick Actions</p>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setTab('bookings')} className="border border-white/15 px-4 py-2 text-xs uppercase tracking-widest hover:border-ember hover:text-ember">View Bookings</button>
                    <button onClick={() => setTab('rooms')} className="border border-white/15 px-4 py-2 text-xs uppercase tracking-widest hover:border-ember hover:text-ember">Manage Rooms</button>
                    <button onClick={() => setTab('slots')} className="border border-white/15 px-4 py-2 text-xs uppercase tracking-widest hover:border-ember hover:text-ember">Manage Timeslots</button>
                    <button onClick={exportCsv} className="flex items-center gap-2 border border-ember/40 px-4 py-2 text-xs uppercase tracking-widest text-ember hover:border-ember">
                      <Download size={13} /> Export CSV
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Bookings ── */}
            {tab === 'bookings' && (
              <div className="mt-8 space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-white/50">{bookings.length} bookings</p>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        className="border border-white/15 bg-black/40 py-2 pl-8 pr-3 text-xs text-white placeholder-white/30 focus:border-ember focus:outline-none"
                        placeholder="Search name, email, ref…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && void load(adminKey, search)}
                      />
                    </div>
                    <button onClick={() => void load(adminKey, search)} className="border border-white/15 px-3 py-2 text-xs uppercase tracking-widest hover:border-ember">Search</button>
                    <button onClick={exportCsv} title="Export CSV" className="border border-white/15 px-3 py-2 text-ember hover:border-ember"><Download size={14} /></button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-white/10">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-black/30 text-[10px] uppercase tracking-widest text-white/40">
                      <tr>
                        <th className="p-4">Reference</th>
                        <th className="p-4">Guest</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-sm text-white/30">No bookings found.</td></tr>
                      )}
                      {bookings.map(b => (
                        <BookingRow key={b.id} booking={b} adminKey={adminKey} onRefresh={() => void load()} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Rooms ── */}
            {tab === 'rooms' && (
              <div className="mt-8">
                <p className="mb-5 text-sm text-white/50">Toggle rooms on or off, or update pricing.</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shows.map(show => (
                    <article key={show.id} className={`border p-5 transition ${show.isActive ? 'border-white/10 bg-black/20' : 'border-white/5 bg-black/10 opacity-60'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display text-lg text-white truncate">{show.title}</h3>
                          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/40">{show._count?.slots ?? 0} slots</p>
                        </div>
                        <button
                          onClick={() => toggleRoom(show)}
                          title={show.isActive ? 'Deactivate room' : 'Activate room'}
                          className={`shrink-0 transition ${show.isActive ? 'text-ember' : 'text-white/30'}`}
                        >
                          {show.isActive ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                        </button>
                      </div>
                      <div className="mt-4">
                        <label className="text-[10px] uppercase tracking-widest text-white/40" htmlFor={`price-${show.id}`}>Base price (pence)</label>
                        <input
                          id={`price-${show.id}`}
                          type="number"
                          className="mt-1.5 w-full border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-ember focus:outline-none"
                          defaultValue={show.basePriceInCents}
                          onBlur={e => void api.updateAdminShow(adminKey, show.id, { basePriceInCents: Number(e.target.value) })}
                        />
                      </div>
                      <p className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${show.isActive ? 'text-green-400' : 'text-white/30'}`}>
                        {show.isActive ? '● Live' : '○ Hidden'}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* ── Timeslots ── */}
            {tab === 'slots' && (
              <div className="mt-8">
                <p className="mb-5 text-sm text-white/50">Block or unblock individual timeslots. Showing next 60.</p>
                <div className="overflow-x-auto border border-white/10">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-black/30 text-[10px] uppercase tracking-widest text-white/40">
                      <tr>
                        <th className="p-4">Room</th>
                        <th className="p-4">Starts</th>
                        <th className="p-4">Capacity</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.slice(0, 60).map(slot => (
                        <tr key={slot.id} className={`border-t border-white/10 ${slot.isBlocked ? 'opacity-50' : ''}`}>
                          <td className="p-4 text-white/80">{slot.show?.title ?? '—'}</td>
                          <td className="p-4 font-mono text-xs text-white/70">
                            {new Date(slot.startsAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="p-4 text-white/70">
                            {slot.bookedCount + slot.heldCount}/{slot.totalCapacity}
                          </td>
                          <td className="p-4">
                            <span className={slot.isBlocked ? statusBadge('CANCELLED') : statusBadge('CONFIRMED')}>
                              {slot.isBlocked ? 'Blocked' : 'Open'}
                            </span>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => toggleSlot(slot)}
                              className={`text-xs uppercase tracking-widest transition ${slot.isBlocked ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}`}
                            >
                              {slot.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminDashboard;
