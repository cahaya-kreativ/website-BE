/*
  Warnings:

  - Added the required column `payment_url` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `method_payment` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('fullPayment', 'downPayment');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payment_stage" INTEGER,
ADD COLUMN     "payment_url" TEXT NOT NULL,
DROP COLUMN "method_payment",
ADD COLUMN     "method_payment" "PaymentMethod" NOT NULL;
