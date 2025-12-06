import "dotenv/config";
import express from "express";
import { db } from "./db/db.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import bugRoutes from "./routes/bugRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import cors from "cors";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "https://project-mangement-henna.vercel.app",
    // credentials: true,
  })
);

const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", userRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/bug", bugRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
