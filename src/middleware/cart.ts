import { NextFunction, Request, Response } from "express";
import { products } from "../../@types/postgres";
import sql from "../db/postgres/postgres";
import { client } from "../db/redis/redis";
import { gen_cart_key } from "../db/redis/key_gen";
import { get_cached_product, get_product } from "./product";

export interface cart_items extends products {
  quantity: number
}

// Redis stuff
export const cache_cart = async (key: string, cart: cart_items[]) => {
  const json_cart = cart.map((e) => [e.id, JSON.stringify(e)])
  await client.hSet(key, Object.fromEntries(json_cart))

  return
}

export const get_cached_cart = async (key: string) => {
  const cart = await client.hGetAll(key)

  return cart
}

export const add_item_to_cached_cart = async (key: string, cart_item: cart_items) => {
  await client.hSet(key, { [cart_item.id.toString()]: JSON.stringify(cart_item) })

  return
}

export const delete_item_from_cached_cart = async (key: string, product_id: string) => {
  await client.hDel(key, product_id)

  return
}

// Postgres stuff
export const save_cart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.params
    const key = gen_cart_key(user_id)
    const cart = await get_cached_cart(key)


    if (!cart) {
      return next()
    }

    const cart_array = Object.entries(cart)
    const items_in_cart = cart_array.map(([key, item]: [string, unknown]) => {
      const cart_item = item as cart_items
      return { user_id: user_id, product_id: cart_item.id, quantity: cart_item.quantity }
    })

    // do not want to do a for loop as that would be multiple trips to the db and would take longer
    await sql`
      insert into carts ${sql(items_in_cart, 'user_id', 'product_id', 'quantity',)}
    `
    await client.del(key)

    return next()
  } catch (error) {
    console.error("Failed to save cart:", error)
    res.status(500).json({ message: "Something went wrong while trying to save the cart!" })
  }
}

export const get_saved_cart = async (user_id: string | number) => {
  const cart_items: cart_items[] = await sql`
    select carts.*, products.name, products.price from carts 
    join products 
      on products.id = carts.product_id
    where user_id = ${user_id}
`

  return cart_items
}

// middlewares
export const load_cart_to_cache = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.params
    const key = gen_cart_key(user_id)
    const cart = get_cached_cart(key)

    if (cart) {
      res.locals.cart = cart
      return next()
    }

    const saved_cart = await get_saved_cart(user_id)

    await cache_cart(key, saved_cart)

    res.locals.cart = saved_cart
    return next()
  } catch (error) {
    return next(error)
  }
}

export const verify_item_exists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product_id = (req.body as cart_items).id

    const cached_product = await get_cached_product(product_id)

    if (cached_product) {
      return next()
    }

    const product = await get_product(product_id)

    if (!product) {
      return res.status(400).json({ message: "Product with that id doesn't exist!" })
    }

    return next()
  } catch (error) {
    return next(error)
  }
}

export const add_item_to_cart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.params
    const key = gen_cart_key(user_id)

    const cart_item = req.body as cart_items

    await add_item_to_cached_cart(key, cart_item)

    return next()
  } catch (error) {
    return next(error)
  }
}

export const delete_cart_item = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, item_id } = req.params
    const key = gen_cart_key(user_id)
    await delete_item_from_cached_cart(key, item_id)

    return next()
  } catch (error) {
    return next(error)
  }
}
