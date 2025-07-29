import { NextFunction, Request, Response, Router } from "express";
import { safe_user } from "../../@types/postgres";
import { addProductController, deleteProductController, getProductByIdController, getProductsController, searchProductController, updateProductController } from "../controllers/products";
import { delete_product, post_product, update_product } from "../middleware/product";

const router = Router()

router.get("/products/search", searchProductController)

router.get("/products", getProductsController)

router.get("/products/:product_id", getProductByIdController)

const adminRouter = Router()
adminRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as safe_user

    if (user.role != "admin") {
      res.status(400).json({ message: "User is not authorized to access resource" })
    }

    return next()
  } catch (error) {
    return next(error)
  }
})

adminRouter.post("/products", post_product, addProductController)

adminRouter.patch("/products", update_product, updateProductController)

adminRouter.delete("/products/:product_id", delete_product, deleteProductController)

router.use(adminRouter)

export default router
