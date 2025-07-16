/*
  Warnings:

  - You are about to alter the column `price` on the `order_details` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `subtotal` on the `order_details` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `total_amount` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `price` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "order_details" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "total_amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);
