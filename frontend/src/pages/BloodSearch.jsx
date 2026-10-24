import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Clock, MapPin, Search, Siren } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { searchBlood } from "../services/endpoints";
import {
  BLOOD_GROUPS,
  CITY_SUGGESTIONS,
  LOW_STOCK_LIMIT,
  formatDate,
  getErrorMessage,
  getRoleGroup,
} from "../utils/format";
import {
  BloodBadge,
  Card,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  inputClass,
  primaryButton,
} from "../components/ui";

export default function BloodSearch() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ group: "", city: "" });
  const [state, setState] = useState({ results: [], loading: true, error: "" });

  const runSearch = useCallback(async (current) => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    const params = {};
    if (current.group) params.group = current.group;
    if (current.city.trim()) params.city = current.city.trim();

    try {
      const data = await searchBlood(params);
      setState({ results: data?.results || [], loading: false, error: "" });
    } catch (err) {
      setState({ results: [], loading: false, error: getErrorMessage(err, "Search failed.") });
    }
  }, []);

  useEffect(() => {
    runSearch({ group: "", city: "" });
  }, [runSearch]);

  function handleSubmit(event) {
    event.preventDefault();
    runSearch(filters);
  }

  function handleReset() {
    const empty = { group: "", city: "" };
    setFilters(empty);
    runSearch(empty);
  }

  const isPatient = getRoleGroup(user?.role) === "patient";

  return (
    <>
      <PageHeader
        eyebrow="Blood availability"
        title="Find blood"
        subtitle="Search live blood availability across every hospital in the network."
      />

      <Card className="mb-8">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <div>
            <label htmlFor="group" className="mb-2 block text-sm font-semibold text-slate-700">
              Blood group
            </label>
            <select
              id="group"
              value={filters.group}
              onChange={(e) => setFilters((f) => ({ ...f, group: e.target.value }))}
              className={inputClass}
            >
              <option value="">All groups</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-semibold text-slate-700">
              City
            </label>
            <input
              id="city"
              list="city-options"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              placeholder="Any city"
              className={inputClass}
            />
            <datalist id="city-options">
              {CITY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <button type="submit" disabled={state.loading} className={primaryButton}>
            <Search size={17} /> Search
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            Reset
          </button>
        </form>
      </Card>

      {state.loading ? (
        <Loading label="Searching the network..." />
      ) : state.error ? (
        <ErrorBox message={state.error} onRetry={() => runSearch(filters)} />
      ) : state.results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching blood found"
          text="No hospital currently lists this combination. Try another blood group or city."
          action={
            isPatient && (
              <Link to="/patient/emergency-requests" className={primaryButton}>
                <Siren size={17} /> Raise an emergency request
              </Link>
            )
          }
        />
      ) : (
        <>
          <p className="mb-4 text-sm font-medium text-slate-500">
            {state.results.length} result{state.results.length === 1 ? "" : "s"} found
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {state.results.map((row) => {
              const out = row.units <= 0;
              const low = !out && row.units <= LOW_STOCK_LIMIT;
              return (
                <Card key={row.id} hover className="p-6">
                  <div className="flex items-start justify-between">
                    <BloodBadge group={row.blood_group} size="lg" />
                    <div className="text-right">
                      <p className={`text-3xl font-black ${out ? "text-slate-300" : low ? "text-amber-600" : "text-slate-900"}`}>
                        {row.units}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {out ? "Out of stock" : low ? "Low stock" : "units"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2 font-semibold text-slate-900">
                      <Building2 size={16} className="text-blood-600" /> {row.hospital_name}
                    </p>
                    <p className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" /> {row.city}</p>
                    <p className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock size={14} /> Updated {formatDate(row.updated_at)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}