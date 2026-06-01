import { Component, signal, computed, inject, OnInit, effect, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  NavigationEnd,
  Route,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Routes,
} from '@angular/router';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ThemeService } from '../services/theme-service';
import { WalletService } from '../../core/pages/admin/wallet/wallet.service';
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
  lucideTrophy,
  lucideMenu,
  lucideX,
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
      lucideTrophy,
      lucideMenu,
      lucideX,
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

  protected readonly clientItems = signal<SidebarMenuItem[]>([]);
  protected readonly adminItems = signal<SidebarMenuItem[]>([]);
  protected readonly clientExpanded = signal(false);
  protected readonly adminExpanded = signal(false);
  protected readonly menuItems = computed(() => [...this.clientItems(), ...this.adminItems()]);
  protected readonly clientChildItems = signal<SidebarMenuItem[]>([]);
  protected readonly clientMenu = computed(() => [
    ...this.clientItems(),
    ...this.clientChildItems(),
  ]);
  protected readonly title = signal('');
  protected readonly showNotifications = signal(false);
  protected readonly showMobileMenu = signal(false);
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
          if (route.path === 'not-found') return false;
          return this.canSeeRoute(route, userPermissions);
        }) ?? [];

      const clientItems: SidebarMenuItem[] = [];
      const adminItems: SidebarMenuItem[] = [];

      for (const route of visibleRoutes) {
        if (typeof route.path !== 'string') continue;
        if (route.data?.['hideFromSidebar'] === true) continue;
        const item: SidebarMenuItem = {
          path: route.path,
          title: typeof route.title === 'string' ? route.title : route.path,
          icon: typeof route.data?.['icon'] === 'string' ? route.data['icon'] : 'lucideCircle',
        };
        if (route.data?.['adminOnly'] === true) {
          adminItems.push(item);
        } else {
          // Skip the parent `client` top-level route from the list (we show its children instead)
          if (route.path === 'client') continue;
          clientItems.push(item);
        }
      }

      if (this.showApprovalsMenu()) {
        clientItems.push({ path: 'aprobaciones', title: 'Aprobaciones', icon: 'lucideShield' });
      }

      this.clientItems.set(clientItems);
      this.adminItems.set(adminItems);

      // Try to load child routes for the `client` group so we can display them
      try {
        import('../../core/pages/client/client.routes').then((m) => {
          const childRoutes = (m.CLIENT_ROUTES as Routes) || [];
          const childItems: SidebarMenuItem[] = [];
          for (const r of childRoutes) {
            if (!r || typeof r.path !== 'string') continue;
            if (r.data?.['hideFromSidebar'] === true) continue;
            if (!this.canSeeRoute(r, this.authFacade.permissions())) continue;
            const childPath = r.path ? `client/${r.path}` : 'client';
            childItems.push({
              path: childPath,
              title: typeof r.title === 'string' ? r.title : r.path,
              icon: typeof r.data?.['icon'] === 'string' ? r.data['icon'] : 'lucideCircle',
            });
          }
          this.clientChildItems.set(childItems);
        });
      } catch (e) {
        this.clientChildItems.set([]);
      }
    });
  }

  protected getTooltipText(title: any): string {
    return typeof title === 'string' ? title : '';
  }

  protected getRouteLink(path: string): string[] {
    if (!path) return ['/'];
    const segments = path.split('/').filter(Boolean);
    return ['/', ...segments];
  }

  protected trackByPath(_: number, item: SidebarMenuItem): string {
    return item.path;
  }

  protected toggleNotifications(): void {
    this.showNotifications.update((v) => !v);
  }

  protected toggleMobileMenu(): void {
    this.showMobileMenu.update((v) => !v);
  }

  protected closeMobileMenu(): void {
    this.showMobileMenu.set(false);
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
        this.showMobileMenu.set(false);

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
        // Expand admin and client menus automatically when navigating to related routes
        try {
          const url = this.router.url || '';
          this.adminExpanded.set(url.startsWith('/admin') || url.includes('/admin/'));
          // Expand client group when navigating under /client
          this.clientExpanded.set(url.startsWith('/client') || url.includes('/client/'));
        } catch (e) {
          this.adminExpanded.set(false);
          this.clientExpanded.set(false);
        }
      });
  }

  protected toggleAdmin(): void {
    this.adminExpanded.update((v) => !v);
  }

  protected toggleClient(): void {
    this.clientExpanded.update((v) => !v);
  }
}
