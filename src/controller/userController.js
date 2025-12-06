import { db } from "../db/db.js";
import { users } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export const getUsers = async (req, res) => {
  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    res
      .status(200)
      .json({ users: result, message: "User list get successfully " });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id));

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User fetched successfully",
      user: result[0],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = Number(id);

    const { name, email, role } = req.body;

    const existing = await db.select().from(users).where(eq(users.id, userId));

    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.id === userId && role && role !== "ADMIN") {
      return res.status(400).json({
        message: "Admin cannot change own role to non-admin",
      });
    }

    const updated = await db
      .update(users)
      .set({
        name: name ?? existing[0].name,
        email: email ?? existing[0].email,
        role: role ?? existing[0].role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    res.json({
      message: "User updated successfully",
      user: updated[0],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = Number(id);
    console.log("Toggle Status ID:", userId);

    // Fetch user
    const result = await db.select().from(users).where(eq(users.id, userId));

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const existing = result[0];

    // Prevent admin from disabling themselves
    if (req.user.id === userId) {
      return res.status(400).json({
        message: "Admin cannot deactivate their own account",
      });
    }

    // Toggle the status
    const newStatus = existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const updated = await db
      .update(users)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    res.json({
      message: `User status updated to ${newStatus}`,
      user: updated[0],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
