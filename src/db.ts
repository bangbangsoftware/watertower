import { Client } from "https://deno.land/x/postgres/mod.ts";

import type { Store } from "./watertower.d.ts";
import { error, log } from "./log.js";

const connect = async (settings: any) => {
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

const init = async (
  client: Client,
  settings: any,
  saveUser: Function,
  validUser: Function,
  adminUser: Function,
  tablename: String,
) => {
  const createStore = await client.queryObject(
    `CREATE TABLE IF NOT EXISTS ${tablename} (
    id SERIAL PRIMARY KEY,
    timestamp timestamp default current_timestamp, 
    inserted_by VARCHAR (200) NOT NULL,
    data JSON NOT NULL)
`,
  );
  const resultStore = await client.queryArray(`select * from ${tablename}`);
  log(resultStore.rows);
  const createUser = await client.queryObject(
    `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    userID VARCHAR (200) NOT NULL UNIQUE,
    p TEXT NOT NULL)
`,
  );
  const resultUsers = await client.queryArray("select * from users");
  log(resultUsers.rows);

  await client.queryObject(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  const createRoles = await client.queryObject(
    `CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    userID INT,
    ROLE TEXT NOT NULL,
    CONSTRAINT "user_constraint" FOREIGN KEY (userID) REFERENCES users (id)
    ON DELETE CASCADE
  )
`,
  );
  const resultRoles = await client.queryArray("select * from roles");
  log(resultRoles.rows);

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
  saveAdmin(client, userID);
};

const loadSetup = (client: Client, tablename: String) =>
  async (id: number) => {
    const sql = `select data from ${tablename} where id = ${id}`;
    try {
      const select = await client.queryArray(sql);
      if (
        !select || !select.rows || !select.rows[0] || select.rows[0][0] == null
      ) {
        log("Returning empty");
        return { __UUID: 0 };
      }

      const data = <any>select.rows[0][0];
      data.__UUID = id;
      return data;
    } catch (err) {
      error(err);
      error(sql);
    }
  };

const validUserSetup = (client: Client) =>
  async (id: string, p: string): Promise<boolean | number> => {
    const sql = `SELECT id 
    FROM users
   WHERE userID = '${id}' 
     AND p = crypt('${p}', p);`;
    try {
      const select = await client.queryArray(sql);
      const valid = select.rowCount === 1;
      if (!valid) {
        return false;
      }
      return <number>select.rows[0][0];
    } catch (err) {
      error(err);
      error(sql);
    }
    return false;
  };

const adminUserSetup = (client: Client) =>
  async (id: string): Promise<boolean | number> => {
    const sql = `SELECT id 
    FROM roles
   WHERE userID = '${id}' 
     AND role = 'admin'`;
    try {
      const select = await client.queryArray(sql);
      const valid = select.rowCount === 1;
      if (!valid) {
        return false;
      }
      return <number>select.rows[0][0];
    } catch (err) {
      error(err);
      error(sql);
    }
    return false;
  };

const currentIDSetup = (client: Client, tablename: String) =>
  async () => {
    const newID = await client.queryArray(`select max(id) from ${tablename}`);
    log(newID);
    if (!newID || !newID.rows || !newID.rows[0] || newID.rows[0][0] == null) {
      log("Returning zero");
      const ids = await client.queryArray(`select id from ${tablename}`);
      log(ids);
      return 0;
    }
    return newID.rows[0][0];
  };

const saveSetup = (client: Client, currentID: Function, tablename = "store") =>
  async (userID: string, toStore: any) => {
    const dataString = JSON.stringify(toStore);
    const sql =
      `insert into ${tablename} (inserted_by,data) values ('${userID}','${dataString}')`;
    try {
      const insert = await client.queryObject(sql);
      log(userID + " inserted " + dataString);
      return currentID();
    } catch (err) {
      error(err);
      error(sql);
    }
  };

const saveAdmin = async (client: Client, userID: string) => {
  const sql = `insert into roles (userID,role) values ('${userID}','admin')`;
  try {
    const insert = await client.queryObject(sql);
    log(userID + " has admin roll");
  } catch (err) {
    error(err);
    error(sql);
  }
};

const saveUserSetup = (client: Client) =>
  async (u: string, p: string) => {
    const sql = `INSERT INTO users (userID, p) VALUES (
      '${u}',
      crypt('${p}', gen_salt('bf'))
    )`;
    try {
      const insert = await client.queryObject(sql);
      log(u + " user inserted ");
    } catch (err) {
      error(err);
      error(sql);
    }
  };

const SetupDatabase = async (settings: any): Promise<Store> => {
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

export { SetupDatabase };
