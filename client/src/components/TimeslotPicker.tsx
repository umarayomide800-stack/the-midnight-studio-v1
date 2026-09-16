import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Flame, Users, Sparkles } from 'lucide-react';
import type { Slot } from '@soma-dungeon/types';

export interface TimeslotPickerProps {
  slots: Slot[];
  selectedSlotId?: string | null;
  onSelectSlot: (slot: Slot) => void;
  isLoading?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const TimeslotPicker: React.FC<TimeslotPickerProps> = ({
  slots,
  selectedSlotId,
  onSelectSlot,
  isLoading = false,
  className = '',
  ariaLabel = 'Select tour timeslot'
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="h-24 animate-pulse rounded-xs border border-white/5 bg-slate/50 p-3.5"
          >
            <div className="h-4 w-12 rounded bg-white/10" />
            <div className="mt-3 h-3 w-20 rounded bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div
        className="rounded-xs border border-white/10 bg-slate/40 p-8 text-center text-mist"
        role="status"
      >
        <Clock className="mx-auto mb-3 text-white/30" size={32} />
        <p className="font-display text-lg text-white">No Timeslots Available</p>
        <p className="mt-1 text-xs">All gates are closed or booked for the selected date. Please choose another date.</p>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 ${className}`}
    >
      {slots.map((slot) => {
        const isSelected = selectedSlotId === slot.id;
        const isSoldOut = slot.remainingCapacity <= 0;
        const isSellingFast = slot.remainingCapacity > 0 && slot.remainingCapacity <= 4;
        const isFewLeft = slot.remainingCapacity > 4 && slot.remainingCapacity <= 8;

        const startTime = new Date(slot.startsAt).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });

        const endTime = new Date(slot.endsAt).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });

        const priceFormatted = `£${(slot.basePriceInCents / 100).toFixed(0)}`;

        return (
          <motion.button
            key={slot.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={isSoldOut}
            disabled={isSoldOut}
            onClick={() => !isSoldOut && onSelectSlot(slot)}
            whileTap={!isSoldOut ? { scale: 0.98 } : undefined}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-xs border p-3.5 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ember ${
              isSelected
                ? 'border-ember bg-ember text-obsidian shadow-ember ring-1 ring-ember'
                : isSoldOut
                ? 'cursor-not-allowed border-white/5 bg-obsidian/40 text-white/20'
                : 'border-white/10 bg-slate hover:border-ember/70 hover:bg-slate-elevated text-white'
            }`}
          >
            {/* Top Bar: Time & Peak Tag */}
            <div className="flex items-center justify-between">
              <span
                className={`font-mono text-base font-bold tracking-tight ${
                  isSelected ? 'text-obsidian' : isSoldOut ? 'line-through text-white/25' : 'text-white'
                }`}
              >
                {startTime}
              </span>

              {slot.isPeak ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-2xs border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    isSelected
                      ? 'border-obsidian/40 bg-obsidian/10 text-obsidian'
                      : 'border-ember/40 bg-ember/10 text-ember'
                  }`}
                  title="Peak hours pricing"
                >
                  <Sparkles size={9} />
                  Peak
                </span>
              ) : (
                <span
                  className={`text-[10px] font-mono font-medium ${
                    isSelected ? 'text-obsidian/75' : 'text-white/40'
                  }`}
                >
                  {priceFormatted}
                </span>
              )}
            </div>

            {/* Middle: Duration hint */}
            <div className="my-2 text-[10px] font-medium tracking-wide opacity-70">
              Until {endTime}
            </div>

            {/* Bottom Status Chip */}
            <div className="mt-1">
              {isSoldOut ? (
                <span className="inline-flex items-center gap-1 rounded-2xs border border-status-danger/40 bg-status-danger/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fiery">
                  Sold Out
                </span>
              ) : isSellingFast ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-2xs border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    isSelected
                      ? 'border-obsidian/40 bg-obsidian/15 text-obsidian font-extrabold'
                      : 'border-status-warning/40 bg-status-warning/15 text-[#FFA726]'
                  }`}
                >
                  <Flame size={10} className={isSelected ? 'text-obsidian' : 'text-[#FFA726]'} />
                  {slot.remainingCapacity} Left
                </span>
              ) : isFewLeft ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-2xs border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    isSelected
                      ? 'border-obsidian/30 text-obsidian'
                      : 'border-ember/30 bg-ember/5 text-ember-light'
                  }`}
                >
                  <Users size={10} />
                  Selling Fast
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium tracking-wide ${
                    isSelected ? 'text-obsidian/85' : 'text-white/45'
                  }`}
                >
                  {slot.remainingCapacity} spots
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default TimeslotPicker;
