import jwt from "jsonwebtoken";
import { db } from "../db/db.js";
import bcrypt from "bcryptjs";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.select().from(users).where(eq(users.email, email));

    if (result.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = result[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, status: user.status },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    res.json({ message: "Login successful", token, user: userResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const allowedRoles = ["DEVELOPER", "TESTER"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role. Allowed roles: 'DEVELOPER' or 'TESTER'",
      });
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const createdUser = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashed,
        role,
        status: "ACTIVE",
      })
      .returning();

    console.log(createdUser);

    const userResponse = {
      id: createdUser[0].id,
      name: createdUser[0].name,
      email: createdUser[0].email,
      role: createdUser[0].role,
      status: createdUser[0].status,
      createdAt: createdUser[0].createdAt,
    };

    res.status(201).json({
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDevelopers = async (req, res) => {
  try {
    // Allow only ADMIN or TESTER to access this API
    if (req.user.role !== "ADMIN" && req.user.role !== "TESTER") {
      return res.status(403).json({ message: "Access denied" });
    }

    const developers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.role, "DEVELOPER"));

    res.json({
      message: "Developers fetched successfully",
      developers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
