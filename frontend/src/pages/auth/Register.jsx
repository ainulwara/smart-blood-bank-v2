import { Activity, ArrowRight, Eye, EyeOff, HeartPulse, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  function handleChange(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Your password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: "patient",
      });

      toast.success("Account created. You can now sign in.");
      navigate("/login", {
        replace: true,
        state: { registeredEmail: form.email.trim().toLowerCase() },
      });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Registration failed. Check your connection and try again.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50";

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />

        <Link to="/" className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600">
            <HeartPulse size={25} />
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            SmartBlood<span className="text-red-400"> Network</span>
          </span>
        </Link>

        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-red-300">
            <Activity size={15} /> CONNECTED BY CARE
          </span>
          <h1 className="mt-7 text-5xl font-black leading-tight xl:text-6xl">
            Be part of a network that
            <span className="text-red-400"> saves lives.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-8 text-slate-300">
            Create your account to search for blood availability and submit
            emergency requests when every second matters.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <HeartPulse className="text-red-400" size={24} />
              <p className="mt-4 font-bold">Find blood faster</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Search available blood groups across connected hospitals.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <ShieldCheck className="text-red-400" size={24} />
              <p className="mt-4 font-bold">One secure account</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Manage your requests and receive relevant notifications.
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          Smart Blood Bank Network � Every drop counts.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-9 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-red-600 lg:hidden"
          >
            <ArrowRight className="rotate-180" size={17} />
            Back to home
          </Link>

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white">
              <HeartPulse size={25} />
            </span>
            <span className="text-xl font-extrabold text-slate-900">
              SmartBlood <span className="text-red-600">Network</span>
            </span>
          </div>

          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-red-600">
              Get started
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Create your account
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Register as a patient to access the blood bank network.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
                Full name
              </label>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700">
                Confirm password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((previous) => !previous)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-slate-700"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-red-600 hover:text-red-700">
              Sign in
            </Link>
          </p>

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            By creating an account, you agree to use the network responsibly.
          </p>
        </div>
      </section>
    </main>
  );
}

