import { apiClient } from '@/src/lib/api-client';
import type { LoginCredentials, User } from '../types';

type LoginResponse = {
  user: User;
  token: string;
};

export function login(credentials: LoginCredentials) {
  return apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });
}
