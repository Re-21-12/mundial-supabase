import { Component, signal, inject, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Route,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ThemeService } from '../services/theme-service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideSun,
  lucideMoon,
  lucideCheck,
  lucideChevronDown,
  lucideCircle,
  lucideInfo,
  lucideLink,
  lucideHome,
  lucideHeart,
  lucideImage,
} from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { BrnNavigationMenuImports } from '@spartan-ng/brain/navigation-menu';
import { HlmNavigationMenuImports } from '@spartan-ng/helm/navigation-menu';
import { Title } from '@angular/platform-browser';
import { filter, map } from 'rxjs/operators';

const SPARTAN = [
  HlmSidebarImports,
  HlmButtonImports,
  NgIcon,
  HlmIcon,
  BrnNavigationMenuImports,
  HlmNavigationMenuImports,
];
@Component({
  selector: 'app-layout',
  imports: [...SPARTAN, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  providers: [
    provideIcons({
      lucideSun,
      lucideMoon,
      lucideHome,
      lucideHeart,
      lucideImage,
      lucideChevronDown,
      lucideLink,
      lucideCircle,
      lucideCheck,
      lucideInfo,
    }),
  ],
})
export class LayoutComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  protected readonly menuItems = signal<Route[]>([]);
  protected readonly title = signal('');

  // Inyectar el servicio de tema
  themeService = inject(ThemeService);

  titleService = inject(Title);

  protected getTooltipText(title: any): string {
    return typeof title === 'string' ? title : '';
  }

  ngOnInit() {
    const layoutRoute = this.router.config.find((r) => r.component === LayoutComponent);
    this.menuItems.set(layoutRoute?.children?.filter((r) => r.path !== 'not-found') ?? []);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => {
          let route = this.activatedRoute;
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        filter((route) => route.outlet === 'primary'),
        map((route) => route.snapshot.title),
      )
      .subscribe((pageTitle: string | undefined) => {
        const title = pageTitle || 'Sin título';
        this.title.set(title);
        this.titleService.setTitle(title);
      });
  }
}
