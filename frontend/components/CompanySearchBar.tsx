"use client";

import dynamic from "next/dynamic";

const CompanyMapFullscreen = dynamic(() => import("./CompanyMapSearchInner"), {
  ssr: false,
  loading: () => null,
});

export type { SelectedCompany } from "./CompanyMapSearchInner";
export default CompanyMapFullscreen;
