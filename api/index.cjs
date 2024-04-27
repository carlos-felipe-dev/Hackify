require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

// const port = process.env.POSTGRES_PORT;

// const corsOptions = {
//   origin: 'http://localhost:3000', 
// }

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT
})

app.use(cookieParser());

app.use(cors({
  credentials: true,
}));

// Makes Express parse the JSON body of any requests and adds the body to the req object
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(async (req, res, next) => {
  try {
    req.db = await pool.connect();
    // req.db.connection.config.namedPlaceholders = true;

    // Moves the request on down the line to the next middleware functions and/or the endpoint it's headed for
    await next();

    req.db.release();
  } catch (err) {
    // If anything downstream throw an error, we must release the connection allocated for the request
    console.log(err)
    // If an error occurs, disconnects from the database
    if (req.db) req.db.release();
    throw err;
  }  
});

app.get('/car', async (req, res) => {
  console.log('GET to /car');

  const { rows: cars } = await req.db.query(`
    SELECT * FROM car
  `);

  console.log('All cars: ', cars);
  res.json({ cars });
});

app.post('/car', async (req, res) => {
  try {
    console.log('POST to /car')

  const { 
    year, 
    make, 
    model 
  } = req.body;

  const { rows } = await req.db.query(
    `INSERT INTO car (year, make, model)
    VALUES ($1, $2, $3)
    RETURNING *;`,
    [ year, make, model ]);

  const car = rows[0]  
  console.log(car)
  res.json(car)

  } catch (err) {
    console.log('Error: ', err)
    res.json({err, success: false})
  }
  
})

app.listen(5432, () => {
  console.log('Server ready on port 5432.');
});

module.exports = app;