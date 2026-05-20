import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import type { GrupoCard } from '../../../core/pages/home/models/home.models';

const GROUP_ACCENTS: Record<string, string> = {
  A: '#00C853', B: '#D50000', C: '#FF6D00', D: '#2962FF',
  E: '#AA00FF', F: '#C6D400', G: '#C51162', H: '#00B8D4',
  I: '#6200EA', J: '#558B2F', K: '#E65100', L: '#00695C',
};

const TEAM_FLAGS: Record<string, string> = {
  'México': '🇲🇽',       'Francia': '🇫🇷',       'Japón': '🇯🇵',         'Cabo Verde': '🇨🇻',
  'Canadá': '🇨🇦',       'Bélgica': '🇧🇪',       'Marruecos': '🇲🇦',     'Colombia': '🇨🇴',
  'España': '🇪🇸',       'Túnez': '🇹🇳',         'Uzbekistán': '🇺🇿',
  'Estados Unidos': '🇺🇸', 'Arabia Saudita': '🇸🇦', 'Paraguay': '🇵🇾',   'Jordania': '🇯🇴',
  'Argentina': '🇦🇷',    'Egipto': '🇪🇬',         'Guatemala': '🇬🇹',
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Ghana': '🇬🇭',          'Islandia': '🇮🇸',     'Panamá': '🇵🇦',
  'Brasil': '🇧🇷',       'Qatar': '🇶🇦',          'Nueva Zelanda': '🇳🇿',
  'Alemania': '🇩🇪',     'Argelia': '🇩🇿',        'República Checa': '🇨🇿',
  'Portugal': '🇵🇹',     'Corea del Sur': '🇰🇷',  'Uruguay': '🇺🇾',
  'Países Bajos': '🇳🇱', 'Senegal': '🇸🇳',        'Irak': '🇮🇶',          'Perú': '🇵🇪',
  'Croacia': '🇭🇷',      'Ecuador': '🇪🇨',        'Bosnia y Herzegovina': '🇧🇦', 'Australia': '🇦🇺',
  'Serbia': '🇷🇸',       'Austria': '🇦🇹',        'Costa de Marfil': '🇨🇮', 'Haití': '🇭🇹',
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

  getAccent(groupName: string): string {
    return GROUP_ACCENTS[groupName] ?? '#888';
  }

  getFlag(teamName: string): string {
    if (teamName.startsWith('TBD')) return '❓';
    return TEAM_FLAGS[teamName] ?? '🏳️';
  }

  hasStats(grupo: GrupoCard): boolean {
    return grupo.teams.some((t) => t.games_played > 0);
  }
}
