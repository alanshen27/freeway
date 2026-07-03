-- AlterTable
ALTER TABLE "ForumPost" ADD COLUMN "promptPostId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ForumPost_promptPostId_key" ON "ForumPost"("promptPostId");

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_promptPostId_fkey" FOREIGN KEY ("promptPostId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
