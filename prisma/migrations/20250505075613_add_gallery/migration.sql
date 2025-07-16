-- CreateTable
CREATE TABLE "galleries" (
    "id" SERIAL NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);
