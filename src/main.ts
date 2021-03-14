import { Application } from "https://deno.land/x/oak/mod.ts";
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

export const handleSocket = async (ctx: any, storeConnection: Function) => {
  if (!acceptable(ctx.request.serverRequest)) {
    error("Cannot accept socket", ctx);
    return;
  }
  const { conn, r: bufReader, w: bufWriter, headers } = ctx.request.serverRequest;
  const socket = await acceptWebSocket({
    conn,
    bufReader,
    bufWriter,
    headers,
  });
  await storeConnection(socket);
}

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
  const portEnv = Deno.env.get("PORT");
  const portSettings = settings.port ? settings.port : 4444;
  const port = !portEnv ? portSettings : portEnv;
  const store = await SetupDatabase(settings);
  const storeConnection = SetupWebsocket(store);
  serveListen(storeConnection, port);
};

export const serveListen = async (storeConnection: Function, port: number) => {
  log("About to listen on " + port + " port");
  const server = serve({ port });
  log("Listening on http://localhost:" + port + "/");

  for await (const req of server) {
    process(req, storeConnection);
  }
}

export const oakListen = async (storeConnection: Function, port: number) => {
  const app = new Application();

  app.use(async (context) => {
    const url = context.request.url;
    if (url.pathname == "/ws") {
      handleSocket(context, storeConnection);
      return;
    }
    await context.send({
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  });

  log("About to listen on " + port + " port");
  await app.listen({ port });
  log("Done");
}

log("Args:: " + Deno.args);
if (Deno.args.indexOf("setup") == -1) {
  eventLoop();
} else {
  log("Just setting up");
}
