/*
  Warnings:

  - Changed the type of `category` on the `galleries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `galleries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "galleries" DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;
