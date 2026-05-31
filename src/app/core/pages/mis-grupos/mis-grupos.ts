import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import {
  ClientContentService,
  type ClientLeagueGroupView,
} from '../../services/client-content.service';

interface LeagueFilterOption {
  league_id: number | null;
  league_name: string;
}

@Component({
  selector: 'app-mis-grupos',
  standalone: true,
  imports: [FormsModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-grupos.html',
  styleUrls: ['./mis-grupos.css'],
})
export class MisGruposPage implements OnInit {
  private readonly clientContent = inject(ClientContentService);

  protected readonly leagues = signal<ClientLeagueGroupView[]>([]);
  protected readonly loading = signal(true);
  protected readonly selectedLeagueId = signal<number | null>(null);

  protected readonly leagueOptions = computed<LeagueFilterOption[]>(() => {
    const leagues = this.leagues();
    return [
      { league_id: null, league_name: 'Todas las ligas' },
      ...leagues.map((league) => ({
        league_id: league.league_id,
        league_name: league.league_name,
      })),
    ];
  });

  protected readonly filteredLeagues = computed(() => {
    const selectedLeagueId = this.selectedLeagueId();
    const leagues = this.leagues();

    if (selectedLeagueId === null) {
      return leagues;
    }

    return leagues.filter((league) => league.league_id === selectedLeagueId);
  });

  protected readonly hasLeagueFilter = computed(() => this.leagues().length > 1);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected onLeagueChange(leagueId: number | null): void {
    this.selectedLeagueId.set(leagueId);
  }

  private async load(): Promise<void> {
    this.loading.set(true);

    try {
      this.leagues.set(await this.clientContent.loadGroups());
      this.selectedLeagueId.set(null);
    } catch (error) {
      console.error('[MisGrupos] load error:', error);
      this.leagues.set([]);
      this.selectedLeagueId.set(null);
    }

    this.loading.set(false);
  }
}
