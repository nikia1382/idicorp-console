import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environment';
import { toAppError } from '../utils/http-error';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

function toHttpParams(params?: QueryParams): HttpParams {
  let httpParams = new HttpParams();
  if (!params) return httpParams;
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  }
  return httpParams;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http
      .get<T>(this.base + path, { params: toHttpParams(params) })
      .pipe(catchError((e) => throwError(() => toAppError(e))));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(this.base + path, body)
      .pipe(catchError((e) => throwError(() => toAppError(e))));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<T>(this.base + path, body)
      .pipe(catchError((e) => throwError(() => toAppError(e))));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .patch<T>(this.base + path, body)
      .pipe(catchError((e) => throwError(() => toAppError(e))));
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http
      .delete<T>(this.base + path)
      .pipe(catchError((e) => throwError(() => toAppError(e))));
  }
}