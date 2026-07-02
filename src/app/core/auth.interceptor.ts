import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  if (request.url.includes('/api/auth/')) {
    return next(request);
  }

  const token = auth.token;
  const authRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap(() => {
          const refreshedToken = auth.token;
          const retryRequest = refreshedToken
            ? request.clone({ setHeaders: { Authorization: `Bearer ${refreshedToken}` } })
            : request;
          return next(retryRequest);
        }),
      );
    }),
  );
};
