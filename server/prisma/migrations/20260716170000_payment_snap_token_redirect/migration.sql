-- Additive only: store Midtrans Snap token + redirect URL on Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "snapToken" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "redirectUrl" TEXT;
