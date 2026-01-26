import server from "./app.js";

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
