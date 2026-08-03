-- Drop the "Handcrafted in Jaipur" origin line from product detail lists.
-- The bundled catalog seeded it in 20260722140000; this strips it from every
-- row that still carries it (seeded or hand-entered) without touching the
-- other details. Replaying migrations from scratch re-inserts the seed rows
-- first, so this has to run as its own forward step rather than an edit to
-- the historical migration.
UPDATE "Product"
SET "details" = ARRAY(SELECT d FROM unnest("details") AS d WHERE d NOT ILIKE '%jaipur%'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM unnest("details") AS d WHERE d ILIKE '%jaipur%');
