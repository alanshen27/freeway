import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "./LogoutButton";
import { ProfileAvatarUpload } from "./ProfileAvatarUpload";
import { Flame, Trophy, Coins, BarChart3 } from "lucide-react";
import { Page, PageTitle } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";

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
        <ProfileAvatarUpload name={fresh.name} initialAvatarUrl={fresh.avatarUrl} />

        <div id="stats" className="border-b border-border pb-6 scroll-mt-20">
          <div className="min-w-0">
            <p className="text-base font-medium">{fresh.name}</p>
            {fresh.email && (
              <p className="text-sm text-muted-foreground">{fresh.email}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">
                <Flame className="size-3" /> {fresh.streak} day streak
              </Badge>
              <Badge variant="outline">
                <Trophy className="size-3" /> {fresh.xp} XP
              </Badge>
              <Badge variant="outline">
                <Coins className="size-3" /> {fresh.coins} coins
              </Badge>
            </div>
            <Button asChild variant="link" className="mt-2 h-auto p-0 text-xs">
              <Link href="/progress">
                <BarChart3 className="size-3.5" />
                View full progress & badges
              </Link>
            </Button>
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
