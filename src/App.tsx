import React, { useState, useEffect } from 'react';

// ==========================================
// CONFIGURACIÓN DE L'STUDIO ANA
// ==========================================
interface BusinessConfig {
  name: string;
  subtitle: string;
  location: string;
  phone: string;
  description: string;
  scheduleMonday: string;
  scheduleTueWed: string;
  scheduleThuFri: string;
  scheduleSaturday: string;
  welcomeMessage: string;
  masterPin: string;
}

const INITIAL_BUSINESS_CONFIG: BusinessConfig = {
  name: "L'Studio Ana",
  subtitle: "Hair Experience",
  location: "Centro de Elche, Alicante",
  phone: "600000000",
  description: "Más de 25 años dedicados al cuidado de la salud capilar y la estética del cabello de autor en el centro de Elche.",
  scheduleMonday: "10H A 13:30H",
  scheduleTueWed: "10h a 18h",
  scheduleThuFri: "10 A 19H",
  scheduleSaturday: "Cita previa / Turno especial consultorio",
  welcomeMessage: "Bienvenida a tu espacio exclusivo de salud capilar y visagismo de autor.",
  masterPin: "7009"
};

interface Appointment {
  id: string;
  day: string;
  time: string;
  clientName: string;
  phone: string;
  serviceCategory: string;
  serviceSubcategory: string;
}

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

  // Pestañas internas de Configuración
  const [configSubTab, setConfigSubTab] = useState<'general' | 'schedule' | 'branding'>('general');

  // Configuración de Negocio
  const [bizConfig, setBizConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem('lst_business_config');
    return saved ? JSON.parse(saved) : INITIAL_BUSINESS_CONFIG;
  });

  // Catálogo Maestro
  const [catalog, setCatalog] = useState<CatalogCategory[]>(() => {
    const saved = localStorage.getItem('lst_master_catalog');
    return saved ? JSON.parse(saved) : INITIAL_CATALOG;
  });

  const [openCatalogCategories, setOpenCatalogCategories] = useState<{ [key: string]: boolean }>({ c1: true });

  // Edición de Catálogo
  const [isAddingSub, setIsAddingSub] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newSubDur, setNewSubDur] = useState('');
  const [newSubPrice, setNewSubPrice] = useState('');
  const [newSubBuffer, setNewSubBuffer] = useState('');

  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatTitle, setNewCatTitle] = useState('');

  // KPIs
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

  // Estados para Mini-Calendario Lateral Integrado
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date(2026, 8, 24)); // Sep 2026
  const [mesNavegacion, setMesNavegacion] = useState<Date>(new Date(2026, 8, 1));

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
    localStorage.setItem('lst_business_config', JSON.stringify(bizConfig));
  }, [bizConfig]);

  useEffect(() => {
    localStorage.setItem('lst_app_visits', appVisitsCount.toString());
  }, [appVisitsCount]);

  useEffect(() => {
    localStorage.setItem('lst_lost_demand', lostDemandCount.toString());
  }, [lostDemandCount]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => {
          if (newPin === bizConfig.masterPin) {
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
    const existing = appointments.find(a => a.day === day && a.time === time);
    if (existing) {
      setViewApptModal(existing);
      return;
    }
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
      if (viewApptModal?.id === id) setViewApptModal(null);
    }
  };

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

  // Lógica para renderizar Mini-Calendario en la Agenda
  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const cambiarMesMiniCal = (delta: number) => {
    setMesNavegacion(new Date(mesNavegacion.getFullYear(), mesNavegacion.getMonth() + delta, 1));
  };
  const añoMini = mesNavegacion.getFullYear();
  const mesMini = mesNavegacion.getMonth();
  const primerDiaMes = new Date(añoMini, mesMini, 1).getDay();
  const diaInicio = primerDiaMes === 0 ? 6 : primerDiaMes - 1;
  const diasEnMes = new Date(añoMini, mesMini + 1, 0).getDate();

  const diasRejillaMini = [];
  for (let i = 0; i < diaInicio; i++) diasRejillaMini.push(null);
  for (let d = 1; d <= diasEnMes; d++) diasRejillaMini.push(new Date(añoMini, mesMini, d));

  const hoursList = [
    '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30'
  ];

  const daysList = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', margin: 0, padding: '20px' }}>
      
      {/* 1. ACCESO PIN CLIENTE */}
      {currentScreen === 'clientPin' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '320px', width: '100%' }}>
          
          <div 
            onClick={handleLogoClick}
            style={{ textAlign: 'center', marginBottom: '30px', cursor: 'pointer', userSelect: 'none' }}
            title="L'Studio Ana"
          >
            <h1 style={{ color: '#d4af37', fontSize: '26px', letterSpacing: '4px', margin: '0 0 5px 0', fontFamily: 'serif' }}>L ' A</h1>
            <p style={{ color: '#888888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '3px', margin: 0 }}>{bizConfig.subtitle}</p>
          </div>

          <p style={{ color: pinError ? '#ff4444' : '#cccccc', fontSize: '14px', marginBottom: '20px', letterSpacing: '1px', textAlign: 'center' }}>
            {pinError ? `PIN incorrecto` : 'Introduce tu PIN de acceso'}
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

      {/* 2. PORTAL CLIENTE */}
      {currentScreen === 'clientPortal' && (
        <div style={{ maxWidth: '600px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '30px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px', marginBottom: '25px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>{bizConfig.name}</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Portal Privado de Clientas</p>
            </div>
            <button onClick={() => { setPin(''); setCurrentScreen('clientPin'); }} style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              Salir
            </button>
          </div>

          <div style={{ textAlign: 'center', padding: '35px 20px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px dashed rgba(212,175,55,0.3)', marginBottom: '20px' }}>
            <p style={{ color: '#d4af37', fontSize: '14px', fontFamily: 'serif', margin: '0 0 5px 0' }}>Espacio reservado para la fotografía de {bizConfig.name}</p>
            <p style={{ color: '#777', fontSize: '11px', margin: 0 }}>{bizConfig.location} — {bizConfig.phone}</p>
          </div>

          <h1 style={{ fontSize: '22px', fontFamily: 'serif', color: '#fff', marginBottom: '15px' }}>
            {bizConfig.welcomeMessage}
          </h1>
          <p style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
            {bizConfig.description}
          </p>

          <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold', fontFamily: 'serif', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '6px' }}>
              🕒 Horarios del Salón:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
              <span style={{ color: '#aaa' }}>LUNES:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{bizConfig.scheduleMonday}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
              <span style={{ color: '#aaa' }}>MARTES Y MIÉRCOLES:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{bizConfig.scheduleTueWed}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
              <span style={{ color: '#aaa' }}>JUEVES Y VIERNES:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{bizConfig.scheduleThuFri}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
              <span style={{ color: '#aaa' }}>SÁBADOS:</span>
              <span style={{ color: '#d4af37', fontStyle: 'italic', textAlign: 'right' }}>{bizConfig.scheduleSaturday}</span>
            </div>
          </div>

          <button
            onClick={() => setCurrentScreen('catalog')}
            style={{ width: '100%', backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', letterSpacing: '1px' }}
          >
            Ver Catálogo de Servicios →
          </button>
        </div>
      )}

      {/* 2.1. CATÁLOGO DE CLIENTES */}
      {currentScreen === 'catalog' && (
        <div style={{ maxWidth: '750px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '30px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px', marginBottom: '25px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>{bizConfig.name}</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Catálogo de Autor</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPortal')} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              ← Volver
            </button>
          </div>

          <h1 style={{ fontSize: '20px', fontFamily: 'serif', color: '#fff', marginBottom: '8px' }}>Arquitectura de Servicios</h1>
          <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '25px' }}>Explora los tratamientos disponibles, sus duraciones y precios.</p>

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
                        <p style={{ color: '#777', fontSize: '11px', fontStyle: 'italic', margin: 0 }}>Sin servicios en esta categoría.</p>
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
                              <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '12px' }}>{sub.price}</span>
                              <button
                                onClick={() => {
                                  const text = encodeURIComponent(`Hola Ana, me gustaría reservar cita para el servicio: ${sub.name}`);
                                  window.open(`https://wa.me/34${bizConfig.phone}?text=${text}`, '_blank');
                                }}
                                style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                              >
                                Reservar por WhatsApp
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
            {adminError && <p style={{ color: '#ff4444', fontSize: '11px', marginBottom: '15px' }}>PIN incorrecto (Usa 0000).</p>}
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
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>{bizConfig.name} · Elche</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPin')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar Sesión</button>
          </div>

          {/* Selector de Pestañas Principales */}
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
                  backgroundColor: adminTab === tab.id ? '#d4af37' : '#1a1a1a',
                  color: adminTab === tab.id ? '#000' : '#d4af37',
                  border: '1px solid #d4af37',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* PESTAÑA 1: AGENDA SEMANAL CON MINI-CALENDARIO INTEGRADO */}
          {adminTab === 'agenda' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#fff', fontSize: '16px', margin: 0 }}>Gestión de Citas y Reservas</h3>
                <span style={{ color: '#888', fontSize: '12px' }}>Haz clic en un hueco para añadir una cita</span>
              </div>

              {/* CONTENEDOR FLEX: MINI-CALENDARIO + REJILLA DE HORARIOS */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                
                {/* WIDGET MINI-CALENDARIO LATERAL */}
                <div style={{
                  width: '210px',
                  backgroundColor: '#161616',
                  border: '1px solid rgba(212,175,55,0.3)',
                  borderRadius: '10px',
                  padding: '12px',
                  flexShrink: 0,
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#d4af37' }}>
                      {nombresMeses[mesMini]} {añoMini}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => cambiarMesMiniCal(-1)} style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>&lt;</button>
                      <button onClick={() => cambiarMesMiniCal(1)} style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>&gt;</button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '4px' }}>
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                      <span key={d} style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>{d}</span>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                    {diasRejillaMini.map((fechaDia, idx) => {
                      if (!fechaDia) return <div key={`empty-${idx}`} />;
                      const esHoy = new Date().toDateString() === fechaDia.toDateString();
                      const esSeleccionado = fechaSeleccionada && fechaSeleccionada.toDateString() === fechaDia.toDateString();

                      return (
                        <button
                          key={fechaDia.toISOString()}
                          onClick={() => setFechaSeleccionada(fechaDia)}
                          style={{
                            width: '100%',
                            aspectRatio: '1',
                            backgroundColor: esSeleccionado ? '#d4af37' : 'transparent',
                            color: esSeleccionado ? '#000' : (esHoy ? '#d4af37' : '#fff'),
                            border: esHoy && !esSeleccionado ? '1px solid #d4af37' : 'none',
                            borderRadius: '50%',
                            fontSize: '10px',
                            fontWeight: esSeleccionado || esHoy ? 'bold' : 'normal',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          {fechaDia.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TABLA PRINCIPAL DE LA AGENDA */}
                <div style={{ flex: 1, minWidth: 0, overflowX: 'auto', border: '1px solid #222', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #d4af37' }}>
                        <th style={{ padding: '10px', color: '#d4af37', width: '60px' }}>Hora</th>
                        {daysList.map(day => (
                          <th key={day} style={{ padding: '10px', color: '#d4af37', borderLeft: '1px solid #222' }}>{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hoursList.map(hour => (
                        <tr key={hour} style={{ borderBottom: '1px solid #1a1a1a' }}>
                          <td style={{ padding: '8px 4px', color: '#777', textAlign: 'center', fontWeight: 'bold' }}>{hour}</td>
                          {daysList.map(day => {
                            const app = appointments.find(a => a.day === day && a.time === hour);
                            return (
                              <td
                                key={`${day}-${hour}`}
                                onClick={() => handleCellClick(day, hour)}
                                style={{
                                  padding: '4px',
                                  borderLeft: '1px solid #222',
                                  height: '36px',
                                  cursor: 'pointer',
                                  backgroundColor: app ? '#1f1b0d' : 'transparent'
                                }}
                              >
                                {app && (
                                  <div style={{ backgroundColor: '#d4af37', color: '#000', padding: '4px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{app.clientName}</span>
                                    <span onClick={(e) => handleDeleteAppointment(app.id, e)} style={{ color: '#8b0000', cursor: 'pointer', marginLeft: '4px' }}>✕</span>
                                  </div>
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
            </div>
          )}

          {/* PESTAÑA 2: CONFIGURACIÓN NEGOCIO */}
          {adminTab === 'config' && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                <button onClick={() => setConfigSubTab('general')} style={{ backgroundColor: configSubTab === 'general' ? '#333' : 'transparent', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Datos Generales</button>
                <button onClick={() => setConfigSubTab('schedule')} style={{ backgroundColor: configSubTab === 'schedule' ? '#333' : 'transparent', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Horarios</button>
                <button onClick={() => setConfigSubTab('branding')} style={{ backgroundColor: configSubTab === 'branding' ? '#333' : 'transparent', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>PIN & Seguridad</button>
              </div>

              {configSubTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Nombre Comercial:
                    <input type="text" value={bizConfig.name} onChange={e => setBizConfig({ ...bizConfig, name: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#141414', border: '1px solid #333', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
                  </label>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Teléfono WhatsApp:
                    <input type="text" value={bizConfig.phone} onChange={e => setBizConfig({ ...bizConfig, phone: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#141414', border: '1px solid #333', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
                  </label>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Ubicación:
                    <input type="text" value={bizConfig.location} onChange={e => setBizConfig({ ...bizConfig, location: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#141414', border: '1px solid #333', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
                  </label>
                </div>
              )}

              {configSubTab === 'schedule' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Lunes:
                    <input type="text" value={bizConfig.scheduleMonday} onChange={e => setBizConfig({ ...bizConfig, scheduleMonday: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#141414', border: '1px solid #333', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
                  </label>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Martes y Miércoles:
                    <input type="text" value={bizConfig.scheduleTueWed} onChange={e => setBizConfig({ ...bizConfig, scheduleTueWed: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#141414', border: '1px solid #333', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
                  </label>
                </div>
              )}

              {configSubTab === 'branding' && (
                <div style={{ maxWidth: '500px' }}>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>PIN Maestro Cliente:
                    <input type="text" maxLength={4} value={bizConfig.masterPin} onChange={e => setBizConfig({ ...bizConfig, masterPin: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#141414', border: '1px solid #333', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 3: CATÁLOGO MAESTRO */}
          {adminTab === 'catalog' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#fff', fontSize: '16px', margin: 0 }}>Edición de Arquitectura de Servicios</h3>
                <button onClick={() => setIsAddingCategory(true)} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>+ Nueva Categoría</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {catalog.map((cat, idx) => (
                  <div key={cat.id} style={{ backgroundColor: '#161616', border: '1px solid #333', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '13px' }}>{cat.code} - {cat.title}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleMoveCategory(idx, -1)} style={{ background: '#222', border: 'none', color: '#fff', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}>▲</button>
                        <button onClick={() => handleMoveCategory(idx, 1)} style={{ background: '#222', border: 'none', color: '#fff', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}>▼</button>
                        <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: '#300', border: 'none', color: '#ff4444', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>

                    {cat.subservices.map(sub => (
                      <div key={sub.id} style={{ backgroundColor: '#0d0d0d', padding: '8px', borderRadius: '4px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{sub.name} ({sub.price})</div>
                          <div style={{ color: '#777', fontSize: '10px' }}>{sub.duration} | {sub.bufferTime}</div>
                        </div>
                        <button onClick={() => handleDeleteSubservice(cat.id, sub.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '11px' }}>Eliminar</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PESTAÑA 4: HERRAMIENTAS */}
          {adminTab === 'tools' && (
            <div style={{ color: '#ccc', fontSize: '13px' }}>
              <h3>Diagnósticos & Visagismo</h3>
              <p>Módulos de consulta técnica capilar en desarrollo para 360Studio.</p>
            </div>
          )}

          {/* PESTAÑA 5: CLIENTES */}
          {adminTab === 'clients' && (
            <div style={{ color: '#ccc', fontSize: '13px' }}>
              <h3>Directorio de Clientas VIP</h3>
              <p>Fichas técnicas y registros históricos de visagismo.</p>
            </div>
          )}

          {/* PESTAÑA 6: CRM / KPIS */}
          {adminTab === 'crm' && (
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ backgroundColor: '#181818', border: '1px solid #d4af37', borderRadius: '8px', padding: '15px', flex: 1, textAlign: 'center' }}>
                <h4 style={{ color: '#aaa', margin: '0 0 5px 0', fontSize: '12px' }}>Visitas a la App</h4>
                <span style={{ color: '#d4af37', fontSize: '24px', fontWeight: 'bold' }}>{appVisitsCount}</span>
              </div>
              <div style={{ backgroundColor: '#181818', border: '1px solid #d4af37', borderRadius: '8px', padding: '15px', flex: 1, textAlign: 'center' }}>
                <h4 style={{ color: '#aaa', margin: '0 0 5px 0', fontSize: '12px' }}>Solicitudes Pendientes</h4>
                <span style={{ color: '#d4af37', fontSize: '24px', fontWeight: 'bold' }}>{lostDemandCount}</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL PARA AGREGAR NUEVA CITA */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '12px', padding: '20px', width: '320px' }}>
            <h3 style={{ color: '#d4af37', margin: '0 0 15px 0', fontSize: '15px' }}>Nueva Cita: {targetDay} - {targetTime}</h3>
            <form onSubmit={handleSaveModalAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Nombre de la clienta" value={modalClientName} onChange={e => setModalClientName(e.target.value)} required style={{ padding: '8px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px' }} />
              <input type="text" placeholder="Teléfono" value={modalPhone} onChange={e => setModalPhone(e.target.value)} style={{ padding: '8px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar</button>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, backgroundColor: '#333', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA VER DETALLES DE CITA */}
      {viewApptModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '12px', padding: '20px', width: '300px' }}>
            <h3 style={{ color: '#d4af37', margin: '0 0 10px 0', fontSize: '15px' }}>Detalles de la Cita</h3>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#fff' }}><strong>Cliente:</strong> {viewApptModal.clientName}</p>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#fff' }}><strong>Teléfono:</strong> {viewApptModal.phone}</p>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#fff' }}><strong>Día:</strong> {viewApptModal.day} a las {viewApptModal.time}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={() => handleDeleteAppointment(viewApptModal.id)} style={{ flex: 1, backgroundColor: '#8b0000', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Eliminar</button>
              <button onClick={() => setViewApptModal(null)} style={{ flex: 1, backgroundColor: '#333', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}