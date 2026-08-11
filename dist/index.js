import express from "express";
const app = express();
const port = 8000;
app.get("/", (_req, res) => {
    res.send("Hello from Express on port 8000!");
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map