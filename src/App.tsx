import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Settings, 
  BookOpen, 
  Wrench, 
  Users, 
  BarChart3, 
  X, 
  Phone,
  GripVertical,
  Eye,
  Trash2,
  Scissors,
  Clock
} from 'lucide-react';

// ==========================================
// COMPONENTE 1: MINI CALENDARIO MENSUAL
// ==========================================
function MiniCalendar({ selectedDate, onSelectDate }) {
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDayIndex = firstDayOfMonth.getDay() - 1;
  if (startDayIndex === -1) startDayIndex = 6;

  const prevMonthDays = new Date(year, month, 0).getDate();
  const days = [];

  // Días mes anterior
  for (let i = startDayIndex - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i)
    });
  }

  // Días mes actual
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Relleno mes siguiente
  const totalCells = Math.ceil(days.length / 7) * 7;
  for (let i = 1; days.length < totalCells; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isToday = (d) => isSameDay(d, new Date());

  return (
    <div className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl p-4 shadow-2xl text-gray-200 select-none">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold tracking-wide text-[#e5c158] uppercase">
          {monthNames[month]} {year}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-1 hover:bg-[#222] hover:text-[#e5c158] rounded-md transition-colors text-gray-400"
            title="Mes anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-1 hover:bg-[#222] hover:text-[#e5c158] rounded-md transition-colors text-gray-400"
            title="Mes siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-2">
        <span>L</span>
        <span>M</span>
        <span>X</span>
        <span>J</span>
        <span>V</span>
        <span>S</span>
        <span>D</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((item, idx) => {
          const selected = isSameDay(item.date, selectedDate);
          const current = isToday(item.date);

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(item.date)}
              className={`h-7 w-7 rounded-full flex items-center justify-center transition-all mx-auto font-medium ${
                !item.isCurrentMonth ? 'text-gray-600' : 'text-gray-300'
              } ${
                selected
                  ? 'bg-[#d4af37] text-black font-bold shadow-md shadow-amber-900/30 scale-105'
                  : current
                  ? 'border border-[#d4af37] text-[#e5c158] font-bold'
                  : 'hover:bg-[#222] hover:text-[#e5c158]'
              }`}
            >
              {item.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL: PANEL DE GESTIÓN
// ==========================================
export default function AgendaPanel() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('agenda');

  // Estado para la cita seleccionada en la modal de detalle
  const [selectedApptModal, setSelectedApptModal] = useState(null);

  // Estado reactivo de las citas
  const [appointments, setAppointments] = useState([
    {
      id: 'cita-1',
      day: 'Lunes',
      time: '10:00',
      client: 'María G.',
      service: 'Coloración Global & Raíces',
      servicesList: [
        'Coloración Global & Cobertura Raíces',
        'Tratamiento de Brillo Balmain Hair',
        'Peinado VIP & Visagismo'
      ],
      phone: '600111222',
      duration: '1h 30m',
      price: '85,00 €',
      notes: 'Cliente habitual. Sensibilidad en cuero cabelludo (usar protector de cuero cabelludo).'
    }
  ]);

  // Estado para Drag & Drop
  const [draggedApptId, setDraggedApptId] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  const timeSlots = [
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30'
  ];

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // ------------------------------------------
  // LÓGICA DRAG AND DROP
  // ------------------------------------------
  const handleDragStart = (e, id) => {
    setDraggedApptId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (day, time) => {
    setDragOverCell({ day, time });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e, targetDay, targetTime) => {
    e.preventDefault();
    const apptId = e.dataTransfer.getData('text/plain') || draggedApptId;

    if (!apptId) return;

    setAppointments((prev) =>
      prev.map((appt) =>
        appt.id === apptId
          ? { ...appt, day: targetDay, time: targetTime }
          : appt
      )
    );

    setDraggedApptId(null);
    setDragOverCell(null);
  };

  const handleDeleteAppt = (id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col select-none relative">
      {/* 1. CABECERA Y NAVEGACIÓN SUPERIOR */}
      <header className="border-b border-[#1f1f1f] bg-[#0c0c0c] px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-[#e5c158] uppercase">
              360STUDIO — PANEL DE GESTIÓN
            </h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
              L'STUDIO ANA · ELCHE
            </p>
          </div>
          <button className="self-start lg:self-auto bg-[#e5c158] hover:bg-[#d4af37] text-black font-semibold px-4 py-1.5 rounded-lg text-xs transition-colors shadow-md">
            Cerrar Sesión
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setActiveTab('agenda')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'agenda'
                ? 'bg-[#e5c158] text-black font-semibold shadow-lg shadow-amber-900/20'
                : 'bg-[#141414] text-gray-300 border border-[#2a2a2a] hover:border-[#e5c158]/50'
            }`}
          >
            <CalendarIcon size={14} /> Agenda
          </button>

          <button 
            onClick={() => setActiveTab('config')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#141414] text-gray-300 border border-[#2a2a2a] hover:border-[#e5c158]/50 transition-all"
          >
            <Settings size={14} /> Configuración Negocio
          </button>

          <button 
            onClick={() => setActiveTab('catalogo')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#141414] text-gray-300 border border-[#2a2a2a] hover:border-[#e5c158]/50 transition-all"
          >
            <BookOpen size={14} /> Catálogo Maestro
          </button>

          <button 
            onClick={() => setActiveTab('herramientas')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#141414] text-gray-300 border border-[#2a2a2a] hover:border-[#e5c158]/50 transition-all"
          >
            <Wrench size={14} /> Herramientas
          </button>

          <button 
            onClick={() => setActiveTab('clientes')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#141414] text-gray-300 border border-[#2a2a2a] hover:border-[#e5c158]/50 transition-all"
          >
            <Users size={14} /> Base de Clientes
          </button>

          <button 
            onClick={() => setActiveTab('crm')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#141414] text-gray-300 border border-[#2a2a2a] hover:border-[#e5c158]/50 transition-all"
          >
            <BarChart3 size={14} /> CRM / KPIs
          </button>
        </div>
      </header>

      {/* 2. SUB-HEADER / INSTRUCCIONES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 bg-[#0d0d0d] border-b border-[#1f1f1f] text-xs text-gray-400">
        <span>Usa el icono del ojo para ampliar la cita o la papelera para borrarla. Mantén pulsado para arrastrar.</span>
        <span className="text-[#e5c158] font-semibold mt-1 sm:mt-0">Vista Semanal (Lunes a Sábado)</span>
      </div>

      {/* 3. CUERPO PRINCIPAL: LAYOUT 2 COLUMNAS */}
      <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 overflow-hidden">
        
        {/* COLUMNA IZQUIERDA: MINI CALENDARIO */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
          <MiniCalendar 
            selectedDate={selectedDate} 
            onSelectDate={(date) => setSelectedDate(date)} 
          />
          
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-4 text-xs text-gray-400">
            <p className="font-semibold text-gray-200 mb-1">Fecha seleccionada:</p>
            <p className="text-[#e5c158] font-bold">
              {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </aside>

        {/* COLUMNA DERECHA: GRID DE AGENDA SEMANAL */}
        <main className="flex-1 bg-[#111111] border border-[#222222] rounded-xl overflow-x-auto shadow-2xl">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#222222] bg-[#161616]">
                <th className="py-3 px-4 text-left text-xs font-bold text-[#e5c158] border-r border-[#222222] w-20">
                  Hora
                </th>
                {daysOfWeek.map((day) => (
                  <th key={day} className="py-3 px-4 text-center text-xs font-bold text-gray-200 border-r border-[#222222]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (
                <tr key={time} className="border-b border-[#1a1a1a] h-12">
                  {/* Celda Hora */}
                  <td className="py-2 px-4 text-xs text-gray-400 font-mono border-r border-[#222222] bg-[#141414] align-top">
                    {time}
                  </td>

                  {/* Celdas Días */}
                  {daysOfWeek.map((day) => {
                    const appt = appointments.find((a) => a.day === day && a.time === time);
                    const isTargetCell = dragOverCell?.day === day && dragOverCell?.time === time;

                    return (
                      <td 
                        key={day} 
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(day, time)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day, time)}
                        className={`p-1 border-r border-[#1a1a1a] relative align-top transition-colors min-h-[48px] ${
                          isTargetCell 
                            ? 'bg-[#1e1a0b] border-2 border-dashed border-[#e5c158]' 
                            : 'hover:bg-[#181818]'
                        }`}
                      >
                        {appt ? (
                          /* Tarjeta de Cita Con Ojo y Papelera */
                          <div 
                            draggable
                            onDragStart={(e) => handleDragStart(e, appt.id)}
                            className="bg-[#18160c] border border-[#d4af37] rounded-lg p-2 text-xs relative shadow-md cursor-grab active:cursor-grabbing hover:border-[#e5c158] transition-all group"
                          >
                            <div className="flex items-center justify-between mb-1 gap-1">
                              <p className="font-bold text-[#e5c158] flex items-center gap-1 truncate">
                                <GripVertical size={12} className="text-gray-500 group-hover:text-[#e5c158] transition-colors flex-shrink-0" />
                                <span className="truncate">{appt.client}</span>
                              </p>
                              
                              {/* Botones de Acción: Ojo y Papelera */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedApptModal(appt); }}
                                  className="text-gray-400 hover:text-[#e5c158] transition-colors p-0.5"
                                  title="Ver servicios y detalles"
                                >
                                  <Eye size={13} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAppt(appt.id); }}
                                  className="text-gray-400 hover:text-red-400 transition-colors p-0.5"
                                  title="Eliminar cita"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            
                            <p className="text-[10px] text-gray-300 my-0.5 pl-3 truncate">{appt.service}</p>
                            <p className="text-[10px] text-gray-400 flex items-center gap-1 pl-3">
                              <Phone size={10} className="text-[#e5c158]" /> {appt.phone}
                            </p>
                          </div>
                        ) : (
                          /* Slot Libre Drop Target */
                          <div className="h-full w-full min-h-[40px] flex items-center justify-center text-[11px] text-gray-700 hover:text-gray-500">
                            + libre
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </main>

      </div>

      {/* 4. MODAL DETALLE DE LA CITA (OJO) */}
      {selectedApptModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#d4af37] rounded-xl w-full max-w-md p-6 shadow-2xl relative text-gray-200">
            {/* Botón cerrar */}
            <button 
              onClick={() => setSelectedApptModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Encabezado Modal */}
            <div className="flex items-center gap-2 mb-5">
              <Scissors className="text-[#e5c158]" size={20} />
              <h3 className="text-base font-bold text-[#e5c158] uppercase tracking-wider">
                Detalle de la Reserva
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              {/* Info Cliente */}
              <div className="bg-[#181818] p-3 rounded-lg border border-[#2a2a2a] flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Cliente</p>
                  <p className="text-sm font-bold text-white mt-0.5">{selectedApptModal.client}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Teléfono</p>
                  <p className="text-xs text-[#e5c158] font-mono mt-0.5">{selectedApptModal.phone}</p>
                </div>
              </div>

              {/* Horario y Duración */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#181818] p-3 rounded-lg border border-[#2a2a2a]">
                  <p className="text-gray-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                    <CalendarIcon size={12} className="text-[#e5c158]" /> Día y Hora
                  </p>
                  <p className="text-xs font-semibold text-gray-200 mt-1">
                    {selectedApptModal.day} - {selectedApptModal.time}
                  </p>
                </div>
                <div className="bg-[#181818] p-3 rounded-lg border border-[#2a2a2a]">
                  <p className="text-gray-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                    <Clock size={12} className="text-[#e5c158]" /> Duración / Importe
                  </p>
                  <p className="text-xs font-semibold text-gray-200 mt-1">
                    {selectedApptModal.duration || '1h 30m'} ({selectedApptModal.price || '85,00 €'})
                  </p>
                </div>
              </div>

              {/* Lista Desglosada de Servicios */}
              <div className="bg-[#181818] p-3 rounded-lg border border-[#2a2a2a]">
                <p className="text-gray-400 text-[10px] uppercase font-semibold mb-2">Servicios Incluidos</p>
                <ul className="space-y-2">
                  {(selectedApptModal.servicesList || [selectedApptModal.service]).map((srv, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
                      <span>{srv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Notas de la Cita */}
              {selectedApptModal.notes && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#2a2a2a]">
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Notas del Estilista / Cliente</p>
                  <p className="text-gray-300 mt-1 italic leading-relaxed">{selectedApptModal.notes}</p>
                </div>
              )}
            </div>

            {/* Acciones de la Modal */}
            <div className="mt-6 flex justify-between items-center pt-4 border-t border-[#222]">
              <button
                onClick={() => {
                  handleDeleteAppt(selectedApptModal.id);
                  setSelectedApptModal(null);
                }}
                className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Eliminar Cita
              </button>
              
              <button
                onClick={() => setSelectedApptModal(null)}
                className="px-4 py-1.5 bg-[#e5c158] hover:bg-[#d4af37] text-black font-semibold rounded-lg text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}