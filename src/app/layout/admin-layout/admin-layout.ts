import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { Sidebar } from '../sidebar/sidebar';
import { LanguageService } from '@/core/services/language.service';

@Component({
  selector: 'app-admin-layout',
  imports: [Header, Footer, Sidebar, RouterOutlet, ToastModule, ConfirmDialogModule],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  private langService = inject(LanguageService);

  isSidebarOpen = false;
  isRtl = computed(() => this.langService.currentLang() === 'ar');

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
