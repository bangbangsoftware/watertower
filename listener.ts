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

const processEvent = async (id: string, ev: any, store: Store) => {
  log(id + " request incoming");

  if (isWebSocketCloseEvent(ev)) {
    socks.delete(id);
    return;
  }
  if (typeof ev !== "string") {
    error("bad event", ev);
  }

  // is it out of sequence...
  const currentID = await store.currentID();
  log("current ID " + currentID);
  log(store);
  const updated = JSON.parse(ev);
  if (updated.__UUID != currentID) {
    const err = "Data out of Sync, current id is " + currentID +
      " your data is " + updated.__UUID;
    // Maybe should try and merge...?
    error(err);
    const currentData = await store.load(currentID);
    const wsc = socks.get(id);
    if (wsc == null) {
      return;
    }
    const data = { state: 409, data: currentData };
    wsc.ws.send(JSON.stringify(data));
    error(err);
    return;
  }
  const __UUID = await store.save(id, ev);
  updated.__UUID = __UUID;
  log(updated);

  socks.forEach((wsc) => {
    if (wsc.ws.isClosed) {
      socks.delete(wsc.id);
    } else if (wsc.id != id) {
      const data = { state: 200, data: updated };
      wsc.ws.send(JSON.stringify(data));
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

