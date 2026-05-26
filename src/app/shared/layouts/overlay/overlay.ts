import { Component, inject, model, output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SelectedDisplay } from '../../../shared/features/selected-display/selected-display';
import { DynamicTableService } from '../../../shared/features/dynamic-table/services/dynamic-table.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { filter } from 'rxjs';
import { UI } from '../../../core/constants/ui.constants';

@Component({
  selector: 'app-overlay',
  imports: [SelectedDisplay, DialogModule, ButtonModule],
  templateUrl: './overlay.html',
  styleUrl: './overlay.css',
})
export class Overlay {
  visible = model(false);
  tableService = inject(DynamicTableService);
  // expose UI constants to template to avoid hard-coded literals
  public readonly UI = UI;
  private readonly router = inject(Router);
  private openedFromRoute = false;
  delete = output<string>();
  pageChange = output<{ first: number; rows: number }>();

  constructor() {
    this.syncVisibilityFromRoute(this.router.url);
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigation = event as NavigationEnd;
        this.syncVisibilityFromRoute(navigation.urlAfterRedirects);
      });
  }

  get tableProps() {
    return this.tableService.tableProps;
  }

  get isEditOrDetailRoute(): boolean {
    const pathname = this.router.url.split('?')[0];
    return /\/(edit|detail)$/.test(pathname);
  }

  get dialogHeader(): string {
    if (this.router.url.split('?')[0].endsWith('/detail')) {
      return `Detalle ${this.tableProps().header}`;
    }

    if (this.isEditOrDetailRoute) {
      return `Editar ${this.tableProps().header}`;
    }

    return `Add ${this.tableProps().header}`;
  }

  deletedFn($event: string) {
    this.delete.emit($event);
  }

  onPageChange($event: { first: number; rows: number }) {
    this.pageChange.emit($event);
  }

  onDialogHide() {
    this.visible.set(false);

    if (!this.isEditOrDetailRoute) {
      return;
    }

    const pathname = this.router.url.split('?')[0];
    const segments = pathname.split('/').filter((segment) => segment.length > 0);
    if (segments.length < 2) {
      return;
    }

    const listRoute = `/${segments.slice(0, -2).join('/')}`;
    void this.router.navigateByUrl(listRoute || '/');
  }

  private syncVisibilityFromRoute(url: string) {
    const pathname = url.split('?')[0];
    const routeMode = /\/(edit|detail)$/.test(pathname);

    if (routeMode) {
      this.openedFromRoute = true;
      this.visible.set(true);
      return;
    }

    if (this.openedFromRoute) {
      this.visible.set(false);
      this.openedFromRoute = false;
    }
  }
}
