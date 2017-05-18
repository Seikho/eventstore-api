import * as knex from 'knex'

const db = knex({
  client: 'pg',
  connection: {
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
  }
})

export {
  db as default
}
