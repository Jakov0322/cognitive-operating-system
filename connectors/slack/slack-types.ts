export type RawSlackMessage = {
  ts: string;
  channelId: string;
  channelName: string;
  userId: string;
  authorName: string;
  text: string;
  threadTs?: string | null;
  createdAt: string;
};
