
export interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  info: string;
  category: string;
  description: string;
  link?: string;
  stock?: number;
  seller_id?: string;
}

export interface Profile {
  id: string; // user id
  username: string;
  avatar_url: string | null;
}

export interface Rating {
  id: number;
  created_at: string;
  user_id: string;
  product_id: number | null;
  rated_seller_id: string | null;
  rating: number;
  comment: string | null;
  image_url: string | null;
  profiles: Pick<Profile, 'username' | 'avatar_url'> | null;
}
