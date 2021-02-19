import * as Colours from "https://deno.land/std/fmt/colors.ts";

const pad = (n) => n < 10 ? "0" + n : "" + n;
const getDate = (date = new Date()) => {
  return `${date.getFullYear()}-${pad(date.getMonth())}-${pad(date.getDay())} ${
    pad(date.getHours())
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
  console.error(Colours.red(all));
};

export { error, log };
