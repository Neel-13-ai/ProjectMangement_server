import { bugs, users, projects } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { db } from "../db/db.js";

import { alias } from "drizzle-orm/pg-core";

const devUser = alias(users, "devUser");
const testerUser = alias(users, "testUser");

export const createBug = async (req, res) => {
  try {
    const { title, description, priority, projectId, assignedTo, dueDate } =
      req.body;

    if (!title || !priority || !projectId || !assignedTo || !dueDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (req.user.role !== "TESTER") {
      return res.status(403).json({ message: "Only testers can create bugs" });
    }

    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, Number(projectId)));

    if (project.length === 0) {
      return res.status(400).json({ message: "Project not found" });
    }

    const dev = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(assignedTo)));

    if (dev.length === 0 || dev[0].role !== "DEVELOPER") {
      return res
        .status(400)
        .json({ message: "Assigned user must be a valid developer" });
    }

    // if (project[0].assignedTo !== Number(assignedTo)) {
    //   return res.status(400).json({
    //     message: "Developer is not assigned to this project",
    //   });
    // }

    const allowedPriority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (!allowedPriority.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    if (!dueDate || isNaN(new Date(dueDate).getTime())) {
      return res.status(400).json({ message: "Invalid due date" });
    }

    if (new Date(dueDate) < new Date()) {
      return res
        .status(400)
        .json({ message: "Due date must be in the future" });
    }

    const result = await db
      .insert(bugs)
      .values({
        title,
        description,
        priority,
        projectId: Number(projectId),
        assignedTo: Number(assignedTo),
        createdBy: req.user.id,
        dueDate: new Date(dueDate),
        status: "ASSIGNED", // default
      })
      .returning();

    return res.status(201).json({
      message: "Bug was assigned successfully",
      bug: result[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

export const updateBugDetails = async (req, res) => {
  try {
    const bugId = Number(req.params.bugId);
    const { title, description, priority, assignedTo, dueDate } = req.body;

    if (isNaN(bugId)) {
      return res.status(400).json({ message: "Invalid bug ID" });
    }

    // 1️⃣ Fetch bug
    const bugData = await db.select().from(bugs).where(eq(bugs.id, bugId));

    if (bugData.length === 0) {
      return res.status(404).json({ message: "Bug not found" });
    }

    const existing = bugData[0];

    // 2️⃣ Permission checks
    if (req.user.role === "DEVELOPER") {
      return res
        .status(403)
        .json({ message: "Developers cannot update bug details" });
    }

    if (req.user.role === "TESTER" && existing.createdBy !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can update only bugs you created" });
    }

    // 3️⃣ Validate priority (if provided)
    const allowedPriority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (priority && !allowedPriority.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority value" });
    }

    // 4️⃣ Validate assigned developer (if provided)
    let updatedAssignedTo = existing.assignedTo;

    if (assignedTo) {
      const dev = await db
        .select()
        .from(users)
        .where(eq(users.id, Number(assignedTo)));

      if (dev.length === 0 || dev[0].role !== "DEVELOPER") {
        return res
          .status(400)
          .json({ message: "Assigned user must be a valid developer" });
      }

      updatedAssignedTo = Number(assignedTo);
    }

    // 5️⃣ Validate due date (if provided)
    let updatedDueDate = existing.dueDate;

    if (dueDate) {
      const parsed = new Date(dueDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ message: "Invalid due date format" });
      }
      updatedDueDate = parsed;
    }

    // 6️⃣ Update bug
    const updated = await db
      .update(bugs)
      .set({
        title: title ?? existing.title,
        description: description ?? existing.description,
        priority: priority ?? existing.priority,
        assignedTo: updatedAssignedTo,
        dueDate: updatedDueDate,
        updatedAt: new Date(),
      })
      .where(eq(bugs.id, bugId))
      .returning();

    return res.json({
      message: "Bug updated successfully",
      bug: updated[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

export const updateBugStatus = async (req, res) => {
  try {
    const bugId = Number(req.params.bugId);
    const { status } = req.body;

    if (isNaN(bugId)) {
      return res.status(400).json({ message: "Invalid bug ID" });
    }

    const bugData = await db.select().from(bugs).where(eq(bugs.id, bugId));

    if (bugData.length === 0) {
      return res.status(404).json({ message: "Bug not found" });
    }

    const existing = bugData[0];

    const allowedStatus = [
      "ASSIGNED",
      "IN_PROGRESS",
      "FIXED",
      "TESTING",
      "CLOSED",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const developerTransitions = {
      ASSIGNED: "IN_PROGRESS",
      IN_PROGRESS: "FIXED",
    };

    const testerTransitions = {
      FIXED: "TESTING",
      TESTING: "CLOSED",
    };

    let validNextStatus = null;

    if (req.user.role === "DEVELOPER") {
      if (existing.assignedTo !== req.user.id) {
        return res.status(403).json({
          message: "You can update only bugs assigned to you",
        });
      }
      validNextStatus = developerTransitions[existing.status];
    } else if (req.user.role === "TESTER") {
      if (existing.createdBy !== req.user.id) {
        return res.status(403).json({
          message: "You can update only bugs you created",
        });
      }
      validNextStatus = testerTransitions[existing.status];
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    if (validNextStatus !== status) {
      return res.status(400).json({
        message: `Invalid transition: ${req.user.role} cannot move bug from ${existing.status} → ${status}`,
      });
    }

    await db
      .update(bugs)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(bugs.id, bugId));

    const devUser = alias(users, "devUser");
    const testerUser = alias(users, "testerUser");

    const updatedBug = await db
      .select({
        id: bugs.id,
        title: bugs.title,
        description: bugs.description,
        priority: bugs.priority,
        status: bugs.status,
        dueDate: bugs.dueDate,
        projectId: bugs.projectId,
        projectName: projects.name,
        assignedToId: bugs.assignedTo,
        assignedToName: devUser.name,
        createdById: bugs.createdBy,
        createdByName: testerUser.name,
        createdAt: bugs.createdAt,
        updatedAt: bugs.updatedAt,
      })
      .from(bugs)
      .leftJoin(projects, eq(bugs.projectId, projects.id))
      .leftJoin(devUser, eq(bugs.assignedTo, devUser.id))
      .leftJoin(testerUser, eq(bugs.createdBy, testerUser.id))
      .where(eq(bugs.id, bugId))
      .limit(1);

    return res.json({
      message: "Bug status updated successfully",
      bug: updatedBug[0],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

export const getBugById = async (req, res) => {
  try {
    const bugId = Number(req.params.bugId);

    if (isNaN(bugId)) {
      return res.status(400).json({ message: "Invalid bug ID" });
    }

    // 1️⃣ Fetch bug
    const bugData = await db.select().from(bugs).where(eq(bugs.id, bugId));

    if (bugData.length === 0) {
      return res.status(404).json({ message: "Bug not found" });
    }

    const bugInfo = bugData[0];

    // 2️⃣ Role-based permission checks
    if (req.user.role === "TESTER" && bugInfo.createdBy !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You cannot view bugs you did not create" });
    }

    if (req.user.role === "DEVELOPER" && bugInfo.assignedTo !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only view bugs assigned to you" });
    }

    res.json({
      message: "Bug fetched successfully",
      bug: bugInfo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const softDeleteBug = async (req, res) => {
  try {
    const bugId = Number(req.params.bugId);

    if (isNaN(bugId)) {
      return res.status(400).json({ message: "Invalid bug ID" });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can delete bugs" });
    }

    // Check if bug exists
    const bugData = await db.select().from(bugs).where(eq(bugs.id, bugId));

    if (bugData.length === 0) {
      return res.status(404).json({ message: "Bug not found" });
    }

    // Soft delete
    const updated = await db
      .update(bugs)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bugs.id, bugId))
      .returning();

    res.json({
      message: "Bug deleted successfully",
      bug: updated[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getBugs = async (req, res) => {
  try {
    let whereCondition;

    // Role-based filtering
    switch (req.user.role) {
      case "TESTER":
        whereCondition = eq(bugs.createdBy, req.user.id);
        break;

      case "DEVELOPER":
        whereCondition = eq(bugs.assignedTo, req.user.id);
        break;

      case "ADMIN":
      default:
        whereCondition = undefined; // admin sees all
    }

    const results = await db
      .select({
        id: bugs.id,
        title: bugs.title,
        description: bugs.description,
        priority: bugs.priority,
        status: bugs.status,
        dueDate: bugs.dueDate,

        // project data
        projectId: bugs.projectId,
        projectName: projects.name,

        // assigned developer
        assignedToId: bugs.assignedTo,
        assignedToName: devUser.name,

        // tester who created this bug
        createdById: bugs.createdBy,
        createdByName: testerUser.name,

        createdAt: bugs.createdAt,
        updatedAt: bugs.updatedAt,
      })
      .from(bugs)
      .leftJoin(projects, eq(bugs.projectId, projects.id))
      .leftJoin(devUser, eq(bugs.assignedTo, devUser.id))
      .leftJoin(testerUser, eq(bugs.createdBy, testerUser.id))
      .where(whereCondition);

    res.json({
      message: "Bugs fetched successfully",
      bugs: results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
