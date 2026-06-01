import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../services/supabase-service';

interface RuleRow {
  rules_league_id: number;
  dimension: string | null;
  description: string | null;
  value: number | null;
}

@Component({
  selector: 'app-league-rules-client',
  imports: [RouterLink],
  templateUrl: './league-rules-client.html',
  styleUrl: './league-rules-client.css',
})
export class LeagueRulesClientPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly db = inject(SupabaseService);

  protected readonly rules = signal<RuleRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected leagueId = 0;

  async ngOnInit() {
    this.leagueId = Number(this.route.snapshot.paramMap.get('id'));
    await this.load();
  }

  private async load() {
    this.loading.set(true);
    const { data, error } = await this.db.client
      .from('RULES_LEAGUE')
      .select('rules_league_id, dimension, description, value')
      .eq('league_id', this.leagueId)
      .eq('is_deleted', false)
      .order('dimension', { ascending: true });

    if (error) {
      this.error.set('No se pudieron cargar las reglas.');
    } else {
      this.rules.set((data ?? []) as RuleRow[]);
    }
    this.loading.set(false);
  }
}
