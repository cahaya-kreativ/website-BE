/*
  Warnings:

  - You are about to drop the column `media` on the `galleries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "galleries" DROP COLUMN "media";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "addOn" TEXT;

-- CreateTable
CREATE TABLE "gallery_media" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "gallery_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_media_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gallery_media" ADD CONSTRAINT "gallery_media_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
