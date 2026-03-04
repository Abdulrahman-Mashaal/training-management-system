import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '@/core/services/language.service';
import { PageLoaderComponent } from '@/core/components/page-loader/page-loader.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PageLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Eagerly instantiate LanguageService so it reads localStorage and sets
  // the correct dir/lang on <html> before any child component renders.
  private readonly _lang = inject(LanguageService);
}
