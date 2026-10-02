import { prisma } from "../src/db";

async function main() {
  const result = await prisma.$queryRaw`SELECT NOW()`;

  console.log("✅ Supabase connection successful!");
  console.log(result);
}

main()
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  