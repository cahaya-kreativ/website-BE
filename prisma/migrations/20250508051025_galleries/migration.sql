/*
  Warnings:

  - You are about to drop the `gallery_media` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `media` to the `galleries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `galleries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "gallery_media" DROP CONSTRAINT "gallery_media_gallery_id_fkey";

-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "media" TEXT NOT NULL,
ADD COLUMN     "type" "MediaType" NOT NULL;

-- DropTable
DROP TABLE "gallery_media";
