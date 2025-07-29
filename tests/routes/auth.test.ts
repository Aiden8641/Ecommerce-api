import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { safe_user, users } from "../../@types/postgres";
import app from "../../src/app";
import { gen_refresh_token_key } from "../../src/db/redis/key_gen";
import { client } from "../../src/db/redis/redis";
import { generate_refresh_token, generate_tokens, store_user_data } from "../../src/middleware/auth";
import { get_user_by_username } from "../../src/middleware/user";
import { cleanup_dbs, payload } from "../var";

let refresh_token: string
let user: users

const username = payload.username
const password = payload.password

const generate_cookie = (key: string, value: any) => {
  return `${key}=${value}`
}

async function expect_refresh_token_response(response: any) {
  const cookies = response.headers["set-cookie"] as unknown as string[]

  expect(cookies).toBeDefined()
  expect(cookies.length).toBeGreaterThan(0)

  const refresh_token_cookie = cookies.find((cookie: any) => {
    return cookie.startsWith("refresh_token")
  })

  expect(refresh_token_cookie).toBeDefined()
  expect(refresh_token_cookie).toContain("HttpOnly")
  expect(refresh_token_cookie).toContain("Secure")
  expect(refresh_token_cookie).toContain("SameSite=Strict")
  expect(refresh_token_cookie).toContain(`Max-Age=${30 * 24 * 60 * 60}`)

  const json: {
    message: string, data: {
      access_token: string,
      user: safe_user
    }
  } = await response.body

  expect(json.message).toBeDefined()
  expect(json.data).toBeDefined()
  expect(json.data.access_token).toBeDefined()
  expect(json.data.user).toBeDefined()

  const user = json.data.user

  const key = gen_refresh_token_key(user.id)
  const cached_token = await client.hGetAll(key)

  expect(cached_token).toBeDefined()
}

const wait = async (delay: number) => {
  await new Promise((resolve) => {
    setTimeout(resolve, delay)
  })
}


afterAll(async () => {
  await cleanup_dbs()
})

describe("signup", () => {
  test("signup new user", async () => {
    const response = await request(app).post("/signup").send({ username: username, password: password }).set("Accept", "application/json")

    await expect_refresh_token_response(response)

    expect(response.status).toBe(200)
  })

  test("signup username already taken", async () => {
    const response = await request(app).post("/signup").send({ username: username, password: password }).set("Accept", "application/json")

    expect(response.status).toBe(500)
  })
})

describe("login", () => {
  test("login user", async () => {
    const response = await request(app).post("/login").send({ username: username, password: password }).set("Accept", "application/json")

    await expect_refresh_token_response(response)

    expect(response.status).toBe(200)
  })

  test("login with wrong password", async () => {
    const response = await request(app).post("/login").send({ username: username, password: "wrong_password" }).set("Accept", "application/json")

    expect(response.status).toBe(404)
    expect(response.body.message).toBe("Username or Password is incorrect!")
  })
})

describe("refresh", () => {
  beforeAll(async () => {
    const retrieve_test_user: safe_user = await get_user_by_username(username)

    user = retrieve_test_user as users

    const tokens = generate_tokens(user)

    refresh_token = tokens.refresh_token

    await store_user_data(user, tokens)
  })

  test("refresh with cookie", async () => {
    const response = await request(app).post("/refresh").set("Cookie", generate_cookie("refresh_token", refresh_token))

    await expect_refresh_token_response(response)

    expect(response.status).toBe(200)
  })

  test("refresh with no token set", async () => {
    const response = await request(app).post("/refresh")

    expect(response.status).toBe(401)
  })

  test("refresh, token doesn't match cached token", async () => {
    // need to generate a different jwt if time between jwt generations are by too close it becomes the same jwt
    await wait(1000)

    const old_token = generate_refresh_token(user)

    const response = await request(app).post("/refresh").set("Cookie", generate_cookie("refresh_token", old_token))

    expect(response.status).toBe(401)
  })

  test("refresh, token not found in cache", async () => {
    const key = gen_refresh_token_key(user.id)
    await client.del(key)

    const response = await request(app).post("/refresh").set("Cookie", generate_cookie("refresh_token", refresh_token))

    expect(response.status).toBe(401)
  })
})

describe("logout", () => {
  test("logout", async () => {
    const response = await request(app).post("/logout").set("Cookie", generate_cookie("refresh_token", refresh_token))

    const cookies = response.headers["set-cookie"] as unknown as string[]

    const refresh_token_cookie = cookies.find((cookie: any) => {
      return cookie.startsWith("refresh_token")
    })

    const key = gen_refresh_token_key(user.id)
    const cached_token = await client.hGetAll(key)

    expect(cached_token).toEqual({})

    expect(refresh_token_cookie).toBeDefined()

    expect(refresh_token_cookie).toContain("refresh_token=;")
    expect(refresh_token_cookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT;")
    expect(response.status).toBe(200)
  })

  test("logout with no refresh_token", async () => {
    const response = await request(app).post("/logout")

    expect(response.headers).not.toContain("set-cookie")
    expect(response.status).toBe(204)
  })
})
