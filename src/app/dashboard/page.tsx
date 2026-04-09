"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Layers,
  Search,
  ImageIcon,
  BarChart3,
  TrendingUp,
  Activity,
  LogOut,
  User,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase-client";

interface Analytics {
  totals: {
    documents: number;
    chunks: number;
    queries: number;
    diagrams: number;
  };
  queryTimeSeries: { date: string; queries: number }[];
  recentDocuments: {
    id: string;
    title: string;
    total_chunks: number;
    diagrams_extracted: number;
    upload_date: string;
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser({ email: user.email || "" });

      try {
        const res = await fetch("/api/analytics");
        const analyticsData = await res.json();
        setData(analyticsData);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="page-container loading-page">
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2.5 }} />
      </div>
    );
  }

  const stats = [
    {
      label: "Documents",
      value: data?.totals.documents || 0,
      icon: FileText,
      color: "#0D9488",
      bg: "rgba(13,148,136,0.06)",
    },
    {
      label: "Text chunks",
      value: data?.totals.chunks || 0,
      icon: Layers,
      color: "#2563EB",
      bg: "rgba(37,99,235,0.06)",
    },
    {
      label: "Queries",
      value: data?.totals.queries || 0,
      icon: Search,
      color: "#CA8A04",
      bg: "rgba(202,138,4,0.06)",
    },
    {
      label: "Diagrams",
      value: data?.totals.diagrams || 0,
      icon: ImageIcon,
      color: "#E11D48",
      bg: "rgba(225,29,72,0.05)",
    },
  ];

  return (
    <div className="page-container">
      <header className="page-header-full">
        <div className="header-content">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">System metrics and document analytics</p>
        </div>
        <div className="header-actions">
          <span className="user-info">
            <User size={14} />
            {user?.email}
          </span>
          <button onClick={handleLogout} className="btn-icon">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card stat-card">
            <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
              <stat.icon size={18} />
            </div>
            <div className="stat-value">{stat.value.toLocaleString()}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card chart-container">
        <div className="chart-header">
          <TrendingUp size={15} />
          <span className="chart-title">Query volume (30 days)</span>
        </div>
        {data?.queryTimeSeries && data.queryTimeSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.queryTimeSeries}>
              <defs>
                <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                fontSize={11}
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })
                }
              />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-light)",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                }}
              />
              <Area
                type="monotone"
                dataKey="queries"
                stroke="#0D9488"
                fill="url(#colorQueries)"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">
            <Activity size={24} />
            <p>No query data yet</p>
          </div>
        )}
      </div>

      <div className="glass-card chart-container">
        <div className="chart-header">
          <FileText size={15} />
          <span className="chart-title">Recent documents</span>
        </div>
        {data?.recentDocuments && data.recentDocuments.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Chunks</th>
                  <th>Diagrams</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {data.recentDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600 }}>{doc.title}</td>
                    <td>{doc.total_chunks}</td>
                    <td>{doc.diagrams_extracted || 0}</td>
                    <td>{new Date(doc.upload_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-table">No documents yet</p>
        )}
      </div>
    </div>
  );
}
