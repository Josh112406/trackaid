"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Blocks,
  CircleDollarSign,
  ClipboardCheck,
  ExternalLink,
  FileClock,
  Gauge,
  LayoutDashboard,
  Landmark,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { AdminLogoutButton } from "@/components/admin-logout-button";
const items = [
  ["Overview", "/admin", LayoutDashboard],
  ["Programs", "/admin/programs", ClipboardCheck],
  ["Transactions", "/admin/transactions", CircleDollarSign],
  ["Payout routing", "/admin/payouts", Landmark],
  ["External sources", "/admin/sources", ExternalLink],
  ["Evidence", "/admin/evidence", FileClock],
  ["Blockchain", "/admin/blockchain", Blocks],
  ["Analytics", "/admin/analytics", BarChart3],
  ["System health", "/admin/health", Gauge],
  ["Audit log", "/admin/audit-log", ScrollText],
] as const;
export function AdminShell({
  email,
  role,
  children,
}: {
  email: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <main id="main-content" className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-heading">
          <ShieldCheck size={22} />
          <div>
            <strong>TrackAid</strong>
            <span>Control room</span>
          </div>
        </div>
        <nav aria-label="Admin pages">
          {items.map(([label, href, Icon]) => (
            <Link
              className={pathname === href ? "is-active" : undefined}
              href={href}
              key={href}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
          {role === "owner" ? (
            <Link
              className={pathname === "/admin/team" ? "is-active" : undefined}
              href="/admin/team"
            >
              <UsersRound size={17} />
              Admin team
            </Link>
          ) : null}
        </nav>
        <div className="admin-account">
          <span>{role}</span>
          <strong>{email}</strong>
          <Link href="/">
            <ArrowUpRight size={15} />
            Public site
          </Link>
          <AdminLogoutButton />
        </div>
      </aside>
      <div className="admin-main">
        {children}
        <footer className="admin-footer">
          <span>Supabase records</span>
          <span>PayMongo webhooks</span>
          <span>Philippine time · PHP</span>
        </footer>
      </div>
    </main>
  );
}
