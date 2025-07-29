export const gen_refresh_token_key = (user_id: string | number) => {
  return `refresh_tokens:${user_id}`
}

export const gen_product_key = (product_id: string | number) => {
  return `products:${product_id}`
}

export const gen_user_key = (user_id: string | number) => {
  return `users:${user_id}`
}

export const gen_cart_key = (user_id: string | number) => {
  return `${gen_user_key(user_id)}:carts`
}


