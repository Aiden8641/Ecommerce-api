import { Request, Response } from "express"
import { get_product } from "../middleware/product"
import sql from "../db/postgres/postgres"

export const getProductByIdController = async (req: Request, res: Response) => {
  try {
    const { product_id } = req.params
    const product = await get_product(product_id)

    res.status(200).json({ message: "Successfully retrieved product!", data: product })
  } catch (error) {
    res.status(500).json({ message: "Error retrieving product by id" })
  }
}

export const getProductsController = async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = req.query

    if (!page || !pageSize) {
      return res.status(400).json({ message: "Please provide a value for page and page size!" })
    }

    const pageAsInt = parseInt(page as string)
    const pageSizeAsInt = parseInt(pageSize as string)

    if (
      isNaN(pageAsInt) || isNaN(pageSizeAsInt) ||
      pageAsInt < 1 || pageSizeAsInt < 1
    ) {
      return res.status(400).json({ message: "Invalid pagination values." });
    }

    const offset = (pageAsInt - 1) * pageSizeAsInt

    const products = await sql`
      select * from products 
      limit ${pageSizeAsInt}
      offset ${offset}
    `

    return res.status(200).json({
      data: products,
      meta: {
        page: pageAsInt, pageSize: pageSizeAsInt, totalItems: products.length
      }
    })
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving products" })
  }

}
export const searchProductController = async (req: Request, res: Response) => {
  try {
    const { name, page, pageSize } = req.query

    if (!name || typeof name != "string") {
      return res.status(400).json({ message: "Missing or invalid search term." });
    }

    const pageSizeAsInt = parseInt(pageSize as string)
    const pageAsInt = parseInt(page as string)
    const defaultPage = 1
    const defaultPageSize = 10
    const limit = isNaN(pageSizeAsInt) ? defaultPageSize : pageSizeAsInt
    const offset = ((isNaN(pageAsInt) ? defaultPage : pageAsInt) - 1) * limit


    const products = await sql`
      select * from products
      where name ilike ${"%" + name + "%"}
      limit ${limit}
      offset ${offset}
  `

    return res.status(200).json({ data: products })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Something went wrong when searching for products" })
  }
}

export const addProductController = (req: Request, res: Response) => {
  try {
    res.status(200).json({ message: "Successfully posted products!" })
  } catch (error) {
    res.status(500).json({ message: "Error posting products" })
  }
}

export const updateProductController = (req: Request, res: Response) => {
  try {
    res.status(200).json({ message: "Successfully updated products!" })
  } catch (error) {
    res.status(500).json({ message: "Error posting products" })
  }
}

export const deleteProductController = (req: Request, res: Response) => {
  try {
    res.status(200).json({ message: "Successfully deleted products!" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting products" })
  }
}
