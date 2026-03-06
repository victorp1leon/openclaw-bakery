export type InboundMessage = {
  chat_id: string;
  text: string;
};

export type OutboundMessage = {
  chat_id: string;
  text: string;
};

export interface ChannelAdapter {
  readonly name: "console" | "telegram";
  start(onMessage: (msg: InboundMessage) => void | Promise<void>): void | Promise<void>;
  send(msg: OutboundMessage): void | Promise<void>;
  stop?(): void | Promise<void>;
}

