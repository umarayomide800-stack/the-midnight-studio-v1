import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Skull,
  Flame,
  AlertTriangle,
  Info,
  X,
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export interface ShowData {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription?: string;
  scareLevel: number;
  durationMinutes: number;
  ageRestriction: number;
  sensoryAdvisories?: string | null;
  coverImageUrl?: string | null;
  image?: string;
  eyebrow?: string;
  accent?: string;
  basePriceInCents?: number;
}

export interface ShowCardProps {
  show: ShowData;
  onSelect?: (show: ShowData) => void;
  isSelected?: boolean;
  className?: string;
}

export const ShowCard: React.FC<ShowCardProps> = ({
  show,
  onSelect,
  isSelected = false,
  className = ''
}) => {
  const [advisoryOpen, setAdvisoryOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Accessible keyboard ESC listener for advisory modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && advisoryOpen) {
        setAdvisoryOpen(false);
      }
    }
    if (advisoryOpen) {
      document.addEventListener('keydown', handleKeyDown);
      closeButtonRef.current?.focus();
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [advisoryOpen]);

  const displayImage =
    show.image ||
    show.coverImageUrl ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85';

  const eyebrow = show.eyebrow || 'Subterranean Sector';
  const gradientAccent = show.accent || 'from-crimson-dark to-obsidian';

  return (
    <>
      <motion.article
        whileHover={{ y: -5 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-sm border bg-slate transition-all duration-300 ${
          isSelected
            ? 'border-ember shadow-ember-lg ring-1 ring-ember'
            : 'border-white/10 hover:border-ember/60 hover:shadow-ember'
        } ${className}`}
      >
        {/* Visual Cover Header */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-obsidian">
          <img
            src={displayImage}
            alt={`${show.title} visual atmosphere`}
            className="h-full w-full object-cover grayscale-[20%] transition-transform duration-700 ease-out group-hover:scale-108 group-hover:grayscale-0"
            loading="lazy"
          />

          {/* Vignette Gradients */}
          <div className={`absolute inset-0 bg-gradient-to-t ${gradientAccent} opacity-75 mix-blend-multiply`} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate via-slate/40 to-transparent" />

          {/* Eyebrow & Badges Top Bar */}
          <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xs border border-white/20 bg-obsidian/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-md">
              <Sparkles size={11} className="text-ember" />
              {eyebrow}
            </span>

            <span className="rounded-xs border border-fiery/40 bg-obsidian/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fiery backdrop-blur-md">
              {show.ageRestriction}+ Only
            </span>
          </div>

          {/* Duration Badge Bottom Left of Image */}
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-xs font-semibold text-white/80">
            <Clock size={13} className="text-ember" />
            <span>{show.durationMinutes} min tour</span>
          </div>

          {/* Sensory Advisory Quick Icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAdvisoryOpen(true);
            }}
            className="absolute bottom-3 right-4 inline-flex items-center gap-1 rounded-xs border border-white/20 bg-obsidian/80 px-2 py-1 text-[10px] font-medium text-white/70 backdrop-blur-md transition hover:border-ember hover:text-ember focus:outline-none focus:ring-2 focus:ring-ember"
            aria-label={`View sensory warnings for ${show.title}`}
          >
            <AlertTriangle size={12} className="text-ember" />
            <span>Advisories</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-white transition-colors group-hover:text-ember-light">
              {show.title}
            </h3>

            <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-mist">
              {show.shortDescription}
            </p>
          </div>

          {/* Footer Bar: Scare Meter + Primary Action */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                  Intensity Meter
                </span>
                <div
                  className="mt-1 flex items-center gap-1"
                  role="meter"
                  aria-label={`Intensity level ${show.scareLevel} out of 5`}
                  aria-valuenow={show.scareLevel}
                  aria-valuemin={1}
                  aria-valuemax={5}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const active = i < show.scareLevel;
                    return (
                      <span key={i} title={`Intensity level ${i + 1}`}>
                        {show.scareLevel >= 4 ? (
                          <Skull
                            size={14}
                            className={active ? 'text-fiery drop-shadow-[0_0_6px_rgba(229,57,53,0.6)]' : 'text-white/15'}
                            fill={active ? 'currentColor' : 'none'}
                          />
                        ) : (
                          <Flame
                            size={14}
                            className={active ? 'text-ember drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]' : 'text-white/15'}
                            fill={active ? 'currentColor' : 'none'}
                          />
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {show.basePriceInCents && (
                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-white/40">From</span>
                  <span className="font-mono text-base font-bold text-white">
                    £{(show.basePriceInCents / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(show)}
                className={`ember-button relative w-full overflow-hidden py-3.5 text-center text-xs font-bold uppercase tracking-[0.18em] transition-all focus:outline-none focus:ring-2 focus:ring-ember ${
                  isSelected
                    ? 'bg-ember text-obsidian font-extrabold shadow-ember'
                    : 'bg-crimson text-white hover:bg-crimson-light active:translate-y-0.5'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isSelected ? 'Selected Story' : 'Select Experience'}
                  <ChevronRight size={14} />
                </span>
              </button>
            )}
          </div>
        </div>
      </motion.article>

      {/* Sensory & Epilepsy Advisory Modal */}
      <AnimatePresence>
        {advisoryOpen && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-obsidian/85 p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`advisory-title-${show.id}`}
            onClick={() => setAdvisoryOpen(false)}
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg border border-ember/50 bg-slate-elevated p-6 shadow-2xl sm:p-8"
            >
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setAdvisoryOpen(false)}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center border border-white/10 text-white/50 transition hover:border-ember hover:text-ember focus:outline-none focus:ring-2 focus:ring-ember"
                aria-label="Close advisories modal"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-sm border border-ember/40 bg-ember/10 text-ember">
                  <ShieldAlert size={22} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ember">Notice of Sensory FX</p>
                  <h4 id={`advisory-title-${show.id}`} className="font-display text-xl font-bold text-white">
                    {show.title}
                  </h4>
                </div>
              </div>

              <div className="mt-5 space-y-4 text-xs leading-relaxed text-white/80">
                <div className="border-l-2 border-fiery bg-fiery/10 p-3.5 text-white">
                  <p className="font-bold uppercase tracking-wider text-fiery">Theatrical Advisories</p>
                  <p className="mt-1 text-mist-light">
                    {show.sensoryAdvisories ||
                      'Strobe lighting, low visibility, theatrical smoke & fog, sudden loud noises, live jump actors, uneven stone floors, and confined spaces.'}
                  </p>
                </div>

                <div className="space-y-2 rounded-xs border border-white/10 bg-black/30 p-3.5 text-white/70">
                  <p className="flex items-center gap-2 font-semibold text-white">
                    <Info size={14} className="text-ember" />
                    Guest Safety Guidance
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-white/60">
                    <li>Recommended for ages {show.ageRestriction} and older.</li>
                    <li>Guests with photosensitive epilepsy or claustrophobia should consult our staff prior to entry.</li>
                    <li>Comfortable footwear is recommended; high heels are prohibited.</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAdvisoryOpen(false)}
                  className="w-full border border-white/20 bg-transparent py-3 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:border-ember hover:text-ember sm:w-auto sm:px-6"
                >
                  I Understand & Acknowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ShowCard;
