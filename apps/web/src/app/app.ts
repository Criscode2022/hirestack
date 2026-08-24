import { Component, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { AuthStore } from './core/auth.store';
import { PlatformService } from './core/platform.service';
import { ToastService } from './core/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toolbar, ToolbarWidget],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly auth = inject(AuthStore);
  readonly platform = inject(PlatformService);
  readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  readonly theme = signal<'light' | 'dark'>('light');
  readonly search = signal('');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('hs-theme');
      const next = stored === 'dark' || stored === 'light' ? stored : 'light';
      this.theme.set(next);
      document.documentElement.dataset['theme'] = next;
      window.addEventListener('keydown', (event) => {
        if (
          event.key === '/' &&
          !(event.target instanceof HTMLInputElement) &&
          !(event.target instanceof HTMLTextAreaElement)
        ) {
          event.preventDefault();
          document.getElementById('global-search')?.focus();
        }
      });
    }
    effect(() => {
      if (this.auth.ready() && this.auth.isAuthenticated()) {
        void this.platform.refreshBadges();
        if (this.auth.hasRole('CANDIDATE')) {
          void this.platform.loadSavedJobs();
        }
      }
    });
  }

  toggleTheme(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.dataset['theme'] = next;
      localStorage.setItem('hs-theme', next);
    }
  }

  goSearch(event: Event) {
    event.preventDefault();
    const q = this.search().trim();
    void this.router.navigate(['/search'], { queryParams: q ? { q } : {} });
  }
}
