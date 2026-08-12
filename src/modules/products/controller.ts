import { Router, Request, Response } from "express";
import { createProductService, getProductDetailsService } from "./service.ts";

const router = Router();

router.post('/post', async (req: Request, res: Response) => {
  try {
    const product = await createProductService(req.body);
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'Error creating product' });
  }
});

export const getProductDetails = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    if (!productId || Array.isArray(productId)) {
      return res.status(400).json({ message: "Product id is required" });
    }

    const details = await getProductDetailsService(productId);

    res.status(200).json(details);
  } catch (error: any) {
    const statusCode = error.message === "Product not found" ? 404 : 500;
    res.status(statusCode).json({
      message: error.message || "Error fetching product details",
    });
  }
};

router.get('/:productId', getProductDetails);

export default router;
