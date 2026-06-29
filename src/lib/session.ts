import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { features } from "./env";
import { createSupabaseServer } from "./supabase/server";
import type { Prisma } from "@prisma/client";

const COOKIE = "bc_uid";

const withInterests = {
  interests: { include: { interest: true } },
} satisfies Prisma.UserInclude;

type UserWithInterests = Prisma.UserGetPayload<{ include: typeof withInterests }>;

/**
 * Returns the current user. Uses Supabase auth when configured (upserting a
 * matching row in our User table), otherwise a cookie-based demo session.
 */
export async function getCurrentUser(): Promise<UserWithInterests | null> {
  if (features.supabase) {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const existing = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: withInterests,
    });
    if (existing) return existing;

    // First sign-in: create our app user mirroring the Supabase identity.
    const name =
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split("@")[0] ||
      "Learner";
    return prisma.user.create({
      data: { supabaseId: user.id, email: user.email ?? null, name },
      include: withInterests,
    });
  }

  // Demo session is only available in dev (see features.demoSession).
  if (!features.demoSession) return null;

  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, include: withInterests });
}

/** Demo-session helper (no-op in Supabase mode where the cookie is managed by Supabase). */
export async function setSessionUser(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearSession() {
  if (features.supabase) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  const jar = await cookies();
  jar.delete(COOKIE);
}
