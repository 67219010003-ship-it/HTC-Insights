"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import CommunitySidebar from "@/components/community/CommunitySidebar";
import FilterTabs from "@/components/community/FilterTabs";
import PostCard, { PostData } from "@/components/community/PostCard";
import CommunityPagination from "@/components/community/CommunityPagination";
import DepartmentDropdown from "@/components/DepartmentDropdown";

export default function CommunityPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [activeTab, setActiveTab] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 3;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        skip: 0,
        limit: 100,
        sort: activeTab === "popular" ? "popular" : "latest",
      };
      if (selectedDepartment) {
        params.department = selectedDepartment;
      }
      if (activeTab === "pinned") {
        params.type = "pinned";
      }

      const res = await api.get("/community/posts", { params });
      setPosts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch community posts:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, activeTab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filteredPosts = posts.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchContent = p.content?.toLowerCase().includes(q);
      const matchDept = p.department?.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchDept) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const displayedPosts = filteredPosts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-lg py-md lg:py-xl flex gap-gutter min-h-screen">
      {/* Sidebar Navigation (Desktop) */}
      <CommunitySidebar
        selectedDepartment={selectedDepartment}
        onSelectDepartment={(dept) => {
          setSelectedDepartment(dept);
          setPage(1);
        }}
      />

      {/* Main Content Area */}
      <div className="flex flex-col gap-md w-full">
        {/* Mobile Department Selector / Search */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between lg:hidden mb-2">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาหัวข้อสนทนา..."
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm"
            />
          </div>
          <DepartmentDropdown
            className="relative w-full"
            value={selectedDepartment}
            onChange={(val) => {
              setSelectedDepartment(val);
              setPage(1);
            }}
          />
        </div>

        {/* Feed Filter Tabs */}
        <FilterTabs
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setPage(1);
          }}
        />

        {/* Thread Feed */}
        {loading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 h-40"
              />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-5xl text-outline mb-3">
              forum
            </span>
            <h3 className="text-lg font-bold text-primary mb-1">
              ยังไม่มีกระทู้ในหมวดหมู่นี้
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
              มาร่วมตั้งกระทู้พูดคุยหรือแชร์ประสบการณ์ฝึกงานเป็นคนแรก!
            </p>
            <Link
              href="/community/new"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-label-md text-label-md font-semibold hover:bg-primary/90 shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              ตั้งกระทู้ใหม่
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {displayedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <CommunityPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* FAB Mobile */}
      <Link
        href="/community/new"
        className="md:hidden fixed bottom-20 right-6 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-all z-40"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </Link>
    </div>
  );
}
