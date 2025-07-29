import { Request, Response } from "express"
import { get_cached_cart } from "../middleware/cart"
import { gen_cart_key } from "../db/redis/key_gen"

export const getCartController = async (req: Request, res: Response) => {
  try {
    // const cart = res.locals.cart
    const { user_id } = req.params
    const key = gen_cart_key(user_id)
    const cart = await get_cached_cart(key)

    return res.status(200).json({ message: "Successfully retreived cart!", data: cart })
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong when retreiving cart!" })
  }
}

export const addCartItemController = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({ message: "Successfully added item to cart!" })
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong adding item to cart!" })
  }
}

export const deleteCartItemController = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({ message: "Successfully deleted item from cart!" })
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong when deleteing item from cart!" })
  }

}
