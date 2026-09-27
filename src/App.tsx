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
  instagramUrl: string;
  tiktokUrl: string;
  googleMapsUrl: string;
  googleReviewUrl: string;
}

const INITIAL_BUSINESS_CONFIG: BusinessConfig = {
  name: "L'Studio Ana",
  subtitle: "Hair Experience",
  location: "Centro de Elche, Alicante",
  phone: "600000000",
  description: "Más de 25 años dedicados al cuidado de la salud capilar y la estética del cabello de autor en el centro de Elche.",
  scheduleMonday: "10H A 13:30H",
  scheduleTueWed: "10h a 18h",
  scheduleThuFri: "10h a 19h",
  scheduleSaturday: "Cita previa / Turno especial consultorio",
  welcomeMessage: "Bienvenida a tu espacio exclusivo de salud capilar y visagismo de autor.",
  masterPin: "7009",
  instagramUrl: "https://instagram.com",
  tiktokUrl: "https://tiktok.com",
  googleMapsUrl: "https://maps.google.com",
  googleReviewUrl: "https://g.page/r/CRLx1fxwpIAYEBM/review"
};

interface Appointment {
  id: string;
  dateKey: string;
  dayName: string;
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

interface ClientRecord {
  idNum: number;
  registroId: string;
  nombre: string;
  telefono: string;
  email: string;
  pinAcceso: string;
  diagnostico: string;
  ultimaVisita: string;
  proximaVisitaSugerida?: string;
}

interface FeedbackRecord {
  id: string;
  date: string;
  clientName: string;
  rating: number;
  comment: string;
  type: 'detractor' | 'neutral' | 'promoter';
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

const formatDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: '1', dateKey: '2026-09-21', dayName: 'Lunes', time: '10:00', clientName: 'María G.', phone: '600111222', serviceCategory: '0.4 < COLOR ATELIER', serviceSubcategory: 'Coloración Global & Raíces' },
  { id: '2', dateKey: '2026-09-23', dayName: 'Miércoles', time: '11:30', clientName: 'Carmen R.', phone: '611222333', serviceCategory: '0.2 < VISAGISMO & CORTE', serviceSubcategory: 'Corte de Autor & Visagismo' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'clientPin' | 'clientPortal' | 'catalog' | 'clientHistory' | 'adminLogin' | 'adminPanel'>('clientPin');
  
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [currentClientRecord, setCurrentClientRecord] = useState<ClientRecord | null>(null);

  // Estados Asistente IA de Estilo en Historial
  const [clientWishText, setClientWishText] = useState<string>('');
  const [aiRecommendation, setAiRecommendation] = useState<{ serviceName: string; reason: string; category: string } | null>(null);

  // Estados Administrador
  const [logoClicks, setLogoClicks] = useState<number>(0);
  const [adminPin, setAdminPin] = useState<string>('');
  const [adminError, setAdminError] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<'agenda' | 'config' | 'catalog' | 'clients' | 'detractors' | 'crm'>('agenda');

  const [configSubTab, setConfigSubTab] = useState<'general' | 'schedule' | 'branding'>('general');

  const [bizConfig, setBizConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem('lst_business_config');
    return saved ? JSON.parse(saved) : INITIAL_BUSINESS_CONFIG;
  });

