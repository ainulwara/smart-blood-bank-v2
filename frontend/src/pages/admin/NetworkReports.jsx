import { RefreshCw } from "lucide-react";
import useFetch from "../../hooks/useFetch";
import { getReports } from "../../services/endpoints";
import { formatDate } from "../../utils/format";
import { BloodBadge, Card, ErrorBox, Loading, PageHeader, secondaryButton } from "../../components/ui";
import UnitsChart from "../../components/UnitsChart";

export default function NetworkReports() {
  const { data, loading, error, reload } = useFetch(getReports, []);

  const byHospital = data?.inventory_by_hospital || [];
  const byGroup = data?.inventory_by_blood_group || [];
  const lowStock = data?.low_stock || [];
  const emergencySummary = data?.emergency_summary || [];

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Network reports"
        subtitle={data?.generated_at_utc ? `Generated ${formatDate(data.generated_at_utc)}` : "Inventory and emergency reports across all hospitals."}
        action={
          <button type="button" onClick={reload} disabled={loading} className={secondaryButton}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      {loading && !data ? (
        <Loading label="Building reports..." />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-bold text-slate-900">Units by blood group</h2>
              <p className="text-sm text-slate-500">Combined stock across the network</p>
              <div className="mt-4">
                <UnitsChart data={byGroup} xKey="blood_group" yKey="network_units" />
              </div>
            </Card>
            <Card>
              <h2 className="text-lg font-bold text-slate-900">Units by hospital</h2>
              <p className="text-sm text-slate-500">Total stock held at each hospital</p>
              <div className="mt-4">
                <UnitsChart data={byHospital} xKey="hospital_name" yKey="total_units" />
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Low-stock alerts</h2>
              <p className="text-sm text-slate-500">
                Blood groups with {data?.low_stock_threshold ?? 5} units or fewer
              </p>
            </div>
            {lowStock.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-500">No blood group is running low.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Blood</th>
                      <th className="px-6 py-4">Hospital</th>
                      <th className="px-6 py-4">City</th>
                      <th className="px-6 py-4">Units</th>
                      <th className="px-6 py-4">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStock.map((row) => (
                      <tr key={`${row.hospital_id}-${row.blood_group}`} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3"><BloodBadge group={row.blood_group} /></td>
                        <td className="px-6 py-3 font-semibold text-slate-900">{row.hospital_name}</td>
                        <td className="px-6 py-3 text-slate-600">{row.city}</td>
                        <td className="px-6 py-3 font-black text-amber-700">{row.units}</td>
                        <td className="px-6 py-3 text-slate-500">{formatDate(row.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">Emergency request summary</h2>
            {emergencySummary.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No emergency requests have been recorded yet.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {emergencySummary.map((item, index) => (
                  <div key={index} className="rounded-xl bg-slate-50 p-4">
                    {Object.entries(item).map(([key, value]) => (
                      <p key={key} className="flex justify-between gap-3 text-sm">
                        <span className="capitalize text-slate-500">{key.replace(/_/g, " ")}</span>
                        <span className="font-bold text-slate-900">{String(value)}</span>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}