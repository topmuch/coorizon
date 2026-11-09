/**
 * COORIZON seed script.
 *
 * Creates the initial SuperAdmin account so the platform can be administered.
 *
 * Run with: `bun run seed`
 *
 * Credentials are read from env (with safe defaults for local dev only).
 * In production, override SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD.
 */
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { ROLES } from "../src/lib/permissions";

async function main() {
  const email = (process.env.SEED_SUPERADMIN_EMAIL ?? "admin@coorizon.com").trim().toLowerCase();
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? "Coorizon2024!";
  const firstName = process.env.SEED_SUPERADMIN_FIRSTNAME ?? "Super";
  const lastName = process.env.SEED_SUPERADMIN_LASTNAME ?? "Admin";

  const existing = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });

  if (existing) {
    if (existing.role !== ROLES.SuperAdmin) {
      await db.user.update({ where: { id: existing.id }, data: { role: ROLES.SuperAdmin, status: "Active", isActive: true } });
      console.log(`✓ Existing user ${email} promoted to SuperAdmin.`);
    } else {
      console.log(`✓ SuperAdmin ${email} already exists (id: ${existing.id}).`);
    }
  } else {
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role: ROLES.SuperAdmin,
        status: "Active",
        isActive: true,
        firstName,
        lastName,
        emailVerified: new Date(),
      },
      select: { id: true, email: true, role: true },
    });
    console.log(`✓ SuperAdmin created: ${user.email} (id: ${user.id})`);
    console.log(`  Password: ${password}  (change it immediately in production)`);
  }

  // Create a few demo accounts for testing the other roles (dev only).
  if (process.env.NODE_ENV !== "production") {
    await ensureDemo("candidate@coorizon.com", "Candidate2024!", ROLES.Candidate, "Awa", "Candidat");
    await ensureDemo("recruiter@coorizon.com", "Recruiter2024!", ROLES.Recruiter, "Marco", "Recruteur", "Pending");
    console.log("✓ Demo accounts ready (candidate@coorizon.com / recruiter@coorizon.com).");
  }
}

async function ensureDemo(
  email: string,
  password: string,
  role: string,
  firstName: string,
  lastName: string,
  status: "Active" | "Pending" = "Active"
) {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return;
  const passwordHash = await hashPassword(password);
  await db.user.create({
    data: {
      email,
      passwordHash,
      role: role as never,
      status,
      isActive: true,
      firstName,
      lastName,
      ...(role === ROLES.Candidate
        ? { candidateProfile: { create: {} } }
        : {}),
    },
  });
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
