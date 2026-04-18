import { createServer } from "./server";

const server = createServer();
const port = server.ritmio.config.port;
const host = server.ritmio.config.host;

server
  .listen({ port, host })
  .then(() => {
    server.log.info(
      `Ritmio API listening on http://${host}:${port} (repo=${server.ritmio.repository.mode}, queue=${server.ritmio.queue ? "enabled" : "disabled"})`,
    );
  })
  .catch((error) => {
    server.log.error(error);
    process.exit(1);
  });
