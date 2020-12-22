import {
  addClickFunction,
  getByName,
  setByName,
  tools,
  watertowerConnect,
} from "./dist/binder.js";
import {
  addRow,
  addSort,
  clearTable,
  toggleClass,
} from "./dist/plugins/tablePlugin.js";

import { showHideSwap } from "./dist/plugins/showhidePlugin.js";
import { positionIds } from "./posrow.js";
import { benchIds } from "./posbench.js";
import { goalieIds } from "./posgoal.js";
import "./formationedit.js";
import "./teamnames.js";
import "./eventslist.js";

let mode = "edit"; // two modes 'edit' or 'display'

// Register a function for toggleEdit to use with "click" in mark up
addClickFunction("toggleEdit", (e) => {
  const editNow = mode === "display"; // toggle mode

  toggleHide("namesInputMode");
  toggleHide("namesDisplayMode");
  changeClass(e.target.id, editNow); // Button press display

  positionIds.forEach((id) => toggleHide(id));
  benchIds.forEach((id) => toggleHide(id));
  goalieIds.forEach((id) => toggleHide(id));

  mode = editNow ? "edit" : "display"; // set new mode
});

const toggleHide = (id, className = "hide") => {
  const element = document.getElementById(id);
  const hiding = element.classList.contains(className);
  if (hiding) {
    element.classList.remove(className);
  } else {
    element.classList.add(className);
  }
};

//helper function for changing class
const changeClass = (id, show, className = "edit") => {
  const element = document.getElementById(id);
  if (show) {
    element.classList.remove(className);
  } else {
    element.classList.add(className);
  }
};

const zeroPad = (n) => (n > 9 ? n : "0" + n);

const formation = (prefix = "pos-") => {
  let list = "";
  for (let x = 1; x < 21; x++) {
    const value = getByName(prefix + x);
    const display = list.length == 0 ? value : ". " + value;
    const displayValue = value ? display : "";
    list = list + displayValue;
  }
  return list;
};

const bench = () => {
  const value = formation("pos-bench-");
  return value ? ". On the Bench: " + value : "";
};

const goalie = () => {
  const value = getByName("pos-goal");
  return value ? ". Goalie: " + value : "";
};

const location = () => {
  const place = getByName("place");
  return (" (" + place).toLowerCase() + ").";
};

addClickFunction("publish", () => {
  publish("Formation: " + formation() + goalie() + bench() + location());
});

const publish = (details) => {
  const date = new Date();
  const hh = zeroPad(date.getHours());
  const mm = zeroPad(date.getMinutes());
  const ss = zeroPad(date.getSeconds());
  const ent = {
    ok: ">",
    time: hh + ":" + mm + ":" + ss,
    details,
  };
  addRow("events", ent);
};

const getRow = (e) => {
  const clicked = e.target;
  return clicked.getAttribute("row");
};

addClickFunction("kickoff", (e) => {
  setByName("lastUpdate", new Date().getTime()); // reset for pause
  window.location.href = "kickoff.html";
});

addSort("events", (a, b) => {
  const timeA = parseInt(a.time.replaceAll(":", ""));
  const timeB = parseInt(b.time.replaceAll(":", ""));
  const result = timeA > timeB ? 1 : timeA < timeB ? -1 : 0;
  return result;
});

addClickFunction("undo", (e) => {
  const row = getRow(e);
  if (!row) {
    return;
  }
  toggleClass("events", row, "crossout");
});

let watertower;
let connectionPoll;
const connect = async (e) => {
  try {
    watertower = await watertowerConnect();
    showHideSwap("connected");
    console.log("Connected at last!");
    clearInterval(connectionPoll);
  } catch (er) {
    console.error("Connection failed");
    console.error(er);
  }
};

try {
  watertower = await watertowerConnect();
  showHideSwap("connected");
  console.log("Connected!");
} catch (er) {
  console.error("First Connection failed");
  console.error(er);
  connectionPoll = setInterval(connect, 30000);
}

const tellUser = (m) => {
  console.log(m);
};
window.addEventListener("watertower-message", tellUser);

addClickFunction("login", async (e) => {
  const u = getByName("u");
  const p = getByName("password");
  watertower.login(u, p);
  showHideSwap("connected");
});

export const reset = () => {
  clearTable("events");
  setByName("mins", "00");
  setByName("secs", "00");
  setByName("oppenentName", "");
  setByName("opponentScore", "0");
  setByName("score", "0");
  zeroPlayersScores();
};

const zeroPlayersScores = (pos = 1) => {
  if (pos > 22) {
    zeroOthers();
    return;
  }
  zeroPlayerScore("pos-" + pos);
  zeroPlayersScores(pos + 1);
};

const zeroPlayerScore = (label) => {
  const name = getByName(label);
  if (!name) {
    return;
  }
  const scorer = name + "-scored";
  setByName(scorer, 0);
};

const zeroOthers = () => {
  zeroPlayerScore("pos-goal");
  clearBench();
};

const clearBench = (pos = 1) => {
  if (pos > 5) {
    return;
  }
  zeroPlayerScore("pos-bench-" + pos);
  clearBench(pos + 1);
};

addClickFunction("send", async (e) => {
  const row = getRow(e);
  if (!row) {
    return;
  }
  const title = "Footswell";
  const text = document.getElementById("events-details-" + row).innerText;
  const url = window.location.href;
  //  you could..... const number = telephoneNumber;

  if (!navigator.share) {
    console.error("web share not supported");
    return;
  }

  try {
    await navigator.share({
      title,
      text,
      url,
    });
    console.log("Thanks for sharing!");
  } catch (err) {
    console.log(`Couldn't share because of`, err.message);
  }
  /** 
    
   Straight to WhatsApp?

    const  message =  encodeURIComponent(yourMessage);
    
    console.log("https://api.whatsapp.com/send?phone=" + number + "&text=%20" + message);
    return fetch("https://api.whatsapp.com/send?phone=" + number + "&text=%20" + message);
  
  */
});
