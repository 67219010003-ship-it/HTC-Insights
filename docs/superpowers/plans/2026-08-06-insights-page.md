# Company-Centric Insights Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `frontend/app/insights/page.tsx` from a placeholder page into a fully functional, responsive, company-centric Insights discovery page based on `expageinsights.zip` (`code.html`, `DESIGN.md`) connected to the FastAPI backend API (`GET /companies`).

**Architecture:** A React Client Component page featuring interactive filter state (search query, department checkboxes, star rating filters) connected via dynamic `fetch` calls to `GET /companies` with query params, rendering responsive cards with allowance badges, partner verification tags, and fallback placeholders.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, TypeScript, Material Symbols Outlined icons.

## Global Constraints
- Target Page File: `frontend/app/insights/page.tsx`
- API Endpoint: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/companies`
- UI Styling: Tailwind CSS using tokens defined in `frontend/tailwind.config.js`

---

### Task 1: Create Insights Page Client Component & State Management

**Files:**
- Modify: `frontend/app/insights/page.tsx`

**Interfaces:**
- Consumes: `GET /companies?q=...&department=...&min_score=...&skip=...&limit=...`
- Produces: `CompanyCard` rendering UI with filters and search input.

- [ ] **Step 1: Write `CompanyCard` interface and state definitions in `frontend/app/insights/page.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface CompanyCardData {
  id: number;
  name: string;
  address: string | null;
  industry: string | null;
  is_verified: boolean;
  avg_score: number | null;
  review_count: number;
  avg_daily_allowance: number | null;
  phone: string | null;
  website: string | null;
  cover_image_url: string | null;
  description: string | null;
}
```

- [ ] **Step 2: Add API Fetch logic with loading and state hooks**

```tsx
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function InsightsPage() {
  const [companies, setCompanies] = useState<CompanyCardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [minScore, setMinScore] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  useEffect(() => {
    fetchCompanies();
  }, [searchQuery, selectedDept, minScore, page]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (selectedDept) params.append("department", selectedDept);
      if (minScore) params.append("min_score", minScore.toString());
      params.append("skip", ((page - 1) * pageSize).toString());
      params.append("limit", pageSize.toString());

      const res = await fetch(`${API_URL}/companies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      } else {
        setCompanies([]);
      }
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 3: Implement Layout, Sidebar Filters, Header, Mobile Chips, Company Cards Grid, and Pagination**

Build the complete TSX structure matching `code.html` using Tailwind classes:
- Left sidebar filter with checkboxes (`ช่างอิเล็กทรอนิกส์`, `ช่างยนต์/เครื่องกล`, `เทคนิคคอมพิวเตอร์`, `ช่างไฟฟ้ากำลัง`).
- Star rating filter buttons (`4+ ดาว`, `3+ ดาว`, `ทั้งหมด`).
- Reset filter button.
- Mobile horizontal department chips.
- Grid of company cards (2 cols desktop, 1 col mobile) displaying image fallback, allowance badge, verified badge, rating, excerpt, and "อ่านเพิ่มเติม" link.
- Pagination prev/next & page number buttons.

- [ ] **Step 4: Verify build and compile in Next.js**

Run: `npm run build` or inspect Next.js dev server output to ensure zero TypeScript errors.

- [ ] **Step 5: Commit changes**

```bash
git add frontend/app/insights/page.tsx
git commit -m "feat(insights): implement company-centric insights page UI with backend integration"
```
