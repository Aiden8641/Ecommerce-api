export interface users {
  id: string | number
  username: string
  password: string
  role: "user" | "admin"
}

export type safe_user = Omit<users, "password">

export type products = {
  id: string | number;
  name: string;
  description: string;
  price: number;
  discount_price: number | null;
  stock: number;
  category?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

