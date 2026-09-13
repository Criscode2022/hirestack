-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'OPEN', 'VOID');

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "plan" "BillingPlan" NOT NULL,
    "amountUsd" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PAID',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hostedUrl" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_companyId_issuedAt_idx" ON "Invoice"("companyId", "issuedAt");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Paid demo invoices for existing Growth / Starter desks.
INSERT INTO "Invoice" ("id", "companyId", "plan", "amountUsd", "status", "issuedAt")
SELECT 'inv_' || c."id", c."id", c."plan",
  CASE c."plan" WHEN 'STARTER' THEN 49 WHEN 'GROWTH' THEN 199 ELSE 0 END,
  'PAID', TIMESTAMP '2026-08-28 15:00:00'
FROM "Company" c
WHERE c."plan" IN ('STARTER', 'GROWTH');
