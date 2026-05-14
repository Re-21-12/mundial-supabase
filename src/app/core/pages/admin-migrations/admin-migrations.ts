import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { SupabaseService } from '../../services/supabase-service';

interface MigrationLog {
  migration_id: number;
  version: string;
  name: string;
  description: string | null;
  script_path: string | null;
  applied_at: string;
  applied_by: string | null;
  status: string;
  checksum: string | null;
  execution_ms: number | null;
}

@Component({
  selector: 'app-admin-migrations',
  imports: [CommonModule, TagModule, DatePipe],
  templateUrl: './admin-migrations.html',
  styleUrl: './admin-migrations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMigrationsPage implements OnInit {
  private readonly db = inject(SupabaseService);

  protected readonly migrations = signal<MigrationLog[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    const { data, error } = await this.db.client
      .from('MIGRATION_LOG')
      .select('*')
      .order('applied_at', { ascending: false });

    if (error) {
      this.error.set('No se pudo cargar el historial de migraciones.');
    } else {
      this.migrations.set((data ?? []) as MigrationLog[]);
    }
    this.isLoading.set(false);
  }

  statusSeverity(status: string): 'success' | 'danger' | 'warn' | 'secondary' {
    if (status === 'success' || status === 'applied') return 'success';
    if (status === 'error' || status === 'failed') return 'danger';
    if (status === 'pending') return 'warn';
    return 'secondary';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      success: 'Aplicada',
      applied: 'Aplicada',
      error: 'Error',
      failed: 'Fallida',
      pending: 'Pendiente',
    };
    return map[status] ?? status;
  }
}
