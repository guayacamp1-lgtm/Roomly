import { useEffect, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  addMonths,
  subMonths,
  parseISO,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "./lib/supabase";
import { ChevronLeft, ChevronRight, BedDouble, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
// Cuántas reservas activas tiene un día dado
function countReservasEnDia(reservas, date) {
  const target = startOfDay(date);
  return reservas.filter((r) => {
    try {
      const ingreso = startOfDay(parseISO(r.fecha_ingreso));
      const salida = startOfDay(parseISO(r.fecha_salida));
      return target >= ingreso && target < salida;
    } catch {
      return false;
    }
  }).length;
}

// Color de celda según ocupación
function cellStyle(count, isCurrentMonth, totalHabitaciones) {
  if (!isCurrentMonth) return "bg-transparent text-slate-700";
  if (count === 0) return "bg-[#0d1117] text-slate-400 hover:bg-slate-800";
  if (count >= totalHabitaciones)
    return "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30";
  return "bg-yellow-500/15 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25";
}

// ─────────────────────────────────────────────
// Leyenda
// ─────────────────────────────────────────────
function Leyenda() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-[#0d1117] border border-slate-700" />
        Disponible
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-yellow-500/20 border border-yellow-500/40" />
        Ocupación parcial
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-red-500/20 border border-red-500/40" />
        Todo ocupado
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Panel de detalle del día seleccionado
// ─────────────────────────────────────────────
function DayDetail({ date, reservas, totalHabitaciones }) {
  const target = startOfDay(date);
  const activas = reservas.filter((r) => {
    try {
      const ingreso = startOfDay(parseISO(r.fecha_ingreso));
      const salida = startOfDay(parseISO(r.fecha_salida));
      return target >= ingreso && target < salida;
    } catch {
      return false;
    }
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1117] p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
        {format(date, "EEEE d 'de' MMMM", { locale: es })} — {activas.length}/{totalHabitaciones} ocupadas
      </p>
      {activas.length === 0 ? (
        <p className="text-sm text-slate-600 text-center py-4">Sin reservas activas este día.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {activas.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <BedDouble size={14} className="text-cyan-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{r.huesped}</p>
                  <p className="text-xs text-slate-500">{r.habitacion}</p>
                </div>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                  r.estado === "confirmada"
                    ? "bg-green-500/15 text-green-400 border-green-500/30"
                    : r.estado === "cancelada"
                    ? "bg-red-500/15 text-red-400 border-red-500/30"
                    : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                }`}
              >
                {r.estado}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CalendarioScreen principal
// ─────────────────────────────────────────────
export default function CalendarioScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservas, setReservas] = useState([]);
  const [totalHabitaciones, setTotalHabitaciones] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date());

  // ── Carga de reservas + total de habitaciones ────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [{ data: resData, error: resError }, { data: habData, error: habError }] =
        await Promise.all([
          supabase
            .from("reservas")
            .select("id, habitacion, huesped, estado, fecha_ingreso, fecha_salida"),
          supabase.from("habitaciones").select("id"),
        ]);
      if (!resError) setReservas(resData ?? []);
      if (!habError) setTotalHabitaciones((habData ?? []).length);
      setLoading(false);
    }
    fetchData();
  }, []);

  // ── Días del calendario (relleno con días adyacentes) ──
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-[#080c12] p-4 md:p-6 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-widest text-white">CALENDARIO</h2>
          <p className="text-xs text-slate-500 mt-0.5">Vista mensual de ocupación</p>
        </div>

        {/* Navegación de mes */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-white min-w-[120px] text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <Leyenda />

      {/* Cuadrícula */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 size={28} className="animate-spin text-cyan-400" />
          <p className="text-sm tracking-widest text-slate-500">CARGANDO...</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-[#0d1117] overflow-hidden">
          {/* Cabecera días de la semana */}
          <div className="grid grid-cols-7 border-b border-slate-800">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
                {d}
              </div>
            ))}
          </div>

          {/* Días */}
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              const count = countReservasEnDia(reservas, day);
              const inMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={`
                    relative flex flex-col items-center justify-start pt-2 pb-1 px-1
                    min-h-[56px] border border-slate-800/50 transition-all
                    ${cellStyle(count, inMonth, totalHabitaciones)}
                    ${isSelected ? "ring-2 ring-cyan-500 ring-inset z-10" : ""}
                  `}
                >
                  {/* Número del día */}
                  <span
                    className={`
                      flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                      ${isToday ? "bg-cyan-500 text-[#080c12]" : ""}
                      ${!inMonth ? "opacity-30" : ""}
                    `}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Indicador de cantidad */}
                  {inMonth && count > 0 && (
                    <span
                      className={`mt-1 text-[10px] font-bold ${
                        count >= totalHabitaciones ? "text-red-400" : "text-yellow-400"
                      }`}
                    >
                      {count}/{totalHabitaciones}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Panel de detalle del día seleccionado */}
      {!loading && (
        <DayDetail date={selectedDay} reservas={reservas} totalHabitaciones={totalHabitaciones} />
      )}
    </div>
  );
}
