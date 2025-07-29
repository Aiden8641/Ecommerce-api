import { Router } from "express";
import Stripe from "stripe";
import { configDotenv } from "dotenv";
import { get_cached_cart } from "../middleware/cart";
import { gen_cart_key } from "../db/redis/key_gen";
import { cart_items } from "../middleware/cart";

configDotenv()

const stripe = new Stripe(`${process.env.STRIPE_API_KEY}`)
const router = Router()

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { user_id } = req.body

    if (!user_id) {
      return res.status(400).json({ message: "Missing user_id in request body." });
    }

    const key = gen_cart_key(user_id);
    const cart = await get_cached_cart(key);

    if (!cart || Object.keys(cart).length === 0) {
      return res.status(400).json({ message: "Cart is empty or missing." });
    }

    const cart_array = Object.entries(cart)
    const line_items = cart_array.map(([key, item]: [string, unknown]) => {
      const cart_items = item as cart_items

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: cart_items.name,
          },
          unit_amount: Math.round(parseFloat(cart_items.price as unknown as string) * 100),
        },
        quantity: parseInt(cart_items.quantity as unknown as string),
      }
    })


    const session = await stripe.checkout.sessions.create({
      line_items: line_items, mode: 'payment',
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    });

    res.redirect(303, session.url!);

  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ message: "Failed to create checkout session." });
  }
});

export default router
