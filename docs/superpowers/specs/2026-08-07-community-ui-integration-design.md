# Community UI Integration Design Spec

**Date:** 2026-08-07  
**Project:** HTC Insight (Community Module)  
**Goal:** Integrate UI design specifications and prototype layout from `stitch_internship_insight_community.zip` into the production Next.js frontend codebase (`frontend/app/community`).

---

## 1. Overview & Architecture

We will modularize the monolithic HTML prototype (`code.html`) into clear, reusable Next.js Client Components with full TypeScript support, matching the backend FastAPI REST endpoints.

```
frontend/
  ├── components/
  │   └── community/
  │       ├── CommunitySidebar.tsx    # Department navigation sidebar
  │       ├── FilterTabs.tsx          # Feed filter tabs (Latest, Popular, Pinned, Unanswered)
  │       ├── PostCard.tsx            # Thread card component supporting multiple post types
  │       ├── CommunityPagination.tsx # Pagination control component
  │       └── QuickPostCard.tsx       # Highlighted / Resource tip banner
  └── app/
      └── community/
          ├── page.tsx                # Main Community Feed page integrating components & API
          ├── new/page.tsx            # Create post form page
          └── [id]/page.tsx           # Post detail & comments view page
```

---

## 2. Component Design & API Data Mapping

### A. `CommunitySidebar.tsx`
- **Props:** `selectedDepartment: str`, `onSelectDepartment: (dept: string) => void`
- **Departments:** Electrical (ไฟฟ้ากำลัง), IT (เทคโนโลยีสารสนเทศ), Automotive (ช่างยนต์), Civil/Arch (โยธาและสถาปัตย์), Mechanical (เทคนิคการผลิต), All (ทั้งหมด).

### B. `FilterTabs.tsx`
- **Props:** `activeTab: str`, `onTabChange: (tab: string) => void`
- **Tabs:** `latest` (ล่าสุด), `popular` (ยอดนิยม), `pinned` (ปักหมุด), `unanswered` (คำถามที่ยังไม่มีคำตอบ).

### C. `PostCard.tsx`
- **Props:** `post: PostData`, `onLikeToggle: (postId: number) => void`
- **Data Attributes:**
  - `id`, `type`, `title`, `content`, `author_name`, `author_department`, `like_count`, `comment_count`, `is_anonymous`, `created_at`.
- **Interactions:** Dynamic like button toggling via FastAPI backend (`/api/community/posts/{id}/like`).

### D. `CommunityPage` (`app/community/page.tsx`)
- Fetches real post lists from `GET /api/community/posts?department=...&sort=...`.
- Displays dynamic empty state or loading skeleton when fetching data.
- Responsive layout supporting Desktop sidebar and Mobile sticky bottom bar / FAB.

---

## 3. Design Tokens & Styling Compliance
- Styling implemented via Tailwind CSS matching tokens defined in `DESIGN.md`:
  - `primary`: `#002045`
  - `secondary`: `#00677c`
  - `background`: `#f9f9ff`
- Rounded corners `rounded-2xl` (`0.75rem`), card borders `border-outline-variant/30`.

---

## 4. Verification & Testing Plan
1. **Component Verification:** Verify React component rendering and TypeScript compilation with `npm run build` or Next.js dev server.
2. **API Data Flow Test:** Verify post listing, department filtering, sorting (latest vs popular), and like button toggle using backend test routes.
