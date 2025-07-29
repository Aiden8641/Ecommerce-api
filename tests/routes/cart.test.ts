import { test, afterAll, beforeAll, expect } from "vitest"
import { generate_tokens } from "../../src/middleware/auth";
import { valid_jwt, cleanup_dbs, payload } from "../var";
import request from "supertest"
import app from "../../src/app";
import { products, safe_user, users } from "../../@types/postgres";
import sql from "../../src/db/postgres/postgres";
import { client } from "../../src/db/redis/redis";
import { gen_cart_key } from "../../src/db/redis/key_gen";

let tokens: ReturnType<typeof generate_tokens>
let user: users
let cart

beforeAll(async () => {
  tokens = (await valid_jwt())
  const [selected_user]: [users] = await sql`
    select * from users 
    where username = ${payload.username}
  `

  user = selected_user
})

afterAll(async () => {
  await cleanup_dbs()
})

test("get cart", async () => {
  const response = await request(app).get(`/users/${user.id}/cart`).set("Authorization", `bearer ${tokens.access_token}`)

  expect(response.status).toBe(200)
  console.log(response.body)
})

test("add item to cart", async () => {
  const [product]: [products] = await sql`
    select * from products
    limit 1
  `

  const response = await request(app).post(`/users/${user.id}/cart`).send(product).set("Authorization", `bearer ${tokens.access_token}`)

  expect(response.status).toBe(200)

  const key = gen_cart_key(user.id)
  const cart_items = await client.hGetAll(key)

  cart = cart_items

  expect(cart_items).toBeDefined()
})

test("delete item from cart", async () => {
  const response = await request(app).delete(`/users/${user.id}/cart/items/${Object.keys(cart!)[0]}`).set("Authorization", `bearer ${tokens.access_token}`)

  expect(response.status).toBe(200)

  const key = gen_cart_key(user.id)
  const cart_items = await client.hGetAll(key)

  expect(cart_items).toEqual({})
})
