/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          accent: 'var(--brand-accent)',
          background: 'var(--brand-background)',
          surface: 'var(--brand-surface)',
          text: 'var(--brand-text)',
          'text-secondary': 'var(--brand-text-secondary)',
        },
      },
      fontSize: {
        'huge': ['4rem', { lineHeight: '1.1', fontWeight: '700' }],
        'large': ['2rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      minHeight: {
        'touch': '48px',
      },
      minWidth: {
        'touch': '48px',
      },
    },
  },
  plugins: [],
};
