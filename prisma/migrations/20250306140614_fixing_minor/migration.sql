/*
  Warnings:

  - You are about to drop the column `customer_id` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `chats` table. All the data in the column will be lost.
  - Added the required column `receiver_id` to the `chats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_id` to the `chats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `portfolios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_portfolio_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_review_id_fkey";

-- AlterTable
ALTER TABLE "chats" DROP COLUMN "customer_id",
DROP COLUMN "employee_id",
ADD COLUMN     "receiver_id" INTEGER NOT NULL,
ADD COLUMN     "sender_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "portfolios" ADD COLUMN     "product_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "product_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
