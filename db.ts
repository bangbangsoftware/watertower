import { Client } from "https://deno.land/x/postgres/mod.ts";

import type { Store } from "./watertower.d.ts";
import { error, log } from "./log.js";

const connect = async () => {
  const client = new Client({
    user: "vscode",
    password: "ssTGBJHNVlYY",
    database: "watertower",
    hostname: "localhost",
    port: 5432,
  });
  await client.connect();
  return client;
};

const init = async (client: Client) => {
  const create = await client.query(`CREATE TABLE IF NOT EXISTS store (
    id SERIAL PRIMARY KEY,
    timestamp timestamp default current_timestamp, 
    inserted_by VARCHAR (200) NOT NULL,
    data JSON NOT NULL)
`);
  log(create);
  const result = await client.query("select * from store");
  log(result.rows);
};

const SetupDatabase = async (): Promise<Store> => {
  const client = await connect();
  await init(client);

  const currentID = async () => {
    const newID = await client.query("select max(id) from store");
    return newID.rows[0][0];
  };

  const save = async (userID: string, toStore: any) => {
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
  const load = async (id: number) => {
    const sql = `select data from store where id = ${id}`;
    try {
      const select = await client.query(sql);
      return select.rows[0][0];
    } catch (err) {
      error(err);
      error(sql);
    }
  };

  const close = async () => await client.end();

  return {
    save,
    load,
    close,
    currentID,
  };
};

export { SetupDatabase };
