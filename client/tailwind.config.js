/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Atmospheric Gothic Backgrounds
        obsidian: '#0D0D0E',
        slate: {
          DEFAULT: '#17191C',
          deep: '#121315',
          elevated: '#1E2126'
        },
        stone: {
          DEFAULT: '#22252A',
          dark: '#1A1C20',
          light: '#2E3238'
        },

        // Brand & Attraction Accents
        crimson: {
          DEFAULT: '#8B0000',
          dark: '#5A0000',
          light: '#B22222',
          glow: 'rgba(139, 0, 0, 0.45)'
        },
        ember: {
          DEFAULT: '#D4AF37',
          dark: '#997A15',
          light: '#F3E5AB',
          glow: 'rgba(212, 175, 55, 0.28)'
        },
        fiery: {
          DEFAULT: '#E53935',
          dark: '#C62828',
          light: '#EF5350'
        },
        mist: {
          DEFAULT: '#8E9299',
          dark: '#5E6166',
          light: '#B0B4BC'
        },

        // Status & Capacity Indicators
        status: {
          success: '#2E7D32',
          warning: '#E65100',
          danger: '#B71C1C',
          neutral: '#4B515D'
        }
      },
      fontFamily: {
        display: ['Cinzel', 'Cinzel Decorative', 'serif'],
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        ember: '0 0 35px rgba(212, 175, 55, 0.2)',
        'ember-lg': '0 0 55px rgba(212, 175, 55, 0.35)',
        'crimson-glow': '0 0 35px rgba(139, 0, 0, 0.4)',
        gothic: '0 18px 45px rgba(0, 0, 0, 0.75)',
        vignette: 'inset 0 0 100px rgba(0, 0, 0, 0.85)'
      },
      animation: {
        'ember-pulse': 'ember-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fog-drift': 'fog-drift 24s ease-in-out infinite alternate',
        shimmer: 'shimmer 2.5s infinite',
        flicker: 'torch-flicker 4s infinite ease-in-out'
      },
      keyframes: {
        'ember-pulse': {
          '0%, 100%': {
            opacity: '1',
            filter: 'drop-shadow(0 0 12px rgba(212, 175, 55, 0.65))'
          },
          '50%': {
            opacity: '0.65',
            filter: 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.25))'
          }
        },
        'fog-drift': {
          '0%': {
            transform: 'translateX(-4%) translateY(0) scale(1)'
          },
          '100%': {
            transform: 'translateX(4%) translateY(-2%) scale(1.04)'
          }
        },
        shimmer: {
          '0%': {
            transform: 'translateX(-100%)'
          },
          '100%': {
            transform: 'translateX(100%)'
          }
        },
        'torch-flicker': {
          '0%, 100%': { opacity: '1' },
          '12%': { opacity: '0.85' },
          '15%': { opacity: '0.6' },
          '18%': { opacity: '0.95' },
          '42%': { opacity: '0.78' },
          '65%': { opacity: '1' },
          '88%': { opacity: '0.88' },
          '90%': { opacity: '0.7' }
        }
      }
    }
  },
  plugins: []
};
