import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  ConnectionRequest,
  ConnectionRow,
  ConversationSummary,
  FeedPost,
  NotificationItem,
  PublicJobCard,
  PublicPersonCard,
} from '@hirestack/shared';
import { ToastService } from './toast.service';

const LIST_CACHE_TTL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  private readonly peopleSubject = new BehaviorSubject<PublicPersonCard[]>([]);
  public readonly people$ = this.peopleSubject.asObservable();
  private cachedPeople: PublicPersonCard[] | null = null;
  private peopleFetchedAt = 0;
  private peopleInFlight: Promise<PublicPersonCard[]> | null = null;

  private readonly feedSubject = new BehaviorSubject<FeedPost[]>([]);
  public readonly feed$ = this.feedSubject.asObservable();
  private cachedFeed: FeedPost[] | null = null;
  private feedFetchedAt = 0;
  private feedInFlight: Promise<FeedPost[]> | null = null;

  private readonly inboxSubject = new BehaviorSubject<ConversationSummary[]>([]);
  public readonly inbox$ = this.inboxSubject.asObservable();
  private cachedInbox: ConversationSummary[] | null = null;
  private inboxFetchedAt = 0;
  private inboxInFlight: Promise<ConversationSummary[]> | null = null;

  private readonly notesSubject = new BehaviorSubject<NotificationItem[]>([]);
  public readonly notifications$ = this.notesSubject.asObservable();
  private cachedNotes: NotificationItem[] | null = null;
  private notesFetchedAt = 0;
  private notesInFlight: Promise<NotificationItem[]> | null = null;

  readonly unreadNotifications = signal(0);
  readonly unreadMessages = signal(0);
  readonly pendingRequests = signal(0);
  readonly savedJobIds = signal<Set<string>>(new Set());
  readonly sentConnectIds = signal<Set<string>>(new Set());
  readonly workspacePlan = signal<{
    planName: string;
    usage: { publishedJobs: number; publishedLimit: number | null; featuredJobs: number; featuredLimit: number };
  } | null>(null);

  public invalidateCache(): void {
    this.cachedPeople = null;
    this.peopleFetchedAt = 0;
    this.cachedFeed = null;
    this.feedFetchedAt = 0;
    this.cachedInbox = null;
    this.inboxFetchedAt = 0;
    this.cachedNotes = null;
    this.notesFetchedAt = 0;
    this.unreadNotifications.set(0);
    this.unreadMessages.set(0);
    this.pendingRequests.set(0);
    this.savedJobIds.set(new Set());
    this.sentConnectIds.set(new Set());
    this.workspacePlan.set(null);
  }

  public async refreshBadges(): Promise<void> {
    const [notes, inbox, requests] = await Promise.all([
      firstValueFrom(this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`)),
      firstValueFrom(this.http.get<{ count: number }>(`${environment.apiUrl}/conversations/unread-count`)),
      this.getRequests(),
    ]);
    this.unreadNotifications.set(notes.count);
    this.unreadMessages.set(inbox.count);
    this.pendingRequests.set(requests.length);
  }

  public async refreshWorkspace(): Promise<void> {
    try {
      const bill = await firstValueFrom(
        this.http.get<{
          planName: string;
          usage: {
            publishedJobs: number;
            publishedLimit: number | null;
            featuredJobs: number;
            featuredLimit: number;
          };
        }>(`${environment.apiUrl}/billing/workspace`),
      );
      this.workspacePlan.set(bill);
    } catch {
      this.workspacePlan.set(null);
    }
  }

  public async getPeople(forceRefresh = false): Promise<PublicPersonCard[]> {
    if (!forceRefresh && this.cachedPeople && Date.now() - this.peopleFetchedAt < LIST_CACHE_TTL_MS) {
      return this.cachedPeople;
    }
    if (!forceRefresh && this.peopleInFlight) {
      return this.peopleInFlight;
    }
    this.peopleInFlight = firstValueFrom(this.http.get<PublicPersonCard[]>(`${environment.apiUrl}/people`))
      .then((rows) => {
        this.cachedPeople = rows;
        this.peopleFetchedAt = Date.now();
        this.peopleSubject.next(rows);
        return rows;
      })
      .finally(() => {
        this.peopleInFlight = null;
      });
    return this.peopleInFlight;
  }

  public async getFeed(forceRefresh = false): Promise<FeedPost[]> {
    if (!forceRefresh && this.cachedFeed && Date.now() - this.feedFetchedAt < LIST_CACHE_TTL_MS) {
      return this.cachedFeed;
    }
    if (!forceRefresh && this.feedInFlight) {
      return this.feedInFlight;
    }
    this.feedInFlight = firstValueFrom(this.http.get<FeedPost[]>(`${environment.apiUrl}/feed`))
      .then((rows) => {
        this.cachedFeed = rows;
        this.feedFetchedAt = Date.now();
        this.feedSubject.next(rows);
        return rows;
      })
      .finally(() => {
        this.feedInFlight = null;
      });
    return this.feedInFlight;
  }

  public async getInbox(forceRefresh = false): Promise<ConversationSummary[]> {
    if (!forceRefresh && this.cachedInbox && Date.now() - this.inboxFetchedAt < LIST_CACHE_TTL_MS) {
      return this.cachedInbox;
    }
    if (!forceRefresh && this.inboxInFlight) {
      return this.inboxInFlight;
    }
    this.inboxInFlight = firstValueFrom(
      this.http.get<ConversationSummary[]>(`${environment.apiUrl}/conversations`),
    )
      .then((rows) => {
        this.cachedInbox = rows;
        this.inboxFetchedAt = Date.now();
        this.inboxSubject.next(rows);
        this.unreadMessages.set(rows.reduce((sum, row) => sum + row.unreadCount, 0));
        return rows;
      })
      .finally(() => {
        this.inboxInFlight = null;
      });
    return this.inboxInFlight;
  }

  public async getNotifications(forceRefresh = false): Promise<NotificationItem[]> {
    if (!forceRefresh && this.cachedNotes && Date.now() - this.notesFetchedAt < LIST_CACHE_TTL_MS) {
      return this.cachedNotes;
    }
    if (!forceRefresh && this.notesInFlight) {
      return this.notesInFlight;
    }
    this.notesInFlight = firstValueFrom(
      this.http.get<NotificationItem[]>(`${environment.apiUrl}/notifications`),
    )
      .then((rows) => {
        this.cachedNotes = rows;
        this.notesFetchedAt = Date.now();
        this.notesSubject.next(rows);
        this.unreadNotifications.set(rows.filter((row) => !row.readAt).length);
        return rows;
      })
      .finally(() => {
        this.notesInFlight = null;
      });
    return this.notesInFlight;
  }

  public getConnections(): Promise<ConnectionRow[]> {
    return firstValueFrom(this.http.get<ConnectionRow[]>(`${environment.apiUrl}/me/connections`));
  }

  public getRequests(): Promise<ConnectionRequest[]> {
    return firstValueFrom(
      this.http.get<ConnectionRequest[]>(`${environment.apiUrl}/me/connection-requests`),
    );
  }

  public getSuggested(): Promise<PublicPersonCard[]> {
    return firstValueFrom(this.http.get<PublicPersonCard[]>(`${environment.apiUrl}/me/suggested`));
  }

  public async loadSavedJobs(): Promise<void> {
    const rows = await firstValueFrom(
      this.http.get<PublicJobCard[]>(`${environment.apiUrl}/me/saved-jobs`),
    );
    this.savedJobIds.set(new Set(rows.map((row) => row.id)));
  }

  public async toggleSaveJob(jobId: string): Promise<void> {
    const next = new Set(this.savedJobIds());
    try {
      if (next.has(jobId)) {
        await firstValueFrom(this.http.delete(`${environment.apiUrl}/jobs/${jobId}/save`));
        next.delete(jobId);
        this.toast.show('Removed from saved jobs', 'success');
      } else {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/jobs/${jobId}/save`, {}));
        next.add(jobId);
        this.toast.show('Saved for later', 'success');
      }
      this.savedJobIds.set(next);
    } catch {
      this.toast.show('Could not update saved job', 'error');
    }
  }

  public async connect(userId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/connections`, { userId }));
      const next = new Set(this.sentConnectIds());
      next.add(userId);
      this.sentConnectIds.set(next);
      this.toast.show('Connection request sent', 'success');
      return true;
    } catch {
      this.toast.show('Could not send request', 'error');
      return false;
    }
  }
}
