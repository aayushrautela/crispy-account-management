export interface Profile {
  id: string;
  name: string;
  avatarKey: string | null;
  interfaceLanguage: string;
  region: string | null;
  isKids: boolean;
  sortOrder: number;
  createdByAccountId: string | null;
  createdAt: string;
  updatedAt: string | null;
  lastActiveAt: string | null;
}
