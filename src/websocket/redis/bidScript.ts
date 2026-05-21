import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import redis from "./redis.js";
import crypto from "crypto";
import type { BidResult } from "../types/types.js";
import { parseLuaResult } from "../handlers/helper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const luaScript = fs.readFileSync(path.join(__dirname, "bid.lua"), "utf-8");

let scriptSHA = "";

export const loadScript = async () => {
  scriptSHA = (await redis.script("LOAD", luaScript)) as string;
  console.log(`✅ Lua script loaded. SHA: ${scriptSHA}\n`);
};

export const bidScript = async (
  userId: string,
  bidAmount: number,
  STATE_KEY: string,
  BIDS_KEY: string,
): Promise<BidResult> => {
  const bidId = crypto.randomUUID();
  const serverNow = Date.now();

  try {
    const raw = await redis.evalsha(
      scriptSHA,
      2,
      STATE_KEY, // KEYS[1]
      BIDS_KEY, // KEYS[2]
      userId, // ARGV[1]
      bidAmount, // ARGV[2]
      bidId, // ARGV[3]
      serverNow, // ARGV[4]
    );

    return parseLuaResult(raw);
  } catch (error: any) {
    if (error.message.includes("NOSCRIPT")) {
      await loadScript();
      const raw = await redis.evalsha(
        scriptSHA,
        2,
        STATE_KEY, // KEYS[1]
        BIDS_KEY, // KEYS[2]
        userId, // ARGV[1]
        bidAmount, // ARGV[2]
        bidId, // ARGV[3]
        serverNow, // ARGV[4]
      );

      return parseLuaResult(raw);
    }
    console.log(error);
    throw error;
  }
};
