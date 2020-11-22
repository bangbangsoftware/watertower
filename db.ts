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

const init = async (client: Client) => {
  const createStore = await client.query(`CREATE TABLE IF NOT EXISTS store (
    id SERIAL PRIMARY KEY,
    timestamp timestamp default current_timestamp, 
    inserted_by VARCHAR (200) NOT NULL,
    data JSON NOT NULL)
`);
  log(createStore);
  const resultStore = await client.query("select * from store");
  log(resultStore.rows);
  const createUser = await client.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    userID VARCHAR (200) NOT NULL,
    p TEXT NOT NULL)
`);
  const resultUsers = await client.query("select * from users");
  log(resultUsers.rows);
};

const loadSetup = (client: Client) =>
  async (id: number) => {
    const sql = `select data from store where id = ${id}`;
    try {
      const select = await client.query(sql);
      return select.rows[0][0];
    } catch (err) {
      error(err);
      error(sql);
    }
  };

const validUserSetup = (client: Client) =>
  async (id: string, p: string): Promise<boolean> => {
    const sql = `SELECT id 
    FROM users
   WHERE email = ${id} 
     AND password = crypt('${p}', p);`;
    try {
      const select = await client.query(sql);
      return select.rows.length === 1;
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
      `insert into store (inserted_by,data) values ('${userID}','${toStore}')`;
    try {
      const insert = await client.query(sql);
      log(userID + " inserted " + dataString);
      return currentID();
    } catch (err) {
      error(err);
      error(sql);
    }
  };

const saveUserSetup = (client: Client) =>
  async (u: string, p: string) => {
    const sql = `INSERT INTO users (email, password) VALUES (
      'johndoe@mail.com',
      crypt('${u}', gen_salt('${p}'))
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
  await init(client);

  const load = loadSetup(client);
  const currentID = currentIDSetup(client);
  const save = saveSetup(client, currentID);
  const saveUser = saveUserSetup(client);
  const validUser = validUserSetup(client);

  const close = async () => await client.end();

  const funcs = { save, saveUser, validUser, load, close, currentID };

  return funcs;
};

export { SetupDatabase };
