import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { parseInventory } from "@/lib/gamification/shop";
import { prisma } from "@/lib/prisma";
import { Page, PageTitle } from "@/components/layout/Page";
import { ShopGrid } from "@/components/gamification/ShopGrid";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) redirect("/auth");

  return (
    <Page wide>
      <PageTitle
        eyebrow="Gamification"
        title="Shop"
        description="Spend coins on decor for your room. You earn 1 coin per XP."
      />
      <div className="mt-6">
        <ShopGrid coins={fresh.coins} inventory={parseInventory(fresh.inventory)} />
      </div>
    </Page>
  );
}
