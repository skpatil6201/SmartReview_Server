import "reflect-metadata";
import express from "express";
import { env } from "./src/config/env.js";
import { AppDataSource } from "./src/database/data-source.js";
import authRoutes from "./src/routes/auth.js";
import router from "./src/routes/index.js";
const app = express();
const port = env.port;
app.use(express.json());
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
//# sourceMappingURL=index.js.map