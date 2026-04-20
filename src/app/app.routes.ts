import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layouts/layout';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        title: 'Home',
        data: {
          description: 'Welcome to the home page',
          icon: 'lucideHome',
        },
        loadComponent: () => import('./core/pages/home/home').then((m) => m.Home),
      },
      {
        path: 'taste',
        title: 'Taste',
        data: {
          description: 'Discover new flavors',
          icon: 'lucideHeart',
        },
        loadComponent: () => import('./core/pages/taste/taste').then((m) => m.Taste),
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
      },
      {
        path: 'ocr',
        title: 'OCR Scanner',
        data: {
          description: 'Scan and recognize text in images',
          icon: 'lucideImage',
        },
        loadComponent: () => import('./shared/features/ocr/ocr').then((m) => m.Ocr),
      },
      {
        path: 'page-error',
        title: 'Page Error',
        data: {
          description: 'An error occurred',
        },
        loadComponent: () =>
          import('./shared/features/page-error/page-error').then((m) => m.PageError),
      },
      {
        path: 'teams',
        title: 'Teams',
        data: {
          description: 'List of teams',
          icon: 'lucideUsers',
        },
        loadComponent: () => import('./core/pages/teams/teams').then((m) => m.Teams),
      },
      {
        path: 'catalog',
        title: 'Catalog',
        data: {
          description: 'List of catalogs',
          icon: 'lucideDatabase',
        },
        loadComponent: () => import('./core/pages/catalog/catalog').then((m) => m.Catalog),
      },
      {
        path: 'auth',
        title: 'Authentication',
        data: {
          description: 'User authentication',
          icon: 'lucideUser',
        },
        loadComponent: () => import('./core/components/auth/auth').then((m) => m.Auth),
      },
    ],
  },
];
