import { createDatabaseTables } from "@aicore8/lib/server";
import { createLogger } from "@aicore8/lib/shared";
import { ResourceName } from "common";

const log = createLogger(ResourceName);

createDatabaseTables(ResourceName, "sql/main.sql").catch((error: unknown) =>
  log.error("database setup failed", error),
);
