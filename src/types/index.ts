export interface Profile {
  id: string;
  account_id: string;
  name: string;
  avatar: string | null;
  order_index: number;
  last_active_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email?: string;
}
