export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const CITY_SUGGESTIONS = ["Karachi", "Lahore", "Islamabad"];
export const LOW_STOCK_LIMIT = 5;

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortId(id) {
  return id ? String(id).slice(0, 8) : "-";
}

function pickString(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function getErrorMessage(err, fallback = "Something went wrong.") {
  const data = err?.response?.data;
  return (
    pickString(data?.message) ||
    pickString(data?.error) ||
    pickString(data?.detail) ||
    (err?.code === "ERR_NETWORK"
      ? "Cannot reach the server. Make sure the backend is running."
      : null) ||
    pickString(err?.message) ||
    fallback
  );
}

export function sortByBloodGroup(rows = []) {
  return [...rows].sort(
    (a, b) => BLOOD_GROUPS.indexOf(a.blood_group) - BLOOD_GROUPS.indexOf(b.blood_group)
  );
}

export function getRoleGroup(role) {
  const r = String(role || "").toLowerCase();
  if (["admin", "administrator"].includes(r)) return "admin";
  if (["staff", "hospital_staff", "hospital-staff"].includes(r)) return "staff";
  return "patient";
}

export function sortNewestFirst(rows = [], key = "created_at") {
  return [...rows].sort((a, b) => new Date(b[key]) - new Date(a[key]));
}