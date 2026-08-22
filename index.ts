import "reflect-metadata";
import express from "express";
import { env } from "./src/config/env.ts";
import { AppDataSource } from "./src/database/data-source.ts";
import authRoutes from "./src/routes/auth.ts";
import router from "./src/routes/index.ts";
import { UPLOAD_ROOT } from "./src/modules/users/avatar-upload.ts";

const app = express();
const port = env.port;

app.use(express.json());

// Uploaded profile photos. Served before the API routes so an <Image> on the
// phone can fetch "${API_HOST}/uploads/avatars/x.jpg" without a token — the
// filenames are random, and nothing sensitive lives in this directory.
app.use("/uploads", express.static(UPLOAD_ROOT, { maxAge: "7d" }));
app.use("/api/auth", authRoutes);
app.use("/api", router);

app.get("/", (_req, res) => {
  res.send(`Hello from Express on port ${port}!`);
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
