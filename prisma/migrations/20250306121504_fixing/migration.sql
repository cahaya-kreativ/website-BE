/*
  Warnings:

  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[name]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_id]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `price` on the `order_details` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `code` to the `products` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `price` on the `products` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `rating` on the `reviews` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `duration` on the `schedules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('unpaid', 'paid', 'pending', 'done', 'cancelled');

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "order_details" DROP CONSTRAINT "order_details_order_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_order_id_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_order_id_fkey";

-- AlterTable
ALTER TABLE "order_details" DROP COLUMN "price",
ADD COLUMN     "price" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'unpaid';

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "code" TEXT NOT NULL,
DROP COLUMN "price",
ADD COLUMN     "price" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "address" SET DEFAULT '',
ALTER COLUMN "city" SET DEFAULT '',
ALTER COLUMN "province" SET DEFAULT '',
ALTER COLUMN "postal_code" SET DEFAULT '';

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "rating",
ADD COLUMN     "rating" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "schedules" ALTER COLUMN "date" SET DATA TYPE DATE,
ALTER COLUMN "time" SET DATA TYPE TIME,
DROP COLUMN "duration",
ADD COLUMN     "duration" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_id_key" ON "reviews"("order_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_details" ADD CONSTRAINT "order_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
