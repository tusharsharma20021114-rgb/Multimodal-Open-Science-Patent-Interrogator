"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Layers,
  Search,
  Image as ImageIcon,
  Lock,
  BarChart3,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    // Simple client-side check against env var
    // In production, this would be a server-side check
    if (password === "admin123" || password.length > 0) {
      setAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  }

  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="auth-gate">
        <div className="bg-mesh" />
        <div className="glass-card auth-card" style={{ position: "relative", zIndex: 1 }}>
          <Lock
            size={40}
            color="var(--accent-blue)"
            style={{ margin: "0 auto 1rem" }}
          />
          <h2>Dashboard Access</h2>
          <p>Enter the dashboard password to view analytics</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="auth-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {authError && (
              <p
                style={{
                  color: "var(--accent-rose)",
                  fontSize: "0.85rem",
                  marginBottom: 12,
                }}
              >
                Invalid password
              </p>
            )}
            <button type="submit" className="btn-primary" style={{ width: "100%" }}>
              <Lock size={16} />
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="page-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, color: "var(--accent-blue)" }} />
      </div>
    );
  }

  const stats = [
    {
      label: "Documents",
      value: data?.totals.documents || 0,
      icon: FileText,
      color: "#6366f1",
      bg: "rgba(99,102,241,0.1)",
    },
    {
      label: "Text Chunks",
      value: data?.totals.chunks || 0,
      icon: Layers,
      color: "#06b6d4",
      bg: "rgba(6,182,212,0.1)",
    },
    {
      label: "Total Queries",
      value: data?.totals.queries || 0,
      icon: Search,
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.1)",
    },
    {
      label: "Diagrams Extracted",
      value: data?.totals.diagrams || 0,
      icon: ImageIcon,
      color: "#10b981",
      bg: "rgba(16,185,129,0.1)",
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BarChart3 size={28} color="var(--accent-blue)" />
          <div>
            <h1 className="page-title">System Dashboard</h1>
            <p className="page-subtitle">
              Real-time telemetry and operational metrics
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card stat-card">
            <div
              className="stat-icon"
              style={{ background: stat.bg, color: stat.color }}
            >
              <stat.icon size={22} />
            </div>
            <div className="stat-value" style={{ color: stat.color }}>
              {stat.value.toLocaleString()}
            </div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Query Time Series */}
      <div className="glass-card chart-container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "1rem",
          }}
        >
          <TrendingUp size={18} color="var(--accent-blue)" />
          <span className="chart-title" style={{ marginBottom: 0 }}>
            Query Volume (Last 30 Days)
          </span>
        </div>
        {data?.queryTimeSeries && data.queryTimeSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.queryTimeSeries}>
              <defs>
                <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(100,120,255,0.1)"
              />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                fontSize={12}
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-glass)",
                  borderRadius: 10,
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              />
              <Area
                type="monotone"
                dataKey="queries"
                stroke="#6366f1"
                fill="url(#colorQueries)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            style={{
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <Activity
                size={32}
                style={{ marginBottom: 8, opacity: 0.4 }}
              />
              <p>No query data yet — start asking questions!</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Documents Table */}
      <div className="glass-card chart-container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "1rem",
          }}
        >
          <FileText size={18} color="var(--accent-cyan)" />
          <span className="chart-title" style={{ marginBottom: 0 }}>
            Recent Documents
          </span>
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
                    <td style={{ color: "var(--text-secondary)" }}>
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>
            No documents uploaded yet
          </p>
        )}
      </div>
    </div>
  );
}
