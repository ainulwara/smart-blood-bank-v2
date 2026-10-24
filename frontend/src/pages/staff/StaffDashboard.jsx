import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Droplets, Package, TrendingDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useFetch from "../../hooks/useFetch";
import { getEmergencies, getInventory } from "../../services/endpoints";
import { LOW_STOCK_LIMIT, formatDate, sortByBloodGroup, sortNewestFirst } from "../../utils/format";
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

export default function StaffDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(async () => {
    const [inventory, emergencies] = await Promise.all([getInventory(), getEmergencies()]);
    return {
      inventory: inventory?.inventory || [],
      hospitalId: inventory?.hospital_id,
      requests: emergencies?.requests || [],
    };
  }, []);

  const ownId = user?.hospital_id || data?.hospitalId;
  const own = sortByBloodGroup((data?.inventory || []).filter((r) => r.hospital_id === ownId));
  const totalUnits = own.reduce((sum, r) => sum + r.units, 0);
  const low = own.filter((r) => r.units <= LOW_STOCK_LIMIT);
  const requests = data?.requests || [];
  const pending = requests.filter((r) => r.status === "pending");

  return (
    <>
      <PageHeader
        eyebrow="Staff dashboard"
        title="Staff dashboard"
        subtitle={`Overview of ${own[0]?.hospital_name || "your hospital"}'s blood stock and incoming requests.`}
        action={
          <div className="flex flex-wrap gap-3">
            <Link to="/staff/emergencies" className={secondaryButton}><AlertTriangle size={17} /> Requests</Link>
            <Link to="/staff/inventory" className={primaryButton}><Package size={17} /> Update stock</Link>
          </div>
        }
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard icon={Droplets} label="Total units in stock" value={totalUnits} />
            <StatCard icon={TrendingDown} label="Low-stock groups" value={low.length} tone="amber" hint={`${LOW_STOCK_LIMIT} units or fewer`} />
            <StatCard icon={AlertTriangle} label="Pending requests" value={pending.length} tone="slate" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-bold text-slate-900">Stock by blood group</h2>
              <ul className="mt-4 divide-y divide-slate-100">
                {own.map((r) => (
                  <li key={r.id} className="flex items-center gap-4 py-3">
                    <BloodBadge group={r.blood_group} />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${r.units <= LOW_STOCK_LIMIT ? "bg-amber-500" : "bg-blood-600"}`}
                        style={{ width: `${Math.min(100, (r.units / 25) * 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-bold text-slate-900">{r.units}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Pending requests</h2>
                <Link to="/staff/emergencies" className="inline-flex items-center gap-1 text-sm font-semibold text-blood-600 hover:text-blood-700">
                  Manage <ArrowRight size={15} />
                </Link>
              </div>
              {pending.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No requests are waiting for review.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {sortNewestFirst(pending).slice(0, 5).map((r) => (
                    <li key={r.id} className="flex items-center gap-4 py-3">
                      <BloodBadge group={r.blood_group} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{r.units} unit{r.units === 1 ? "" : "s"} - {r.city}</p>
                        <p className="text-xs text-slate-400">{formatDate(r.created_at)}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}