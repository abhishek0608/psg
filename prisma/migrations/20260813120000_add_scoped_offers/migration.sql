-- Automatic offers are first-class records so one campaign can cover the
-- entire catalog or any selected set of products. The join table represents a
-- single-product offer and a multi-product offer in exactly the same way.
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERCENT',
    "value" INTEGER NOT NULL,
    "label" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'ALL_PRODUCTS',
    "startsAt" TIMESTAMPTZ(3),
    "endsAt" TIMESTAMPTZ(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Offer_type_check" CHECK ("type" IN ('PERCENT', 'AMOUNT')),
    CONSTRAINT "Offer_scope_check" CHECK ("scope" IN ('ALL_PRODUCTS', 'PRODUCTS')),
    CONSTRAINT "Offer_value_check" CHECK (
      ("type" = 'PERCENT' AND "value" BETWEEN 1 AND 90)
      OR ("type" = 'AMOUNT' AND "value" BETWEEN 1 AND 100000000)
    ),
    CONSTRAINT "Offer_dates_check" CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" >= "startsAt")
);

CREATE TABLE "OfferProduct" (
    "offerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferProduct_pkey" PRIMARY KEY ("offerId", "productId"),
    CONSTRAINT "OfferProduct_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OfferProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Offer_active_startsAt_endsAt_idx" ON "Offer"("active", "startsAt", "endsAt");
CREATE INDEX "OfferProduct_productId_offerId_idx" ON "OfferProduct"("productId", "offerId");

-- Carry the existing singleton flat offer forward as an organisation-wide
-- automatic offer. Keeping the old SiteConfig columns makes this migration
-- non-destructive and lets an older deployment roll back safely.
INSERT INTO "Offer" (
  "id", "name", "type", "value", "label", "scope", "active", "createdAt", "updatedAt"
)
SELECT
  'legacy-org-flat-offer',
  'Storewide offer',
  CASE WHEN "flatOfferType" = 'AMOUNT' THEN 'AMOUNT' ELSE 'PERCENT' END,
  CASE
    WHEN "flatOfferType" = 'AMOUNT' THEN LEAST(GREATEST("flatOfferValue", 1), 100000000)
    ELSE LEAST(GREATEST("flatOfferValue", 1), 90)
  END,
  "flatOfferLabel",
  'ALL_PRODUCTS',
  "flatOfferEnabled" AND "flatOfferValue" > 0,
  "createdAt",
  "updatedAt"
FROM "SiteConfig"
WHERE "id" = 'default'
  AND "flatOfferValue" > 0;
