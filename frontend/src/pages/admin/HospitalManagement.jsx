import { useState } from "react";
import toast from "react-hot-toast";
import { Building2, MapPin, Pencil, Plus, Server } from "lucide-react";
import useFetch from "../../hooks/useFetch";
import { getHospitals, saveHospital } from "../../services/endpoints";
import { getErrorMessage } from "../../utils/format";
import {
  Card,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  inputClass,
  primaryButton,
  secondaryButton,
} from "../../components/ui";

const EMPTY = { id: "", name: "", city: "", api_url: "" };

export default function HospitalManagement() {
  const { data, loading, error, reload } = useFetch(getHospitals, []);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const hospitals = data?.hospitals || [];

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((f) => ({ ...f, [name]: name === "id" ? value.toUpperCase() : value }));
    setFormError("");
  }

  function startEdit(hospital) {
    setForm({ id: hospital.id, name: hospital.name, city: hospital.city, api_url: hospital.api_url });
    setEditing(true);
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setForm(EMPTY);
    setEditing(false);
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!/^[A-Z]$/.test(form.id)) {
      setFormError("Hospital ID must be a single letter (for example D).");
      return;
    }
    if (!form.name.trim() || !form.city.trim() || !form.api_url.trim()) {
      setFormError("Name, city and API URL are all required.");
      return;
    }

    setSaving(true);
    try {
      await saveHospital({
        id: form.id,
        name: form.name.trim(),
        city: form.city.trim(),
        api_url: form.api_url.trim(),
      });
      toast.success(editing ? "Hospital updated." : "Hospital added.");
      reset();
      await reload();
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not save the hospital."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Hospital network"
        title="Hospital management"
        subtitle="View the hospitals in the network and add or update a node."
      />

      <Card className="mb-8">
        <h2 className="text-lg font-bold text-slate-900">{editing ? `Edit Hospital ${form.id}` : "Add a hospital"}</h2>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="id" className="mb-2 block text-sm font-semibold text-slate-700">Hospital ID</label>
            <input id="id" name="id" maxLength={1} value={form.id} onChange={handleChange} readOnly={editing} placeholder="D" className={`${inputClass} ${editing ? "bg-slate-50" : ""}`} />
          </div>
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
            <input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Hospital D" className={inputClass} />
          </div>
          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-semibold text-slate-700">City</label>
            <input id="city" name="city" value={form.city} onChange={handleChange} placeholder="Peshawar" className={inputClass} />
          </div>
          <div>
            <label htmlFor="api_url" className="mb-2 block text-sm font-semibold text-slate-700">API URL</label>
            <input id="api_url" name="api_url" value={form.api_url} onChange={handleChange} placeholder="http://127.0.0.1:5004" className={inputClass} />
          </div>

          {formError && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
              {formError}
            </p>
          )}

          <div className="flex gap-3 md:col-span-2">
            <button type="submit" disabled={saving} className={primaryButton}>
              <Plus size={16} /> {saving ? "Saving..." : editing ? "Save changes" : "Add hospital"}
            </button>
            {editing && (
              <button type="button" onClick={reset} className={secondaryButton}>Cancel</button>
            )}
          </div>
        </form>
      </Card>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : hospitals.length === 0 ? (
        <EmptyState icon={Building2} title="No hospitals found" />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {hospitals.map((h) => (
            <Card key={h.id} hover className="p-6">
              <div className="flex items-start justify-between">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-xl font-black text-blood-600">
                  {h.id}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(h)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  <Pencil size={14} /> Edit
                </button>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{h.name}</h3>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin size={15} className="text-slate-400" /> {h.city}</p>
              <p className="mt-1 flex items-center gap-2 break-all font-mono text-xs text-slate-500"><Server size={15} className="shrink-0 text-slate-400" /> {h.api_url}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}