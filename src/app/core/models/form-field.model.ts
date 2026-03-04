import { TreeNode } from 'primeng/api';

// ── Field types ────────────────────────────────────────────────────────────────
export type FormFieldType =
  | 'text'
  | 'number'
  | 'password'
  | 'otp'
  | 'dropdown'
  | 'multiselect'
  | 'chips'
  | 'tree-select'
  | 'textarea'
  | 'radio'
  | 'editor'
  | 'datepicker';

// ── Option shape used by dropdown / multiselect / radio ──────────────────────
// T defaults to `unknown` — callers should narrow it to their actual value type,
// e.g. SelectOption<string>, SelectOption<number>, SelectOption<UserDto>, etc.
export interface SelectOption<T = unknown> {
  label: string; // plain string or translation key
  value: T;
  disabled?: boolean;
}

// ── Re-export TreeNode so consumers only need to import from this model ───────
export type { TreeNode };
