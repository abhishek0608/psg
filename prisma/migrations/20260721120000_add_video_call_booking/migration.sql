CREATE TABLE "VideoCallBooking" (
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

CREATE UNIQUE INDEX "VideoCallBooking_reference_key" ON "VideoCallBooking"("reference");
CREATE UNIQUE INDEX "VideoCallBooking_active_scheduledAt_key" ON "VideoCallBooking"("scheduledAt") WHERE "status" <> 'CANCELLED';
CREATE INDEX "VideoCallBooking_status_scheduledAt_idx" ON "VideoCallBooking"("status", "scheduledAt");
CREATE INDEX "VideoCallBooking_email_idx" ON "VideoCallBooking"("email");
