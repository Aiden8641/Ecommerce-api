import { users } from "../../@types/postgres"
import sql from "../db/postgres/postgres"

export function sanitizeUserData(user: users) {
  return { id: user.id, username: user.username, role: user.role }
}

export const get_user_by_username = async (username: string) => {
  const [user]: [users] = await sql`
    select * from users
    where username = ${username};
  `

  const safe_user = sanitizeUserData(user)

  return safe_user
}

export const get_user_by_id = async (id: string | number) => {
  const [user]: [users] = await sql`
    select * from users
    where id = ${id};
  `

  const safe_user = sanitizeUserData(user)

  return safe_user
}
