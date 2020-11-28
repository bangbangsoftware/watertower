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
  message: string;
  action: string;
  data: any;
}

const socks = new Map<string, Wsc>();

const sendReply = (id: string, reply: Reply, logError = false) => {
  if (logError) {
    error(reply.message);
  }
  const wsc = socks.get(id);
  if (!wsc) {
    error(id + " is unknown, cannot reply!??");
    return;
  }
  wsc.ws.send(JSON.stringify(reply));
};

const logIn = async (id: string, data: any, store: Store): Promise<boolean> => {
  console.log(data);
  const wsc = socks.get(id);
  if (!wsc) {
    error("No wsc");
    const reply = {
      state: 403,
      message: "This socket " + id + " not stored",
      action: "update",
      data: null,
    };
    sendReply(id, reply, true);
    // reset ???
    return false;
  }
  const valid = await store.validUser(data.id, data.p);
  const allGood = (!valid) ? false : await store.adminUser(valid);
  if (allGood) {
    log(" Admin exists " + id);
    wsc.canWrite = true;
    socks.set(id, wsc);
    const reply = {
      state: 200,
      message: data.id + " is now logged in",
      action: "login",
      data: null,
    };
    sendReply(id, reply);
    return true;
  }
  const reply = {
    state: 401,
    message: "Bad Login details",
    action: "login",
    data: null,
  };
  sendReply(id, reply);
  return false;
};

const outOfSequence = async (
  id: string,
  uuid: string,
  store: Store,
): Promise<boolean> => {
  const sequence = await inSequence(id, uuid, store);
  return !sequence;
};

const inSequence = async (
  id: string,
  uuid: string,
  store: Store,
): Promise<boolean> => {
  // is it out of sequence...
  const currentID = await store.currentID();
  if (uuid == currentID) {
    return true;
  }
  const err = "Data out of Sync, current id is " + currentID +
    " your data is " + uuid;
  // Maybe should try and merge...?
  const currentData = await store.load(currentID);
  const reply = {
    state: 400,
    message: err,
    action: "update",
    data: currentData,
  };
  sendReply(id, reply, true);
  return false;
};

const hasWritePermissions = (id: string, wsc: Wsc | undefined): boolean => {
  if (!wsc) {
    error("No wsc");
    const reply = {
      state: 403,
      message: "This socket " + id + " is not stored, reconnect",
      action: "update",
      data: null,
    };
    sendReply(id, reply, true);
    return false;
  }

  if (!wsc.canWrite) {
    error("wsc can write is false");
    const reply = {
      state: 403,
      message: "This socket " + id + " is not writable",
      action: "update",
      data: null,
    };
    sendReply(id, reply, true);
    return false;
  }

  return true;
};

const update = async (id: string, data: any, store: Store) => {
  const wsc = socks.get(id);
  const canWrite = hasWritePermissions(id, wsc);
  log("Can write:" + canWrite);
  if (!canWrite) {
    return;
  }

  const wrongSequence = await outOfSequence(id, data.__UUID, store);
  log("Wrong Sequence :" + wrongSequence);
  if (wrongSequence) {
    return;
  }

  const __UUID = await store.save(id, data);
  data.__UUID = __UUID;
  log(data);
  const reply = {
    state: 200,
    message: "Updated",
    action: "update",
    data,
  };
  sendReply(id, reply, true);

  broadcast(id, data);
};

const broadcast = (id: string, data: any) => {
  const reply = {
    state: 200,
    message: "Store has been updated",
    action: "broadcast",
    data,
  };

  socks.forEach((wsc) => {
    if (wsc.ws.isClosed) {
      socks.delete(wsc.id);
    } else if (wsc.id != id) {
      sendReply(wsc.id, reply);
    }
  });
};

const load = async (id: string, recievedData: any, store: Store) => {
  const anID = (recievedData == null || recievedData.uuid == null)
    ? null
    : recievedData.uuid;
  const idToLoad = (anID == null) ? await store.currentID() : anID;
  const data = await store.load(idToLoad);
  const reply = {
    state: 200,
    message: "Data for " + idToLoad,
    action: "load",
    data,
  };
  sendReply(id, reply);
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
  try {
    const message: Message = JSON.parse(ev);
    log("Request to " + message.action);
    if (message.action == "logon") {
      logIn(id, message.data, store);
    } else if (message.action == "load") {
      load(id, message.data, store);
    } else if (message.action == "update") {
      update(id, message.data, store);
    } else {
      const reply = {
        state: 400,
        message: "Request not understood",
        action: message.action,
        data: message,
      };
      sendReply(id, reply, true);
    }
  } catch (err) {
    error("Cannot process message", err);
    error("Cannot process message", ev);
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
