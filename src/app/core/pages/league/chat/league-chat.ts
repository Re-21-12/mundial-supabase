import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../../services/supabase-service';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';

export interface ChatMessage {
  message_id: number;
  league_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user_name: string;
  user_login: string;
  is_own: boolean;
}

const PAGE_SIZE = 60;

@Component({
  selector: 'app-league-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './league-chat.html',
  styleUrl: './league-chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeagueChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('msgList') private msgListRef!: ElementRef<HTMLElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly db = inject(SupabaseService);
  private readonly auth = inject(AuthFacade);
  private readonly cdr = inject(ChangeDetectorRef);

  private channel: RealtimeChannel | null = null;
  private channel2: RealtimeChannel | null = null;
  private userCache = new Map<number, { name: string; login: string }>();
  private shouldScrollToBottom = false;

  protected leagueId = 0;
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly canChat = signal(false);
  protected readonly sending = signal(false);
  protected readonly leagueName = signal('');
  protected text = '';

  protected get myUserId(): number {
    return Number(this.auth.getInternalUserId());
  }

  async ngOnInit() {
    this.leagueId = Number(this.route.snapshot.paramMap.get('id'));
    await Promise.all([this.checkAccess(), this.loadMessages()]);
    this.subscribeRealtime();
  }

  ngOnDestroy() {
    if (this.channel) this.db.client.removeChannel(this.channel);
    if (this.channel2) this.db.client.removeChannel(this.channel2);
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // ── Access check ─────────────────────────────────────────────────────────────

  private async checkAccess() {
    const uid = this.myUserId;
    if (!uid) return;

    // Check if league creator
    const { data: league } = await this.db.client
      .from('LEAGUE')
      .select('league_id, name')
      .eq('league_id', this.leagueId)
      .eq('user_id', uid)
      .maybeSingle();

    if (league) {
      this.leagueName.set((league as any).name ?? '');
      this.canChat.set(true);
      return;
    }

    // Check if approved member
    const { data: ul } = await this.db.client
      .from('USER_LEAGUE')
      .select('user_league_id')
      .eq('league_id', this.leagueId)
      .eq('user_id', uid)
      .eq('approval_status', 'approved')
      .eq('is_deleted', false)
      .maybeSingle();

    if (ul) this.canChat.set(true);

    // Get league name (may be visible through RLS)
    const { data: lg } = await this.db.client
      .from('LEAGUE')
      .select('name')
      .eq('league_id', this.leagueId)
      .maybeSingle();

    if (lg) this.leagueName.set((lg as any).name ?? '');
  }

  // ── Load messages ─────────────────────────────────────────────────────────────

  private async loadMessages() {
    this.loading.set(true);

    const { data, error } = await (this.db.client as any)
      .from('LEAGUE_MESSAGE')
      .select(
        `
        message_id, league_id, user_id, content, created_at,
        user:USER(name, login)
      `,
      )
      .eq('league_id', this.leagueId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(PAGE_SIZE);

    if (!error && data) {
      const myId = this.myUserId;
      const msgs: ChatMessage[] = (data as any[]).map((r) => {
        const u = r.user ?? { name: 'Usuario', login: '?' };
        this.userCache.set(r.user_id, { name: u.name, login: u.login });
        return this.toMsg(r, myId);
      });
      this.messages.set(msgs);
      this.shouldScrollToBottom = true;
    }

    this.loading.set(false);
    this.cdr.markForCheck();
  }

  // ── Realtime ──────────────────────────────────────────────────────────────────

  private subscribeRealtime() {
    this.channel = this.db.client
      .channel(`league-chat-${this.leagueId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'LEAGUE_MESSAGE',
          filter: `league_id=eq.${this.leagueId}`,
        },
        (payload) => this.onNewMessage(payload.new as any),
      )
      .subscribe();
  }

  private async onNewMessage(row: any) {
    const myId = this.myUserId;

    // Skip if already in list (optimistic update from send())
    if (this.messages().some((m) => m.message_id === row.message_id)) return;

    // Resolve user from cache or fetch
    if (!this.userCache.has(row.user_id)) {
      const { data } = await this.db.client
        .from('USER' as any)
        .select('user_id, name, login')
        .eq('user_id', row.user_id)
        .maybeSingle();
      if (data)
        this.userCache.set(row.user_id, { name: (data as any).name, login: (data as any).login });
    }

    const msg = this.toMsg(row, myId);
    this.messages.update((prev) => [...prev, msg]);
    this.shouldScrollToBottom = true;
    this.cdr.markForCheck();
  }

  // ── Send ──────────────────────────────────────────────────────────────────────

  protected async send() {
    const content = this.text.trim();
    if (!content || this.sending()) return;
    this.sending.set(true);

    const tempId = -Date.now();
    const myId = this.myUserId;
    const cached = this.userCache.get(myId);
    const optimistic: ChatMessage = {
      message_id: tempId,
      league_id: this.leagueId,
      user_id: myId,
      content,
      created_at: new Date().toISOString(),
      user_name: cached?.name ?? 'Tú',
      user_login: cached?.login ?? '',
      is_own: true,
    };

    this.text = '';
    this.messages.update((prev) => [...prev, optimistic]);
    this.shouldScrollToBottom = true;
    this.cdr.markForCheck();

    const { data, error } = await this.db.client
      .from('LEAGUE_MESSAGE' as any)
      .insert({ league_id: this.leagueId, user_id: myId, content })
      .select('message_id')
      .single();

    if (error) {
      // Rollback optimistic
      this.messages.update((prev) => prev.filter((m) => m.message_id !== tempId));
      console.error('[LeagueChat] send error:', error);
    } else {
      // Replace tempId with real id
      const realId = (data as any).message_id;
      this.messages.update((prev) =>
        prev.map((m) => (m.message_id === tempId ? { ...m, message_id: realId } : m)),
      );
    }

    this.sending.set(false);
    this.cdr.markForCheck();
  }

  protected onEnter(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private toMsg(r: any, myId: number): ChatMessage {
    const cached = this.userCache.get(r.user_id);
    return {
      message_id: r.message_id,
      league_id: r.league_id,
      user_id: r.user_id,
      content: r.content,
      created_at: r.created_at,
      user_name: cached?.name ?? r.user?.name ?? 'Usuario',
      user_login: cached?.login ?? r.user?.login ?? '?',
      is_own: r.user_id === myId,
    };
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  }

  protected formatDay(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  protected isSameDay(a: ChatMessage, b: ChatMessage): boolean {
    return new Date(a.created_at).toDateString() === new Date(b.created_at).toDateString();
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private scrollToBottom() {
    const el = this.msgListRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
