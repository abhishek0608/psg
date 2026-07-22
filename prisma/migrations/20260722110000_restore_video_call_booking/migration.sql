CREATE TABLE IF NOT EXISTS "public"."VideoCallBooking" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoCallBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VideoCallBooking_reference_key"
  ON "public"."VideoCallBooking"("reference");

CREATE UNIQUE INDEX IF NOT EXISTS "VideoCallBooking_active_scheduledAt_key"
  ON "public"."VideoCallBooking"("scheduledAt")
  WHERE "status" <> 'CANCELLED';

CREATE INDEX IF NOT EXISTS "VideoCallBooking_status_scheduledAt_idx"
  ON "public"."VideoCallBooking"("status", "scheduledAt");

CREATE INDEX IF NOT EXISTS "VideoCallBooking_email_idx"
  ON "public"."VideoCallBooking"("email");
