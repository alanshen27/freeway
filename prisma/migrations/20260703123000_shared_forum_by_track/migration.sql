-- AlterTable
ALTER TABLE "Course" ADD COLUMN "trackSlug" TEXT;

-- Backfill track slugs from known career titles
UPDATE "Course" SET "trackSlug" = 'software-engineering' WHERE "title" = 'Software Engineering';
UPDATE "Course" SET "trackSlug" = 'ai-engineering' WHERE "title" = 'AI Engineering';
UPDATE "Course" SET "trackSlug" = 'mechanical-engineering' WHERE "title" = 'Mechanical Engineering';
UPDATE "Course" SET "trackSlug" = 'nuclear-engineering' WHERE "title" = 'Nuclear Engineering';
UPDATE "Course" SET "trackSlug" = 'introduction-to-physics' WHERE "title" = 'Introduction to Physics';
UPDATE "Course" SET "trackSlug" = 'materials-science' WHERE "title" = 'Materials Science';

-- Fallback for customized titles: slugify the course title
UPDATE "Course"
SET "trackSlug" = lower(regexp_replace(regexp_replace(trim("title"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE "trackSlug" IS NULL;

ALTER TABLE "Course" ALTER COLUMN "trackSlug" SET NOT NULL;

-- AlterTable
ALTER TABLE "ForumThread" ADD COLUMN "trackSlug" TEXT;

UPDATE "ForumThread" t
SET "trackSlug" = c."trackSlug"
FROM "Course" c
WHERE t."courseId" = c."id";

UPDATE "ForumThread" SET "trackSlug" = 'unknown' WHERE "trackSlug" IS NULL;

ALTER TABLE "ForumThread" ALTER COLUMN "trackSlug" SET NOT NULL;

CREATE INDEX "ForumThread_trackSlug_idx" ON "ForumThread"("trackSlug");
