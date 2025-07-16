/*
  Warnings:

  - You are about to drop the column `image` on the `galleries` table. All the data in the column will be lost.
  - Added the required column `media` to the `galleries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "galleries" DROP COLUMN "image",
ADD COLUMN     "media" TEXT NOT NULL;
