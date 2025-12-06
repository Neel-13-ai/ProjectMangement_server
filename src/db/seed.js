import "dotenv/config";
import bcrypt from 'bcryptjs';
import { db } from "./db.js";
import { users } from "./schema.js";

async function seed() {
  console.log("🌱 Seeding admin user...");

  const hashed = await bcrypt.hash("admin123", 10);

  await db.insert(users).values({
    name: "Admin",
    email: "admin@example.com",
    password: hashed,
    role: "ADMIN",
    status: "ACTIVE",
  });

  console.log("✅ Admin user created!");
  process.exit(0);
}

seed();
