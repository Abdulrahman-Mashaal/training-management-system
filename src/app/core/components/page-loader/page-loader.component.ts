import { Component, inject } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { LoaderService } from '@/core/services/loader.service';

@Component({
  selector: 'app-page-loader',
  standalone: true,
  imports: [ProgressBarModule],
  template: `
    @if (loaderSvc.isLoading()) {
      <div class="fixed top-0 left-0 right-0 z-[9999]">
        <p-progressBar mode="indeterminate" [style]="{ height: '4px' }"></p-progressBar>
      </div>
    }
  `,
})
export class PageLoaderComponent {
  public loaderSvc = inject(LoaderService);
}
