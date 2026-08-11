import { AppDataSource } from "../../database/data-source.ts";
import { Product } from "./product.entity.ts";

export const createProductService = async (data: any) => {
  const repo = AppDataSource.getRepository(Product);
  const product = repo.create(data);
  return await repo.save(product);
};

export const getProductDetailsService = async (productId: string) => {
  const repo = AppDataSource.getRepository(Product);
  const product = await repo.findOneBy({ id: productId });
  if (!product) throw new Error("Product not found");
  return product;
};
