import { useState } from "react";
import toast from "react-hot-toast";
import { Bell, CheckCheck } from "lucide-react";
import useFetch from "../hooks/useFetch";
import { getNotifications, markNotificationRead } from "../services/endpoints";
import { formatDate, getErrorMessage, sortNewestFirst } from "../utils/format";
import { Card, EmptyState, ErrorBox, Loading, PageHeader, secondaryButton } from "../components/ui";

function notifyChanged() {
  window.dispatchEvent(new Event("sbb:notifications-changed"));
}

export default function Notifications() {
  const { data, loading, error, reload } = useFetch(getNotifications, []);
  const [busy, setBusy] = useState(false);

  const notifications = sortNewestFirst(data?.notifications || []);
  const unread = notifications.filter((n) => !n.is_read);

  async function markRead(id) {
    try {
      await markNotificationRead(id);
      await reload();
      notifyChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not mark as read."));
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await Promise.all(unread.map((n) => markNotificationRead(n.id)));
      toast.success("All notifications marked as read.");
      await reload();
      notifyChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update notifications."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        subtitle="Updates about your requests and stock alerts."
        action={
          unread.length > 0 && (
            <button type="button" onClick={markAllRead} disabled={busy} className={secondaryButton}>
              <CheckCheck size={17} /> Mark all as read
            </button>
          )
        }
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" text="New notifications will appear here." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`flex items-start gap-4 p-5 ${n.is_read ? "" : "border-red-200 bg-red-50/40"}`}
            >
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${n.is_read ? "bg-slate-300" : "bg-blood-600"}`}
              />
              <div className="min-w-0 flex-1">
                <p className={`leading-6 ${n.is_read ? "text-slate-600" : "font-semibold text-slate-900"}`}>
                  {n.message}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDate(n.created_at)}
                  {n.type ? ` - ${String(n.type).replace(/_/g, " ")}` : ""}
                </p>
              </div>
              {!n.is_read && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="shrink-0 text-sm font-semibold text-blood-600 hover:text-blood-700"
                >
                  Mark read
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}