import request from "supertest";
import { afterAll, beforeAll, expect, suite, test } from "vitest";
import { products } from "../../@types/postgres";
import app from "../../src/app";
import sql from "../../src/db/postgres/postgres";
import { generate_tokens } from "../../src/middleware/auth";
import { cleanup_dbs, test_product, valid_jwt } from "../var";

let tokens: ReturnType<typeof generate_tokens>
let product: products

const create_get_request = async (url: string) => {
  return await request(app).get(url).set("Authorization", `bearer ${tokens.access_token}`)
}

const retrieve_product = async () => { return await sql`select * from products where name = ${test_product.product.name}` }

beforeAll(async () => {
  tokens = (await valid_jwt())

})

afterAll(async () => {
  await cleanup_dbs()
})

test("Search for product", async () => {
  // might need to change the search querry if the data is different because of the seeding
  const response = await create_get_request("/products/search?name=modern")

  expect(response.status).toBe(200)
  expect(response.body.data.length).greaterThan(0)
})

suite("pagination of products", () => {
  test("obtain first page of products", async () => {
    const response = await create_get_request("/products?page=1&pageSize=10")

    expect(response.status).toBe(200)

    expect(response.body.data.length).toEqual(10)
    expect(response.body.meta.page).toEqual(1)
    expect(response.body.meta.pageSize).toEqual(10)

    expect(response.body.data[0].id).toEqual(1)
  })

  test("obtain first page of products", async () => {
    const response = await create_get_request("/products?page=3&pageSize=10")

    expect(response.status).toBe(200)

    expect(response.body.data.length).toEqual(10)
    expect(response.body.meta.page).toEqual(3)
    expect(response.body.meta.pageSize).toEqual(10)

    expect(response.body.data[0].id).toEqual(21)
    expect(response.body.data[9].id).toEqual(30)
  })
})

test("get product by id", async () => {
  const response = await create_get_request("/products/1")

  expect(response.status).toBe(200)
  expect(response.body.data.id).toBe(1)
})

test("adding product, missing body", async () => {
  const response = await request(app).post("/products").set("Authorization", `bearer ${tokens.access_token}`)

  expect(response.status).toBe(400)
})

test("adding product, missing product in body", async () => {
  const response = await request(app).post("/products").send({ randomfield: { name: "alsdjf" } }).set("Authorization", `bearer ${tokens.access_token}`)

  expect(response.status).toBe(400)
})

test("adding product, missing required fields", async () => {
  const { name, ...remaining_fields } = test_product.product
  const response = await request(app).post("/products").send({ product: remaining_fields }).set("Authorization", `bearer ${tokens.access_token}`)

  expect(response.status).toBe(422)
})

test("adding a new product", async () => {
  const response = await request(app).post("/products").send(test_product).set("Authorization", `bearer ${tokens.access_token}`)

  expect(response.body.message).toBeDefined()

  const product = await retrieve_product()

  expect(product[0]).toMatchObject(test_product.product)
})

suite("update product", async () => {
  beforeAll(async () => {
    const [retrieve_product]: [products] = await sql`
      select * from products
      where name = ${test_product.product.name}
    `

    product = retrieve_product
  })

  test("missing product", async () => {
    const response = await request(app).patch(`/products`)
      .set("Authorization", `bearer ${tokens.access_token}`)

    expect(response.status).toBe(400)
  })

  test("missing product id", async () => {
    const mutatable_product = structuredClone(product)

    mutatable_product.id = ""

    const response = await request(app).patch(`/products`).send({ product: mutatable_product })
      .set("Authorization", `bearer ${tokens.access_token}`)

    expect(response.status).toBe(422)
  })

  test("no product found", async () => {
    const mutatable_product = structuredClone(product)

    mutatable_product.id = "9999"

    const response = await request(app).patch(`/products`).send({ product: mutatable_product })
      .set("Authorization", `bearer ${tokens.access_token}`)

    expect(response.status).toBe(500)
    expect(response.body.message).toBe("No product found, update canceled!")
  })

  test("correct request", async () => {
    const mutatable_product = structuredClone(product)
    // change product description as the clean up function deletes by name
    mutatable_product.description = "Product description changed"

    const response = await request(app).patch(`/products`).send({
      product: mutatable_product
    }).set("Authorization", `bearer ${tokens.access_token}`)

    expect(response.status).toBe(200)

    const [updated_product]: [products] = await sql`
      select * from products
      where name = ${test_product.product.name}
    `

    expect(updated_product.description).toBe("Product description changed")
  })
})

suite("delete product", async () => {
  beforeAll(async () => {
    const [retrieve_product]: [products] = await sql`
      select * from products
      where name = ${test_product.product.name}
    `

    product = retrieve_product
  })

  test("No product found", async () => {
    const mutatable_product = structuredClone(product)

    mutatable_product.id = "9999"

    const response = await request(app).delete(`/products/${mutatable_product.id}`).send({
      product: mutatable_product
    }).set("Authorization", `bearer ${tokens.access_token}`)

    expect(response.status).toBe(404)
  })

  test("valid id", async () => {
    const response = await request(app).delete(`/products/${product.id}`).send({
      product: product
    }).set("Authorization", `bearer ${tokens.access_token}`)

    expect(response.status).toBe(200)
  })
})
