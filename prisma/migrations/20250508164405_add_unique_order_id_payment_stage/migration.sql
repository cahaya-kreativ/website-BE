/*
  Warnings:

  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_order_id_fkey";

-- DropTable
DROP TABLE "payments";

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "payment_stage" INTEGER,
    "amount" TEXT NOT NULL,
    "method_payment" "PaymentMethod" NOT NULL,
    "payment_url" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_order_id_payment_stage_key" ON "Payment"("order_id", "payment_stage");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
