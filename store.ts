import {
  isWebSocketCloseEvent,
  WebSocket,
} from "https://deno.land/std/ws/mod.ts";

import { v4 } from "https://deno.land/std/uuid/mod.ts";

import type { Store } from "./watertower.d.ts";

import { error, log } from "./log.js";

interface Wsc {
  id: string;
  ws: WebSocket;
  canWrite: boolean;
}

const socks = new Map<string, Wsc>();

const processEvent = (id: string, ev: any, store: Store) => {
  log(id + " request incoming");

  if (isWebSocketCloseEvent(ev)) {
    socks.delete(id);
    return;
  }
  if (typeof ev !== "string") {
    error("bad event", ev);
  }
  store.save(id, ev);

  socks.forEach((wsc) => {
    if (wsc.ws.isClosed) {
      socks.delete(wsc.id);
    } else if (wsc.id != id) {
      wsc.ws.send(ev);
    }
  });
};

const storeConnection = (store: Store) =>
  async (ws: WebSocket) => {
    log("Connection ready");

    let canWrite = false;
    const id = v4.generate();
    const wsc = { id, ws, canWrite };
    socks.set(id, wsc);
    log("New socket " + id);

    for await (const ev of ws) {
      processEvent(id, ev, store);
    }
  };

const SetupWebsocket = (store: Store) => storeConnection(store);

export { SetupWebsocket };
