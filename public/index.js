import { error, log } from "./log.js";

const ws = new WebSocket("ws://localhost:3000/ws");
const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

const send = (message = {
  "action": "update",
  "data": window.localStorage,
}) => {
  log("Sending");
  const data = message.data;
  if (data) {
    const keys = Object.keys(data);
    keys.forEach((key) => {
      data[key] = escape(data[key]);
    });
  }
  const sendingData = JSON.stringify(message);
  log(sendingData);
  ws.send(sendingData);
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
    const err = document.getElementById("message");
    err.innerHTML = "<b>" + msg.message + "</b";

    if (msg.state != 200) {
      return;
    }

    if (
      msg.action != "update" && msg.action != "load" &&
      msg.action != "broadcast"
    ) {
      log("Doing nothing with action " + msg.action);
      return;
    }
    const data = msg.data;
    if (!data) {
      error("no data");
      return;
    }
    const keys = Object.keys(data);
    keys.forEach((key) => {
      log("Updating " + key + " to " + data[key]);
      localStorage.setItem(key, escape(data[key]));
      updateDom(key, data[key]);
    });
  });
  ws.addEventListener("open", listener);
};

const escape = (value) => {
  if (!value) {
    return "";
  }
  if (value == "undefined") {
    return "";
  }
  if (value == "null") {
    return "";
  }
  return value;
};

const updateDom = (key, value) => {
  const element = document.getElementById(key);
  const input = (element) ? element : create(key, value);
  input.value = escape(value);
};

const create = (key) => {
  const data = document.getElementById("data");
  const input = document.createElement("INPUT");
  input.setAttribute("type", "text");
  input.setAttribute("id", key);
  input.setAttribute("placeholder", key);
  input.addEventListener("change", (event) => {
    const el = event.target;
    window.localStorage.setItem(el.id, el.value);
    store();
  });
  const lab = document.createElement("LABEL");
  lab.innerHTML = key + ": ";
  lab.setAttribute("id", "lab=" + key);
  const del = document.createElement("BUTTON");
  del.innerHTML = "X";
  del.setAttribute("id", "del-" + key);
  del.addEventListener("click", (event) => {
    const el = event.target;
    window.localStorage.removeItem(key);
    data.removeChild(input);
    data.removeChild(del);
    data.removeChild(lab);
  });
  data.appendChild(lab);
  data.appendChild(input);
  data.appendChild(del);

  return input;
};

export { connect, load, login, store };
