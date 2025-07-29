import { test, expect } from "vitest";
import { generate_access_token, generate_refresh_token, generate_tokens, store_user_data } from "../../src/middleware/auth";
import { safe_user } from "../../@types/postgres";
import jwt from "jsonwebtoken"
import { configDotenv } from "dotenv";
import { gen_refresh_token_key } from "../../src/db/redis/key_gen";
import { client } from "../../src/db/redis/redis";

configDotenv()

const user: safe_user = {
  id: "test_id",
  username: "test",
  role: "user"
}

const secret = process.env.JWT_SECRET

const options = {
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE
}

let user_tokens: ReturnType<typeof generate_tokens>

const refresh_token_key = gen_refresh_token_key(user)

test("generate access token", () => {
  const token = generate_access_token(user)

  expect(jwt.verify(token, `${secret}`, options)).toMatchObject(user)
})

test("generate refresh token", () => {
  const token = generate_refresh_token(user)

  expect(jwt.verify(token, `${secret}`, options)).toMatchObject(user)
})

test("generate all tokens", () => {
  const tokens = generate_tokens(user)

  user_tokens = tokens

  expect(tokens).toMatchObject({ access_token: expect.anything(), refresh_token: expect.anything() })
  expect(jwt.verify(tokens.access_token, `${secret}`, options)).toMatchObject(user)
  expect(jwt.verify(tokens.refresh_token, `${secret}`, options)).toMatchObject(user)
})

test("store tokens in redis", async () => {
  await store_user_data(user, user_tokens)

  const hash_data = await client.hGetAll(refresh_token_key)

  expect(hash_data).toBeDefined()

  expect(hash_data.refresh_token).toBeDefined()
  expect(hash_data.refresh_token).toStrictEqual(user_tokens.refresh_token)
  expect(hash_data.role).toStrictEqual(user.role)
})

