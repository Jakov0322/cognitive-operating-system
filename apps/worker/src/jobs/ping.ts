export const PING_QUEUE = "ping";

export type PingJobData = {
  message: string;
};

export async function handlePing(data: PingJobData): Promise<void> {
  console.log(`[ping] received: ${data.message}`);
}
