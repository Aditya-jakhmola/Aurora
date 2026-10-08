-- AlterTable
ALTER TABLE "HistoryItem" ADD COLUMN     "artistId" TEXT;

-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "artistId" TEXT;

-- AlterTable
ALTER TABLE "PlaylistTrack" ADD COLUMN     "artistId" TEXT;
