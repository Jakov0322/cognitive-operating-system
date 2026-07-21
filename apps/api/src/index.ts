import "dotenv/config";
import { fileURLToPath } from "node:url";

import { buildServer } from "./server";

async function main() {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4001);

  await app.listen({ port, host: "0.0.0.0" });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
