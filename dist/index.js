import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./src/database/data-source.js";
import router from "./src/routes/index.js";
const app = express();
const port = 8000;
app.use(express.json());
app.use("/api", router);
app.get("/", (_req, res) => {
    res.send("Hello from Express on port 8000!");
});
AppDataSource.initialize()
    .then(() => {
    console.log("Database initialized");
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
})
    .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map