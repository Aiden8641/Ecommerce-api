import e from "express";
import { create_tables } from "./db/postgres/tables";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import auth from "./routes/auth";
import { connectRedis } from "./db/redis/redis";
import passport from "passport";
import cart from "./routes/cart";
import products from "./routes/products";
import payment from "./routes/payment";

const app = e()
const port = 3000

app.use(bodyParser.urlencoded())
app.use(bodyParser.json())

app.use(cookieParser())

app.use(auth)

app.use(passport.authenticate("jwt", { session: false }))

app.use(products)
app.use(payment)
app.use(cart)

app.listen(port, async () => {
  await create_tables()
  await connectRedis()
  console.log(`Running on port ${port}`)
})

export default app
