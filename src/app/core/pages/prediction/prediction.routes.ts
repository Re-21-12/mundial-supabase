import { PreditcionClient } from './preditcion-client/preditcion-client';
import { Routes } from '@angular/router';

export const PREDICTION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./prediction').then((m) => m.PredictionPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./prediction').then((m) => m.PredictionPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./prediction').then((m) => m.PredictionPage),
  },
  {
    path: ':id/detail',
    loadComponent: () => import('./prediction').then((m) => m.PredictionPage),
  },
  {
    path: 'prediction-client/:id',
    loadComponent: () =>
      import('./preditcion-client/preditcion-client').then((m) => m.PreditcionClient),
  },
];
