import { Router } from "express";
import { AppDataSource } from "../database/data-source.ts";
import { User } from "../modules/users/user.entity.ts";

const router = Router();
const userRepository = AppDataSource.getRepository(User);

router.get("/", async (_req, res) => {
  const users = await userRepository.find();
  res.json(users);
});

export default router;
