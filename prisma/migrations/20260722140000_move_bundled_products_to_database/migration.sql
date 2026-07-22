-- Move the former frontend fallback catalog into PostgreSQL.
-- Existing products win: rows are inserted only when their slug is absent.
ALTER TABLE "Product"
  ADD COLUMN "details" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "priceBreakup" JSONB;

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-etoile-ring', 'etoile-ring', 'Étoile Ring', 'Rings', 'multi-stone', 'gold', 'yellow', 'A luminous diamond ring inspired by starlight, featuring a brilliant-cut center stone with shimmering accent diamonds set in 18k gold. The delicate band catches light from every angle, making it a timeless statement piece.', ARRAY['18k Yellow Gold', 'Brilliant-cut Diamond (0.5ct)', 'Handcrafted in Jaipur', 'Certificate of Authenticity']::TEXT[], '{"goldWeight":"4.2 g","goldValue":"$1,113","stoneWeight":"0.5 ct","stoneValue":"$506","labour":"$212","total":"$1,831"}'::JSONB, ARRAY['bridal', 'classic', 'minimal']::TEXT[], ARRAY['diamond']::TEXT[], FALSE, TRUE, 4.8, 124, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-etoile-ring', "id", 'BUNDLED-ETOILE-RING', 'Étoile Ring', 1831, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-etoile-ring'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-etoile-ring-1', "id", '/ring-1.jpg', 'Étoile Ring image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-etoile-ring';

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-etoile-ring-2', "id", '/ring-2.jpg', 'Étoile Ring image 2', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-etoile-ring';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-celeste-solitaire-ring', 'celeste-solitaire-ring', 'Celeste Solitaire Ring', 'Rings', 'solitaire', 'gold', 'white', 'Classic solitaire ring with a single dominant round-cut center diamond in a clean white-gold setting. Designed for engagement and timeless everyday elegance.', ARRAY['18k White Gold', 'Round Solitaire Diamond (0.9ct)', 'Four-Prong Setting', 'Handcrafted in Jaipur']::TEXT[], '{"goldWeight":"4.6 g","goldValue":"$1,181","stoneWeight":"0.9 ct","stoneValue":"$819","labour":"$277","total":"$2,277"}'::JSONB, ARRAY['bridal', 'classic', 'minimal']::TEXT[], ARRAY['diamond']::TEXT[], TRUE, FALSE, 4.9, 76, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-celeste-solitaire-ring', "id", 'BUNDLED-CELESTE-SOLITAIRE-RING', 'Celeste Solitaire Ring', 2277, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-celeste-solitaire-ring'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-celeste-solitaire-ring-1', "id", '/celeste-solitaire-ring-1.webp', 'Celeste Solitaire Ring image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-celeste-solitaire-ring';

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-celeste-solitaire-ring-2', "id", '/celeste-solitaire-ring-2.webp', 'Celeste Solitaire Ring image 2', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-celeste-solitaire-ring';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-auric-openwork-ring', 'auric-openwork-ring', 'Auric Openwork Ring', 'Rings', 'open-ring', 'gold', 'yellow', 'Modern gold ring with an airy openwork design, parallel bands, and intricate cutout detailing. Crafted as a statement everyday ring without visible stones.', ARRAY['18k Yellow Gold', 'Openwork Multi-Band Design', 'Cutout Detailing', 'Handcrafted in Jaipur']::TEXT[], '{"goldWeight":"5.1 g","goldValue":"$470","stoneWeight":"—","stoneValue":"—","labour":"$229","total":"$699"}'::JSONB, ARRAY['modern', 'statement']::TEXT[], ARRAY[]::TEXT[], TRUE, FALSE, 4.6, 18, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-auric-openwork-ring', "id", 'BUNDLED-AURIC-OPENWORK-RING', 'Auric Openwork Ring', 699, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-auric-openwork-ring'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-auric-openwork-ring-1', "id", '/ring-1.jpg', 'Auric Openwork Ring image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-auric-openwork-ring';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-verde-duet-bypass-ring', 'verde-duet-bypass-ring', 'Verde Duet Bypass Ring', 'Rings', 'open-ring', 'gold', 'yellow', 'A contemporary bypass (“toi et moi”) ring in polished yellow gold, set with two emerald-cut green emeralds at the open ends and a ribbon of pavé diamonds along the shoulders. Airy, modern, and vivid.', ARRAY['18k Yellow Gold', 'Twin Emerald-cut Emeralds', 'Pavé Diamond Shoulders', 'Four-Prong Settings', 'Handcrafted in Jaipur']::TEXT[], '{"goldWeight":"2.2 g","goldValue":"$557","stoneWeight":"1.1 ct combined","stoneValue":"$1,181","labour":"$407","total":"$2,145"}'::JSONB, ARRAY['modern', 'minimal', 'statement']::TEXT[], ARRAY['emerald', 'diamond']::TEXT[], TRUE, FALSE, 4.9, 31, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-verde-duet-bypass-ring', "id", 'BUNDLED-VERDE-DUET-BYPASS-RING', 'Verde Duet Bypass Ring', 2145, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-verde-duet-bypass-ring'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-verde-duet-bypass-ring-1', "id", '/verde-duet-ring-1.png', 'Verde Duet Bypass Ring image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-verde-duet-bypass-ring';

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-verde-duet-bypass-ring-2', "id", '/verde-duet-ring-2.png', 'Verde Duet Bypass Ring image 2', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-verde-duet-bypass-ring';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-lune-pendant', 'lune-pendant', 'Lune Pendant', 'Necklaces', 'pendant', 'gold', 'white', 'A crescent-shaped pendant suspended on a fine chain, adorned with pavé-set diamonds. Inspired by moonlit nights in Rajasthan, this piece blends tradition with modern elegance.', ARRAY['22k Gold with Rhodium Finish', 'Pavé Diamonds (0.3ct total)', '18-inch Chain', 'Handcrafted in Jaipur']::TEXT[], '{"goldWeight":"6.8 g","goldValue":"$1,393","stoneWeight":"0.3 ct","stoneValue":"$422","labour":"$306","total":"$2,120"}'::JSONB, ARRAY['modern', 'minimal']::TEXT[], ARRAY['diamond']::TEXT[], TRUE, TRUE, 4.6, 89, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-lune-pendant', "id", 'BUNDLED-LUNE-PENDANT', 'Lune Pendant', 2120, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-lune-pendant'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-lune-pendant-1', "id", '/pendant-1.jpg', 'Lune Pendant image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-lune-pendant';

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-lune-pendant-2', "id", '/pendant-2.jpg', 'Lune Pendant image 2', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-lune-pendant';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-soleil-bracelet', 'soleil-bracelet', 'Soleil Bracelet', 'Bracelets', 'chain-bracelet', 'gold', 'yellow', 'Delicate yellow-gold chain bracelet with a polished nameplate pendant showcasing personalized initials in a modern serif font. Lobster clasp; minimal everyday piece with optional custom letters.', ARRAY['22k Gold', 'Personalized Initials', 'Rolo Chain', 'Lobster Clasp', 'Handcrafted in Jaipur']::TEXT[], '{"goldWeight":"—","goldValue":"—","stoneWeight":"—","stoneValue":"—","labour":"$1,639","total":"$1,639"}'::JSONB, ARRAY['modern', 'minimal', 'everyday']::TEXT[], ARRAY[]::TEXT[], TRUE, FALSE, 4.5, 56, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-soleil-bracelet', "id", 'BUNDLED-SOLEIL-BRACELET', 'Soleil Bracelet', 1639, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-soleil-bracelet'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-soleil-bracelet-1', "id", '/bracelet-1.jpg', 'Soleil Bracelet image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-soleil-bracelet';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-nuit-earrings', 'nuit-earrings', 'Nuit Earrings', 'Earrings', 'drop', 'gold', 'yellow', 'Minimal yellow-gold earrings with a sculptural J-hoop silhouette: a slim vertical bar and twin curved wires, each set with two round brilliant diamonds. Post backs; modern architectural everyday pair.', ARRAY['18k Yellow Gold', 'Brilliant-cut Diamonds', 'Post with Comfort Backs', 'Handcrafted in Jaipur']::TEXT[], '{"goldWeight":"3.6 g","goldValue":"$607","stoneWeight":"0.4 ct","stoneValue":"$193","labour":"$188","total":"$988"}'::JSONB, ARRAY['minimal', 'modern', 'everyday']::TEXT[], ARRAY['diamond']::TEXT[], FALSE, TRUE, 4.9, 203, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-nuit-earrings', "id", 'BUNDLED-NUIT-EARRINGS', 'Nuit Earrings', 988, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-nuit-earrings'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-nuit-earrings-1', "id", '/earring-1.jpg', 'Nuit Earrings image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-nuit-earrings';

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-nuit-earrings-2', "id", '/earring-2.jpg', 'Nuit Earrings image 2', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-nuit-earrings';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-padma-mangalsutra', 'padma-mangalsutra', 'Padma Mangal Sutra', 'Mangal Sutra', 'mangal-sutra', 'gold', 'yellow', 'A traditional 22k gold mangal sutra featuring a lotus pendant with vibrant pink enamel and a cascading tassel. The dual chain with classic black beads honours Indian bridal heritage.', ARRAY['22k Yellow Gold', 'Pink Meenakari Enamel', 'Black Bead Chain', 'Lotus & Tassel Pendant', 'Handcrafted in Jaipur']::TEXT[], '{"goldWeight":"3.8 g","goldValue":"$721","stoneWeight":"—","stoneValue":"—","labour":"$146","total":"$867"}'::JSONB, ARRAY['traditional', 'bridal']::TEXT[], ARRAY[]::TEXT[], TRUE, TRUE, 4.8, 38, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-padma-mangalsutra', "id", 'BUNDLED-PADMA-MANGALSUTRA', 'Padma Mangal Sutra', 867, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-padma-mangalsutra'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-padma-mangalsutra-1', "id", '/necklace-1.jpg', 'Padma Mangal Sutra image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-padma-mangalsutra';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-knot-mangalsutra', 'knot-mangalsutra', 'Knot Mangal Sutra', 'Mangal Sutra', 'mangal-sutra', 'gold', 'yellow', 'A contemporary mangal sutra with a delicate knot motif in 22k gold and black beads. Symbolises eternal bond and modern elegance.', ARRAY['22k Gold', 'Black Beads', 'Adjustable Length', 'Handcrafted in Jaipur']::TEXT[], '{"goldWeight":"3.2 g","goldValue":"$636","stoneWeight":"—","stoneValue":"—","labour":"$183","total":"$819"}'::JSONB, ARRAY['modern', 'bridal']::TEXT[], ARRAY['black-beads']::TEXT[], TRUE, FALSE, 4.7, 42, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-knot-mangalsutra', "id", 'BUNDLED-KNOT-MANGALSUTRA', 'Knot Mangal Sutra', 819, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-knot-mangalsutra'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-knot-mangalsutra-1', "id", 'https://www.giva.co/cdn/shop/files/PD0753_1.jpg?v=1713439409&width=990', 'Knot Mangal Sutra image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-knot-mangalsutra';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-luna-silver-ring', 'luna-silver-ring', 'Luna Silver Ring', 'Rings', 'open-ring', 'silver', 'oxidised', 'Minimal sterling silver ring with a subtle moon phase design. Perfect for everyday wear.', ARRAY['925 Sterling Silver', 'Oxidation-resistant', 'Handcrafted']::TEXT[], '{"goldWeight":"—","goldValue":"—","stoneWeight":"—","stoneValue":"—","labour":"$51","total":"$51"}'::JSONB, ARRAY['minimal', 'everyday']::TEXT[], ARRAY[]::TEXT[], FALSE, FALSE, 4.4, 31, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-luna-silver-ring', "id", 'BUNDLED-LUNA-SILVER-RING', 'Luna Silver Ring', 51, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-luna-silver-ring'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-luna-silver-ring-1', "id", 'https://www.giva.co/cdn/shop/files/R042_1.jpg?v=1712926930&width=990', 'Luna Silver Ring image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-luna-silver-ring';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-meera-silver-earrings', 'meera-silver-earrings', 'Meera Silver Earrings', 'Earrings', 'jhumka', 'silver', 'oxidised', 'Lightweight sterling silver jhumkas with traditional filigree. A timeless choice for both ethnic and casual wear.', ARRAY['925 Sterling Silver', 'Filigree Work', 'Handcrafted']::TEXT[], '{"goldWeight":"—","goldValue":"—","stoneWeight":"—","stoneValue":"—","labour":"$46","total":"$46"}'::JSONB, ARRAY['traditional', 'everyday']::TEXT[], ARRAY[]::TEXT[], FALSE, TRUE, 4.6, 67, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-meera-silver-earrings', "id", 'BUNDLED-MEERA-SILVER-EARRINGS', 'Meera Silver Earrings', 46, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-meera-silver-earrings'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-meera-silver-earrings-1', "id", 'https://www.giva.co/cdn/shop/files/ER0150_1.jpg?v=1713248262&width=990', 'Meera Silver Earrings image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-meera-silver-earrings';

