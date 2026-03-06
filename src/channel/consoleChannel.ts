import readline from "node:readline";

import type { ChannelAdapter, InboundMessage, OutboundMessage } from "./types";

export function startConsole(onMessage: (msg: { chat_id: string; text: string }) => void) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const chat_id = process.env.LOCAL_CHAT_ID ?? "local-dev";

  console.log("Consola lista. Comandos: gasto..., pedido..., confirmar, cancelar, ayuda");
  rl.on("line", (line) => onMessage({ chat_id, text: line }));
}

export function createConsoleChannel(localChatId: string): ChannelAdapter {
  let rl: readline.Interface | undefined;

  return {
    name: "console",
    start(onMessage: (msg: InboundMessage) => void | Promise<void>) {
      rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      console.log("Consola lista. Comandos: gasto..., pedido..., confirmar, cancelar, ayuda");
      rl.on("line", (line) => {
        void onMessage({ chat_id: localChatId, text: line });
      });
    },
    send(msg: OutboundMessage) {
      console.log(msg.text);
    },
    stop() {
      rl?.close();
      rl = undefined;
    }
  };
}
