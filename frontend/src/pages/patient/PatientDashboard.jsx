import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Bell, CheckCircle2, Clock, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useFetch from "../../hooks/useFetch";
import { getEmergencies, getNotifications } from "../../services/endpoints";
import { formatDate, sortNewestFirst } from "../../utils/format";
import {
  BloodBadge,
  Card,
  ErrorBox,
  Loading,
  PageHeader,
  StatCard,
  StatusBadge,
  primaryButton,
  secondaryButton,
} from "../../components/ui";

export default function PatientDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(async () => {
    const [emergencies, notifications] = await Promise.all([getEmergencies(), getNotifications()]);
    return {
      requests: emergencies?.requests || [],
      notifications: notifications?.notifications || [],
    };
  }, []);

  const requests = data?.requests || [];
  const pending = requests.filter((r) => r.status === "pending").length;
  const accepted = requests.filter((r) => r.status === "accepted").length;
  const unread = (data?.notifications || []).filter((n) => !n.is_read).length;
  const recent = sortNewestFirst(requests).slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Patient dashboard"
        title={`Hello, ${user?.name?.split(" ")[0] || "there"}`}
        subtitle="Find blood across the network and track your emergency requests."
        action={
          <div className="flex flex-wrap gap-3">
            <Link to="/blood-search" className={secondaryButton}><Search size={17} /> Find blood</Link>
            <Link to="/patient/emergency-requests" className={primaryButton}><AlertTriangle size={17} /> New request</Link>
          </div>
        }
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={AlertTriangle} label="Total requests" value={requests.length} />
            <StatCard icon={Clock} label="Pending" value={pending} tone="amber" />
            <StatCard icon={CheckCircle2} label="Accepted" value={accepted} tone="green" />
            <StatCard icon={Bell} label="Unread notifications" value={unread} tone="slate" />
          </div>

          <Card className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent requests</h2>
              <Link to="/patient/emergency-requests" className="inline-flex items-center gap-1 text-sm font-semibold text-blood-600 hover:text-blood-700">
                View all <ArrowRight size={15} />
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">You haven't made any requests yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {recent.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-4 py-4">
                    <BloodBadge group={r.blood_group} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{r.units} unit{r.units === 1 ? "" : "s"} in {r.city}</p>
                      <p className="text-xs text-slate-400">{formatDate(r.created_at)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}