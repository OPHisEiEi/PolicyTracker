import type { Driver } from "neo4j-driver";
import type { Pool } from "pg";

declare global {
  var _neo4jDriver: Driver | undefined;
  var _pgPool: Pool | undefined;
}

export {};
