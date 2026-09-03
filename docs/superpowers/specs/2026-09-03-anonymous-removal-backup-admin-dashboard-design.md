# Design Spec: Anonymous Removal, Project Backup, and Admin Executive Dashboard

**Date:** 2026-09-03  
**Status:** Approved  
**Topic:** Anonymous fields removal across backend & frontend, project ZIP backup, and admin dual-mode toggle (Dashboard vs Screening) with interactive charts & PDF export.

---

## 1. Overview & Objectives

1. **Complete Removal of Anonymous Fields:**
   - Eliminate `is_anonymous` and `anon_identity_enc` columns from all database tables (`reviews`, `community_posts`, `community_comments`).
   - Remove these fields from backend models, schemas, and routers to eliminate tech debt and avoid 500 runtime errors.
   - Update all endpoints to directly reveal and return the real student author's name, department, and profile image 100% of the time.
   - Remove anonymous toggles, checkmarks, badges, and the reveal modal from frontend components.

2. **Project Backup to ZIP:**
   - Package all project assets (source code, database SQL dump `database/htc_insights.sql`, clean CSVs, documentation) into a timestamped `.zip` archive.
   - Exclude ephemeral or generated directories (`node_modules`, `.next`, `.git`, `__pycache__`, `.pytest_cache`).

3. **Admin Page Reorganization (Dual Mode Switcher):**
   - Implement a primary segmented toggle on the Admin page:
     - **[📊 แดชบอร์ดภาพรวมระบบ] (System Overview Dashboard)**
     - **[🛡️ คัดกรองและจัดการข้อมูล] (Screening & Moderation)**
   - "คัดกรอง" retains all existing review/post/job/comment/upgrade/report approval queues and tabs.
   - "แดชบอร์ด" provides system summary metrics, interactive charts (reviews by department, aspect ratings, approval status ratios), top company leaderboards, and an executive **Print to PDF** button styled with `@media print`.

---

## 2. Technical Architecture & Component Changes

### 2.1 Database & Models
- Execute SQL commands on TiDB Cloud / MySQL:
  ```sql
  ALTER TABLE reviews DROP COLUMN IF EXISTS is_anonymous;
  ALTER TABLE reviews DROP COLUMN IF EXISTS anon_identity_enc;
  ALTER TABLE community_posts DROP COLUMN IF EXISTS is_anonymous;
  ALTER TABLE community_posts DROP COLUMN IF EXISTS anon_identity_enc;
  ALTER TABLE community_comments DROP COLUMN IF EXISTS is_anonymous;
  ALTER TABLE community_comments DROP COLUMN IF EXISTS anon_identity_enc;
  ```
- In `backend/models.py`:
  - `Review`: remove `is_anonymous`, `anon_identity_enc`.
  - `CommunityPost`: remove `is_anonymous`, `anon_identity_enc`.
  - `CommunityComment`: remove `is_anonymous`, `anon_identity_enc`.
- In `backend/main.py`:
  - Clean up legacy migration statements adding `anon_identity_enc`.

### 2.2 Backend Schemas & Routers
- `backend/schemas/reviews.py`: Remove `is_anonymous` from `ReviewCreate` and `ReviewOut`.
- `backend/schemas/community.py`: Remove `is_anonymous` from `PostCreate`, `PostUpdate`, `CommentCreate`.
- `backend/routers/reviews.py`:
  - Always set author name to `r.user.name` and department to `r.department`.
  - In `create_review` and `update_review`: remove references to `data.is_anonymous` and encryption.
- `backend/routers/community.py`:
  - Serialization always populates `author_name=post.user.name`, `author_department=post.department`.
  - Remove `is_anonymous` from response dictionaries.
- `backend/routers/companies.py`:
  - Return `r.user.name` directly in review lists.
- `backend/routers/admin.py`:
  - Remove `reveal_anonymous` endpoint and `AuditLog` action.
  - Return actual user details for all review and post listings.
- `backend/tests/`:
  - Update `test_api.py` and `test_approval_workflow.py` payloads.

### 2.3 Frontend Clean-Up
- `frontend/app/insights/write-review/page.tsx`: Remove anonymous toggle checkbox and state.
- `frontend/app/community/new/page.tsx`: Remove anonymous switch and state.
- `frontend/app/community/[id]/page.tsx`: Remove comment anonymous switch; show author name directly.
- `frontend/components/community/PostCard.tsx`: Display `post.author_name` directly without anonymous badge.
- `frontend/app/insights/[id]/page.tsx`: Display author name and department directly.
- `frontend/app/profile/page.tsx`: Remove anonymous badges.
- `frontend/components/AdminDetailModal.tsx`: Remove anonymous conditions and decrypt buttons.
- Delete `frontend/components/RevealAnonymousModal.tsx`.

### 2.4 Backup System
- A Python/PowerShell script creates `htc_insights_backup_<YYYYMMDD_HHMMSS>.zip`.
- Includes all source files, SQL schema, CSVs, documentation.
- Validates the ZIP file and outputs total compressed size.

### 2.5 Admin Mode Switcher & Executive Dashboard
- In `frontend/app/admin/page.tsx`:
  - Mode state: `adminMode: "dashboard" | "screening"` (defaults to `"dashboard"` or `"screening"`).
  - Mode toggle placed prominently in the header area.
  - **Screening Mode:** Shows the existing sub-navigation (`moderation`, `all_reviews`, `all_posts`, `all_jobs`, `reports`, `audit`) and lists.
  - **Dashboard Mode:**
    - Action Header: "รายงานสรุปข้อมูลระบบ HTC Insight" + "🖨️ พิมพ์รายงานสรุป (Print PDF)" button.
    - KPI Cards: Users breakdown, Review metrics, Community stats, Active job listings.
    - Interactive SVG/Tailwind Charts:
      1. Reviews by Department (Horizontal comparative bar chart).
      2. Average Aspect Ratings (Work, Environment, Mentor, Welfare) gauge comparison.
      3. Content Approval Status Breakdown (Approved, Pending, Rejected).
      4. Top Recommended Companies ranking.
    - Print Optimization (`@media print`):
      - Suppresses navigation bars, action buttons, modals, and extraneous margins.
      - Formats content onto structured A4 pages with formal HTC Insight report header and generation timestamp.

---

## 3. Verification & Success Criteria

1. **No 500 Errors:** Backend and frontend load cleanly; reviews and posts show student names.
2. **Database Integrity:** Columns dropped without affecting other relational data.
3. **ZIP Backup:** Valid `.zip` created in the project root with code and data dumps.
4. **Admin Features:** Smooth toggle between Dashboard and Screening; charts render properly; "พิมพ์รายงานสรุป" triggers clean browser print preview.
