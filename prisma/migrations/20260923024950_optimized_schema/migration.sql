-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVerifiedSeller" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "PRODUCTSTATUS";

-- CreateIndex
CREATE INDEX "Auction_productId_idx" ON "Auction"("productId");

-- CreateIndex
CREATE INDEX "Auction_ownerId_idx" ON "Auction"("ownerId");

-- CreateIndex
CREATE INDEX "Bid_auctionId_idx" ON "Bid"("auctionId");

-- CreateIndex
CREATE INDEX "Bid_bidderId_idx" ON "Bid"("bidderId");

-- CreateIndex
CREATE INDEX "Product_ownerId_idx" ON "Product"("ownerId");
