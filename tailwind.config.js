/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        'dark-matte': {
          50: '#2a2a2a',
          100: '#1f1f1f',
          200: '#171717',
          300: '#0f0f0f',
          400: '#0a0a0a',
        },
        'charcoal-matte': '#0E0E0E',
        'artist-purple': '#8365AC',
        'neon-green': '#39FF14',
        'accent-gold': '#D4B896',
        'muted-teal': '#8FB3A8',
        'accent-aqua': {
          DEFAULT: '#66FCF1',
          hover: '#45C8C0',
        },
        'graphite-border': 'rgba(255, 255, 255, 0.15)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      scale: {
        '98': '0.98',
      },
      boxShadow: {
        'double-border': '0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 0 2px rgba(0, 0, 0, 0.5)',
        'glow-aqua': '0 0 20px rgba(102, 252, 241, 0.3)',
        'glow-purple': '0 0 20px rgba(131, 101, 172, 0.3)',
        'rebound': '0 4px 12px rgba(184, 160, 130, 0.3), 0 2px 4px rgba(184, 160, 130, 0.2)',
        'glow-gold': '0 0 12px rgba(184, 160, 130, 0.6), 0 0 24px rgba(184, 160, 130, 0.3)',
      },
      animation: {
        'pulse-glow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'sparkline': 'sparkline 0.6s ease-out',
        'coin-pop': 'coin-pop 0.6s ease-out forwards',
        'coin-spin': 'coin-spin 0.6s ease-out forwards',
        'flash-text': 'flash-text 0.6s ease-out forwards',
      },
      keyframes: {
        sparkline: {
          '0%': { transform: 'scaleX(0)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'scaleX(1)', opacity: '0' },
        },
        'coin-pop': {
          '0%': { 
            transform: 'translate(0, 0) scale(0)',
            opacity: '0'
          },
          '20%': { 
            transform: 'translate(-2px, -8px) scale(1)',
            opacity: '1'
          },
          '100%': { 
            transform: 'translate(-4px, -16px) scale(0.8)',
            opacity: '0'
          },
        },
        'coin-spin': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        'flash-text': {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.8)'
          },
          '30%': { 
            opacity: '1',
            transform: 'scale(1.1)'
          },
          '70%': { 
            opacity: '1',
            transform: 'scale(1)'
          },
          '100%': { 
            opacity: '0',
            transform: 'scale(0.9)'
          },
        },
      },
    },
  },
  plugins: [],
};