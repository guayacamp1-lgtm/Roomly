import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Calendar, CalendarDays, Wallet, Settings, Zap, LogOut } from "lucide-react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginScreen from "./LoginScreen";
import ReservasScreen from "./ReservasScreen";
import CajaScreen from "./CajaScreen";
import AjustesScreen from "./AjustesScreen";
import CalendarioScreen from "./CalendarioScreen";

// ─────────────────────────────────────────────
// Nav links config
// ─────────────────────────────────────────────
const NAV_LINKS = [
  { to: "/",           end: true, icon: Calendar,     label: "Reservas"   },
  { to: "/calendario",           icon: CalendarDays,  label: "Calendario" },
  { to: "/caja",                 icon: Wallet,        label: "Caja"       },
  { to: "/ajustes",              icon: Settings,      label: "Ajustes"    },
];

// ─────────────────────────────────────────────
// Sidebar component
// ─────────────────────────────────────────────
function Sidebar({ open, onClose }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-64 flex-col
          bg-[#0d1117] border-r border-cyan-500/20
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Zap size={22} className="text-cyan-400" />
            <span className="text-xl font-bold tracking-widest text-white">ROOMLY</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sync badge */}
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-xs font-medium text-green-400 truncate">
            {user?.email ?? "Sincronizado"}
          </span>
        </div>

        {/* Nav links */}
        <nav className="mt-6 flex-1 space-y-1 px-3">
          {NAV_LINKS.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={
                      isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-white"
                    }
                  />
                  {label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout button */}
        <div className="px-3 py-4 border-t border-cyan-500/20">
          <button
            id="btn-logout"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-400 border border-transparent transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────
// Protected layout (Sidebar + content)
// ─────────────────────────────────────────────
function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#080c12] overflow-hidden text-slate-100">
      <Sidebar open={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex items-center justify-between border-b border-cyan-500/20 bg-[#0d1117] px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1 text-slate-400 hover:text-white transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-cyan-400" />
            <span className="font-bold tracking-widest text-white">ROOMLY</span>
          </div>
          <div className="w-8" />
        </header>

        {/* Desktop topbar */}
        <header className="hidden md:flex items-center justify-between border-b border-cyan-500/20 bg-[#0d1117] px-6 py-3">
          <p className="text-sm text-slate-500 tracking-wide">Panel de Control</p>
          <div className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs font-medium text-green-400">Sistema Sincronizado</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<ReservasScreen />} />
            <Route path="/calendario" element={<CalendarioScreen />} />
            <Route path="/caja" element={<CajaScreen />} />
            <Route path="/ajustes" element={<AjustesScreen />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginScreen />} />

          {/* Protected routes – all rendered inside DashboardLayout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
