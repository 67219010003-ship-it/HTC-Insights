# Content Approval, Universal Reporting & Unified Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement universal content approval workflows (Community Posts, Job Postings, Reviews, Upgrades), mandatory rejection reason modal + notification, universal content reporting buttons, restored Super Admin column, and a single-page unified Admin Dashboard (`/admin`).

**Architecture:** Extend SQLAlchemy models (`Notification`, `Report`, `status`, `rejection_reason`), add Notification and Report FastAPI routers, implement mandatory rejection reasons in Admin routers, build reusable `RejectReasonModal` and `ReportModal` in Next.js, add Report buttons across all content pages, and construct a 5-section unified Admin Dashboard on `/admin/page.tsx`.

**Tech Stack:** FastAPI, SQLAlchemy, PyMySQL, Pydantic, Next.js (App Router), TypeScript, Tailwind CSS.

## Global Constraints

- Backend base directory: `e:/HTC Insight/backend`
- Frontend base directory: `e:/HTC Insight/frontend`
- Strictly maintain existing API contracts and ensure all pytest unit tests pass.

---

### Task 1: Backend Models and Database Migration Updates

**Files:**
- Modify: `backend/models.py`
- Modify: `backend/database.py`
- Modify: `backend/main.py`
- Test: `backend/tests/test_models.py`

- [ ] **Step 1: Write failing model unit tests**

```python
import pytest
from database import Base, engine, SessionLocal
from models import Notification, Report, CommunityPost, JobPosting, Review, UpgradeRequest

def test_models_schema_attributes():
    db = SessionLocal()
    post = CommunityPost(user_id=1, type="qa", title="Test", content="Body", status="pending")
    job = JobPosting(employer_id=1, title="Job", status="pending")
    notif = Notification(user_id=1, title="T", message="M", type="warning")
    report = Report(reporter_id=1, post_id=1, reason="Spam")
    
    assert hasattr(post, "status")
    assert hasattr(post, "rejection_reason")
    assert hasattr(job, "status")
    assert hasattr(job, "rejection_reason")
    assert hasattr(notif, "link")
    assert hasattr(report, "job_id")
```

- [ ] **Step 2: Run test to verify failure**

Run: `pytest backend/tests/test_models.py`
Expected: FAIL due to missing fields/attributes on models.

- [ ] **Step 3: Update `backend/models.py`**

Add `status` and `rejection_reason` to `CommunityPost` and `JobPosting`.
Add `rejection_reason` to `Review` and `UpgradeRequest`.
Add `Notification` model and expand `Report` model with `job_id` and `company_id`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_models.py`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add backend/models.py backend/tests/test_models.py
git commit -m "feat: update models schema for notifications, reports, and approval status"
```

---

### Task 2: Backend Notifications & Universal Reports API Routers

**Files:**
- Create: `backend/routers/notifications.py`
- Create: `backend/routers/reports.py`
- Modify: `backend/main.py`
- Test: `backend/tests/test_notifications_reports.py`

- [ ] **Step 1: Write failing router unit tests**

```python
def test_create_and_get_notifications():
    # Test GET /notifications and PATCH /notifications/read-all
    pass
def test_create_universal_report():
    # Test POST /reports
    pass
```

- [ ] **Step 2: Run test to verify failure**

Run: `pytest backend/tests/test_notifications_reports.py`
Expected: FAIL (404 Not Found)

- [ ] **Step 3: Implement `routers/notifications.py` and `routers/reports.py`**

