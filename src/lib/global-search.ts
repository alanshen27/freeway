import { prisma } from "@/lib/prisma";
import { viewerCourseIdForTrack } from "@/lib/forum";
import { getCourseCompletion, completionPct, getCompletedSectionIds } from "@/lib/section-progress";
import {
  courseCardStatus,
  courseCardStatusSortOrder,
  type CourseCardStatus,
} from "@/lib/course-labels";
import type { AssignmentType } from "@prisma/client";

export type SearchResultItem = {
  id: string;
  type: "course" | "subject" | "lesson" | "section" | "assignment" | "forum";
  title: string;
  subtitle: string;
  href: string;
  courseStatus?: CourseCardStatus;
  assignmentType?: AssignmentType;
  assignmentCompleted?: boolean;
  moduleComplete?: boolean;
  lessonComplete?: boolean;
  sectionType?: string;
  sectionComplete?: boolean;
};

export type SearchResultGroup = {
  label: string;
  items: SearchResultItem[];
};

const LIMIT = 5;

export async function searchUserContent(
  userId: string,
  rawQuery: string
): Promise<SearchResultGroup[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const contains = { contains: query, mode: "insensitive" as const };

  const userCourses = await prisma.course.findMany({
    where: { ownerId: userId },
    select: { id: true, trackSlug: true },
  });
  const courseIds = userCourses.map((c) => c.id);
  const trackSlugs = [...new Set(userCourses.map((c) => c.trackSlug))];

  if (courseIds.length === 0) return [];

  const [courses, subjects, lessons, sections, assignments, threads] =
    await Promise.all([
      prisma.course.findMany({
        where: {
          ownerId: userId,
          OR: [{ title: contains }, { summary: contains }],
        },
        take: LIMIT,
        select: { id: true, title: true, summary: true, status: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.subject.findMany({
        where: {
          courseId: { in: courseIds },
          OR: [{ title: contains }, { summary: contains }],
        },
        take: LIMIT,
        select: {
          id: true,
          title: true,
          course: { select: { title: true } },
        },
        orderBy: { order: "asc" },
      }),
      prisma.lesson.findMany({
        where: {
          subject: { courseId: { in: courseIds } },
          OR: [{ title: contains }, { summary: contains }],
        },
        take: LIMIT,
        select: {
          id: true,
          title: true,
          subject: {
            select: {
              title: true,
              course: { select: { title: true } },
            },
          },
        },
        orderBy: { order: "asc" },
      }),
      prisma.lessonSection.findMany({
        where: {
          title: contains,
          lesson: { subject: { courseId: { in: courseIds } } },
        },
        take: LIMIT,
        select: {
          id: true,
          title: true,
          type: true,
          lesson: { select: { id: true, title: true } },
        },
        orderBy: { order: "asc" },
      }),
      prisma.assignment.findMany({
        where: {
          userId,
          status: { not: "FAILED" },
          OR: [{ title: contains }, { instructions: contains }],
        },
        take: LIMIT,
        select: {
          id: true,
          title: true,
          type: true,
          completedAt: true,
          course: { select: { title: true } },
        },
        orderBy: { dueAt: "asc" },
      }),
      trackSlugs.length > 0
        ? prisma.forumThread.findMany({
            where: {
              trackSlug: { in: trackSlugs },
              OR: [{ title: contains }, { body: contains }],
            },
            take: LIMIT,
            select: { id: true, title: true, trackSlug: true },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

  const courseIdByTrack = new Map(
    await Promise.all(
      trackSlugs.map(async (trackSlug) => [
        trackSlug,
        await viewerCourseIdForTrack(userId, trackSlug),
      ] as const)
    )
  );

  const subjectIds = subjects.map((s) => s.id);
  const lessonIds = lessons.map((l) => l.id);

  const [subjectSectionRows, lessonSectionRows] = await Promise.all([
    subjectIds.length > 0
      ? prisma.lessonSection.findMany({
          where: { lesson: { subjectId: { in: subjectIds } } },
          select: { id: true, lesson: { select: { subjectId: true } } },
        })
      : Promise.resolve([]),
    lessonIds.length > 0
      ? prisma.lessonSection.findMany({
          where: { lessonId: { in: lessonIds } },
          select: { id: true, lessonId: true },
        })
      : Promise.resolve([]),
  ]);

  const progressSectionIds = [
    ...new Set([
      ...subjectSectionRows.map((r) => r.id),
      ...lessonSectionRows.map((r) => r.id),
      ...sections.map((s) => s.id),
    ]),
  ];
  const completedSections = await getCompletedSectionIds(userId, progressSectionIds);

  function moduleComplete(subjectId: string) {
    const ids = subjectSectionRows
      .filter((r) => r.lesson.subjectId === subjectId)
      .map((r) => r.id);
    return ids.length > 0 && ids.every((id) => completedSections.has(id));
  }

  function lessonComplete(lessonId: string) {
    const ids = lessonSectionRows
      .filter((r) => r.lessonId === lessonId)
      .map((r) => r.id);
    return ids.length > 0 && ids.every((id) => completedSections.has(id));
  }

  const groups: SearchResultGroup[] = [];

  if (courses.length > 0) {
    const completion = await getCourseCompletion(
      userId,
      courses.map((c) => c.id)
    );
    groups.push({
      label: "Courses",
      items: courses
        .map((c) => {
          const comp = completion.get(c.id);
          const progress = comp ? completionPct(comp) : 0;
          const lessonsTotal = comp?.total ?? 0;
          return {
            id: c.id,
            type: "course" as const,
            title: c.title,
            subtitle: c.summary.slice(0, 80),
            href: `/courses/${c.id}`,
            courseStatus: courseCardStatus({
              status: c.status,
              progress,
              lessonsTotal,
            }),
          };
        })
        .sort(
          (a, b) =>
            courseCardStatusSortOrder(a.courseStatus!) -
            courseCardStatusSortOrder(b.courseStatus!)
        ),
    });
  }

  if (subjects.length > 0) {
    groups.push({
      label: "Subjects",
      items: subjects.map((s) => ({
        id: s.id,
        type: "subject" as const,
        title: s.title,
        subtitle: s.course.title,
        href: `/subjects/${s.id}`,
        moduleComplete: moduleComplete(s.id),
      })),
    });
  }

  if (lessons.length > 0) {
    groups.push({
      label: "Lessons",
      items: lessons.map((l) => ({
        id: l.id,
        type: "lesson" as const,
        title: l.title,
        subtitle: `${l.subject.course.title} · ${l.subject.title}`,
        href: `/lessons/${l.id}`,
        lessonComplete: lessonComplete(l.id),
      })),
    });
  }

  if (sections.length > 0) {
    groups.push({
      label: "Lesson sections",
      items: sections
        .filter((s) => s.title)
        .map((s) => ({
          id: s.id,
          type: "section" as const,
          title: s.title!,
          subtitle: s.lesson.title,
          href: `/lessons/${s.lesson.id}/sections/${s.id}`,
          sectionType: s.type,
          sectionComplete: completedSections.has(s.id),
        })),
    });
  }

  if (assignments.length > 0) {
    const typeLabel: Record<string, string> = {
      QUIZ: "Quiz",
      PRACTICE: "Practice",
      PROJECT: "Project",
    };
    groups.push({
      label: "Assignments",
      items: assignments.map((a) => ({
        id: a.id,
        type: "assignment" as const,
        title: a.title,
        subtitle: `${a.course.title} · ${typeLabel[a.type] ?? a.type}`,
        href: `/assignments/${a.id}`,
        assignmentType: a.type,
        assignmentCompleted: a.completedAt !== null,
      })),
    });
  }

  const forumItems: SearchResultItem[] = [];
  for (const t of threads) {
    const courseId = courseIdByTrack.get(t.trackSlug);
    if (!courseId) continue;
    forumItems.push({
      id: t.id,
      type: "forum",
      title: t.title,
      subtitle: "Forum discussion",
      href: `/feed/${courseId}/thread/${t.id}`,
    });
  }

  if (forumItems.length > 0) {
    groups.push({ label: "Forum", items: forumItems });
  }

  return groups;
}
