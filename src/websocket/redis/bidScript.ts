import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import redis from "./redis.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const luaScript = fs.readFileSync(path.join(__dirname, "bid.lua"), "utf-8");

let scriptSHA = "";

export const loadScript = async () => {
  scriptSHA = (await redis.script("LOAD", luaScript)) as string;
  console.log(`✅ Lua script loaded. SHA: ${scriptSHA}\n`);
};

export const placeNewBid = async (
  userId: string,
  bidAmount: number,
  STATE_KEY: string,
  BIDS_KEY: string,
  USERNAME_KEY: string,
) => {};
