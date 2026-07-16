import { apiRequest } from '../lib/apiClient';

export interface MeResponse {
  user: {
    id: string;
    email: string | null;
  };
  accountSettings: Record<string, unknown>;
  profiles: unknown[];
}

export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/v1/me');
}
