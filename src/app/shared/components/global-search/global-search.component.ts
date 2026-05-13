import {
  ChangeDetectionStrategy, Component, inject, signal,
  HostListener, ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchResult, SearchService } from '../../../core/services/search.service';

const ENTITY_ROUTE: Record<string, string> = {
  league: 'league',
  user:   'user',
  team:   'teams',
};

const ENTITY_LABEL: Record<string, string> = {
  league: 'Liga',
  user:   'Usuario',
  team:   'Equipo',
};

@Component({
  selector: 'app-global-search',
  imports: [FormsModule],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSearchComponent {
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly elRef = inject(ElementRef);

  protected readonly query = signal('');
  protected readonly results = signal<SearchResult[]>([]);
  protected readonly isOpen = signal(false);
  protected readonly isLoading = signal(false);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  protected onInput(value: string) {
    this.query.set(value);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (!value.trim() || value.length < 2) {
      this.results.set([]);
      this.isOpen.set(false);
      return;
    }
    this.debounceTimer = setTimeout(() => this.runSearch(value), 300);
  }

  private async runSearch(q: string) {
    this.isLoading.set(true);
    const data = await this.searchService.search(q);
    this.results.set(data);
    this.isOpen.set(data.length > 0);
    this.isLoading.set(false);
  }

  protected navigate(result: SearchResult) {
    const base = ENTITY_ROUTE[result.entity_type] ?? result.entity_type;
    this.router.navigate(['/', base, result.entity_id]);
    this.close();
  }

  protected entityLabel(type: string): string {
    return ENTITY_LABEL[type] ?? type;
  }

  protected close() {
    this.isOpen.set(false);
    this.results.set([]);
    this.query.set('');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('keydown.escape')
  onEscape() { this.close(); }
}