  const [tempConfig, setTempConfig] = useState<BusinessConfig>(bizConfig);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setTempConfig(bizConfig);
  }, [bizConfig]);

  const [catalog, setCatalog] = useState<CatalogCategory[]>(() => {
    const saved = localStorage.getItem('lst_master_catalog');
    return saved ? JSON.parse(saved) : INITIAL_CATALOG;
  });

  const [openCatalogCategories, setOpenCatalogCategories] = useState<{ [key: string]: boolean }>({ c1: true });

  const [isAddingSub, setIsAddingSub] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newSubDur, setNewSubDur] = useState('');
  const [newSubPrice, setNewSubPrice] = useState('');
  const [newSubBuffer, setNewSubBuffer] = useState('');

  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatTitle, setNewCatTitle] = useState('');

  const [appVisitsCount, setAppVisitsCount] = useState<number>(() => {
    const saved = localStorage.getItem('lst_app_visits');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lostDemandCount, setLostDemandCount] = useState<number>(() => {
    const saved = localStorage.getItem('lst_lost_demand');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>(() => {
    const saved = localStorage.getItem('lst_feedback_list');
    return saved ? JSON.parse(saved) : [
      { id: '1', date: '24/09/2026', clientName: 'María G.', rating: 1, comment: 'No me gustó el tiempo de espera en el lavado.', type: 'detractor' },
      { id: '2', date: '25/09/2026', clientName: 'Carmen R.', rating: 5, comment: 'Excelente servicio de Balayage, superó mis expectativas.', type: 'promoter' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('lst_feedback_list', JSON.stringify(feedbackList));
  }, [feedbackList]);

  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('¡Excelente experiencia! El servicio de autor y la atención de Ana han sido impecables.');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
    if (rating <= 2) {
      setFeedbackComment('Lamento que algo no haya sido perfecto. Por favor, explícanos qué ha ocurrido para solucionarlo en privado:');
    } else {
      setFeedbackComment('¡Excelente experiencia! El servicio de autor y la atención de Ana han sido impecables.');
    }
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    const type = selectedRating <= 2 ? 'detractor' : selectedRating === 3 ? 'neutral' : 'promoter';
    const newRecord: FeedbackRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('es-ES'),
      clientName: currentClientRecord ? `${currentClientRecord.nombre} (PIN ${pin})` : `Clienta Verificada (PIN ${pin})`,
      rating: selectedRating,
      comment: feedbackComment,
      type
    };

    setFeedbackList([newRecord, ...feedbackList]);
    setFeedbackSubmitted(true);
  };

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('lst_studio_appointments');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [listaClientes, setListaClientes] = useState<ClientRecord[]>(() => {
    const saved = localStorage.getItem('lst_studio_clientes_ids');
    return saved ? JSON.parse(saved) : [
      { idNum: 1, registroId: "LSTUDIO-001", nombre: "María Dolores Gómez", telefono: "+34 600 111 222", email: "mariadolores@gmail.com", pinAcceso: "7009", diagnostico: "Balayage manteca / Cabello sensibilizado", ultimaVisita: "15/08/2026", proximaVisitaSugerida: "15/10/2026" },
      { idNum: 2, registroId: "LSTUDIO-002", nombre: "Carmen Martínez", telefono: "+34 633 444 555", email: "carmen@gmail.com", pinAcceso: "1234", diagnostico: "Melt & Lights avellana / Hidratación Profunda", ultimaVisita: "01/09/2026", proximaVisitaSugerida: "01/10/2026" }
    ];
  });

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [novoNombre, setNovoNombre] = useState('');
  const [novoTelefono, setNovoTelefono] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoPin, setNovoPin] = useState('');
  const [novoDiagnostico, setNovoDiagnostico] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');

  useEffect(() => {
    localStorage.setItem('lst_studio_clientes_ids', JSON.stringify(listaClientes));
  }, [listaClientes]);

  // IA Analizadora de deseos de la clienta frente al catálogo de autor
  const handleRunAiRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientWishText.trim()) return;

    const query = clientWishText.toLowerCase();
    let bestMatch = { serviceName: 'DNI Capilar & Estudio Facial', reason: 'Recomendamos un diagnóstico de autor previo para evaluar la fibra capilar antes de realizar cualquier cambio.', category: 'VISAGISMO & DIAGNÓSTICO' };

    if (query.includes('balayage') || query.includes('mechas') || query.includes('luz') || query.includes('rubio')) {
      bestMatch = { serviceName: 'Balayage & Melt & Lights', reason: 'Ideal para conseguir fundidos de luz tridimensionales personalizados respetando la salud capilar.', category: 'MÉTODO DE AUTOR & ILUMINACIÓN' };
    } else if (query.includes('corte') || query.includes('cambio de look') || query.includes('estilo')) {
      bestMatch = { serviceName: 'Corte de Autor & Visagismo', reason: 'Corte arquitectónico adaptado exactamente a la morfología y proporciones de tu rostro.', category: 'VISAGISMO & CORTE' };
    } else if (query.includes('color') || query.includes('raíces') || query.includes('tinte')) {
      bestMatch = { serviceName: 'Coloración Global & Raíces', reason: 'Técnica de color de alta precisión con pigmentos y aceites de autor.', category: 'COLOR ATELIER' };
    } else if (query.includes('hidrata') || query.includes('reconstrucción') || query.includes('seco') || query.includes('roto')) {
      bestMatch = { serviceName: 'Protocolo Revivre / Reconstrucción', reason: 'Tratamiento profundo y exclusivo de nutrición para devolver la salud y brillo extremo al cabello.', category: 'SALUD CAPILAR & RECONSTRUCCIÓN' };
    } else if (query.includes('brillo') || query.includes('gloss') || query.includes('matiz')) {
      bestMatch = { serviceName: 'Gloss / Baño de Brillo Exprés', reason: 'Baño de brillo instantáneo para sellar la cutícula y revitalizar el tono al instante.', category: 'ADD-ONS & COMPLEMENTOS' };
    }

    setAiRecommendation(bestMatch);
  };

  const handleGuardarNuevoCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNombre.trim()) return;

    const siguienteIdNum = listaClientes.length > 0 ? Math.max(...listaClientes.map(c => c.idNum || 0)) + 1 : 1;
    const idFormateado = `LSTUDIO-${String(siguienteIdNum).padStart(3, '0')}`;

    const nuevoCliente: ClientRecord = {
      idNum: siguienteIdNum,
      registroId: idFormateado,
      nombre: novoNombre.trim(),
      telefono: novoTelefono.trim() || 'No facilitado',
      email: novoEmail.trim() || 'Sin email',
      pinAcceso: novoPin.trim() || '0000',
      diagnostico: novoDiagnostico.trim() || 'Diagnóstico inicial pendiente',
      ultimaVisita: 'Nuevo registro',
      proximaVisitaSugerida: 'Pendiente de agendar'
    };

    setListaClientes([...listaClientes, nuevoCliente]);
    setNovoNombre('');
    setNovoTelefono('');
    setNovoEmail('');
    setNovoPin('');
    setNovoDiagnostico('');
    setIsAddingClient(false);
  };

  const handleBorrarCliente = (idNum: number) => {
    if (window.confirm('¿Estás segura de eliminar este cliente de la base de datos?')) {
      setListaClientes(listaClientes.filter(c => c.idNum !== idNum));
    }
  };

  const [draggedApptId, setDraggedApptId] = useState<string | null>(null);

  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date(2026, 8, 24));
  const [mesNavegacion, setMesNavegacion] = useState<Date>(new Date(2026, 8, 1));

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [targetDateObj, setTargetDateObj] = useState<Date>(new Date());
  const [targetDayName, setTargetDayName] = useState<string>('');
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
          // Buscar si el PIN coincide con alguna clienta registrada o con el máster
          const clientMatch = listaClientes.find(c => c.pinAcceso === newPin);
          if (clientMatch || newPin === bizConfig.masterPin || newPin === '7009') {
            setPinError(false);
            setPin('');
            setAppVisitsCount(prev => prev + 1);
            setFeedbackSubmitted(false);
            setIsReviewOpen(false);
            if (clientMatch) {
              setCurrentClientRecord(clientMatch);
            } else {
              // Si entra por PIN maestro, le asignamos por defecto la primera o creamos una vista genérica
              setCurrentClientRecord(listaClientes[0] || null);
            }
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
    if (adminPin === '0000' || adminPin === '7009') {
      setCurrentScreen('adminPanel');
    } else {
      setAdminError(true);
      setAdminPin('');
    }
  };

  const handleSaveSection = (sectionName: string) => {
    setBizConfig(tempConfig);
    setSavedMsg(`¡${sectionName} guardados correctamente!`);
    setTimeout(() => setSavedMsg(null), 3000);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedApptId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date, dayName: string, time: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedApptId;
    if (!id) return;

    const targetDateKey = formatDateKey(targetDate);
    const existing = appointments.find(a => a.dateKey === targetDateKey && a.time === time && a.id !== id);
    if (existing) {
      window.alert('Ese hueco horario ya está ocupado por otra cita en esta fecha.');
      return;
    }

    setAppointments(prev => prev.map(a => a.id === id ? { ...a, dateKey: targetDateKey, dayName } : a));
    setDraggedApptId(null);
  };

  const handleCellClick = (targetDate: Date, dayName: string, time: string) => {
    const targetDateKey = formatDateKey(targetDate);
    const existing = appointments.find(a => a.dateKey === targetDateKey && a.time === time);
    if (existing) {
      setViewApptModal(existing);
      return;
    }
    setTargetDateObj(targetDate);
    setTargetDayName(dayName);
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
      dateKey: formatDateKey(targetDateObj),
      dayName: targetDayName,
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
    if (window.confirm('¿Deseas eliminar esta cita de la agenda?')) {
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
    if (window.confirm('¿Estás segura de eliminar esta categoría principal y todos sus servicios asociados?')) {
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
    if (window.confirm('¿Eliminar este servicio del catálogo?')) {
      setCatalog(catalog.map(cat => {
        if (cat.id === catId) {
          return { ...cat, subservices: cat.subservices.filter(s => s.id !== subId) };
        }
        return cat;
      }));
    }
  };

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
    '10:00', '10:15', '11:00', '11:15',
    '12:00', '12:15', '13:00', '13:15',
    '14:00', '14:15', '15:00', '15:15',
    '16:00', '16:15', '17:00', '17:15',
    '18:00', '18:15', '19:00', '19:15',
  ];

  const getDaysOfWeekForDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    const weekDays = [];
    const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    for (let i = 0; i < 6; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      weekDays.push({
        name: names[i],
        dateObj: nextDay,
        dateFormatted: nextDay.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      });
    }
    return weekDays;
  };

  const semanaActual = getDaysOfWeekForDate(fechaSeleccionada);

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
        <div style={{ maxWidth: '600px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '30px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>{bizConfig.name}</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Portal Privado de Clientas</p>
            </div>
            <button onClick={() => { setPin(''); setCurrentScreen('clientPin'); }} style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              Salir
            </button>
          </div>

          <div style={{ textAlign: 'center', padding: '25px 20px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px dashed rgba(212,175,55,0.3)' }}>
            <p style={{ color: '#d4af37', fontSize: '14px', fontFamily: 'serif', margin: '0 0 5px 0' }}>{bizConfig.name}</p>
            <a href={bizConfig.googleMapsUrl} target="_blank" rel="noreferrer" style={{ color: '#aaa', fontSize: '11px', textDecoration: 'underline' }}>
              📍 {bizConfig.location} (Ver en Google Maps)
            </a>
          </div>

          <div>
            <h1 style={{ fontSize: '20px', fontFamily: 'serif', color: '#fff', marginBottom: '8px' }}>
              {bizConfig.welcomeMessage}
            </h1>
            <p style={{ color: '#ccc', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
              {bizConfig.description}
            </p>
          </div>

          {/* Horarios */}
          <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', fontFamily: 'serif', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '6px' }}>
              🕒 Horarios del Salón:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid #222', paddingBottom: '4px' }}>
              <span style={{ color: '#aaa' }}>LUNES:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{bizConfig.scheduleMonday}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid #222', paddingBottom: '4px' }}>
              <span style={{ color: '#aaa' }}>MARTES Y MIÉRCOLES:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{bizConfig.scheduleTueWed}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid #222', paddingBottom: '4px' }}>
              <span style={{ color: '#aaa' }}>JUEVES Y VIERNES:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{bizConfig.scheduleThuFri}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', alignItems: 'center' }}>
              <span style={{ color: '#aaa' }}>SÁBADOS:</span>
              <span style={{ color: '#d4af37', fontStyle: 'italic', textAlign: 'right' }}>{bizConfig.scheduleSaturday}</span>
            </div>
          </div>

          {/* BOTONES DE NAVEGACIÓN CLIENTE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => setCurrentScreen('clientHistory')}
              style={{ width: '100%', backgroundColor: '#221e10', border: '1px solid #d4af37', color: '#d4af37', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', letterSpacing: '1px' }}
            >
              ✨ Mi Historial & Visagismo IA (ID #{currentClientRecord?.idNum || '1'}) →
            </button>

            <button
              onClick={() => setCurrentScreen('catalog')}
              style={{ width: '100%', backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', letterSpacing: '1px' }}
            >
              Ver Catálogo de Servicios →
            </button>
          </div>

          {/* REDES SOCIALES */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href={bizConfig.instagramUrl} target="_blank" rel="noreferrer" style={{ flex: 1, backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}>
              📸 Instagram
            </a>
            <a href={bizConfig.tiktokUrl} target="_blank" rel="noreferrer" style={{ flex: 1, backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}>
              🎬 TikTok
            </a>
            <a href={bizConfig.googleMapsUrl} target="_blank" rel="noreferrer" style={{ flex: 1, backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}>
              🗺️ Google Maps
            </a>
          </div>

          {/* WIDGET DE RESEÑAS EN DESPLEGABLE CON ENLACE GOOGLE MY BUSINESS */}
          <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsReviewOpen(!isReviewOpen)}
              style={{ padding: '15px 18px', backgroundColor: '#1c1c1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <span style={{ color: '#d4af37', fontSize: '13px', fontFamily: 'serif', fontWeight: 'bold', letterSpacing: '1px' }}>
                ⭐ Déjanos tu opinión & Reseña Google
              </span>
              <span style={{ color: '#d4af37', fontSize: '12px' }}>{isReviewOpen ? '▲' : '▼'}</span>
            </div>

            {isReviewOpen && (
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(212,175,55,0.2)' }}>
                {feedbackSubmitted ? (
                  <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#1a261a', border: '1px solid #44bb44', borderRadius: '8px' }}>
                    <p style={{ color: '#44bb44', fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0' }}>¡Gracias por compartir tu opinión con Ana!</p>
                    <p style={{ color: '#ccc', fontSize: '11px', margin: 0 }}>
                      {selectedRating <= 2 
                        ? 'Tu mensaje ha sido enviado directamente a la dirección para revisarlo de forma privada.' 
                        : 'Te invitamos a dejar tu reseña oficial en Google My Business para apoyar al salón.'}
                    </p>
                    {selectedRating >= 3 && (
                      <a href={bizConfig.googleReviewUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '10px', backgroundColor: '#d4af37', color: '#000', padding: '8px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none' }}>
                        Dejar Reseña en Google My Business ⭐
                      </a>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSendFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ color: '#aaa', fontSize: '11px', margin: 0, textAlign: 'center' }}>Selecciona tu nivel de satisfacción:</p>
                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '26px', cursor: 'pointer' }}>
                      {[
                        { val: 1, emoji: '😡', label: 'Muy mal' },
                        { val: 2, emoji: '🙁', label: 'Regular' },
                        { val: 3, emoji: '😐', label: 'Neutral' },
                        { val: 4, emoji: '😊', label: 'Bien' },
                        { val: 5, emoji: '😍', label: '¡Excelente!' }
                      ].map((item) => (
                        <div 
                          key={item.val} 
                          onClick={() => handleRatingSelect(item.val)}
                          style={{ 
                            textAlign: 'center', 
                            opacity: selectedRating === item.val ? 1 : 0.4, 
                            transform: selectedRating === item.val ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.2s' 
                          }}
                          title={item.label}
                        >
                          <div>{item.emoji}</div>
                          <div style={{ fontSize: '9px', color: selectedRating === item.val ? '#d4af37' : '#888', marginTop: '2px' }}>{item.label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ color: '#aaa', fontSize: '11px' }}>
                        {selectedRating <= 2 ? 'Cuéntanos qué falló (Directo a la Intranet):' : 'Resumen de tu servicio (Sugerido):'}
                      </label>
                      <textarea 
                        value={feedbackComment} 
                        onChange={(e) => setFeedbackComment(e.target.value)} 
                        rows={2} 
                        style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', padding: '8px', fontSize: '11px', resize: 'none' }} 
                      />
                    </div>

                    <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {selectedRating <= 2 ? 'Enviar reclamación privada a Ana' : 'Enviar Opinión / Continuar a Google'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 2.1. HISTORIAL DE CLIENTE & ASISTENTE IA */}
      {currentScreen === 'clientHistory' && (
        <div style={{ maxWidth: '650px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '30px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>{currentClientRecord?.nombre || 'Mi Ficha Personal'}</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>ID #{currentClientRecord?.idNum || '1'} ({currentClientRecord?.registroId || 'LSTUDIO-001'})</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPortal')} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              ← Volver
            </button>
          </div>

          {/* Tarjeta de Historial y Próxima Visita */}
          <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '14px', fontFamily: 'serif', margin: 0, borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '8px' }}>
              📋 Registro y Mantenimiento Capilar
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div style={{ backgroundColor: '#141414', padding: '10px', borderRadius: '8px', border: '1px solid #333' }}>
                <span style={{ color: '#888', display: 'block', marginBottom: '4px', fontSize: '10px' }}>ÚLTIMA VISITA</span>
                <strong style={{ color: '#fff' }}>{currentClientRecord?.ultimaVisita || 'Sin registro'}</strong>
              </div>
              <div style={{ backgroundColor: '#141414', padding: '10px', borderRadius: '8px', border: '1px solid #d4af37' }}>
                <span style={{ color: '#d4af37', display: 'block', marginBottom: '4px', fontSize: '10px' }}>PRÓXIMA VISITA SUGERIDA</span>
                <strong style={{ color: '#d4af37' }}>{currentClientRecord?.proximaVisitaSugerida || 'Sugerido en 4 semanas'}</strong>
              </div>
            </div>

            <div style={{ backgroundColor: '#141414', padding: '10px', borderRadius: '8px', border: '1px solid #333', fontSize: '12px' }}>
              <span style={{ color: '#888', display: 'block', marginBottom: '4px', fontSize: '10px' }}>DIAGNÓSTICO & NOTAS DE ANA</span>
              <span style={{ color: '#ccc', fontStyle: 'italic' }}>"{currentClientRecord?.diagnostico || 'Sin notas de diagnóstico previo.'}"</span>
            </div>
          </div>

          {/* Asistente IA de Sugerencia de Servicios del Studio */}
          <div style={{ backgroundColor: '#161616', border: '1px solid #d4af37', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '14px', fontFamily: 'serif', margin: 0 }}>
              🤖 Asistente IA de Visagismo & Servicios
            </h3>
            <p style={{ color: '#aaa', fontSize: '11px', margin: 0, lineHeight: '1.4' }}>
              ¿Qué te gustaría hacerte en el cabello o qué cambio buscas? Nuestra IA analizará tu petición y te sugerirá el tratamiento adecuado del catálogo de L'Studio Ana.
            </p>

            <form onSubmit={handleRunAiRecommendation} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea 
                value={clientWishText} 
                onChange={(e) => setClientWishText(e.target.value)} 
                placeholder="Ej. Quiero unas mechas balayage que iluminen mi rostro pero con mantenimiento fácil..." 
                rows={3}
                style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '12px', resize: 'none' }}
              />
              <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                Consultar con la IA de L'Studio Ana ✨
              </button>
            </form>

            {aiRecommendation && (
              <div style={{ backgroundColor: '#1f1a10', border: '1px solid #d4af37', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
                <span style={{ color: '#d4af37', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>Tratamiento Sugerido por la IA:</span>
                <h4 style={{ color: '#fff', fontSize: '13px', margin: 0, fontWeight: 'bold' }}>{aiRecommendation.serviceName}</h4>
                <p style={{ color: '#ccc', fontSize: '11px', margin: 0, lineHeight: '1.4' }}>{aiRecommendation.reason}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button 
                    onClick={() => {
                      const text = encodeURIComponent(`Hola Ana, tras consultar con la IA de la app, me gustaría reservar cita para: ${aiRecommendation.serviceName}`);
                      window.open(`https://wa.me/34${bizConfig.phone}?text=${text}`, '_blank');
                    }}
                    style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Reservar este servicio por WhatsApp →
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCurrentScreen('clientPortal')}
            style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #444', color: '#ccc', padding: '12px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}
          >
            ← Volver al Portal Privado
          </button>
        </div>
      )}

      {/* 2.2. CATÁLOGO DE CLIENTES */}
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

          <form onSubmit={handleAdminLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="password"
              placeholder="PIN de Administración (0000)"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              maxLength={4}
              style={{ padding: '12px', backgroundColor: '#1f1f1f', border: adminError ? '1px solid #ff4444' : '1px solid #444', color: '#fff', borderRadius: '8px', textAlign: 'center', fontSize: '16px', letterSpacing: '4px' }}
            />
            {adminError && <p style={{ color: '#ff4444', fontSize: '11px', margin: 0 }}>PIN de administrador incorrecto.</p>}
            <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
              Acceder al Panel
            </button>
          </form>

          <button onClick={() => setCurrentScreen('clientPin')} style={{ background: 'none', border: 'none', color: '#777', fontSize: '11px', marginTop: '20px', cursor: 'pointer' }}>
            ← Volver al inicio
          </button>
        </div>
      )}

      {/* 4. PANEL DE ADMINISTRACIÓN */}
      {currentScreen === 'adminPanel' && (
        <div style={{ maxWidth: '1200px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '25px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>360STUDIO — PANEL DE CONTROL</h2>
              <p style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>{bizConfig.name}</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPin')} style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              Cerrar Sesión
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setAdminTab('agenda')} style={{ backgroundColor: adminTab === 'agenda' ? '#d4af37' : '#1a1a1a', color: adminTab === 'agenda' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>📅 Agenda</button>
            <button onClick={() => setAdminTab('config')} style={{ backgroundColor: adminTab === 'config' ? '#d4af37' : '#1a1a1a', color: adminTab === 'config' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>⚙️ Configuración</button>
            <button onClick={() => setAdminTab('catalog')} style={{ backgroundColor: adminTab === 'catalog' ? '#d4af37' : '#1a1a1a', color: adminTab === 'catalog' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>📂 Catálogo</button>
            <button onClick={() => setAdminTab('clients')} style={{ backgroundColor: adminTab === 'clients' ? '#d4af37' : '#1a1a1a', color: adminTab === 'clients' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>👥 Clientes</button>
            <button onClick={() => setAdminTab('detractors')} style={{ backgroundColor: adminTab === 'detractors' ? '#d4af37' : '#1a1a1a', color: adminTab === 'detractors' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>⚠️ Buzón Detractores ({feedbackList.filter(f=>f.type==='detractor').length})</button>
            <button onClick={() => setAdminTab('crm')} style={{ backgroundColor: adminTab === 'crm' ? '#d4af37' : '#1a1a1a', color: adminTab === 'crm' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>📊 CRM & KPIs</button>
          </div>

          {/* TAB 1: AGENDA */}
          {adminTab === 'agenda' && (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ width: '260px', backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '15px', boxSizing: 'border-box', height: 'fit-content' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <button onClick={() => cambiarMesMiniCal(-1)} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#d4af37', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>◀</button>
                  <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', fontFamily: 'serif' }}>{nombresMeses[mesMini]} {añoMini}</span>
                  <button onClick={() => cambiarMesMiniCal(1)} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#d4af37', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>▶</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '8px' }}>
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <div key={i} style={{ color: '#777', fontSize: '10px', fontWeight: 'bold' }}>{d}</div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                  {diasRejillaMini.map((dateObj, i) => {
                    if (!dateObj) return <div key={i} />;
                    const isSelected = formatDateKey(dateObj) === formatDateKey(fechaSeleccionada);
                    return (
                      <button
                        key={i}
                        onClick={() => setFechaSeleccionada(dateObj)}
                        style={{
                          backgroundColor: isSelected ? '#d4af37' : '#1c1c1c',
                          color: isSelected ? '#000' : '#ccc',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 0',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 'bold' : 'normal'
                        }}
                      >
                        {dateObj.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: 0 }}>Gestión de Citas y Horarios</h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => {
                      const d = new Date(fechaSeleccionada);
                      d.setDate(d.getDate() - 7);
                      setFechaSeleccionada(d);
                    }} style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>← Semana Anterior</button>
                    <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold' }}>Semana del {semanaActual[0].dateFormatted}</span>
                    <button onClick={() => {
                      const d = new Date(fechaSeleccionada);
                      d.setDate(d.getDate() + 7);
                      setFechaSeleccionada(d);
                    }} style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Semana Siguiente →</button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto', backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(6, minmax(110px, 1fr))', gap: '4px', minWidth: '750px' }}>
                    <div style={{ padding: '8px', textAlign: 'center', color: '#777', fontSize: '11px', fontWeight: 'bold' }}>Hora</div>
                    {semanaActual.map((day, idx) => (
                      <div key={idx} style={{ padding: '8px', textAlign: 'center', backgroundColor: '#1e1e1e', borderRadius: '6px', borderBottom: '2px solid #d4af37' }}>
                        <div style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold' }}>{day.name}</div>
                        <div style={{ color: '#aaa', fontSize: '10px' }}>{day.dateFormatted}</div>
                      </div>
                    ))}

                    {hoursList.map((time, hIdx) => (
                      <React.Fragment key={hIdx}>
                        <div style={{ padding: '10px 4px', textAlign: 'center', color: '#888', fontSize: '11px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {time}
                        </div>
                        {semanaActual.map((day, dIdx) => {
                          const targetKey = formatDateKey(day.dateObj);
                          const appt = appointments.find(a => a.dateKey === targetKey && a.time === time);
                          return (
                            <div
                              key={dIdx}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, day.dateObj, day.name, time)}
                              onClick={() => handleCellClick(day.dateObj, day.name, time)}
                              style={{
                                backgroundColor: appt ? '#221e10' : '#1a1a1a',
                                border: appt ? '1px solid #d4af37' : '1px dashed #2c2c2c',
                                borderRadius: '6px',
                                padding: '8px',
                                minHeight: '45px',
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                              }}
                            >
                              {appt ? (
                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, appt.id)}
                                  title="Arrastra para mover de hora/día o haz clic para ver"
                                  style={{ fontSize: '11px' }}
                                >
                                  <div style={{ color: '#d4af37', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{appt.clientName}</span>
                                    <button onClick={(e) => handleDeleteAppointment(appt.id, e)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                                  </div>
                                  <div style={{ color: '#bbb', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.serviceSubcategory}</div>
                                </div>
                              ) : (
                                <div style={{ color: '#444', fontSize: '10px', textAlign: 'center' }}>+ Libre</div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIGURACIÓN */}
          {adminTab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '10px' }}>
                <button onClick={() => setConfigSubTab('general')} style={{ background: configSubTab === 'general' ? '#d4af37' : 'transparent', color: configSubTab === 'general' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>General (Redes & Maps)</button>
                <button onClick={() => setConfigSubTab('schedule')} style={{ background: configSubTab === 'schedule' ? '#d4af37' : 'transparent', color: configSubTab === 'schedule' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Horarios</button>
                <button onClick={() => setConfigSubTab('branding')} style={{ background: configSubTab === 'branding' ? '#d4af37' : 'transparent', color: configSubTab === 'branding' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Branding & Textos</button>
              </div>

              {savedMsg && (
                <div style={{ padding: '10px', backgroundColor: '#1a331a', border: '1px solid #44bb44', color: '#44bb44', borderRadius: '6px', fontSize: '12px', textAlign: 'center' }}>
                  {savedMsg}
                </div>
              )}

              {configSubTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Nombre del Salón:</label>
                    <input type="text" value={tempConfig.name} onChange={(e) => setTempConfig({ ...tempConfig, name: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Ubicación (Texto visible):</label>
                    <input type="text" value={tempConfig.location} onChange={(e) => setTempConfig({ ...tempConfig, location: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Enlace Google Maps (Ubicación):</label>
                    <input type="text" value={tempConfig.googleMapsUrl} onChange={(e) => setTempConfig({ ...tempConfig, googleMapsUrl: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Enlace Reseñas Google My Business:</label>
                    <input type="text" value={tempConfig.googleReviewUrl} onChange={(e) => setTempConfig({ ...tempConfig, googleReviewUrl: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Enlace Instagram:</label>
                    <input type="text" value={tempConfig.instagramUrl} onChange={(e) => setTempConfig({ ...tempConfig, instagramUrl: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Enlace TikTok:</label>
                    <input type="text" value={tempConfig.tiktokUrl} onChange={(e) => setTempConfig({ ...tempConfig, tiktokUrl: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <button onClick={() => handleSaveSection('Datos Generales y Redes')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Guardar Cambios Generales</button>
                </div>
              )}

              {configSubTab === 'schedule' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Horario Lunes:</label>
                    <input type="text" value={tempConfig.scheduleMonday} onChange={(e) => setTempConfig({ ...tempConfig, scheduleMonday: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Horario Martes y Miércoles:</label>
                    <input type="text" value={tempConfig.scheduleTueWed} onChange={(e) => setTempConfig({ ...tempConfig, scheduleTueWed: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Horario Jueves y Viernes:</label>
                    <input type="text" value={tempConfig.scheduleThuFri} onChange={(e) => setTempConfig({ ...tempConfig, scheduleThuFri: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Horario Sábados:</label>
                    <input type="text" value={tempConfig.scheduleSaturday} onChange={(e) => setTempConfig({ ...tempConfig, scheduleSaturday: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <button onClick={() => handleSaveSection('Horarios')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Guardar Horarios</button>
                </div>
              )}

              {configSubTab === 'branding' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Mensaje de Bienvenida en Portal:</label>
                    <input type="text" value={tempConfig.welcomeMessage} onChange={(e) => setTempConfig({ ...tempConfig, welcomeMessage: e.target.value })} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Descripción del Salón:</label>
                    <textarea value={tempConfig.description} onChange={(e) => setTempConfig({ ...tempConfig, description: e.target.value })} rows={3} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>PIN de Acceso Maestro (4 dígitos):</label>
                    <input type="text" value={tempConfig.masterPin} onChange={(e) => setTempConfig({ ...tempConfig, masterPin: e.target.value })} maxLength={4} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <button onClick={() => handleSaveSection('Branding y Textos')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Guardar Branding</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATÁLOGO */}
          {adminTab === 'catalog' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: 0 }}>Gestión de Catálogo de Servicios</h3>
                <button onClick={() => setIsAddingCategory(true)} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>+ Nueva Categoría</button>
              </div>

              {isAddingCategory && (
                <form onSubmit={handleAddCategorySubmit} style={{ backgroundColor: '#181818', border: '1px solid #d4af37', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: '#d4af37', fontSize: '13px', margin: 0 }}>Añadir Categoría Principal</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Código (ej. 0.10)" value={newCatCode} onChange={(e) => setNewCatCode(e.target.value)} style={{ width: '120px', padding: '8px', backgroundColor: '#141414', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                    <input type="text" placeholder="Título de la Categoría" value={newCatTitle} onChange={(e) => setNewCatTitle(e.target.value)} style={{ flex: 1, padding: '8px', backgroundColor: '#141414', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setIsAddingCategory(false)} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Categoría</button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {catalog.map((cat, catIdx) => (
                  <div key={cat.id} style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                        <input type="text" value={cat.code} onChange={(e) => handleUpdateCategoryCode(cat.id, e.target.value)} style={{ width: '55px', padding: '4px', backgroundColor: '#1c1c1c', border: '1px solid #333', color: '#d4af37', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' }} />
                        <input type="text" value={cat.title} onChange={(e) => handleUpdateCategoryTitle(cat.id, e.target.value)} style={{ flex: 1, padding: '4px 8px', backgroundColor: '#1c1c1c', border: '1px solid #333', color: '#fff', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <button onClick={() => handleMoveCategory(catIdx, -1)} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>▲</button>
                        <button onClick={() => handleMoveCategory(catIdx, 1)} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>▼</button>
                        <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: '#2a1212', border: '1px solid #552222', color: '#ff4444', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Eliminar</button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '15px', borderLeft: '2px solid rgba(212,175,55,0.2)' }}>
                      {cat.subservices.map((sub) => (
                        <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1c1c1c', padding: '8px 12px', borderRadius: '6px', fontSize: '11px' }}>
                          <div>
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>{sub.name}</span>
                            <span style={{ color: '#888', marginLeft: '10px' }}>({sub.duration} — {sub.price})</span>
                          </div>
                          <button onClick={() => handleDeleteSubservice(cat.id, sub.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                        </div>
                      ))}

                      {isAddingSub === cat.id ? (
                        <form onSubmit={(e) => handleAddSubserviceSubmit(cat.id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '6px', border: '1px solid #333', marginTop: '5px' }}>
                          <input type="text" placeholder="Nombre del servicio" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                          <input type="text" placeholder="Descripción breve" value={newSubDesc} onChange={(e) => setNewSubDesc(e.target.value)} style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="text" placeholder="Duración (ej. 45 min)" value={newSubDur} onChange={(e) => setNewSubDur(e.target.value)} style={{ flex: 1, padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                            <input type="text" placeholder="Precio (ej. Desde 35 €)" value={newSubPrice} onChange={(e) => setNewSubPrice(e.target.value)} style={{ flex: 1, padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button type="button" onClick={() => setIsAddingSub(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button>
                            <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Añadir</button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => setIsAddingSub(cat.id)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#d4af37', fontSize: '11px', cursor: 'pointer', padding: '2px 0' }}>+ Añadir servicio a esta categoría</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CLIENTES */}
          {adminTab === 'clients' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: '0 0 4px 0' }}>Base de Clientes & IDs Correlativos</h3>
                  <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>Control de fichas con ID numérico automático, alta de clientas y borrado.</p>
                </div>
                <button 
                  onClick={() => setIsAddingClient(!isAddingClient)}
                  style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isAddingClient ? 'Cancelar' : '+ Dar de Alta Clienta'}
                </button>
              </div>

              {isAddingClient && (
                <form onSubmit={handleGuardarNuevoCliente} style={{ backgroundColor: '#181818', border: '1px solid #d4af37', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: '#d4af37', fontSize: '13px', margin: 0 }}>Nueva Ficha de Clienta (ID Correlativo Automático)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <input type="text" placeholder="Nombre y Apellidos *" value={novoNombre} onChange={(e) => setNovoNombre(e.target.value)} required style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                    <input type="text" placeholder="Teléfono" value={novoTelefono} onChange={(e) => setNovoTelefono(e.target.value)} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                    <input type="email" placeholder="Correo electrónico" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                    <input type="text" placeholder="PIN de acceso (ej. 7009)" maxLength={4} value={novoPin} onChange={(e) => setNovoPin(e.target.value)} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                  </div>
                  <input type="text" placeholder="Diagnóstico capilar o notas iniciales" value={novoDiagnostico} onChange={(e) => setNovoDiagnostico(e.target.value)} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar y Asignar ID</button>
                  </div>
                </form>
              )}

              <div>
                <input 
                  type="text" 
                  placeholder="Buscar por Nombre o ID correlativo..." 
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  style={{ width: '100%', maxWidth: '320px', padding: '8px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {listaClientes
                  .filter(c => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) || c.registroId.toLowerCase().includes(busquedaCliente.toLowerCase()) || String(c.idNum).includes(busquedaCliente))
                  .map((c) => (
                    <div key={c.idNum} style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ backgroundColor: '#262626', color: '#d4af37', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                          ID #{c.idNum} ({c.registroId})
                        </span>
                        <button 
                          onClick={() => handleBorrarCliente(c.idNum)} 
                          title="Eliminar clienta"
                          style={{ background: 'transparent', border: 'none', color: '#ff4444', fontSize: '12px', cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      </div>
                      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', marginTop: '4px' }}>{c.nombre}</div>
                      <div style={{ color: '#aaa', fontSize: '11px' }}>📞 Tel: {c.telefono} | PIN: <strong style={{ color: '#d4af37' }}>{c.pinAcceso}</strong></div>
                      <div style={{ color: '#888', fontSize: '10px', fontStyle: 'italic' }}>Diagnóstico: {c.diagnostico}</div>
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: BUZÓN DE DETRACTORES */}
          {adminTab === 'detractors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: '0 0 4px 0' }}>Buzón Privado de Detractores y Reclamaciones</h3>
                <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>Aquí puedes ver de forma privada las valoraciones negativas o sugerencias de mejora enviadas por clientas.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {feedbackList.filter(f => f.type === 'detractor').length === 0 ? (
                  <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#777', fontSize: '12px' }}>
                    No hay reclamaciones ni detractores registrados. ¡Excelente trabajo!
                  </div>
                ) : (
                  feedbackList.filter(f => f.type === 'detractor').map((fb) => (
                    <div key={fb.id} style={{ backgroundColor: '#1a1414', border: '1px solid #ff4444', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '12px' }}>⚠️ Valoración: {fb.rating} ⭐ ({fb.clientName})</span>
                        <span style={{ color: '#888', fontSize: '10px' }}>{fb.date}</span>
                      </div>
                      <p style={{ color: '#fff', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>"{fb.comment}"</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '5px' }}>
                        <button 
                          onClick={() => setFeedbackList(feedbackList.filter(item => item.id !== fb.id))}
                          style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                        >
                          Resolver / Borrar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CRM & KPIS */}
          {adminTab === 'crm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: 0 }}>Métricas de Negocio & CRM (Editables)</h3>
                <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>Modifica directamente los valores haciendo clic sobre los números.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Visitas a la App</div>
                  <input 
                    type="number" 
                    value={appVisitsCount} 
                    onChange={(e) => setAppVisitsCount(parseInt(e.target.value) || 0)} 
                    style={{ backgroundColor: '#1c1c1c', border: '1px solid #d4af37', color: '#d4af37', fontSize: '26px', fontWeight: 'bold', fontFamily: 'serif', textAlign: 'center', padding: '6px', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Citas en Agenda</div>
                  <div style={{ color: '#d4af37', fontSize: '32px', fontWeight: 'bold', fontFamily: 'serif', padding: '6px' }}>{appointments.length}</div>
                </div>

                <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Demanda Potencial</div>
                  <input 
                    type="number" 
                    value={lostDemandCount} 
                    onChange={(e) => setLostDemandCount(parseInt(e.target.value) || 0)} 
                    style={{ backgroundColor: '#1c1c1c', border: '1px solid #d4af37', color: '#d4af37', fontSize: '26px', fontWeight: 'bold', fontFamily: 'serif', textAlign: 'center', padding: '6px', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL NUEVA CITA */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '16px', padding: '25px', maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: 0 }}>Nueva Cita: {targetDayName} a las {targetTime}</h3>
            
            <form onSubmit={handleSaveModalAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>Nombre de la Clienta:</label>
                <input type="text" placeholder="Ej. Laura M." value={modalClientName} onChange={(e) => setModalClientName(e.target.value)} required style={{ padding: '8px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>Teléfono:</label>
                <input type="text" placeholder="Ej. 600123456" value={modalPhone} onChange={(e) => setModalPhone(e.target.value)} style={{ padding: '8px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>Categoría de Servicio:</label>
                <select value={modalCatIndex} onChange={(e) => { setModalCatIndex(Number(e.target.value)); setModalSubIndex(0); }} style={{ padding: '8px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }}>
                  {catalog.map((cat, idx) => (
                    <option key={cat.id} value={idx}>{cat.code} &lt; {cat.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>Servicio Específico:</label>
                <select value={modalSubIndex} onChange={(e) => setModalSubIndex(Number(e.target.value))} style={{ padding: '8px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }}>
                  {catalog[modalCatIndex]?.subservices.map((sub, idx) => (
                    <option key={sub.id} value={idx}>{sub.name} ({sub.duration})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Cita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER / ELIMINAR CITA EXISTENTE */}
      {viewApptModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '16px', padding: '25px', maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: 0 }}>Detalle de Cita</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#ccc' }}>
              <div><strong style={{ color: '#fff' }}>Clienta:</strong> {viewApptModal.clientName}</div>
              <div><strong style={{ color: '#fff' }}>Teléfono:</strong> {viewApptModal.phone}</div>
              <div><strong style={{ color: '#fff' }}>Día y Hora:</strong> {viewApptModal.dayName} a las {viewApptModal.time}</div>
              <div><strong style={{ color: '#fff' }}>Categoría:</strong> {viewApptModal.serviceCategory}</div>
              <div><strong style={{ color: '#fff' }}>Servicio:</strong> {viewApptModal.serviceSubcategory}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '10px' }}>
              <button onClick={(e) => handleDeleteAppointment(viewApptModal.id, e)} style={{ backgroundColor: '#2a1212', border: '1px solid #ff4444', color: '#ff4444', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar Cita</button>
              <button onClick={() => setViewApptModal(null)} style={{ background: '#1c1c1c', border: '1px solid #444', color: '#fff', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}