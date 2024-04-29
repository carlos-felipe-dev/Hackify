const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

const connect = async () => {
  return await pool.connect();
};

const db = async (req, res, next) => {
  try {
    req.db = await connect();
    // req.db.connection.config.namedPlaceholders = true;

    // Moves the request on down the line to the next middleware functions and/or the endpoint it's headed for
    await next();

    req.db.release();
  } catch (err) {
    // If anything downstream throw an error, we must release the connection allocated for the request
    console.log(err);
    // If an error occurs, disconnects from the database
    if (req.db) req.db.release();
    throw err;
  }
};

module.exports = { db, connect };
