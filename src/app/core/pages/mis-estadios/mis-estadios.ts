import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ClientContentService } from '../../services/client-content.service';
import {
  ClientCardComponent,
  type ClientCardData,
} from '../../../shared/components/client-card/client-card';

interface StadiumRow {
  stadium_id: number;
  name: string | null;
  logo_url: string | null;
}

@Component({
  selector: 'app-mis-estadios',
  standalone: true,
  imports: [ClientCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-estadios.html',
  styleUrls: ['./mis-estadios.css'],
})
export class MisEstadiosPage implements OnInit {
  private readonly clientContent = inject(ClientContentService);

  protected readonly cards = signal<ClientCardData[]>([]);
  protected readonly loading = signal(true);

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    this.loading.set(true);

    try {
      const rows = await this.clientContent.loadStadiums();

      this.cards.set(
        rows.map(
          (r): ClientCardData => ({
            id: r.stadium_id,
            imageUrl: r.logo_url,
            title: r.name ?? 'Estadio sin nombre',
            details: [{ icon: 'pi-map-marker', text: 'Sede oficial' }],
          }),
        ),
      );
    } catch (error) {
      console.error('[MisEstadios] load error:', error);
      this.cards.set([]);
    }

    this.loading.set(false);
  }
}
