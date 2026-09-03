import { useEffect, useRef, useState } from "react";
import { differenceInDays } from "date-fns";
import { supabase } from "./lib/supabase";
import {
  Plus,
  X,
  Calendar,
  User,
  Phone,
  Home,
  DollarSign,
  AlertTriangle,
  Loader2,
  BedDouble,
  MessageCircle,
  Edit,
  Trash2,
  CheckCircle,
  Eye,
} from "lucide-react";

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const ESTADOS = ["confirmada", "pendiente", "cancelada"];

const METODOS_PAGO = ["Efectivo", "Transferencia"];

const FORM_INITIAL = {
  habitacion: "",
  huesped: "",
  telefono: "",
  fecha_ingreso: "",
  fecha_salida: "",
  precio_total: "",
  adelanto: "",
  metodo_pago_adelanto: "Efectivo",
  metodo_pago: "Efectivo",
  estado: "pendiente",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function cardAccent(reserva) {
  const total = parseFloat(reserva.precio_total) || 0;
  const adelanto = parseFloat(reserva.adelanto) || 0;
  if (adelanto >= total && total > 0) return "border-l-green-500";
  return "border-l-yellow-500";
}

function badgeStyle(estado) {
  switch (estado) {
    case "confirmada":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "cancelada":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  }
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}


function sendWhatsApp(r) {
  const telefono = (r.telefono || "").replace(/\D/g, "");
  if (!telefono) {
    alert("Esta reserva no tiene teléfono registrado.");
    return;
  }

  const noches = Math.max(
    1,
    differenceInDays(new Date(r.fecha_salida), new Date(r.fecha_ingreso)) || 1
  );
  const total = parseFloat(r.precio_total) || 0;
  const adelanto = parseFloat(r.adelanto) || 0;
  const saldoPendiente = Math.max(0, total - adelanto);

  let mensaje = "";

  if (saldoPendiente > 0) {
    mensaje = `¡Hola ${r.huesped}! 👋\n\n` +
      `Tu reserva en *Casa Ñaupary* para la *${r.habitacion}* está confirmada.\n\n` +
      `📅 *Detalles de la Estadía:*\n` +
      `• Ingreso: ${formatDate(r.fecha_ingreso)}\n` +
      `• Salida: ${formatDate(r.fecha_salida)}\n` +
      `• Noches: ${noches} ${noches === 1 ? "noche" : "noches"}\n\n` +
      `🕒 *Horarios:*\n` +
      `• Check-in: 2:00 PM\n` +
      `• Check-out: 12:00 PM\n` +
      `(Si llegas antes o te retiras después, por favor avísanos con tiempo para poder coordinarlo)\n\n` +
      `💳 *Resumen Financiero:*\n` +
      `• Total: S/ ${Number(total).toLocaleString("es-PE")}\n` +
      `• Adelanto: S/ ${Number(adelanto).toLocaleString("es-PE")}\n` +
      `• Saldo Pendiente: S/ ${Number(saldoPendiente).toLocaleString("es-PE")} (a cancelar al momento de tu llegada)\n\n` +
      `¡Te esperamos! ✨`;
  } else {
    mensaje = `¡Hola ${r.huesped}! Tu reserva en Casa Ñaupary para la ${r.habitacion} está 100% confirmada y pagada en su totalidad. 🎉\n\n` +
      `📅 *Detalles de tu estadía:*\n` +
      `• Ingreso: ${formatDate(r.fecha_ingreso)}\n` +
      `• Salida: ${formatDate(r.fecha_salida)}\n` +
      `• Noches: ${noches} ${noches === 1 ? "noche" : "noches"}\n\n` +
      `🕒 *Horarios:*\n` +
      `• Check-in: 2:00 PM\n` +
      `• Check-out: 12:00 PM\n` +
      `(Si llegas antes o te retiras después, por favor avísanos con tiempo para poder coordinarlo)\n\n` +
      `💳 *Resumen de pago:*\n` +
      `• Total abonado: S/ ${Number(total).toLocaleString("es-PE")}\n` +
      `• Saldo Pendiente: S/ 0.00\n\n` +
      `¡Todo está listo para tu llegada! ✨`;
  }

  window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, "_blank");
}

