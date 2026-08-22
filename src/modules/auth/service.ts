import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { env } from "../../config/env.ts";
import { AppDataSource } from "../../database/data-source.ts";
import { Business } from "../businesses/business.entity.ts";
import { findMatchingBusiness, fetchGoogleReviews } from "../google/places.ts";
import { verifyGoogleIdToken } from "../google/oauth.ts";

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
      password,
      confirmPassword,
      address,
      industryType,
      businessNumber,
      googleIdToken,
    } = payload;

    // A Google signup proves the email, so the password fields become optional.
    const googleIdentity = googleIdToken ? await verifyGoogleIdToken(googleIdToken) : null;
    const email = (googleIdentity?.email ?? payload.email)?.trim().toLowerCase();

    if (!businessName || !phoneNumber || !email || !address || !industryType || !businessNumber) {
      throw new ServiceError("All fields are required.", 400);
    }

    if (!googleIdentity) {
      if (!password || !confirmPassword) {
        throw new ServiceError("All fields are required.", 400);
      }

      if (password !== confirmPassword) {
        throw new ServiceError("Password and confirm password must match.", 400);
      }
    }

    const existingBusiness = await this.businessRepository.findOneBy({ email });
    if (existingBusiness) {
      throw new ServiceError("Email is already registered.", 409);
    }

    if (googleIdentity) {
      const existingGoogleAccount = await this.businessRepository.findOneBy({
        googleUserId: googleIdentity.sub,
      });
      if (existingGoogleAccount) {
        throw new ServiceError("This Google account is already linked to another business.", 409);
      }
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

    const salt = password ? randomBytes(16).toString("hex") : null;
    const passwordHash = password && salt ? this.hashPassword(password, salt) : null;

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
      googleUserId: googleIdentity?.sub ?? null,
      googleEmail: googleIdentity?.email ?? null,
      googleDisplayName: googleIdentity?.name ?? null,
      googlePhotoUrl: googleIdentity?.picture ?? null,
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

    if (!business.passwordHash || !business.passwordSalt) {
      throw new ServiceError(
        "This account was created with Google. Use \"Continue with Google\" to sign in.",
        409,
      );
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

  /**
   * Sign-In with Google from the mobile app.
   *
   * Known Google account or matching email -> straight to a session.
   * Otherwise we hand the profile back so the app can open the signup form
   * pre-filled; the business details we still need are not in the ID token.
   */
  async googleSignIn(idToken: string) {
    const identity = await verifyGoogleIdToken(idToken);

    if (!identity.emailVerified) {
      throw new ServiceError("This Google account has no verified email address.", 403);
    }

    let business = await this.businessRepository.findOneBy({ googleUserId: identity.sub });

    if (!business) {
      // Same person signing in with Google for the first time on an account
      // they originally created with a password - link the two.
      business = await this.businessRepository.findOneBy({ email: identity.email });

      if (business) {
        business.googleUserId = identity.sub;
        business.googleEmail = identity.email;
        business.googleDisplayName = identity.name;
        business.googlePhotoUrl = identity.picture;
        await this.businessRepository.save(business);
      }
    }

    if (!business) {
      return {
        isNewUser: true,
        googleProfile: {
          email: identity.email,
          name: identity.name,
          picture: identity.picture,
          googleUserId: identity.sub,
        },
        message: "Finish setting up your business to continue.",
      };
    }

    const token = jwt.sign(
      { id: business.id, email: business.email, isAdmin: business.isAdmin },
      env.jwtSecret,
      { expiresIn: "7d" },
    );

    return {
      isNewUser: false,
      token,
      user: {
        id: business.id,
        email: business.email,
        businessName: business.businessName,
        isAdmin: business.isAdmin,
        googleConnectionStatus: business.googleConnectionStatus,
      },
    };
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
