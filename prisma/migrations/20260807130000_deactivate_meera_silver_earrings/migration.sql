-- Take "Meera Silver Earrings" out of the storefront.
--
-- The piece has no usable photography: its only ProductImage row is a hotlinked
-- external CDN URL that no longer loads, and no S3 folder backs the slug, so the
-- listing renders as an empty card.
--
-- Deactivating rather than deleting is deliberate — every storefront read path
-- (products, products-filter, search) already filters on "active" = TRUE, so
-- this hides the piece everywhere while leaving the row, its variant, and any
-- order history intact. Reversing it is a one-line UPDATE once real images exist.

UPDATE "Product"
SET "active" = FALSE,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'meera-silver-earrings'
  AND "active" = TRUE;
