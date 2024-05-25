import 'dotenv/config'

import Postgrator from "postgrator";
import pg from "pg";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const client = new pg.Client({
    connectionString: `${process.env.DATABASE_URL}/${process.env.DATABASE_NAME}`,
  });

  try {
    await client.connect();

    const postgrator = new Postgrator({
      migrationPattern: __dirname + "/migrates/*",
      driver: "pg",
      database: process.env.DATABASE_NAME,
      execQuery: (query) => client.query(query),
    });

    await postgrator.migrate();
    await client.end();
  } catch (error) {
    await client.end();
    console.error(error.appliedMigrations);
    process.exit(1);
  }
}
main();
