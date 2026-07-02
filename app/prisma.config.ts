import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.MONGODB_URI ?? process.env.MONGDODB_URI ?? "";

process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
