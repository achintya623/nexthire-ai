const { Pool } = require("pg");

// Shares a single PostgreSQL connection pool across controllers.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool
  .connect()
  .then(() => console.log("PostgreSQL connected"))
  .catch((err) => console.error("DB connection error", err));

pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
});

module.exports = pool;
