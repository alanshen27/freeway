import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { parseHouseLayout, parseInventory } from "@/lib/gamification/shop";
import { prisma } from "@/lib/prisma";
import { Page, PageTitle } from "@/components/layout/Page";
import { HouseRoom } from "@/components/gamification/HouseRoom";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HousePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) redirect("/auth");

  return (
    <Page wide>
      <PageTitle
        eyebrow="Achievements"
        title="My room"
        description="Decorate your study space with items from the shop."
        action={
          <Button asChild size="sm">
            <Link href="/shop">
              <ShoppingBag className="size-4" />
              Shop
            </Link>
          </Button>
        }
      />
      <div className="mt-6">
        <HouseRoom
          initialLayout={parseHouseLayout(fresh.houseLayout)}
          inventory={parseInventory(fresh.inventory)}
        />
      </div>
    </Page>
  );
}
