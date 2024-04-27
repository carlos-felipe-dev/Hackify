const fs = require("fs");
const { connect } = require(".");
const path = require("path");

async function seedDatabase(client) {
  await client.query(`
      CREATE TABLE sellers (
        seller_id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        store_name TEXT NOT NULL
       )
     `);

  await client.query(`
        CREATE TABLE customers(
          customer_id SERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          password TEXT NOT NULL
        )
    `);

  await client.query(`
      CREATE TABLE products(
      product_id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL,
      image TEXT NOT NULL,
      manufacturing_cost DECIMAL(10,2),
      date_created DATE NOT NULL DEFAULT CURRENT_DATE
      )
    `);

  await client.query(`
      CREATE TABLE orders(
      order_id SERIAL PRIMARY KEY,
      customer_id INT,
      order_date DATE NOT NULL DEFAULT CURRENT_DATE,
      total_amount DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      )
    `);

  await client.query(`
      CREATE TABLE order_items(
      order_item_id SERIAL PRIMARY KEY,
      order_id INT,
      product_id INT,
      quantity INT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (product_id) REFERENCES products(product_id)
      )
    `);

  await client.query(`
      CREATE TABLE shipments(
      shipment_id SERIAL PRIMARY KEY,
      order_id INT,
      carrier VARCHAR(100) NOT NULL,
      tracking_number VARCHAR(100) NOT NULL,
      shipment_date DATE NOT NULL,
      delivery_date DATE NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
      )
    `);
}

async function dropTables(client) {
  await client.query(`DROP TABLE IF EXISTS shipments CASCADE`);

  // Drop order_items table
  await client.query(`DROP TABLE IF EXISTS order_items`);

  // Drop orders table
  await client.query(`DROP TABLE IF EXISTS orders`);

  // Drop products table
  await client.query(`DROP TABLE IF EXISTS products`);

  // Drop customers table
  await client.query(`DROP TABLE IF EXISTS customers`);

  // Drop sellers table
  await client.query(`DROP TABLE IF EXISTS sellers`);
}

async function insertData(client) {
  const { sellers, customers, products, orders, order_items, shipments } =
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "db", "data.json")));

  await Promise.all(
    sellers.map(async ({ email, password, store_name }) => {
      await client.query(
        `INSERT INTO sellers (email, password, store_name) VALUES($1,$2,$3)`,
        [email, password, store_name]
      );
    })
  );
  await Promise.all(
    customers.map(async ({ email, password }) => {
      await client.query(
        `INSERT INTO customers (email, password) VALUES($1,$2)`,
        [email, password]
      );
    })
  );
  await Promise.all(
    products.map(
      async ({
        title,
        description,
        price,
        quantity,
        image,
        manufacturing_cost,
      }) => {
        await client.query(
          `INSERT INTO products (title, description, price, quantity, image, manufacturing_cost) VALUES($1,$2,$3,$4,$5,$6)`,
          [title, description, price, quantity, image, manufacturing_cost]
        );
      }
    )
  );
  await Promise.all(
    orders.map(async ({ customer_id, total_amount }) => {
      await client.query(
        `INSERT INTO orders (customer_id, total_amount) VALUES($1,$2)`,
        [customer_id, total_amount]
      );
    })
  );
  await Promise.all(
    shipments.map(
      async ({
        order_id,
        carrier,
        tracking_number,
        shipment_date,
        delivery_date,
      }) => {
        await client.query(
          `INSERT INTO shipments ( order_id, carrier, tracking_number, shipment_date, delivery_date) VALUES($1,$2,$3,$4, $5)`,
          [order_id, carrier, tracking_number, shipment_date, delivery_date]
        );
      }
    )
  );

  await Promise.all(
    order_items.map(
      async ({ order_item_id, order_id, product_id, quantity }) => {
        await client.query(
          `INSERT INTO order_items (order_item_id, order_id, product_id, quantity) VALUES($1,$2,$3,$4)`,
          [order_item_id, order_id, product_id, quantity]
        );
      }
    )
  );
}

async function main() {
  const client = await connect();
  try {
    await client.query("BEGIN"); // Start a
    await dropTables(client);
    await seedDatabase(client);
    await insertData(client);
    await client.query("COMMIT");
    console.log("Seeding complete");
  } catch (e) {
    console.log("Seeding error");
    console.log(e);
  } finally {
    client.release();
    process.exit(1);
  }
}

main();
