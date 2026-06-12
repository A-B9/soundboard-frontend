import { apiFetch } from './client';
import type { LoginResponse } from './types';

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/user/login', {
    method: 'POST',
    body: { username, password },
    anonymous: true,
  });
}
