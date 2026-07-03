import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { TrendingUp, Users, Upload, Eye, Crown } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";
const RED = "#f87171";
const YELLOW = "#fbbf24";

interface Analytics {
  userGrowth: { date: string; count: number }[];
  uploadGrowth: { date: string; count: number }[];
  topUploaders: { id: string; name: string; email: string; file_count: number; total_views: number; storage_used: number }[];
  recentPayouts: { id: string; amount: number; method: string; status: string; requested_at: string; user_name: string }[];
}

function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<{ success: boolean; data: Analytics }>("/api/admin/analytics")
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
    return (bytes / 1e3).toFixed(0) + " KB";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return GREEN;
      case "failed": return RED;
      case "processing": return YELLOW;
      default: return PURPLE;
    }
  };

  return (
    <AdminLayout title="Analytics" subtitle="Platform growth and top performers" activePage="Analytics">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Growth Charts (simple bar representation) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* User Growth */}
            <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4" style={{ color: PURPLE }} />
                <h3 className="text-sm font-semibold" style={{ color: TEXT }}>User Signups (30 days)</h3>
              </div>
              {data.userGrowth.length === 0 ? (
                <p className="text-xs" style={{ color: MUTED }}>No data yet.</p>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {data.userGrowth.map((d, i) => {
                    const max = Math.max(...data.userGrowth.map(x => x.count), 1);
                    const height = (d.count / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div className="absolute -top-6 hidden group-hover:block text-[10px] px-1.5 py-0.5 rounded" style={{ background: PURPLE, color: "white" }}>
                          {d.count}
                        </div>
                        <div
                          className="w-full rounded-t transition-all"
                          style={{ height: `${Math.max(height, 4)}%`, background: `linear-gradient(to top, ${PURPLE}80, ${PURPLE})`, minHeight: "2px" }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] mt-2" style={{ color: MUTED }}>
                Total: {data.userGrowth.reduce((s, d) => s + d.count, 0)} new users
              </p>
            </div>

            {/* Upload Growth */}
            <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2 mb-4">
                <Upload className="h-4 w-4" style={{ color: GREEN }} />
                <h3 className="text-sm font-semibold" style={{ color: TEXT }}>File Uploads (30 days)</h3>
              </div>
              {data.uploadGrowth.length === 0 ? (
                <p className="text-xs" style={{ color: MUTED }}>No data yet.</p>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {data.uploadGrowth.map((d, i) => {
                    const max = Math.max(...data.uploadGrowth.map(x => x.count), 1);
                    const height = (d.count / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div className="absolute -top-6 hidden group-hover:block text-[10px] px-1.5 py-0.5 rounded" style={{ background: GREEN, color: "#0b0c14" }}>
                          {d.count}
                        </div>
                        <div
                          className="w-full rounded-t transition-all"
                          style={{ height: `${Math.max(height, 4)}%`, background: `linear-gradient(to top, ${GREEN}80, ${GREEN})`, minHeight: "2px" }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] mt-2" style={{ color: MUTED }}>
                Total: {data.uploadGrowth.reduce((s, d) => s + d.count, 0)} new files
              </p>
            </div>
          </div>

          {/* Top Uploaders */}
          <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-4 w-4" style={{ color: YELLOW }} />
              <h3 className="text-sm font-semibold" style={{ color: TEXT }}>Top Uploaders</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: MUTED }}>#</th>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: MUTED }}>User</th>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: MUTED }}>Files</th>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: MUTED }}>Views</th>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: MUTED }}>Storage</th>
                    <th className="text-left px-3 py-2 font-semibold" style={{ color: MUTED }}>Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topUploaders.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="px-3 py-2">
                        <span className="text-xs font-bold" style={{ color: i < 3 ? YELLOW : MUTED }}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-[11px]" style={{ color: MUTED }}>{u.email}</p>
                      </td>
                      <td className="px-3 py-2" style={{ color: TEXT }}>{u.file_count}</td>
                      <td className="px-3 py-2" style={{ color: TEXT }}>{u.total_views.toLocaleString()}</td>
                      <td className="px-3 py-2" style={{ color: TEXT }}>{formatBytes(u.storage_used)}</td>
                      <td className="px-3 py-2" style={{ color: GREEN }}>${(u.total_views * 5 / 1000).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payouts */}
          <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4" style={{ color: GREEN }} />
              <h3 className="text-sm font-semibold" style={{ color: TEXT }}>Recent Payouts</h3>
            </div>
            <div className="space-y-2">
              {data.recentPayouts.length === 0 ? (
                <p className="text-xs" style={{ color: MUTED }}>No payouts yet.</p>
              ) : data.recentPayouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div>
                    <p className="text-sm font-medium text-white">{p.user_name}</p>
                    <p className="text-[11px]" style={{ color: MUTED }}>{p.method} · {new Date(p.requested_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: GREEN }}>${parseFloat(String(p.amount)).toFixed(2)}</p>
                    <span className="text-[10px] font-semibold capitalize" style={{ color: getStatusColor(p.status) }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: MUTED }}>Failed to load analytics.</p>
      )}
    </AdminLayout>
  );
}
