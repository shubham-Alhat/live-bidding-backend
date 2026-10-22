/*
  Warnings:

  - Added the required column `thumbnail_public_id` to the `Show` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Show" ADD COLUMN     "thumbnail_public_id" TEXT NOT NULL;
