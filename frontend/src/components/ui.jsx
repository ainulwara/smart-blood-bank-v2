import { AlertCircle, Inbox, Loader2 } from "lucide-react";

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blood-600">{eyebrow}</p>
        )}
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-2xl leading-7 text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className = "", hover = false, children }) {
  const hoverClass = hover
    ? "transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl hover:shadow-red-100/50"
    : "";
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}

const tones = {
  red: "bg-red-50 text-blood-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
};

export function StatCard({ icon: Icon, label, value, hint, tone = "red" }) {
  return (
    <Card hover className="flex items-start gap-4">
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <Icon size={26} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    </Card>
  );
}

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  const style = statusStyles[key] || "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ring-inset ${style}`}>
      {key || "unknown"}
    </span>
  );
}

export function BloodBadge({ group, size = "md" }) {
  const sizes = {
    md: "h-9 min-w-[2.75rem] px-3 text-sm",
    lg: "h-14 min-w-[3.5rem] px-4 text-xl",
  };
  return (
    <span className={`inline-flex items-center justify-center rounded-xl bg-blood-600 font-black text-white shadow-md shadow-red-200 ${sizes[size]}`}>
      {group}
    </span>
  );
}

export function Loading({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 size={22} className="animate-spin text-blood-600" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 text-red-700">
        <AlertCircle size={20} className="mt-0.5 shrink-0" />
        <p className="text-sm leading-6">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-blood-600">
        <Icon size={26} />
      </span>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      {text && <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blood-500 focus:ring-4 focus:ring-red-50";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blood-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";