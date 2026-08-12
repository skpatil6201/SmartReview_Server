import { Router } from "express";
import { AppDataSource } from "../database/data-source.js";
import { Business } from "../modules/businesses/business.entity.js";
const router = Router();
const businessRepository = AppDataSource.getRepository(Business);
router.get("/", async (_req, res) => {
    const users = await businessRepository.find();
    res.json(users);
});
export default router;
//# sourceMappingURL=users.js.map