INSERT INTO "Product" ("id", "slug", "title", "category", "subtype", "material", "color", "description", "details", "priceBreakup", "styleTags", "stoneTags", "isNewArrival", "isBestSeller", "rating", "reviewCount", "active", "createdAt", "updatedAt")
VALUES ('bundled-sita-silver-necklace', 'sita-silver-necklace', 'Sita Silver Necklace', 'Necklaces', 'pendant', 'silver', 'white', 'Elegant sterling silver necklace with a pendant. Ideal for occasions and daily wear.', ARRAY['925 Sterling Silver', '18-inch Chain', 'Handcrafted']::TEXT[], '{"goldWeight":"—","goldValue":"—","stoneWeight":"—","stoneValue":"—","labour":"$78","total":"$78"}'::JSONB, ARRAY['minimal', 'everyday']::TEXT[], ARRAY[]::TEXT[], FALSE, FALSE, 4.3, 28, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant" ("id", "productId", "sku", "title", "listPricePaise", "currency", "active", "createdAt", "updatedAt")
SELECT 'bundled-variant-sita-silver-necklace', "id", 'BUNDLED-SITA-SILVER-NECKLACE', 'Sita Silver Necklace', 78, 'USD', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-sita-silver-necklace'
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "active", "createdAt", "updatedAt")
SELECT 'bundled-image-sita-silver-necklace-1', "id", 'https://www.giva.co/cdn/shop/files/PD02027_1.jpg?v=1697115316&width=990', 'Sita Silver Necklace image 1', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" WHERE "id" = 'bundled-sita-silver-necklace';
