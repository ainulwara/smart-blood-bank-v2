import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  Droplet,
  HeartPulse,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  Building2,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: Search,
    title: "Find Blood",
    description:
      "Search for compatible blood groups and discover available inventory across the connected network.",
  },
  {
    icon: Activity,
    title: "Emergency Requests",
    description:
      "Submit urgent blood requests and let participating hospital teams respond through the network.",
  },
  {
    icon: Building2,
    title: "Connected Hospitals",
    description:
      "Coordinate blood inventory between independent hospital systems through direct API communication.",
  },
];

const steps = [
  {
    number: "01",
    title: "Search or request",
    description:
      "Find a blood group or submit an emergency request with the required details.",
  },
  {
    number: "02",
    title: "Connect with hospitals",
    description:
      "The system helps locate relevant inventory and routes requests to the appropriate hospital.",
  },
  {
    number: "03",
    title: "Coordinate care",
    description:
      "Authorized hospital staff review requests and manage inventory through their dashboard.",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-900">
      <header className="relative z-20 border-b border-slate-100 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blood-600 text-white shadow-lg shadow-red-200">
              <HeartPulse size={25} strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight">
                Smart<span className="text-blood-600">Blood</span>
              </span>
              <span className="block text-xs font-medium tracking-widest text-slate-500">
                NETWORK
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-blood-600">
              How it works
            </a>
            <a href="#features" className="text-sm font-medium text-slate-600 transition hover:text-blood-600">
              Features
            </a>
            <Link to="/blood-search" className="text-sm font-medium text-slate-600 transition hover:text-blood-600">
              Blood search
            </Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Sign in
            </Link>
            <Link to="/register" className="rounded-xl bg-blood-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-red-200 transition hover:bg-blood-700">
              Get started <ArrowRight className="ml-1 inline" size={16} />
            </Link>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-5 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="py-1 text-sm font-medium text-slate-700">How it works</a>
              <a href="#features" onClick={() => setMenuOpen(false)} className="py-1 text-sm font-medium text-slate-700">Features</a>
              <Link to="/blood-search" onClick={() => setMenuOpen(false)} className="py-1 text-sm font-medium text-slate-700">Blood search</Link>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="py-1 text-sm font-medium text-slate-700">Sign in</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="rounded-xl bg-blood-600 px-4 py-3 text-center text-sm font-semibold text-white">Create account</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative">
          <div className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-red-100/60 blur-3xl" />
          <div className="absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-rose-50 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:px-10 lg:py-24">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-blood-700">
                <span className="h-2 w-2 rounded-full bg-blood-600" />
                A smarter way to coordinate blood availability
              </div>

              <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Every drop counts.
                <span className="mt-2 block text-blood-600">
                  Every second matters.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                A connected blood bank network designed to help patients and
                hospitals find blood, coordinate urgent requests, and manage
                inventory across participating hospital systems.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/blood-search" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blood-600 px-6 py-4 font-semibold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-blood-700">
                  <Search size={19} /> Search blood availability
                </Link>
                <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-4 font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50">
                  Create an account <ArrowRight size={18} />
                </Link>
              </div>

              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={17} className="text-emerald-600" />
                  Role-based access
                </span>
                <span className="inline-flex items-center gap-2">
                  <Activity size={17} className="text-emerald-600" />
                  Network coordination
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute inset-5 rounded-[2.5rem] bg-red-100 blur-2xl" />
              <div className="relative rounded-[2rem] border border-white bg-white p-5 shadow-2xl shadow-slate-200/80 sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">NETWORK OVERVIEW</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">Connected care</h2>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-blood-600">
                    <HeartPulse size={26} />
                  </span>
                </div>

                <div className="my-6 rounded-2xl bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blood-600 shadow-sm">
                      <Droplet size={25} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Blood inventory coordination</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Inventory updates can be shared between participating
                        hospital nodes through direct API communication.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { name: "Hospital A", label: "Network node A", color: "bg-red-500" },
                    { name: "Hospital B", label: "Network node B", color: "bg-rose-500" },
                    { name: "Hospital C", label: "Network node C", color: "bg-pink-500" },
                  ].map((hospital) => (
                    <div key={hospital.name} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3.5">
                      <span className={`h-3 w-3 rounded-full ${hospital.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800">{hospital.name}</p>
                        <p className="text-xs text-slate-500">{hospital.label}</p>
                      </div>
                      <Building2 size={19} className="text-slate-400" />
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-400">
                  Illustrative network diagram. Hospital connectivity and
                  inventory status will be shown from the backend when connected.
                </p>
              </div>

              <div className="absolute -left-4 top-16 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl sm:flex">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={22} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800">Designed for coordination</p>
                  <p className="mt-1 text-xs text-slate-500">Across hospital systems</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50/70">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-10">
            {[
              { icon: Users, title: "Patient focused", text: "Clear access to search and request workflows" },
              { icon: Building2, title: "Hospital connected", text: "Independent nodes coordinate through APIs" },
              { icon: Bell, title: "Request tracking", text: "Notifications and request status for users" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blood-600 shadow-sm">
                    <Icon size={23} />
                  </span>
                  <div>
                    <p className="font-bold text-slate-800">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blood-600">Platform features</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Built to connect people with care
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              One platform for blood discovery, emergency coordination, and
              hospital inventory management.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="group rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl hover:shadow-red-100/50">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-blood-600 transition group-hover:bg-blood-600 group-hover:text-white">
                    <Icon size={27} />
                  </span>
                  <h3 className="mt-6 text-xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="bg-slate-950 py-20 text-white lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">How it works</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                From search to coordinated action
              </h2>
              <p className="mt-4 leading-7 text-slate-400">
                A straightforward workflow for patients, hospital staff, and
                network administrators.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="border-t border-slate-700 pt-6">
                  <span className="text-sm font-bold tracking-widest text-red-400">{step.number}</span>
                  <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 leading-7 text-slate-400">{step.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-2xl border border-slate-800 bg-slate-900 p-7 sm:flex-row sm:items-center sm:p-9">
              <div>
                <h3 className="text-2xl font-bold">Start with a blood search</h3>
                <p className="mt-2 text-slate-400">Search for the blood group you need.</p>
              </div>
              <Link to="/blood-search" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blood-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blood-700">
                Search availability <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-blood-600">
                <MapPin size={24} />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Join the network</h2>
                <p className="mt-2 max-w-xl leading-7 text-slate-600">
                  Sign in to access the features available to your account role,
                  or register to get started.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link to="/login" className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Sign in
              </Link>
              <Link to="/register" className="rounded-xl bg-blood-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blood-700">
                Register now
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blood-600 text-white">
              <Droplet size={20} />
            </span>
            <span className="font-bold text-slate-800">Smart Blood Bank Network</span>
          </Link>
          <p className="text-sm text-slate-500">
            Connecting hospital systems through coordinated blood inventory.
          </p>
        </div>
      </footer>
    </div>
  );
}
