import type { RequestUser } from '../common/types/request-user';

declare module 'express-serve-static-core' {
  interface Request {
    user?: RequestUser;
    cookies?: Record<string, string>;
  }
}
