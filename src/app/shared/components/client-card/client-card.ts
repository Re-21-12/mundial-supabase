import {
  Component,
  input,
  output,
  computed,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

export type ClientCardTagType = 'default' | 'success' | 'warning' | 'danger' | 'live';

export interface ClientCardAction {
  key: string;
  label: string;
  icon: string;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}

export interface ClientCardData {
  id: number | string;
  imageUrl?: string | null;
  title: string;
  subtitle?: string | null;
  tag?: { label: string; type: ClientCardTagType };
  details?: { icon: string; text: string }[];
  metric?: { value: string | number; label: string };
  /** Lista de acciones. La primera es primaria por defecto. */
  actions?: ClientCardAction[];
  /** Contenido que se revela al expandir (ej. código de invitación) */
  expandable?: { triggerLabel: string; content: string; copyable?: boolean };
}

const GRADIENTS = [
  'linear-gradient(135deg, #0d7377 0%, #14a085 100%)',
  'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #d97706 0%, #dc2626 100%)',
  'linear-gradient(135deg, #059669 0%, #0d7377 100%)',
  'linear-gradient(135deg, #db2777 0%, #9333ea 100%)',
  'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)',
  'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
  'linear-gradient(135deg, #475569 0%, #2563eb 100%)',
];

@Component({
  selector: 'app-client-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = card();

    <article class="cc" [class.cc--expanded]="open()">

      <!-- Image / gradient banner -->
      <div class="cc__banner" [style.background]="bannerStyle()">
        @if (c.imageUrl) {
          <img [src]="c.imageUrl" [alt]="c.title" loading="lazy" class="cc__banner-img" />
        } @else {
          <span class="cc__initials">{{ initials() }}</span>
        }
        @if (c.tag) {
          <span class="cc__tag" [class]="'cc__tag--' + c.tag.type">
            @if (c.tag.type === 'live') { <span class="cc__live-dot"></span> }
            {{ c.tag.label }}
          </span>
        }
      </div>

      <!-- Body -->
      <div class="cc__body">
        <div class="cc__titles">
          <h3 class="cc__title">{{ c.title }}</h3>
          @if (c.subtitle) {
            <p class="cc__subtitle">{{ c.subtitle }}</p>
          }
        </div>
        @if (c.metric) {
          <div class="cc__metric">
            <span class="cc__metric-value">{{ c.metric.value }}</span>
            <span class="cc__metric-label">{{ c.metric.label }}</span>
          </div>
        }
      </div>

      <!-- Tear line -->
      <div class="cc__tear"></div>

      <!-- Footer -->
      <div class="cc__footer">
        <div class="cc__details">
          @for (d of c.details ?? []; track d.text) {
            <span class="cc__detail">
              <i [class]="'pi ' + d.icon"></i>{{ d.text }}
            </span>
          }
        </div>

        <div class="cc__actions">
          @if (c.expandable) {
            <button class="cc__btn cc__btn--ghost" type="button" (click)="toggleExpand()">
              <i [class]="open() ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
              {{ c.expandable.triggerLabel }}
            </button>
          }
          @for (act of c.actions ?? []; track act.key) {
            <button
              [class]="'cc__btn cc__btn--' + (act.variant ?? 'primary')"
              type="button"
              [disabled]="act.disabled"
              (click)="action.emit({ card: c, key: act.key })"
            >
              <i [class]="'pi ' + act.icon"></i>
              {{ act.label }}
            </button>
          }
        </div>
      </div>

      <!-- Expandable section (ej. código de invitación) -->
      @if (open() && c.expandable) {
        <div class="cc__expand">
          <span class="cc__expand-label">{{ c.expandable.triggerLabel }}</span>
          <div class="cc__expand-code">
            <span>{{ c.expandable.content }}</span>
            @if (c.expandable.copyable !== false) {
              <button class="cc__copy-btn" type="button" (click)="copy(c.expandable!.content)" title="Copiar">
                <i [class]="copied() ? 'pi pi-check' : 'pi pi-copy'"></i>
              </button>
            }
          </div>
        </div>
      }

    </article>
  `,
  styleUrl: './client-card.css',
})
export class ClientCardComponent {
  readonly card   = input.required<ClientCardData>();
  readonly action = output<{ card: ClientCardData; key: string }>();

  protected readonly open   = signal(false);
  protected readonly copied = signal(false);

  protected readonly initials = computed(() =>
    this.card().title.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 3),
  );

  protected readonly bannerStyle = computed(() => {
    if (this.card().imageUrl) return 'background:#000';
    const idx = (typeof this.card().id === 'number' ? (this.card().id as number) : 0) % GRADIENTS.length;
    return GRADIENTS[idx];
  });

  protected toggleExpand() {
    this.open.update((v) => !v);
  }

  protected async copy(text: string) {
    await navigator.clipboard.writeText(text);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
