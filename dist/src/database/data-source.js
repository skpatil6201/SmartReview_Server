import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { Business } from "../modules/businesses/business.entity.js";
import { Product } from "../modules/products/product.entity.js";
import { Review } from "../modules/reviews/review.entity.js";
import { Subscription } from "../modules/subscriptions/subscription.entity.js";
import { SupportForm } from "../modules/support/support.entity.js";
import { Payment } from "../modules/payments/payment.entity.js";
export const AppDataSource = new DataSource({
    type: "postgres",
    host: env.db.host,
    port: env.db.port,
    username: env.db.username,
    password: env.db.password,
    database: env.db.database,
    synchronize: true,
    logging: false,
    ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
    entities: [Business, Product, Review, Subscription, SupportForm, Payment],
    migrations: ["src/database/migrations/*.ts"],
    subscribers: [],
});
//# sourceMappingURL=data-source.js.map