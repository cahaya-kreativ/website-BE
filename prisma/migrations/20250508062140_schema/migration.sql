/*
  Warnings:

  - You are about to drop the column `media` on the `galleries` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `galleries` table. All the data in the column will be lost.
  - Added the required column `image` to the `galleries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "galleries" DROP COLUMN "media",
DROP COLUMN "type",
ADD COLUMN     "image" TEXT NOT NULL;
