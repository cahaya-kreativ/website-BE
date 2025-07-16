/*
  Warnings:

  - A unique constraint covering the columns `[order_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "payments_order_id_payment_stage_key";

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");
