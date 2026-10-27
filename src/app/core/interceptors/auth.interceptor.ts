import { HttpInterceptorFn } from '@angular/common/http';
import { TOKEN_STORAGE_KEY } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  const request = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return next(request);
};