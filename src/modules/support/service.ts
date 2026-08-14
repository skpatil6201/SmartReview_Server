import { AppDataSource } from "../../database/data-source.ts";
import { SupportForm } from "./support.entity.ts";

class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class SupportService {
  private supportRepository = AppDataSource.getRepository(SupportForm);

  async create(data: any) {
    const { businessId, name, email, subject, message } = data;

    if (!name || !name.trim()) {
      throw new ServiceError("Name is required.", 400);
    }

    if (!email || !email.trim()) {
      throw new ServiceError("Email is required.", 400);
    }

    if (!message || !message.trim()) {
      throw new ServiceError("Message is required.", 400);
    }

    const supportForm = this.supportRepository.create({
      businessId: businessId ? Number(businessId) : null,
      name: name.trim(),
      email: email.trim(),
      subject: subject?.trim() ?? null,
      message: message.trim(),
      status: "open",
    });

    return this.supportRepository.save(supportForm);
  }

  async getAll() {
    return this.supportRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async getById(id: number) {
    const supportForm = await this.supportRepository.findOneBy({ id });
    if (!supportForm) {
      throw new ServiceError("Support form not found.", 404);
    }
    return supportForm;
  }
}

export default new SupportService();
