require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const { db } = require("../db");

// const port = process.env.POSTGRES_PORT;

// const corsOptions = {
//   origin: 'http://localhost:3000',
// }

app.use(cookieParser());

// app.use(cookieParser());

// app.use(
//   cors({
//     credentials: true,
//   })
// );

// Makes Express parse the JSON body of any requests and adds the body to the req object
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(db);

app.get("/products", async (req, res) => {
  const { rows: products } = await req.db.query(`
    SELECT * FROM products
  `);

  res.json({ products });
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
  console.log("Server ready on port 5432.");
});

module.exports = app;
