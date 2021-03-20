const express = require('express');
const ws = require('ws');
const { v4 } = require('uuid');
const fs = require('fs')
const { Client } = require('pg');

const socks = new Map();
const app = express();

// Logging....
const pad = (n) => n < 10 ? "0" + n : "" + n;
const getDate = (date = new Date()) => {
  return `${date.getFullYear()}-${pad(date.getMonth())}-${pad(date.getDay())} ${pad(date.getHours())
    }:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const log = (message) => {
  console.log(getDate(), message);
};

const describe = (obj = null) => {
  if (!obj) {
    return "";
  }
  try {
    return JSON.stringify(obj);
  } catch (er) {
    return obj + "";
  }
};

const error = (message, obj = null) => {
  const all = getDate() + " " + message + " " + describe(obj);
  console.error(all);
};

// setups
const connect = async (settings) => {
  const clientSettings = {
    user: settings.db.user,
    password: settings.db.p,
    database: settings.db.db,
    hostname: settings.db.hostname,
    port: settings.db.post,
  };
  const client = new Client(clientSettings);
  await client.connect();
  return client;
};

const setupDatabase = async (settings) => {
  const client = await connect(settings);

  const tablename = settings.table ? settings.table : "store";

  const load = loadSetup(client, tablename);
  const currentID = currentIDSetup(client, tablename);
  const save = saveSetup(client, currentID);
  const saveUser = saveUserSetup(client);
  const validUser = validUserSetup(client);
  const adminUser = adminUserSetup(client);

  const close = async () => await client.end();

  await init(client, settings, saveUser, validUser, adminUser, tablename);

  const funcs = {
    save,
    saveUser,
    adminUser,
    validUser,
    load,
    close,
    currentID,
  };

  return funcs;
};

const tableOk = tablename => (err, res) => {
  if (err) {
    error(`${tablename} failed`, err);
    return;
  }
  log(`Table ${tablename} is successfully created or already there`);
}

const init = async (
  client,
  settings,
  saveUser,
  validUser,
  adminUser,
  tablename,
) => {
  client.query(
    `CREATE TABLE IF NOT EXISTS ${tablename} (
    id SERIAL PRIMARY KEY,
    timestamp timestamp default current_timestamp, 
    inserted_by VARCHAR (200) NOT NULL,
    data JSON NOT NULL)
`, tableOk(tablename)
  );
  await client.query(
    `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    userID VARCHAR (200) NOT NULL UNIQUE,
    p TEXT NOT NULL)
`, tableOk('users')
  );

  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await client.query(
    `CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    userID INT,
    ROLE TEXT NOT NULL,
    CONSTRAINT "user_constraint" FOREIGN KEY (userID) REFERENCES users (id)
    ON DELETE CASCADE
  )
