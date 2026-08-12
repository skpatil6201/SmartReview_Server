import { Router } from "express";
import { AppDataSource } from "../database/data-source.ts";
import { Business } from "../modules/businesses/business.entity.ts";

const router = Router();
const businessRepository = AppDataSource.getRepository(Business);

router.get("/", async (_req, res) => {
  const users = await businessRepository.find();
  res.json(users);
});

export default router;
