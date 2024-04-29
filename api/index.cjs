require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");

// const port = process.env.POSTGRES_PORT;

const corsOptions = {
  origin: "http://localhost:5173",
};

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

app.use(cookieParser());

app.use(cors(corsOptions));

// Makes Express parse the JSON body of any requests and adds the body to the req object
app.use(bodyParser.json());
app.use(express.static("public"));

app.use(async (req, res, next) => {
  try {
    req.db = await pool.connect();
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
});

app.post("/register", async (req, res) => {
  try {
    console.log("POST to /register");

    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.json("Passwords do not match");
    }

    if (password.length < 6) {
      return res.json("Password must be at least 6 characters");
    }

    const existingUser = await req.db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "An account is already registered with this email.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await req.db.query(
      `INSERT INTO users (email, password)
    VALUES ($1, $2) 
    RETURNING id;
    `,
      [email, hashedPassword]
    );

    const userId = rows[0].id;

    console.log("rows[0]: ", rows[0]);

    const jwtEncodedUser = jwt.sign(
      { userId, ...req.body },
      process.env.JWT_KEY
    );

    console.log("encoded: ", jwtEncodedUser);

    res.json({ jwt: jwtEncodedUser, success: true });

    // res.json("Success: user created");
  } catch (Error) {
    console.log(Error);
    res.json({ err, success: false });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await req.db.query(
      `SELECT * 
      FROM users 
      WHERE email = $1`,
      [ email ]
    );
    // console.log(rows.length)
    if (rows.length === 0) {
      return res.json({error: 'Email or password is incorrect'});
    }

    const user = rows[0];

    // Compare the provided password with the hashed password from the database
    const passwordMatches = await bcrypt.compare(password, user.password);

    // If passwords don't match, return an error
    if (!passwordMatches) {
      return res.json({ error: 'Email or password is incorrect' });
    }

    const payload = {
      userId: user.id,
      email: user.email,
    }

    const jwtEncodedUser = jwt.sign(payload, process.env.JWT_KEY);
    res.json({ jwt: jwtEncodedUser, success: true });

  } catch (error) {
    console.log(error);
    res.json({error: 'Something went wrong. Try again.'})
  }
});

app.get("/car", async (req, res) => {
  console.log("GET to /car");

  const { rows: cars } = await req.db.query(`
    SELECT * FROM car
  `);

  console.log("All cars: ", cars);
  res.json({ cars });
});

app.post("/car", async (req, res) => {
  try {
    console.log("POST to /car");

    const { year, make, model } = req.body;

    const { rows } = await req.db.query(
      `INSERT INTO car (year, make, model)
    VALUES ($1, $2, $3)
    RETURNING *;`,
      [year, make, model]
    );

    const car = rows[0];
    console.log(car);
    res.json(car);
  } catch (err) {
    console.log("Error: ", err);
    res.json({ err, success: false });
  }
});

app.listen(3000, () => {
  console.log("Server ready on port 3000.");
});

module.exports = app;
