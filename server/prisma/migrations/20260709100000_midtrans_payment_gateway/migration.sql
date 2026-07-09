-- Midtrans QRIS payment gateway extension

ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "paymentType" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "gateway" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "merchantName" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "merchantId" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "midtransClientKey" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "midtransServerKey" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "productionMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "callbackUrl" TEXT;

CREATE INDEX IF NOT EXISTS "PaymentMethod_gateway_idx" ON "PaymentMethod"("gateway");

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentType" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "gateway" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "qrString" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "qrUrl" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "expiryTime" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "settlementTime" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "fraudStatus" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "signatureKey" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "midtransStatus" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key" ON "Payment"("orderId");
CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX IF NOT EXISTS "Payment_transactionId_idx" ON "Payment"("transactionId");

CREATE TABLE IF NOT EXISTS "PaymentHistory" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentNotification" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MidtransLog" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "orderId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MidtransLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentHistory" ADD CONSTRAINT "PaymentHistory_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentNotification" ADD CONSTRAINT "PaymentNotification_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentNotification" ADD CONSTRAINT "PaymentNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MidtransLog" ADD CONSTRAINT "MidtransLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PaymentHistory_paymentId_idx" ON "PaymentHistory"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentHistory_createdAt_idx" ON "PaymentHistory"("createdAt");
CREATE INDEX IF NOT EXISTS "PaymentNotification_paymentId_idx" ON "PaymentNotification"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentNotification_userId_idx" ON "PaymentNotification"("userId");
CREATE INDEX IF NOT EXISTS "PaymentNotification_status_idx" ON "PaymentNotification"("status");
CREATE INDEX IF NOT EXISTS "MidtransLog_paymentId_idx" ON "MidtransLog"("paymentId");
CREATE INDEX IF NOT EXISTS "MidtransLog_orderId_idx" ON "MidtransLog"("orderId");
CREATE INDEX IF NOT EXISTS "MidtransLog_createdAt_idx" ON "MidtransLog"("createdAt");
