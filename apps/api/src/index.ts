import { createServer } from "./server";

const server = createServer();
const port = server.brilhio.config.port;
const host = server.brilhio.config.host;

server
  .listen({ port, host })
  .then(() => {
    server.log.info(
      `Brilhio API listening on http://${host}:${port} (repo=${server.brilhio.repository.mode}, queue=${server.brilhio.queue ? "enabled" : "disabled"})`,
    );
  })
  .catch((error) => {
    server.log.error(error);
    process.exit(1);
  });
