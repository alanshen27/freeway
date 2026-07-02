import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import { LogoutButton } from "./LogoutButton";
import { Flame, Trophy } from "lucide-react";
import { Page, PageTitle } from "@/components/layout/Page";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding/name");
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    include: { interests: { include: { interest: true } } },
  });
  if (!fresh) redirect("/onboarding/name");

  return (
    <Page>
      <PageTitle eyebrow="Account" title="Settings" description="Account and preferences" />

      <section className="mt-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <span className="flex size-12 items-center justify-center rounded-md bg-brand-50 text-sm font-semibold text-brand-700">
            {initials(fresh.name)}
          </span>
          <div>
            <p className="text-base font-medium">{fresh.name}</p>
            {fresh.email && (
              <p className="text-sm text-muted-foreground">{fresh.email}</p>
            )}
            <div className="mt-2 flex gap-2">
              <Badge variant="outline">
                <Trophy className="size-3" /> {fresh.xp} XP
              </Badge>
              <Badge variant="outline">
                <Flame className="size-3" /> {fresh.streak} day streak
              </Badge>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Interests</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {fresh.interests.map((i) => (
              <Badge key={i.interestId} variant="primary">
                {i.interest.label}
              </Badge>
            ))}
            {fresh.interests.length === 0 && (
              <p className="text-sm text-muted-foreground">No interests set.</p>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <LogoutButton />
        </div>
      </section>
    </Page>
  );
}
