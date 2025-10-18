-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "stripe_customer_id" TEXT,
ADD COLUMN "stripe_subscription_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "businesses_stripe_customer_id_key" ON "businesses"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_stripe_subscription_id_key" ON "businesses"("stripe_subscription_id");
