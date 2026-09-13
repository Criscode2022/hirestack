import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlatformService } from '../../core/platform.service';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { EmptyState, Skeleton } from '../../shared/ui';
import { initials, timeAgo } from '../../shared/time';
import type { ChatMessage, ConversationSummary } from '@hirestack/shared';

@Component({
  selector: 'hs-messages',
  imports: [RouterLink, EmptyState, Skeleton],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Inbox</p>
        <h1>Messages</h1>
        <p class="lede">Threads stay with people you already work with. Start one from a profile.</p>
      </div>
    </header>
    <div class="messages-layout">
      <aside class="stack">
        @if (loading()) {
          <hs-skeleton [rows]="[1,2,3]" [height]="72" />
        } @else if (loadError()) {
          <hs-empty-state title="Inbox unavailable" message="Could not load conversations. Retry in a moment." />
        } @else if (!inbox().length) {
          <hs-empty-state title="No threads yet" message="Message a candidate or hiring lead from their profile.">
            <a routerLink="/people" class="ghost">Browse people</a>
          </hs-empty-state>
        } @else {
          @for (row of inbox(); track row.id) {
            <a class="person-row list-row" [routerLink]="['/messages', row.id]" [class.active]="row.id === activeId()">
              <span class="avatar">{{ initials(row.other.name) }}</span>
              <div>
                <strong>{{ row.other.name }}</strong>
                <p class="muted">{{ row.lastMessage?.body || 'No messages yet' }}</p>
              </div>
              @if (row.unreadCount) {
                <span class="count">{{ row.unreadCount }}</span>
              }
            </a>
          }
        }
      </aside>
      <section class="thread">
        @if (!activeId()) {
          <hs-empty-state title="Pick a conversation" message="Choose a thread, or message someone from their profile.">
            <a routerLink="/people" class="ghost">Browse people</a>
          </hs-empty-state>
        } @else if (threadLoading()) {
          <hs-skeleton [rows]="[1,2,3]" [height]="72" />
        } @else if (threadError()) {
          <hs-empty-state title="Thread unavailable" message="This conversation may have moved. Pick another thread." />
        } @else {
          <header class="person-row thread-head">
            <span class="avatar">{{ initials(otherName()) }}</span>
            <div>
              @if (otherId(); as personId) {
                <a [routerLink]="['/people', personId]"><strong>{{ otherName() }}</strong></a>
              } @else {
                <strong>{{ otherName() }}</strong>
              }
              <p class="muted">{{ otherHeadline() }}</p>
            </div>
          </header>
          <div class="stack thread-body">
            @if (!thread().length) {
              <p class="muted">No messages yet. Send the first note.</p>
            }
            @for (message of thread(); track message.id) {
              <p class="bubble" [class.mine]="message.senderId === auth.user()?.id">
                <span>{{ message.body }}</span>
                <small>{{ timeAgo(message.createdAt) }}</small>
              </p>
            }
          </div>
          <form class="reply" (submit)="send($event)">
            <input [value]="draft()" (input)="draft.set($any($event.target).value)" placeholder="Write a reply" [disabled]="sending()" />
            <button type="submit" [disabled]="sending() || !draft().trim()">{{ sending() ? 'Sending…' : 'Send' }}</button>
          </form>
        }
      </section>
    </div>
  `,
  styles: [`
    .messages-layout { display: grid; gap: 1rem; }
    @media (min-width: 860px) { .messages-layout { grid-template-columns: 300px 1fr; } }
    .thread { display: grid; gap: 1rem; min-height: 28rem; }
    .thread-body { align-content: start; }
    .bubble { margin: 0; max-width: 36rem; padding: .7rem .9rem; border-radius: 14px; background: var(--elev-2); display: grid; gap: .25rem; }
    .bubble.mine { justify-self: end; background: color-mix(in oklab, var(--sage) 22%, var(--card)); }
    .bubble small { color: var(--muted); font-size: .72rem; }
    a.list-row.active { border-color: var(--sage); }
  `],
})
export class MessagesPage {
  private readonly http = inject(HttpClient);
  private readonly platform = inject(PlatformService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStore);
  readonly inbox = signal<ConversationSummary[]>([]);
  readonly thread = signal<ChatMessage[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly threadLoading = signal(false);
  readonly threadError = signal(false);
  readonly sending = signal(false);
  readonly activeId = signal<string | null>(null);
  readonly draft = signal('');
  readonly threadOther = signal<{ id: string; name: string; headline: string | null } | null>(null);
  readonly initials = initials;
  readonly timeAgo = timeAgo;
  readonly active = computed(() => this.inbox().find((row) => row.id === this.activeId()) ?? null);
  readonly otherName = computed(
    () => this.threadOther()?.name ?? this.active()?.other.name ?? 'Conversation',
  );
  readonly otherHeadline = computed(
    () => this.threadOther()?.headline ?? this.active()?.other.headline ?? '',
  );
  readonly otherId = computed(
    () => this.threadOther()?.id ?? this.active()?.other.id ?? null,
  );

  constructor() {
    void this.platform
      .getInbox()
      .then((rows) => {
        this.inbox.set(rows);
        this.loadError.set(false);
      })
      .catch(() => {
        this.loadError.set(true);
      })
      .finally(() => {
        this.loading.set(false);
      });
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.activeId.set(id);
      if (id) void this.loadThread(id);
    });
  }

  private async loadThread(id: string) {
    this.threadLoading.set(true);
    this.threadError.set(false);
    this.threadOther.set(null);
    try {
      const detail = await firstValueFrom(
        this.http.get<{
          messages?: ChatMessage[];
          other?: { id: string; name: string; headline: string | null };
        }>(`${environment.apiUrl}/conversations/${id}`),
      );
      this.thread.set(detail.messages ?? []);
      this.threadOther.set(detail.other ?? null);
      this.threadLoading.set(false);
      void this.platform
        .getInbox(true)
        .then((rows) => this.inbox.set(rows))
        .then(() => this.platform.refreshBadges())
        .catch(() => {
          // Thread already rendered; inbox badges can catch up on the next visit.
        });
    } catch {
      this.threadError.set(true);
      this.threadLoading.set(false);
    }
  }

  async send(event: Event) {
    event.preventDefault();
    const id = this.activeId();
    if (!id || !this.draft().trim() || this.sending()) return;
    this.sending.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/conversations/${id}/messages`, { body: this.draft() }),
      );
      this.draft.set('');
      await this.loadThread(id);
    } catch {
      this.toast.show('Could not send that message', 'error');
    } finally {
      this.sending.set(false);
    }
  }
}
