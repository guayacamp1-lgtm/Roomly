import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  Settings,
  Plus,
  X,
  BedDouble,
  Hash,
  DollarSign,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const inputCls =
  "w-full rounded-lg border border-slate-700 bg-[#080c12] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50";

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

const FORM_INITIAL = { nombre: "", numero: "", precio: "" };

// ─────────────────────────────────────────────
// Modal Habitación
// ─────────────────────────────────────────────
function HabitacionModal({ onClose, onSave, onDelete, loading, isEditing, initialData }) {
  const [form, setForm] = useState(initialData ?? FORM_INITIAL);
  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${form.nombre}"? Esta acción no se puede deshacer.`)) {
      onDelete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0d1117] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 px-6 py-4">
          <div className="flex items-center gap-2">
            <BedDouble size={18} className="text-cyan-400" />
            <h2 className="text-sm font-bold tracking-widest text-white">
              {isEditing ? "EDITAR HABITACIÓN" : "NUEVA HABITACIÓN"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Nombre" icon={<BedDouble size={13} />}>
            <input
              id="hab-nombre"
              type="text"
              required
              placeholder="Ej: Habitación 101"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Número / Código" icon={<Hash size={13} />}>
            <input
              id="hab-numero"
              type="text"
              required
              placeholder="Ej: 101"
              value={form.numero}
              onChange={(e) => set("numero", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Precio por noche (S/)" icon={<DollarSign size={13} />}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">S/</span>
              <input
                id="hab-precio"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                value={form.precio}
                onChange={(e) => set("precio", e.target.value)}
                className={`${inputCls} pl-9`}
              />
            </div>
          </Field>

          {/* Eliminar — solo en edición */}
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              <Trash2 size={14} />
              Eliminar Habitación
            </button>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-400 hover:border-slate-500 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2.5 text-sm font-bold tracking-widest text-[#080c12] hover:bg-cyan-400 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? "GUARDANDO..." : isEditing ? "ACTUALIZAR" : "CREAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AjustesScreen principal
// ─────────────────────────────────────────────
export default function AjustesScreen() {
  const [habitaciones, setHabitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => { fetchHabitaciones(); }, []);

  async function fetchHabitaciones() {
    setLoading(true);
    const { data, error } = await supabase
      .from("habitaciones")
      .select("*")
      .order("numero", { ascending: true });
    if (error) { setError("Error al cargar las habitaciones."); console.error(error); }
    else setHabitaciones(data ?? []);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setEditingData(null);
    setIsModalOpen(true);
  }

  function openEdit(h) {
    setEditingId(h.id);
    setEditingData({ nombre: h.nombre, numero: h.numero, precio: String(h.precio ?? "") });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setEditingData(null);
  }

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  async function handleSave(form) {
    setSaving(true);
    setError("");
    const payload = {
      nombre: form.nombre.trim(),
      numero: form.numero.trim(),
      precio: parseFloat(form.precio) || 0,
    };

    if (editingId) {
      const { data, error } = await supabase
        .from("habitaciones").update(payload).eq("id", editingId).select().single();
      if (error) { setError("Error al actualizar."); console.error(error); }
      else {
        setHabitaciones((prev) => prev.map((h) => (h.id === editingId ? data : h)));
        showSuccess("Habitación actualizada correctamente.");
        closeModal();
      }
    } else {
      const { data, error } = await supabase
        .from("habitaciones").insert([payload]).select().single();
      if (error) { setError("Error al crear la habitación."); console.error(error); }
      else {
        setHabitaciones((prev) => [...prev, data].sort((a, b) => a.numero.localeCompare(b.numero)));
        showSuccess("Habitación creada correctamente.");
        closeModal();
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase.from("habitaciones").delete().eq("id", editingId);
    if (error) { setError("Error al eliminar."); console.error(error); }
    else {
      setHabitaciones((prev) => prev.filter((h) => h.id !== editingId));
      showSuccess("Habitación eliminada.");
      closeModal();
    }
    setSaving(false);
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-[#080c12] p-4 md:p-6 gap-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Settings size={20} className="text-cyan-400" />
        <div>
          <h2 className="text-lg font-bold tracking-widest text-white">CONFIGURACIÓN</h2>
          <p className="text-xs text-slate-500 mt-0.5">Gestiona las habitaciones del alojamiento</p>
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button className="ml-auto text-red-400 hover:text-white" onClick={() => setError("")}>
            <X size={13} />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
          <CheckCircle size={15} className="text-green-400 shrink-0" />
          <p className="text-sm text-green-400">{successMsg}</p>
        </div>
      )}

      {/* Sección Habitaciones */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1117] overflow-hidden">
        {/* Header sección */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <BedDouble size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold tracking-widest text-white">HABITACIONES</h3>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              {habitaciones.length}
            </span>
          </div>
          <button
            id="btn-nueva-habitacion"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold tracking-widest text-[#080c12] hover:bg-cyan-400 transition-all"
          >
            <Plus size={13} />
            Nueva
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 size={24} className="animate-spin text-cyan-400" />
            <p className="text-sm tracking-widest text-slate-500">CARGANDO...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && habitaciones.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <BedDouble size={36} className="text-slate-700" />
            <p className="text-sm text-slate-500">No hay habitaciones registradas.</p>
            <p className="text-xs text-slate-600">Haz clic en "+ Nueva" para agregar una.</p>
          </div>
        )}

        {/* Lista de habitaciones */}
        {!loading && habitaciones.length > 0 && (
          <div className="divide-y divide-slate-800">
            {habitaciones.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-all"
              >
                {/* Info */}
                <div className="flex items-center gap-4">
                  {/* Badge número */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-sm font-bold text-cyan-400">
                    {h.numero}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{h.nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      S/ {Number(h.precio || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })} / noche
                    </p>
                  </div>
                </div>

                {/* Acciones */}
                <button
                  onClick={() => openEdit(h)}
                  title="Editar habitación"
                  className="rounded-lg p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                >
                  <Edit size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info localización */}
      <div className="rounded-xl border border-slate-800 bg-[#0d1117] px-5 py-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Localización</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">País</p>
            <p className="text-white font-medium flex items-center gap-2">🇵🇪 Perú</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Moneda</p>
            <p className="text-white font-medium">S/ Soles (PEN)</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Prefijo telefónico</p>
            <p className="text-white font-medium">+51</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Zona horaria</p>
            <p className="text-white font-medium">UTC−5 (Lima)</p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <HabitacionModal
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
          loading={saving}
          isEditing={!!editingId}
          initialData={editingData}
        />
      )}
    </div>
  );
}
