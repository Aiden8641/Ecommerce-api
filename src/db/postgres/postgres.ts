import postgres from 'postgres'
import { configDotenv } from 'dotenv'

configDotenv()

const connectionString = process.env.DATABASE_URL
const sql = postgres(`${connectionString}`)

export default sql
