import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layouts/layout';
import { authGuard } from './shared/features/auth/guard/auth-guard';

export const routes: Routes = [
  {
    path: 'auth/callback',
    title: 'Auth Callback',
    loadComponent: () =>
      import('./shared/features/auth/callback/auth-callback').then((m) => m.AuthCallback),
  },
  {
    path: 'login',
    pathMatch: 'full',
    redirectTo: 'auth',
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'home',
        title: 'Home',
        data: {
          description: 'Welcome to the home page',
          icon: 'lucideHome',
        },
        loadComponent: () => import('./core/pages/home/home').then((m) => m.Home),
        canActivate: [authGuard],
      },
      {
        path: 'taste',
        title: 'Taste',
        data: {
          description: 'Discover new flavors',
          icon: 'lucideHeart',
        },
        loadComponent: () => import('./core/pages/taste/taste').then((m) => m.Taste),
        canActivate: [],
      },
      {
        path: 'photo',
        title: 'Photo Gallery',
        data: {
          description: 'View our photo gallery',
          icon: 'lucideImage',
        },
        loadComponent: () =>
          import('./shared/features/camera/camera').then((m) => m.CameraComponent),
        canActivate: [],
      },
      {
        path: 'ocr',
        title: 'OCR Scanner',
        data: {
          description: 'Scan and recognize text in images',
          icon: 'lucideImage',
        },
        loadComponent: () => import('./shared/features/ocr/ocr').then((m) => m.Ocr),
        canActivate: [],
      },
      {
        path: 'page-error',
        title: 'Page Error',
        data: {
          description: 'An error occurred',
        },
        loadComponent: () =>
          import('./shared/features/page-error/page-error').then((m) => m.PageError),
        canActivate: [],
      },
      {
        path: 'teams',
        title: 'Teams',
        data: {
          description: 'List of teams',
          icon: 'lucideUsers',
        },
        loadComponent: () => import('./core/pages/teams/teams').then((m) => m.Teams),
        canActivate: [],
      },
      {
        path: 'catalog',
        title: 'Catalog',
        data: {
          description: 'List of catalogs',
          icon: 'lucideDatabase',
        },
        loadComponent: () => import('./core/pages/catalog/catalog').then((m) => m.Catalog),
        canActivate: [],
      },
      {
        path: 'auth',
        title: 'Authentication',
        data: {
          description: 'User authentication',
          icon: 'lucideUser',
        },
        loadComponent: () => import('./shared/features/auth/auth').then((m) => m.Auth),
        canActivate: [],
      },
    ],
  },
];
