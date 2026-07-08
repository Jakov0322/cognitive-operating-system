import { RawSlackMessage } from "./slack-types";

type SlackClientOptions = {
  token: string;
  channelIds: string[];
};

type SlackApiUser = {
  id: string;
  name: string;
  real_name?: string;
  profile?: { display_name?: string; real_name?: string };
  deleted?: boolean;
  is_bot?: boolean;
};

type SlackApiResponse = {
  ok: boolean;
  error?: string;
};

type SlackUsersListResponse = SlackApiResponse & {
  members: SlackApiUser[];
  response_metadata?: { next_cursor?: string };
};

type SlackApiMessage = {
  type: string;
  subtype?: string;
  ts: string;
  user?: string;
  bot_id?: string;
  text: string;
  thread_ts?: string;
};

type SlackHistoryResponse = SlackApiResponse & {
  messages: SlackApiMessage[];
  has_more: boolean;
  response_metadata?: { next_cursor?: string };
};

type SlackConversationInfoResponse = SlackApiResponse & {
  channel: { id: string; name: string };
};

function displayName(user: SlackApiUser): string {
  return (
    user.profile?.display_name ||
    user.profile?.real_name ||
    user.real_name ||
    user.name
  );
}

export class SlackClient {
  private readonly baseUrl = "https://slack.com/api";

  constructor(private readonly options: SlackClientOptions) {}

  private async request<T extends SlackApiResponse>(
    path: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Slack request failed: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as T;

    if (!json.ok) {
      throw new Error(`Slack API error: ${json.error ?? "unknown_error"}`);
    }

    return json;
  }

  async listUsers(): Promise<Map<string, string>> {
    const users = new Map<string, string>();
    let cursor: string | undefined;

    do {
      const response = await this.request<SlackUsersListResponse>(
        "/users.list",
        {
          limit: "200",
          ...(cursor ? { cursor } : {}),
        }
      );

      for (const member of response.members) {
        if (member.deleted || member.is_bot) continue;
        users.set(member.id, displayName(member));
      }

      cursor = response.response_metadata?.next_cursor || undefined;
    } while (cursor);

    return users;
  }

  private async channelName(channelId: string): Promise<string> {
    const response = await this.request<SlackConversationInfoResponse>(
      "/conversations.info",
      { channel: channelId }
    );

    return response.channel.name;
  }

  async listMessages(users: Map<string, string>): Promise<RawSlackMessage[]> {
    const messages: RawSlackMessage[] = [];

    for (const channelId of this.options.channelIds) {
      const channelName = await this.channelName(channelId);

      let cursor: string | undefined;

      do {
        const response = await this.request<SlackHistoryResponse>(
          "/conversations.history",
          {
            channel: channelId,
            limit: "200",
            ...(cursor ? { cursor } : {}),
          }
        );

        for (const raw of response.messages) {
          if (raw.subtype || raw.bot_id || !raw.user || !raw.text) continue;

          messages.push({
            ts: raw.ts,
            channelId,
            channelName,
            userId: raw.user,
            authorName: users.get(raw.user) ?? raw.user,
            text: raw.text,
            threadTs: raw.thread_ts,
            createdAt: new Date(Number.parseFloat(raw.ts) * 1000).toISOString(),
          });
        }

        cursor = response.has_more
          ? response.response_metadata?.next_cursor
          : undefined;
      } while (cursor);
    }

    return messages;
  }
}
