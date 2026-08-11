import { AppDataSource } from "../../database/data-source.ts";
import { Business } from "./business.entity.ts";

export const getBusinessById = async (id: string) => {
  const repo = AppDataSource.getRepository(Business);
  const business = await repo.findOneBy({ id });
  if (!business) throw new Error("Business not found");
  return business;
};

export const getAllBusinesses = async () => {
  const repo = AppDataSource.getRepository(Business);
  return await repo.find();
};

export default { getBusinessById, getAllBusinesses };
