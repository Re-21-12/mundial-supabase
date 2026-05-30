import type { Database } from '../../../types/database.types';

export type MatchRow = Database['public']['Tables']['MATCH']['Row'];
export type MatchPhase = 'regulation' | 'extra_time' | 'penalty' | 'finished';

export function getMatchPhase(match: MatchRow): MatchPhase {
  return (
    ((match as Record<string, unknown>)['phase'] as MatchPhase | null | undefined) ?? 'regulation'
  );
}

export function getMatchPhaseLabel(match: MatchRow): string {
  switch (getMatchPhase(match)) {
    case 'extra_time':
      return 'Tiempo extra';
    case 'penalty':
      return 'Penales';
    case 'finished':
      return 'Finalizado';
    case 'regulation':
    default:
      return 'Regulación';
  }
}

export function getMatchPhaseSeverity(
  match: MatchRow,
): 'success' | 'warn' | 'secondary' | 'danger' {
  switch (getMatchPhase(match)) {
    case 'extra_time':
      return 'warn';
    case 'penalty':
      return 'danger';
    case 'finished':
      return 'secondary';
    case 'regulation':
    default:
      return isMatchLive(match) ? 'success' : 'secondary';
  }
}

export function isMatchClosed(match: MatchRow): boolean {
  return getMatchPhase(match) === 'finished';
}

export function isMatchLive(match: MatchRow): boolean {
  const phase = getMatchPhase(match);
  if (phase === 'finished') {
    return false;
  }

  const now = new Date();
  return new Date(match.start_time) <= now && new Date(match.end_time) > now && !match.is_deleted;
}
