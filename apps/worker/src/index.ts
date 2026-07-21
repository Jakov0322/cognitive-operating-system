import "dotenv/config";
import { fileURLToPath } from "node:url";

import { createBoss } from "./queue";
import { handlePing, PING_QUEUE, type PingJobData } from "./jobs/ping";

export async function main() {
  const boss = createBoss();

  boss.on("error", (error) => console.error("pg-boss error", error));

  await boss.start();
  await boss.createQueue(PING_QUEUE);

  await boss.work<PingJobData>(PING_QUEUE, async ([job]) => {
    await handlePing(job.data);
  });

  console.log("Worker started, listening for jobs...");

  return boss;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
