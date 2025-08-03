/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        gray: {
          900: '#111827',
          950: '#030712',
          1000: '#02040a',
        },
        cyan: {
          300: '#22d3ee',
          400: '#00DDFF',
          500: '#00B8D4',
          600: '#00838F',
          900: '#006064'
        },
        purple: {
          300: '#c084fc',
          400: '#ab47bc',
          600: '#7B1FA2',
          900: '#4A148C'
        },
        pink: {
          300: '#f9a8d4',
          400: '#ec4899',
          500: '#D81B60',
          900: '#880E4F'
        },
        orange: {
          300: '#fdba74',
          400: '#fb923c',
          500: '#FB8C00',
          900: '#E65100'
        },
        blue: {
          300: '#93c5fd',
          400: '#38bdf8',
          500: '#1976D2',
          900: '#0D47A1'
        },
        yellow: {
            300: '#fde047',
            400: '#facc15',
            500: '#FDD835',
            900: '#F57F17'
        },
        green: {
            300: '#86efac',
            400: '#4ade80',
            500: '#43A047',
            900: '#1B5E20'
        },
        red: {
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444',
        }
      },
      animation: {
        'spin-slow': 'spin 4s linear infinite',
        'spin-slower': 'spin 6s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-in-up': 'slide-in-up 0.5s ease-out forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        '9998': '9998',
        '9999': '9999',
      },
      transitionDuration: {
        '0': '0ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      }
    }
  },
  plugins: []
};