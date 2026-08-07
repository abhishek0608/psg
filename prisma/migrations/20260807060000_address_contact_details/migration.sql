-- Checkout's saved-address picker needs the whole delivery card, not just the
-- postal parts, so an address can be selected without re-typing who receives
-- it. lastUsedAt orders the picker with the most recently used address first.
-- AlterTable
ALTER TABLE "public"."Address" ADD COLUMN     "label" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Address_customerId_lastUsedAt_idx" ON "public"."Address"("customerId", "lastUsedAt");
