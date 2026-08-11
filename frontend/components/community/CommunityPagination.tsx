"use client";

import React from "react";
import Pagination from "@/components/Pagination";

interface CommunityPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function CommunityPagination(props: CommunityPaginationProps) {
  return <Pagination {...props} />;
}
