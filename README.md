# Jewelet — Jewellery Website

A Vue 3 + TypeScript jewellery landing page with Tailwind CSS (ect prefix).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Payments (UPI / credit / debit card)

Online payment runs on Razorpay Checkout. The code is complete; it needs four
environment variables and one webhook to go live.

1. **Set these in Vercel** (Project → Settings → Environment Variables):

   | Variable | Where it goes | What it is |
   | --- | --- | --- |
   | `RAZORPAY_KEY_ID` | server | Key id from the Razorpay dashboard |
   | `RAZORPAY_KEY_SECRET` | server | Key secret — **never** prefix with `VITE_` |
   | `RAZORPAY_WEBHOOK_SECRET` | server | The string you choose in step 2 |
   | `VITE_RAZORPAY_KEY_ID` | build | Same key id as above (public, safe to ship) |

2. **Create the webhook** in the Razorpay dashboard (Settings → Webhooks):
   - URL: `https://<your-domain>/api/payment?action=webhook`
   - Secret: any strong random string — the same one you put in
     `RAZORPAY_WEBHOOK_SECRET`
   - Events: `payment.captured`, `payment.failed`, `order.paid`

   The webhook is what records a UPI payment the customer approves *after*
   closing the browser tab, so skipping it means silently losing those orders.

3. **Activate the Razorpay account** (KYC + settlement bank account) and enable
   UPI and cards as payment methods. Test keys (`rzp_test_…`) work end to end
   without this; live keys (`rzp_live_…`) do not.

How it hangs together:

- `POST /api/create-order` prices the cart from the database, writes a PENDING
  `Order` + `Payment`, and opens a Razorpay order. The browser sends slugs and
  quantities only — never an amount.
- `POST /api/payment?action=verify` re-checks Razorpay's signature and re-reads
  the payment from their API before marking the order CONFIRMED.
- `POST /api/payment?action=webhook` does the same from Razorpay's side, and is
  idempotent with the verify route.

## Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vite**
- **Tailwind CSS** (all utility classes use the `ect-` prefix)
- **Fonts:** Playfair Display (display/headings), Jost (UI and body)

## Structure

- `AppHeader` — Fixed nav with logo and links (Collections, About, Contact)
- `Hero` — Full-height hero with tagline and CTA
- `CollectionGrid` — Featured pieces with `ProductCard` components
- `AboutSection` — Short brand story
- `AppFooter` — Brand, copyright, contact email

Replace the gradient placeholders in `ProductCard` with real image URLs when you have assets.
