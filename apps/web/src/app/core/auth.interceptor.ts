import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthStore } from './auth.store';
import { featuredOverlayHeaders } from './featured-overlay';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const isApi = req.url.startsWith(environment.apiUrl);
  const isRefresh = req.url.includes('/auth/refresh');
  const token = auth.accessToken();
  const overlayHeaders = isApi ? featuredOverlayHeaders() : {};
  const cloned = isApi
    ? req.clone({
        withCredentials: true,
        setHeaders: {
          ...overlayHeaders,
          ...(token && !isRefresh ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
    : req;

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isApi || isRefresh || error.status !== 401) {
        return throwError(() => error);
      }
      return from(auth.refresh()).pipe(
        switchMap((nextToken) => {
          if (!nextToken) {
            return throwError(() => error);
          }
          return next(
            req.clone({
              withCredentials: true,
              setHeaders: {
                ...featuredOverlayHeaders(),
                Authorization: `Bearer ${nextToken}`,
              },
            }),
          );
        }),
      );
    }),
  );
};
