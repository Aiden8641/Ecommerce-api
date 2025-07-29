import { test, expect } from "vitest"
import { gen_refresh_token_key } from "../src/db/redis/key_gen"
import { safe_user } from "../@types/postgres"

const user: safe_user = {
  id: 1,
  username: "test",
  role: "user"
}

test("generate refresh token keys", () => {
  const key = gen_refresh_token_key(user.id)

  expect(key).toContain("refresh_tokens:1")
})
