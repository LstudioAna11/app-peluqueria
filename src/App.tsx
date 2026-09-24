import React, { useState, useEffect } from 'react';

// ==========================================
// CONFIGURACIÓN DE L'STUDIO ANA
// ==========================================
const APP_CONFIG = {
  appName: "L'Studio Ana",
  appSubtitle: "Hair Experience"
};

// Interfaz para la Configuración de Negocio Sincronizada
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
  appSubtitle: "Hair Experience",
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

// Interfaz para las citas del calendario
interface Appointment {
  id: string;
  day: string; // 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  time: string; // '09:00', '09:15', etc.
  clientName: string;
  phone: string;
  serviceCategory: string;
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

  // Pestañas internas del bloque de Configuración de Negocio
  const [configSubTab, setConfigSubTab] = useState<'general' | 'schedule' | 'branding'>('general');

  // Configuración de Negocio Sincronizada con localStorage
  const [bizConfig, setBizConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem('lst_business_config');
    return saved ? JSON.parse(saved) : INITIAL_BUSINESS_CONFIG;
  });

  // Catálogo Maestro sincronizado con localStorage
  const [catalog, setCatalog] = useState<CatalogCategory[]>(() => {
    const saved = localStorage.getItem('lst_master_catalog');
    return saved ? JSON.parse(saved) : INITIAL_CATALOG;
  });

  // Estado para desplegables de categorías en el Catálogo de Clientes y Admin
  const [openCatalogCategories, setOpenCatalogCategories] = useState<{ [key: string]: boolean }>({ c1: true });

  // Estados edición Catálogo en Intranet
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
    localStorage.setItem('lst_business_config', JSON.stringify(bizConfig));
  }, [bizConfig]);

  useEffect(() => {
    localStorage.setItem('lst_app_visits', appVisitsCount.toString());
  }, [appVisitsCount]);

  useEffect(() => {
    localStorage.setItem('lst_lost_demand', lostDemandCount.toString());
  }, [lostDemandCount]);

  // Teclado PIN Maestro (Dinámico según config)
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
      
      {/* 1. ACCESO PIN MAESTRO */}
      {currentScreen === 'clientPin' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '320px', width: '100%' }}>
          
          <div 
            onClick={handleLogoClick}
            style={{ textAlign: 'center', marginBottom: '30px', cursor: 'pointer', userSelect: 'none' }}
            title={bizConfig.name}
          >
            <h1 style={{ color: '#d4af37', fontSize: '24px', letterSpacing: '4px', margin: '0 0 5px 0', fontFamily: 'serif' }}>L ' A</h1>
            <p style={{ color: '#888888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '3px', margin: 0 }}>{bizConfig.appSubtitle}</p>
          </div>

          <p style={{ color: pinError ? '#ff4444' : '#cccccc', fontSize: '14px', marginBottom: '20px', letterSpacing: '1px', textAlign: 'center' }}>
            {pinError ? `PIN incorrecto (Prueba ${bizConfig.masterPin})` : 'Introduce tu PIN de acceso'}
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

      {/* 2. PORTAL DE CLIENTE EXCLUSIVO (Sincronizado con BizConfig) */}
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

          {/* Horarios estructurados y sincronizados */}
          <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold', fontFamily: 'serif', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '2px' }}>
              🕒 Horarios del Salón:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
              <span style={{ color: '#aaa', fontWeight: 'bold' }}>LUNES:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{bizConfig.scheduleMonday}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
              <span style={{ color: '#aaa', fontWeight: 'bold' }}>MARTES Y MIÉRCOLES:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{bizConfig.scheduleTueWed}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
              <span style={{ color: '#aaa', fontWeight: 'bold' }}>JUEVES Y VIERNES:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{bizConfig.scheduleThuFri}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '2px', alignItems: 'center' }}>
              <span style={{ color: '#aaa', fontWeight: 'bold' }}>SÁBADOS:</span>
              <span style={{ color: '#d4af37', fontStyle: 'italic', textAlign: 'right', maxWidth: '60%' }}>{bizConfig.scheduleSaturday}</span>
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
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>{bizConfig.name} · Elche</p>
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

          {/* BLOQUE 1: AGENDA SEMANAL INTERACTIVA */}
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
                                backgroundColor: appt ? '#221a00' : 'transparent',
                                transition: 'background 0.2s'
                              }}
                            >
                              {appt ? (
                                <div 
                                  onClick={(e) => { e.stopPropagation(); setViewApptModal(appt); }}
                                  style={{ backgroundColor: '#2c2200', border: '1px solid #d4af37', borderRadius: '6px', padding: '6px', cursor: 'pointer', position: 'relative' }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '11px' }}>{appt.clientName}</span>
                                    <button 
                                      onClick={(e) => handleDeleteAppointment(appt.id, e)}
                                      style={{ background: 'none', border: 'none', color: '#ff6666', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                                      title="Eliminar cita"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <p style={{ color: '#ccc', fontSize: '9px', margin: '3px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.serviceSubcategory}</p>
                                  <p style={{ color: '#888', fontSize: '8px', margin: '2px 0 0 0' }}>📞 {appt.phone}</p>
                                </div>
                              ) : (
                                <div style={{ color: '#333', fontSize: '9px', textAlign: 'center', marginTop: '8px', userSelect: 'none' }}>+ libre</div>
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

          {/* BLOQUE 2: CONFIGURACIÓN DE NEGOCIO CON PESTAÑAS SINCRONIZADAS */}
          {adminTab === 'config' && (
            <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: 0 }}>Configuración General del Salón</h3>
                <span style={{ color: '#888', fontSize: '11px' }}>Sincronizado en tiempo real con el Portal de Clientas</span>
              </div>

              {/* Pestañas internas de Configuración */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '12px' }}>
                {[
                  { id: 'general', label: '📋 Identidad y Descripción' },
                  { id: 'schedule', label: '🕒 Horarios del Salón' },
                  { id: 'branding', label: '🔐 PIN de Acceso y Contacto' }
                ].map(subTab => (
                  <button
                    key={subTab.id}
                    onClick={() => setConfigSubTab(subTab.id as any)}
                    style={{
                      backgroundColor: configSubTab === subTab.id ? '#2c2200' : '#121212',
                      color: configSubTab === subTab.id ? '#d4af37' : '#aaa',
                      border: configSubTab === subTab.id ? '1px solid #d4af37' : '1px solid #333',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {subTab.label}
                  </button>
                ))}
              </div>

              {/* PESTAÑA 1: Identidad y Descripción */}
              {configSubTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#aaa', fontSize: '11px', marginBottom: '6px' }}>Nombre del Salón</label>
                      <input
                        type="text"
                        value={bizConfig.name}
                        onChange={(e) => setBizConfig({ ...bizConfig, name: e.target.value })}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#aaa', fontSize: '11px', marginBottom: '6px' }}>Eslogan / Subtítulo</label>
                      <input
                        type="text"
                        value={bizConfig.appSubtitle}
                        onChange={(e) => setBizConfig({ ...bizConfig, appSubtitle: e.target.value })}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#aaa', fontSize: '11px', marginBottom: '6px' }}>Mensaje de Bienvenida en el Portal</label>
                    <input
                      type="text"
                      value={bizConfig.welcomeMessage}
                      onChange={(e) => setBizConfig({ ...bizConfig, welcomeMessage: e.target.value })}
                      style={{ width: '100%', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#aaa', fontSize: '11px', marginBottom: '6px' }}>Descripción Principal del Salón (Visible para Clientas)</label>
                    <textarea
                      rows={3}
                      value={bizConfig.description}
                      onChange={(e) => setBizConfig({ ...bizConfig, description: e.target.value })}
                      style={{ width: '100%', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box', resize: 'vertical' }}
                    />
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: Horarios del Salón (Estructurados por bloques) */}
              {configSubTab === 'schedule' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#d4af37', fontSize: '11px', marginBottom: '6px', fontWeight: 'bold' }}>LUNES</label>
                    <input
                      type="text"
                      value={bizConfig.scheduleMonday}
                      onChange={(e) => setBizConfig({ ...bizConfig, scheduleMonday: e.target.value })}
                      placeholder="Ej: 10H A 13:30H"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#d4af37', fontSize: '11px', marginBottom: '6px', fontWeight: 'bold' }}>MARTES Y MIÉRCOLES</label>
                    <input
                      type="text"
                      value={bizConfig.scheduleTueWed}
                      onChange={(e) => setBizConfig({ ...bizConfig, scheduleTueWed: e.target.value })}
                      placeholder="Ej: 10h a 18h"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#d4af37', fontSize: '11px', marginBottom: '6px', fontWeight: 'bold' }}>JUEVES Y VIERNES</label>
                    <input
                      type="text"
                      value={bizConfig.scheduleThuFri}
                      onChange={(e) => setBizConfig({ ...bizConfig, scheduleThuFri: e.target.value })}
                      placeholder="Ej: 10 A 19H"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#d4af37', fontSize: '11px', marginBottom: '6px', fontWeight: 'bold' }}>SÁBADOS (Descripción / Horario)</label>
                    <input
                      type="text"
                      value={bizConfig.scheduleSaturday}
                      onChange={(e) => setBizConfig({ ...bizConfig, scheduleSaturday: e.target.value })}
                      placeholder="Ej: Cita previa / Turno especial"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <p style={{ color: '#888', fontSize: '11px', fontStyle: 'italic', margin: 0 }}>Esta estructura se reflejará exactamente igual en el portal privado de clientas.</p>
                </div>
              )}

              {/* PESTAÑA 3: PIN de Acceso y Contacto */}
              {configSubTab === 'branding' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#aaa', fontSize: '11px', marginBottom: '6px' }}>Ubicación Física</label>
                      <input
                        type="text"
                        value={bizConfig.location}
                        onChange={(e) => setBizConfig({ ...bizConfig, location: e.target.value })}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#aaa', fontSize: '11px', marginBottom: '6px' }}>Teléfono de Contacto / WhatsApp</label>
                      <input
                        type="text"
                        value={bizConfig.phone}
                        onChange={(e) => setBizConfig({ ...bizConfig, phone: e.target.value })}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#aaa', fontSize: '11px', marginBottom: '6px' }}>PIN Maestro de Acceso para Clientas</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={bizConfig.masterPin}
                      onChange={(e) => setBizConfig({ ...bizConfig, masterPin: e.target.value })}
                      style={{ width: '120px', padding: '10px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#d4af37', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: '15px' }}>
                <span style={{ color: '#44ff88', fontSize: '11px' }}>✓ Los cambios se guardan automáticamente</span>
                <button onClick={() => alert('¡Configuración guardada y sincronizada correctamente!')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Guardar Cambios</button>
              </div>
            </div>
          )}

          {/* BLOQUE 3: CATÁLOGO MAESTRO */}
          {adminTab === 'catalog' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: '0 0 4px 0' }}>Gestión del Catálogo Maestro</h3>
                  <p style={{ color: '#aaa', fontSize: '11px', margin: 0 }}>Modifica títulos, reorganiza categorías principales o añade nuevos tratamientos.</p>
                </div>
                <button
                  onClick={() => setIsAddingCategory(true)}
                  style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
                >
                  + Nueva Categoría Principal
                </button>
              </div>

              {isAddingCategory && (
                <form onSubmit={handleAddCategorySubmit} style={{ backgroundColor: '#181818', border: '1px solid #d4af37', borderRadius: '10px', padding: '15px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: '0 0 80px' }}>
                    <label style={{ display: 'block', color: '#aaa', fontSize: '10px', marginBottom: '4px' }}>Código</label>
                    <input type="text" value={newCatCode} onChange={e => setNewCatCode(e.target.value)} placeholder="0.10" style={{ width: '100%', padding: '8px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} required />
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', color: '#aaa', fontSize: '10px', marginBottom: '4px' }}>Título de Categoría</label>
                    <input type="text" value={newCatTitle} onChange={e => setNewCatTitle(e.target.value)} placeholder="Ej: NUEVOS TRATAMIENTOS" style={{ width: '100%', padding: '8px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} required />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Crear</button>
                    <button type="button" onClick={() => setIsAddingCategory(false)} style={{ backgroundColor: '#333', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {catalog.map((cat, index) => (
                  <div key={cat.id} style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <input
                          type="text"
                          value={cat.code}
                          onChange={(e) => handleUpdateCategoryCode(cat.id, e.target.value)}
                          style={{ width: '55px', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', borderRadius: '6px', color: '#d4af37', fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}
                        />
                        <input
                          type="text"
                          value={cat.title}
                          onChange={(e) => handleUpdateCategoryTitle(cat.id, e.target.value)}
                          style={{ flex: 1, padding: '6px 10px', backgroundColor: '#121212', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontWeight: 'bold', fontSize: '12px', fontFamily: 'serif' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={() => handleMoveCategory(index, -1)} disabled={index === 0} style={{ backgroundColor: '#222', border: '1px solid #444', color: index === 0 ? '#555' : '#ccc', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: index === 0 ? 'default' : 'pointer' }}>▲</button>
                        <button onClick={() => handleMoveCategory(index, 1)} disabled={index === catalog.length - 1} style={{ backgroundColor: '#222', border: '1px solid #444', color: index === catalog.length - 1 ? '#555' : '#ccc', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: index === catalog.length - 1 ? 'default' : 'pointer' }}>▼</button>
                        <button onClick={() => handleDeleteCategory(cat.id)} style={{ backgroundColor: '#331111', border: '1px solid #663333', color: '#ff8888', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Eliminar</button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '15px' }}>
                      {cat.subservices.map((sub) => (
                        <div key={sub.id} style={{ backgroundColor: '#141414', border: '1px solid #333', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                          <div style={{ flex: 1 }}>
                            <h5 style={{ color: '#fff', fontSize: '12px', margin: '0 0 3px 0' }}>{sub.name}</h5>
                            <p style={{ color: '#aaa', fontSize: '10px', margin: '0 0 5px 0' }}>{sub.description}</p>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '9px', color: '#888' }}>
                              <span>⏱️ {sub.duration}</span>
                              <span>🛠️ {sub.bufferTime}</span>
                              <span style={{ color: '#d4af37', fontWeight: 'bold' }}>{sub.price}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteSubservice(cat.id, sub.id)}
                            style={{ backgroundColor: 'transparent', border: '1px solid #553333', color: '#ff6666', padding: '4px 8px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer' }}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}

                      {isAddingSub === cat.id ? (
                        <form onSubmit={(e) => handleAddSubserviceSubmit(cat.id, e)} style={{ backgroundColor: '#141414', border: '1px dashed #d4af37', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                          <p style={{ color: '#d4af37', fontSize: '11px', margin: 0, fontWeight: 'bold' }}>Nuevo Tratamiento / Servicio</p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="text" placeholder="Nombre del servicio" value={newSubName} onChange={e => setNewSubName(e.target.value)} style={{ flex: 1, padding: '6px', backgroundColor: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '11px' }} required />
                            <input type="text" placeholder="Precio (ej: Desde 45 €)" value={newSubPrice} onChange={e => setNewSubPrice(e.target.value)} style={{ width: '120px', padding: '6px', backgroundColor: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '11px' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="text" placeholder="Descripción breve" value={newSubDesc} onChange={e => setNewSubDesc(e.target.value)} style={{ flex: 1, padding: '6px', backgroundColor: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '11px' }} />
                            <input type="text" placeholder="Duración (ej: 45 min)" value={newSubDur} onChange={e => setNewSubDur(e.target.value)} style={{ width: '100px', padding: '6px', backgroundColor: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '11px' }} />
                            <input type="text" placeholder="Buffer" value={newSubBuffer} onChange={e => setNewSubBuffer(e.target.value)} style={{ width: '80px', padding: '6px', backgroundColor: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '11px' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                            <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Servicio</button>
                            <button type="button" onClick={() => setIsAddingSub(null)} style={{ backgroundColor: '#333', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Cancelar</button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setIsAddingSub(cat.id)}
                          style={{ backgroundColor: 'transparent', border: '1px dashed rgba(212,175,55,0.4)', color: '#d4af37', padding: '8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', textAlign: 'center', marginTop: '4px' }}
                        >
                          + Añadir servicio a esta categoría
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BLOQUE 4: HERRAMIENTAS */}
          {adminTab === 'tools' && (
            <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', marginTop: 0, marginBottom: '15px' }}>Herramientas Operativas de {bizConfig.name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                <div style={{ backgroundColor: '#141414', border: '1px solid #333', borderRadius: '10px', padding: '15px' }}>
                  <h4 style={{ color: '#fff', fontSize: '13px', margin: '0 0 5px 0' }}>💬 Automatización WhatsApp</h4>
                  <p style={{ color: '#aaa', fontSize: '11px', margin: '0 0 12px 0' }}>Configura respuestas rápidas y redirección a agenda online.</p>
                  <button onClick={() => alert('Módulo de WhatsApp Business vinculado.')} style={{ backgroundColor: '#1e1e1e', border: '1px solid #d4af37', color: '#d4af37', padding: '6px 12px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>Gestionar</button>
                </div>
                <div style={{ backgroundColor: '#141414', border: '1px solid #333', borderRadius: '10px', padding: '15px' }}>
                  <h4 style={{ color: '#fff', fontSize: '13px', margin: '0 0 5px 0' }}>📱 Acceso PWA / Escritorio</h4>
                  <p style={{ color: '#aaa', fontSize: '11px', margin: '0 0 12px 0' }}>Instalación directa en Lenovo IdeaTab 11 e iPhone 16 Pro.</p>
                  <button onClick={() => alert('La app está optimizada como Progressive Web App (PWA).')} style={{ backgroundColor: '#1e1e1e', border: '1px solid #d4af37', color: '#d4af37', padding: '6px 12px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>Ver Estado</button>
                </div>
                <div style={{ backgroundColor: '#141414', border: '1px solid #333', borderRadius: '10px', padding: '15px' }}>
                  <h4 style={{ color: '#fff', fontSize: '13px', margin: '0 0 5px 0' }}>🎨 Estética Dark Luxury</h4>
                  <p style={{ color: '#aaa', fontSize: '11px', margin: '0 0 12px 0' }}>Esquema cromático negro, carbón, marfil y detalles dorados.</p>
                  <span style={{ color: '#d4af37', fontSize: '10px', fontWeight: 'bold' }}>Activo por defecto</span>
                </div>
              </div>
            </div>
          )}

          {/* BLOQUE 5: BASE DE CLIENTES */}
          {adminTab === 'clients' && (
            <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', marginTop: 0, marginBottom: '15px' }}>Directorio de Clientas</h3>
              <p style={{ color: '#aaa', fontSize: '11px', marginBottom: '15px' }}>Historial clínico-capilar, visagismo y preferencias de productos (Balmain, Authentic Beauty Concept, BlondMe).</p>
              
              <div style={{ backgroundColor: '#141414', border: '1px solid #333', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <p style={{ color: '#fff', fontSize: '13px', margin: '0 0 2px 0', fontWeight: 'bold' }}>María G.</p>
                  <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>Tel: 600111222 · Último servicio: Coloración Global & Raíces</p>
                </div>
                <span style={{ backgroundColor: '#221a00', color: '#d4af37', border: '1px solid #d4af37', padding: '4px 8px', borderRadius: '6px', fontSize: '10px' }}>Ficha DNI Capilar</span>
              </div>

              <div style={{ backgroundColor: '#141414', border: '1px solid #333', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#fff', fontSize: '13px', margin: '0 0 2px 0', fontWeight: 'bold' }}>Carmen R.</p>
                  <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>Tel: 611222333 · Último servicio: Corte de Autor & Visagismo</p>
                </div>
                <span style={{ backgroundColor: '#221a00', color: '#d4af37', border: '1px solid #d4af37', padding: '4px 8px', borderRadius: '6px', fontSize: '10px' }}>Ficha DNI Capilar</span>
              </div>
            </div>
          )}

          {/* BLOQUE 6: CRM / KPIS */}
          {adminTab === 'crm' && (
            <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', marginTop: 0, marginBottom: '15px' }}>Métricas y Control de Demanda</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div style={{ backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: '#888', fontSize: '11px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Visitas al Portal</p>
                  <p style={{ color: '#d4af37', fontSize: '28px', fontFamily: 'serif', margin: 0, fontWeight: 'bold' }}>{appVisitsCount}</p>
                </div>
                <div style={{ backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: '#888', fontSize: '11px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Demanda No Atendida (Recuperable)</p>
                  <p style={{ color: '#ffaa44', fontSize: '28px', fontFamily: 'serif', margin: 0, fontWeight: 'bold' }}>{lostDemandCount}</p>
                </div>
                <div style={{ backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: '#888', fontSize: '11px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Citas Activas</p>
                  <p style={{ color: '#44ff88', fontSize: '28px', fontFamily: 'serif', margin: 0, fontWeight: 'bold' }}>{appointments.length}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL PARA AÑADIR CITA DESDE LA AGENDA */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '14px', maxWidth: '420px', width: '100%', padding: '25px', boxSizing: 'border-box' }}>
            <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', marginTop: 0, marginBottom: '5px' }}>Nueva Cita — {bizConfig.name}</h3>
            <p style={{ color: '#aaa', fontSize: '11px', marginBottom: '20px' }}>{targetDay} a las {targetTime} h</p>

            <form onSubmit={handleSaveModalAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#ccc', fontSize: '11px', marginBottom: '5px' }}>Nombre de la Clienta</label>
                <input type="text" value={modalClientName} onChange={e => setModalClientName(e.target.value)} placeholder="Ej: Laura Martínez" style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} required />
              </div>

              <div>
                <label style={{ display: 'block', color: '#ccc', fontSize: '11px', marginBottom: '5px' }}>Teléfono de Contacto</label>
                <input type="tel" value={modalPhone} onChange={e => setModalPhone(e.target.value)} placeholder="Ej: 600000000" style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', color: '#ccc', fontSize: '11px', marginBottom: '5px' }}>Categoría de Servicio</label>
                <select value={modalCatIndex} onChange={e => { setModalCatIndex(Number(e.target.value)); setModalSubIndex(0); }} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}>
                  {catalog.map((cat, idx) => (
                    <option key={cat.id} value={idx}>{cat.code} &lt; {cat.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#ccc', fontSize: '11px', marginBottom: '5px' }}>Tratamiento Específico</label>
                <select value={modalSubIndex} onChange={e => setModalSubIndex(Number(e.target.value))} style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}>
                  {catalog[modalCatIndex]?.subservices.map((sub, idx) => (
                    <option key={sub.id} value={idx}>{sub.name} ({sub.price})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Confirmar Cita</button>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ backgroundColor: '#222', color: '#ccc', border: '1px solid #444', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE CITA */}
      {viewApptModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '14px', maxWidth: '380px', width: '100%', padding: '25px', boxSizing: 'border-box' }}>
            <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', marginTop: 0, marginBottom: '15px' }}>Detalle de Cita</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#ccc', marginBottom: '20px' }}>
              <p style={{ margin: 0 }}><strong>Clienta:</strong> {viewApptModal.clientName}</p>
              <p style={{ margin: 0 }}><strong>Teléfono:</strong> {viewApptModal.phone}</p>
              <p style={{ margin: 0 }}><strong>Día y Hora:</strong> {viewApptModal.day} a las {viewApptModal.time} h</p>
              <p style={{ margin: 0 }}><strong>Categoría:</strong> {viewApptModal.serviceCategory}</p>
              <p style={{ margin: 0 }}><strong>Servicio:</strong> {viewApptModal.serviceSubcategory}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { handleDeleteAppointment(viewApptModal.id); setViewApptModal(null); }} style={{ backgroundColor: '#331111', border: '1px solid #663333', color: '#ff8888', padding: '10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', flex: 1 }}>Eliminar Cita</button>
              <button onClick={() => setViewApptModal(null)} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}