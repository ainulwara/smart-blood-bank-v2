import { useState } from "react";
import toast from "react-hot-toast";
import { Check, ClipboardList, X } from "lucide-react";
import useFetch from "../../hooks/useFetch";
import { acceptEmergency, getEmergencies, rejectEmergency } from "../../services/endpoints";
import { formatDate, getErrorMessage, shortId, sortNewestFirst } from "../../utils/format";
import {
  BloodBadge,
  Card,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  StatusBadge,
} from "../../components/ui";

const FILTERS = ["all", "pending", "accepted", "rejected"];

function requesterLabel(r) {
  return r.requester_name || r.requester_email || r.name || r.email || shortId(r.requester_id);
}

export default function EmergencyManagement() {
  const { data, loading, error, reload } = useFetch(getEmergencies, []);
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState(null);

  const all = sortNewestFirst(data?.requests || []);
  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === "all" ? all.length : all.filter((r) => r.status === f).length;
    return acc;
  }, {});
  const visible = filter === "all" ? all : all.filter((r) => r.status === filter);

  async function act(request, action) {
    setBusyId(request.id);
    try {
      if (action === "accept") await acceptEmergency(request.id);
      else await rejectEmergency(request.id);
      toast.success(`Request ${shortId(request.id)} ${action === "accept" ? "accepted" : "rejected"}.`);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err, `Could not ${action} the request.`));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Emergency response"
        title="Emergency requests"
        subtitle="Review incoming requests and accept or reject them."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
              filter === f
                ? "bg-blood-600 text-white shadow-md shadow-red-200"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:border-red-200 hover:bg-red-50"
            }`}
          >
            {f} <span className="ml-1 opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={filter === "all" ? "No emergency requests" : `No ${filter} requests`}
          text="New requests from patients will appear here."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Request ID</th>
                  <th className="px-6 py-4">Requester</th>
                  <th className="px-6 py-4">Blood</th>
                  <th className="px-6 py-4">Units</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Requested</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => {
                  const busy = busyId === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500" title={r.id}>{shortId(r.id)}</td>
                      <td className="px-6 py-4 text-slate-700">{requesterLabel(r)}</td>
                      <td className="px-6 py-4"><BloodBadge group={r.blood_group} /></td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{r.units}</td>
                      <td className="px-6 py-4 text-slate-600">{r.city}</td>
                      <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-6 py-4 text-slate-500">{formatDate(r.created_at)}</td>
                      <td className="px-6 py-4">
                        {r.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => act(r, "accept")}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Check size={14} /> Accept
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => act(r, "reject")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <p className="text-right text-xs text-slate-400">Completed</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}