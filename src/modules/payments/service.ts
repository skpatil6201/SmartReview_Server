import Razorpay from "razorpay";
import crypto from "crypto";
import { AppDataSource } from "../../database/data-source.ts";
import { Payment } from "./payment.entity.ts";
import { Business } from "../businesses/business.entity.ts";
import { Subscription } from "../subscriptions/subscription.entity.ts";
import { env } from "../../config/env.ts";

class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class PaymentsService {
  private paymentRepository = AppDataSource.getRepository(Payment);
  private businessRepository = AppDataSource.getRepository(Business);
  private subscriptionRepository = AppDataSource.getRepository(Subscription);

  private getRazorpay(): Razorpay {
    if (!env.razorpay.keyId || !env.razorpay.keySecret) {
      throw new ServiceError("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.", 500);
    }
    return new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }

  async createOrder(businessId: number, subscriptionId: number) {
    const business = await this.businessRepository.findOneBy({ id: businessId });
    if (!business) throw new ServiceError("Business not found.", 404);

    const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
    if (!subscription) throw new ServiceError("Subscription not found.", 404);

    const razorpay = this.getRazorpay();

    const order = await razorpay.orders.create({
      amount: Math.round(subscription.price * 100),
      currency: "INR",
      receipt: `biz_${businessId}_sub_${subscriptionId}_${Date.now()}`,
    });

    const payment = this.paymentRepository.create({
      businessId,
      subscriptionId,
      razorpayOrderId: order.id,
      amount: subscription.price,
      currency: "INR",
      status: "created",
    });

    await this.paymentRepository.save(payment);

    return {
      orderId: order.id,
      amount: subscription.price,
      currency: "INR",
      razorpayKeyId: env.razorpay.keyId,
      subscription: { id: subscription.id, name: subscription.name },
    };
  }

  async verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", env.razorpay.keySecret!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      throw new ServiceError("Payment verification failed. Invalid signature.", 400);
    }

    const payment = await this.paymentRepository.findOneBy({ razorpayOrderId });
    if (!payment) {
      throw new ServiceError("Payment record not found for this order.", 404);
    }

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = "paid";
    await this.paymentRepository.save(payment);

    const business = await this.businessRepository.findOneBy({ id: payment.businessId });
    if (business) {
      business.subscriptionId = payment.subscriptionId;
      await this.businessRepository.save(business);
    }

    return { message: "Payment verified successfully.", paymentId: payment.id, status: "paid" };
  }

  async getAllPaymentList() {
    return this.paymentRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async getPaymentsByBusiness(businessId: number) {
    const business = await this.businessRepository.findOneBy({ id: businessId });
    if (!business) throw new ServiceError("Business not found.", 404);

    return this.paymentRepository.find({
      where: { businessId },
      order: { createdAt: "DESC" },
    });
  }

  async getAll() {
    return this.paymentRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async getPaymentById(id: number) {
    const payment = await this.paymentRepository.findOneBy({ id });
    if (!payment) throw new ServiceError("Payment not found.", 404);
    return payment;
  }
}

export default new PaymentsService();
