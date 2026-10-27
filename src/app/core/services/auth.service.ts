import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { CaptchaResponse, LoginRequest, LoginResponse } from '../models/auth.model';

export const TOKEN_STORAGE_KEY = 'idi_access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(sessionStorage.getItem(TOKEN_STORAGE_KEY));
  readonly isAuthenticated = computed(() => !!this._token());

  loadCaptcha(): Observable<CaptchaResponse> {
    return this.api.get<CaptchaResponse>('/api/auth/login');
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/api/auth/login', request).pipe(
      tap((res) => this.setToken(res.access_token)),
    );
  }

  logout(): void {
    this._token.set(null);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    this.router.navigateByUrl('/login');
  }

  private setToken(token: string): void {
    this._token.set(token);
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}