import { DataSource } from "typeorm";
import { User } from "../modules/users/user.entity.ts";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "dpg-d9tccnnavr4c73bj2t4g-a.oregon-postgres.render.com",
  port: 5432,
  username: "postgress",
  password: "GZ2WNAZSJCXvupzfzpgU9HJ9s5MIHBrU",
  database: "review_data",
  synchronize: true,
  logging: false,
  entities: [User],
  migrations: ["src/database/migrations/*.ts"],
  subscribers: [],
});
