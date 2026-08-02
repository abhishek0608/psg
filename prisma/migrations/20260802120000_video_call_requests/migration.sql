-- Video consultations move from fixed slot booking to a call-back request.
--
-- There is no advisor rostered against a customer, so a booked half-hour slot
-- promised something the business could not keep. A request now carries the
-- shopper's contact details, when they are free, and the pieces they want to
-- see on the call; the team agrees the actual time out of band and writes it
-- back to "scheduledAt".

-- The slot is no longer chosen by the shopper, so it starts empty and the
-- one-booking-per-slot guard goes away with it.
ALTER TABLE "public"."VideoCallBooking" ALTER COLUMN "scheduledAt" DROP NOT NULL;
DROP INDEX IF EXISTS "public"."VideoCallBooking_active_scheduledAt_key";

ALTER TABLE "public"."VideoCallBooking"
  ADD COLUMN IF NOT EXISTS "preferredTime" TEXT,
  ADD COLUMN IF NOT EXISTS "contactChannel" TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS "items" JSONB,
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Statuses now track the call-back, not a reservation: NEW -> CONTACTED ->
-- SCHEDULED -> COMPLETED (or CANCELLED). Rows booked under the old flow keep a
-- confirmed slot, so they land on SCHEDULED rather than back in the queue.
ALTER TABLE "public"."VideoCallBooking" ALTER COLUMN "status" SET DEFAULT 'NEW';
UPDATE "public"."VideoCallBooking" SET "status" = 'SCHEDULED' WHERE "status" = 'BOOKED';

-- The list is ordered by when the request came in, not by slot.
DROP INDEX IF EXISTS "public"."VideoCallBooking_status_scheduledAt_idx";
CREATE INDEX IF NOT EXISTS "VideoCallBooking_status_createdAt_idx"
  ON "public"."VideoCallBooking"("status", "createdAt");

-- Storefront settings for the feature, editable from the internal workspace.
-- Money columns hold whole rupees; a fee of 0 means the call is free.
ALTER TABLE "public"."SiteConfig"
  ADD COLUMN IF NOT EXISTS "videoCallEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "videoCallFee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "videoCallMinPrice" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "videoCallMaxItems" INTEGER NOT NULL DEFAULT 5;
