import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlatformService } from '../../core/platform.service';
import { EmptyState, Skeleton } from '../../shared/ui';
import { timeAgo } from '../../shared/time';
import { humanizeLabel, type NotificationItem } from '@hirestack/shared';

@Component({
  selector: 'hs-notifications',
  imports: [RouterLink, EmptyState, Skeleton],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Alerts</p>
        <h1>Notifications</h1>
      </div>
      <button type="button" class="ghost" (click)="readAll()">Mark all read</button>
    </header>
    @if (loading()) {
      <hs-skeleton />
    } @else if (error()) {
      <hs-empty-state title="Could not load alerts" message="Sign in again, then retry." />
    } @else if (!items().length) {
      <hs-empty-state title="You are caught up" message="Applications, messages, and connection requests land here." />
    } @else {
      @if (offerAlerts().length) {
        <section class="card review-call offer-call">
          <h2>{{ offerAlerts().length === 1 ? '1 offer update' : offerAlerts().length + ' offer updates' }}</h2>
          <p class="muted">Accept or decline from Applications. Hiring-lead notes stay on the thread.</p>
          @for (item of offerAlerts(); track item.id) {
            <article class="offer-action">
              <strong>{{ item.title }}</strong>
              <p>{{ item.body }}</p>
              <a class="button" [routerLink]="item.href || '/applications'" (click)="readOne(item.id)">Open</a>
            </article>
          }
        </section>
      }
      <div class="stack">
        @for (item of items(); track item.id) {
          <article class="list-row" [class.unread]="!item.readAt">
            <p class="eyebrow">{{ label(item.type) }} · {{ timeAgo(item.createdAt) }}</p>
            <strong>{{ item.title }}</strong>
            <p class="muted">{{ item.body }}</p>
            @if (item.href) {
              <a [routerLink]="item.href" (click)="readOne(item.id)">Open</a>
            }
          </article>
        }
      </div>
    }
  `,
})
export class NotificationsPage {
  private readonly http = inject(HttpClient);
  private readonly platform = inject(PlatformService);
  readonly items = signal<NotificationItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly timeAgo = timeAgo;
  readonly label = humanizeLabel;
  readonly offerAlerts = computed(() =>
    this.items().filter((item) => /offer/i.test(`${item.title} ${item.body}`)),
  );

  constructor() {
    void this.platform
      .getNotifications(true)
      .then((rows) => {
        this.items.set(rows);
        this.error.set(false);
      })
      .catch(() => this.error.set(true))
      .finally(() => this.loading.set(false));
  }

  async readAll() {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/notifications/read`, {}));
    this.items.set(await this.platform.getNotifications(true));
    await this.platform.refreshBadges();
  }

  async readOne(id: string) {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/notifications/${id}/read`, {}));
    this.items.set(await this.platform.getNotifications(true));
    await this.platform.refreshBadges();
  }
}
