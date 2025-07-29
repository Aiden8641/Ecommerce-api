import { NextFunction, Request, Response } from "express"
import { products } from "../../@types/postgres"
import sql from "../db/postgres/postgres"
import { gen_product_key } from "../db/redis/key_gen"
import { client } from "../db/redis/redis"
import { PostgresError } from "postgres"
import { ProgramUpdateLevel } from "typescript"

export const cache_product = async (product: products) => {
  const key = gen_product_key(product.id)
  await client.set(key, JSON.stringify(product))
  await client.expire(key, 24 * 60 * 60)
}

export const get_cached_product = async (product_id: string | number) => {
  const product = await client.get(`${product_id}`)

  return product
}

export const get_product = async (product_id: string | number) => {
  const cached_product = await get_cached_product(product_id)

  if (cached_product) {
    return cached_product
  }

  const [product]: [products] = await sql`
      select * from products
      where id = ${product_id};
    `

  if (!product) {
    return false
  }

  await cache_product(product)

  return product
}

export const post_product = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body || !req.body.product) {
      return res.status(400).json({ message: "Missing product! " });
    }

    const product = req.body.product as products

    if (!product.name || !product.description || !product.price || !product.stock) {
      return res.status(422).json({ message: "Missing required fields." });
    }


    await sql`
      insert into products (
        name, description, price, discount_price, stock, category,
        image_url, is_active, created_at, updated_at 
      ) values (
        ${product.name},
        ${product.description},
        ${product.price},
        ${product.discount_price ?? null},
        ${product.stock}, 
        ${product.category ?? null},
        ${product.image_url ?? null},
        ${product.is_active ?? true}, 
        now(),
        now()
      )
    `

    return next()
  } catch (error) {
    console.log(error)
    return next(error)
  }
}

export const update_product = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body || !req.body.product) {
      return res.status(400).json({ message: "Missing product! " });
    }

    const product = req.body.product as products

    if (!product.id || !product.name || !product.description || !product.price || !product.stock) {
      return res.status(422).json({ message: "Missing required fields." });
    }

    const updated_product = await sql`
      update products 
      set
        name = ${product.name} ,
        description = ${product.description},
        price = ${product.price},
        discount_price = ${product.discount_price ?? null},
        stock = ${product.stock},
        category = ${product.category ?? null}, 
        image_url = ${product.image_url ?? null},
        updated_at = now()
      where id = ${product.id}
      returning *;
    `

    if (updated_product.length === 0) {
      return res.status(500).json({ message: "No product found, update canceled!" })
    }

    return next()
  } catch (error) {
    console.log(error)
    return next(error)
  }
}

export const delete_product = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product_id } = req.params

    const result = await sql`
      delete from products 
      where id = ${product_id}
    `

    if (result.count === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return next()
  } catch (error) {
    return next(error)
  }
}

