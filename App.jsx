import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Calendar as CalendarIcon, Plane, UserCheck, AlertTriangle, 
  Plus, Check, X, Share2, ChevronLeft, ChevronRight, User, Clock, MapPin 
} from 'lucide-react';

// === CONFIGURACIÓN DE SUPABASE ===
// Reemplaza con las claves de tu proyecto Supabase cuando lo crees
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'tu-anon-key';

const isSupabaseConfigured = SUPABASE_URL !== 'https://tu-proyecto.supabase.co';
const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// CONSTANTES OPERATIVAS
const PILOTS = ['TTT', 'EDU', 'JOSE', 'MED', 'GTI'];
const AIRCRAFT = ['PC-24', 'C-550'];
const FLIGHT_TYPES = ['PRUEBAS', 'ADM', 'LOG', 'INTERNACIONAL'];
const FLIGHT_STATUSES = [
  { label: 'Confirmado', value: 'confirmado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { label: 'Propuesto', value: 'propuesto', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { label: 'Dudoso', value: 'dudoso', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { label: 'Cancelado', value: 'cancelado', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30 line-through' }
];
const AVAILABILITY_TYPES = ['guardia', 'saliente', 'AP', 'permiso', 'comisión'];

// FESTIVOS DE ROTA Y ANDALUCÍA (2026/Recurrentes)
const HOLIDAYS_ROTA = {
  '01-01': 'Año Nuevo',
  '01-06': 'Epifanía del Señor',
  '02-28': 'Día de Andalucía',
  '04-02': 'Jueves Santo',
  '04-03': 'Viernes Santo',
  '05-01': 'Fiesta del Trabajo',
  '08-15': 'Asunción de la Virgen',
  '10-07': 'Virgen del Rosario (Patrona de Rota)',
  '10-12': 'Fiesta Nacional de España',
  '11-01': 'Todos los Santos',
  '12-06': 'Día de la Constitución',
  '12-08': 'Inmaculada Concepción',
  '12-25': 'Natividad del Señor'
};

