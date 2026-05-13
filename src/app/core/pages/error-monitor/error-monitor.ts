import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ErrorRegistryService, ErrorSeverity } from '../../services/error-registry.service';
import { Database } from '../../../types/database.types';

@Component({
  selector: 'app-error-monitor',
  imports: [CommonModule, ButtonModule, CardModule, ProgressSpinnerModule, TableModule, TagModule],
  templateUrl: './error-monitor.html',
  styleUrl: './error-monitor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorMonitorPage implements OnInit, OnDestroy {
  private readonly errorRegistry = inject(ErrorRegistryService);
  private refreshTimer: ReturnType<typeof window.setInterval> | null = null;

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly catalog = signal<Database['public']['Tables']['ERROR_CATALOG']['Row'][]>([]);
  protected readonly logs = signal<Database['public']['Tables']['ERROR_LOG']['Row'][]>([]);
  protected readonly lastUpdated = signal<Date | null>(null);

  protected readonly totalErrors = computed(() => this.logs().length);
  protected readonly criticalErrors = computed(
    () => this.logs().filter((entry) => entry.severity === 'critical').length,
  );
  protected readonly highErrors = computed(
    () => this.logs().filter((entry) => entry.severity === 'high').length,
  );
  protected readonly trackedDefinitions = computed(() => this.catalog().length);

  async ngOnInit() {
    await this.loadData();

    if (typeof window !== 'undefined') {
      this.refreshTimer = window.setInterval(() => {
        void this.loadData(true);
      }, 30000);
    }
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  protected async loadData(silent = false) {
    if (!silent) {
      this.loading.set(true);
    }

    this.error.set(null);

    try {
      const dashboard = await this.errorRegistry.getErrorDashboard(100);
      this.catalog.set(dashboard.catalog);
      this.logs.set(dashboard.logs);
      this.lastUpdated.set(new Date());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No fue posible cargar los errores.');
    } finally {
      if (!silent) {
        this.loading.set(false);
      }
    }
  }

  protected getSeveritySeverity(severity: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (severity as ErrorSeverity) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'warn';
      case 'medium':
        return 'info';
      default:
        return 'success';
    }
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  protected formatContext(
    value: Database['public']['Tables']['ERROR_LOG']['Row']['context'],
  ): string {
    if (!value) {
      return 'Sin contexto';
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return 'Contexto no disponible';
    }
  }
}
