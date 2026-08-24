# Design Spec: Role-Based Home, Star Ratings, and Login Entry Flow

## 1. Overview & Objectives

1. **Star Ratings in Summary Card (`/insights/[id]`)**:
   - In the company details summary card (ข้อมูลสรุป), replace the percentage `%` in "ระดับความพึงพอใจ" with Star Ratings (⭐ e.g. `4.8 / 5.0 ⭐` with gold star icons).

2. **Dedicated External / Enterprise Home Page**:
   - External users (logged in with non-@htc.ac.th emails / `role: "external"` or `role: "employer"`) see a dedicated, privacy-protected Home page built using the existing system design/theme.
   - Zero student personal identifiable data (PDPA Safe).
   - Includes a banner/option for external users who are actually HTC students using personal Gmail to submit student verification (`StudentVerificationModal`).

3. **Login as Entry Gate**:
   - When a guest (unauthenticated user) visits the site root `/`, display or direct them to the Login page.
   - Upon logging in:
     - College domain `@htc.ac.th` or verified student -> Student Home
     - External email (Gmail / Employer / Guest) -> External Home
     - Admin -> `/admin`

---

## 2. Component Architecture

```
frontend/
├── app/
│   ├── page.tsx                    # Controller: unauthenticated -> Login gate, student -> StudentHome, external -> ExternalHome
│   ├── insights/
│   │   └── [id]/page.tsx           # Company detail: replace % with Stars (⭐) in summary card
│   └── auth/login/page.tsx         # Login component
└── components/
    ├── home/
    │   ├── StudentHomeView.tsx     # Student Home (matches current student experience)
    │   └── ExternalHomeView.tsx    # External Home (matches current system theme, PDPA safe, includes verification button)
    └── ...
```

---

## 3. Detailed Specification

### A. Company Detail Summary Card (`frontend/app/insights/[id]/page.tsx`)
- In `Box 3: ระดับความพึงพอใจ`:
  - Current: `{company.avg_score ? `${Math.round((company.avg_score / 5) * 100)}%` : "96%"}`
  - Updated: Render gold star icon + `4.8 / 5.0` (or `(company.avg_score).toFixed(1) / 5.0`).

### B. External Home View (`frontend/components/home/ExternalHomeView.tsx`)
- Same visual design language and CSS classes as existing HTC Insights pages (`hero-gradient`, `font-headline`, `bg-surface`, `border-outline-variant`).
- Content:
  - Hero for enterprises & external visitors
  - Student Verification prompt for HTC students who logged in using personal email
  - Departments & Vocational Skills aggregated overview
  - Partner companies with Star Ratings
  - Collaboration & Job posting CTAs
  - 100% PDPA Safe (no student names, IDs, phone numbers, or private review texts)

### C. Root Home Gate (`frontend/app/page.tsx`)
- If not logged in: Render the Login Experience seamlessly.
- If logged in as student / @htc.ac.th: Render `StudentHomeView`.
- If logged in as external / employer: Render `ExternalHomeView`.

---

## 4. Verification Plan
- Check `/insights/[id]` to verify the satisfaction box renders star score instead of `%`.
- Check unauthenticated visit to `/` shows login view.
- Check login with `@htc.ac.th` routes to Student Home.
- Check login with external email routes to External Home with student verification option available.
