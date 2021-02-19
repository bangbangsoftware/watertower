import { serve } from "https://deno.land/std/http/server.ts";
import { acceptable, acceptWebSocket } from "https://deno.land/std/ws/mod.ts";

import { SetupWebsocket } from "./listener.ts";
import { SetupDatabase } from "./db.ts";
import { error, log } from "./log.js";

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

const process = async (req: any, storeConnection: Function) => {
  const headers = new Headers();
  headers.set("Content-Type", "text/javascript");
  if (req.url == "/") {
    req.respond(
      { status: 200, body: await Deno.open("./public/index.html") },
    );
    return;
  }

  if (req.url == "/ws") {
    acceptWS(req, storeConnection);
    return;
  }

  try {
    const file = await Deno.open("./public/" + req.url);
    if (req.url.endsWith("js") || req.url.endsWith("ts")) {
      log("200::" + req.url);
      req.respond(
        { status: 200, headers, body: file },
      );
      return;
    }
    log("200::" + req.url + " (no headers)");
    req.respond(
      { status: 200, body: file },
    );
  } catch (er) {
    error("404::" + req.url);
    req.respond(
      { status: 404, headers },
    );
  }
};

export const eventLoop = async () => {
  const settings = await getSettings();
  const port = settings.port ? settings.port : 4444;
  const store = await SetupDatabase(settings);
  const storeConnection = SetupWebsocket(store);

  const server = serve({ port });
  log("Listening on http://localhost:" + port + "/");

  for await (const req of server) {
    process(req, storeConnection);
  }
};
log("Args:: " + Deno.args);
if (Deno.args.indexOf("setup") == -1) {
  eventLoop();
} else {
  log("Just setting up");
}
