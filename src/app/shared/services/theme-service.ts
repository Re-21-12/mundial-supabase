import { Injectable, effect, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // Signal para manejar el estado del tema
  // Inicializa revisando localStorage o la preferencia del sistema
  darkMode = signal<boolean>(
    JSON.parse(
      localStorage.getItem('darkMode') ??
        window.matchMedia('(prefers-color-scheme: dark)').matches.toString(),
    ),
  );

  constructor() {
    // Effect corre automáticamente cada vez que darkMode cambia
    effect(() => {
      const isDark = this.darkMode();
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('darkMode', JSON.stringify(isDark));
    });
  }

  toggleTheme() {
    const element = document.querySelector('html');
    element!.classList.toggle('dark');
    this.darkMode.update((dark) => !dark);
  }
}
