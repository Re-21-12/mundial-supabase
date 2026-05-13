import { Injectable, inject } from '@angular/core';
import { Database } from '../../types/database.types';
import { SupabaseService } from './supabase-service';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RegisterErrorInput {
  errorNumber: number;
  integration: string;
  description: string;
  title: string;
  severity?: ErrorSeverity;
  resolution?: string | null;
  stackTrace?: string | null;
  sourceFile?: string | null;
  sourceLine?: number | null;
  route?: string | null;
  context?: Record<string, unknown> | null;
  userId?: number | null;
  browserUserAgent?: string | null;
  createdBy?: number | null;
}

export interface ErrorDashboardData {
  catalog: Database['public']['Tables']['ERROR_CATALOG']['Row'][];
  logs: Database['public']['Tables']['ERROR_LOG']['Row'][];
}

@Injectable({ providedIn: 'root' })
export class ErrorRegistryService {
  private readonly supabaseService = inject(SupabaseService);

  async ensureErrorDefinition(
    input: Pick<
      RegisterErrorInput,
      'errorNumber' | 'integration' | 'description' | 'severity' | 'resolution' | 'createdBy'
    >,
  ) {
    const client = this.supabaseService.getClient();

    if (!client) {
      return null;
    }

    const { error } = await client.from('ERROR_CATALOG').upsert(
      {
        error_number: input.errorNumber,
        integration: input.integration,
        description: input.description,
        severity: input.severity ?? 'medium',
        resolution: input.resolution ?? null,
        created_by: input.createdBy ?? null,
        created_at: new Date().toISOString(),
        is_active: true,
        is_deleted: false,
      },
      {
        onConflict: 'error_number',
        ignoreDuplicates: true,
      },
    );

    if (error) {
      throw error;
    }

    return null;
  }

  async recordError(input: RegisterErrorInput) {
    const client = this.supabaseService.getClient();

    if (!client) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    await this.ensureErrorDefinition(input);

    const { data, error } = await client
      .from('ERROR_LOG')
      .insert({
        error_number: input.errorNumber,
        title: input.title,
        description: input.description,
        stack_trace: input.stackTrace ?? null,
        source_file: input.sourceFile ?? null,
        source_line: input.sourceLine ?? null,
        route: input.route ?? null,
        user_id: input.userId ?? null,
        browser_user_agent: input.browserUserAgent ?? null,
        context: input.context ?? null,
        severity: input.severity ?? 'medium',
        created_by: input.createdBy ?? null,
        created_at: new Date().toISOString(),
        is_deleted: false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  async getErrorCatalog() {
    const client = this.supabaseService.getClient();

    if (!client) {
      return [] as Database['public']['Tables']['ERROR_CATALOG']['Row'][];
    }

    const { data, error } = await client
      .from('ERROR_CATALOG')
      .select('*')
      .eq('is_deleted', false)
      .order('error_number', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async getErrorLogs(limit = 100) {
    const client = this.supabaseService.getClient();

    if (!client) {
      return [] as Database['public']['Tables']['ERROR_LOG']['Row'][];
    }

    const { data, error } = await client
      .from('ERROR_LOG')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async getErrorDashboard(limit = 100): Promise<ErrorDashboardData> {
    const [catalog, logs] = await Promise.all([this.getErrorCatalog(), this.getErrorLogs(limit)]);
    return { catalog, logs };
  }
}
