import { Component, input, output, computed, signal, ChangeDetectionStrategy } from '@angular/core';

export type ClientCardTagType = 'default' | 'success' | 'warning' | 'danger' | 'live';

export interface ClientCardAction {
  key: string;
  label: string;
  icon: string;
  variant?: 'primary' | 'ghost' | 'secondary';
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
  templateUrl: './client-card.html',
  styleUrl: './client-card.css',
})
export class ClientCardComponent {
  readonly card = input.required<ClientCardData>();
  readonly action = output<{ card: ClientCardData; key: string }>();

  protected readonly open = signal(false);
  protected readonly copied = signal(false);

  protected readonly initials = computed(() =>
    this.card()
      .title.split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3),
  );

  protected readonly bannerStyle = computed(() => {
    if (this.card().imageUrl) return 'background:#000';
    const idx =
      (typeof this.card().id === 'number' ? (this.card().id as number) : 0) % GRADIENTS.length;
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
