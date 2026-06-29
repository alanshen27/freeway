import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Page, PageTitle } from "@/components/layout/Page";
import { CoursesList } from "./CoursesList";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding/name");
  const courses = await prisma.course.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Page>
      <PageTitle
        title="My courses"
        description="Track progress across your programs"
        action={
          <Button asChild variant="default" size="sm">
            <Link href="/add">
              <Plus className="size-4" />
              New course
            </Link>
          </Button>
        }
      />

      {courses.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <p className="text-sm font-medium text-foreground">No courses yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Choose a career path to generate a personalized, hands-on course.
          </p>
          <Button asChild className="mt-6" size="sm">
            <Link href="/add">
              <Plus className="size-4" />
              Create your first course
            </Link>
          </Button>
        </div>
      ) : (
        <CoursesList
          courses={courses.map((c) => ({
            id: c.id,
            title: c.title,
            summary: c.summary,
            progress: c.progress,
            status: c.status,
            coverImageUrl: c.coverImageUrl,
          }))}
        />
      )}
    </Page>
  );
}
