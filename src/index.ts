import server from "./app.js";
import { loadScript } from "./websocket/redis/bidScript.js";

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await loadScript();

    server.listen(PORT, () => {
      console.log(`Server started...`);
    });
  } catch (error) {
    console.log("critical error while server startup", error);
    process.exit(1);
  }
};

startServer();
