import { Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { filter } from 'rxjs';
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
  readonly menuOpen = signal(false);
  readonly shell = computed(() => (this.auth.isAuthenticated() ? 'app' : 'marketing'));

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('hs-theme');
      const next = stored === 'dark' || stored === 'light' ? stored : 'light';
      this.theme.set(next);
      document.documentElement.dataset['theme'] = next;
      window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.closeMenu();
        }
        if (
          event.key === '/' &&
          !(event.target instanceof HTMLInputElement) &&
          !(event.target instanceof HTMLTextAreaElement)
        ) {
          event.preventDefault();
          document.getElementById('global-search')?.focus();
        }
      });
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
        this.closeMenu();
      });
    }
    effect(() => {
      if (this.auth.ready() && this.auth.isAuthenticated()) {
        void this.platform.refreshBadges();
        if (this.auth.hasRole('CANDIDATE')) {
          void this.platform.loadSavedJobs();
        }
        if (this.auth.hasRole('EMPLOYER')) {
          void this.platform.refreshWorkspace();
        }
      }
    });
  }

  mobileLinks() {
    const count = (value: number) => () => value;
    const links = [
      { path: '/jobs', label: 'Jobs', count: count(0) },
      { path: '/people', label: 'People', count: count(this.platform.pendingRequests()) },
      { path: '/companies', label: 'Companies', count: count(0) },
      { path: '/pricing', label: 'Pricing', count: count(0) },
      { path: '/live', label: 'Live', count: count(0) },
    ];
    if (this.auth.isAuthenticated()) {
      links.unshift({ path: '/feed', label: 'Home', count: count(0) });
      links.push(
        { path: '/messages', label: 'Messages', count: count(this.platform.unreadMessages()) },
        { path: '/notifications', label: 'Alerts', count: count(this.platform.unreadNotifications()) },
      );
    }
    if (this.auth.hasRole('CANDIDATE')) {
      links.push(
        { path: '/applications', label: 'Applications', count: count(0) },
        { path: '/saved', label: 'Saved', count: count(0) },
        { path: '/profile', label: 'Profile', count: count(0) },
      );
    }
    if (this.auth.hasRole('EMPLOYER')) {
      links.push(
        { path: '/employer', label: 'Hiring', count: count(0) },
        { path: '/employer/billing', label: 'Billing', count: count(0) },
      );
    }
    if (this.auth.hasRole('ADMIN')) {
      links.push({ path: '/admin', label: 'Admin', count: count(0) });
    }
    links.push({ path: '/settings', label: 'Settings', count: count(0) });
    return links;
  }

  toggleMenu(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
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
    this.closeMenu();
    const q = this.search().trim();
    void this.router.navigate(['/search'], { queryParams: q ? { q } : {} });
  }
}
