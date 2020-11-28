import { error, log } from "./log.js";

const ws = new WebSocket("ws://localhost:3000/ws");
const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

const send = (data = {
  "action": "update",
  "data": window.localStorage,
}) => {
  log("Sending storage");
  ws.send(JSON.stringify(data));
};

document.addEventListener("storage", function (e) {
  const data = e.detail;
  if (ws.readyState == OPEN) {
    send(data);
    return;
  }
  const state = ws.readyState == CLOSED ? "closed" : "closing";
  error("Websocket is " + state);
  const waiting = () => {
    send(data);
    ws.removeEventListener("open", waiting);
  };
  ws.addEventListener("open", waiting);
});

const login = () => {
  const id = document.getElementById("user").value;
  const p = document.getElementById("p").value;
  const data = JSON.stringify({ action: "logon", data: { id, p } });
  ws.send(data);
};

const store = () => {
  const data = {
    "action": "update",
    "data": window.localStorage,
  };
  const event = new CustomEvent("storage", { detail: data });
  document.dispatchEvent(event);
};

const load = (id = null) => {
  const data = {
    "action": "load",
    "data": { id },
  };
  const event = new CustomEvent("storage", { detail: data });
  document.dispatchEvent(event);
};

const listenerSetup = (incoming) =>
  async ({ target }) => {
    const ws = target;
    log("websocket open");
    ws.addEventListener("message", incoming);
  };

const connect = async () => {
  const listener = listenerSetup((event) => {
    const msg = JSON.parse(event.data);
    log(msg);
    if (msg.state == 409) {
      error("Out of sync... overwriting, maybe should merge???");
      load();
    }
    if (msg.state == 403) {
      error("Need to log in");
      return;
    }
    if (msg.action != "update") {
      log("Doing nothing with action " + msg.action);
      return;
    }
    const keys = Object.keys(msg.data);
    keys.forEach((key) => {
      log("Updating " + key + " to " + msg[key]);
      localStorage.setItem(key, msg[key]);
    });
  });
  ws.addEventListener("open", listener);
};

export { connect, load, login, store };
