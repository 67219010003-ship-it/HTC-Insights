# Anonymous Removal, Backup & Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely eliminate anonymous fields (`is_anonymous`, `anon_identity_enc`) from database and code, immediately reveal student real names across all views, produce a full project ZIP backup, and restructure the admin page into a primary dual-mode switcher with a rich statistical dashboard and Print-to-PDF report.

**Architecture:** Database schema migration via SQLAlchemy/PyMySQL dropping anonymous columns; backend refactor in models, schemas, and routers to serve real author identities directly; frontend cleanup across reviews, community, and profile pages; admin page refactor with mode state separating Executive Dashboard (KPIs, SVG/CSS charts, `@media print` PDF layout) from Content Screening & Moderation.

**Tech Stack:** FastAPI, SQLAlchemy, PyMySQL, TiDB Cloud / SQLite, Next.js 14, React 18, Tailwind CSS, TypeScript, Python zipfile.

## Global Constraints
- Do not drop columns in the DB until all backend routers and frontend calls are aligned, preventing 500 runtime errors.
- Always display the student author's name, department, and profile image 100% of the time across all views.
- Screening mode ("คัดกรอง") must retain 100% of existing functionality, tabs, filters, and moderation workflows.
- Print PDF layout must hide navigation bars, buttons, and admin actions, producing a formal HTC Insight A4 executive report.

---

### Task 1: Database Migration & Backend Main Cleanup

**Files:**
- Modify: `backend/main.py:14-55`
- Database: Execute `ALTER TABLE ... DROP COLUMN` on TiDB Cloud MySQL

**Interfaces:**
- Consumes: Existing tables `reviews`, `community_posts`, `community_comments`
- Produces: Tables without `is_anonymous` and `anon_identity_enc` columns

- [ ] **Step 1: Execute database column drops safely**
  Execute SQL drop column queries on TiDB Cloud:
  ```sql
  ALTER TABLE reviews DROP COLUMN is_anonymous;
  ALTER TABLE reviews DROP COLUMN anon_identity_enc;
  ALTER TABLE community_posts DROP COLUMN is_anonymous;
  ALTER TABLE community_posts DROP COLUMN anon_identity_enc;
  ALTER TABLE community_comments DROP COLUMN is_anonymous;
  ALTER TABLE community_comments DROP COLUMN anon_identity_enc;
  ```
- [ ] **Step 2: Clean legacy migration lines in `backend/main.py`**
  Remove statements adding `anon_identity_enc` in `run_migrations()` inside `backend/main.py`.
- [ ] **Step 3: Verify database columns using SQLAlchemy inspect**
  Verify that none of the three tables contain `is_anonymous` or `anon_identity_enc`.

---

### Task 2: Backend Models, Schemas, Routers & Tests Refactoring

**Files:**
- Modify: `backend/models.py:90-170`
- Modify: `backend/schemas/reviews.py`
- Modify: `backend/schemas/community.py`
- Modify: `backend/routers/reviews.py`
- Modify: `backend/routers/community.py`
- Modify: `backend/routers/companies.py`
- Modify: `backend/routers/admin.py`
- Modify: `backend/tests/test_api.py`
- Modify: `backend/tests/test_approval_workflow.py`

**Interfaces:**
- Consumes: Models `Review`, `CommunityPost`, `CommunityComment`
- Produces: Clean API endpoints returning real `author_name`, `author_department`, and `author_avatar_url`

- [ ] **Step 1: Update `backend/models.py`**
  Remove `is_anonymous` and `anon_identity_enc` from `Review`, `CommunityPost`, and `CommunityComment`.
- [ ] **Step 2: Update `backend/schemas/reviews.py` & `backend/schemas/community.py`**
  Remove `is_anonymous` from `ReviewCreate`, `ReviewOut`, `PostCreate`, `PostUpdate`, and `CommentCreate`.
- [ ] **Step 3: Update `backend/routers/reviews.py`**
  - In `create_review` and `update_review`: remove `data.is_anonymous` and `encrypt_identity`.
  - In review queries: set `author_name=r.user.name if r.user else "นักศึกษา HTC"`, `author_department=r.department`.
- [ ] **Step 4: Update `backend/routers/community.py`**
  - In post and comment creation: remove anonymous parameters.
  - In `format_post` / response serialization: always set `author_name=post.user.name`, `author_department=post.department`, `author_avatar_url=post.user.avatar_url`.
- [ ] **Step 5: Update `backend/routers/companies.py`**
  Return `author_name=r.user.name` and department directly in company reviews list.
- [ ] **Step 6: Update `backend/routers/admin.py`**
  - Remove `@router.get("/anonymous-reveal/{review_id}")` and the audit log action `reveal_anonymous`.
  - Ensure all review, post, and comment listings return `real_author=r.user.name` and `real_email=r.user.email`.
- [ ] **Step 7: Update backend test suites and run pytest**
  Remove `is_anonymous` from test fixtures and verify backend passes all tests.

---

### Task 3: Full Project Backup to ZIP

**Files:**
- Create: `scripts/backup_project.py`
- Output: `htc_insights_backup_<timestamp>.zip` in root

**Interfaces:**
- Consumes: Entire project directory tree
- Produces: Timestamped portable ZIP archive excluding `node_modules`, `.next`, `.git`, `__pycache__`

