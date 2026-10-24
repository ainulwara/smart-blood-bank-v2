import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getNotifications } from "../services/endpoints";
import { getRoleGroup } from "../utils/format";

const NAV = {
  patient: [
    { to: "/patient/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/blood-search", label: "Find Blood", icon: Search },
    { to: "/patient/emergency-requests", label: "Emergency Requests", icon: AlertTriangle },
    { to: "/patient/notifications", label: "Notifications", icon: Bell, badge: true },
  ],
  staff: [
    { to: "/staff/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/staff/inventory", label: "Inventory", icon: Package },
    { to: "/staff/emergencies", label: "Emergency Requests", icon: AlertTriangle },
    { to: "/blood-search", label: "Blood Search", icon: Search },
    { to: "/staff/notifications", label: "Notifications", icon: Bell, badge: true },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/reports", label: "Network Reports", icon: BarChart3 },
    { to: "/admin/hospitals", label: "Hospitals", icon: Building2 },
    { to: "/blood-search", label: "Blood Search", icon: Search },
    { to: "/admin/notifications", label: "Notifications", icon: Bell, badge: true },
  ],
};

function SidebarContent({ items, unread, user, onLogout }) {
  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-3 px-6 py-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blood-600 text-white shadow-lg shadow-red-200">
          <HeartPulse size={25} strokeWidth={2.2} />
        </span>
        <span>
          <span className="block text-lg font-extrabold tracking-tight text-slate-900">
            Smart<span className="text-blood-600">Blood</span>
          </span>
          <span className="block text-xs font-medium tracking-widest text-slate-500">NETWORK</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-4">
        {items.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-red-50 text-blood-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-blood-600"
              }`
            }
          >
            <Icon size={19} />
            <span className="flex-1">{label}</span>
            {badge && unread > 0 && (
              <span className="rounded-full bg-blood-600 px-2 py-0.5 text-xs font-bold text-white">
                {unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blood-600 text-sm font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{user?.name || user?.email}</p>
            <p className="text-xs capitalize text-slate-500">
              {user?.role}
              {user?.hospital_id ? ` - Hospital ${user.hospital_id}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const items = NAV[getRoleGroup(user?.role)];

  const refreshUnread = useCallback(async () => {
    try {
      const data = await getNotifications();
      setUnread((data?.notifications || []).filter((n) => !n.is_read).length);
    } catch {
      // The badge is a nicety; ignore failures here.
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    setOpen(false);
  }, [refreshUnread, location.pathname]);

  useEffect(() => {
    window.addEventListener("sbb:notifications-changed", refreshUnread);
    return () => window.removeEventListener("sbb:notifications-changed", refreshUnread);
  }, [refreshUnread]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const sidebar = (
    <SidebarContent items={items} unread={unread} user={user} onLogout={handleLogout} />
  );

  return (
    <div className="min-h-screen bg-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-100 bg-white lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/90 px-5 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Menu size={22} />
          </button>
          <span className="flex items-center gap-2 font-extrabold text-slate-900">
            <HeartPulse size={20} className="text-blood-600" /> Smart<span className="-ml-1.5 text-blood-600">Blood</span>
          </span>
          <span className="w-9" />
        </header>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-red-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-rose-50 blur-3xl" />
          <main className="relative mx-auto min-h-screen max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}