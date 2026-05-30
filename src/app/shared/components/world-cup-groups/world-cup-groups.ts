import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import type { GrupoCard, MatchCard } from '../../../core/pages/home/models/home.models';

const GROUP_ACCENTS: Record<string, string> = {
  A: '#00C853',
  B: '#D50000',
  C: '#FF6D00',
  D: '#2962FF',
  E: '#AA00FF',
  F: '#C6D400',
  G: '#C51162',
  H: '#00B8D4',
  I: '#6200EA',
  J: '#558B2F',
  K: '#E65100',
  L: '#00695C',
};

const TEAM_FLAGS: Record<string, string> = {
  México: '🇲🇽',
  Sudáfrica: '🇿🇦',
  'Corea del Sur': '🇰🇷',
  'República Checa': '🇨🇿',
  Canadá: '🇨🇦',
  'Bosnia y Herzegovina': '🇧🇦',
  Qatar: '🇶🇦',
  Suiza: '🇨🇭',
  Brasil: '🇧🇷',
  Marruecos: '🇲🇦',
  Haití: '🇭🇹',
  Escocia: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Estados Unidos': '🇺🇸',
  Paraguay: '🇵🇾',
  Australia: '🇦🇺',
  Turquía: '🇹🇷',
  Alemania: '🇩🇪',
  Curaçao: '🇨🇼',
  'Costa de Marfil': '🇨🇮',
  Ecuador: '🇪🇨',
  'Países Bajos': '🇳🇱',
  Japón: '🇯🇵',
  Suecia: '🇸🇪',
  Túnez: '🇹🇳',
  Bélgica: '🇧🇪',
  Egipto: '🇪🇬',
  Irán: '🇮🇷',
  'Nueva Zelanda': '🇳🇿',
  España: '🇪🇸',
  'Cabo Verde': '🇨🇻',
  'Arabia Saudita': '🇸🇦',
  Uruguay: '🇺🇾',
  Francia: '🇫🇷',
  Senegal: '🇸🇳',
  Irak: '🇮🇶',
  Noruega: '🇳🇴',
  Argentina: '🇦🇷',
  Argelia: '🇩🇿',
  Austria: '🇦🇹',
  Jordania: '🇯🇴',
  Portugal: '🇵🇹',
  'República Democrática del Congo': '🇨🇩',
  Uzbekistán: '🇺🇿',
  Colombia: '🇨🇴',
  Inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Croacia: '🇭🇷',
  Ghana: '🇬🇭',
  Panamá: '🇵🇦',
};

const TEAM_CODES: Record<string, string> = {
  México: 'MEX',
  Sudáfrica: 'RSA',
  'Corea del Sur': 'KOR',
  'República Checa': 'CZE',
  Canadá: 'CAN',
  'Bosnia y Herzegovina': 'BIH',
  Qatar: 'QAT',
  Suiza: 'SUI',
  Brasil: 'BRA',
  Marruecos: 'MAR',
  Haití: 'HAI',
  Escocia: 'SCO',
  'Estados Unidos': 'USA',
  Paraguay: 'PAR',
  Australia: 'AUS',
  Turquía: 'TUR',
  Alemania: 'GER',
  Curaçao: 'CUW',
  'Costa de Marfil': 'CIV',
  Ecuador: 'ECU',
  'Países Bajos': 'NED',
  Japón: 'JPN',
  Suecia: 'SWE',
  Túnez: 'TUN',
  Bélgica: 'BEL',
  Egipto: 'EGY',
  Irán: 'IRN',
  'Nueva Zelanda': 'NZL',
  España: 'ESP',
  'Cabo Verde': 'CPV',
  'Arabia Saudita': 'KSA',
  Uruguay: 'URU',
  Francia: 'FRA',
  Senegal: 'SEN',
  Irak: 'IRQ',
  Noruega: 'NOR',
  Argentina: 'ARG',
  Argelia: 'ALG',
  Austria: 'AUT',
  Jordania: 'JOR',
  Portugal: 'POR',
  'República Democrática del Congo': 'COD',
  Uzbekistán: 'UZB',
  Colombia: 'COL',
  Inglaterra: 'ENG',
  Croacia: 'CRO',
  Ghana: 'GHA',
  Panamá: 'PAN',
};

@Component({
  selector: 'app-world-cup-groups',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './world-cup-groups.html',
  styleUrl: './world-cup-groups.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldCupGroupsComponent {
  readonly grupos = input.required<GrupoCard[]>();
  readonly matchCards = input<MatchCard[]>([]);

  getAccent(groupName: string): string {
    return GROUP_ACCENTS[groupName] ?? '#888';
  }

  getFlag(teamName: string): string {
    if (teamName.startsWith('TBD')) return '❓';
    return TEAM_FLAGS[teamName] ?? '🏳️';
  }

  getCode(name: string): string {
    return TEAM_CODES[name] ?? name.substring(0, 3).toUpperCase();
  }

  hasStats(grupo: GrupoCard): boolean {
    return grupo.teams.some((t) => t.games_played > 0);
  }

  getGroupMatches(grupoId: number): MatchCard[] {
    return this.matchCards()
      .filter((c) => c.match.grupo_id === grupoId)
      .sort(
        (a, b) => new Date(a.match.start_time).getTime() - new Date(b.match.start_time).getTime(),
      );
  }

  isFinished(card: MatchCard): boolean {
    const phase = (card.match as Record<string, unknown>)['phase'];
    if (phase === 'finished') {
      return true;
    }

    return new Date(card.match.end_time) < new Date();
  }

  formatMatchTime(card: MatchCard): string {
    return new Date(card.match.start_time).toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
