import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { Business } from "../modules/businesses/business.entity.js";
import { Product } from "../modules/products/product.entity.js";
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
    entities: [Business, Product],
    migrations: ["src/database/migrations/*.ts"],
    subscribers: [],
});
//# sourceMappingURL=data-source.js.map