`, tableOk('roles')
  );

  if (!settings.admin || !settings.admin.id || !settings.admin.p) {
    log("No admin in settings");
    return;
  }
  const valid = await validUser(settings.admin.id, settings.admin.p);
  const allGood = (!valid) ? false : await adminUser(valid);
  if (allGood) {
    log(" No need to generate, admin exists " + settings.admin.id);
    return;
  }
  await saveUser(settings.admin.id, settings.admin.p);
  const userID = await validUser(settings.admin.id, settings.admin.p);
  log(userID);
  saveAdmin(client, userID);
};

const loadSetup = (client, tablename) =>
  async (id) => {
    if (!id) {
      log("No id returning empty");
      return { __UUID: 0 };
    }
    const sql = `select data from ${tablename} where id = ${id}`;
    try {
      const select = await client.query(sql);
      if (
        !select || !select.rows || !select.rows[0] || select.rows[0] == null
      ) {
        log("Returning empty");
        return { __UUID: 0 };
      }

      const data = select.rows[0];
      data.__UUID = id;
      return data;
    } catch (err) {
      error(err);
      error(sql);
    }
  };

const validUserSetup = (client) =>
  async (id, p) => {
    const sql = `SELECT id
    FROM users
   WHERE userID = '${id}'
     AND p = crypt('${p}', p);`;
    try {
      const select = await client.query(sql);
      const valid = select.rowCount === 1;
      if (!valid) {
        return false;
      }
      return select.rows[0].id;
    } catch (err) {
      error(err);
      error(sql);
    }
    return false;
  };

const adminUserSetup = (client) =>
  async (id) => {
    const sql = `SELECT id
        FROM roles
        WHERE userID = '${id}'
     AND role = 'admin'`;
    try {
      const select = await client.query(sql);
      const valid = select.rowCount === 1;
      if (!valid) {
        return false;
      }
      return select.rows[0].id;
    } catch (err) {
      error(err);
      error(sql);
    }
    return false;
  };

const currentIDSetup = (client, tablename) =>
  async () => {
    const newID = await client.query(`select max(id) from ${tablename}`);
    if (!newID || !newID.rows || !newID.rows[0] || newID.rows[0] == null) {
      log("Returning zero");
//      const ids = await client.query(`select id from ${tablename}`);
      return 0;
    }
    return newID.rows[0].max;
  };

const saveSetup = (client, currentID, tablename = "store") =>
  async (userID, toStore) => {
    const dataString = JSON.stringify(toStore);
    const sql =
      `insert into ${tablename} (inserted_by,data) values ('${userID}','${dataString}')`;
    try {
      const insert = await client.query(sql);
      log(userID + " inserted " + dataString);
      return currentID();
    } catch (err) {
      error(err);
      error(sql);
    }
  };

const saveAdmin = async (client, userID) => {
  const sql = `insert into roles (userID,role) values ('${userID}','admin')`;
  try {
    const insert = await client.query(sql);
    log(userID + " has admin roll");
  } catch (err) {
    error(err);
    error(sql);
  }
};

const saveUserSetup = (client) =>
  async (u, p) => {
    const sql = `INSERT INTO users (userID, p) VALUES (
      '${u}',
      crypt('${p}', gen_salt('bf'))
    )`;
    try {
      const insert = await client.query(sql);
      log(u + " user inserted ");
      log(p + " deleteme");
    } catch (err) {
      error(err);
      error(sql);
    }
  };

const processEvent = async (id, ev, store) => {
  log(id + " request incoming");

  if (typeof ev !== "string") {
    error("bad event", JSON.stringify(ev));
    return;
  }
  try {
    const message = JSON.parse(ev);
    if (message.action) {
      log("Request to " + message.action);
    } else {
      error("Request has no action ", message);
    }

    if (message.action == "logon") {
      logon(id, message.data, store);
    } else if (message.action == "load") {
      load(id, message.data, store);
    } else if (message.action == "update") {
      update(id, message.data, store);
    } else {
      const reply = {
        state: 400,
        message: "Request not understood",
        action: message.action == null ? "error" : message.action,
        data: message,
      };
      sendReply(id, reply, true);
    }
  } catch (err) {
    error("Cannot process message, error ", err);
    error("Cannot process message", ev);
  }
};

const logon = async (id, data, store) => {
  const wsc = socks.get(id);
  if (!wsc) {
    error(id + " is unknown, logon");
    // reset ???
    return false;
  }
  const override = true;
  const valid = await store.validUser(data.id, data.p);
  const allGood = (!valid && !override) ? false : await store.adminUser(valid);
  if (allGood) {
    log("Admin now logged on " + id);
    wsc.canWrite = true;
    socks.set(id, wsc);
    const reply = {
      state: 200,
      message: data.id + " is now logged in",
      action: "logon",
      data: null,
    };
    sendReply(id, reply);
    return true;
  }
  error("deleteme. Bad log in ", data);
  const reply = {
    state: 401,
    message: "Bad logon details",
    action: "logon",
    data: null,
  };
  sendReply(id, reply);
  return false;
};

const hasWritePermissions = (id, wsc) => {
  if (!wsc) {
    error(id + " is unknown to check permissions");
    return false;
  }

  if (wsc.canWrite) {
    return true;
  }
  error("wsc can write is false");
  const reply = {
    state: 403,
    message: "This socket " + id + " is not writable",
    action: "update",
    data: null,
  };
  sendReply(id, reply, true);
  return false;
};

const outOfSequence = async (
  id,
  uuid,
  store,
) => {
  const sequence = await inSequence(id, uuid, store);
  return !sequence;
};

const inSequence = async (
  id,
  uuid,
  store
) => {
  // is it out of sequence...
  const currentID = await store.currentID();
  if (currentID == null) {
    log("currentID is null, so assume this is the first insert");
    return true;
  }
  if (uuid == currentID) {
    return true;
  }
  const err = "Data out of Sync, current id is " + currentID +
    " your data is " + uuid;
  // Maybe should try and merge...?
  const currentData = await store.load(currentID);
  const reply = {
    state: 409,
    message: err,
    action: "update",
    data: currentData,
  };
  sendReply(id, reply, true);
  return false;
};

const update = async (id, data, store) => {
  const wsc = socks.get(id);
  if (!wsc) {
    error(id + " is unknown to update");
    return;
  }
  const canWrite = hasWritePermissions(id, wsc);
  if (!canWrite) {
    error("Can't write!");
    return;
  }
  log("Can write - tick");

  const wrongSequence = await outOfSequence(id, data.__UUID, store);
  if (wrongSequence) {
    error("Wrong Sequence!");
    return;
  }
  log("In Sequence - tick");

  const __UUID = await store.save(id, data);
  data.__UUID = __UUID;
  log("Updated data " + JSON.stringify(data).length + " to " + data.__UUID);
  const reply = {
    state: 200,
    message: "Updated",
    action: "update",
    data,
  };
  sendReply(id, reply);

  broadcast(id, data);
};

const broadcast = (id, data) => {
  const reply = {
    state: 200,
    message: "Store has been updated",
    action: "broadcast",
    data,
  };

  socks.forEach((wsc) => {
    if (!wsc.socket || wsc.socket.isClosed) {
      error("Deleting stored socket ", wsc);
      socks.delete(wsc.id);
    } else if (wsc.id != id) {
      sendReply(wsc.id, reply);
    }
  });
};

const load = async (id, recievedData, store) => {
  const anID = (recievedData == null || recievedData.uuid == null)
    ? null
    : recievedData.uuid;
  const idToLoad = (anID == null) ? await store.currentID() : anID;
  const data = await store.load(idToLoad);
  const state = data ? 200 : 404;
  const message = data
    ? "Data for " + idToLoad
    : "Cannot find data with uuid " + idToLoad;
  const action = "load";
  const reply = {
    state,
    message,
    action,
    data,
  };
  sendReply(id, reply);
};

const sendReply = (id, reply) => {
  const wsc = socks.get(id);
  if (!wsc) {
    log.rror(id + " is unknown, cannot reply!??");
    return;
  }
  wsc.socket.send(JSON.stringify(reply));
};

const getSettings = () =>
  new Promise((resolve, reject) => {
    fs.readFile('./.watertower.json', 'utf8', (err, data) => {
      if (err) {
        error(err)
        reject(err);
      }
      const settings = JSON.parse(data);
      resolve(settings);
    })
  });

const setupWs = (store) => {
  const wsServer = new ws.Server({ noServer: true });
  wsServer.on('connection', socket => {
    let canWrite = false;
    const id = v4();
    const wsc = { id, socket, canWrite };
    socks.set(id, wsc);
    log("New socket " + id);

    socket.on('message', message => {
      log(message);
      processEvent(id, message, store);
    });
  });
  return wsServer;
}

const setupPort = (settings) => {
  const portEnv = process.env.PORT;
  const portSettings = settings.port ? settings.port : 4444;
  const port = !portEnv ? portSettings : portEnv;
  return port;
}

const go = async () => {
  log("Starting");
  const settings = await getSettings();

  log("1. Setting up database");
  const store = await setupDatabase(settings);

  log("2. Setting up websocket");
  const wsServer = setupWs(store);

  const port = setupPort(settings);
  log("3. About to listen on port " + port);
  const server = app.listen(port);
  app.use(express.static('public'));
  server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, ws => {
      log("Websocket connection ready");
      wsServer.emit('connection', ws, request);
    });
  });
}

go();