import { Client } from "https://deno.land/x/postgres/mod.ts";

import type { Store } from './watertower.d.ts';

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
  console.log(create);
  const result = await client.query("select * from store");
  console.log(result);
  return {
    save: async (toStore: any) => {
      const insert = await client.query(
        "insert into store (inserted_by,data)  values ('me','{\"TASTY\":\"Bingo\"}')",
      );
      console.log(insert);
    },
    close: async () => await client.end(),
  };
};


export { SetupDatabase};
