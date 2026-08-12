import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { env } from "../../config/env.ts";
import { AppDataSource } from "../../database/data-source.ts";
import { Business } from "../businesses/business.entity.ts";

class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class AuthService {
  private businessRepository = AppDataSource.getRepository(Business);

  private hashPassword(password: string, salt: string) {
    return scryptSync(password, salt, 64).toString("hex");
  }

  private async sendWelcomeEmail(email: string, businessName: string) {
    if (!env.email.host || !env.email.port || !env.email.user || !env.email.pass) {
      console.warn("Email configuration is incomplete. Skipping welcome email.");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.secure,
      auth: {
        user: env.email.user,
        pass: env.email.pass,
      },
    });

    await transporter.sendMail({
      from: `"ReviewManager" <${env.email.user}>`,
      to: email,
      subject: "Welcome to ReviewManager!",
      html: `<b>Hello ${businessName},</b><br><p>Thank you for registering with ReviewManager. We're excited to have you on board!</p>`,
    });
  }

  async signup(payload: any) {
    const {
      businessName,
      phoneNumber,
      email,
      password,
      confirmPassword,
      address,
      industryType,
      businessNumber,
    } = payload;

    if (!businessName || !phoneNumber || !email || !password || !confirmPassword || !address || !industryType || !businessNumber) {
      throw new ServiceError("All fields are required.", 400);
    }

    if (password !== confirmPassword) {
      throw new ServiceError("Password and confirm password must match.", 400);
    }

    const existingBusiness = await this.businessRepository.findOneBy({ email });
    if (existingBusiness) {
      throw new ServiceError("Email is already registered.", 409);
    }

    const salt = randomBytes(16).toString("hex");
    const passwordHash = this.hashPassword(password, salt);

    const business = this.businessRepository.create({
      businessName,
      phoneNumber,
      email,
      passwordHash,
      passwordSalt: salt,
      address,
      industryType,
      businessNumber,
    });

    await this.businessRepository.save(business);

    try {
      await this.sendWelcomeEmail(business.email, business.businessName);
    } catch (error) {
      // Log the email error but don't block the user registration
      console.error("Failed to send welcome email:", error);
    }

    return { message: "Business registered successfully.", id: business.id };
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new ServiceError("Email and password are required.", 400);
    }

    const business = await this.businessRepository.findOneBy({ email });
    if (!business) {
      throw new ServiceError("Invalid credentials.", 401);
    }

    const attemptedHash = this.hashPassword(password, business.passwordSalt);
    const storedHashBuffer = Buffer.from(business.passwordHash, "hex");
    const attemptedHashBuffer = Buffer.from(attemptedHash, "hex");

    if (storedHashBuffer.length !== attemptedHashBuffer.length || !timingSafeEqual(storedHashBuffer, attemptedHashBuffer)) {
      throw new ServiceError("Invalid credentials.", 401);
    }

    const payload = {
      id: business.id,
      email: business.email,
      isAdmin: business.isAdmin,
    };
    const token = jwt.sign(payload, env.jwtSecret, {
      expiresIn: "1h",
    });

    // Return the token and some user info for the client to use
    return { token, user: { id: business.id, email: business.email, isAdmin: business.isAdmin } };
  }
}

export default new AuthService();
