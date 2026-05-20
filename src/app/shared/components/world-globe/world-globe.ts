import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import type { GrupoCard } from '../../../core/pages/home/models/home.models';

const GROUP_ACCENTS: Record<string, string> = {
  A: '#00C853', B: '#D50000', C: '#FF6D00', D: '#2962FF',
  E: '#AA00FF', F: '#C6D400', G: '#C51162', H: '#00B8D4',
  I: '#6200EA', J: '#558B2F', K: '#E65100', L: '#00695C',
};

const TEAM_ISO: Record<string, string> = {
  'México': 'MEX',     'Francia': 'FRA',      'Japón': 'JPN',            'Cabo Verde': 'CPV',
  'Canadá': 'CAN',     'Bélgica': 'BEL',      'Marruecos': 'MAR',        'Colombia': 'COL',
  'España': 'ESP',     'Túnez': 'TUN',         'Uzbekistán': 'UZB',
  'Estados Unidos': 'USA', 'Arabia Saudita': 'SAU', 'Paraguay': 'PRY',   'Jordania': 'JOR',
  'Argentina': 'ARG',  'Egipto': 'EGY',        'Guatemala': 'GTM',
  'Inglaterra': 'GBR', 'Ghana': 'GHA',          'Islandia': 'ISL',        'Panamá': 'PAN',
  'Brasil': 'BRA',     'Qatar': 'QAT',          'Nueva Zelanda': 'NZL',
  'Alemania': 'DEU',   'Argelia': 'DZA',        'República Checa': 'CZE',
  'Portugal': 'PRT',   'Corea del Sur': 'KOR',  'Uruguay': 'URY',
  'Países Bajos': 'NLD', 'Senegal': 'SEN',      'Irak': 'IRQ',            'Perú': 'PER',
  'Croacia': 'HRV',    'Ecuador': 'ECU',        'Bosnia y Herzegovina': 'BIH', 'Australia': 'AUS',
  'Serbia': 'SRB',     'Austria': 'AUT',        'Costa de Marfil': 'CIV', 'Haití': 'HTI',
};

const GEOJSON_URL =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

@Component({
  selector: 'app-world-globe',
  standalone: true,
  imports: [],
  templateUrl: './world-globe.html',
  styleUrl: './world-globe.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldGlobeComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('globeEl', { static: true }) globeEl!: ElementRef<HTMLDivElement>;

  private _grupos: GrupoCard[] = [];
  @Input() set grupos(value: GrupoCard[]) {
    this._grupos = value;
    if (this.globe && this.geoFeatures.length && value.length) {
      this.zone.runOutsideAngular(() => this.applyColors());
    }
  }
  get grupos(): GrupoCard[] { return this._grupos; }

  private readonly zone = inject(NgZone);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private globe: any = null;
  private geoFeatures: object[] = [];
  private isoColorMap = new Map<string, string>();
  private isoTeamMap = new Map<string, string>();
  private isoGroupMap = new Map<string, string>();

  protected readonly loading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly hoveredInfo = signal<{ team: string; group: string } | null>(null);

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.initGlobe());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['grupos'] && this.globe && this.geoFeatures.length && this._grupos.length) {
      this.zone.runOutsideAngular(() => this.applyColors());
    }
  }

  ngOnDestroy(): void {
    if (this.globe) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.globe._destructor?.();
      this.globe = null;
    }
  }

  private async initGlobe(): Promise<void> {
    try {
      const [GlobeMod, geoData] = await Promise.all([
        import('globe.gl'),
        fetch(GEOJSON_URL).then((r) => r.json() as Promise<{ features: object[] }>),
      ]);

      this.geoFeatures = geoData.features;
      console.log('[Globe] GeoJSON loaded, features:', this.geoFeatures.length, '| grupos:', this._grupos.length);
      this.buildColorMap();

      const el = this.globeEl.nativeElement;
      const g = new GlobeMod.default(el, { animateIn: true });
      g.width(el.clientWidth)
        .height(el.clientHeight)
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.4)
        .hexPolygonUseDots(true)
        .hexPolygonColor((f: object) => this.getHexColor(f));
      // hexPolygonsData is intentionally NOT set here — applyColors() sets it
      // on first call so all H3 cells are created fresh with the correct colors.

      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.35;
      this.globe = g;

      g.onHexPolygonHover((feat) => {
        const iso = (feat as Record<string, Record<string, string>> | null)?.['properties']?.['ISO_A3'];
        const team = iso ? this.isoTeamMap.get(iso) : undefined;
        const group = iso ? this.isoGroupMap.get(iso) : undefined;
        this.zone.run(() =>
          this.hoveredInfo.set(team ? { team, group: group ?? '' } : null),
        );
      });

      if (this._grupos.length) {
        console.log('[Globe] grupos already loaded at init time, applying colors');
        this.applyColors();
      }

      this.zone.run(() => this.loading.set(false));
    } catch {
      this.zone.run(() => {
        this.hasError.set(true);
        this.loading.set(false);
      });
    }
  }

  private applyColors(): void {
    this.buildColorMap();
    console.log('[Globe] applyColors → isoColorMap size:', this.isoColorMap.size);
    // Clear first so globe.gl sees all features as NEW on re-add → re-evaluates
    // hexPolygonColor for each cell (avoids stale cached colors on same object refs).
    this.globe.hexPolygonsData([]);
    requestAnimationFrame(() => {
      if (this.globe && this.geoFeatures.length) {
        this.globe
          .hexPolygonColor((f: object) => this.getHexColor(f))
          .hexPolygonsData([...this.geoFeatures]);
      }
    });
  }

  private buildColorMap(): void {
    this.isoColorMap.clear();
    this.isoTeamMap.clear();
    this.isoGroupMap.clear();
    for (const grupo of this._grupos) {
      const color = GROUP_ACCENTS[grupo.name] ?? '#888';
      for (const team of grupo.teams) {
        const iso = TEAM_ISO[team.team_name];
        if (iso) {
          this.isoColorMap.set(iso, color);
          this.isoTeamMap.set(iso, team.team_name);
          this.isoGroupMap.set(iso, grupo.name);
        }
      }
    }
  }

  private getHexColor(feat: unknown): string {
    const iso = (feat as Record<string, Record<string, string>>)['properties']?.['ISO_A3'];
    return this.isoColorMap.get(iso) ?? 'rgba(50, 55, 80, 0.22)';
  }
}
