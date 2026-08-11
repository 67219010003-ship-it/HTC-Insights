# Design Spec: Company-Centric Insights Page (HTC Internship Hub)

**Date:** 2026-08-06  
**Status:** Approved  
**Target File:** `frontend/app/insights/page.tsx`

---

## 1. Overview
The **Insights Page** serves as a discovery portal for Hatyai Technical College (HTC) students to explore company profiles, student internship experiences, average daily allowances, ratings, and verified partner statuses. This design adapts the visual layout from `expageinsights.zip` (`code.html`, `DESIGN.md`) into a fully dynamic React Client Component integrated with the existing FastAPI backend (`GET /companies` endpoint).

---

## 2. UI/UX Architecture & Layout Structure

### 2.1 Header & Page Layout
- Standard layout with top margin `pt-24` and max container width `max-w-container-max` (1280px).
- Responsive 2-column layout on Desktop (`lg:flex-row`), 1-column layout on Mobile.

### 2.2 Left Sidebar Filter (`SearchAndFilterSidebar`)
- Sticky container (`top-24`) on Desktop, hidden on mobile screens (`hidden lg:block`).
- **Department Checkboxes:** `ช่างอิเล็กทรอนิกส์`, `ช่างยนต์/เครื่องกล`, `เทคนิคคอมพิวเตอร์`, `ช่างไฟฟ้ากำลัง`.
- **Rating Filter:** `4+ ดาว` (min_score=4.0), `3+ ดาว` (min_score=3.0), and `ทั้งหมด` (min_score=null).
- **Reset Button:** Resets all active filters.

### 2.3 Mobile Navigation & Filter Chips (`MobileFilterChips`)
- Horizontal scrollable filter chips (`lg:hidden`) for quick department filtering on mobile.

### 2.4 Main Content Area (`CompanyGrid`)
- **Grid Layout:** 1 column on mobile, 2 columns on medium/large screens (`grid-cols-1 md:grid-cols-2 gap-gutter`).
- **Company Card Elements:**
  1. **Cover Image:** `Company.cover_image_url` with fallback high-tech industrial placeholder image if null.
  2. **Daily Allowance Badge:** Top-right overlay badge showing `avg_daily_allowance` (e.g. `฿350 / วัน`) or `ตามตกลง` if null/0.
  3. **Company Header:** `Company.name`, `Company.address`, Verified partner badge (when `is_verified == true`).
  4. **Rating:** `avg_score` (star rating icon + score string e.g., 4.8) and `review_count`.
  5. **Department & Skill Chips:** Displaying industry / department tags.
  6. **Review Excerpt:** Short description or excerpt from `Company.description` or latest review text.
  7. **Card Footer:** "อ่านเพิ่มเติม" button leading to `/companies/[id]`.

### 2.5 Pagination Controls
- Prev/Next chevron buttons with numbered pagination buttons for navigating `skip` and `limit`.

---

## 3. Data Integration & State Management

### 3.1 Backend API Endpoint
- **URL:** `GET /companies`
- **Query Parameters:**
  - `q`: Search keyword (company name/address)
  - `department`: Filter by specific department
  - `min_score`: Filter by minimum average score rating
  - `skip`: Pagination offset (default: 0)
  - `limit`: Page size (default: 10)

### 3.2 Frontend State
- `companies`: List of `CompanyCard` objects returned from API.
- `loading`: Boolean state for loading skeleton UI.
- `searchQuery`: String input state.
- `selectedDepartment`: Active department string or null.
- `minScore`: Active rating threshold number or null.
- `currentPage`: Integer state for pagination.

---

## 4. Verification & Testing Criteria
- **Component Render:** Verify that `page.tsx` renders clean UI without hydration errors.
- **Filter Interaction:** Selecting department checkboxes or score filters triggers instant API re-fetch.
- **Responsive Check:** Layout seamlessly adjusts between mobile layout (<768px) and desktop layout (>=1024px).
- **Empty State & Fallbacks:** Displays appropriate messaging if no companies match the active search/filters.
