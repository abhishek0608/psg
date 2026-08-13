-- A campaign can now carry a different pricing rule for each selected product.
-- Null values preserve the current behaviour: the product inherits its parent
-- Offer's type, value, and label.
ALTER TABLE "OfferProduct"
  ADD COLUMN "offerType" TEXT,
  ADD COLUMN "offerValue" INTEGER,
  ADD COLUMN "offerLabel" TEXT;

-- FIXED_PRICE is valid for automatic campaigns, both as the campaign default
-- and as an individual product override. PromoCode keeps its existing types.
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_type_check";
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_value_check";

ALTER TABLE "Offer"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" DROP NOT NULL,
  ALTER COLUMN "value" DROP NOT NULL;

ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_type_check"
  CHECK (
    ("type" IS NULL AND "value" IS NULL)
    OR (
      "type" IS NOT NULL
      AND "value" IS NOT NULL
      AND "type" IN ('PERCENT', 'AMOUNT', 'FIXED_PRICE')
    )
  );

ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_value_check"
  CHECK (
    ("type" IS NULL AND "value" IS NULL)
    OR (
      "type" IS NOT NULL
      AND "value" IS NOT NULL
      AND (
        ("type" = 'PERCENT' AND "value" BETWEEN 1 AND 90)
        OR ("type" IN ('AMOUNT', 'FIXED_PRICE') AND "value" BETWEEN 1 AND 100000000)
      )
    )
  );

ALTER TABLE "OfferProduct"
  ADD CONSTRAINT "OfferProduct_pricing_check"
  CHECK (
    ("offerType" IS NULL AND "offerValue" IS NULL)
    OR (
      "offerType" IS NOT NULL
      AND "offerValue" IS NOT NULL
      AND (
        ("offerType" = 'PERCENT' AND "offerValue" BETWEEN 1 AND 90)
        OR (
          "offerType" IN ('AMOUNT', 'FIXED_PRICE')
          AND "offerValue" BETWEEN 1 AND 100000000
        )
      )
    )
  );
