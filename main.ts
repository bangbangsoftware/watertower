import { serve } from "https://deno.land/std/http/server.ts";
import { acceptable, acceptWebSocket } from "https://deno.land/std/ws/mod.ts";

import { SetupWebsocket } from "./listener.ts";
import { SetupDatabase } from "./db.ts";
import { log } from "./log.js";

const getSettings = async () => {
  const decoder = new TextDecoder("utf-8");
  const setString = decoder.decode(await Deno.readFile("./.watertower.json"));
  const settings = JSON.parse(setString);
  return settings;
};

const acceptWS = async (req: any, storeConnection: Function) => {
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
  log("socket connected ");
  storeConnection(connection);
};

const eventLoop = async () => {
  const settings = await getSettings();
  const port = settings.port ? settings.port : 3000;
  const store = await SetupDatabase(settings);
  const storeConnection = SetupWebsocket(store);

  const server = serve({ port });
  log("Listening on http://localhost:" + port + "/");

  for await (const req of server) {
    log(req.url);
    const headers = new Headers();
    headers.set("Content-Type", "text/javascript");
    if (req.url == "/") {
      req.respond(
        { status: 200, body: await Deno.open("./public/index.html") },
      );
    } else if (req.url == "/log.js") {
      req.respond(
        { status: 200, headers, body: await Deno.open("./public/log.js") },
      );
    } else if (req.url == "/index.js") {
      req.respond(
        { status: 200, headers, body: await Deno.open("./public/index.js") },
      );
    } else if (req.url == "/ws") {
      acceptWS(req, storeConnection);
    }
  }
};
1;
eventLoop();
