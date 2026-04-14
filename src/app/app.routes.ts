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
        loadComponent: () => import('./shared/features/photo/photo').then((m) => m.PhotoComponent),
      },
      {
        path: 'not-found',
        title: 'Page Not Found',
        data: {
          description: 'Page not found',
        },
        loadComponent: () => import('./core/pages/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
