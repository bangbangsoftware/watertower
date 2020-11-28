import { Client } from "https://deno.land/x/postgres/mod.ts";

import type { Store } from "./watertower.d.ts";
import { error, log } from "./log.js";

const connect = async (settings: any) => {
  const client = new Client({
    user: settings.db.user,
    password: settings.db.p,
    database: settings.db.db,
    hostname: settings.db.hostname,
    port: settings.db.post,
  });
  await client.connect();
  return client;
};

const init = async (
  client: Client,
  settings: any,
  saveUser: Function,
  validUser: Function,
  adminUser: Function,
) => {
  const createStore = await client.query(`CREATE TABLE IF NOT EXISTS store (
    id SERIAL PRIMARY KEY,
    timestamp timestamp default current_timestamp, 
    inserted_by VARCHAR (200) NOT NULL,
    data JSON NOT NULL)
`);
  const resultStore = await client.query("select * from store");
  log(resultStore.rows);
  const createUser = await client.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    userID VARCHAR (200) NOT NULL UNIQUE,
    p TEXT NOT NULL)
`);
  const resultUsers = await client.query("select * from users");
  log(resultUsers.rows);

  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  const createRoles = await client.query(`CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    userID INT,
    ROLE TEXT NOT NULL,
    CONSTRAINT "user_constraint" FOREIGN KEY (userID) REFERENCES users (id)
    ON DELETE CASCADE
  )
`);
  const resultRoles = await client.query("select * from roles");
  log(resultRoles.rows);

  if (!settings.admin || !settings.admin.id || !settings.admin.p) {
    log("No admin in settings");
    return;
  }
  const valid = await validUser(settings.admin.id, settings.admin.p);
  const allGood = (!valid) ? false : await adminUser(valid);
  if (allGood) {
    log(" Admin exists " + settings.admin.id);
    return;
  }
  await saveUser(settings.admin.id, settings.admin.p);
  const userID = await validUser(settings.admin.id, settings.admin.p);
  saveAdmin(client, userID);
};

const loadSetup = (client: Client) =>
  async (id: number) => {
    const sql = `select data from store where id = ${id}`;
    try {
      const select = await client.query(sql);
      const data = select.rows[0][0];
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
      const select = await client.query(sql);
      const valid = select.rowCount === 1;
      if (!valid) {
        return false;
      }
      return select.rows[0][0];
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
      const select = await client.query(sql);
      const valid = select.rowCount === 1;
      if (!valid) {
        return false;
      }
      return select.rows[0][0];
    } catch (err) {
      error(err);
      error(sql);
    }
    return false;
  };

const currentIDSetup = (client: Client) =>
  async () => {
    const newID = await client.query("select max(id) from store");
    return newID.rows[0][0];
  };

const saveSetup = (client: Client, currentID: Function) =>
  async (userID: string, toStore: any) => {
    const dataString = JSON.stringify(toStore);
    const sql =
      `insert into store (inserted_by,data) values ('${userID}','${dataString}')`;
    try {
      const insert = await client.query(sql);
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
    const insert = await client.query(sql);
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
      const insert = await client.query(sql);
      log(u + " user inserted ");
    } catch (err) {
      error(err);
      error(sql);
    }
  };

const SetupDatabase = async (settings: any): Promise<Store> => {
  const client = await connect(settings);

  const load = loadSetup(client);
  const currentID = currentIDSetup(client);
  const save = saveSetup(client, currentID);
  const saveUser = saveUserSetup(client);
  const validUser = validUserSetup(client);
  const adminUser = adminUserSetup(client);

  const close = async () => await client.end();

  await init(client, settings, saveUser, validUser, adminUser);

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
