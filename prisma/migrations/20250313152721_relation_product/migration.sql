/*
  Warnings:

  - You are about to drop the column `portfolio_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `review_id` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "portfolio_id",
DROP COLUMN "review_id";
