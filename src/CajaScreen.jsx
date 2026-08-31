import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./lib/supabase";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Minus,
  X,
  DollarSign,
  FileText,
  CreditCard,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Download,
  Trash2,
} from "lucide-react";

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const METODOS_PAGO = ["Efectivo", "Transferencia"];

const FORM_INITIAL = {
  monto: "",
  concepto: "",
  metodo_pago: "Efectivo",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatCurrency(value) {
  return Number(value || 0).toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function metodoBadgeStyle(metodo) {
  switch (metodo) {
    case "Transferencia":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Tarjeta":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    default:
      return "bg-slate-700/50 text-slate-400 border-slate-600/50";
  }
}

// ─────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────
function CajaModal({ tipo, onClose, onSave, loading }) {
  const [form, setForm] = useState(FORM_INITIAL);
  const isIngreso = tipo === "ingreso";

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.monto || parseFloat(form.monto) <= 0) {
      alert("El monto debe ser mayor a cero.");
      return;
    }
    onSave(form);
  };

  const accentBtn = isIngreso
    ? "bg-cyan-500 hover:bg-cyan-400 text-[#080c12]"
    : "bg-rose-500 hover:bg-rose-400 text-white";

  const accentBorder = isIngreso
    ? "border-cyan-500/30"
    : "border-rose-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-md rounded-2xl border ${accentBorder} bg-slate-900 shadow-2xl`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b ${accentBorder} px-6 py-4`}
        >
          <div className="flex items-center gap-2">
            {isIngreso ? (
              <ArrowUpCircle size={20} className="text-cyan-400" />
            ) : (
              <ArrowDownCircle size={20} className="text-rose-400" />
            )}
            <h2 className="text-sm font-bold tracking-widest text-white">
              {isIngreso ? "NUEVO INGRESO" : "NUEVO EGRESO"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Monto */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-slate-400">
              <DollarSign size={13} />
              Monto
            </label>
            <input
              id="monto"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="0"
              value={form.monto}
              onChange={(e) => set("monto", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          {/* Concepto */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-slate-400">
              <FileText size={13} />
              Concepto
            </label>
            <input
              id="concepto"
              type="text"
              required
              placeholder="Ej: Pago reserva Habitación 101"
              value={form.concepto}
              onChange={(e) => set("concepto", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          {/* Método de pago */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-slate-400">
              <CreditCard size={13} />
              Método de Pago
            </label>
            <select
              id="metodo_pago"
              value={form.metodo_pago}
              onChange={(e) => set("metodo_pago", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-400 hover:border-slate-500 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button
              id="btn-guardar-movimiento"
              type="submit"
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold tracking-widest transition-all disabled:opacity-50 ${accentBtn}`}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? "GUARDANDO..." : "GUARDAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CajaScreen principal
// ─────────────────────────────────────────────
export default function CajaScreen() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("ingreso"); // "ingreso" | "egreso"
  const [error, setError] = useState("");

  // ── Carga de datos ────────────────────────────
  useEffect(() => {
    fetchMovimientos();
  }, []);

  async function fetchMovimientos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      setError("Error al cargar los movimientos.");
      console.error(error);
    } else {
      setMovimientos(data ?? []);
    }
    setLoading(false);
  }

  // ── Cálculos financieros ──────────────────────────────
  const { totalIngresos, totalEgresos, totalEfectivo, totalTransferencias, totalTodo } = useMemo(() => {
    let totalIngresos = 0;
    let totalEgresos = 0;
    let ingEfectivo = 0, egEfectivo = 0;
    let ingTransferencia = 0, egTransferencia = 0;
    for (const m of movimientos) {
      const monto = parseFloat(m.monto) || 0;
      const metodo = (m.metodo_pago ?? "").toLowerCase();
      if (m.tipo === "ingreso") {
        totalIngresos += monto;
        if (metodo === "efectivo") ingEfectivo += monto;
        else if (metodo === "transferencia") ingTransferencia += monto;
      } else {
        totalEgresos += monto;
        if (metodo === "efectivo") egEfectivo += monto;
        else if (metodo === "transferencia") egTransferencia += monto;
      }
    }
    const totalEfectivo = ingEfectivo - egEfectivo;
    const totalTransferencias = ingTransferencia - egTransferencia;
    return {
      totalIngresos,
      totalEgresos,
      totalEfectivo,
      totalTransferencias,
      totalTodo: totalEfectivo + totalTransferencias,
    };
  }, [movimientos]);

  // ── Abrir modal ────────────────────────────────────────────
  function openModal(tipo) {
    setModalType(tipo);
    setIsModalOpen(true);
  }

  // ── Exportar a Excel ───────────────────────────────────────
  function exportarAExcel() {
    if (movimientos.length === 0) {
      alert("No hay movimientos para exportar.");
      return;
    }
    const datos = movimientos.map((m) => ({
      Tipo: m.tipo?.charAt(0).toUpperCase() + m.tipo?.slice(1) ?? "",
      Concepto: m.concepto ?? "",
      Monto: parseFloat(m.monto) || 0,
      "Método de Pago": m.metodo_pago ?? "",
      Fecha: m.fecha ? new Date(m.fecha).toLocaleString("es-CO") : (m.created_at ? new Date(m.created_at).toLocaleString("es-CO") : ""),
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Caja");
    XLSX.writeFile(wb, "Arqueo_Roomly.xlsx");
  }

  // ── Eliminar movimiento ─────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este registro? Esta acción actualizará los saldos.")) return;
    const { error } = await supabase.from("caja").delete().eq("id", id);
    if (error) { setError("Error al eliminar el movimiento."); console.error(error); }
    else setMovimientos((prev) => prev.filter((m) => m.id !== id));
  }

  // ── Guardar movimiento ─────────────────────────────
  async function handleSave(form) {
    setSaving(true);
    setError("");

    const { data, error } = await supabase
      .from("caja")
      .insert([
        {
          tipo: modalType,
          monto: parseFloat(form.monto),
          concepto: form.concepto,
          metodo_pago: form.metodo_pago,
          // La columna fecha puede ser un timestamp con default now() en Supabase
        },
      ])
      .select()
      .single();

    if (error) {
      setError("Error al guardar el movimiento.");
      console.error(error);
    } else {
      // Insertar al inicio (orden descendente)
      setMovimientos((prev) => [data, ...prev]);
      setIsModalOpen(false);
    }
    setSaving(false);
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-slate-900 p-4 md:p-6 gap-5">
      {/* Título */}
      <div>
        <h2 className="text-lg font-bold tracking-widest text-white">CAJA</h2>
        <p className="text-xs text-slate-500 mt-0.5">Arqueo de caja en tiempo real</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button className="ml-auto text-red-400 hover:text-white" onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Hero card – Saldo Total + desglose ── */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-800 p-6 shadow-[0_0_60px_rgba(0,255,255,0.06)]">
        {/* Glow decoration */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-500/5 blur-2xl" />

        <div className="relative flex flex-col gap-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Wallet size={16} className="text-cyan-400" />
              <span className="tracking-widest uppercase text-xs">Saldo Total</span>
            </div>
            {/* Botón exportar Excel */}
            <button
              id="btn-exportar-excel"
              onClick={exportarAExcel}
              title="Exportar a Excel"
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/50 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
            >
              <Download size={13} />
              Excel
            </button>
          </div>
          <p
            className={`text-4xl font-bold tracking-tight ${
              totalTodo >= 0 ? "text-cyan-400" : "text-rose-400"
            }`}
          >
            {totalTodo < 0 ? "-" : ""}S/
            {formatCurrency(Math.abs(totalTodo))}
          </p>
        </div>

        {/* Sub-bloques: Efectivo + Transferencias */}
        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs mb-1">
              <Wallet size={13} />
              <span className="uppercase tracking-widest">Efectivo</span>
            </div>
            <p className={`text-lg font-bold ${totalEfectivo >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
              {totalEfectivo < 0 ? "-" : ""}S/ {formatCurrency(Math.abs(totalEfectivo))}
            </p>
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3">
            <div className="flex items-center gap-1.5 text-violet-400 text-xs mb-1">
              <TrendingUp size={13} />
              <span className="uppercase tracking-widest">Transferencias</span>
            </div>
            <p className={`text-lg font-bold ${totalTransferencias >= 0 ? "text-violet-400" : "text-rose-400"}`}>
              {totalTransferencias < 0 ? "-" : ""}S/ {formatCurrency(Math.abs(totalTransferencias))}
            </p>
          </div>
        </div>

        {/* Fila secundaria: Ingresos / Egresos totales */}
        <div className="relative mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">
            <div className="flex items-center gap-1.5 text-green-400 text-xs mb-1">
              <TrendingUp size={13} />
              <span className="uppercase tracking-widest">Ingresos</span>
            </div>
            <p className="text-lg font-bold text-green-400">
              S/ {formatCurrency(totalIngresos)}
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs mb-1">
              <TrendingDown size={13} />
              <span className="uppercase tracking-widest">Egresos</span>
            </div>
            <p className="text-lg font-bold text-rose-400">
              S/ {formatCurrency(totalEgresos)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Botones de acción ── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          id="btn-nuevo-ingreso"
          onClick={() => openModal("ingreso")}
          className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 py-3 text-sm font-bold tracking-widest text-cyan-400 hover:bg-cyan-500/25 transition-all shadow-[0_0_20px_rgba(0,255,255,0.08)]"
        >
          <Plus size={16} />
          Nuevo Ingreso
        </button>
        <button
          id="btn-nuevo-egreso"
          onClick={() => openModal("egreso")}
          className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 py-3 text-sm font-bold tracking-widest text-rose-400 hover:bg-rose-500/25 transition-all shadow-[0_0_20px_rgba(244,63,94,0.08)]"
        >
          <Minus size={16} />
          Nuevo Egreso
        </button>
      </div>

      {/* ── Historial ── */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Historial de movimientos
        </h3>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={28} className="animate-spin text-cyan-400" />
            <p className="text-sm tracking-widest text-slate-500">CARGANDO...</p>
          </div>
        )}

        {!loading && movimientos.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center rounded-xl border border-slate-800 bg-slate-800/50">
            <DollarSign size={36} className="text-slate-600" />
            <p className="text-sm text-slate-500">Sin movimientos registrados.</p>
          </div>
        )}

        {!loading && movimientos.length > 0 && (
          <div className="flex flex-col gap-2">
            {movimientos.map((m) => {
              const isIngreso = m.tipo === "ingreso";
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800 px-4 py-3 hover:border-slate-700 transition-all"
                >
                  {/* Ícono */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isIngreso
                        ? "bg-cyan-500/15 text-cyan-400"
                        : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {isIngreso ? (
                      <ArrowUpCircle size={18} />
                    ) : (
                      <ArrowDownCircle size={18} />
                    )}
                  </div>

                  {/* Concepto + fecha */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {m.concepto}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(m.fecha || m.created_at)}
                    </p>
                  </div>

                  {/* Método de pago */}
                  <span
                    className={`hidden sm:inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${metodoBadgeStyle(
                      m.metodo_pago
                    )}`}
                  >
                    {m.metodo_pago}
                  </span>

                  {/* Monto */}
                  <p
                    className={`shrink-0 text-sm font-bold ${
                      isIngreso ? "text-cyan-400" : "text-rose-400"
                    }`}
                  >
                    {isIngreso ? "+" : "-"}S/ {formatCurrency(m.monto)}
                  </p>

                  {/* Eliminar */}
                  <button
                    onClick={() => handleDelete(m.id)}
                    title="Eliminar registro"
                    className="shrink-0 ml-1 rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <CajaModal
          tipo={modalType}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          loading={saving}
        />
      )}
    </div>
  );
}
