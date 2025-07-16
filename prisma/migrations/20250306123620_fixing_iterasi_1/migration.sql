/*
  Warnings:

  - The values [unpaid,cancelled] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `code` on the `products` table. All the data in the column will be lost.
  - You are about to alter the column `rating` on the `reviews` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - A unique constraint covering the columns `[name]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subtotal` to the `order_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_amount` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdAt` to the `schedules` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('pending', 'paid', 'process', 'done', 'cancel');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- DropIndex
DROP INDEX "products_code_key";

-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "order_details" ADD COLUMN     "subtotal" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "total_amount" INTEGER NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "products" DROP COLUMN "code",
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "reviews" ALTER COLUMN "rating" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "isBooked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "products_name_key" ON "products"("name");
