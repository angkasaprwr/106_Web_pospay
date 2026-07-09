-- Invoice, PaymentTransaction, PaymentWebhook tables

CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "paymentId" TEXT,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "transactionId" TEXT,
    "orderId" TEXT,
    "paymentType" TEXT,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "transactionTime" TIMESTAMP(3),
    "settlementTime" TIMESTAMP(3),
    "fraudStatus" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentWebhook" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'midtrans',
    "orderId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentWebhook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_paymentId_key" ON "Invoice"("paymentId");
CREATE INDEX IF NOT EXISTS "Invoice_billId_idx" ON "Invoice"("billId");
CREATE INDEX IF NOT EXISTS "Invoice_invoiceNo_idx" ON "Invoice"("invoiceNo");

CREATE INDEX IF NOT EXISTS "PaymentTransaction_paymentId_idx" ON "PaymentTransaction"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_transactionId_idx" ON "PaymentTransaction"("transactionId");

CREATE INDEX IF NOT EXISTS "PaymentWebhook_paymentId_idx" ON "PaymentWebhook"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentWebhook_orderId_idx" ON "PaymentWebhook"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentWebhook_createdAt_idx" ON "PaymentWebhook"("createdAt");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentWebhook" ADD CONSTRAINT "PaymentWebhook_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
