import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { env } from "../../config/env.ts";
import { AppDataSource } from "../../database/data-source.ts";
import { Business } from "../businesses/business.entity.ts";
import { findMatchingBusiness, fetchGoogleReviews } from "../google/places.ts";

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

  private createTransporter() {
    if (!env.email.host || !env.email.port || !env.email.user || !env.email.pass) {
      return null;
    }

    return nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.secure,
      connectionTimeout: 8000,
      socketTimeout: 8000,
      auth: {
        user: env.email.user,
        pass: env.email.pass,
      },
    });
  }

  private async sendWelcomeEmail(email: string, businessName: string) {
    const transporter = this.createTransporter();
    if (!transporter) {
      console.warn("Email configuration is incomplete. Skipping welcome email.");
      return;
    }

    await transporter.sendMail({
      from: `"ReviewManager" <${env.email.user!}>`,
      to: email,
      subject: "Welcome to ReviewManager!",
      html: `<b>Hello ${businessName},</b><br><p>Thank you for registering with ReviewManager. We're excited to have you on board!</p>`,
    });
  }

  private async sendOtpEmail(email: string, otp: string) {
    const transporter = this.createTransporter();
    if (!transporter) {
      console.warn("Email configuration is incomplete. Skipping OTP email.");
      return;
    }

    await transporter.sendMail({
      from: `"ReviewManager" <${env.email.user!}>`,
      to: email,
      subject: "Your ReviewManager OTP",
      html: `
        <p>You requested a password reset for your ReviewManager account.</p>
        <p>Your One-Time Password (OTP) is:</p>
        <h2 style="letter-spacing: 4px;">${otp}</h2>
        <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      `,
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

    let googlePlaceId: string | null = null;

    if (env.googlePlacesApiKey) {
      const match = await findMatchingBusiness(businessName, address);
      if (!match) {
        throw new ServiceError(
          "Business not found on Google Maps. Only businesses listed on Google Maps can register.",
          422,
        );
      }

      const reviews = await fetchGoogleReviews(match.placeId);
      if (!reviews.length) {
        throw new ServiceError(
          "This business has no Google reviews yet. Only businesses with at least one Google review can register.",
          422,
        );
      }

      googlePlaceId = match.placeId;
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
      googlePlaceId,
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

  private generateOtp() {
    return randomInt(100000, 1000000).toString();
  }

  async forgotPassword(email: string) {
    if (!email) {
      throw new ServiceError("Email is required.", 400);
    }

    const business = await this.businessRepository.findOneBy({ email });
    if (!business) {
      throw new ServiceError("No account found with this email.", 404);
    }

    const otp = this.generateOtp();
    const otpSalt = randomBytes(16).toString("hex");
    business.otp = this.hashPassword(otp, otpSalt) + "." + otpSalt;
    business.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    business.otpVerified = false;
    await this.businessRepository.save(business);

    this.sendOtpEmail(business.email, otp).catch((error) => {
      console.error("Failed to send OTP email:", error);
    });

    return { message: "OTP sent to your email." };
  }

  async verifyOtp(email: string, otp: string) {
    if (!email || !otp) {
      throw new ServiceError("Email and OTP are required.", 400);
    }

    const business = await this.businessRepository.findOneBy({ email });
    if (!business || !business.otp || !business.otpExpires) {
      throw new ServiceError("No OTP found. Please request a new one.", 400);
    }

    if (business.otpExpires.getTime() < Date.now()) {
      throw new ServiceError("OTP has expired. Please request a new one.", 400);
    }

    const [storedHash, otpSalt] = business.otp.split(".");
    const attemptedHash = this.hashPassword(otp, otpSalt!);
    if (attemptedHash !== storedHash) {
      throw new ServiceError("Invalid OTP.", 400);
    }

    business.otpVerified = true;
    await this.businessRepository.save(business);

    return { message: "OTP verified successfully. You can now reset your password." };
  }

  async resetPassword(email: string, password: string, confirmPassword: string) {
    if (!email || !password || !confirmPassword) {
      throw new ServiceError("Email and new password are required.", 400);
    }

    if (password !== confirmPassword) {
      throw new ServiceError("Password and confirm password must match.", 400);
    }

    const business = await this.businessRepository.findOneBy({ email });
    if (!business || !business.otpVerified) {
      throw new ServiceError("Please verify your OTP first.", 400);
    }

    const salt = randomBytes(16).toString("hex");
    business.passwordHash = this.hashPassword(password, salt);
    business.passwordSalt = salt;
    business.otp = null;
    business.otpExpires = null;
    business.otpVerified = false;
    await this.businessRepository.save(business);

    return { message: "Password reset successfully." };
  }
}

export default new AuthService();
