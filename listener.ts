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

interface Message {
  action: string;
  data: any;
}

interface Reply {
  state: number;
  reply: string;
  data: any;
}

const socks = new Map<string, Wsc>();

const sendReply = (id: string, state: number, reply: string, data: any) => {
  const wsc = socks.get(id);
  if (!wsc) {
    error(id + " is unknown, cannot reply!??");
    return;
  }
  const saveData = { state, data, reply };
  wsc.ws.send(JSON.stringify(saveData));
};

const logIn = (id: string, data: any): boolean => {
  sendReply(id, 401, "login", null);
  return false;
};

const update = async (id: string, data: any, store: Store) => {
  const wsc = socks.get(id);
  if (!wsc || !wsc.canWrite) {
    sendReply(id, 403, "update", null);
    error("This socket " + id + " is not writable");
    return;
  }

  // is it out of sequence...
  const currentID = await store.currentID();
  log("current ID " + currentID);
  log(store);
  const uuid = data.__UUID;
  if (uuid != currentID) {
    const err = "Data out of Sync, current id is " + currentID +
      " your data is " + uuid;
    // Maybe should try and merge...?
    error(err);
    const currentData = await store.load(currentID);
    const wsc = socks.get(id);
    if (wsc == null) {
      return;
    }
    sendReply(id, 400, "update", null);
    error(err);
    return;
  }
  const __UUID = await store.save(id, data);
  data.__UUID = __UUID;
  log(data);

  socks.forEach((wsc) => {
    if (wsc.ws.isClosed) {
      socks.delete(wsc.id);
    } else if (wsc.id != id) {
      sendReply(wsc.id, 200, "update", data);
    }
  });
};

const processEvent = async (id: string, ev: any, store: Store) => {
  log(id + " request incoming");

  if (isWebSocketCloseEvent(ev)) {
    error("websocket closed", "" + ev);
    socks.delete(id);
    return;
  }
  if (typeof ev !== "string") {
    error("bad event", JSON.stringify(ev));
    return;
  }

  const message: Message = JSON.parse(ev);
  log("Request to " + message.action);
  if (message.action == "logon") {
    logIn(id, message.data);
  } else if (message.action == "update") {
    update(id, message.data, store);
  } else {
    error("Request not understood");
    sendReply(id, 400, "Cannot understand Request", ev);
  }
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
