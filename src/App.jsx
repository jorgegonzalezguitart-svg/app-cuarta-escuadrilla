import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN SUPABASE ---
const SUPABASE_URL = 'https://ukzshjbsodwknfysjrim.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qk9JMltu3W40tWGTZFUDcA_PIBuun1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PILOTS = ['TTT', 'EDU', 'JOS', 'PES', 'MED', 'GTI'];
const AIRCRAFT_LIST = ['PC-24', 'C-550'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('cuarta_pilot') || '');
  const [view, setView] = useState('month'); // 'month', 'week', 'list', 'stats'
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Formulario Evento
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    id: null,
    title: '',
    type: 'VUELO',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '11:00',
    pic: 'TTT',
    cop: 'EDU',
    callsign: 'ESCOTA 01',
    aircraft: 'PC-24',
    status: 'PROGRAMADO',
    horas_vuelo: 1.0,
    fuera_horas: false,
    description: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (!error && data) setEvents(data);
    setLoading(false);
  };

  const handleUserSelect = (pilot) => {
    setCurrentUser(pilot);
    localStorage.setItem('cuarta_pilot', pilot);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title: form.type === 'VUELO' ? `VUELO ${form.aircraft} - ${form.callsign}` : form.title,
      type: form.type,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      pic: form.type === 'VUELO' ? form.pic : null,
      cop: form.type === 'VUELO' ? form.cop : null,
      callsign: form.type === 'VUELO' ? form.callsign : null,
      aircraft: form.type === 'VUELO' ? form.aircraft : null,
      status: form.type === 'VUELO' ? form.status : 'PROGRAMADO',
      horas_vuelo: form.type === 'VUELO' && form.status === 'FINALIZADO' ? parseFloat(form.horas_vuelo) || 0 : 0,
      fuera_horas: form.type === 'VUELO' && form.status === 'FINALIZADO' ? form.fuera_horas : false,
      description: form.description
    };

    if (form.id) {
      await supabase.from('events').update(payload).eq('id', form.id);
    } else {
      await supabase.from('events').insert([payload]);
    }

    setShowModal(false);
    fetchEvents();
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm('¿Seguro que quieres eliminar este evento?')) {
      await supabase.from('events').delete().eq('id', id);
      fetchEvents();
    }
  };

  // NAVEGACIÓN MES
  const changeMonth = (delta) => {
    const newDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + delta, 1);
    setCurrentMonthDate(newDate);
  };

  // GENERAR REJILLA MENSUAL
  const getMonthGrid = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6; // Lunes = 0, Domingo = 6

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr });
    }
    return days;
  };

  // CÁLCULO DÍAS SEMANA
  const getWeekDates = (dateStr) => {
    const curr = new Date(dateStr);
    const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
    const week = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(curr);
      next.setDate(first + i);
      week.push(next.toISOString().split('T')[0]);
    }
    return week;
  };

  // CÁLCULOS ESTADÍSTICAS
  const getPilotStats = () => {
    const stats = {};
    PILOTS.forEach(p => {
      stats[p] = { picHours: 0, copHours: 0, totalHours: 0, fueraHorasCount: 0 };
    });

    events.filter(e => e.type === 'VUELO' && e.status === 'FINALIZADO').forEach(e => {
      const hrs = parseFloat(e.horas_vuelo) || 0;
      const isFuera = e.fuera_horas === true || e.fuera_horas === 'true';

      if (e.pic && stats[e.pic]) {
        stats[e.pic].picHours += hrs;
        stats[e.pic].totalHours += hrs;
        if (isFuera) stats[e.pic].fueraHorasCount += 1;
      }
      if (e.cop && stats[e.cop]) {
        stats[e.cop].copHours += hrs;
        stats[e.cop].totalHours += hrs;
        if (isFuera) stats[e.cop].fueraHorasCount += 1;
      }
    });

    return stats;
  };

  if (!currentUser) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>CUARTA ESCUADRILLA</h1>
        <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Selecciona tu indicativo de piloto:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
          {PILOTS.map(p => (
            <button
              key={p}
              onClick={() => handleUserSelect(p)}
              style={{ padding: '20px', fontSize: '20px', fontWeight: 'bold', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer' }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const monthGrid = getMonthGrid();
  const weekDates = getWeekDates(selectedDate);
  const pilotStats = getPilotStats();
  const selectedDayEvents = events.filter(e => e.date === selectedDate);

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#e2e8f0', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* CABECERA */}
      <header style={{ backgroundColor: '#1e293b', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#38bdf8' }}>CUARTA ESCUADRILLA</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Usuario: <strong>{currentUser}</strong></span>
        </div>
        <button onClick={() => setCurrentUser('')} style={{ background: 'none', border: '1px solid #475569', color: '#94a3b8', padding: '5px 10px', borderRadius: '6px', fontSize: '12px' }}>
          Cambiar
        </button>
      </header>

      {/* NAVEGACIÓN VISTAS */}
      <nav style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: '#1e293b', padding: '10px', borderBottom: '1px solid #334155' }}>
        <button onClick={() => setView('month')} style={{ background: view === 'month' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' }}>Mes</button>
        <button onClick={() => setView('week')} style={{ background: view === 'week' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' }}>Semana</button>
        <button onClick={() => setView('list')} style={{ background: view === 'list' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' }}>Lista</button>
        <button onClick={() => setView('stats')} style={{ background: view === 'stats' ? '#2563eb' : 'transparent', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' }}>Stats</button>
      </nav>

      {/* VISTA CALENDARIO MENSUAL */}
      {view === 'month' && (
        <div style={{ padding: '15px' }}>
          {/* CONTROL MES */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <button onClick={() => changeMonth(-1)} style={{ backgroundColor: '#334155', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px' }}>&lt; Ant</button>
            <h3 style={{ margin: 0, color: '#38bdf8' }}>{MONTH_NAMES[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}</h3>
            <button onClick={() => changeMonth(1)} style={{ backgroundColor: '#334155', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px' }}>Sig &gt;</button>
          </div>

          {/* DÍAS CABECERA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', color: '#94a3b8', marginBottom: '5px' }}>
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>

          {/* REJILLA MENSUAL */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {monthGrid.map((item, idx) => {
              if (!item) return <div key={`empty-${idx}`} style={{ backgroundColor: '#1e293b', minHeight: '50px', opacity: 0.3, borderRadius: '4px' }}></div>;
              
              const dayEvts = events.filter(e => e.date === item.dateStr);
              const isSelected = item.dateStr === selectedDate;

              return (
                <div
                  key={item.dateStr}
                  onClick={() => setSelectedDate(item.dateStr)}
                  style={{
                    backgroundColor: isSelected ? '#2563eb' : '#1e293b',
                    borderRadius: '6px',
                    padding: '4px',
                    minHeight: '55px',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                    position: 'relative'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: isSelected ? '#fff' : '#cbd5e1' }}>{item.dayNumber}</span>
                  <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayEvts.slice(0, 2).map(e => (
                      <span key={e.id} style={{ fontSize: '9px', backgroundColor: e.type === 'VUELO' ? '#0284c7' : '#d97706', color: '#fff', padding: '1px 3px', borderRadius: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.callsign || e.title}
                      </span>
                    ))}
                    {dayEvts.length > 2 && <span style={{ fontSize: '8px', color: '#38bdf8' }}>+{dayEvts.length - 2} más</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DETALLE DEL DÍA SELECCIONADO */}
          <div style={{ marginTop: '20px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #38bdf8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: '#f8fafc' }}>Eventos para el {selectedDate}</h4>
              <button onClick={() => { setForm({ ...form, id: null, date: selectedDate }); setShowModal(true); }} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                + Crear en este día
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Sin actividad este día.</p>
            ) : (
              selectedDayEvents.map(e => (
                <div key={e.id} style={{ marginTop: '8px', padding: '10px', backgroundColor: '#334155', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 'bold', color: e.type === 'VUELO' ? '#38bdf8' : '#f59e0b' }}>
                    {e.title} ({e.start_time} - {e.end_time})
                  </div>
                  {e.type === 'VUELO' && (
                    <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                      PIC: {e.pic} | COP: {e.cop} | Estado: <strong>{e.status}</strong>
                      {e.status === 'FINALIZADO' && ` | Hrs: ${e.horas_vuelo}h${e.fuera_horas ? ' (Fuera Horas)' : ''}`}
                    </div>
                  )}
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setForm(e); setShowModal(true); }} style={{ background: '#1e293b', color: '#38bdf8', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>Editar</button>
                    <button onClick={() => handleDeleteEvent(e.id)} style={{ background: '#1e293b', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>Eliminar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VISTA SEMANAL */}
      {view === 'week' && (
        <div style={{ padding: '15px' }}>
          <h3 style={{ textAlign: 'center', color: '#38bdf8', marginTop: 0 }}>Vista Semanal</h3>
          {weekDates.map(d => {
            const dayEvents = events.filter(e => e.date === d);
            return (
              <div key={d} style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '12px', marginBottom: '10px', borderLeft: '4px solid #2563eb' }}>
                <strong style={{ color: '#f8fafc' }}>{d}</strong>
                {dayEvents.length === 0 ? (
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#64748b' }}>Sin actividad</p>
                ) : (
                  dayEvents.map(e => (
                    <div key={e.id} style={{ marginTop: '8px', padding: '8px', backgroundColor: '#334155', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 'bold', color: e.type === 'VUELO' ? '#38bdf8' : '#f59e0b' }}>
                        {e.title} ({e.start_time} - {e.end_time})
                      </div>
                      {e.type === 'VUELO' && (
                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                          PIC: {e.pic} | COP: {e.cop} | Estado: <strong>{e.status}</strong>
                          {e.status === 'FINALIZADO' && ` | Hrs: ${e.horas_vuelo}h${e.fuera_horas ? ' (Fuera Horas)' : ''}`}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA LISTA COMPLETA */}
      {view === 'list' && (
        <div style={{ padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#38bdf8' }}>Todas las Operaciones</h3>
            <button onClick={() => { setForm({ ...form, id: null }); setShowModal(true); }} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold' }}>
              + Nuevo Evento
            </button>
          </div>

          {events.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>No hay eventos registrados.</p>
          ) : (
            events.map(e => (
              <div key={e.id} style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '15px', marginBottom: '12px', borderLeft: e.type === 'VUELO' ? '5px solid #2563eb' : '5px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{e.date} | {e.start_time} - {e.end_time}</span>
                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: e.status === 'FINALIZADO' ? '#16a34a' : '#334155' }}>
                    {e.status}
                  </span>
                </div>
                <h4 style={{ margin: '8px 0', fontSize: '16px', color: '#f8fafc' }}>{e.title}</h4>
                {e.type === 'VUELO' && (
                  <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                    <p style={{ margin: '3px 0' }}>🧑‍✈️ <strong>PIC:</strong> {e.pic} | <strong>COP:</strong> {e.cop}</p>
                    {e.status === 'FINALIZADO' && (
                      <p style={{ margin: '3px 0', color: '#4ade80' }}>⏱️ <strong>Horas:</strong> {e.horas_vuelo}h {e.fuera_horas ? '🌙 (Fuera de Horas)' : ''}</p>
                    )}
                  </div>
                )}
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setForm(e); setShowModal(true); }} style={{ background: '#334155', color: '#38bdf8', border: 'none', padding: '6px 12px', borderRadius: '5px', fontSize: '12px' }}>Editar</button>
                  <button onClick={() => handleDeleteEvent(e.id)} style={{ background: '#334155', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '5px', fontSize: '12px' }}>Eliminar</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VISTA ESTADÍSTICAS */}
      {view === 'stats' && (
        <div style={{ padding: '15px' }}>
          <h3 style={{ color: '#38bdf8', marginBottom: '15px', marginTop: 0 }}>Resumen de Horas Acumuladas</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '25px' }}>
            <thead>
              <tr style={{ backgroundColor: '#334155', color: '#38bdf8', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Piloto</th>
                <th style={{ padding: '10px' }}>PIC</th>
                <th style={{ padding: '10px' }}>COP</th>
                <th style={{ padding: '10px' }}>Total Hrs</th>
              </tr>
            </thead>
            <tbody>
              {PILOTS.map(p => (
                <tr key={p} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{p}</td>
                  <td style={{ padding: '10px' }}>{pilotStats[p].picHours.toFixed(1)}h</td>
                  <td style={{ padding: '10px' }}>{pilotStats[p].copHours.toFixed(1)}h</td>
                  <td style={{ padding: '10px', color: '#4ade80', fontWeight: 'bold' }}>{pilotStats[p].totalHours.toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ color: '#f59e0b', marginBottom: '15px' }}>Vuelos Fuera de Horas</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ backgroundColor: '#334155', color: '#f59e0b', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Piloto</th>
                <th style={{ padding: '10px' }}>Vuelos Fuera de Horas</th>
              </tr>
            </thead>
            <tbody>
              {PILOTS.map(p => (
                <tr key={p} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{p}</td>
                  <td style={{ padding: '10px', color: '#f59e0b', fontWeight: 'bold' }}>{pilotStats[p].fueraHorasCount} vuelos</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CREAR / EDITAR EVENTO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#38bdf8' }}>{form.id ? 'Editar Evento' : 'Nuevo Evento'}</h3>
            
            <form onSubmit={handleSaveEvent}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Tipo:</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: '8px', margin: '5px 0 12px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }}>
                <option value="VUELO">VUELO</option>
                <option value="OTROS">OTROS / REUNIÓN / GUARDIA</option>
              </select>

              {form.type === 'OTROS' && (
                <>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Título:</label>
                  <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={{ width: '100%', padding: '8px', margin: '5px 0 12px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }} />
                </>
              )}

              {form.type === 'VUELO' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8' }}>Aeronave:</label>
                      <select value={form.aircraft} onChange={e => setForm({ ...form, aircraft: e.target.value })} style={{ width: '100%', padding: '8px', margin: '5px 0 12px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }}>
                        {AIRCRAFT_LIST.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8' }}>Callsign:</label>
                      <input type="text" value={form.callsign} onChange={e => setForm({ ...form, callsign: e.target.value })} style={{ width: '100%', padding: '8px', margin: '5px 0 12px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8' }}>PIC:</label>
                      <select value={form.pic} onChange={e => setForm({ ...form, pic: e.target.value })} style={{ width: '100%', padding: '8px', margin: '5px 0 12px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }}>
                        {PILOTS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8' }}>COP:</label>
                      <select value={form.cop} onChange={e => setForm({ ...form, cop: e.target.value })} style={{ width: '100%', padding: '8px', margin: '5px 0 12px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }}>
                        {PILOTS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Estado del Vuelo:</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '8px', margin: '5px 0 12px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }}>
                    <option value="PROGRAMADO">PROGRAMADO</option>
                    <option value="EN CURSO">EN CURSO</option>
                    <option value="FINALIZADO">FINALIZADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>

                  {/* DESPLEGABLES SI ESTÁ FINALIZADO */}
                  {form.status === 'FINALIZADO' && (
                    <div style={{ padding: '10px', backgroundColor: '#0f172a', borderRadius: '8px', marginBottom: '12px', border: '1px solid #16a34a' }}>
                      <label style={{ fontSize: '12px', color: '#4ade80', fontWeight: 'bold' }}>Horas de Vuelo Realizadas:</label>
                      <input type="number" step="0.1" value={form.horas_vuelo} onChange={e => setForm({ ...form, horas_vuelo: e.target.value })} style={{ width: '100%', padding: '8px', margin: '5px 0 10px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }} />

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f59e0b', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.fuera_horas} onChange={e => setForm({ ...form, fuera_horas: e.target.checked })} />
                        ¿Ha sido Vuelo Fuera de Horas?
                      </label>
                    </div>
                  )}
                </>
              )}

              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Fecha:</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required style={{ width: '100%', padding: '8px', margin: '5px 0 12px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Hora Inicio:</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required style={{ width: '100%', padding: '8px', margin: '5px 0 12px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Hora Fin:</label>
                  <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required style={{ width: '100%', padding: '8px', margin: '5px 0 12px 0', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold' }}>Guardar</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, backgroundColor: '#475569', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
