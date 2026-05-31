import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ClientContentService } from '../../services/client-content.service';
import {
  ClientCardComponent,
  type ClientCardData,
} from '../../../shared/components/client-card/client-card';

interface TeamRow {
  team_id: number;
  name: string;
  logo_url: string | null;
}

@Component({
  selector: 'app-mis-equipos',
  standalone: true,
  imports: [ClientCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-equipos.html',
  styleUrls: ['./mis-equipos.css'],
})
export class MisEquiposPage implements OnInit {
  private readonly clientContent = inject(ClientContentService);

  protected readonly cards = signal<ClientCardData[]>([]);
  protected readonly loading = signal(true);

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    this.loading.set(true);

    try {
      const rows = await this.clientContent.loadTeams();

      this.cards.set(
        rows.map(
          (r): ClientCardData => ({
            id: r.team_id,
            imageUrl: r.logo_url,
            title: r.name,
          }),
        ),
      );
    } catch (error) {
      console.error('[MisEquipos] load error:', error);
      this.cards.set([]);
    }

    this.loading.set(false);
  }
}
