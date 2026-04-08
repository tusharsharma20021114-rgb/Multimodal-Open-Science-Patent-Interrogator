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
        <div className="glass-card auth-card">
          <Lock size={28} color="var(--accent)" style={{ margin: "0 auto 1rem" }} />
          <h2>Dashboard</h2>
          <p>Enter password to view analytics</p>
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
              <p style={{ color: "var(--error)", fontSize: "0.82rem", marginBottom: 10 }}>
                Invalid password
              </p>
            )}
            <button type="submit" className="btn-primary" style={{ width: "100%" }}>
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2.5 }} />
      </div>
    );
  }

  const stats = [
    { label: "Documents", value: data?.totals.documents || 0, icon: FileText, color: "#0D9488", bg: "rgba(13,148,136,0.06)" },
    { label: "Text chunks", value: data?.totals.chunks || 0, icon: Layers, color: "#2563EB", bg: "rgba(37,99,235,0.06)" },
    { label: "Queries", value: data?.totals.queries || 0, icon: Search, color: "#CA8A04", bg: "rgba(202,138,4,0.06)" },
    { label: "Diagrams", value: data?.totals.diagrams || 0, icon: ImageIcon, color: "#E11D48", bg: "rgba(225,29,72,0.05)" },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">System metrics and document analytics</p>
      </div>

      {/* Stats */}
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

      {/* Chart */}
      <div className="glass-card chart-container">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "1rem" }}>
          <TrendingUp size={15} color="var(--accent)" />
          <span className="chart-title" style={{ marginBottom: 0 }}>Query volume (30 days)</span>
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
                  color: "var(--text-primary)",
                  fontSize: "0.82rem",
                  boxShadow: "var(--shadow-md)",
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
          <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <div style={{ textAlign: "center" }}>
              <Activity size={24} style={{ marginBottom: 6, opacity: 0.4 }} />
              <p style={{ fontSize: "0.88rem" }}>No query data yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card chart-container">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "1rem" }}>
          <FileText size={15} color="var(--accent)" />
          <span className="chart-title" style={{ marginBottom: 0 }}>Recent documents</span>
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
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{doc.title}</td>
                    <td>{doc.total_chunks}</td>
                    <td>{doc.diagrams_extracted || 0}</td>
                    <td>{new Date(doc.upload_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "1.5rem 0", fontSize: "0.88rem" }}>
            No documents yet
          </p>
        )}
      </div>
    </div>
  );
}