Include `router` in `backend/main.py`.
Implement helper function `create_notification(db, user_id, title, message, type, link)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_notifications_reports.py`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add backend/routers/notifications.py backend/routers/reports.py backend/main.py backend/tests/test_notifications_reports.py
git commit -m "feat: add notification and universal report endpoints"
```

---

### Task 3: Backend Approval Routers & Mandatory Rejection Reasons

**Files:**
- Modify: `backend/routers/admin.py`
- Modify: `backend/routers/community.py`
- Modify: `backend/routers/jobs.py`
- Modify: `backend/routers/reviews.py`
- Test: `backend/tests/test_approval_workflow.py`

- [ ] **Step 1: Write failing approval workflow tests**

Test mandatory rejection reason validation (`HTTP 400` if `status == 'rejected'` and `reason` is empty).
Test public content filtering (pending posts/jobs/reviews hidden until approved).

- [ ] **Step 2: Run test to verify failure**

Run: `pytest backend/tests/test_approval_workflow.py`
Expected: FAIL

- [ ] **Step 3: Update `admin.py`, `community.py`, `jobs.py`, and `reviews.py`**

Enforce rejection reason validation on rejection endpoints.
Call `create_notification` when approving/rejecting items.
Filter public endpoints (`GET /community/posts`, `GET /jobs`, `GET /reviews`) to return approved items only.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_approval_workflow.py`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add backend/routers/
git commit -m "feat: enforce content approval and mandatory rejection reasons"
```

---

### Task 4: Reusable Frontend Modals (`RejectReasonModal.tsx` & `ReportModal.tsx`)

**Files:**
- Create: `frontend/components/RejectReasonModal.tsx`
- Create: `frontend/components/ReportModal.tsx`

- [ ] **Step 1: Create `RejectReasonModal.tsx`**

Build modal component with mandatory text input field, title, cancel/confirm buttons, and submit action.

- [ ] **Step 2: Create `ReportModal.tsx`**

Build modal component supporting selection of report reasons (Spam, False Info, Harassment, Other) and submitting to `POST /reports`.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit` inside `frontend`
Expected: 0 errors

- [ ] **Step 4: Commit changes**

```bash
git add frontend/components/
git commit -m "feat: create RejectReasonModal and ReportModal components"
```

---

### Task 5: Frontend Universal Report Buttons Integration

**Files:**
- Modify: `frontend/app/insights/[id]/page.tsx`
- Modify: `frontend/app/community/page.tsx`
- Modify: `frontend/app/jobs/page.tsx`
- Modify: `frontend/app/insights/page.tsx`

- [ ] **Step 1: Integrate Report buttons on Reviews (`insights/[id]/page.tsx`)**
- [ ] **Step 2: Integrate Report buttons on Community Posts & Comments (`community/page.tsx`)**
- [ ] **Step 3: Integrate Report buttons on Job Detail View (`jobs/page.tsx`)**
- [ ] **Step 4: Integrate Report buttons on Company cards (`insights/page.tsx`)**
- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc --noEmit` inside `frontend`
Expected: 0 errors

- [ ] **Step 6: Commit changes**

```bash
git add frontend/app/
git commit -m "feat: integrate report buttons across all content views"
```

---

### Task 6: Frontend Unified Admin Dashboard Redesign (`/admin`) & Super Admin Column

**Files:**
- Modify: `frontend/app/admin/page.tsx`
- Modify: `frontend/app/admin/users/page.tsx`

- [ ] **Step 1: Restore Super Admin Column in `frontend/app/admin/users/page.tsx`**
- [ ] **Step 2: Redesign `frontend/app/admin/page.tsx` into Single-Page Unified Overview Dashboard**
  - Summary metrics bar (Reviews, Posts, Jobs, Upgrades, Reports)
  - Section 1: Pending Reviews (Top 3 + Approve/Reject Reason Modal)
  - Section 2: Pending Community Posts (Top 3 + Approve/Reject Reason Modal)
  - Section 3: Pending Job Postings (Top 3 + Approve/Reject Reason Modal)
  - Section 4: Pending Upgrade Requests (Top 3 + Approve/Reject Reason Modal)
  - Section 5: Pending Reports (Top 3 + Resolve/Dismiss)
- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit` inside `frontend`
Expected: 0 errors

- [ ] **Step 4: Run full backend test suite**

Run: `pytest` inside `backend`
Expected: 100% PASS

- [ ] **Step 5: Commit changes**

```bash
git add frontend/app/admin/
git commit -m "feat: redesign unified admin dashboard and restore super admin column"
```
