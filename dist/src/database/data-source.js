import { DataSource } from "typeorm";
import { User } from "../modules/users/user.entity.js";
export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "./database/sqlite.db",
    synchronize: true,
    logging: false,
    entities: [User],
    migrations: ["src/database/migrations/*.ts"],
    subscribers: [],
});
//# sourceMappingURL=data-source.js.map