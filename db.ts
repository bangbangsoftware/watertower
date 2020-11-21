import { Client } from "https://deno.land/x/postgres/mod.ts";

import type { Store } from "./watertower.d.ts";
import { error, log } from "./log.js";

const SetupDatabase = async (): Promise<Store> => {
  const client = new Client({
    user: "vscode",
    password: "ssTGBJHNVlYY",
    database: "watertower",
    hostname: "localhost",
    port: 5432,
  });
  await client.connect();

  const create = await client.query(`CREATE TABLE IF NOT EXISTS store (
        id SERIAL PRIMARY KEY,
        timestamp timestamp default current_timestamp, 
        inserted_by VARCHAR (200) NOT NULL,
        data JSON NOT NULL)
  `);
  log(create);
  const result = await client.query("select * from store");
  log(result.rows);
  return {
    save: async (userID: string, toStore: any) => {
      // "insert into store (inserted_by,data)  values ('me','{\"TASTY\":\"Bingo\"}')",

      const dataString = JSON.stringify(toStore);
      const sql = `insert into store (inserted_by,data) values ('${userID}','${toStore}')`;
      try {
        const insert = await client.query(sql);
        log(userID + " inserted "+dataString);
      } catch (err) {
        error(err);
        error(sql);
      }
    },
    close: async () => await client.end(),
  };
};

export { SetupDatabase };
