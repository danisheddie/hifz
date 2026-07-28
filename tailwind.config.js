/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Themeable via CSS variables (see index.css). Channels are space-
        // separated RGB so Tailwind's /opacity modifiers keep working.
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        emerald: 'rgb(var(--c-emerald) / <alpha-value>)',
        amber: 'rgb(var(--c-amber) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
      },
      fontFamily: {
        arabic: ['Amiri', 'serif'],
        // Qur'anic text: the official KFGQPC Uthmanic Hafs face, paired with
        // quran.com's matching `text_uthmani`, so tajwīd marks render as the
        // printed Madani mushaf. Amiri Quran is a fallback.
        quran: [
          '"KFGQPC Uthmanic Script HAFS"',
          '"Amiri Quran"',
          'Amiri',
          'serif',
        ],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'scale-in': 'scale-in 0.45s ease-out',
      },
    },
  },
  plugins: [],
}
