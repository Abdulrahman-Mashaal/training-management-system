import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [ButtonModule, TranslatePipe],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div class="text-center">
        <h1 class="text-9xl font-extrabold text-primary-600">404</h1>
        <h2 class="text-3xl font-bold text-gray-800 mt-4 mb-2">
          {{ 'COMMON.NOT_FOUND_TITLE' | translate }}
        </h2>
        <p class="text-gray-500 mb-8 max-w-md mx-auto">
          {{ 'COMMON.NOT_FOUND_MSG' | translate }}
        </p>
        <p-button
          icon="pi pi-home"
          [label]="'COMMON.BACK_TO_HOME' | translate"
          (onClick)="goHome()"
        />
      </div>
    </div>
  `,
})
export class NotFoundComponent {
  private router = inject(Router);

  goHome(): void {
    this.router.navigate(['/']);
  }
}
