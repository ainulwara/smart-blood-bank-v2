import { useState } from "react";
import toast from "react-hot-toast";
import { ClipboardList, Send } from "lucide-react";
import useFetch from "../../hooks/useFetch";
import { createEmergency, getEmergencies } from "../../services/endpoints";
import {
  BLOOD_GROUPS,
  CITY_SUGGESTIONS,
  formatDate,
  getErrorMessage,
  shortId,
  sortNewestFirst,
} from "../../utils/format";
import {
  BloodBadge,
  Card,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  StatusBadge,
  inputClass,
  primaryButton,
} from "../../components/ui";

export default function EmergencyRequests() {
  const { data, loading, error, reload } = useFetch(getEmergencies, []);
  const [form, setForm] = useState({ blood_group: "O+", units: 1, city: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const requests = sortNewestFirst(data?.requests || []);

  function handleChange(event) {
    setForm((f) => ({ ...f, [event.target.name]: event.target.value }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const units = Number(form.units);

    if (!form.city.trim()) {
      setFormError("Enter the city where the blood is needed.");
      return;
    }
    if (!Number.isInteger(units) || units < 1) {
      setFormError("Units must be a whole number of at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      await createEmergency({ blood_group: form.blood_group, units, city: form.city.trim() });
      toast.success("Emergency request submitted.");
      setForm((f) => ({ ...f, units: 1 }));
      await reload();
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not submit the request."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Emergency requests"
        title="Emergency requests"
        subtitle="Request blood urgently and track the status of every request you've made."
      />

      <Card className="mb-8">
        <h2 className="text-lg font-bold text-slate-900">New request</h2>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end">
          <div>
            <label htmlFor="blood_group" className="mb-2 block text-sm font-semibold text-slate-700">Blood group</label>
            <select id="blood_group" name="blood_group" value={form.blood_group} onChange={handleChange} className={inputClass}>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="units" className="mb-2 block text-sm font-semibold text-slate-700">Units needed</label>
            <input id="units" name="units" type="number" min="1" value={form.units} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-semibold text-slate-700">City</label>
            <input id="city" name="city" list="req-cities" value={form.city} onChange={handleChange} placeholder="e.g. Karachi" className={inputClass} />
            <datalist id="req-cities">
              {CITY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <button type="submit" disabled={submitting} className={primaryButton}>
            <Send size={16} /> {submitting ? "Sending..." : "Submit"}
          </button>
        </form>
        {formError && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        )}
      </Card>

      <h2 className="mb-4 text-lg font-bold text-slate-900">Your requests</h2>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : requests.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No requests yet" text="Requests you submit will show up here with their status." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Request ID</th>
                  <th className="px-6 py-4">Blood</th>
                  <th className="px-6 py-4">Units</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500" title={r.id}>{shortId(r.id)}</td>
                    <td className="px-6 py-4"><BloodBadge group={r.blood_group} /></td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{r.units}</td>
                    <td className="px-6 py-4 text-slate-600">{r.city}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}