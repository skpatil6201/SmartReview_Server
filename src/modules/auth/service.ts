import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
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

    return { businessId: business.id, businessName: business.businessName };
  }
}

export default new AuthService();