// ─────────────────────────────────────────────
// Insertar en tabla caja (automático)
// ─────────────────────────────────────────────
async function registrarEnCaja({ tipo, monto, concepto, metodo_pago = "Efectivo" }) {
  if (!monto || monto <= 0) return;
  const { error } = await supabase.from("caja").insert([{ tipo, monto, concepto, metodo_pago }]);
  if (error) console.error("[Caja] Error al registrar movimiento:", error);
}

// ─────────────────────────────────────────────
// Componente Field
// ─────────────────────────────────────────────
const inputCls =
  "w-full rounded-lg border border-slate-700 bg-[#080c12] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50";

function Field({ label, icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-slate-400">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Modal Reserva
// ─────────────────────────────────────────────
function ReservaModal({ onClose, onSave, onDelete, loading, isEditing, initialData, allHabitaciones, reservas, editingId }) {
  const [form, setForm] = useState(initialData ?? FORM_INITIAL);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Sincronizar estado interno cuando cambia initialData
  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm(FORM_INITIAL);
    }
  }, [initialData]);

  // ── Filtrado de disponibilidad en tiempo real ─────────────────────
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState(allHabitaciones);

  useEffect(() => {
    if (!form.fecha_ingreso || !form.fecha_salida) {
      setHabitacionesDisponibles([]);
      return;
    }
    const entrada = new Date(form.fecha_ingreso);
    const salida = new Date(form.fecha_salida);
    if (salida <= entrada) { setHabitacionesDisponibles([]); return; }

    const libres = allHabitaciones.filter((hab) => {
      return !reservas.some((r) => {
        if (editingId && r.id === editingId) return false;  // ignora la reserva en edición
        if (r.habitacion !== hab.nombre) return false;
        const rIn = new Date(r.fecha_ingreso);
        const rOut = new Date(r.fecha_salida);
        return entrada < rOut && salida > rIn;              // fórmula de cruce
      });
    });
    setHabitacionesDisponibles(libres);

    // Si la habitación ya elegida ya no está disponible, límpiarla
    if (form.habitacion && !libres.some((h) => h.nombre === form.habitacion)) {
      setForm((prev) => ({ ...prev, habitacion: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fecha_ingreso, form.fecha_salida, allHabitaciones, reservas]);

  // ── Cálculo dinámico: precio_base × noches ─────────────────────
  // userChanged: solo se activa cuando el usuario toca habitacion/fechas manualmente.
  // En modo edición (isEditing), la primera renderización NO dispara el recálculo.
  const userChanged = useRef(false);

  useEffect(() => {
    if (!userChanged.current) return;          // ignora la carga inicial
    if (!form.habitacion || !form.fecha_ingreso || !form.fecha_salida) return;
    const hab = habitacionesDisponibles.find((h) => h.nombre === form.habitacion);
    if (!hab?.precio) return;
    const noches = differenceInDays(
      new Date(form.fecha_salida),
      new Date(form.fecha_ingreso)
    );
    if (noches > 0) {
      setForm((prev) => ({ ...prev, precio_total: String(hab.precio * noches) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.habitacion, form.fecha_ingreso, form.fecha_salida]);

  // Helper que marca la intención del usuario y actualiza el campo
  const setWithRecalc = (key, value) => {
    userChanged.current = true;
    set(key, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const handleDelete = () => {
    if (window.confirm("¿Eliminar esta reserva? Esta acción no se puede deshacer.")) {
      onDelete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#0d1117] shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 px-6 py-4">
          <div className="flex items-center gap-2">
            <BedDouble size={20} className="text-cyan-400" />
            <h2 className="font-bold tracking-widest text-white text-sm">
              {isEditing ? "EDITAR RESERVA" : "NUEVA RESERVA"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* 1ª fila: Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ingreso" icon={<Calendar size={14} />}>
              <input id="fecha_ingreso" type="date" required value={form.fecha_ingreso}
                onChange={(e) => setWithRecalc("fecha_ingreso", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Salida" icon={<Calendar size={14} />}>
              <input id="fecha_salida" type="date" required value={form.fecha_salida}
                onChange={(e) => setWithRecalc("fecha_salida", e.target.value)} className={inputCls} />
            </Field>
          </div>

          {/* 2ª fila: Habitación (bloqueada hasta tener fechas) */}
          <Field label="Habitación" icon={<Home size={14} />}>
            <select
              id="habitacion"
              required
              disabled={!form.fecha_ingreso || !form.fecha_salida}
              value={form.habitacion}
              onChange={(e) => {
                userChanged.current = true;
                set("habitacion", e.target.value);
              }}
              className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="" disabled>
                {!form.fecha_ingreso || !form.fecha_salida
                  ? "Selecciona fechas primero..."
                  : habitacionesDisponibles.length === 0
                    ? "Sin habitaciones disponibles"
                    : "Elige una habitación"}
              </option>
              {habitacionesDisponibles.map((hab) => (
                <option key={hab.id ?? hab.nombre} value={hab.nombre}>
                  {hab.nombre}
                </option>
              ))}
            </select>
            {/* Indicador de disponibles */}
            {form.fecha_ingreso && form.fecha_salida && (
              <p className={`mt-1 text-[11px] ${habitacionesDisponibles.length === 0 ? "text-rose-400" : "text-cyan-500"
                }`}>
                {habitacionesDisponibles.length === 0
                  ? "⚠️ Sin habitaciones libres en esas fechas"
                  : `✓ ${habitacionesDisponibles.length} habitación${habitacionesDisponibles.length !== 1 ? "es" : ""} disponible${habitacionesDisponibles.length !== 1 ? "s" : ""}`}
              </p>
            )}
          </Field>

          <Field label="Huésped" icon={<User size={14} />}>
            <input id="huesped" type="text" required placeholder="Nombre completo"
              value={form.huesped} onChange={(e) => set("huesped", e.target.value)} className={inputCls} />
          </Field>

          <Field label="Teléfono" icon={<Phone size={14} />}>
            <input id="telefono" type="tel" placeholder="+51 9XX XXX XXX"
              value={form.telefono} onChange={(e) => set("telefono", e.target.value)} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio Total" icon={<DollarSign size={14} />}>
              <input id="precio_total" type="number" min="0" step="0.01" required placeholder="0.00"
                value={form.precio_total} onChange={(e) => set("precio_total", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Adelanto" icon={<DollarSign size={14} />}>
              <input id="adelanto" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.adelanto} onChange={(e) => set("adelanto", e.target.value)} className={inputCls} />
            </Field>
          </div>

          {/* Método de pago — solo si hay adelanto */}
          {parseFloat(form.adelanto) > 0 && (
            <Field label="Método de Pago (Adelanto)" icon={<DollarSign size={14} />}>
              <select
                id="metodo_pago"
                name="metodo_pago"
                value={form.metodo_pago || form.metodo_pago_adelanto || "Efectivo"}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    metodo_pago: val,
                    metodo_pago_adelanto: val,
                  }));
                }}
                className={inputCls}
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Estado" icon={<AlertTriangle size={14} />}>
            <select id="estado" value={form.estado} onChange={(e) => set("estado", e.target.value)} className={inputCls}>
              {ESTADOS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </Field>

          {/* Botón eliminar — solo en edición */}
          {isEditing && (
            <button type="button" onClick={handleDelete} disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50">
              <Trash2 size={15} />
              Eliminar Reserva
            </button>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-400 hover:border-slate-500 hover:text-white transition-all">
              Cancelar
            </button>
            <button id="btn-guardar-reserva" type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2.5 text-sm font-bold tracking-widest text-[#080c12] hover:bg-cyan-400 disabled:opacity-50 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "GUARDANDO..." : isEditing ? "ACTUALIZAR" : "GUARDAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Modal de Detalles (read-only)
// ──────────────────────────────────────────────
function DetalleModal({ reserva, onClose }) {
  const saldo = parseFloat(reserva.precio_total) - parseFloat(reserva.adelanto || 0);
  const noches = (() => {
    try {
      return Math.max(
        0,
        Math.round(
          (new Date(reserva.fecha_salida) - new Date(reserva.fecha_ingreso)) / 86400000
        )
      );
    } catch { return 0; }
  })();

  const Row = ({ icon, label, value, valueClass = "text-white" }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
      <span className="mt-0.5 shrink-0 text-slate-500">{icon}</span>
      <span className="w-32 shrink-0 text-xs uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`text-sm font-medium break-words ${valueClass}`}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0d1117] shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 px-6 py-4">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-cyan-400" />
            <h2 className="text-sm font-bold tracking-widest text-white">DETALLE DE RESERVA</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-4">
          {/* Badge estado */}
          <div className="mb-4 flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyle(reserva.estado)}`}>
              {reserva.estado?.toUpperCase()}
            </span>
            {noches > 0 && (
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                {noches} noche{noches !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <Row icon={<Home size={15} />} label="Habitación" value={reserva.habitacion} />
          <Row icon={<User size={15} />} label="Huésped" value={reserva.huesped} />
          <Row icon={<Phone size={15} />} label="Teléfono" value={reserva.telefono || "—"} />
          <Row icon={<Calendar size={15} />} label="Ingreso" value={formatDate(reserva.fecha_ingreso)} valueClass="text-cyan-300" />
          <Row icon={<Calendar size={15} />} label="Salida" value={formatDate(reserva.fecha_salida)} valueClass="text-cyan-300" />

          {/* Bloque financiero */}
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-800/40 p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Total</p>
              <p className="text-base font-bold text-white">S/ {Number(reserva.precio_total || 0).toLocaleString('es-PE')}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Adelanto</p>
              <p className="text-base font-bold text-yellow-400">S/ {Number(reserva.adelanto || 0).toLocaleString('es-PE')}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Saldo</p>
              <p className={`text-base font-bold ${saldo <= 0 ? "text-green-400" : "text-rose-400"}`}>
                S/ {Math.max(0, saldo).toLocaleString('es-PE')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-slate-700 py-2.5 text-sm text-slate-400 hover:border-slate-500 hover:text-white transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Modal Confirmar Pago (con selector de método)
// ──────────────────────────────────────────────
function ConfirmarPagoModal({ reserva, onClose, onConfirm, loading }) {
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const saldo = Math.max(0, parseFloat(reserva.precio_total || 0) - parseFloat(reserva.adelanto || 0));

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(reserva, metodoPago, saldo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-[#0d1117] shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-cyan-400" />
            <h2 className="font-bold tracking-widest text-white text-sm">CONFIRMAR PAGO</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">{reserva.habitacion} — {reserva.huesped}</p>
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Monto restante a cobrar</p>
            <p className="text-2xl font-bold text-cyan-400 mt-0.5">S/ {saldo.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>
          </div>

          <Field label="Método de Pago" icon={<DollarSign size={14} />}>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className={inputCls}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 py-2.5 text-xs font-semibold text-slate-400 hover:border-slate-500 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2.5 text-xs font-bold tracking-widest text-[#080c12] hover:bg-cyan-400 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(0,255,255,0.2)]"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? "PROCESANDO..." : "CONFIRMAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// ReservasScreen principal
// ─────────────────────────────────────────────
export default function ReservasScreen() {
  const [reservas, setReservas] = useState([]);
  const [allHabitaciones, setAllHabitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [adelantoOriginal, setAdelantoOriginal] = useState(0);
  const [viewingReserva, setViewingReserva] = useState(null);
  const [confirmandoPago, setConfirmandoPago] = useState(null);
  const [processingPago, setProcessingPago] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReservas();
    fetchHabitaciones();
  }, []);

  async function fetchHabitaciones() {
    const { data, error } = await supabase.from("habitaciones").select("*");
    if (error) console.error("[Habitaciones] Error al cargar:", error);
    else setAllHabitaciones(data ?? []);
  }

  async function fetchReservas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("reservas")
      .select("*")
      .order("fecha_ingreso", { ascending: true });
    if (error) { setError("Error al cargar las reservas."); console.error(error); }
    else setReservas(data ?? []);
    setLoading(false);
  }

  // Anti-colisión (ignora la reserva en edición)
  function hasCollision(form) {
    const newIn = new Date(form.fecha_ingreso);
    const newOut = new Date(form.fecha_salida);
    return reservas.some((r) => {
      if (editingId && r.id === editingId) return false;
      if (r.habitacion !== form.habitacion) return false;
      return rangesOverlap(newIn, newOut, new Date(r.fecha_ingreso), new Date(r.fecha_salida));
    });
  }

  // Abrir modal
  function openCreate() {
    setEditingId(null);
    setEditingData(null);
    setIsModalOpen(true);
  }

  function openEdit(r) {
    setEditingId(r.id);
    setAdelantoOriginal(parseFloat(r.adelanto) || 0);

    // Extraer método de pago real almacenado en la reserva
    const rawMetodo =
      r.metodo_pago ??
      r.metodo_pago_adelanto ??
      r.tipo_pago ??
      r.metodoPago ??
      r.metodo ??
      "";

    const metodoCoincidente = rawMetodo
      ? (METODOS_PAGO.find((m) => m.toLowerCase() === String(rawMetodo).trim().toLowerCase()) || rawMetodo)
      : "Efectivo";

    setEditingData({
      habitacion: r.habitacion,
      huesped: r.huesped,
      telefono: r.telefono ?? "",
      fecha_ingreso: r.fecha_ingreso,
      fecha_salida: r.fecha_salida,
      precio_total: String(r.precio_total ?? ""),
      adelanto: String(r.adelanto ?? ""),
      metodo_pago_adelanto: metodoCoincidente,
      metodo_pago: metodoCoincidente,
      estado: r.estado,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setEditingData(null);
  }

  // ── Guardar (INSERT o UPDATE) ─────────────────
  async function handleSave(form) {
    console.log("FORM RECIBIDO EN HANDLESAVE:", form);
    setError("");

    if (new Date(form.fecha_salida) <= new Date(form.fecha_ingreso)) {
      alert("La fecha de salida debe ser posterior a la de ingreso.");
      return;
    }
    if (hasCollision(form)) {
      alert(`⚠ La ${form.habitacion} ya está ocupada en esas fechas.\nElige otras fechas o una habitación diferente.`);
      return;
    }

    setSaving(true);
    const payload = {
      habitacion: form.habitacion,
      huesped: form.huesped,
      telefono: form.telefono || null,
      fecha_ingreso: form.fecha_ingreso,
      fecha_salida: form.fecha_salida,
      precio_total: parseFloat(form.precio_total) || 0,
      adelanto: parseFloat(form.adelanto) || 0,
      metodo_pago: form.metodo_pago || form.metodo_pago_adelanto || "Efectivo",
      estado: form.estado,
    };

    if (editingId) {
      // UPDATE
      const { data, error } = await supabase
        .from("reservas").update(payload).eq("id", editingId).select().single();
      if (error) { setError("Error al actualizar la reserva."); console.error(error); }
      else {
        setReservas((prev) =>
          prev.map((r) => (r.id === editingId ? data : r))
            .sort((a, b) => new Date(a.fecha_ingreso) - new Date(b.fecha_ingreso))
        );

        // ── Sincronización de adelanto con Caja ──────────────────────
        const nuevoAdelanto = payload.adelanto;
        const diferencia = parseFloat((nuevoAdelanto - adelantoOriginal).toFixed(2));

        const metodoPagoAjuste = form.metodo_pago_adelanto || form.metodo_pago || "Efectivo";

        if (diferencia > 0) {
          // El adelanto aumentó → ingreso por la diferencia
          await registrarEnCaja({
            tipo: "ingreso",
            monto: diferencia,
            concepto: `Ajuste / Incremento Adelanto - ${payload.habitacion}`,
            metodo_pago: metodoPagoAjuste,
          });
        } else if (diferencia < 0) {
          // El adelanto disminuyó → egreso por la diferencia
          await registrarEnCaja({
            tipo: "egreso",
            monto: Math.abs(diferencia),
            concepto: `Ajuste / Reducción Adelanto - ${payload.habitacion}`,
            metodo_pago: metodoPagoAjuste,
          });
        }
        // ─────────────────────────────────────────────────────────────

        closeModal();
      }
    } else {
      // INSERT en reservas
      const { data, error } = await supabase
        .from("reservas").insert([payload]).select().single();
      if (error) { setError("Error al guardar la reserva."); console.error(error); }
      else {
        setReservas((prev) =>
          [...prev, data].sort((a, b) => new Date(a.fecha_ingreso) - new Date(b.fecha_ingreso))
        );
        closeModal();

        // ── Automatización: registrar adelanto en Caja ──
        if (payload.adelanto > 0) {
          await registrarEnCaja({
            tipo: "ingreso",
            monto: payload.adelanto,
            concepto: `Adelanto Reserva - ${payload.habitacion}`,
            metodo_pago: form.metodo_pago_adelanto || form.metodo_pago || "Efectivo",
          });
        }
      }
    }
    setSaving(false);
  }

  // ── Eliminar ──────────────────────────────────
  async function handleDelete() {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase.from("reservas").delete().eq("id", editingId);
    if (error) { setError("Error al eliminar la reserva."); console.error(error); }
    else { setReservas((prev) => prev.filter((r) => r.id !== editingId)); closeModal(); }
    setSaving(false);
  }

  // ── Procesar Pago Total con Método de Pago ──────
  async function handleProcesarPago(r, metodoPago, saldo) {
    setProcessingPago(true);
    setError("");

    // UPDATE reserva → confirmada, adelanto = precio_total
    const { data, error: updateError } = await supabase
      .from("reservas")
      .update({ estado: "confirmada", adelanto: r.precio_total })
      .eq("id", r.id)
      .select()
      .single();

    if (updateError) {
      setError("Error al confirmar el pago.");
      console.error(updateError);
    } else {
      setReservas((prev) => prev.map((x) => (x.id === r.id ? data : x)));

      // Registrar saldo en Caja automáticamente con el método seleccionado
      if (saldo > 0) {
        await registrarEnCaja({
          tipo: "ingreso",
          monto: saldo,
          concepto: `Pago Restante - ${r.habitacion}`,
          metodo_pago: metodoPago,
        });
      }
      setConfirmandoPago(null);
    }
    setProcessingPago(false);
  }

  // ── Filtro activas / historial ───────────────────────────────────
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const reservasFiltradas = mostrarHistorial
    ? reservas.filter((r) => new Date(r.fecha_salida) < hoy)
    : reservas.filter((r) => new Date(r.fecha_salida) >= hoy);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-[#080c12] p-4 md:p-6 gap-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-widest text-white">RESERVAS</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {reservasFiltradas.length} reserva{reservasFiltradas.length !== 1 ? "s" : ""}{mostrarHistorial ? " en historial" : " activa" + (reservasFiltradas.length !== 1 ? "s" : "")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarHistorial((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide transition-all ${mostrarHistorial
              ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
              : "border-slate-700 bg-transparent text-slate-400 hover:border-slate-500 hover:text-white"
              }`}
          >
            {mostrarHistorial ? "Ver Activas" : "Ver Historial"}
          </button>
          <button id="btn-nueva-reserva" onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-bold tracking-widest text-[#080c12] hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(0,255,255,0.2)]">
            <Plus size={16} />
            Nueva Reserva
          </button>
        </div>
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

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 size={32} className="animate-spin text-cyan-400" />
          <p className="text-sm tracking-widest text-slate-500">CARGANDO RESERVAS...</p>
        </div>
      )}

      {/* Empty state general */}
      {!loading && reservas.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="rounded-2xl border border-cyan-500/20 bg-[#0d1117] p-8">
            <BedDouble size={44} className="text-cyan-400 mx-auto mb-4" />
            <p className="text-white font-semibold">Sin reservas aún</p>
            <p className="text-xs text-slate-500 mt-1">
              Haz clic en "+ Nueva Reserva" para comenzar.
            </p>
          </div>
        </div>
      )}

      {/* Empty state filtro */}
      {!loading && reservasFiltradas.length === 0 && reservas.length > 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1117] p-8">
            <BedDouble size={36} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium text-sm">
              {mostrarHistorial ? "Sin reservas pasadas." : "Sin reservas activas."}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {mostrarHistorial ? "No hay reservas con fecha de salida anterior a hoy." : "Haz clic en \"Ver Historial\" para ver las pasadas."}
            </p>
          </div>
        </div>
      )}

      {/* Tarjetas de reservas */}
      {!loading && reservasFiltradas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 w-full">
          {reservasFiltradas.map((r) => {
            const saldo = parseFloat(r.precio_total) - parseFloat(r.adelanto || 0);
            return (
              <div
                key={r.id}
                onClick={() => setViewingReserva(r)}
                className={`w-full flex flex-col relative cursor-pointer rounded-xl border border-slate-800 bg-[#0d1117] border-l-4 ${cardAccent(r)} p-5 gap-3 hover:border-slate-600 transition-all`}>
                {/* Header card */}
                <div className="flex justify-between items-start gap-4 w-full">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Home size={14} className="text-slate-500 shrink-0" />
                    <span className="text-sm font-semibold text-white truncate">{r.habitacion}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeStyle(r.estado)}`}>
                      {r.estado}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} title="Editar reserva"
                      className="rounded-lg p-1 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                      <Edit size={14} />
                    </button>
                  </div>
                </div>

                {/* Huésped */}
                <div className="flex items-center gap-2">
                  <User size={14} className="text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-300 break-words">{r.huesped}</span>
                </div>

                {/* Teléfono */}
                {r.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-500 shrink-0" />
                    <span className="text-xs text-slate-500">{r.telefono}</span>
                  </div>
                )}

                {/* Fechas */}
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-cyan-500 shrink-0" />
                  <span className="text-xs text-slate-400">
                    {formatDate(r.fecha_ingreso)} → {formatDate(r.fecha_salida)}
                  </span>
                </div>

                {/* Precios */}
                <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
                  <div className="text-xs text-slate-500">
                    Total: <span className="text-white font-semibold">S/ {Number(r.precio_total).toLocaleString('es-PE')}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Adelanto:{" "}
                    <span className={
                      parseFloat(r.adelanto) >= parseFloat(r.precio_total) && parseFloat(r.precio_total) > 0
                        ? "text-green-400 font-semibold"
                        : "text-yellow-400 font-semibold"
                    }>
                      S/ {Number(r.adelanto || 0).toLocaleString('es-PE')}
                    </span>
                  </div>
                </div>

                {/* Botón Confirmar Pago Total — solo si está pendiente con saldo */}
                {r.estado === "pendiente" && saldo > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmandoPago(r);
                    }}
                    className="flex items-center justify-center gap-2 w-full rounded-lg border border-cyan-500/30 bg-cyan-500/15 py-2 text-xs font-bold tracking-wider text-cyan-400 hover:bg-cyan-500/25 transition-all"
                  >
                    <CheckCircle size={13} />
                    Confirmar Pago — S/ {saldo.toLocaleString('es-PE')} restantes
                  </button>
                )}

                {/* WhatsApp */}
                <button onClick={(e) => { e.stopPropagation(); sendWhatsApp(r); }}
                  className="flex items-center justify-center gap-2 w-full rounded-lg border border-green-500/30 bg-green-500/10 py-1.5 text-xs font-semibold text-green-500 hover:bg-green-500/20 transition-all">
                  <MessageCircle size={14} />
                  Enviar WhatsApp
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Edición */}
      {isModalOpen && (
        <ReservaModal
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
          loading={saving}
          isEditing={!!editingId}
          initialData={editingData}
          allHabitaciones={allHabitaciones}
          reservas={reservas}
          editingId={editingId}
        />
      )}

      {/* Modal Detalles (read-only) */}
      {viewingReserva && (
        <DetalleModal
          reserva={viewingReserva}
          onClose={() => setViewingReserva(null)}
        />
      )}

      {/* Mini-Modal Confirmar Pago con selector de método */}
      {confirmandoPago && (
        <ConfirmarPagoModal
          reserva={confirmandoPago}
          onClose={() => setConfirmandoPago(null)}
          onConfirm={handleProcesarPago}
          loading={processingPago}
        />
      )}
    </div>
  );
}
