-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "providerOrderRef" TEXT;

-- CreateIndex
CREATE INDEX "Payment_providerOrderRef_idx" ON "public"."Payment"("providerOrderRef");
