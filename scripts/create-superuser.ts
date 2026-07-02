import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function usage() {
  console.log(`Usage:
  npm run admin:superuser -- --email you@example.com [--name "Your Name"]
  npm run admin:superuser -- --id <user-cuid>

Promotes an existing user to admin, or creates a new onboarded admin user by email.`);
}

async function main() {
  let email: string | undefined;
  let userId: string | undefined;
  let name = "Admin";

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--email" && args[i + 1]) email = args[++i];
    else if ((arg === "--id" || arg === "--user-id") && args[i + 1]) userId = args[++i];
    else if (arg === "--name" && args[i + 1]) name = args[++i];
    else if (arg === "--help" || arg === "-h") {
      usage();
      return;
    }
  }

  if (!email && !userId) {
    usage();
    process.exit(1);
  }

  let user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : email
      ? await prisma.user.findUnique({ where: { email } })
      : null;

  if (!user && email) {
    user = await prisma.user.create({
      data: { email, name, onboarded: true, isAdmin: true },
    });
    console.log(`Created admin user ${user.id} (${user.email})`);
    return;
  }

  if (!user) {
    console.error("User not found.");
    process.exit(1);
  }

  user = await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
  });
  console.log(`Promoted ${user.id} (${user.email ?? user.name}) to admin.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
