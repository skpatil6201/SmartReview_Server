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

  async getByEmail(email: string) {
    return this.supportRepository.find({
      where: { email },
      order: { createdAt: "DESC" },
    });
  }

  async getByBusinessId(businessId: number) {
    return this.supportRepository.find({
      where: { businessId },
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

  async reply(id: number, adminReply: string) {
    if (!adminReply || !adminReply.trim()) {
      throw new ServiceError("Reply message is required.", 400);
    }

    const supportForm = await this.supportRepository.findOneBy({ id });
    if (!supportForm) {
      throw new ServiceError("Support form not found.", 404);
    }

    supportForm.adminReply = adminReply.trim();
    supportForm.adminReplyDate = new Date();
    supportForm.status = "replied";

    return this.supportRepository.save(supportForm);
  }

  async updateStatus(id: number, status: string) {
    const validStatuses = ["open", "replied", "closed"];
    if (!validStatuses.includes(status)) {
      throw new ServiceError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
    }

    const supportForm = await this.supportRepository.findOneBy({ id });
    if (!supportForm) {
      throw new ServiceError("Support form not found.", 404);
    }

    supportForm.status = status;
    return this.supportRepository.save(supportForm);
  }

  async delete(id: number) {
    const supportForm = await this.supportRepository.findOneBy({ id });
    if (!supportForm) {
      throw new ServiceError("Support form not found.", 404);
    }

    await this.supportRepository.remove(supportForm);
    return { message: "Support ticket deleted.", id };
  }
}

export default new SupportService();
