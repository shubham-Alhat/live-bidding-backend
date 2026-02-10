/*
  Warnings:

  - The values [SCHEDULED,CANCELLED] on the enum `STATUS` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `minBidIncrement` on the `Auction` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `auctionId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `bidFinalPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `Product` table. All the data in the column will be lost.
  - Added the required column `auctionDuration` to the `Auction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `Auction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationInSeconds` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PRODUCTSTATUS" AS ENUM ('LIVE', 'NOTLIVE', 'ARCHIVE');

-- AlterEnum
BEGIN;
CREATE TYPE "STATUS_new" AS ENUM ('ACTIVE', 'ENDED');
ALTER TABLE "public"."Auction" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Auction" ALTER COLUMN "status" TYPE "STATUS_new" USING ("status"::text::"STATUS_new");
ALTER TYPE "STATUS" RENAME TO "STATUS_old";
ALTER TYPE "STATUS_new" RENAME TO "STATUS";
DROP TYPE "public"."STATUS_old";
ALTER TABLE "Auction" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_auctionId_fkey";

-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_productId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_auctionId_fkey";

-- AlterTable
ALTER TABLE "Auction" DROP COLUMN "minBidIncrement",
ADD COLUMN     "auctionDuration" INTEGER NOT NULL,
ADD COLUMN     "productId" TEXT NOT NULL,
ALTER COLUMN "startTime" DROP NOT NULL,
ALTER COLUMN "endTime" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "productId";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "auctionId",
DROP COLUMN "bidFinalPrice",
DROP COLUMN "images",
ADD COLUMN     "durationInSeconds" INTEGER NOT NULL,
ADD COLUMN     "image" TEXT NOT NULL,
ADD COLUMN     "status" "PRODUCTSTATUS" NOT NULL DEFAULT 'NOTLIVE';

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
