/*
  Warnings:

  - A unique constraint covering the columns `[label]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `label` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "products_name_key";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "label" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "products_label_key" ON "products"("label");
