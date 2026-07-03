-- AlterTable
ALTER TABLE "SectionProgress" ALTER COLUMN "completedAt" DROP NOT NULL,
ALTER COLUMN "completedAt" DROP DEFAULT;

ALTER TABLE "SectionProgress" ADD COLUMN "quizScore" INTEGER,
ADD COLUMN "quizTotal" INTEGER;
