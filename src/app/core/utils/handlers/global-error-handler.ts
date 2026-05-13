import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorRegistryService } from '../../../core/services/error-registry.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly errorRegistry = inject(ErrorRegistryService);

  handleError(error: unknown): void {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : 'Unhandled application error');
    const chunkFailedMessage = /Loading chunk [\d]+ failed/;

    void this.persistError(normalizedError);

    if (chunkFailedMessage.test(normalizedError.message) && typeof window !== 'undefined') {
      window.setTimeout(() => window.location.reload(), 100);
      return;
    }

    console.error('Error detectado:', normalizedError);
  }

  private async persistError(error: Error) {
    const source = this.extractSource(error.stack);

    try {
      await this.errorRegistry.recordError({
        errorNumber: 9001,
        integration: 'global-error-handler',
        title: error.name || 'Unhandled error',
        description: error.message || 'Unhandled application error',
        stackTrace: error.stack ?? null,
        sourceFile: source.file,
        sourceLine: source.line,
        route: typeof window !== 'undefined' ? window.location.pathname : null,
        browserUserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        severity: 'critical',
      });
    } catch (loggingError) {
      console.error('No se pudo registrar el error en Supabase:', loggingError);
    }
  }

  private extractSource(stack?: string): { file: string | null; line: number | null } {
    if (!stack) {
      return { file: null, line: null };
    }

    const stackLine = stack
      .split('\n')
      .find((line) => line.includes('.ts') || line.includes('.js'));

    if (!stackLine) {
      return { file: null, line: null };
    }

    const match = stackLine.match(/\(?(.+):(\d+):(\d+)\)?$/);

    if (!match) {
      return { file: null, line: null };
    }

    return {
      file: match[1] ?? null,
      line: Number.parseInt(match[2] ?? '', 10) || null,
    };
  }
}
