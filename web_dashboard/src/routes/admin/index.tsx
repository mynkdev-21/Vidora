import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { BASE_URL } from "@/lib/api";
import {
  Users, FolderOpen, Eye, HardDrive, Wallet, TrendingUp,
  ArrowUpRight, Clock,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Vidora — Admin" }] }),
  component: AdminOverview,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";
const RED = "#f87171";
const YELLOW = "#fbbf24";

interface Stats {
  totalUsers: number;
  totalFiles: number;
  totalViews: number;
  totalStorage: number;
  pendingPayouts: number;
  pendingAmount: number;
  totalPaidOut: number;
  platformEarnings: number;
  todayUsers: number;
  todayFiles: number;
  todayViews: number;
  earningRate?: number;
  minPayout?: number;
}

function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<{ success: boolean; data: Stats }>("/api/admin/stats")
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + " KB";
    return bytes + " B";
  };

  const formatNumber = (n: number) => {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toString();
  };

  return (
    <AdminLayout title="Admin Overview" subtitle="Platform-wide statistics and management" activePage="Overview">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Main stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={formatNumber(stats.totalUsers)} sub={`+${stats.todayUsers} today`} color={PURPLE} />
            <StatCard icon={FolderOpen} label="Total Files" value={formatNumber(stats.totalFiles)} sub={`+${stats.todayFiles} today`} color={GREEN} />
            <StatCard icon={Eye} label="Total Views" value={formatNumber(stats.totalViews)} sub={`+${stats.todayViews} today`} color={YELLOW} />
            <StatCard icon={HardDrive} label="Storage Used" value={formatBytes(stats.totalStorage)} sub="All users combined" color={TEXT} />
          </div>

          {/* Financial stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={TrendingUp} label="Platform Earnings" value={`$${stats.platformEarnings.toFixed(2)}`} sub="Total user earnings" color={GREEN} />
            <StatCard icon={Wallet} label="Total Paid Out" value={`$${stats.totalPaidOut.toFixed(2)}`} sub="Completed payouts" color={PURPLE} />
            <StatCard icon={Clock} label="Pending Payouts" value={`$${stats.pendingAmount.toFixed(2)}`} sub={`${stats.pendingPayouts} requests`} color={stats.pendingPayouts > 0 ? RED : MUTED} />
          </div>

          {/* Quick info */}
          <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: TEXT }}>Quick Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span style={{ color: MUTED }}>Earning Rate:</span>
                <span className="ml-2 font-semibold" style={{ color: GREEN }}>
                  ${stats.earningRate ?? 5} / 1000 views
                </span>
              </div>
              <div>
                <span style={{ color: MUTED }}>Withdraw Methods:</span>
                <span className="ml-2 font-semibold" style={{ color: YELLOW }}>UPI, PayPal, Bank, Crypto</span>
              </div>
              <div>
                <span style={{ color: MUTED }}>Min Payout:</span>
                <span className="ml-2 font-semibold" style={{ color: TEXT }}>
                  ${(stats.minPayout ?? 5).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: MUTED }}>Failed to load stats.</p>
      )}
    </AdminLayout>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs mt-1" style={{ color: MUTED }}>{label}</p>
      <p className="text-[11px] mt-0.5" style={{ color }}>{sub}</p>
    </div>
  );
}
