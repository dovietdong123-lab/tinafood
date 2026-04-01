const { createPool } = require('mysql2/promise');
const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'k1',
});
async function main() {
  const [rows] = await pool.query('SELECT * FROM discount_coupons');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
main();
