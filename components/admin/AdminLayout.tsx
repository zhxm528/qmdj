"use client";

import Layout from "@/components/Layout";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      <div className="min-h-screen bg-amber-50">
        <div className="flex">
          <AdminSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </Layout>
  );
}
