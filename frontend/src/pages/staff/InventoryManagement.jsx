import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useFetch from "../../hooks/useFetch";
import { getInventory, updateInventory } from "../../services/endpoints";
import { LOW_STOCK_LIMIT, formatDate, getErrorMessage, sortByBloodGroup } from "../../utils/format";
import { BloodBadge, Card, ErrorBox, Loading, PageHeader, inputClass } from "../../components/ui";

function StockCard({ row, onSaved }) {
  const [value, setValue] = useState(String(row.units));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(String(row.units));
  }, [row.units]);

  const units = Number(value);
  const valid = value !== "" && Number.isInteger(units) && units >= 0;
  const changed = valid && units !== row.units;
  const low = row.units <= LOW_STOCK_LIMIT;

  async function save() {
    setSaving(true);
    try {
      await updateInventory(row.blood_group, units);
      toast.success(`${row.blood_group} updated to ${units} units.`);
      await onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update inventory."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card hover className={`p-5 ${low ? "border-amber-200" : ""}`}>
      <div className="flex items-center justify-between">
        <BloodBadge group={row.blood_group} size="lg" />
        {low && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
            Low stock
          </span>
        )}
      </div>
      <p className="mt-4 text-4xl font-black text-slate-900">
        {row.units} <span className="text-sm font-semibold text-slate-400">units</span>
      </p>
      <p className="mt-1 text-xs text-slate-400">Updated {formatDate(row.updated_at)}</p>

      <div className="mt-5 flex gap-2">
        <input
          type="number"
          min="0"
          aria-label={`New units for ${row.blood_group}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={save}
          disabled={!changed || saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blood-600 px-4 text-sm font-semibold text-white shadow-md shadow-red-200 transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <Save size={15} /> {saving ? "..." : "Save"}
        </button>
      </div>
    </Card>
  );
}

export default function InventoryManagement() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(getInventory, []);

  const inventory = data?.inventory || [];
  const ownId = user?.hospital_id || data?.hospital_id;
  const own = sortByBloodGroup(inventory.filter((r) => r.hospital_id === ownId));
  const others = inventory.filter((r) => r.hospital_id !== ownId);
  const otherHospitals = [...new Set(others.map((r) => r.hospital_id))].sort();

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Inventory management"
        subtitle="Update your hospital's blood stock. Changes are synchronised to the other hospitals automatically."
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <>
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            {own[0]?.hospital_name || `Hospital ${ownId}`} <span className="font-medium text-slate-400">(your hospital)</span>
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {own.map((row) => (
              <StockCard key={row.id} row={row} onSaved={reload} />
            ))}
          </div>

          {others.length > 0 && (
            <>
              <h2 className="mb-4 mt-12 text-lg font-bold text-slate-900">Other hospitals</h2>
              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Blood</th>
                        {otherHospitals.map((id) => {
                          const sample = others.find((r) => r.hospital_id === id);
                          return (
                            <th key={id} className="px-6 py-4">
                              {sample?.hospital_name} <span className="font-medium normal-case text-slate-400">({sample?.city})</span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {own.map((row) => (
                        <tr key={row.blood_group}>
                          <td className="px-6 py-3"><BloodBadge group={row.blood_group} /></td>
                          {otherHospitals.map((id) => {
                            const cell = others.find((r) => r.hospital_id === id && r.blood_group === row.blood_group);
                            const units = cell?.units;
                            return (
                              <td key={id} className={`px-6 py-3 font-semibold ${units <= LOW_STOCK_LIMIT ? "text-amber-600" : "text-slate-900"}`}>
                                {units ?? "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}