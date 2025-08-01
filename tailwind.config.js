/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#030712'
        },
        cyan: {
          400: '#00BCD4',
          500: '#00ACC1',
          600: '#00838F',
          900: '#006064'
        },
        purple: {
          400: '#9C27B0',
          600: '#7B1FA2',
          900: '#4A148C'
        },
        pink: {
          400: '#E91E63',
          500: '#D81B60',
          900: '#880E4F'
        },
        orange: {
          400: '#FF9800',
          500: '#FB8C00',
          900: '#E65100'
        },
        blue: {
          400: '#2196F3',
          500: '#1976D2',
          900: '#0D47A1'
        },
        yellow: {
          400: '#FFEB3B',
          500: '#FDD835',
          900: '#F57F17'
        },
        green: {
          400: '#4CAF50',
          500: '#43A047',
          900: '#1B5E20'
        }
      },
      animation: {
        'spin-slow': 'spin 4s linear infinite',
        'spin-slower': 'spin 6s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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