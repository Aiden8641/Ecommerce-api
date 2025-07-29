import { safe_user, users } from "../@types/postgres"
import sql from "../src/db/postgres/postgres"
import { gen_cart_key, gen_refresh_token_key } from "../src/db/redis/key_gen"
import { client, disconnectRedis } from "../src/db/redis/redis"
import { generate_tokens } from "../src/middleware/auth"
import { sanitizeUserData } from "../src/middleware/user"
import bcrypt from "bcrypt"

export const payload: users = {
  id: "test_id",
  username: "test_user",
  password: "1234",
  role: "user"
}
export const test_product = {
  product: {
    name: "test", description: "a tset product", price: '1234', stock: 20
  }
}

export const gen_user = async () => {
  const saltsOrRounds = 10

  const hashed_password = await bcrypt.hash(`${payload.password}`, saltsOrRounds)

  const [user]: [users] = await sql`
      insert into users (username, password)
      values (${payload.username}, ${hashed_password})
      returning *;
    `

  const safe_user: safe_user = sanitizeUserData(user)

  return safe_user
}

export const valid_jwt = async () => {
  return generate_tokens(await gen_user())
}

export const cleanup_dbs = async () => {
  const [user]: [users] = await sql`
    select * from users
    where username = ${payload.username};
  `

  await sql`
    delete from users 
    where username = ${payload.username};
  `

  await sql`
    delete from products
    where name = ${test_product.product.name}
  `

  const key = gen_refresh_token_key(user.id)
  const cart_key = gen_cart_key(user.id)

  await client.del(key)
  await client.del(cart_key)

  await disconnectRedis()
} 
