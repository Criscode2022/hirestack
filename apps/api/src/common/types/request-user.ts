import type { UserRole } from '@hirestack/shared';

export interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
}
