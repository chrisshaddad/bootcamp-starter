const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5433/bootcamp_starter' });
  try {
    await c.connect();
    console.log('connected');
    await c.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();