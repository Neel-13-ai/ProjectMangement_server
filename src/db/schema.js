import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "DEVELOPER", "TESTER"]);

export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }),
  email: varchar("email", { length: 200 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: roleEnum("role").notNull(),
  status: userStatusEnum("status").default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectStatusEnum = pgEnum("project_status", [
  "TODO",
  "DOING",
  "DONE",
]);

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  createdBy: integer("created_by").references(() => users.id),
  status: projectStatusEnum("status").notNull().default("TODO"),
  assignedTo: integer("assigned_to")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const bugPriorityEnum = pgEnum("bug_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const bugStatusEnum = pgEnum("bug_status", [
  "ASSIGNED",
  "IN_PROGRESS",
  "FIXED",
  "TESTING",
  "CLOSED",
]);

export const bugs = pgTable("bugs", {
  id: serial("id").primaryKey(),

  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  assignedTo: integer("assigned_to")
    .references(() => users.id)
    .notNull(),
  priority: bugPriorityEnum("priority").notNull().default("LOW"),
  status: bugStatusEnum("status").notNull().default("ASSIGNED"),
  dueDate: timestamp("due_date").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});
