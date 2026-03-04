# Training Management System

A full-featured, enterprise-ready training management platform built with Angular 20. It provides a bilingual (English / Arabic) administration interface for managing courses, teachers, and students, with server-side pagination, rich filtering, and a responsive RTL/LTR layout.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Modules Overview](#modules-overview)
- [Internationalization](#internationalization)
- [Architecture Notes](#architecture-notes)
- [Environment Configuration](#environment-configuration)

---

## Features

- **Dashboard** — real-time statistics (courses, teachers, students, enrollments), upcoming session timeline, enrollment fill-rate indicators, and quick-action cards.
- **Courses** — paginated course list with server-side search/filter by title, level, status, and category; add/edit dialog with full validation; course detail view with schedules, materials, and enrolled students.
- **Teachers** — teacher directory with department, rating, and bio; per-teacher evaluation management.
- **Students** — student registry with enrollment tracking and course history.
- **Bilingual UI** — first-class Arabic (RTL) and English (LTR) support with dynamic language switching; all labels, validation messages, and PrimeNG component strings are translated.
- **Authentication guard** — route-level protection for all admin pages.
- **Centralized HTTP error handling** — global interceptor maps 401, 403, 404, and 5xx responses to user-facing toast messages.
- **Responsive design** — mobile-first layout built on Tailwind CSS with custom breakpoints.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 20 (standalone components, signals) |
| UI Library | PrimeNG 20 — Aura theme |
| CSS | Tailwind CSS 4, SCSS, tailwindcss-primeui |
| State | Angular Signals + RxJS 7 |
| i18n | @ngx-translate/core 17 |
| Forms | Angular Reactive Forms |
| HTTP | Angular HttpClient |
| Mock API | JSON Server (json-server 1.x) |
| Testing | Karma + Jasmine |
| Build | Angular CLI 20 / esbuild |

---

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 20 LTS |
| npm | 9 |
| Angular CLI | 20 |

Install the Angular CLI globally if not already present:

```bash
npm install -g @angular/cli@20
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd training-management-system-scss
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the mock API and development server

```bash
npm run start:mock
```

This single command runs both the JSON Server mock API (port **3000**) and the Angular dev server (port **4200**) in parallel.

Open your browser at **http://localhost:4200**.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm start` | Start the Angular development server only |
| `npm run mock` | Start the JSON Server mock API on port 3000 |
| `npm run start:mock` | Start both mock API and dev server concurrently |
| `npm run build` | Production build with optimisation |
| `npm run watch` | Development build in watch mode |
| `npm test` | Run unit tests via Karma |

---

## Project Structure

```
src/
├── app/
│   ├── core/                     # Singleton services, guards, interceptors, base models
│   │   ├── guards/               # authGuard
│   │   ├── interceptors/         # HTTP error interceptor
│   │   ├── models/               # Shared interfaces (table, form-field)
│   │   ├── pages/                # NotFoundComponent (404)
│   │   ├── services/             # LanguageService, ValidationMessageService
│   │   └── validators/           # Custom reactive-form validators
│   │
│   ├── features/                 # Feature modules (lazy-loaded)
│   │   ├── dashboard/
│   │   │   ├── components/       # StatsCard
│   │   │   └── pages/            # DashboardHome
│   │   ├── courses/
│   │   │   ├── components/       # CourseDialog, ScheduleDialog, MaterialDialog
│   │   │   ├── models/           # Course, Schedule, Material, Enrollment
│   │   │   ├── pages/            # CourseList, CourseDetail
│   │   │   └── services/         # CoursesService, SchedulesService, MaterialsService, EnrollmentsService
│   │   ├── students/
│   │   │   ├── components/       # StudentDialog
│   │   │   ├── models/
│   │   │   ├── pages/            # PageList, PageDetail
│   │   │   └── services/         # StudentsService
│   │   └── teachers/
│   │       ├── components/       # TeacherDialog, EvaluationDialog
│   │       ├── models/
│   │       ├── pages/            # PageList, PageDetail
│   │       └── services/         # TeachersService, EvaluationsService
│   │
│   ├── layout/                   # Shell components
│   │   ├── admin-layout/         # Sidebar + header wrapper
│   │   └── footer/
│   │
│   ├── shared/                   # Reusable, feature-agnostic building blocks
│   │   ├── components/
│   │   │   ├── app-table/        # Generic server-side paginated table + cell directive
│   │   │   └── form-field/       # Universal CVA form field (text, number, dropdown, datepicker …)
│   │   ├── pipes/
│   │   └── styles/               # Global PrimeNG form overrides (_forms.scss)
│   │
│   ├── app.config.ts             # Root providers (router, HTTP, translate, PrimeNG)
│   ├── app.routes.ts             # Top-level route definitions
│   └── app.ts                    # Root component
│
├── assets/
│   └── i18n/
│       ├── en.json               # English translations
│       └── ar.json               # Arabic translations
│
├── environments/
│   ├── environment.ts            # Base (development → localhost:3000)
│   ├── environment.development.ts
│   ├── environment.prod.ts
│   ├── environment.stage.ts
│   └── environment.test.ts
│
├── styles.scss                   # Global styles entry point
└── tailwind.css                  # Tailwind layers + custom design tokens
```

---

## Modules Overview

### Dashboard

- Summary statistic cards (total courses, teachers, students, enrollments).
- Upcoming sessions timeline with relative dates.
- Enrollment fill-rate indicators per active course.
- Quick-action navigation links to each management section.

### Courses

| Capability | Detail |
|---|---|
| Listing | Server-side pagination, sort by title / code, filter by title, level, status, and category |
| Add / Edit | Reactive form dialog — bilingual titles, code, category, level, teacher, start/end dates (end > start enforced), duration, seats, price, and summary |
| Detail view | Course metadata, session schedule management, material library, enrolled students list |

### Teachers

- Searchable teacher list with department, rating, and active/inactive status.
- Add/edit dialog with bilingual name, department, bio, specialties, and contact info.
- Per-teacher evaluation records (reviewer, star rating, comment, date).

### Students

- Student registry with status management.
- Course enrollment history on the detail page.

---

## Internationalization

The application fully supports **English** and **Arabic** including right-to-left layout.

| Mechanism | Usage |
|---|---|
| `TranslatePipe` | Template string keys (`'KEY' \| translate`) |
| `TranslateService.instant()` | Imperative strings (option arrays, toast messages, confirm dialogs) |
| `LanguageService` | Wraps ngx-translate + PrimeNG locale + `dir` / `lang` HTML attributes; exposes a `currentLang` signal |
| PrimeNG locale | Day/month names, datepicker UI strings updated on every language switch |

Language preference is persisted in `localStorage`. To add a new language:

1. Create `src/assets/i18n/<code>.json` mirroring the existing key structure.
2. Register the language in `LanguageService.languages`.
3. Add a PrimeNG locale payload in `LanguageService` if datepicker localisation is needed.

---

## Architecture Notes

### Standalone Components

All components use Angular's standalone API (no NgModules). They are imported directly into templates or registered in lazy-loaded route configuration files.

### Angular Signals

Reactive state is managed with Angular Signals (`signal`, `computed`, `effect`) in preference to `BehaviorSubject`.

> **Important pattern:** `computed` signals are only used for data that derives purely from other signals (e.g., `teacherOptions` or `categoryOptions` which map raw signal data to translated labels using the `currentLang` signal). Option lists that rely on `TranslateService.instant()` are exposed as plain `get` accessors instead of `computed` signals. This ensures `instant()` is always called during Angular's change-detection cycle with the currently loaded translation file, avoiding stale cached labels after a language switch.

### Generic Form Field (`app-form-field`)

A single `ControlValueAccessor` component covers every PrimeNG input type:

```
text | number | password | otp | dropdown | multiselect |
chips | textarea | radio | datepicker | editor | tree-select
```

Bind `type="..."` and `formControlName`; the component handles `p-invalid` styling and validation error messages internally via `NgControl`.

### Generic Table (`app-table`)

Wraps PrimeNG `p-table` and emits `PageRequest` events (page, size, sortField, sortOrder) for server-side data fetching. Column cell templates are injected with the `appCell="fieldName"` structural directive.

### Mock Backend

`mock-server/db.json` is served by JSON Server and mimics a REST API for all entities. Pagination, sorting, and field-level filtering are supported via JSON Server query parameters and mapped in the service layer.

---

## Environment Configuration

| File | Purpose |
|---|---|
| `environment.ts` | Base / default configuration |
| `environment.development.ts` | Development — `API_BASE_URL: http://localhost:3000` |
| `environment.prod.ts` | Production — set `API_BASE_URL` to the live API endpoint |
| `environment.stage.ts` | Staging environment |
| `environment.test.ts` | Test / CI environment |

The active environment file is swapped at build time by Angular's `fileReplacements` in `angular.json`. To target a real API, update `API_BASE_URL` in the appropriate environment file and build with the matching configuration:

```bash
ng build --configuration production
```

---

## License

This project is private. All rights reserved.
