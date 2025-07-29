import { configDotenv } from "dotenv";
import jwt from "jsonwebtoken";
import passport from "passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import sql from "../db/postgres/postgres";
import { gen_refresh_token_key } from "../db/redis/key_gen";
import { safe_user } from "../../@types/postgres";
import { client } from "../db/redis/redis";
import { NextFunction, Request, Response } from "express";

configDotenv()

const jwtStrategy = new Strategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: `${process.env.JWT_SECRET}`,
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE
}, async (jwt_payload: any, done) => {
  try {
    const payload = jwt_payload as safe_user
    const user = await sql`
      select * from users 
      where id = ${payload.id}
    `

    if (!user) {
      return done(null, false)
    }

    return done(null, user)
  } catch (error) {
    console.log(error)

  }
})

passport.use(jwtStrategy)

export const generate_access_token = (payload: safe_user) => {
  return jwt.sign(payload, `${process.env.JWT_SECRET}`, {
    expiresIn: "15m",
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE
  })
}

export const generate_refresh_token = (payload: safe_user) => {
  return jwt.sign(payload, `${process.env.JWT_SECRET}`, {
    expiresIn: "30d", // if modifying this value make sure that cookies containing the refresh token also expire at the same time also make sure it expires in redis at the same time too
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE
  })
}

export const generate_tokens = (payload: safe_user) => {
  return { access_token: generate_access_token(payload), refresh_token: generate_refresh_token(payload) }
}

export const store_user_data = async (user: safe_user, tokens: ReturnType<typeof generate_tokens>) => {
  const refresh_token_key = gen_refresh_token_key(user.id)

  console.log(refresh_token_key)

  await client.hSet(refresh_token_key, {
    "refresh_token": tokens.refresh_token,
    "role": user.role
  })

  await client.expire(refresh_token_key, 30 * 24 * 60 * 60)

  return
}

export const verify_user = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as safe_user
    const { user_id } = req.params

    if (user.id != user_id) {
      return res.status(403).json({ message: "Forbidden: You are not allowed to make requests for another user." })
    }

    return next()
  } catch (error) {
    return next(error)
  }
}
