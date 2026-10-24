import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { getDashboardPath, useAuth } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.email.trim() || !form.password) {
      setError("Enter both your email address and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const authenticatedUser = await login({
        email: form.email.trim(),
        password: form.password,
      });

      toast.success("Welcome back!");
      navigate(getDashboardPath(authenticatedUser?.role), { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Unable to sign in. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-rose-600/10 blur-3xl" />

        <Link to="/" className="relative flex w-fit items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blood-600">
            <HeartPulse size={25} />
          </span>
          <span>
            <span className="block text-lg font-extrabold">SmartBlood</span>
            <span className="block text-xs tracking-[0.2em] text-slate-400">NETWORK</span>
          </span>
        </Link>

        <div className="relative max-w-xl py-12">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-red-400">
            <Activity size={29} />
          </div>
          <h1 className="text-4xl font-black leading-tight xl:text-5xl">
            Better coordination.
            <span className="mt-2 block text-red-400">Timely access to blood.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
            Sign in to access your Smart Blood Bank Network workspace and the
            tools available to your account.
          </p>

          <div className="mt-10 space-y-4">
            {[
              "Blood availability search",
              "Emergency request coordination",
              "Secure, role-based dashboards",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
                <ShieldCheck size={18} className="text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-slate-500">
          A connected approach to blood inventory coordination.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blood-600">
            <ArrowLeft size={17} /> Back to home
          </Link>

          <div className="mb-8 lg:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blood-600 text-white">
              <HeartPulse size={27} />
            </span>
            <p className="mt-3 text-lg font-extrabold">SmartBlood Network</p>
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blood-600">
            Welcome back
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Sign in to your account
          </h2>
          <p className="mt-3 leading-7 text-slate-500">
            Enter your credentials to continue to your workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blood-500 focus:ring-4 focus:ring-red-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <LockKeyhole size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-blood-500 focus:ring-4 focus:ring-red-50"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blood-600 px-5 py-4 font-semibold text-white shadow-lg shadow-red-100 transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-blood-600 hover:text-blood-700">
              Create one
            </Link>
          </p>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="text-xs leading-5 text-slate-500">
              Your account permissions determine which dashboards and actions
              are available after sign in.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
