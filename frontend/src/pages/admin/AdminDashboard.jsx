import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Building2, Droplets, TrendingDown } from "lucide-react";
import useFetch from "../../hooks/useFetch";
import { getReports } from "../../services/endpoints";
import { LOW_STOCK_LIMIT } from "../../utils/format";
import { BloodBadge, Card, ErrorBox, Loading, PageHeader, StatCard, primaryButton } from "../../components/ui";
import UnitsChart from "../../components/UnitsChart";

export default function AdminDashboard() {
  const { data, loading, error, reload } = useFetch(getReports, []);

  const byHospital = data?.inventory_by_hospital || [];
  const byGroup = data?.inventory_by_blood_group || [];
  const lowStock = data?.low_stock || [];
  const totalUnits = byHospital.reduce((sum, h) => sum + h.total_units, 0);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Admin dashboard"
        subtitle="A live overview of blood stock across the hospital network."
        action={
          <Link to="/admin/reports" className={primaryButton}>
            Full reports <ArrowRight size={16} />
          </Link>
        }
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Droplets} label="Network units" value={totalUnits} />
            <StatCard icon={Building2} label="Hospitals" value={byHospital.length} tone="slate" />
            <StatCard icon={TrendingDown} label="Low-stock alerts" value={lowStock.length} tone="amber" hint={`${data?.low_stock_threshold ?? LOW_STOCK_LIMIT} units or fewer`} />
            <StatCard icon={AlertTriangle} label="Blood groups tracked" value={byGroup.length} tone="green" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-900">Network stock by blood group</h2>
              <div className="mt-4">
                <UnitsChart data={byGroup} xKey="blood_group" yKey="network_units" />
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-bold text-slate-900">Hospitals</h2>
              <ul className="mt-4 divide-y divide-slate-100">
                {byHospital.map((h) => (
                  <li key={h.hospital_id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{h.hospital_name}</p>
                      <p className="text-xs text-slate-400">{h.city}</p>
                    </div>
                    <p className="text-xl font-black text-slate-900">{h.total_units}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="mt-6">
            <h2 className="text-lg font-bold text-slate-900">Lowest stock</h2>
            {lowStock.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No blood group is running low.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lowStock.slice(0, 6).map((row) => (
                  <li key={`${row.hospital_id}-${row.blood_group}`} className="flex items-center gap-3 rounded-xl bg-amber-50/60 p-3 ring-1 ring-amber-100">
                    <BloodBadge group={row.blood_group} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{row.hospital_name}</p>
                      <p className="text-xs text-slate-500">{row.city}</p>
                    </div>
                    <p className="font-black text-amber-700">{row.units}</p>
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