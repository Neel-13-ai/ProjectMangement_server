import { db } from "../db/db.js";
import { users, projects, bugs } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

export const adminDashboard = async (req, res) => {
  try {
    const totalProjects = await db.select().from(projects);
    const totalBugs = await db.select().from(bugs);
    const totalUsers = await db.select().from(users);

    const adminCount = await db
      .select()
      .from(users)
      .where(eq(users.role, "ADMIN"));

    const testerCount = await db
      .select()
      .from(users)
      .where(eq(users.role, "TESTER"));

    const developerCount = await db
      .select()
      .from(users)
      .where(eq(users.role, "DEVELOPER"));

    const bugsByStatusRaw = await db.select({ status: bugs.status }).from(bugs);

    const bugsByPriorityRaw = await db
      .select({ priority: bugs.priority })
      .from(bugs);

    const bugsByStatus = bugsByStatusRaw.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    const bugsByPriority = bugsByPriorityRaw.reduce((acc, row) => {
      acc[row.priority] = (acc[row.priority] || 0) + 1;
      return acc;
    }, {});

    const latestProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt))
      .limit(5);

    const latestBugs = await db
      .select()
      .from(bugs)
      .orderBy(desc(bugs.createdAt))
      .limit(5);

    res.json({
      totalProjects: totalProjects.length,
      totalBugs: totalBugs.length,

      totalUsers: totalUsers.length,
      totalAdmins: adminCount.length,
      totalTesters: testerCount.length,
      totalDevelopers: developerCount.length,

      bugsByStatus,
      bugsByPriority,

      latestProjects,
      latestBugs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
