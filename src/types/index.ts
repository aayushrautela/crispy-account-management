export interface Profile {
  id: string;
  account_id: string;
  name: string;
  avatar: string | null;
  order_index: number;
  created_at?: string;
}

export interface User {
  id: string;
  email?: string;
}
