-- Give every product a price.
--
-- This is a business-to-consumer storefront: a shopper cannot ask for a quote,
-- so a piece showing "Price on request" is a piece that cannot be bought. That
-- label is not a stored flag — the presenter derives it from a variant whose
-- listPricePaise is still 0 — so the fix is to leave no zero behind.
--
-- Two passes, matching scripts/price-unpriced-products.mjs (kept for products
-- added after this migration):
--   1. Pieces carrying spec attributes are priced from the same rate card the
--      20260801120000_price_catalog_in_inr migration used — gold weight at
--      ₹8,800/g, diamonds at ₹55,000/ct, plus a ₹15,000 making charge.
--   2. Pieces with no usable spec have nothing to compute from, so they take
--      the median price of already-priced pieces in their own category, and
--      fall back to the catalog-wide median when their category has no priced
--      comparables yet.
--
-- Money columns hold whole rupees (the "Paise" suffix is historical). Only
-- rows still sitting at 0 are touched, so an existing price is never rewritten.

-- 1. Priced from their own spec ---------------------------------------------

UPDATE "ProductVariant" v
SET "listPricePaise" = GREATEST(
      500,
      (ROUND((
        COALESCE(NULLIF(regexp_replace(COALESCE(p."productAttributes"->>'grossWeight', ''), '[^0-9.]', '', 'g'), ''), '0')::NUMERIC * 8800
        + COALESCE(NULLIF(regexp_replace(COALESCE(p."productAttributes"->>'diamondCarats', ''), '[^0-9.]', '', 'g'), ''), '0')::NUMERIC * 55000
        + 15000
      ) / 500) * 500)::INT
    ),
    "currency" = 'INR',
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Product" p
WHERE v."productId" = p."id"
  AND v."listPricePaise" = 0
  AND COALESCE(NULLIF(regexp_replace(COALESCE(p."productAttributes"->>'grossWeight', ''), '[^0-9.]', '', 'g'), ''), '0')::NUMERIC > 0;

-- 2. Priced from comparable pieces ------------------------------------------
-- The medians are read before this UPDATE writes, so they are built from the
-- genuinely priced catalog (including everything pass 1 just settled).

WITH category_median AS (
  SELECT p."category" AS category,
         (ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY v."listPricePaise")::NUMERIC / 500) * 500)::INT AS price
  FROM "ProductVariant" v
  JOIN "Product" p ON p."id" = v."productId"
  WHERE v."listPricePaise" > 0 AND v."active" = TRUE
  GROUP BY p."category"
),
catalog_median AS (
  SELECT (ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY v."listPricePaise")::NUMERIC / 500) * 500)::INT AS price
  FROM "ProductVariant" v
  WHERE v."listPricePaise" > 0 AND v."active" = TRUE
)
UPDATE "ProductVariant" v
SET "listPricePaise" = COALESCE(cm.price, gm.price),
    "currency" = 'INR',
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Product" p
LEFT JOIN category_median cm ON cm.category = p."category"
CROSS JOIN catalog_median gm
WHERE v."productId" = p."id"
  AND v."listPricePaise" = 0
  AND COALESCE(cm.price, gm.price) IS NOT NULL;

-- 3. Keep the price book in step --------------------------------------------
-- A price-book row outranks the variant price in the storefront, so a stale
-- zero left here would put "Price on request" back on a product we just priced.

UPDATE "PriceBookItem" i
SET "pricePaise" = priced.price
FROM (
  SELECT "productId", MIN("listPricePaise") AS price
  FROM "ProductVariant"
  WHERE "listPricePaise" > 0 AND "active" = TRUE
  GROUP BY "productId"
) priced
WHERE i."productId" = priced."productId"
  AND i."pricePaise" = 0;
