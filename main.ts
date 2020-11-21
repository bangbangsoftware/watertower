import { serve } from "https://deno.land/std/http/server.ts";
import { acceptable, acceptWebSocket } from "https://deno.land/std/ws/mod.ts";

import { Store } from './watertower.d.ts';
import { SetupWebsocket } from "./store.ts";
import { SetupDatabase } from "./db.ts";
import { log } from "./log.js";

const acceptWS = async (req: any, storeConnection: any) => {
  if (!acceptable) {
    return;
  }
  const connection = await acceptWebSocket(
    {
      conn: req.conn,
      bufReader: req.r,
      bufWriter: req.w,
      headers: req.headers,
    },
  );
  console.log("socket connected");
  storeConnection(connection);
};

const eventLoop = async () => {
  const port = 3000;
  const store = await SetupDatabase();
  const storeConnection = SetupWebsocket(store);
  
  const server = serve({ port });
  log("Listening on http://localhost:" + port + "/");

  for await (const req of server) {
    log(req.url);
    if (req.url == "/") {
      req.respond(
        { status: 200, body: await Deno.open("./public/index.html") },
      );
    } else if (req.url == "/log.js") {
      req.respond({ status: 200, body: await Deno.open("./public/log.js") });
    } else if (req.url == "/index.js") {
      req.respond({ status: 200, body: await Deno.open("./public/index.js") });
    } else if (req.url == "/ws") {
      acceptWS(req, store);
    }
  }
};
1
eventLoop();
