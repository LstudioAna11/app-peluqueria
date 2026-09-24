

// ==========================================
// CONFIGURACIÓN DE L'STUDIO ANA
// ==========================================
const APP_CONFIG = {
  appName: "L'Studio Ana",
  appSubtitle: "Hair Experience"
};

// Interfaz para las citas del calendario
interface Appointment {
  id: string;
  day: string; // 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  time: string; // '09:00', '09:15', etc.
  clientName: string;
  phone: string;
  serviceCategory: string;import React, { useState, useEffect } from 'react';
  serviceSubcategory: string;
}

// Interfaz para el Catálogo Maestro y Dinámico
interface SubService {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  bufferTime: string;
}

interface CatalogCategory {
  id: string;
  code: string;
  title: string;
  subservices: SubService[];
}

// Arquitectura Maestra Inicial de Servicios (Editable y Reordenable)
const INITIAL_CATALOG: CatalogCategory[] = [
  {
    id: 'c1',
    code: '0.1',
    title: 'VISAGISMO & DIAGNÓSTICO',
    subservices: [
      { id: 's1', name: 'DNI Capilar & Estudio Facial', description: 'Análisis minucioso de la salud capilar y proporciones del rostro para visagismo.', duration: '30 min', price: 'Desde 30 €', bufferTime: '10 min prep' }
    ]
  },
  {
    id: 'c2',
    code: '0.2',
    title: 'VISAGISMO & CORTE',
    subservices: [
      { id: 's2', name: 'Corte de Autor & Visagismo', description: 'Corte arquitectónico adaptado a la morfología y estilo de vida.', duration: '60 min', price: 'Desde 45 €', bufferTime: '15 min limpieza' }
    ]
  },
  {
    id: 'c3',
    code: '0.3',
    title: 'STYLING & ACABADO',
    subservices: [
      { id: 's3', name: 'Brushing & Styling de Alta Gama', description: 'Secado y acabado con ondas o pulido perfecto.', duration: '45 min', price: 'Desde 35 €', bufferTime: '10 min prep' }
    ]
  },
  {
    id: 'c4',
    code: '0.4',
    title: 'COLOR ATELIER',
    subservices: [
      { id: 's4', name: 'Coloración Global & Raíces', description: 'Técnica de color de alta precisión con pigmentos de autor.', duration: '90 min', price: 'Desde 55 €', bufferTime: '20 min buffer' }
    ]
  },
  {
    id: 'c5',
    code: '0.5',
    title: 'MÉTODO DE AUTOR & ILUMINACIÓN',
    subservices: [
      { id: 's5', name: 'Balayage & Melt & Lights', description: 'Fundidos de luz tridimensionales personalizados.', duration: '150 min', price: 'Consultar', bufferTime: '20 min prep/limpieza' }
    ]
  },
  {
    id: 'c6',
    code: '0.6',
    title: 'SALUD CAPILAR & RECONSTRUCCIÓN',
    subservices: [
      { id: 's6', name: 'Protocolo Revivre / Reconstrucción', description: 'Tratamiento profundo de nutrición y salud capilar.', duration: '60 min', price: 'Desde 50 €', bufferTime: '15 min buffer' }
    ]
  },
  {
    id: 'c7',
    code: '0.7',
    title: 'TEXTURA & MOLDEADO ORGÁNICO',
    subservices: [
      { id: 's7', name: 'Moldeado u Ondeado Orgánico', description: 'Texturización respetuosa con la fibra capilar.', duration: '120 min', price: 'Desde 80 €', bufferTime: '15 min buffer' }
    ]
  },
  {
    id: 'c8',
    code: '0.8',
    title: 'GROOMING & MAN',
    subservices: [
      { id: 's8', name: 'Corte & Estilismo Masculino', description: 'Corte de precisión y acabado para hombre.', duration: '40 min', price: 'Desde 28 €', bufferTime: '10 min limpieza' }
    ]
  },
  {
    id: 'c9',
    code: '0.9',
    title: 'ADD-ONS & COMPLEMENTOS',
    subservices: [
      { id: 's9', name: 'Gloss / Baño de Brillo Exprés', description: 'Matizador o brillo instantáneo para sellar cutícula.', duration: '20 min', price: 'Desde 20 €', bufferTime: '5 min prep' }
    ]
  }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: '1', day: 'Lunes', time: '10:00', clientName: 'María G.', phone: '600111222', serviceCategory: '0.4 < COLOR ATELIER', serviceSubcategory: 'Coloración Global & Raíces' },
  { id: '2', day: 'Miércoles', time: '11:30', clientName: 'Carmen R.', phone: '611222333', serviceCategory: '0.2 < VISAGISMO & CORTE', serviceSubcategory: 'Corte de Autor & Visagismo' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'clientPin' | 'clientPortal' | 'catalog' | 'adminLogin' | 'adminPanel'>('clientPin');
  
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // Estados Administrador (360studio)
  const [logoClicks, setLogoClicks] = useState<number>(0);
  const [adminPin, setAdminPin] = useState<string>('');
  const [adminError, setAdminError] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<'agenda' | 'config' | 'catalog' | 'tools' | 'clients' | 'crm'>('agenda');

  // Catálogo Maestro sincronizado con localStorage
  const [catalog, setCatalog] = useState<CatalogCategory[]>(() => {
    const saved = localStorage.getItem('lst_master_catalog');
    return saved ? JSON.parse(saved) : INITIAL_CATALOG;
  });

  // Estado para desplegables de categorías en el Catálogo de Clientes y Admin
  const [openCatalogCategories, setOpenCatalogCategories] = useState<{ [key: string]: boolean }>({ c1: true });

  // Estados edición Catálogo en Intranet
  const [editingSubService, setEditingSubService] = useState<{ catId: string; sub: SubService } | null>(null);
  const [isAddingSub, setIsAddingSub] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newSubDur, setNewSubDur] = useState('');
  const [newSubPrice, setNewSubPrice] = useState('');
  const [newSubBuffer, setNewSubBuffer] = useState('');

  // Estados para añadir y editar Categorías Principales
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatTitle, setNewCatTitle] = useState('');

  // KPI y Métricas
  const [appVisitsCount, setAppVisitsCount] = useState<number>(() => {
    const saved = localStorage.getItem('lst_app_visits');
    return saved ? parseInt(saved, 10) : 48;
  });

  const [lostDemandCount, setLostDemandCount] = useState<number>(() => {
    const saved = localStorage.getItem('lst_lost_demand');
    return saved ? parseInt(saved, 10) : 7;
  });

  // Calendario y Citas
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('lst_studio_appointments');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [targetDay, setTargetDay] = useState<string>('');
  const [targetTime, setTargetTime] = useState<string>('');
  const [modalClientName, setModalClientName] = useState<string>('');
  const [modalPhone, setModalPhone] = useState<string>('');
  const [modalCatIndex, setModalCatIndex] = useState<number>(0);
  const [modalSubIndex, setModalSubIndex] = useState<number>(0);

  const [viewApptModal, setViewApptModal] = useState<Appointment | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const checkPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (!checkPWA && /Mobi|Android/i.test(navigator.userAgent)) {
      setShowInstallBanner(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lst_studio_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('lst_master_catalog', JSON.stringify(catalog));
  }, [catalog]);

  useEffect(() => {
    localStorage.setItem('lst_app_visits', appVisitsCount.toString());
  }, [appVisitsCount]);

  useEffect(() => {
    localStorage.setItem('lst_lost_demand', lostDemandCount.toString());
  }, [lostDemandCount]);

  // Teclado PIN Maestro 7009
  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => {
          if (newPin === '7009') {
            setPinError(false);
            setPin('');
            setAppVisitsCount(prev => prev + 1);
            setCurrentScreen('clientPortal');
          } else {
            setPinError(true);
            setPin('');
            setTimeout(() => setPinError(false), 2000);
          }
        }, 300);
      }
    }
  };

  const handleDelete = () => setPin(prev => prev.slice(0, -1));
  const handleClear = () => setPin('');

  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);
    setTimeout(() => setLogoClicks(0), 600);
    if (newClicks === 2) {
      setLogoClicks(0);
      setAdminPin('');
      setAdminError(false);
      setCurrentScreen('adminLogin');
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '0000') {
      setCurrentScreen('adminPanel');
    } else {
      setAdminError(true);
      setAdminPin('');
    }
  };

  const handleCellClick = (day: string, time: string) => {
    setTargetDay(day);
    setTargetTime(time);
    setModalClientName('');
    setModalPhone('');
    setModalCatIndex(0);
    setModalSubIndex(0);
    setIsModalOpen(true);
  };

  const handleSaveModalAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClientName.trim()) return;

    const selectedCategory = catalog[modalCatIndex];
    const selectedSub = selectedCategory?.subservices[modalSubIndex] || { name: 'Servicio general' };

    const newApp: Appointment = {
      id: Date.now().toString(),
      day: targetDay,
      time: targetTime,
      clientName: modalClientName,
      phone: modalPhone || 'No facilitado',
      serviceCategory: `${selectedCategory.code} < ${selectedCategory.title}`,
      serviceSubcategory: selectedSub.name
    };

    setAppointments([...appointments, newApp]);
    setIsModalOpen(false);
  };

  const handleDeleteAppointment = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('¿Deseas eliminar esta cita de la agenda?')) {
      setAppointments(appointments.filter(a => a.id !== id));
    }
  };

  // Funciones de gestión de Categorías Principales (Mover, Editar, Añadir, Eliminar)
  const handleMoveCategory = (index: number, direction: number) => {
    const newCatalog = [...catalog];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newCatalog.length) return;

    const temp = newCatalog[index];
    newCatalog[index] = newCatalog[targetIndex];
    newCatalog[targetIndex] = temp;
    setCatalog(newCatalog);
  };

  const handleUpdateCategoryTitle = (catId: string, newTitle: string) => {
    setCatalog(catalog.map(cat => cat.id === catId ? { ...cat, title: newTitle } : cat));
  };

  const handleUpdateCategoryCode = (catId: string, newCode: string) => {
    setCatalog(catalog.map(cat => cat.id === catId ? { ...cat, code: newCode } : cat));
  };

  const handleDeleteCategory = (catId: string) => {
    if (confirm('¿Estás segura de eliminar esta categoría principal y todos sus servicios asociados?')) {
      setCatalog(catalog.filter(cat => cat.id !== catId));
    }
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitle.trim() || !newCatCode.trim()) return;

    const newCategory: CatalogCategory = {
      id: Date.now().toString(),
      code: newCatCode.trim(),
      title: newCatTitle.trim().toUpperCase(),
      subservices: []
    };

    setCatalog([...catalog, newCategory]);
    setIsAddingCategory(false);
    setNewCatCode('');
    setNewCatTitle('');
  };

  // Funciones de gestión de subcategorías ilimitadas en el Catálogo Maestro
  const handleAddSubserviceSubmit = (catId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const newSub: SubService = {
      id: Date.now().toString(),
      name: newSubName,
      description: newSubDesc || 'Sin descripción detallada.',
      duration: newSubDur || '45 min',
      price: newSubPrice || 'Consultar',
      bufferTime: newSubBuffer || '10 min buffer'
    };

    setCatalog(catalog.map(cat => {
      if (cat.id === catId) {
        return { ...cat, subservices: [...cat.subservices, newSub] };
      }
      return cat;
    }));

    setIsAddingSub(null);
    setNewSubName('');
    setNewSubDesc('');
    setNewSubDur('');
    setNewSubPrice('');
    setNewSubBuffer('');
  };

  const handleDeleteSubservice = (catId: string, subId: string) => {
    if (confirm('¿Eliminar este servicio del catálogo?')) {
      setCatalog(catalog.map(cat => {
        if (cat.id === catId) {
          return { ...cat, subservices: cat.subservices.filter(s => s.id !== subId) };
        }
        return cat;
      }));
    }
  };

  const hoursList = [
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00', '19:15', '19:30', '19:45',
    '20:00'
  ];

  const daysList = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', margin: 0, padding: '20px' }}>
      
      {/* 1. ACCESO PIN MAESTRO (7009) */}
      {currentScreen === 'clientPin' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '320px', width: '100%' }}>
          
          <div 
            onClick={handleLogoClick}
            style={{ textAlign: 'center', marginBottom: '30px', cursor: 'pointer', userSelect: 'none' }}
            title="L'Studio Ana"
          >
            <h1 style={{ color: '#d4af37', fontSize: '24px', letterSpacing: '4px', margin: '0 0 5px 0', fontFamily: 'serif' }}>L ' A</h1>
            <p style={{ color: '#888888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '3px', margin: 0 }}>{APP_CONFIG.appSubtitle}</p>
          </div>

          <p style={{ color: pinError ? '#ff4444' : '#cccccc', fontSize: '14px', marginBottom: '20px', letterSpacing: '1px', textAlign: 'center' }}>
            {pinError ? 'PIN incorrecto (Prueba 7009)' : 'Introduce tu PIN de acceso'}
          </p>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '35px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: pinError ? '1px solid #ff4444' : '1px solid #d4af37',
                backgroundColor: i < pin.length ? (pinError ? '#ff4444' : '#d4af37') : '#121212',
                boxShadow: i < pin.length ? '0 0 10px rgba(212,175,55,0.6)' : 'none'
              }} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', width: '100%', marginBottom: '25px' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                style={{
                  width: '65px', height: '65px', borderRadius: '50%',
                  backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)',
                  color: '#ffffff', fontSize: '20px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'
                }}
              >
                {num}
              </button>
            ))}

            <button onClick={handleClear} style={{ width: '65px', height: '65px', borderRadius: '50%', backgroundColor: '#141414', border: '1px solid #333', color: '#888', fontSize: '16px', cursor: 'pointer', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <button onClick={() => handleNumberClick('0')} style={{ width: '65px', height: '65px', borderRadius: '50%', backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', color: '#ffffff', fontSize: '20px', cursor: 'pointer', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>0</button>
            <button onClick={handleDelete} style={{ width: '65px', height: '65px', borderRadius: '50%', backgroundColor: '#141414', border: '1px solid #333', color: '#888', fontSize: '16px', cursor: 'pointer', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          </div>

          {showInstallBanner && (
            <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
              <p style={{ color: '#d4af37', fontSize: '11px', margin: '0 0 5px 0', fontWeight: 'bold' }}>📱 Instala la App</p>
              <p style={{ color: '#aaa', fontSize: '10px', margin: 0 }}>Añade a la pantalla de inicio de tu móvil.</p>
            </div>
          )}
        </div>
      )}

      {/* 2. PORTAL DE CLIENTE EXCLUSIVO */}
      {currentScreen === 'clientPortal' && (
        <div style={{ maxWidth: '600px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '30px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px', marginBottom: '25px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>L ' A</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Portal Privado de Clientas</p>
            </div>
            <button onClick={() => { setPin(''); setCurrentScreen('clientPin'); }} style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              Salir
            </button>
          </div>

          <div style={{ textAlign: 'center', padding: '35px 20px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px dashed rgba(212,175,55,0.3)', marginBottom: '20px' }}>
            <p style={{ color: '#d4af37', fontSize: '14px', fontFamily: 'serif', margin: '0 0 5px 0' }}>Espacio reservado para la fotografía de L'Studio Ana</p>
            <p style={{ color: '#777', fontSize: '11px', margin: 0 }}>Salud capilar y visagism de autor en Elche</p>
          </div>

          <h1 style={{ fontSize: '22px', fontFamily: 'serif', color: '#fff', marginBottom: '15px' }}>
            Bienvenida a L'Studio Ana
          </h1>
          <p style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.6', marginBottom: '25px' }}>
            Más de 25 años dedicados al cuidado de la salud capilar y la estética del cabello. Este es tu espacio exclusivo para consultar servicios, tratamientos personalizados y recomendaciones de autor.
          </p>

          <button
            onClick={() => setCurrentScreen('catalog')}
            style={{ width: '100%', backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', letterSpacing: '1px' }}
          >
            Ver Catálogo de Servicios →
          </button>
        </div>
      )}

      {/* 2.1. CATÁLOGO DE CLIENTES (ARQUITECTURA DINÁMICA CON DESPLEGABLES) */}
      {currentScreen === 'catalog' && (
        <div style={{ maxWidth: '750px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '30px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px', marginBottom: '25px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>L ' A</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Catálogo de Autor</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPortal')} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              ← Volver al Portal
            </button>
          </div>

          <h1 style={{ fontSize: '20px', fontFamily: 'serif', color: '#fff', marginBottom: '8px' }}>Arquitectura de Servicios</h1>
          <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '25px' }}>Selecciona una categoría para ver los tratamientos disponibles con su definición, duración y precios.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
            {catalog.map((cat) => {
              const isOpen = openCatalogCategories[cat.id];
              return (
                <div key={cat.id} style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setOpenCatalogCategories({ ...openCatalogCategories, [cat.id]: !isOpen })}
                    style={{ padding: '15px 18px', backgroundColor: '#1c1c1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <span style={{ color: '#d4af37', fontSize: '13px', fontFamily: 'serif', fontWeight: 'bold', letterSpacing: '1px' }}>
                      {cat.code} &lt; {cat.title}
                    </span>
                    <span style={{ color: '#d4af37', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {isOpen && (
                    <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                      {cat.subservices.length === 0 ? (
                        <p style={{ color: '#777', fontSize: '11px', fontStyle: 'italic', margin: 0 }}>No hay servicios en esta categoría todavía.</p>
                      ) : (
                        cat.subservices.map((sub) => (
                          <div key={sub.id} style={{ backgroundColor: '#141414', border: '1px solid #333', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ color: '#fff', fontSize: '13px', margin: '0 0 4px 0', fontWeight: 'bold' }}>{sub.name}</h4>
                              <p style={{ color: '#bbb', fontSize: '11px', margin: '0 0 8px 0', lineHeight: '1.4' }}>{sub.description}</p>
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '10px', color: '#888' }}>
                                <span style={{ backgroundColor: '#1e1e1e', padding: '2px 6px', borderRadius: '4px' }}>⏱️ {sub.duration}</span>
                                <span style={{ backgroundColor: '#1e1e1e', padding: '2px 6px', borderRadius: '4px' }}>🛠️ Buffer: {sub.bufferTime}</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                              <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>{sub.price}</span>
                              <button
                                onClick={() => alert(`Solicitar cita para: ${sub.name}`)}
                                style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                              >
                                Reservar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentScreen('clientPortal')}
            style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #444', color: '#ccc', padding: '12px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}
          >
            ← Volver al Portal Privado
          </button>
        </div>
      )}

      {/* 3. INTRANET ADMIN LOGIN */}
      {currentScreen === 'adminLogin' && (
        <div style={{ maxWidth: '360px', width: '100%', backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '16px', padding: '35px', boxSizing: 'border-box', textAlign: 'center' }}>
          <h2 style={{ color: '#d4af37', fontSize: '20px', letterSpacing: '3px', margin: '0 0 5px 0', fontFamily: 'serif' }}>360STUDIO</h2>
          <p style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '30px' }}>Intranet Privada de Ana</p>

          <form onSubmit={handleAdminLoginSubmit}>
            <input
              type="password"
              maxLength={4}
              autoFocus
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="••••"
              style={{ width: '100%', padding: '14px', backgroundColor: '#000', border: adminError ? '1px solid #ff4444' : '1px solid rgba(212,175,55,0.5)', borderRadius: '8px', color: '#fff', fontSize: '24px', textAlign: 'center', letterSpacing: '12px', boxSizing: 'border-box', marginBottom: '15px', outline: 'none' }}
            />
            {adminError && <p style={{ color: '#ff4444', fontSize: '11px', marginBottom: '15px' }}>PIN incorrecto.</p>}
            <button type="submit" style={{ width: '100%', backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginBottom: '15px' }}>Entrar a Intranet</button>
            <button type="button" onClick={() => setCurrentScreen('clientPin')} style={{ background: 'none', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer' }}>← Volver</button>
          </form>
        </div>
      )}

      {/* 4. PANEL ADMIN MULTIBLOQUE (360STUDIO) */}
      {currentScreen === 'adminPanel' && (
        <div style={{ maxWidth: '1150px', width: '100%', backgroundColor: '#121212', border: '1px solid #d4af37', borderRadius: '16px', padding: '25px', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #d4af37', paddingBottom: '15px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>360STUDIO — PANEL DE GESTIÓN</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>L'Studio Ana · Elche</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPin')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar Sesión</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px' }}>
            {[
              { id: 'agenda', label: '📅 Agenda' },
              { id: 'config', label: '⚙️ Configuración Negocio' },
              { id: 'catalog', label: '🏷️ Catálogo Maestro' },
              { id: 'tools', label: '🛠️ Herramientas' },
              { id: 'clients', label: '👥 Base de Clientes' },
              { id: 'crm', label: '📊 CRM / KPIs' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as any)}
                style={{
                  backgroundColor: adminTab === tab.id ? '#d4af37' : '#181818',
                  color: adminTab === tab.id ? '#000' : '#ccc',
                  border: adminTab === tab.id ? 'none' : '1px solid rgba(212,175,55,0.3)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* BLOQUE 1: AGENDA SEMANAL INTERACTIVA (CADA 15 MIN) */}
          {adminTab === 'agenda' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ color: '#aaa', fontSize: '12px', margin: 0 }}>Pulsa directamente sobre cualquier hora libre de la semana para abrir el asistente de nueva cita.</p>
                <span style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>Vista Semanal (Lunes a Sábado)</span>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '480px', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', backgroundColor: '#141414' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #d4af37', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '10px', color: '#d4af37', width: '70px', borderRight: '1px solid #333', textAlign: 'center' }}>Hora</th>
                      {daysList.map(day => (
                        <th key={day} style={{ padding: '10px', color: '#fff', borderRight: '1px solid #333', textAlign: 'center', fontFamily: 'serif', fontSize: '13px' }}>{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hoursList.map((time, idx) => (
                      <tr key={time} style={{ borderBottom: '1px solid #222', backgroundColor: idx % 2 === 0 ? '#141414' : '#171717' }}>
                        <td style={{ padding: '8px', color: '#888', borderRight: '1px solid #333', textAlign: 'center', fontWeight: 'bold', fontSize: '10px' }}>{time}</td>
                        {daysList.map(day => {
                          const appt = appointments.find(a => a.day === day && a.time === time);
                          return (
                            <td 
                              key={day} 
                              onClick={() => !appt && handleCellClick(day, time)}
                              style={{ 
                                padding: '6px', 
                                borderRight: '1px solid #222', 
                                verticalAlign: 'top', 
                                height: '35px', 
                                minWidth: '130px',
                                cursor: appt ? 'default' : 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => { if (!appt) e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.08)'; }}
                              onMouseLeave={(e) => { if (!appt) e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              {appt ? (
                                <div style={{ backgroundColor: 'rgba(212,175,55,0.15)', border: '1px solid #d4af37', borderRadius: '6px', padding: '6px', position: 'relative' }}>
                                  <p style={{ color: '#d4af37', fontWeight: 'bold', margin: '0 0 2px 0', fontSize: '11px', paddingRight: '35px' }}>{appt.clientName}</p>
                                  <p style={{ color: '#ccc', margin: 0, fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.serviceSubcategory}</p>
                                  
                                  <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '4px' }}>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setViewApptModal(appt); }}
                                      style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                                      title="Ver detalles"
                                    >
                                      👁️
                                    </button>
                                    <button 
                                      onClick={(e) => handleDeleteAppointment(appt.id, e)}
                                      style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                                      title="Eliminar cita"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ color: '#333', fontSize: '9px', textAlign: 'center', paddingTop: '8px', userSelect: 'none' }}>+</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BLOQUE 2: CONFIGURACIÓN NEGOCIO */}
          {adminTab === 'config' && (
            <div style={{ backgroundColor: '#181818', padding: '20px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.3)' }}>
              <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', marginTop: 0 }}>Configuración de L'Studio Ana</h3>
              <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '20px' }}>Parámetros operativos generales del salón en Elche.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', color: '#ccc', fontSize: '11px', marginBottom: '5px' }}>Nombre del Negocio</label>
                  <input type="text" defaultValue="L'Studio Ana" style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#ccc', fontSize: '11px', marginBottom: '5px' }}>PIN Maestro de Acceso Clientas</label>
                  <input type="text" defaultValue="7009" style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
                </div>
              </div>
              <button onClick={() => alert('¡Configuración guardada correctamente!')} style={{ marginTop: '20px', backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Guardar Cambios</button>
            </div>
          )}

          {/* BLOQUE 3: CATÁLOGO MAESTRO (CATEGORÍAS PRINCIPALES Y SUBCATEGORÍAS EDITABLES Y REORDENABLES) */}
          {adminTab === 'catalog' && (
            <div style={{ backgroundColor: '#181818', padding: '20px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: '0 0 3px 0' }}>Catálogo Maestro (Intranet de Edición)</h3>
                  <p style={{ color: '#aaa', fontSize: '12px', margin: 0 }}>Edita títulos, mueve de lugar, añade nuevas categorías principales o subcategorías ilimitadas.</p>
                </div>
                <button
                  onClick={() => setIsAddingCategory(true)}
                  style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  + Nueva Categoría Principal
                </button>
              </div>

              {/* Formulario para añadir nueva categoría principal */}
              {isAddingCategory && (
                <form onSubmit={handleAddCategorySubmit} style={{ backgroundColor: '#141414', border: '1px dashed #d4af37', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                  <p style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Añadir Nueva Categoría Principal</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input type="text" placeholder="Código (Ej. 0.10)" value={newCatCode} onChange={e => setNewCatCode(e.target.value)} style={{ padding: '8px', backgroundColor: '#000', border: '1px solid #444', color: '#fff', fontSize: '11px', borderRadius: '4px' }} required />
                    <input type="text" placeholder="Título de la Categoría Principal" value={newCatTitle} onChange={e => setNewCatTitle(e.target.value)} style={{ padding: '8px', backgroundColor: '#000', border: '1px solid #444', color: '#fff', fontSize: '11px', borderRadius: '4px' }} required />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Crear Categoría</button>
                    <button type="button" onClick={() => setIsAddingCategory(false)} style={{ backgroundColor: '#333', color: '#ccc', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button>
                  </div>
                </form>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {catalog.map((cat, catIdx) => (
                  <div key={cat.id} style={{ backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '15px' }}>
                    
                    {/* Cabecera de Categoría Principal con controles de edición y movimiento */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '250px' }}>
                        <input
                          type="text"
                          value={cat.code}
                          onChange={(e) => handleUpdateCategoryCode(cat.id, e.target.value)}
                          style={{ width: '55px', padding: '6px', backgroundColor: '#000', border: '1px solid #444', color: '#d4af37', fontSize: '12px', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}
                          title="Editar código"
                        />
                        <input
                          type="text"
                          value={cat.title}
                          onChange={(e) => handleUpdateCategoryTitle(cat.id, e.target.value)}
                          style={{ flex: 1, padding: '6px', backgroundColor: '#000', border: '1px solid #444', color: '#fff', fontSize: '12px', borderRadius: '4px', fontWeight: 'bold', fontFamily: 'serif' }}
                          title="Editar título"
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleMoveCategory(catIdx, -1)}
                          disabled={catIdx === 0}
                          style={{ backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', opacity: catIdx === 0 ? 0.3 : 1 }}
                          title="Mover arriba"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveCategory(catIdx, 1)}
                          disabled={catIdx === catalog.length - 1}
                          style={{ backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', opacity: catIdx === catalog.length - 1 ? 0.3 : 1 }}
                          title="Mover abajo"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          style={{ backgroundColor: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                          title="Eliminar categoría principal"
                        >
                          🗑️
                        </button>
                        <button
                          onClick={() => setIsAddingSub(cat.id)}
                          style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', marginLeft: '6px' }}
                        >
                          + Subcategoría
                        </button>
                      </div>
                    </div>

                    {/* Formulario rápido para añadir subcategoría */}
                    {isAddingSub === cat.id && (
                      <form onSubmit={(e) => handleAddSubserviceSubmit(cat.id, e)} style={{ backgroundColor: '#1c1c1c', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px dashed #d4af37' }}>
                        <p style={{ color: '#d4af37', fontSize: '11px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Nueva subcategoría para {cat.title}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <input type="text" placeholder="Nombre del servicio *" value={newSubName} onChange={e => setNewSubName(e.target.value)} style={{ padding: '8px', backgroundColor: '#000', border: '1px solid #444', color: '#fff', fontSize: '11px', borderRadius: '4px' }} required />
                          <input type="text" placeholder="Precio (Ej. Desde 40 € / Consultar)" value={newSubPrice} onChange={e => setNewSubPrice(e.target.value)} style={{ padding: '8px', backgroundColor: '#000', border: '1px solid #444', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
                          <input type="text" placeholder="Duración (Ej. 45 min)" value={newSubDur} onChange={e => setNewSubDur(e.target.value)} style={{ padding: '8px', backgroundColor: '#000', border: '1px solid #444', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
                          <input type="text" placeholder="Buffer prep/limpieza (Ej. 10 min)" value={newSubBuffer} onChange={e => setNewSubBuffer(e.target.value)} style={{ padding: '8px', backgroundColor: '#000', border: '1px solid #444', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
                        </div>
                        <textarea placeholder="Definición clara del servicio..." value={newSubDesc} onChange={e => setNewSubDesc(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#000', border: '1px solid #444', color: '#fff', fontSize: '11px', borderRadius: '4px', marginBottom: '8px', boxSizing: 'border-box' }} rows={2}></textarea>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar</button>
                          <button type="button" onClick={() => setIsAddingSub(null)} style={{ backgroundColor: '#333', color: '#ccc', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                      </form>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {cat.subservices.map(sub => (
                        <div key={sub.id} style={{ backgroundColor: '#101010', border: '1px solid #2a2a2a', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px', margin: '0 0 2px 0' }}>{sub.name}</p>
                            <p style={{ color: '#aaa', fontSize: '11px', margin: '0 0 4px 0' }}>{sub.description}</p>
                            <p style={{ color: '#888', fontSize: '10px', margin: 0 }}>⏱️ {sub.duration} | 🛠️ {sub.bufferTime} | <span style={{ color: '#d4af37' }}>{sub.price}</span></p>
                          </div>
                          <button onClick={() => handleDeleteSubservice(cat.id, sub.id)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '12px', cursor: 'pointer' }} title="Eliminar servicio">🗑️</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BLOQUE 4: HERRAMIENTAS */}
          {adminTab === 'tools' && (
            <div style={{ backgroundColor: '#181818', padding: '20px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.3)' }}>
              <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', marginTop: 0 }}>Herramientas y Micro-Apps del Salón</h3>
              <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '20px' }}>Accesos rápidos a utilidades de diagnóstico y gestión.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div style={{ backgroundColor: '#141414', border: '1px solid #333', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '13px', margin: '0 0 5px 0' }}>DNI Capilar</p>
                  <p style={{ color: '#888', fontSize: '10px', margin: '0 0 10px 0' }}>Diagnóstico avanzado de salud capilar</p>
                  <button onClick={() => alert('Abriendo herramienta DNI Capilar...')} style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Abrir</button>
                </div>
                <div style={{ backgroundColor: '#141414', border: '1px solid #333', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '13px', margin: '0 0 5px 0' }}>Visagismo Facial</p>
                  <p style={{ color: '#888', fontSize: '10px', margin: '0 0 10px 0' }}>Estudio de proporciones y corte</p>
                  <button onClick={() => alert('Abriendo herramienta Visagismo...')} style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Abrir</button>
                </div>
                <div style={{ backgroundColor: '#141414', border: '1px solid #333', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '13px', margin: '0 0 5px 0' }}>Protocolo Color</p>
                  <p style={{ color: '#888', fontSize: '10px', margin: '0 0 10px 0' }}>Fórmulas y mantenimiento mechas</p>
                  <button onClick={() => alert('Abriendo protocolo de color...')} style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Abrir</button>
                </div>
              </div>
            </div>
          )}

          {/* BLOQUE 5: BASE DE CLIENTES */}
          {adminTab === 'clients' && (
            <div style={{ backgroundColor: '#181818', padding: '20px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.3)' }}>
              <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', marginTop: 0 }}>Base de Datos de Clientas</h3>
              <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '20px' }}>Historial y registros frecuentes en el salón.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { name: 'María G.', phone: '600111222', visits: '12 visitas', last: 'Coloración Global' },
                  { name: 'Carmen R.', phone: '611222333', visits: '8 visitas', last: 'Corte de Autor' },
                ].map((c, i) => (
                  <div key={i} style={{ backgroundColor: '#141414', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333' }}>
                    <div>
                      <p style={{ color: '#d4af37', fontWeight: 'bold', margin: '0 0 3px 0', fontSize: '12px' }}>{c.name} <span style={{ color: '#888', fontWeight: 'normal', fontSize: '10px' }}>({c.phone})</span></p>
                      <p style={{ color: '#aaa', margin: 0, fontSize: '10px' }}>Último servicio: {c.last}</p>
                    </div>
                    <span style={{ backgroundColor: 'rgba(212,175,55,0.1)', color: '#d4af37', padding: '4px 10px', borderRadius: '12px', fontSize: '10px' }}>{c.visits}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BLOQUE 6: CRM / KPIS */}
          {adminTab === 'crm' && (
            <div style={{ backgroundColor: '#181818', padding: '20px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.3)' }}>
              <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', marginTop: 0 }}>CRM & KPIs de Rendimiento</h3>
              <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '20px' }}>Métricas clave sobre uso de la app y demanda en L'Studio Ana.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <div style={{ backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px 0' }}>Clientas que Agendan / Entran en la App</p>
                  <p style={{ color: '#d4af37', fontSize: '32px', fontFamily: 'serif', fontWeight: 'bold', margin: '0 0 8px 0' }}>{appVisitsCount}</p>
                  <p style={{ color: '#666', fontSize: '10px', margin: 0 }}>Accesos totales validados con PIN maestro</p>
                </div>

                <div style={{ backgroundColor: '#141414', border: '1px solid rgba(255,68,68,0.4)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px 0' }}>Demanda Perdida (Sin Disponibilidad)</p>
                  <p style={{ color: '#ff4444', fontSize: '32px', fontFamily: 'serif', fontWeight: 'bold', margin: '0 0 8px 0' }}>{lostDemandCount}</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                    <button onClick={() => setLostDemandCount(prev => prev + 1)} style={{ backgroundColor: '#ff4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Registrar Baja</button>
                    <button onClick={() => setLostDemandCount(prev => Math.max(0, prev - 1))} style={{ backgroundColor: '#333', color: '#ccc', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>- Reducir</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: AÑADIR CITA */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '16px', maxWidth: '450px', width: '100%', padding: '25px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.3)', paddingBottom: '12px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: '0 0 2px 0' }}>Nueva Cita</h3>
                <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>{targetDay} a las {targetTime}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveModalAppointment}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '11px', marginBottom: '5px' }}>Nombre y Apellidos *</label>
                <input
                  type="text"
                  placeholder="Ej. María Gómez"
                  value={modalClientName}
                  onChange={(e) => setModalClientName(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '11px', marginBottom: '5px' }}>Teléfono</label>
                <input
                  type="tel"
                  placeholder="Ej. 600000000"
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '11px', marginBottom: '5px' }}>Categoría Principal</label>
                <select
                  value={modalCatIndex}
                  onChange={(e) => {
                    setModalCatIndex(Number(e.target.value));
                    setModalSubIndex(0);
                  }}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                >
                  {catalog.map((cat, idx) => (
                    <option key={cat.id} value={idx}>{cat.code} &lt; {cat.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '11px', marginBottom: '5px' }}>Subcategoría / Tratamiento</label>
                <select
                  value={modalSubIndex}
                  onChange={(e) => setModalSubIndex(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                >
                  {catalog[modalCatIndex]?.subservices.map((sub, idx) => (
                    <option key={sub.id} value={idx}>{sub.name} ({sub.price})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, backgroundColor: '#1a1a1a', border: '1px solid #444', color: '#ccc', padding: '12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Guardar Cita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VER DETALLES DE CITA */}
      {viewApptModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '25px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.3)', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: 0 }}>Detalles de la Cita</h3>
              <button onClick={() => setViewApptModal(null)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px', fontSize: '13px' }}>
              <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '8px' }}>
                <p style={{ color: '#888', fontSize: '10px', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Clienta</p>
                <p style={{ color: '#fff', fontWeight: 'bold', margin: 0 }}>{viewApptModal.clientName}</p>
              </div>
              <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '8px' }}>
                <p style={{ color: '#888', fontSize: '10px', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Teléfono de Contacto</p>
                <p style={{ color: '#fff', margin: 0 }}>{viewApptModal.phone}</p>
              </div>
              <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '8px' }}>
                <p style={{ color: '#888', fontSize: '10px', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Horario</p>
                <p style={{ color: '#d4af37', fontWeight: 'bold', margin: 0 }}>{viewApptModal.day} a las {viewApptModal.time}</p>
              </div>
              <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '8px' }}>
                <p style={{ color: '#888', fontSize: '10px', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Servicio Seleccionado</p>
                <p style={{ color: '#fff', margin: '0 0 3px 0', fontWeight: 'bold' }}>{viewApptModal.serviceCategory}</p>
                <p style={{ color: '#aaa', margin: 0, fontSize: '11px' }}>{viewApptModal.serviceSubcategory}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { handleDeleteAppointment(viewApptModal.id); setViewApptModal(null); }} style={{ flex: 1, backgroundColor: 'rgba(255,68,68,0.15)', border: '1px solid #ff4444', color: '#ff4444', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Eliminar Cita 🗑️</button>
              <button onClick={() => setViewApptModal(null)} style={{ flex: 1, backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}