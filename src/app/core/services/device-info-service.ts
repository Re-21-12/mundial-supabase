import { Injectable, inject } from '@angular/core'; // Importa inject
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, distinctUntilChanged, map, shareReplay } from 'rxjs';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

@Injectable({
  providedIn: 'root',
})
export class DeviceInfoService {
  private breakpointObserver = inject(BreakpointObserver);

  private breakpoint$ = this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.Tablet]);

  device$: Observable<DeviceType> = this.breakpoint$.pipe(
    map((state) => {
      if (
        state.breakpoints[Breakpoints.HandsetPortrait] ||
        state.breakpoints[Breakpoints.HandsetLandscape]
      ) {
        return 'mobile';
      }
      if (
        state.breakpoints[Breakpoints.TabletPortrait] ||
        state.breakpoints[Breakpoints.TabletLandscape]
      ) {
        return 'tablet';
      }
      return 'desktop';
    }),
    distinctUntilChanged(),
    shareReplay(1),
  );
  isMobile$: Observable<boolean> = this.device$.pipe(map((d) => d === 'mobile'));
  isTablet$: Observable<boolean> = this.device$.pipe(map((d) => d === 'tablet'));
  isDesktop$: Observable<boolean> = this.device$.pipe(map((d) => d === 'desktop'));
}