export default function App() {
  // Estado de Perfil y Navegación
  const [currentPilot, setCurrentPilot] = useState(() => localStorage.getItem('4esc_pilot') || '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

  // Datos
  const [events, setEvents] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);

  // Modales
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [whatsappCopied, setWhatsappCopied] = useState(false);

  // Formulario Evento
  const [eventForm, setEventForm] = useState({
    category: 'VUELO',
    title: '', schedule: '', participants: '',
    flight_type: 'PRUEBAS', status: 'propuesto', aircraft: 'PC-24',
    callsign: '', itinerary: '', out_of_hours: 'no', pic: 'TTT', cop: 'EDU', notes: ''
  });

  // Formulario Disponibilidad
  const [availForm, setAvailForm] = useState({ pilot: currentPilot || 'TTT', status: 'permiso' });

  // Guardar Selección de Perfil
  const handleSelectPilot = (pilot) => {
    setCurrentPilot(pilot);
    localStorage.setItem('4esc_pilot', pilot);
    setAvailForm(prev => ({ ...prev, pilot }));
  };

  // Cargar Datos (Supabase o LocalStorage)
  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    if (isSupabaseConfigured) {
      const { data: evs } = await supabase.from('events').select('*');
      if (evs) setEvents(evs);
      const { data: avs } = await supabase.from('pilot_availability').select('*');
      if (avs) setAvailabilities(avs);
    } else {
      const localEvs = JSON.parse(localStorage.getItem('4esc_events') || '[]');
      const localAvs = JSON.parse(localStorage.getItem('4esc_availabilities') || '[]');
      setEvents(localEvs);
      setAvailabilities(localAvs);
    }
  };

  // Generación de Días del Mes
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Offset día de la semana (Lunes = 0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: d, dateStr });
    }

    return days;
  }, [currentDate]);

  // Alerta de Incompatibilidad de Pilotos
  const crewConflict = useMemo(() => {
    if (eventForm.category !== 'VUELO') return null;
    const dateAvails = availabilities.filter(a => a.date === selectedDateStr);
    const picUnavail = dateAvails.find(a => a.pilot === eventForm.pic);
    const copUnavail = dateAvails.find(a => a.pilot === eventForm.cop);

    let conflicts = [];
    if (picUnavail) conflicts.push(`PIC ${eventForm.pic} está de ${picUnavail.status.toUpperCase()}`);
    if (copUnavail) conflicts.push(`COP ${eventForm.cop} está de ${copUnavail.status.toUpperCase()}`);
    return conflicts.length > 0 ? conflicts.join(' | ') : null;
  }, [eventForm, selectedDateStr, availabilities]);

  // Guardar Evento
  const handleSaveEvent = async () => {
    const newEvent = { ...eventForm, date: selectedDateStr, id: crypto.randomUUID() };
    if (isSupabaseConfigured) {
      await supabase.from('events').insert([newEvent]);
    } else {
      const updated = [...events, newEvent];
      setEvents(updated);
      localStorage.setItem('4esc_events', JSON.stringify(updated));
    }
    setShowEventModal(false);
    loadData();
  };

  // Guardar Disponibilidad
  const handleSaveAvail = async () => {
    const newAvail = { ...availForm, date: selectedDateStr, id: crypto.randomUUID() };
    if (isSupabaseConfigured) {
      await supabase.from('pilot_availability').upsert([newAvail], { onConflict: 'date,pilot' });
    } else {
      const filtered = availabilities.filter(a => !(a.date === selectedDateStr && a.pilot === availForm.pilot));
      const updated = [...filtered, newAvail];
      setAvailabilities(updated);
      localStorage.setItem('4esc_availabilities', JSON.stringify(updated));
    }
    setShowAvailModal(false);
    loadData();
  };

  // Exportar Orden del Día a WhatsApp
  const generateWhatsAppBrief = () => {
    const dayEvents = events.filter(e => e.date === selectedDateStr);
    const dayAvails = availabilities.filter(a => a.date === selectedDateStr);
    const dateFormatted = new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();

    let text = `✈️ *4ª ESCUADRILLA - OPs ${dateFormatted}*\n`;
    text += `─────────────\n`;

    if (dayEvents.length === 0) {
      text += `Sin vuelos ni eventos programados.\n`;
    } else {
      dayEvents.forEach(e => {
        if (e.category === 'VUELO') {
          text += `• *${e.aircraft}* | C/S: *${e.callsign || 'N/A'}* | ${e.flight_type}\n`;
          text += `  Ruta: ${e.itinerary || 'Local'} | PIC: ${e.pic} / COP: ${e.cop}\n`;
          text += `  Estado: _${e.status.toUpperCase()}_ ${e.out_of_hours === 'sí' ? ' [Fuera Horas]' : ''}\n\n`;
        } else {
          text += `📌 *EVENTO:* ${e.title} (${e.schedule || 'Todo el día'})\n`;
          text += `  Part: ${e.participants || 'Todos'}\n\n`;
        }
      });
    }

    if (dayAvails.length > 0) {
      text += `🔴 *NO DISPONIBLES:*\n`;
      dayAvails.forEach(a => {
        text += `• ${a.pilot}: ${a.status.toUpperCase()}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setWhatsappCopied(true);
    setTimeout(() => setWhatsappCopied(false), 2500);
  };

  // Selector de Perfil si no hay seleccionado
  if (!currentPilot) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center justify-center text-blue-400">
            <Plane size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">4ª ESCUADRILLA</h1>
            <p className="text-sm text-slate-400 mt-1">Selecciona tu indicativo para acceder al calendario operativo</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {PILOTS.map(pilot => (
              <button
                key={pilot}
                onClick={() => handleSelectPilot(pilot)}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 rounded-xl font-bold transition flex items-center justify-between"
              >
                <span>PILOTO {pilot}</span>
                <User size={18} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* HEADER PRINCIPAL */}
      <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
            <Plane size={22} />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-white">4ª ESCUADRILLA</h1>
            <p className="text-xs text-slate-400">Base Naval de Rota</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg font-mono font-semibold text-blue-400 flex items-center gap-1.5">
            <User size={14} /> {currentPilot}
          </span>
          <button
            onClick={() => setCurrentPilot('')}
            className="text-xs text-slate-500 hover:text-slate-300 p-1.5"
            title="Cambiar Perfil"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* NAVEGACIÓN MES */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold capitalize text-white tracking-wide">
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* CALENDARIO MES */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl">
          {/* Cabecera días semana */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>

          {/* Celdas días */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((day, idx) => {
              if (!day) return <div key={idx} className="h-28 bg-slate-950/40 rounded-xl" />;

              const dayEvents = events.filter(e => e.date === day.dateStr);
              const dayAvails = availabilities.filter(a => a.date === day.dateStr);
              const isToday = new Date().toISOString().split('T')[0] === day.dateStr;
              const holidayKey = day.dateStr.slice(5);
              const holidayName = HOLIDAYS_ROTA[holidayKey];

              return (
                <div
                  key={day.dateStr}
                  onClick={() => {
                    setSelectedDateStr(day.dateStr);
                    setShowDayDetail(true);
                  }}
                  className={`h-28 p-1.5 rounded-xl border transition cursor-pointer flex flex-col justify-between overflow-hidden ${
                    isToday
                      ? 'bg-blue-950/30 border-blue-500/50 shadow-inner'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-300'}`}>
                      {day.date}
                    </span>
                    {holidayName && (
                      <span className="w-2 h-2 rounded-full bg-rose-500" title={`Festivo Rota: ${holidayName}`} />
                    )}
                  </div>

                  {/* Resumen de contenido del día */}
                  <div className="space-y-1 my-auto overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const st = FLIGHT_STATUSES.find(s => s.value === ev.status);
                      return (
                        <div
                          key={ev.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${
                            ev.category === 'VUELO'
                              ? `${st?.color || 'bg-slate-800 text-slate-300 border-slate-700'}`
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/30 font-medium'
                          }`}
                        >
                          {ev.category === 'VUELO' ? `${ev.aircraft} | ${ev.callsign || ev.flight_type}` : ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-slate-500 font-semibold text-center">
                        +{dayEvents.length - 2} más
                      </div>
                    )}
                  </div>

                  {/* No disponibles en el día */}
                  {dayAvails.length > 0 && (
                    <div className="text-[9px] text-rose-400/90 font-mono font-semibold truncate bg-rose-950/30 px-1 py-0.5 rounded">
                      🚫 {dayAvails.map(a => a.pilot).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL DETALLE DE DÍA */}
      {showDayDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white capitalize">
                  {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {HOLIDAYS_ROTA[selectedDateStr.slice(5)] && (
                  <p className="text-xs text-rose-400 font-semibold mt-1">
                    🎉 Festivo Rota/Andalucía: {HOLIDAYS_ROTA[selectedDateStr.slice(5)]}
                  </p>
                )}
              </div>
              <button onClick={() => setShowDayDetail(false)} className="p-2 text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setShowEventModal(true); setShowDayDetail(false); }}
                className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Plus size={16} /> Añadir Evento / Vuelo
              </button>
              <button
                onClick={() => { setShowAvailModal(true); setShowDayDetail(false); }}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <UserCheck size={16} /> Marcar Ausencia
              </button>
              <button
                onClick={generateWhatsAppBrief}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Share2 size={16} /> {whatsappCopied ? '¡Copiado!' : 'WhatsApp'}
              </button>
            </div>

            {/* Listado de Eventos del Día */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Programación del Día</h4>
              {events.filter(e => e.date === selectedDateStr).length === 0 ? (
                <p className="text-sm text-slate-500 italic py-4 text-center">No hay eventos ni vuelos registrados para este día.</p>
              ) : (
                events.filter(e => e.date === selectedDateStr).map(e => (
                  <div key={e.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    {e.category === 'VUELO' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                            {e.aircraft} — {e.flight_type}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border capitalize ${FLIGHT_STATUSES.find(s => s.value === e.status)?.color}`}>
                            {e.status}
                          </span>
                        </div>
                        <div className="text-base font-bold text-white flex items-center gap-2">
                          <Plane size={18} className="text-blue-400" /> C/S: {e.callsign || 'Sin Indicativo'}
                        </div>
                        <div className="text-xs text-slate-300 space-y-1">
                          <p className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-500" /> Ruta: <span className="font-mono text-white">{e.itinerary || 'No especificada'}</span></p>
                          <p className="flex items-center gap-1.5"><User size={14} className="text-slate-500" /> PIC: <strong className="text-blue-400">{e.pic}</strong> | COP: <strong className="text-blue-400">{e.cop}</strong></p>
                          {e.out_of_hours === 'sí' && <p className="text-amber-400 font-semibold">⚠️ Operación Fuera de Horas</p>}
                          {e.notes && <p className="text-slate-400 italic mt-1 border-t border-slate-800 pt-1">"{e.notes}"</p>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">
                            EVENTO / OTROS
                          </span>
                          <span className="text-xs text-slate-400">{e.schedule}</span>
                        </div>
                        <h5 className="font-bold text-white text-base">{e.title}</h5>
                        <p className="text-xs text-slate-300">Participantes: {e.participants || 'Todos'}</p>
                        {e.notes && <p className="text-xs text-slate-400 italic">{e.notes}</p>}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Listado de Ausencias */}
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado de Disponibilidad</h4>
              {availabilities.filter(a => a.date === selectedDateStr).length === 0 ? (
                <p className="text-xs text-slate-500 italic">Todos los pilotos están disponibles.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availabilities.filter(a => a.date === selectedDateStr).map(a => (
                    <div key={a.id} className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-2 text-xs flex items-center justify-between">
                      <span className="font-bold text-slate-200">PILOTO {a.pilot}</span>
                      <span className="uppercase font-mono font-bold text-rose-400">{a.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR EVENTO / VUELO */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Nuevo Registro para {selectedDateStr}</h3>
              <button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Selector Categoría */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setEventForm(f => ({ ...f, category: 'VUELO' }))}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${eventForm.category === 'VUELO' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                ✈️ VUELO
              </button>
              <button
                onClick={() => setEventForm(f => ({ ...f, category: 'OTROS' }))}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${eventForm.category === 'OTROS' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
              >
                📌 OTROS EVENTOS
              </button>
            </div>

            {/* Alerta Incompatibilidad Pilotos */}
            {crewConflict && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertTriangle size={18} className="shrink-0 text-amber-400" />
                <div>
                  <strong className="block font-bold">Incompatibilidad de Tripulación:</strong>
                  {crewConflict}
                </div>
              </div>
            )}

            {/* Formulario VUELO */}
            {eventForm.category === 'VUELO' ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Aeronave</label>
                    <select
                      value={eventForm.aircraft}
                      onChange={e => setEventForm({ ...eventForm, aircraft: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      {AIRCRAFT.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tipo Vuelo</label>
                    <select
                      value={eventForm.flight_type}
                      onChange={e => setEventForm({ ...eventForm, flight_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      {FLIGHT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Estado</label>
                    <select
                      value={eventForm.status}
                      onChange={e => setEventForm({ ...eventForm, status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white capitalize"
                    >
                      {FLIGHT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Fuera Horas</label>
                    <select
                      value={eventForm.out_of_hours}
                      onChange={e => setEventForm({ ...eventForm, out_of_hours: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      <option value="no">No</option>
                      <option value="sí">Sí</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Identificación / Callsign</label>
                  <input
                    type="text"
                    placeholder="Ej. ANV401"
                    value={eventForm.callsign}
                    onChange={e => setEventForm({ ...eventForm, callsign: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Itinerario</label>
                  <input
                    type="text"
                    placeholder="Ej. LERT-LETO-LERT"
                    value={eventForm.itinerary}
                    onChange={e => setEventForm({ ...eventForm, itinerary: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Comandante (PIC)</label>
                    <select
                      value={eventForm.pic}
                      onChange={e => setEventForm({ ...eventForm, pic: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      {PILOTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Copiloto (COP)</label>
                    <select
                      value={eventForm.cop}
                      onChange={e => setEventForm({ ...eventForm, cop: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      {PILOTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Observaciones</label>
                  <textarea
                    rows={2}
                    placeholder="Notas de handling, pasaje, catering..."
                    value={eventForm.notes}
                    onChange={e => setEventForm({ ...eventForm, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
            ) : (
              /* Formulario OTROS */
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nombre del Evento</label>
                  <input
                    type="text"
                    placeholder="Ej. Reunión de Escuadrilla"
                    value={eventForm.title}
                    onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Horario</label>
                  <input
                    type="text"
                    placeholder="Ej. 09:00 - 11:00 LCL"
                    value={eventForm.schedule}
                    onChange={e => setEventForm({ ...eventForm, schedule: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Participantes</label>
                  <input
                    type="text"
                    placeholder="Ej. Todos los pilotos"
                    value={eventForm.participants}
                    onChange={e => setEventForm({ ...eventForm, participants: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Info Adicional</label>
                  <textarea
                    rows={2}
                    placeholder="Detalles..."
                    value={eventForm.notes}
                    onChange={e => setEventForm({ ...eventForm, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSaveEvent}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg mt-2 text-xs"
            >
              Guardar en Calendario
            </button>
          </div>
        </div>
      )}

      {/* MODAL DISPONIBILIDAD PILOTO */}
      {showAvailModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Marcar Indisponibilidad</h3>
              <button onClick={() => setShowAvailModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-400">Fecha: <strong className="text-white">{selectedDateStr}</strong></p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Piloto</label>
                <select
                  value={availForm.pilot}
                  onChange={e => setAvailForm({ ...availForm, pilot: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  {PILOTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Estado de Ausencia / Guardia</label>
                <select
                  value={availForm.status}
                  onChange={e => setAvailForm({ ...availForm, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                >
                  {AVAILABILITY_TYPES.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveAvail}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition shadow-lg text-xs"
            >
              Confirmar Estado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
