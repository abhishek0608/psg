-- Reprice the catalog in Indian rupees.
--
-- The store sells in India and already charges through Razorpay in INR, but
-- catalog prices were stored (and shown) as USD. This migration moves every
-- price to INR:
--   1. Bundled catalog pieces get hand-estimated Indian retail prices, built
--      from their own spec (gold weight/purity, stone weight) at
--      18k ₹8,800/g, 22k ₹10,600/g, diamond ₹55,000/ct (pavé/melee) with
--      solitaires priced per stone, plus making charges.
--   2. Uploaded products that carry spec attributes are recomputed with the
--      same rate card.
--   3. Anything else still marked USD is converted at ₹88 to the dollar.
-- Money columns hold whole currency units (the "Paise" suffix is historical),
-- so the values below are rupees.

-- 1. Hand-priced bundled catalog ------------------------------------------

CREATE TABLE "inr_catalog_price" (
  slug TEXT PRIMARY KEY,
  price INT NOT NULL,
  breakup JSONB NOT NULL
);

INSERT INTO "inr_catalog_price" (slug, price, breakup) VALUES
  ('etoile-ring', 205000, '{"goldWeight":"4.2 g","goldValue":"₹36,960","stoneWeight":"0.5 ct","stoneValue":"₹1,45,000","labour":"₹23,040","total":"₹2,05,000"}'::JSONB),
  ('celeste-solitaire-ring', 435000, '{"goldWeight":"4.6 g","goldValue":"₹40,480","stoneWeight":"0.9 ct","stoneValue":"₹3,60,000","labour":"₹34,520","total":"₹4,35,000"}'::JSONB),
  ('auric-openwork-ring', 55000, '{"goldWeight":"5.1 g","goldValue":"₹44,880","stoneWeight":"—","stoneValue":"—","labour":"₹10,120","total":"₹55,000"}'::JSONB),
  ('verde-duet-bypass-ring', 120000, '{"goldWeight":"2.2 g","goldValue":"₹19,360","stoneWeight":"1.1 ct combined","stoneValue":"₹83,000","labour":"₹17,640","total":"₹1,20,000"}'::JSONB),
  ('lune-pendant', 105000, '{"goldWeight":"6.8 g","goldValue":"₹72,080","stoneWeight":"0.3 ct","stoneValue":"₹16,500","labour":"₹16,420","total":"₹1,05,000"}'::JSONB),
  ('soleil-bracelet', 75000, '{"goldWeight":"—","goldValue":"—","stoneWeight":"—","stoneValue":"—","labour":"₹75,000","total":"₹75,000"}'::JSONB),
  ('nuit-earrings', 70000, '{"goldWeight":"3.6 g","goldValue":"₹31,680","stoneWeight":"0.4 ct","stoneValue":"₹24,000","labour":"₹14,320","total":"₹70,000"}'::JSONB),
  ('padma-mangalsutra', 50000, '{"goldWeight":"3.8 g","goldValue":"₹40,280","stoneWeight":"—","stoneValue":"—","labour":"₹9,720","total":"₹50,000"}'::JSONB),
  ('knot-mangalsutra', 42000, '{"goldWeight":"3.2 g","goldValue":"₹33,920","stoneWeight":"—","stoneValue":"—","labour":"₹8,080","total":"₹42,000"}'::JSONB),
  ('luna-silver-ring', 2400, '{"goldWeight":"—","goldValue":"—","stoneWeight":"—","stoneValue":"—","labour":"₹2,400","total":"₹2,400"}'::JSONB),
  ('meera-silver-earrings', 2900, '{"goldWeight":"—","goldValue":"—","stoneWeight":"—","stoneValue":"—","labour":"₹2,900","total":"₹2,900"}'::JSONB),
  ('sita-silver-necklace', 3800, '{"goldWeight":"—","goldValue":"—","stoneWeight":"—","stoneValue":"—","labour":"₹3,800","total":"₹3,800"}'::JSONB);

UPDATE "Product" p
SET "priceBreakup" = c.breakup,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "inr_catalog_price" c
WHERE p."slug" = c.slug;

UPDATE "ProductVariant" v
SET "listPricePaise" = c.price,
    "currency" = 'INR',
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Product" p, "inr_catalog_price" c
WHERE v."productId" = p."id" AND p."slug" = c.slug;

-- Price-book rows win over the variant price in the storefront, so they have
-- to move together or the old USD number keeps showing.
UPDATE "PriceBookItem" i
SET "pricePaise" = c.price
FROM "Product" p, "inr_catalog_price" c
WHERE i."productId" = p."id" AND p."slug" = c.slug;

-- 2. Uploaded products priced from their spec attributes -------------------

UPDATE "ProductVariant" v
SET "listPricePaise" = GREATEST(
      500,
      ROUND((
        COALESCE(NULLIF(regexp_replace(COALESCE(p."productAttributes"->>'grossWeight', ''), '[^0-9.]', '', 'g'), ''), '0')::NUMERIC * 8800
        + COALESCE(NULLIF(regexp_replace(COALESCE(p."productAttributes"->>'diamondCarats', ''), '[^0-9.]', '', 'g'), ''), '0')::NUMERIC * 55000
        + 15000
      ) / 500) * 500
    ),
    "currency" = 'INR',
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Product" p
WHERE v."productId" = p."id"
  AND v."currency" = 'USD'
  AND p."productAttributes" IS NOT NULL
  AND COALESCE(NULLIF(regexp_replace(COALESCE(p."productAttributes"->>'grossWeight', ''), '[^0-9.]', '', 'g'), ''), '0')::NUMERIC > 0;

-- 3. Everything still in USD converts at the spot rate ---------------------

UPDATE "ProductVariant"
SET "listPricePaise" = ROUND(("listPricePaise" * 88)::NUMERIC / 100) * 100,
    "currency" = 'INR',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "currency" = 'USD';

UPDATE "PriceBookItem" i
SET "pricePaise" = ROUND((i."pricePaise" * 88)::NUMERIC / 100) * 100
FROM "PriceBook" b
WHERE i."priceBookId" = b."id"
  AND b."currency" = 'USD'
  AND NOT EXISTS (
    SELECT 1 FROM "Product" p
    JOIN "inr_catalog_price" c ON c.slug = p."slug"
    WHERE p."id" = i."productId"
  );

UPDATE "PriceBook" SET "currency" = 'INR', "updatedAt" = CURRENT_TIMESTAMP WHERE "currency" = 'USD';

DROP TABLE "inr_catalog_price";

-- 4. New rows are INR from here on ----------------------------------------

ALTER TABLE "ProductVariant" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "PriceBook" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "Quote" ALTER COLUMN "currency" SET DEFAULT 'INR';
