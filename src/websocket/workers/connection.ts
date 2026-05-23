import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

export const queueConnection = new IORedis.default({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
});

queueConnection.on("connect", () =>
  console.log("✅ queueConnection connected"),
);
queueConnection.on("error", (err) =>
  console.log("❌ queueConnection error:", err),
);
queueConnection.on("close", () =>
  console.log("🔌 queueConnection disconnected.."),
);

export const workerConnection = new IORedis.default({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

workerConnection.on("connect", () =>
  console.log("✅ workerConnection connected"),
);
workerConnection.on("error", (err) =>
  console.log("❌ workerConnection error:", err),
);
workerConnection.on("close", () =>
  console.log("🔌 workerConnection disconnected.."),
);
