-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "is_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remaining_amount" DECIMAL(10,2);
