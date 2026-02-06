/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: '#0f0f0f',
        'teal-accent': '#14b8a6',
        'purple-accent': '#a78bfa',
      },
      fontFamily: {
        sans: ['system-ui', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont'],
        mono: ['JetBrains Mono', 'Monaco', 'monospace'],
      },
      backdropBlur: {
        xl: 'blur(20px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
