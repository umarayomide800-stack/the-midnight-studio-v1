import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Check, Sparkles, Image as ImageIcon, Wine, Shield } from 'lucide-react';
import type { AddOn } from '@soma-dungeon/types';

export interface AddonCardProps {
  addon: AddOn & {
    popular?: boolean;
    tag?: string;
  };
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
  maxQuantity?: number;
  className?: string;
}

export const AddonCard: React.FC<AddonCardProps> = ({
  addon,
  quantity,
  onQuantityChange,
  maxQuantity = 10,
  className = ''
}) => {
  const isSelected = quantity > 0;
  const unitPrice = addon.priceInCents / 100;
  const totalPrice = unitPrice * quantity;

  // Select appropriate placeholder icon based on addon title if no image
  const getIcon = () => {
    const titleLower = addon.title.toLowerCase();
    if (titleLower.includes('photo')) return <ImageIcon size={22} className="text-ember" />;
    if (titleLower.includes('drink') || titleLower.includes('tavern')) return <Wine size={22} className="text-ember" />;
    return <Shield size={22} className="text-ember" />;
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xs border p-5 transition-all duration-300 ${
        isSelected
          ? 'border-ember bg-slate-elevated shadow-ember ring-1 ring-ember/60'
          : 'border-white/10 bg-slate hover:border-white/20'
      } ${className}`}
    >
      {/* Popular / Highlight Ribbon */}
      {(addon.popular || addon.title.toLowerCase().includes('photo')) && (
        <div className="absolute right-0 top-0">
          <div className="flex items-center gap-1 rounded-bl-sm border-b border-l border-ember/50 bg-ember/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-ember">
            <Sparkles size={10} />
            Popular Pick
          </div>
        </div>
      )}

      {/* Main Content */}
      <div>
        <div className="flex items-start gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xs border border-white/10 bg-obsidian/60">
            {addon.imageUrl ? (
              <img
                src={addon.imageUrl}
                alt=""
                className="h-full w-full object-cover rounded-xs opacity-75 group-hover:opacity-90 transition-opacity"
              />
            ) : (
              getIcon()
            )}
          </div>

          <div className="pr-12">
            <h4 className="font-display text-lg font-bold text-white transition-colors group-hover:text-ember-light">
              {addon.title}
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-mist">
              {addon.description}
            </p>
          </div>
        </div>
      </div>

      {/* Footer: Price + Stepper */}
      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-widest text-white/40">
            Price
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-base font-bold text-ember">
              +£{unitPrice.toFixed(2)}
            </span>
            <span className="text-[10px] text-white/40">/ item</span>
          </div>

          {quantity > 1 && (
            <span className="mt-0.5 block font-mono text-[11px] text-white/60">
              Total: £{totalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Accessible Quantity Stepper */}
        <div
          className="flex items-center gap-1 rounded-xs border border-white/15 bg-obsidian/60 p-1"
          role="group"
          aria-label={`Quantity for ${addon.title}`}
        >
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
            disabled={quantity === 0}
            className="grid h-7 w-7 place-items-center rounded-2xs text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20 focus:outline-none focus:ring-1 focus:ring-ember"
            aria-label={`Decrease quantity of ${addon.title}`}
          >
            <Minus size={13} />
          </button>

          <span
            className="min-w-[1.75rem] text-center font-mono text-xs font-bold text-white"
            aria-live="polite"
            aria-atomic="true"
          >
            {quantity}
          </span>

          <button
            type="button"
            onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
            disabled={quantity >= maxQuantity}
            className="grid h-7 w-7 place-items-center rounded-2xs bg-white/5 text-ember transition hover:bg-ember hover:text-obsidian disabled:cursor-not-allowed disabled:opacity-20 focus:outline-none focus:ring-1 focus:ring-ember"
            aria-label={`Increase quantity of ${addon.title}`}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Selected Indicator Badge */}
      {isSelected && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-status-success">
          <Check size={12} className="stroke-[3]" />
          Added to your descent
        </div>
      )}
    </motion.div>
  );
};

export default AddonCard;
