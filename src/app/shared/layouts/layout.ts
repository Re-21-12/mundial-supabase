import { Component, signal, inject, OnInit, effect, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { WalletService } from '../../core/pages/wallet/wallet.service';
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
  lucideWallet,
  lucideShield,
  lucideSliders,
  lucideDatabase,
  lucideUsers,
  lucideMapPin,
  lucideUserCog,
} from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { BrnNavigationMenuImports } from '@spartan-ng/brain/navigation-menu';
import { HlmNavigationMenuImports } from '@spartan-ng/helm/navigation-menu';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Tooltip } from 'primeng/tooltip';
import { AuthFacade } from '../features/auth/auth.facade';
import { NotificationInboxService } from '../components/notification-inbox/notification-inbox.service';
import { NotificationInboxComponent } from '../components/notification-inbox/notification-inbox.component';
import { GlobalSearchComponent } from '../components/global-search/global-search.component';
import { SupabaseAuthService } from '../../core/services/supabase-auth-service';
import { SupabaseService } from '../../core/services/supabase-service';

const PUBLIC_MENU_PATHS = new Set(['home', 'set-password', 'sign-in', 'login']);

interface SidebarMenuItem {
  path: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-layout',
  imports: [
    CommonModule,
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
      lucideWallet,
      lucideShield,
      lucideSliders,
      lucideDatabase,
      lucideUsers,
      lucideMapPin,
      lucideUserCog,
    }),
  ],
})
export class LayoutComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private notificationService = inject(NotificationInboxService);
  private walletService = inject(WalletService);
  private supabaseAuthService = inject(SupabaseAuthService);
  private supabaseService = inject(SupabaseService);
  private destroyRef = inject(DestroyRef);
  private sessionCheckInProgress = false;
  readonly authFacade = inject(AuthFacade);

  protected readonly menuItems = signal<SidebarMenuItem[]>([]);
  protected readonly title = signal('');
  protected readonly showNotifications = signal(false);
  protected readonly headerUnreadCount = signal(0);
  protected readonly walletBalance = signal<number | null>(null);
  protected readonly showApprovalsMenu = signal(false);

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

      const menuItems = visibleRoutes
        .filter((route): route is Route & { path: string } => typeof route.path === 'string')
        .map((route) => ({
          path: route.path,
          title: typeof route.title === 'string' ? route.title : route.path,
          icon: typeof route.data?.['icon'] === 'string' ? route.data['icon'] : 'lucideCircle',
        }));

      if (this.showApprovalsMenu()) {
        menuItems.push({
          path: 'aprobaciones',
          title: 'Aprobaciones',
          icon: 'lucideShield',
        });
      }

      this.menuItems.set(menuItems);
    });
  }

  protected getTooltipText(title: any): string {
    return typeof title === 'string' ? title : '';
  }

  protected getRouteLink(path: string): string[] {
    return ['/', path];
  }

  protected trackByPath(_: number, item: SidebarMenuItem): string {
    return item.path;
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

  private async verifyActiveSession(): Promise<void> {
    if (this.sessionCheckInProgress) {
      return;
    }

    this.sessionCheckInProgress = true;
    try {
      await this.supabaseAuthService.ensureActiveSession({
        redirectOnFail: true,
        notifyOnFail: true,
      });
    } finally {
      this.sessionCheckInProgress = false;
    }
  }

  private canSeeRoute(route: Route, userPermissions: string[]): boolean {
    const routePath = route.path ?? '';
    const isPublicRoute = Boolean(route.data?.['publicRoute']) || PUBLIC_MENU_PATHS.has(routePath);

    if (isPublicRoute) {
      return true;
    }

    if (route.data?.['hideFromSidebar'] === true) {
      return false;
    }

    // Rutas marcadas adminOnly solo aparecen para administradores
    if (route.data?.['adminOnly'] === true && this.authFacade.role() !== 'admin') {
      return false;
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
    await this.verifyActiveSession();
    if (!this.authFacade.isLoggedIn()) {
      return;
    }

    const role = this.authFacade.role()?.toLowerCase();
    if (role === 'admin') {
      this.showApprovalsMenu.set(true);
    } else {
      const uid = Number(this.authFacade.getInternalUserId());
      if (uid) {
        const { count } = await this.supabaseService.client
          .from('LEAGUE')
          .select('league_id', { count: 'exact', head: true })
          .eq('created_by', uid)
          .eq('is_deleted', false);
        this.showApprovalsMenu.set((count ?? 0) > 0);
      }
    }

    await this.refreshUnreadCount();

    const uid = Number(this.authFacade.getInternalUserId());
    if (uid) {
      const balance = await this.walletService.getBalance(uid);
      this.walletBalance.set(balance);
    }

    interval(60000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshUnreadCount());

    // Keep session healthy in background; if refresh token is expired, user is logged out.
    interval(300000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.verifyActiveSession();
      });

    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
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
}
