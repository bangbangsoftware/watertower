import {WebSocket} from "https://deno.land/std/ws/mod.ts";

import { v4 } from "https://deno.land/std/uuid/mod.ts";

import type { Store } from './watertower.d.ts';

import {log, error} from './log.js';

interface Wsc {
    ws: WebSocket,
    canWrite: boolean
}

const socks = new Map<string, Wsc>();

const storeConnection = (store: Store) => async (ws: WebSocket) =>{
    log("Connection ready");

    let canWrite = false;
    const id = v4.generate();
    const wsc = {ws, canWrite};
    socks.set(id, wsc);
    log("New socket "+id);

    for await (const ev of ws){
        log(ev);
        store.save(ev);
    }
}

const SetupWebsocket = (store:Store) =>storeConnection(store);

export {SetupWebsocket};