- [ ] **Step 1: Write backup script `scripts/backup_project.py`**
  Create a Python script that traverses the project, bundles code, documentation, clean CSVs, and `database/htc_insights.sql`, while ignoring build and cache folders.
- [ ] **Step 2: Execute backup script**
  Run `python scripts/backup_project.py` to create the `.zip` archive.
- [ ] **Step 3: Verify archive integrity and report size**
  Inspect the generated ZIP file structure and size.

---

### Task 4: Frontend Anonymous Removal & Real Name Display

**Files:**
- Modify: `frontend/app/insights/write-review/page.tsx`
- Modify: `frontend/app/community/new/page.tsx`
- Modify: `frontend/app/community/[id]/page.tsx`
- Modify: `frontend/components/community/PostCard.tsx`
- Modify: `frontend/app/insights/[id]/page.tsx`
- Modify: `frontend/app/profile/page.tsx`
- Modify: `frontend/components/AdminDetailModal.tsx`
- Delete: `frontend/components/RevealAnonymousModal.tsx`

**Interfaces:**
- Consumes: API endpoints returning real author info
- Produces: Clean UI showing real student identity with no anonymous checkboxes or badges

- [ ] **Step 1: Update `frontend/app/insights/write-review/page.tsx`**
  Remove `isAnonymous` state, form payload, and the toggle checkbox "เปิดโหมดไม่ระบุตัวตน".
- [ ] **Step 2: Update `frontend/app/community/new/page.tsx` & `[id]/page.tsx`**
  Remove anonymous switch from post creation and comment form; display `post.author_name` directly.
- [ ] **Step 3: Update `frontend/components/community/PostCard.tsx`**
  Remove `is_anonymous` prop and display real author name and person avatar icon.
- [ ] **Step 4: Update `frontend/app/insights/[id]/page.tsx` & `frontend/app/profile/page.tsx`**
  Remove anonymous badges and fallback conditionals.
- [ ] **Step 5: Clean up `AdminDetailModal.tsx` and delete `RevealAnonymousModal.tsx`**
  Remove "เปิดเผยชื่อจริง" button and anonymous indicator badges.

---

### Task 5: Admin Page Restructuring & Primary Dual-Mode Switcher

**Files:**
- Modify: `frontend/app/admin/page.tsx`

**Interfaces:**
- Consumes: `stats`, `reviews`, `posts`, `jobs`, `comments`, `reports`, `auditLogs`
- Produces: Dual-mode UI with primary switcher: `[📊 แดชบอร์ดภาพรวม]` vs `[🛡️ คัดกรองและจัดการข้อมูล]`

- [ ] **Step 1: Define Mode State in `admin/page.tsx`**
  Add state: `const [mainMode, setMainMode] = useState<"dashboard" | "screening">("dashboard");`
- [ ] **Step 2: Implement Primary Segmented Mode Switcher Bar**
  Add top navigation component switching between Dashboard and Screening with badge counter for total pending items on the Screening button.
- [ ] **Step 3: Wrap Existing Screening Workflow**
  Keep existing tabs (`moderation`, `all_reviews`, `all_posts`, `all_jobs`, `reports`, `audit`) cleanly inside the Screening mode condition (`mainMode === "screening"`).

---

### Task 6: Admin Dashboard Summary, Interactive Charts & Print PDF

**Files:**
- Create: `frontend/components/admin/AdminDashboardOverview.tsx`
- Modify: `frontend/app/admin/page.tsx`
- Modify: `frontend/app/globals.css` (for print media queries)

**Interfaces:**
- Consumes: Admin statistics, reviews, posts, jobs, companies
- Produces: Comprehensive executive summary view with interactive charts, KPIs, and Print-to-PDF button

- [ ] **Step 1: Create `AdminDashboardOverview.tsx`**
  - KPI summary metric cards (Users, Reviews, Approval Rate, Community activity, Active Jobs).
  - Department distribution bar chart (Reviews per department).
  - Aspect rating gauges (Work, Environment, Mentor, Welfare score averages out of 5).
  - Content status breakdown chart (Approved vs Pending vs Rejected).
  - Top Recommended Companies ranking table/cards.
  - "🖨️ พิมพ์รายงานสรุป (Print PDF)" action button invoking `window.print()`.
- [ ] **Step 2: Add Print Stylesheet (`@media print`)**
  Ensure that when printing, navbar, footer, mode switchers, and action buttons are hidden (`display: none !important`), rendering a formal A4 report with college title and generation timestamp.
- [ ] **Step 3: Integrate `AdminDashboardOverview` into `admin/page.tsx`**
  Render `AdminDashboardOverview` when `mainMode === "dashboard"`.

---

### Task 7: End-to-End Verification & Sanity Checks

**Files:**
- Test all altered backend and frontend routes

- [ ] **Step 1: Run backend tests with pytest**
  Verify all test suites pass.
- [ ] **Step 2: Build frontend with `npm run build`**
  Verify TypeScript compilation and Next.js build pass without errors.
- [ ] **Step 3: Test API endpoints and database integrity**
  Ensure reviews and posts return real student identities without 500 errors.
- [ ] **Step 4: Verify Admin Dashboard and Print PDF layout**
  Confirm mode toggle works smoothly and print styling renders correctly.
