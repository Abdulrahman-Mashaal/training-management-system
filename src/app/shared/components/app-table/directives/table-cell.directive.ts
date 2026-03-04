import { Directive, inject, input, TemplateRef } from '@angular/core';

/**
 * Structural marker directive that captures a custom cell template from the
 * parent and keys it to a column field name.
 *
 * Usage in the consumer template:
 *   <ng-template appCell="status" let-row>
 *     <p-tag [value]="row.status" />
 *   </ng-template>
 *
 *   <ng-template appCell="actions" let-row>
 *     <p-button icon="pi pi-pencil" [text]="true" (click)="edit(row)" />
 *   </ng-template>
 *
 * AppTable collects all directives via contentChildren() and builds a
 * Map<field, TemplateRef> for O(1) lookup during rendering.
 */
@Directive({
  selector: '[appCell]',
  standalone: true,
})
export class TableCellDirective {
  /** Column field name this template is bound to (passed as the directive value) */
  readonly field = input.required<string>({ alias: 'appCell' });

  /** The <ng-template> reference — injected automatically */
  readonly tpl = inject(TemplateRef<{ $implicit: unknown }>);
}
