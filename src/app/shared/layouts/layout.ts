import { Component, signal, inject, OnInit, effect } from '@angular/core';
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
  lucideUser,
  lucideLogOut,
} from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { BrnNavigationMenuImports } from '@spartan-ng/brain/navigation-menu';
import { HlmNavigationMenuImports } from '@spartan-ng/helm/navigation-menu';
import { Title } from '@angular/platform-browser';
import { filter, map } from 'rxjs/operators';
import { Tooltip } from 'primeng/tooltip';
import { AuthFacade } from '../features/auth/auth.facade';

const PUBLIC_MENU_PATHS = new Set(['home', 'set-password', 'sign-in', 'login']);

@Component({
  selector: 'app-layout',
  imports: [
    HlmSidebarImports,
    HlmButtonImports,
    NgIcon,
    HlmIcon,
    BrnNavigationMenuImports,
    HlmNavigationMenuImports,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Tooltip,
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
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
      lucideUser,
      lucideLogOut,
    }),
  ],
})
export class LayoutComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  readonly authFacade = inject(AuthFacade);

  protected readonly menuItems = signal<Route[]>([]);
  protected readonly title = signal('');

  // Inyectar el servicio de tema
  themeService = inject(ThemeService);

  titleService = inject(Title);
  constructor() {
    console.log('LayoutComponent constructor');

    // Create reactive effect in constructor (injection context) so it can
    // subscribe to permission changes and update menuItems accordingly.
    const layoutRoute = this.router.config.find((r) => r.component === LayoutComponent);
    effect(() => {
      const userPermissions = this.authFacade.permissions();

      this.menuItems.set(
        layoutRoute?.children?.filter((route) => {
          if (route.path === 'not-found') {
            return false;
          }

          return this.canSeeRoute(route, userPermissions);
        }) ?? [],
      );
    });
  }
  protected getTooltipText(title: any): string {
    return typeof title === 'string' ? title : '';
  }

  private canSeeRoute(route: Route, userPermissions: string[]): boolean {
    const routePath = route.path ?? '';
    const isPublicRoute = Boolean(route.data?.['publicRoute']) || PUBLIC_MENU_PATHS.has(routePath);

    if (isPublicRoute) {
      return true;
    }

    const requiredPermission =
      typeof route.data?.['requiredPermission'] === 'string'
        ? route.data['requiredPermission']
        : null;

    if (requiredPermission) {
      return userPermissions.includes(requiredPermission);
    }

    return userPermissions.length > 0;
  }

  async ngOnInit() {
    // Trigger session fetch (populates permissions). The reactive effect in
    // the constructor will update `menuItems` when permissions change.
    await this.authFacade.getSession();

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
