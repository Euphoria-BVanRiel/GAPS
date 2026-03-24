const { createApolloServer } = require('./app');
const { startStandaloneServer } = require('@apollo/server/standalone');

async function start() {
  const server = createApolloServer();
  const { url } = await startStandaloneServer(server, { listen: { port: 4000 } });
  console.log(`🚀 Server ready at ${url}`);
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
