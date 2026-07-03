-- AlterTable
ALTER TABLE "ForumPost" ADD COLUMN "aiThreadRootId" TEXT;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_aiThreadRootId_fkey" FOREIGN KEY ("aiThreadRootId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
