import { computed, inject, PLATFORM_ID, signal, Service } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import type { AuthUser, UserRole } from '@hirestack/shared';
import { environment } from '../../environments/environment';
import { ToastService } from './toast.service';
import { PlatformService } from './platform.service';

interface SessionResponse {
  accessToken: string;
  user: AuthUser;
}

@Service()
export class AuthStore {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly platform = inject(PlatformService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly user = signal<AuthUser | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly ready = signal(false);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly role = computed(() => this.user()?.role ?? null);

  hasRole(...roles: UserRole[]) {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  async bootstrap() {
    if (!isPlatformBrowser(this.platformId)) {
      this.ready.set(true);
      return;
    }
    try {
      const session = await firstValueFrom(
        this.http.post<SessionResponse>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true }),
      );
      this.setSession(session);
    } catch {
      this.clear();
    } finally {
      this.ready.set(true);
    }
  }

  async login(email: string, password: string) {
    const session = await firstValueFrom(
      this.http.post<SessionResponse>(`${environment.apiUrl}/auth/login`, { email, password }, { withCredentials: true }),
    );
    this.setSession(session);
    this.toast.show(`Welcome back, ${session.user.name}`, 'success');
    return session.user;
  }

  async register(payload: { email: string; password: string; name: string; role: 'CANDIDATE' | 'EMPLOYER' }) {
    const session = await firstValueFrom(
      this.http.post<SessionResponse>(`${environment.apiUrl}/auth/register`, payload, { withCredentials: true }),
    );
    this.setSession(session);
    this.toast.show('Account created', 'success');
    return session.user;
  }

  async logout() {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }),
    ).catch(() => undefined);
    this.clear();
    await this.router.navigateByUrl('/');
  }

  async refresh(): Promise<string | null> {
    try {
      const session = await firstValueFrom(
        this.http.post<SessionResponse>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true }),
      );
      this.setSession(session);
      return session.accessToken;
    } catch {
      this.clear();
      return null;
    }
  }

  setSession(session: SessionResponse) {
    this.accessToken.set(session.accessToken);
    this.user.set(session.user);
  }

  private clear() {
    this.accessToken.set(null);
    this.user.set(null);
    this.platform.invalidateCache();
  }
}
