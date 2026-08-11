import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./src/database/data-source.ts";
import authRoutes from "./src/routes/auth.ts";
import router from "./src/routes/index.ts";

const app = express();
const port = 8000;

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api", router);

app.get("/", (_req, res) => {
  res.send("Hello from Express on port 8000!");
});

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully.");
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
