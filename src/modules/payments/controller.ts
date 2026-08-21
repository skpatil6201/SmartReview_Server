import { Request, Response } from "express";
import PaymentsService from "./service.ts";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { businessId, subscriptionId } = req.body;
    const result = await PaymentsService.createOrder(Number(businessId), Number(subscriptionId));
    return res.status(201).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error creating order." });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const result = await PaymentsService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    return res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error verifying payment." });
  }
};

export const getAllPaymentList = async (_req: Request, res: Response) => {
  try {
    const payments = await PaymentsService.getAllPaymentList();
    return res.status(200).json(payments);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error fetching payments." });
  }
};

export const getPaymentsByBusiness = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const payments = await PaymentsService.getPaymentsByBusiness(Number(businessId));
    return res.status(200).json(payments);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error fetching payments." });
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await PaymentsService.getPaymentById(Number(id));
    return res.status(200).json(payment);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ message: err?.message || "Error fetching payment." });
  }
};

export default { createOrder, verifyPayment, getAllPaymentList, getPaymentsByBusiness, getPaymentById };
