import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlatformService } from '../../core/platform.service';
import { AuthStore } from '../../core/auth.store';
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
      </div>
    </header>
    <div class="messages-layout">
      <aside class="stack">
        @if (loading()) {
          <hs-skeleton [rows]="[1,2,3]" [height]="72" />
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
                <p class="muted">{{ row.lastMessage?.body }}</p>
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
          <p class="muted">Pick a conversation.</p>
        } @else {
          <header class="person-row">
            <span class="avatar">{{ initials(otherName()) }}</span>
            <div>
              <strong>{{ otherName() }}</strong>
              <p class="muted">{{ otherHeadline() }}</p>
            </div>
          </header>
          <div class="stack thread-body">
            @for (message of thread(); track message.id) {
              <p class="bubble" [class.mine]="message.senderId === auth.user()?.id">
                <span>{{ message.body }}</span>
                <small>{{ timeAgo(message.createdAt) }}</small>
              </p>
            }
          </div>
          <form class="reply" (submit)="send($event)">
            <input [value]="draft()" (input)="draft.set($any($event.target).value)" placeholder="Write a reply" />
            <button type="submit">Send</button>
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
  readonly auth = inject(AuthStore);
  readonly inbox = signal<ConversationSummary[]>([]);
  readonly thread = signal<ChatMessage[]>([]);
  readonly loading = signal(true);
  readonly activeId = signal<string | null>(null);
  readonly draft = signal('');
  readonly initials = initials;
  readonly timeAgo = timeAgo;
  readonly active = computed(() => this.inbox().find((row) => row.id === this.activeId()) ?? null);
  readonly otherName = computed(() => this.active()?.other.name ?? 'Conversation');
  readonly otherHeadline = computed(() => this.active()?.other.headline ?? '');

  constructor() {
    void this.platform.getInbox().then((rows) => {
      this.inbox.set(rows);
      this.loading.set(false);
    });
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.activeId.set(id);
      if (id) void this.loadThread(id);
    });
  }

  private async loadThread(id: string) {
    const detail = await firstValueFrom(
      this.http.get<{ messages: ChatMessage[] }>(`${environment.apiUrl}/conversations/${id}`),
    );
    this.thread.set(detail.messages);
    this.inbox.set(await this.platform.getInbox(true));
    await this.platform.refreshBadges();
  }

  async send(event: Event) {
    event.preventDefault();
    const id = this.activeId();
    if (!id || !this.draft().trim()) return;
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/conversations/${id}/messages`, { body: this.draft() }),
    );
    this.draft.set('');
    await this.loadThread(id);
  }
}
