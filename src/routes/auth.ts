import bcrypt from "bcrypt";
import { configDotenv } from "dotenv";
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { PostgresError } from "postgres";
import { safe_user, users } from "../../@types/postgres";
import sql from "../db/postgres/postgres";
import { gen_refresh_token_key } from "../db/redis/key_gen";
import { generate_tokens, store_user_data } from "../middleware/auth";
import { client } from "../db/redis/redis";
import { sanitizeUserData } from "../middleware/user";

configDotenv()

const router = Router()


const handle_token_response = async (res: Response, safe_user: safe_user) => {
  const tokens = generate_tokens(safe_user)

  await store_user_data(safe_user, tokens)

  res.status(200).cookie("refresh_token", tokens.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000
  }).json({
    message: "User successfully logged in!", data: {
      access_token: tokens.access_token, user: safe_user as safe_user
    }
  })
}

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    const [user]: [users] = await sql`
      select * from users 
      where username = ${username};
    `

    const verifyPassword = await bcrypt.compare(password, `${user.password}`)

    if (!verifyPassword) {
      res.status(404).json({ message: "Username or Password is incorrect!" })
      return
    }

    const safe_user = sanitizeUserData(user)

    await handle_token_response(res, safe_user)
  } catch (error) {
    res.status(500).json({ message: "Something went wrong while trying to login! Please try again later!" })
  }
})

router.post("/logout", async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.cookies

    if (!refresh_token) {
      res.status(204).json({ message: "Already logged out!" })
      return
    }

    const decode = jwt.verify(refresh_token, `${process.env.JWT_SECRET}`, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    })

    const user = decode as safe_user

    const refresh_token_key = gen_refresh_token_key(user.id)

    await client.del(refresh_token_key)

    res.clearCookie("refresh_token", { httpOnly: true, secure: true, sameSite: "strict" }).status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong while trying to logout! Please try again later!" })
  }

})
// signup
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({ message: "Please provide a username and password!" })
      return
    }
    //TODO make sure that username doens't already exists
    const [existing_user]: [users] = await sql`
      select * from users
      where username = ${username};
    `

    if (existing_user) {
      res.status(500).json({ message: "Username already in use try a different name!" })
      return
    }

    const saltsOrRounds = 10

    const hashed_password = await bcrypt.hash(`${password}`, saltsOrRounds)

    const [user]: [users] = await sql`
      insert into users (username, password)
      values (${username}, ${hashed_password})
      returning *;
    `

    const safe_user: safe_user = sanitizeUserData(user)

    await handle_token_response(res, safe_user)
  } catch (error) {
    if (error instanceof PostgresError && error.code === '23505') {

      res.status(500).json({ message: "Username already in use try a different name!" })
    }

    res.status(500).json({ message: "Something went wrong while signing up! Please try again later!" })
  }
})

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.cookies

    if (!refresh_token) {
      res.status(401).json("No refresh token provided!")
      return
    }

    const decode = jwt.verify(refresh_token, `${process.env.JWT_SECRET}`, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    })

    const user = decode as safe_user

    const refresh_token_key = gen_refresh_token_key(user.id)

    const cached_refresh_token = await client.hGet(refresh_token_key, "refresh_token")

    if (!cached_refresh_token || cached_refresh_token != refresh_token) {
      res.status(401).json({ message: "Invalid tokens!" })
      return
    }

    await handle_token_response(res, { id: user.id, username: user.username, role: user.role })
  } catch (error) {
    console.log(error)
    res.status(400).json({ message: "Invalid tokens!" })
  }
})

export default router
