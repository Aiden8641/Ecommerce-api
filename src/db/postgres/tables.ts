import sql from "./postgres"

async function user_table() {
  await sql`
    create table if not exists users (
      id integer generated always as identity primary key,
      username text not null unique,
      password text not null,
      role text not null default 'user' 
    );
  `

  return
}

async function product_table() {
  await sql`
    create table if not exists products (
      id integer generated always as identity primary key,
      name text not null,
      description text not null,
      price numeric not null,
      discount_price numeric default null,
      stock integer not null default 0,
      category text default null,
      image_url text default null,
      sku text not null,
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `
}

async function carts_table() {
  await sql`
    create table if not exists carts (
      id integer generated always as identity primary key,
      user_id integer not null references users(id) on delete cascade,
      product_id integer not null references products(id) on delete cascade,
      quantity integer not null default 1,
      created_at timestamp default now(),
      updated_at timestamp default now()
    )
  `
}

export async function create_tables() {
  await user_table()
  await product_table()
  await carts_table()

  console.log("sql tables succesfully created")

  return
}

