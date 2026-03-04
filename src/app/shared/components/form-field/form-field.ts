import {
  Component,
  inject,
  input,
  OnInit,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NgControl,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ValidationMessageService } from '@/core/services/validation-message.service';

// PrimeNG modules
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { PasswordModule } from 'primeng/password';
import { InputOtpModule } from 'primeng/inputotp';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { EditorModule } from 'primeng/editor';
import { TreeSelectModule } from 'primeng/treeselect';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoComplete } from 'primeng/autocomplete';

import { FormFieldType, SelectOption, TreeNode } from '@/core/models/form-field.model';

let _uid = 0;

@Component({
  selector: 'app-form-field',
  imports: [
    FormsModule,
    TranslatePipe,
    InputTextModule,
    InputNumberModule,
    PasswordModule,
    InputOtpModule,
    SelectModule,
    MultiSelectModule,
    TextareaModule,
    RadioButtonModule,
    EditorModule,
    TreeSelectModule,
    DatePickerModule,
    AutoComplete,
  ],
  templateUrl: './form-field.html',
  styleUrl: './form-field.scss',
})
export class FormField implements ControlValueAccessor, OnInit {
  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly type = input.required<FormFieldType>();
  readonly label = input<string>();
  readonly placeholder = input<string>();
  readonly hint = input<string>();

  // Options-based fields — SelectOption<unknown> keeps the component generic;
  // consumers pass narrower arrays e.g. SelectOption<string>[] without casting.
  readonly options = input<SelectOption<unknown>[]>([]);
  readonly treeNodes = input<TreeNode[]>([]);
  readonly optionLabel = input<string>('label');
  readonly optionValue = input<string>('value');

  // Text / textarea
  readonly maxlength = input<number>();

  // Textarea
  readonly rows = input<number>(4);

  // Number
  readonly min = input<number>();
  readonly max = input<number>();
  readonly mode = input<'decimal' | 'currency'>('decimal');
  readonly currency = input<string>('USD');

  // OTP
  readonly otpLength = input<number>(6);

  // Dropdown / multiselect
  readonly filter = input<boolean>(false);
  readonly showClear = input<boolean>(false);

  // Chips (AutoComplete in free-form multiple mode)
  // Pass a non-empty array to enable typeahead suggestions; leave empty for
  // pure free-form tag input (type any value → Enter / Tab / blur to add).
  readonly suggestions = input<string[]>([]);

  // Datepicker
  readonly minDate = input<Date>();
  readonly maxDate = input<Date>();
  readonly dateFormat = input<string>('dd/mm/yy');
  readonly selectionMode = input<'single' | 'multiple' | 'range'>('single');
  readonly showTime = input<boolean>(false);
  readonly timeOnly = input<boolean>(false);
  readonly showButtonBar = input<boolean>(false);
  readonly showIcon = input<boolean>(true);

  // Editor
  readonly editorStyle = input<Record<string, string>>({ height: '200px' });

  // Disabled — can be set via input prop OR via reactive-form control.disable()
  readonly disabled = input<boolean>(false);

  // ── Stable field ID for <label for=""> linkage ────────────────────────────
  readonly fieldId = `form-field-${++_uid}`;

  // ── CVA state ─────────────────────────────────────────────────────────────
  value: any = null;
  isDisabled = false; // set by Angular when the bound FormControl is disabled
  onChange: (v: any) => void = () => {};
  onTouched: () => void = () => {};

  // ── Services ──────────────────────────────────────────────────────────────
  private validationMessages = inject(ValidationMessageService);

  // NgControl gives us access to the form control's validation state.
  // { self: true } — only look on this element's injector (avoid getting
  // a parent control).  { optional: true } — component can be used outside
  // a form without throwing.
  private ngControl = inject(NgControl, { self: true, optional: true });

  constructor() {
    // Break the circular dependency: we tell NgControl to use *us* as its
    // value accessor instead of it being resolved through NG_VALUE_ACCESSOR.
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnInit(): void {}

  // ── ControlValueAccessor ──────────────────────────────────────────────────
  writeValue(value: any): void {
    this.value = value ?? null;
  }

  registerOnChange(fn: (v: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // True when disabled via input prop OR via FormControl.disable()
  get computedDisabled(): boolean {
    return this.isDisabled || this.disabled();
  }

  handleChange(value: any): void {
    this.value = value;
    this.onChange(value);
  }

  handleBlur(): void {
    this.onTouched();
  }

  // ── Validation state (read by Angular CD on every check cycle) ────────────
  get hasError(): boolean {
    const ctrl = this.ngControl?.control;
    return !!(ctrl?.invalid && (ctrl?.touched || ctrl?.dirty));
  }

  get isRequired(): boolean {
    const ctrl = this.ngControl?.control;
    if (!ctrl?.validator) return false;
    const result = ctrl.validator({ value: null } as any);
    return !!(result?.['required']);
  }

  get errorMessage(): string {
    return this.validationMessages.getMessage(this.ngControl?.control?.errors ?? null);
  }
}
