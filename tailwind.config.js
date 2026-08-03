/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  prefix: 'ect-',
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Instrument Sans', 'system-ui', 'sans-serif'],
      },
      // Two semantic tracking tokens instead of the twenty-odd arbitrary
      // `tracking-[0.13em]`-style values this file used to invite. Display type
      // tracks negative (Fraunces is drawn generously and needs pulling in at
      // size); uppercase runs track positive, and only at two strengths:
      // `eyebrow` for standalone kickers, `label` for inline UI text.
      letterSpacing: {
        'display': '-0.018em',
        'display-sm': '-0.008em',
        'eyebrow': '0.14em',
        'label': '0.08em',
      },
      lineHeight: {
        'display': '1.06',
        'display-relaxed': '1.18',
        'body-tight': '1.4',
        'body-relaxed': '1.65',
      },
      // Named steps for the sizes that were previously hard-coded as
      // `text-[11px]`, `text-[13.5px]`, `text-[15px]`, `text-[22px]`, etc.
      // Deliberately sizes only — no letter-spacing is bundled in, so a
      // `tracking-*` utility on the same element behaves predictably.
      fontSize: {
        'nano': ['0.625rem', { lineHeight: '1.2' }],
        'micro': ['0.6875rem', { lineHeight: '1.35' }],
        'ui': ['0.8125rem', { lineHeight: '1.45' }],
        'ui-lg': ['0.9375rem', { lineHeight: '1.5' }],
        'price': ['1.375rem', { lineHeight: '1.1' }],
      },
      colors: {
        gold: {
          50: '#fff8e8',
          100: '#ffedbd',
          200: '#f8d979',
          300: '#e9bd3f',
          400: '#c99237',
          500: '#a97825',
          600: '#865d1e',
          700: '#664719',
          800: '#513916',
          900: '#422f14',
        },
        rose: {
          50: '#fef8f9',
          100: '#fceef1',
          200: '#f9dde3',
          300: '#f2bfc9',
          400: '#e796a3',
          500: '#d96b7d',
          600: '#c44d61',
          700: '#a33d4f',
          800: '#8a3544',
          900: '#722f3b',
        },
        emerald: {
          50: '#f0fdf6',
          100: '#dcfce9',
          200: '#bbf7d4',
          300: '#86efb0',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        sapphire: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc4fb',
          400: '#36a3f7',
          500: '#0c8ce9',
          600: '#006fc7',
        },
        plum: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
        },
        charcoal: '#1b1917',
        ink: '#17202a',
        noir: '#0d2436',
        cream: '#f7fbfd',
        pearl: '#ffffff',
        champagne: '#e7f3f8',
        sand: '#d9e7ef',
        bluestone: {
          50: '#eef9fb',
          100: '#d4f0f4',
          200: '#9fdde7',
          300: '#5bc2d1',
          400: '#259eb3',
          500: '#177c96',
          600: '#175b8c',
          700: '#16466c',
          800: '#133a59',
          900: '#102f49',
        },
      },
      boxShadow: {
        'luxe': '0 24px 60px -32px rgba(13,36,54,0.35)',
        'luxe-sm': '0 12px 30px -18px rgba(13,36,54,0.25)',
        'card': '0 1px 2px rgba(13,36,54,0.05)',
        'card-hover': '0 26px 50px -30px rgba(13,36,54,0.32)',
      },
    },
  },
  plugins: [],
}
