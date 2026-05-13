import { Component, signal, inject, OnInit, OnDestroy, effect } from '@angular/core';
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
  lucideBell,
} from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { BrnNavigationMenuImports } from '@spartan-ng/brain/navigation-menu';
import { HlmNavigationMenuImports } from '@spartan-ng/helm/navigation-menu';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Tooltip } from 'primeng/tooltip';
import { AuthFacade } from '../features/auth/auth.facade';
import { NotificationInboxService } from '../../core/services/notification-inbox.service';
import { NotificationInboxComponent } from '../components/notification-inbox/notification-inbox.component';
import { GlobalSearchComponent } from '../components/global-search/global-search.component';

const PUBLIC_MENU_PATHS = new Set(['home', 'set-password', 'sign-in', 'login']);

interface SidebarMenuItem {
  path: string;
  title: string;
  icon: string;
}

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
    NotificationInboxComponent,
    GlobalSearchComponent,
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
      lucideBell,
    }),
  ],
})
export class LayoutComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private notificationService = inject(NotificationInboxService);
  private destroy$ = new Subject<void>();
  readonly authFacade = inject(AuthFacade);

  protected readonly menuItems = signal<SidebarMenuItem[]>([]);
  protected readonly title = signal('');
  protected readonly showNotifications = signal(false);
  protected readonly headerUnreadCount = signal(0);

  themeService = inject(ThemeService);
  titleService = inject(Title);

  constructor() {
    console.log('LayoutComponent constructor');

    const layoutRoute = this.router.config.find((r) => r.component === LayoutComponent);
    effect(() => {
      const userPermissions = this.authFacade.permissions();

      const visibleRoutes =
        layoutRoute?.children?.filter((route) => {
          if (route.path === 'not-found') {
            return false;
          }
          return this.canSeeRoute(route, userPermissions);
        }) ?? [];

      this.menuItems.set(
        visibleRoutes
          .filter((route): route is Route & { path: string } => typeof route.path === 'string')
          .map((route) => ({
            path: route.path,
            title: typeof route.title === 'string' ? route.title : route.path,
            icon: typeof route.data?.['icon'] === 'string' ? route.data['icon'] : 'lucideCircle',
          })),
      );
    });
  }

  protected getTooltipText(title: any): string {
    return typeof title === 'string' ? title : '';
  }

  protected getRouteLink(path: string): string[] {
    return ['/', path];
  }

  protected toggleNotifications(): void {
    this.showNotifications.update((v) => !v);
  }

  private async refreshUnreadCount(): Promise<void> {
    const uid = Number(this.authFacade.getInternalUserId());
    if (!uid) return;
    const count = await this.notificationService.getUnreadCount(uid);
    this.headerUnreadCount.set(count);
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
    await this.authFacade.getSession();

    await this.refreshUnreadCount();

    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshUnreadCount());

    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((event) => event instanceof NavigationEnd),
      )
      .subscribe(() => {
        // Close notification dropdown on every navigation
        this.showNotifications.set(false);

        // Update page title from the activated route
        let route = this.activatedRoute;
        while (route.firstChild) {
          route = route.firstChild;
        }
        if (route.outlet === 'primary') {
          const pageTitle = route.snapshot.title || 'Sin título';
          this.title.set(pageTitle);
          this.titleService.setTitle(pageTitle);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
