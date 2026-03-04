import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LangSwitcher } from '@/shared/components/lang-switcher/lang-switcher';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LangSwitcher],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  @Output() closeSidebar = new EventEmitter<void>();

  menuItems = [
    { label: 'SIDEBAR.DASHBOARD', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'SIDEBAR.COURSES', icon: 'pi pi-book', route: '/courses' },
    { label: 'SIDEBAR.STUDENTS', icon: 'pi pi-users', route: '/students' },
    { label: 'SIDEBAR.TEACHERS', icon: 'pi pi-id-card', route: '/teachers' },
  ];
}
