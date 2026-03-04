import { Component, HostListener, inject, signal } from '@angular/core';
import { LanguageService } from '@/core/services/language.service';

@Component({
  selector: 'app-lang-switcher',
  imports: [],
  templateUrl: './lang-switcher.html',
  styleUrl: './lang-switcher.scss',
})
export class LangSwitcher {
  protected langService = inject(LanguageService);
  protected isOpen = signal(false);

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.update((v) => !v);
  }

  selectLang(code: string): void {
    this.langService.setLanguage(code);
    this.isOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isOpen.set(false);
  }
}
