import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface HoldTimerProps {
  holdSeconds: number;
  totalSeconds?: number;
  onExpire?: () => void;
  bookingReference?: string | null;
  className?: string;
  variant?: 'banner' | 'compact' | 'ring';
}

export const HoldTimer: React.FC<HoldTimerProps> = ({
  holdSeconds,
  totalSeconds = 600, // 10 minutes default
  onExpire,
  bookingReference,
  className = '',
  variant = 'banner'
}) => {
  const isUrgent = holdSeconds <= 120 && holdSeconds > 0; // Less than 2 minutes left
  const isExpired = holdSeconds <= 0;

  useEffect(() => {
    if (isExpired && onExpire) {
      onExpire();
    }
  }, [isExpired, onExpire]);

  // Calculate percentage remaining
  const percentage = Math.max(0, Math.min(100, (holdSeconds / totalSeconds) * 100));

  const minutes = Math.floor(holdSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (holdSeconds % 60).toString().padStart(2, '0');
  const timeDisplay = `${minutes}:${seconds}`;

  // Ring SVG Dimensions
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference - (percentage / 100) * ringCircumference;

  if (variant === 'ring') {
    return (
      <div
        role="timer"
        aria-live="polite"
        aria-label={`Holding timeslot for ${minutes} minutes and ${seconds} seconds`}
        className={`flex items-center gap-3 ${className}`}
      >
        <div className="relative h-11 w-11 shrink-0">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r={ringRadius}
              className="stroke-white/10"
              strokeWidth="3"
              fill="transparent"
            />
            <circle
              cx="22"
              cy="22"
              r={ringRadius}
              className={`transition-all duration-500 ease-linear ${
                isUrgent ? 'stroke-fiery' : 'stroke-ember'
              }`}
              strokeWidth="3"
              strokeDasharray={ringCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            {isUrgent ? (
              <AlertTriangle size={14} className="animate-pulse text-fiery" />
            ) : (
              <Clock size={14} className="text-ember" />
            )}
          </div>
        </div>

        <div>
          <span className="block text-[9px] font-bold uppercase tracking-widest text-white/50">
            Slot Hold
          </span>
          <span
            className={`font-mono text-base font-bold tracking-tight ${
              isUrgent ? 'text-fiery animate-pulse' : 'text-white'
            }`}
          >
            {timeDisplay}
          </span>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        role="timer"
        aria-live="polite"
        aria-label={`Holding timeslot. Time remaining: ${minutes} minutes and ${seconds} seconds`}
        className={`relative overflow-hidden rounded-xs border backdrop-blur-md transition-colors duration-500 ${
          isUrgent
            ? 'border-fiery/60 bg-fiery/10 shadow-[0_0_30px_rgba(229,57,53,0.2)]'
            : isExpired
            ? 'border-status-danger/70 bg-status-danger/20'
            : 'border-ember/40 bg-slate-deep/90 shadow-ember'
        } ${className}`}
      >
        {/* Progress Fill Bar */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
          <motion.div
            className={`h-full transition-all duration-1000 ease-linear ${
              isUrgent ? 'bg-fiery shadow-[0_0_10px_#e53935]' : 'bg-ember'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-2xs border ${
                isUrgent
                  ? 'border-fiery bg-fiery/20 text-fiery animate-bounce'
                  : 'border-ember/40 bg-ember/10 text-ember'
              }`}
            >
              {isUrgent ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
            </span>

            <div>
              <p className="text-xs font-bold tracking-wide text-white">
                {isExpired
                  ? 'Reservation Expired'
                  : isUrgent
                  ? 'Slot Release Imminent!'
                  : 'Timeslot Held Exclusively For You'}
              </p>
              <p className="text-[11px] text-mist">
                {isExpired
                  ? 'This slot has been returned to the public pool. Please select a time again.'
                  : 'Complete your checkout before the timer reaches zero to guarantee your tickets.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-2 sm:border-t-0 sm:pt-0">
            {bookingReference && (
              <div className="hidden text-right lg:block">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-white/40">
                  Hold Ref
                </span>
                <span className="font-mono text-xs font-semibold text-white/75">
                  {bookingReference}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xs border border-white/10 bg-black/40 px-3 py-1.5">
              <Clock size={14} className={isUrgent ? 'text-fiery' : 'text-ember'} />
              <span
                className={`font-mono text-base font-bold tracking-widest ${
                  isUrgent ? 'text-fiery font-black animate-pulse' : 'text-ember'
                }`}
              >
                {timeDisplay}
              </span>
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

export default HoldTimer;
