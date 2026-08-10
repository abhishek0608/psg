-- Site-wide flat offer configuration. Replaces the volume-discount tiers as the
-- storefront's automatic discount; the volume columns stay in place but are no
-- longer configurable from the internal workspace.
ALTER TABLE "SiteConfig" ADD COLUMN "flatOfferEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteConfig" ADD COLUMN "flatOfferType" TEXT NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "SiteConfig" ADD COLUMN "flatOfferValue" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SiteConfig" ADD COLUMN "flatOfferLabel" TEXT;

-- Volume tiers are retired on the storefront, so make sure no live row keeps
-- applying one now that nothing in the UI can turn it off.
UPDATE "SiteConfig" SET "volumeDiscountEnabled" = false;

-- Promo codes, entered at checkout rather than shown on the catalog.
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERCENT',
    "value" INTEGER NOT NULL DEFAULT 0,
    "minOrderPaise" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "PromoCode_active_idx" ON "PromoCode"("active");

-- The redeemed code, kept on the order so it survives edits to the PromoCode row.
ALTER TABLE "Order" ADD COLUMN "promoCode" TEXT;
