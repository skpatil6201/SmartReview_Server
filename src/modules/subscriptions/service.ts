import { AppDataSource } from "../../database/data-source.ts";
import { Business } from "../businesses/business.entity.ts";
import { Subscription } from "./subscription.entity.ts";

class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class SubscriptionsService {
  private subscriptionRepository = AppDataSource.getRepository(Subscription);
  private businessRepository = AppDataSource.getRepository(Business);

  async getAll() {
    return this.subscriptionRepository.find({
      order: { price: "ASC" },
    });
  }

  async create(data: any) {
    const { name, description, price, durationDays } = data;

    if (!name || !name.trim()) {
      throw new ServiceError("Subscription name is required.", 400);
    }

    if (price === undefined || price === null || Number.isNaN(Number(price))) {
      throw new ServiceError("Subscription price is required.", 400);
    }

    const subscription = this.subscriptionRepository.create({
      name: name.trim(),
      description: description?.trim() ?? null,
      price: Number(price),
      durationDays: durationDays ? Number(durationDays) : null,
      isActive: true,
    });

    return this.subscriptionRepository.save(subscription);
  }

  async update(id: number, data: any) {
    const subscription = await this.subscriptionRepository.findOneBy({ id });
    if (!subscription) {
      throw new ServiceError("Subscription not found.", 404);
    }

    const { name, description, price, durationDays, isActive } = data;
    if (name !== undefined) subscription.name = name.trim();
    if (description !== undefined) subscription.description = description?.trim() ?? null;
    if (price !== undefined) subscription.price = Number(price);
    if (durationDays !== undefined) subscription.durationDays = durationDays ? Number(durationDays) : null;
    if (isActive !== undefined) subscription.isActive = Boolean(isActive);

    return this.subscriptionRepository.save(subscription);
  }

  async remove(id: number) {
    const subscription = await this.subscriptionRepository.findOneBy({ id });
    if (!subscription) {
      throw new ServiceError("Subscription not found.", 404);
    }

    await this.subscriptionRepository.remove(subscription);
    return { message: "Subscription deleted successfully.", id };
  }

  async selectForBusiness(businessId: number, subscriptionId: number) {
    const business = await this.businessRepository.findOneBy({ id: businessId });
    if (!business) {
      throw new ServiceError("Business not found.", 404);
    }

    const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
    if (!subscription) {
      throw new ServiceError("Subscription not found.", 404);
    }

    business.subscriptionId = subscription.id;
    await this.businessRepository.save(business);

    return {
      message: "Subscription selected successfully.",
      businessId: business.id,
      subscriptionId: subscription.id,
      subscription: { name: subscription.name, price: subscription.price },
    };
  }

  async getForBusiness(businessId: number) {
    const business = await this.businessRepository.findOneBy({ id: businessId });
    if (!business) {
      throw new ServiceError("Business not found.", 404);
    }

    if (!business.subscriptionId) {
      return { message: "No subscription selected.", subscription: null };
    }

    const subscription = await this.subscriptionRepository.findOneBy({
      id: business.subscriptionId,
    });

    return {
      message: subscription ? "Subscription found." : "Selected subscription no longer exists.",
      subscription,
    };
  }
}

export default new SubscriptionsService();
