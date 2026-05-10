import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './shell/header.component';
import { FooterComponent } from './shell/footer.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { ToastContainerComponent } from './shared/ui/toast-container/toast-container.component';


/**
 * Root component of the Booknest application.
 * Manages the top-level layout, including the conditional visibility of the header and footer shell.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastContainerComponent],
  templateUrl: './app.html'
})
export class App {
  private router = inject(Router);

  // Track current URL to determine if we should show the shell
  private url = toSignal(this.router.events.pipe(
    map(() => this.router.url)
  ));
  
  // Computed property to decide if the standard navigation shell (header/footer) should be visible
  showShell = computed(() => {
    const currentUrl = this.url();
    if (!currentUrl) return true;
    // Keep shell visible on auth and checkout for consistent search/nav access
    const excludedRoutes = ['/admin'];
    return !excludedRoutes.some(route => currentUrl.startsWith(route));
  });

  protected readonly title = signal('booknest-frontend-app');
}
