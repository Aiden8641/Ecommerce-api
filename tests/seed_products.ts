import { faker } from "@faker-js/faker"
import sql from "../src/db/postgres/postgres"

const NUM_PRODUCTS = 100

const generateProduct = () => ({
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
  discount_price: Math.random() < 0.3 ? parseFloat(faker.commerce.price({ min: 5, max: 200 })) : null,
  stock: faker.number.int({ min: 0, max: 100 }),
  category: faker.commerce.department(),
  image_url: faker.image.url(),
  sku: faker.string.uuid(),
  is_active: true,
})

async function seedProducts() {
  const products = Array.from({ length: NUM_PRODUCTS }, generateProduct)

  await sql`
    insert into products ${sql(products,
    'name', 'description', 'price', 'discount_price', 'stock', 'category', 'image_url', 'sku', 'is_active')}
  `

  console.log(`✅ Inserted ${NUM_PRODUCTS} products.`)
  await sql.end()
}

seedProducts().catch(err => {
  console.error("❌ Failed to seed products:", err)
  process.exit(1)
})

