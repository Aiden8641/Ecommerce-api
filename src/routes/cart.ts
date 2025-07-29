import { Router } from "express";
import { addCartItemController, deleteCartItemController, getCartController } from "../controllers/cart";
import { add_item_to_cart, delete_cart_item, load_cart_to_cache, verify_item_exists } from "../middleware/cart";
import { verify_user } from "../middleware/auth";

const router = Router()

router.use(verify_user)

router.get("/users/:user_id/cart", getCartController)

router.post("/users/:user_id/cart", verify_item_exists, add_item_to_cart, addCartItemController)

router.delete("/users/:user_id/cart/items/:item_id", delete_cart_item, deleteCartItemController)



export default router
