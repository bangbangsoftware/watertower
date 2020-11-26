import { error, log } from "./log.js";

const ws = new WebSocket("ws://localhost:3000/ws");
const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

const send = () => {
  log("Sending storage");
  const data = {
    "action": "update",
    "data": window.localStorage,
  };
  ws.send(JSON.stringify(data));
};

document.addEventListener("storage", function (e) {
  if (ws.readyState == OPEN) {
    send();
    return;
  }
  if (ws.readyState == CLOSING || ws.readyState == CLOSED) {
    const state = ws.readyState == CLOSED ? "closed" : "closing";
    error("Websocket is " + state);
    return;
  }
  const waiting = () => {
    send();
    ws.removeEventListener("open", waiting);
  };
  ws.addEventListener("open", waiting);
});

const listenerSetup = (incoming) =>
  async ({ target }) => {
    const ws = target;
    log("websocket open");
    ws.addEventListener("message", incoming);
  };

const connect = async () => {
  const listener = listenerSetup((event) => {
    const msg = JSON.parse(event.data);
    if (msg.state == 409) {
      error("Out of sync... overwriting, maybe should merge???");
    }
    const keys = Object.keys(msg.data);
    keys.forEach((key) => {
      log("Updating " + key + " to " + msg[key]);
      localStorage.setItem(key, msg[key]);
    });
  });
  ws.addEventListener("open", listener);
  const event = new Event("storage");
  document.dispatchEvent(event);
};

export default connect;
