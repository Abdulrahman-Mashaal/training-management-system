import { Component, EventEmitter, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LangSwitcher } from '@/shared/components/lang-switcher/lang-switcher';

@Component({
  selector: 'app-header',
  imports: [TranslatePipe, LangSwitcher],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Output() toggleSidebar = new EventEmitter<void>();
}
