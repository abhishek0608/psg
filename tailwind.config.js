/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  prefix: 'ect-',
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Jost', 'system-ui', 'sans-serif'],
      },
      // Two semantic tracking tokens instead of the twenty-odd arbitrary
      // `tracking-[0.13em]`-style values this file used to invite. Playfair is
      // drawn tight already, so display type only needs a hair of negative
      // tracking — overdoing it collides the hairline serifs and reads dense
      // rather than refined. Uppercase runs track positive, and only at two
      // strengths: `eyebrow` for standalone kickers, `label` for inline UI text.
      letterSpacing: {
        'display': '-0.01em',
        'display-sm': '-0.005em',
        'eyebrow': '0.18em',
        'label': '0.1em',
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
        // The listing grid is two-up on phones, so a card is only ~130px wide
        // inside its padding — and once the price shares that row with the
        // add-to-bag button, the figure itself gets ~96px. `price-sm` is the
        // phone step; cards step up to `price` from `sm:` where the width
        // exists. Both steps are sized so a seven-figure rupee amount still
        // fits its track rather than hitting the `truncate` and rendering a
        // clipped price, which reads as a bug rather than as a tight layout.
        //
        // These were 1.125/1.375rem when prices were set in Playfair. Jost is
        // geometric and runs ~25% wider at the same pixel size, so holding the
        // old steps clipped anything from ₹10,00,000 up; they come down a step
        // to buy that width back. Measured, not guessed — see `.ect-price`.
        'price-sm': ['1rem', { lineHeight: '1.15' }],
        'price': ['1.1875rem', { lineHeight: '1.1' }],
      },
      colors: {
        // The single metallic accent. Pulled off the orange-bronze it used to
        // sit on and onto true gold (#c9a227), which is the tone the homepage
        // components were already hard-coding.
        gold: {
          50: '#fdf9ef',
          100: '#f7edd3',
          200: '#ecd9a6',
          300: '#dcbf72',
          400: '#c9a227',
          500: '#ab8626',
          600: '#8d6d20',
          700: '#6f561b',
          800: '#5a4517',
          900: '#4a3914',
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
        // Neutrals are warm on purpose. These tokens used to be blue-tinted
        // (cream #f7fbfd, sand #d9e7ef, noir #0d2436) while the homepage
        // components hard-coded a warm ivory set — so the header and footer met
        // the page on a visible cool/warm seam. One warm ramp now, keyed to the
        // ivory (#faf7f2) and border (#e6ddce) the homepage already used.
        charcoal: '#1b1917',
        ink: '#3a352e',
        noir: '#1a1613',
        cream: '#faf7f2',
        pearl: '#ffffff',
        champagne: '#f3ece0',
        sand: '#e6ddce',
        // Near-black warm neutral: the desktop category bar, the footer ground,
        // and the small brand marks on the auth screens. Replaces the `bluestone`
        // scale, whose navy read closer to a bank than a jeweller.
        espresso: {
          50: '#f7f4ef',
          100: '#ebe4d9',
          200: '#d5c9b6',
          300: '#b6a68d',
          400: '#8d7c63',
          500: '#6b5c47',
          600: '#4e4234',
          700: '#3a3129',
          800: '#2b2723',
          900: '#1a1613',
        },
        // The single action colour. Both CTAs used to disagree — deep green on
        // the listing cards, crimson on the product page — so "add to bag" and
        // "add to cart" looked like different buttons for the same thing.
        forest: {
          50: '#f1f5f3',
          400: '#2c5a4e',
          500: '#1f3f37',
          600: '#17342d',
          700: '#112823',
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
