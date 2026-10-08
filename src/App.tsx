import React, { useState, useEffect } from 'react';

// ======
// CONFIGURACIÓN DE L'STUDIO ANA
// ======
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
  subtitle: "PORTAL PRIVADO DE CLIENTAS",
  location: "Centro de Elche, Alicante",
  phone: "600000000",
  description: "L'Studio Ana - Hair Experience es una peluquería premium en el centro de Elche, especializada en Balayage de Autor, mechas personalizadas, Babylights, coloración personalizada, técnicas de iluminación y terapias orgánicas.",
  scheduleMonday: "10:00h a 13:30h",
  scheduleTueWed: "10:00h a 18:00h",
  scheduleThuFri: "10:00h a 19:00h",
  scheduleSaturday: "10:00h a 19:00h",
  welcomeMessage: "¡Bienvenida, Ana!",
  masterPin: "0000",
  instagramUrl: "https://instagram.com",
  tiktokUrl: "https://tiktok.com",
  googleMapsUrl: "https://maps.google.com",
  googleReviewUrl: "https://g.page/r/CRLx1fxwplAYEBM/review"
};

interface Appointment {
  id: string;
  dateKey: string;
  dayName: string;
  time: string;
  durationMinutes?: number;
  clientName: string;
  phone: string;
  email: string;
  serviceCategory: string;
  serviceSubcategory: string;
  remindersStatus: {
    email48h: boolean;
    whatsapp48h: boolean;
    whatsapp24h: boolean;
    whatsapp2h: boolean;
  };
}

interface SubService {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  bufferTime?: string;
  includesText?: string;
  achievedText?: string;
  priceType?: 'desde' | 'aprox' | 'fijo' | 'consultar';
}

interface CatalogCategory {
  id: string;
  code: string;
  title: string;
  icon?: string;
  subservices: SubService[];
}

interface ClientRecord {
  idNum: number;
  registroId: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  pinAcceso: string;
  diagnostico: string;
  ultimaVisita: string;
  proximaVisitaSugerida: string;
  formulasAplicadas: string;
  dniCapilar?: string;
  prescripcionCasa?: string;
  pastVisits?: { date: string; service: string; stylist: string; notes: string }[];
}

interface LostDemandRecord {
  id: string;
  date: string;
  clientName: string;
  serviceName: string;
  potentialValue: number;
  reason: 'sin_disponibilidad' | 'abandono_sin_servicio' | 'intento_fallido' | 'otro';
  clientNote: string;
  phone: string;
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
    icon: '✨',
    subservices: [
      {
        id: 's1',
        name: 'DNI Capilar & Estudio Facial',
        description: 'Análisis minucioso de la salud capilar y proporciones del rostro para visagismo.',
        duration: '30 min',
        price: 'Desde 30 €',
        bufferTime: '10 min prep',
        includesText: 'Escaneo capilar digital, test de porosidad y estudio de visagismo facial.',
        achievedText: 'Obtienes tu DNI capilar personalizado y la pauta exacta de cuidado y corte adaptada a tus facciones.',
        priceType: 'desde'
      }
    ]
  },
  {
    id: 'c2',
    code: '0.2',
    title: 'VISAGISMO & CORTE',
    icon: '✂️',
    subservices: [
      {
        id: 's2',
        name: 'Corte de Autor & Visagismo',
        description: 'Corte arquitectónico adaptado a la morfología y estilo de vida.',
        duration: '60 min',
        price: 'Desde 45 €',
        bufferTime: '10 min prep',
        includesText: 'Lavado sensorial, asesoría de visagismo, corte técnico arquitectónico y acabado profesional.',
        achievedText: 'Un estilo único que realza tus facciones y facilita el mantenimiento diario en casa.',
        priceType: 'desde'
      }
    ]
  },
  {
    id: 'c3',
    code: '0.3',
    title: 'STYLING & ACABADO',
    icon: '🌟',
    subservices: [
      {
        id: 's3',
        name: 'Brushing & Styling de Alta Gama',
        description: 'Secado y acabado con ondas o pulido perfecto.',
        duration: '45 min',
        price: 'Desde 35 €',
        bufferTime: '10 min prep',
        includesText: 'Lavado sensorial con champú orgánico, protector térmico y peinado pulido o de ondas de autor.',
        achievedText: 'Melena con brillo espejo, volumen controlado y duración prolongada.',
        priceType: 'desde'
      }
    ]
  },
  {
    id: 'c4',
    code: '0.4',
    title: 'COLOR ATELIER',
    icon: '🎨',
    subservices: [
      {
        id: 's4',
        name: 'Coloración Global & Raíces',
        description: 'Técnica de color de alta precisión con pigmentos de autor.',
        duration: '90 min',
        price: 'Desde 55 €',
        bufferTime: '10 min prep',
        includesText: 'Diagnóstico de color, aplicación de pigmentos de alta fidelidad, emulsión y lavado protector.',
        achievedText: 'Color vibrante, cobertura perfecta y respeto absoluto de la fibra capilar.',
        priceType: 'desde'
      }
    ]
  },
  {
    id: 'c5',
    code: '0.5',
    title: 'MÉTODO DE AUTOR & ILUMINACIÓN',
    icon: '💡',
    subservices: [
      {
        id: 's5',
        name: 'Balayage & Melt & Lights',
        description: 'Fundidos de luz tridimensionales personalizados.',
        duration: '150 min',
        price: 'Consultar',
        bufferTime: '10 min prep',
        includesText: 'Diseño personalizado de mechas, técnica de fundido de luz, matizador dual y tratamiento sellador.',
        achievedText: 'Transiciones de luz naturales y tridimensionales sin efecto raíz marcado.',
        priceType: 'consultar'
      }
    ]
  },
  {
    id: 'c6',
    code: '0.6',
    title: 'SALUD CAPILAR & RECONSTRUCCIÓN',
    icon: '🌿',
    subservices: [
      {
        id: 's6',
        name: 'Protocolo Revivre / Reconstrucción',
        description: 'Tratamiento profundo de nutrición y salud capilar.',
        duration: '60 min',
        price: 'Desde 50 €',
        bufferTime: '10 min prep',
        includesText: 'Baño purificante, infusión de principios activos Revivre y masaje relajante de absorción profunda.',
        achievedText: 'Recuperación de la elasticidad, cuerpo, nutrición y brillo extremo en cabellos castigados.',
        priceType: 'desde'
      }
    ]
  },
  {
    id: 'c7',
    code: '0.7',
    title: 'TEXTURA & MOLDEADO ORGÁNICO',
    icon: '🌊',
    subservices: [
      {
        id: 's7',
        name: 'Moldeado u Ondeado Orgánico',
        description: 'Texturización respetuosa con la fibra capilar.',
        duration: '120 min',
        price: 'Desde 80 €',
        bufferTime: '10 min prep',
        includesText: 'Preparación de la fibra, moldeado orgánico sin amoníaco y fijación con tratamiento de hidratación.',
        achievedText: 'Ondas elásticas, definidas y con movimiento natural sin encrespamiento.',
        priceType: 'desde'
      }
    ]
  },
  {
    id: 'c8',
    code: '0.8',
    title: 'GROOMING & MAN',
    icon: '💈',
    subservices: [
      {
        id: 's8',
        name: 'Corte & Estilismo Masculino',
        description: 'Corte de precisión y acabado para hombre.',
        duration: '40 min',
        price: 'Desde 28 €',
        bufferTime: '10 min prep',
        includesText: 'Lavado vigorizante, corte a tijera/máquina adaptado y acabado con productos de barbería de autor.',
        achievedText: 'Look pulcro, fácil mantenimiento y definición impecable.',
        priceType: 'desde'
      }
    ]
  },
  {
    id: 'c9',
    code: '0.9',
    title: 'ADD-ONS & COMPLEMENTOS',
    icon: '💎',
    subservices: [
      {
        id: 's9',
        name: 'Gloss / Baño de Brillo Exprés',
        description: 'Matizador o brillo instantáneo para sellar cutícula.',
        duration: '20 min',
        price: 'Desde 20 €',
        bufferTime: '10 min prep',
        includesText: 'Aplicación rápida de baño de brillo o matiz en lavacabezas con tiempo de exposición exprés.',
        achievedText: 'Revitalización instantánea del reflejo y sellado de cutícula para un brillo espejo.',
        priceType: 'desde'
      }
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
  { id: '1', dateKey: '2026-10-07', dayName: 'Miércoles', time: '10:00', durationMinutes: 90, clientName: 'Ana', phone: '600000000', email: 'anamorenofernandez79@gmail.com', serviceCategory: '0.1 < VISAGISMO & DIAGNÓSTICO', serviceSubcategory: 'RESERVADO A.M. M.', remindersStatus: { email48h: true, whatsapp48h: true, whatsapp24h: false, whatsapp2h: false } },
  { id: '2', dateKey: '2026-10-07', dayName: 'Miércoles', time: '14:00', durationMinutes: 120, clientName: 'Carmen Martínez', phone: '611222333', email: 'carmen@gmail.com', serviceCategory: '0.4 < COLOR ATELIER', serviceSubcategory: 'RESERVADO M.L. M.L.', remindersStatus: { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false } },
  { id: '3', dateKey: '2026-10-07', dayName: 'Miércoles', time: '16:00', durationMinutes: 60, clientName: 'Lucía R.', phone: '633444555', email: 'lucia@gmail.com', serviceCategory: '0.3 < STYLING & ACABADO', serviceSubcategory: 'RESERVADO I.. M.L.', remindersStatus: { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false } }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'clientPin' | 'clientRegistration' | 'clientPortal' | 'catalogBooking' | 'visualAgenda' | 'clientHistoryPage' | 'adminLogin' | 'adminPanel'>('clientPin');
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [currentClientRecord, setCurrentClientRecord] = useState<ClientRecord | null>(null);
  
  const [regNombre, setRegNombre] = useState('');
  const [regApellidos, setRegApellidos] = useState('');
  const [regNacimiento, setRegNacimiento] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');

  const [selectedServicesToBook, setSelectedServicesToBook] = useState<SubService[]>([]);
  const [expandedSubDetails, setExpandedSubDetails] = useState<{ [key: string]: boolean }>({});
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [bookingDate, setBookingDate] = useState<Date>(new Date(2026, 9, 7));
  const [selectedVisualTime, setSelectedVisualTime] = useState<string>('12:00');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  
  const [editProximaVisita, setEditProximaVisita] = useState('');
  const [editFormulas, setEditFormulas] = useState('');
  const [editMsg, setEditMsg] = useState<string | null>(null);
  
  const [clientWishText, setClientWishText] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState<{ serviceName: string; reason: string; category: string } | null>(null);
  
  const [logoClicks, setLogoClicks] = useState<number>(0);
  const [adminPin, setAdminPin] = useState<string>('');
  const [adminError, setAdminError] = useState<boolean>(false);
  
  const [adminTab, setAdminTab] = useState<'agenda' | 'config' | 'catalog' | 'clients' | 'detractors' | 'crm'>('crm');
  const [configSubTab, setConfigSubTab] = useState<'marca' | 'general' | 'schedule'>('marca');
  
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

  const [isAddingSub, setIsAddingSub] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newSubDur, setNewSubDur] = useState('');
  const [newSubPrice, setNewSubPrice] = useState('');
  const [newSubIncludes, setNewSubIncludes] = useState('');
  const [newSubAchieved, setNewSubAchieved] = useState('');
  const [newSubPriceType, setNewSubPriceType] = useState<'desde' | 'aprox' | 'fijo' | 'consultar'>('desde');

  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatTitle, setNewCatTitle] = useState('');

  const [appVisitsCount, setAppVisitsCount] = useState<number>(() => {
    const saved = localStorage.getItem('lst_app_visits');
    return saved ? parseInt(saved, 10) : 48;
  });

  // Estados nuevos para el CRM Avanzado y Filtros
  const [crmPeriod, setCrmPeriod] = useState<'hoy' | '7d' | '30d' | 'personalizado'>('7d');
  const [crmFilterService, setCrmFilterService] = useState<string>('todos');
  const [crmFilterReason, setCrmFilterReason] = useState<string>('todos');

  const [lostDemandsList, setLostDemandsList] = useState<LostDemandRecord[]>(() => {
    const saved = localStorage.getItem('lst_lost_demands_detailed');
    return saved ? JSON.parse(saved) : [
      { id: '1', date: '22/09/2026', clientName: 'Sonsoles P.', serviceName: 'Balayage & Melt & Lights', potentialValue: 95, reason: 'sin_disponibilidad', clientNote: 'Buscaba hueco en sábado por la mañana pero estaba completo.', phone: '611222333' },
      { id: '2', date: '24/09/2026', clientName: 'Elena G.', serviceName: 'Corte de Autor & Visagismo', potentialValue: 45, reason: 'abandono_sin_servicio', clientNote: 'Entró a ver catálogo de corte pero no concretó reserva.', phone: '622333444' },
      { id: '3', date: '26/09/2026', clientName: 'Beatriz M.', serviceName: 'Coloración Global & Raíces', potentialValue: 55, reason: 'intento_fallido', clientNote: 'Dificultad con el PIN o el flujo de WhatsApp.', phone: '633444555' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('lst_lost_demands_detailed', JSON.stringify(lostDemandsList));
  }, [lostDemandsList]);

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
      clientName: currentClientRecord ? `${currentClientRecord.nombre} (PIN ${currentClientRecord.pinAcceso})` : 'Clienta Verificada',
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

  useEffect(() => {
    localStorage.setItem('lst_studio_appointments', JSON.stringify(appointments));
  }, [appointments]);

  const [listaClientes, setListaClientes] = useState<ClientRecord[]>(() => {
    const saved = localStorage.getItem('lst_studio_clientes_ids');
    return saved ? JSON.parse(saved) : [
      {
        idNum: 1,
        registroId: "LSTUDIO-001",
        nombre: "Ana",
        apellidos: "Moreno Fernández",
        fechaNacimiento: "12/05/1988",
        telefono: "600000000",
        email: "anamorenofernandez79@gmail.com",
        pinAcceso: "7009",
        diagnostico: "Balayage manteca / Cabello sensibilizado",
        ultimaVisita: "15/08/2026",
        proximaVisitaSugerida: "15/10/2026",
        formulasAplicadas: "Raíces 7.0 + Matiz 9.21 con emulsión de autor",
        dniCapilar: "Porosidad: Media | Hidratación: Necesaria | Textura: Fina",
        prescripcionCasa: "Champú Hidratante | Acondicionador Sellador | Sérum Nutritivo",
        pastVisits: [
          { date: "15 Septiembre, 2026", service: "Balayage & Melt & Lights", stylist: "Ana", notes: "Matizado en tonos perla, corte capeado orgánico." },
          { date: "5 Agosto, 2026", service: "Color Atelier", stylist: "Ana", notes: "Balayage efecto sol, sellado de cutícula." },
          { date: "20 Junio, 2026", service: "Visagismo & Diagnóstico", stylist: "Ana", notes: "Diagnóstico: porosidad media, hidratación profunda." }
        ]
      },
      {
        idNum: 2,
        registroId: "LSTUDIO-002",
        nombre: "Carmen",
        apellidos: "Martínez Ruiz",
        fechaNacimiento: "22/11/1990",
        telefono: "+34 633 444 555",
        email: "carmen@gmail.com",
        pinAcceso: "1234",
        diagnostico: "Melt & Lights avellana / Hidratación Profunda",
        ultimaVisita: "01/09/2026",
        proximaVisitaSugerida: "01/10/2026",
        formulasAplicadas: "Balayage enriquecido con proteínas Revivre",
        dniCapilar: "Porosidad: Baja | Hidratación: Óptima",
        prescripcionCasa: "Champú Revivre"
      }
    ];
  });

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [novoNombre, setNovoNombre] = useState('');
  const [novoApellidos, setNovoApellidos] = useState('');
  const [novoNacimiento, setNovoNacimiento] = useState('');
  const [novoTelefono, setNovoTelefono] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoPin, setNovoPin] = useState('');
  const [novoDiagnostico, setNovoDiagnostico] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');

  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editAdminUltimaVisita, setEditAdminUltimaVisita] = useState('');
  const [editAdminProxima, setEditAdminProxima] = useState('');
  const [editAdminFormulas, setEditAdminFormulas] = useState('');

  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null);
  const [newRescheduleTime, setNewRescheduleTime] = useState<string>('10:00');
  const [newRescheduleDate, setNewRescheduleDate] = useState<string>(formatDateKey(new Date()));

  useEffect(() => {
    localStorage.setItem('lst_studio_clientes_ids', JSON.stringify(listaClientes));
  }, [listaClientes]);

  useEffect(() => {
    if (currentClientRecord) {
      setEditProximaVisita(currentClientRecord.proximaVisitaSugerida || '');
      setEditFormulas(currentClientRecord.formulasAplicadas || '');
    }
  }, [currentClientRecord]);

  const handleGuardarCambiosFichaClienta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClientRecord) return;
    const clienteActualizado: ClientRecord = {
      ...currentClientRecord,
      proximaVisitaSugerida: editProximaVisita,
      formulasAplicadas: editFormulas
    };
    const nuevaLista = listaClientes.map(c => c.idNum === clienteActualizado.idNum ? clienteActualizado : c);
    setListaClientes(nuevaLista);
    setCurrentClientRecord(clienteActualizado);
    setEditMsg('¡Ficha, fórmulas y fecha guardadas correctamente!');
    setTimeout(() => setEditMsg(null), 3000);
  };

  const handleGuardarEdicionAdminCliente = (idNum: number) => {
    const nuevaLista = listaClientes.map(c => {
      if (c.idNum === idNum) {
        return {
          ...c,
          ultimaVisita: editAdminUltimaVisita,
          proximaVisitaSugerida: editAdminProxima,
          formulasAplicadas: editAdminFormulas
        };
      }
      return c;
    });
    setListaClientes(nuevaLista);
    setEditingClientId(null);
  };

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
      apellidos: novoApellidos.trim() || 'Sin apellidos',
      fechaNacimiento: novoNacimiento.trim() || '01/01/1990',
      telefono: novoTelefono.trim() || 'No facilitado',
      email: novoEmail.trim() || 'sinemail@gmail.com',
      pinAcceso: novoPin.trim() || '0000',
      diagnostico: novoDiagnostico.trim() || 'Diagnóstico inicial pendiente',
      ultimaVisita: 'Nuevo registro',
      proximaVisitaSugerida: 'Pendiente de agendar',
      formulasAplicadas: 'Sin fórmulas registradas'
    };
    setListaClientes([...listaClientes, nuevoCliente]);
    setNovoNombre('');
    setNovoApellidos('');
    setNovoNacimiento('');
    setNovoTelefono('');
    setNovoEmail('');
    setNovoPin('');
    setNovoDiagnostico('');
    setIsAddingClient(false);
  };

  const handleRegistroClientaPortalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNombre.trim() || !regEmail.trim() || !regPin.trim()) return;
    const siguienteIdNum = listaClientes.length > 0 ? Math.max(...listaClientes.map(c => c.idNum || 0)) + 1 : 1;
    const idFormateado = `LSTUDIO-${String(siguienteIdNum).padStart(3, '0')}`;
    const nuevaClienta: ClientRecord = {
      idNum: siguienteIdNum,
      registroId: idFormateado,
      nombre: regNombre.trim(),
      apellidos: regApellidos.trim(),
      fechaNacimiento: regNacimiento.trim(),
      telefono: regTelefono.trim(),
      email: regEmail.trim(),
      pinAcceso: regPin.trim(),
      diagnostico: 'Primera visita registrada desde app',
      ultimaVisita: 'Nuevo registro',
      proximaVisitaSugerida: 'Pendiente',
      formulasAplicadas: 'Registro inicial completado'
    };
    setListaClientes([...listaClientes, nuevaClienta]);
    setCurrentClientRecord(nuevaClienta);
    setCurrentScreen('clientPortal');
  };

  const handleBorrarCliente = (idNum: number) => {
    if (window.confirm('¿Estás segura de eliminar este cliente de la base de datos?')) {
      setListaClientes(listaClientes.filter(c => c.idNum !== idNum));
    }
  };

  const [draggedApptId, setDraggedApptId] = useState<string | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date(2026, 9, 7));
  const [mesNavegacion, setMesNavegacion] = useState<Date>(new Date(2026, 9, 1));
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [targetDateObj, setTargetDateObj] = useState<Date>(new Date());
  const [targetDayName, setTargetDayName] = useState<string>('');
  const [targetTime, setTargetTime] = useState<string>('');
  const [modalClientName, setModalClientName] = useState<string>('');
  const [modalPhone, setModalPhone] = useState<string>('');
  const [modalEmail, setModalEmail] = useState<string>('');
  const [modalCatIndex, setModalCatIndex] = useState<number>(0);
  const [modalSubIndex, setModalSubIndex] = useState<number>(0);
  const [viewApptModal, setViewApptModal] = useState<Appointment | null>(null);

  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const checkPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (!checkPWA && /Mobile|Android/i.test(navigator.userAgent)) {
      setShowInstallBanner(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lst_master_catalog', JSON.stringify(catalog));
  }, [catalog]);

  useEffect(() => {
    localStorage.setItem('lst_business_config', JSON.stringify(bizConfig));
  }, [bizConfig]);

  useEffect(() => {
    localStorage.setItem('lst_app_visits', appVisitsCount.toString());
  }, [appVisitsCount]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => {
          const clientMatch = listaClientes.find(c => c.pinAcceso === newPin);
          if (clientMatch || newPin === bizConfig.masterPin || newPin === '7009') {
            setPinError(false);
            setPin('');
            setAppVisitsCount(prev => prev + 1);
            setFeedbackSubmitted(false);
            if (clientMatch) {
              setCurrentClientRecord(clientMatch);
              setCurrentScreen('clientPortal');
            } else {
              setCurrentClientRecord(listaClientes[0] || null);
              setCurrentScreen('clientPortal');
            }
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
    if (adminPin === bizConfig.masterPin || adminPin === '7009') {
      setCurrentScreen('adminPanel');
      setAdminError(false);
      setAdminPin('');
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
      window.alert('Ese hueco horario ya está ocupado por otra cita en esta fecha y hora.');
      return;
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, dateKey: targetDateKey, dayName, time } : a));
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
    setModalEmail('');
    setModalCatIndex(0);
    setModalSubIndex(0);
    setIsModalOpen(true);
  };

  const handleSaveModalAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClientName.trim()) return;
    const selectedCategory = catalog[modalCatIndex];
    const selectedSub = selectedCategory?.subservices[modalSubIndex] || { name: 'Servicio general', duration: '45 min' };
    const durMatch = selectedSub.duration.match(/\d+/);
    const durationMin = durMatch ? parseInt(durMatch[0], 10) : 45;
    
    const newApp: Appointment = {
      id: Date.now().toString(),
      dateKey: formatDateKey(targetDateObj),
      dayName: targetDayName,
      time: targetTime,
      durationMinutes: durationMin,
      clientName: modalClientName,
      phone: modalPhone || '600000000',
      email: modalEmail || 'sinemail@gmail.com',
      serviceCategory: `${selectedCategory.code} < ${selectedCategory.title}`,
      serviceSubcategory: `RESERVADO ${selectedSub.name}`,
      remindersStatus: { email48h: true, whatsapp48h: true, whatsapp24h: true, whatsapp2h: true }
    };
    setAppointments([...appointments, newApp]);
    setIsModalOpen(false);
    window.alert(`¡Cita guardada para ${modalClientName}! Ya aparece en la agenda.`);
  };

  const handleConfirmarCitaVisual = () => {
    if (selectedServicesToBook.length === 0) {
      alert('Por favor, selecciona al menos un servicio del catálogo.');
      return;
    }
    const dayNamesMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayNameStr = dayNamesMap[bookingDate.getDay()];
    const dateKeyStr = formatDateKey(bookingDate);
    const subNames = selectedServicesToBook.map(s => s.name).join(', ');
    let totalDurationMinutes = 0;
    selectedServicesToBook.forEach(s => {
      const match = s.duration.match(/\d+/);
      if (match) {
        totalDurationMinutes += parseInt(match[0], 10);
      } else {
        totalDurationMinutes += 45;
      }
    });

    const newApp: Appointment = {
      id: Date.now().toString(),
      dateKey: dateKeyStr,
      dayName: dayNameStr,
      time: selectedVisualTime,
      durationMinutes: totalDurationMinutes,
      clientName: currentClientRecord ? currentClientRecord.nombre + ' ' + currentClientRecord.apellidos : 'Clienta Web',
      phone: currentClientRecord?.telefono || '600000000',
      email: currentClientRecord?.email || 'cliente@gmail.com',
      serviceCategory: 'CATÁLOGO DE AUTOR ONLINE',
      serviceSubcategory: `RESERVADO ${subNames}`,
      remindersStatus: { email48h: true, whatsapp48h: true, whatsapp24h: true, whatsapp2h: true }
    };

    setAppointments([...appointments, newApp]);
    setBookingSuccessMsg(`¡Cita confirmada correctamente para el ${bookingDate.toLocaleDateString('es-ES')} a las ${selectedVisualTime}! Sincronizado con la intranet maestra.`);
    setSelectedServicesToBook([]);
    setCurrentScreen('catalogBooking');
    setTimeout(() => setBookingSuccessMsg(null), 5000);
  };

  const handleDeleteAppointment = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('¿Deseas cancelar esta cita de la agenda?')) {
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
    let formattedPrice = newSubPrice.trim() || 'Consultar';
    if (newSubPriceType === 'desde' && !formattedPrice.toLowerCase().includes('desde')) {
      formattedPrice = `Desde ${formattedPrice}`;
    } else if (newSubPriceType === 'aprox' && !formattedPrice.toLowerCase().includes('aprox')) {
      formattedPrice = `Aprox. ${formattedPrice}`;
    } else if (newSubPriceType === 'consultar') {
      formattedPrice = 'Consultar';
    }

    const newSub: SubService = {
      id: Date.now().toString(),
      name: newSubName,
      description: newSubDesc || 'Sin descripción detallada.',
      duration: newSubDur || '45 min',
      price: formattedPrice,
      bufferTime: '10 min prep',
      includesText: newSubIncludes || 'Lavado sensorial y aplicación técnica profesional.',
      achievedText: newSubAchieved || 'Resultado óptimo de autor con acabado duradero.',
      priceType: newSubPriceType
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
    setNewSubIncludes('');
    setNewSubAchieved('');
    setNewSubPriceType('desde');
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
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00', '19:15', '19:30', '19:45',
    '20:00'
  ];

  const isTimeSlotOccupied = (dateKey: string, timeStr: string) => {
    const [checkHour, checkMin] = timeStr.split(':').map(Number);
    const checkTotalMinutes = checkHour * 60 + checkMin;
    return appointments.some(appt => {
      if (appt.dateKey !== dateKey) return false;
      const [apptHour, apptMin] = appt.time.split(':').map(Number);
      const apptStartMinutes = apptHour * 60 + apptMin;
      const duration = appt.durationMinutes || 45;
      const apptEndMinutes = apptStartMinutes + duration;
      return checkTotalMinutes >= apptStartMinutes && checkTotalMinutes < apptEndMinutes;
    });
  };

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
  const clientNextAppointment = appointments[0];

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', margin: 0, padding: '20px' }}>
      
      {/* 1. ACCESO PIN CLIENTE */}
      {currentScreen === 'clientPin' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '320px', width: '100%' }}>
          <div onClick={handleLogoClick} style={{ textAlign: 'center', marginBottom: '30px', cursor: 'pointer', userSelect: 'none' }} title="L'Studio Ana">
            <h1 style={{ color: '#d4af37', fontSize: '26px', letterSpacing: '4px', margin: '0 0 5px 0', fontFamily: 'serif' }}>L'A</h1>
            <p style={{ color: '#888888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '3px', margin: 0 }}>{bizConfig.subtitle}</p>
          </div>
          <p style={{ color: pinError ? '#ff4444' : '#cccccc', fontSize: '14px', marginBottom: '15px', letterSpacing: '1px', textAlign: 'center' }}>
            {pinError ? 'PIN incorrecto' : 'Introduce tu PIN de acceso'}
          </p>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                width: '14px', height: '14px', borderRadius: '50%',
                border: pinError ? '1px solid #ff4444' : '1px solid #d4af37',
                backgroundColor: i < pin.length ? (pinError ? '#ff4444' : '#d4af37') : '#121212',
                boxShadow: i < pin.length ? '0 0 10px rgba(212,175,55,0.6)' : 'none'
              }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', width: '100%', marginBottom: '20px' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button key={num} onClick={() => handleNumberClick(num)} style={{ width: '65px', height: '65px', borderRadius: '50%', backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', color: '#ffffff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                {num}
              </button>
            ))}
            <button onClick={handleClear} style={{ width: '65px', height: '65px', borderRadius: '50%', backgroundColor: '#141414', border: '1px solid #333', color: '#888', fontSize: '16px', cursor: 'pointer', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
            <button onClick={() => handleNumberClick('0')} style={{ width: '65px', height: '65px', borderRadius: '50%', backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', color: '#ffffff', fontSize: '20px', cursor: 'pointer', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>0</button>
            <button onClick={handleDelete} style={{ width: '65px', height: '65px', borderRadius: '50%', backgroundColor: '#141414', border: '1px solid #333', color: '#888', fontSize: '16px', cursor: 'pointer', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⌫</button>
          </div>
          <button onClick={() => setCurrentScreen('clientRegistration')} style={{ width: '100%', backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}>
            ¿Es tu primera vez? Regístrate aquí
          </button>
          {showInstallBanner && (
            <div style={{ padding: '10px', backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
              <p style={{ color: '#d4af37', fontSize: '11px', margin: '0 0 3px 0', fontWeight: 'bold' }}>Instala la App</p>
              <p style={{ color: '#aaa', fontSize: '10px', margin: 0 }}>Añade a la pantalla de inicio de tu móvil.</p>
            </div>
          )}
        </div>
      )}

      {/* 1.1 PANTALLA DE REGISTRO NUEVA CLIENTA */}
      {currentScreen === 'clientRegistration' && (
        <div style={{ maxWidth: '400px', width: '100%', backgroundColor: '#121212', border: '1px solid #d4af37', borderRadius: '16px', padding: '30px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2 style={{ color: '#d4af37', fontSize: '18px', fontFamily: 'serif', margin: 0, textAlign: 'center' }}>Registro de Nueva Clienta</h2>
          <p style={{ color: '#aaa', fontSize: '11px', textAlign: 'center', margin: '0 0 10px 0' }}>Introduce tus datos por única vez. Quedarás registrada en nuestra base de datos con tu email.</p>
          <form onSubmit={handleRegistroClientaPortalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>Nombre *</label>
              <input type="text" placeholder="Ej. Ana" value={regNombre} onChange={(e) => setRegNombre(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#aaa', fontSize: '11px' }}>Apellidos</label>
              <input type="text" placeholder="Ej. García López" value={regApellidos} onChange={(e) => setRegApellidos(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>Fecha de Nacimiento</label>
                <input type="text" placeholder="DD/MM/AAAA" value={regNacimiento} onChange={(e) => setRegNacimiento(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>Teléfono móvil</label>
                <input type="text" placeholder="600111222" value={regTelefono} onChange={(e) => setRegTelefono(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>Correo Electrónico (Tu identificador único) *</label>
              <input type="email" placeholder="tucorreo@gmail.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>Elige tu PIN de Acceso (4 dígitos) *</label>
              <input type="password" placeholder="Ej. 7009" maxLength={4} value={regPin} onChange={(e) => setRegPin(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #d4af37', color: '#fff', borderRadius: '6px', fontSize: '14px', textAlign: 'center', letterSpacing: '4px' }} />
            </div>
            <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
              Completar Registro y Acceder
            </button>
          </form>
          <button onClick={() => setCurrentScreen('clientPin')} style={{ background: 'none', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer', textAlign: 'center' }}>
            Ya estoy registrada, volver al PIN
          </button>
        </div>
      )}

      {/* 2. PORTAL CLIENTE */}
      {currentScreen === 'clientPortal' && (
        <div style={{ maxWidth: '600px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '25px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>{bizConfig.name}</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>PORTAL PRIVADO DE CLIENTAS</p>
            </div>
            <button onClick={() => { setPin(''); setCurrentScreen('clientPin'); }} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              Salir
            </button>
          </div>
          <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <p style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: '0 0 4px 0', fontWeight: 'bold' }}>
                  {bizConfig.welcomeMessage}
                </p>
                <p style={{ color: '#888', fontSize: '10px', margin: 0 }}>
                  Email registrado: {currentClientRecord?.email || 'anamorenofernandez79@gmail.com'} | ID: #{currentClientRecord?.idNum || '1'}
                </p>
              </div>
              <button onClick={() => setCurrentScreen('clientHistoryPage')} style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                Editar Perfil
              </button>
            </div>
            <div style={{ display: 'flex', gap: '15px', fontSize: '11px', borderTop: '1px solid rgba(212,175,55,0.15)', paddingTop: '10px' }}>
              <a href={`tel:${bizConfig.phone}`} style={{ color: '#d4af37', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Llamar Salón
              </a>
              <a href={`https://wa.me/34${bizConfig.phone}`} target="_blank" rel="noreferrer" style={{ color: '#44bb44', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                WhatsApp
              </a>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button onClick={() => setCurrentScreen('catalogBooking')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '16px 12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
              Ver Catálogo & Reservar Cita
            </button>
            <button onClick={() => setCurrentScreen('clientHistoryPage')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '16px 12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
              Mi Historial & Fórmulas
            </button>
          </div>
          <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold', fontFamily: 'serif' }}>
              Próxima Cita
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#ccc' }}>
                <div>{clientNextAppointment ? `${clientNextAppointment.dateKey} (${clientNextAppointment.dayName})` : '10 de octubre 2026'}</div>
                <div>{clientNextAppointment ? clientNextAppointment.time : '16:00'}</div>
                <div style={{ color: '#fff' }}><strong style={{ color: '#d4af37' }}>Servicio:</strong> {clientNextAppointment?.serviceSubcategory || 'Coloración Global'}</div>
                <div style={{ color: '#888', fontSize: '11px' }}>Stylist: Ana</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {clientNextAppointment && (
                  <button onClick={() => {
                    setRescheduleModalAppt(clientNextAppointment);
                    setNewRescheduleTime(clientNextAppointment.time);
                    setNewRescheduleDate(clientNextAppointment.dateKey);
                  }} style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Modificar Hora
                  </button>
                )}
                <button onClick={() => setCurrentScreen('catalogBooking')} style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Gestionar Cita
                </button>
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', fontFamily: 'serif', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '6px' }}>
              Horarios del Salón:
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href={bizConfig.instagramUrl} target="_blank" rel="noreferrer" style={{ flex: 1, backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}>Instagram</a>
            <a href={bizConfig.tiktokUrl} target="_blank" rel="noreferrer" style={{ flex: 1, backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}>Tik Tok</a>
            <a href={bizConfig.googleMapsUrl} target="_blank" rel="noreferrer" style={{ flex: 1, backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}>Google Maps</a>
          </div>
          <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#d4af37', fontSize: '13px', fontFamily: 'serif', fontWeight: 'bold', letterSpacing: '1px' }}>Déjanos tu opinión & Reseña Google</span>
              <span style={{ color: '#d4af37', fontSize: '12px' }}>▲</span>
            </div>
            {feedbackSubmitted ? (
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#1a261a', border: '1px solid #44bb44', borderRadius: '8px' }}>
                <p style={{ color: '#44bb44', fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>¡Gracias por compartir tu opinión!</p>
                {selectedRating >= 3 && (
                  <a href={bizConfig.googleReviewUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '6px', backgroundColor: '#d4af37', color: '#000', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none' }}>
                    Dejar Reseña en Google
                  </a>
                )}
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  {[
                    { val: 1, label: 'Mala' },
                    { val: 2, label: 'Regular' },
                    { val: 3, label: 'Neutral' },
                    { val: 4, label: 'Buena' },
                    { val: 5, label: 'Excelente' }
                  ].map((item) => (
                    <div key={item.val} onClick={() => handleRatingSelect(item.val)} style={{ textAlign: 'center', cursor: 'pointer', opacity: selectedRating === item.val ? 1 : 0.4, transform: selectedRating === item.val ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s' }}>
                      <div style={{ fontSize: '24px', color: '#d4af37' }}>★</div>
                      <div style={{ fontSize: '10px', color: selectedRating === item.val ? '#d4af37' : '#888', marginTop: '2px' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <input type="text" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} onFocus={(e) => e.target.select()} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', padding: '10px', fontSize: '11px' }} />
                <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Enviar Reseña
                </button>
              </form>
            )}
          </div>
          <div style={{ textAlign: 'center', color: '#666', fontSize: '10px', display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '5px' }}>
            <span>Terms</span>
            <span>Global</span>
            <span>Privacidad</span>
          </div>
        </div>
      )}

      {/* 2.2. CATÁLOGO & RESERVA */}
      {currentScreen === 'catalogBooking' && (
        <div style={{ maxWidth: '700px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '30px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>{bizConfig.name}</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>SELECCIÓN DE SERVICIOS & AGENDA</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPortal')} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              ← Volver al Portal
            </button>
          </div>
          {bookingSuccessMsg && (
            <div style={{ padding: '15px', backgroundColor: '#1a331a', border: '1px solid #44bb44', color: '#44bb44', borderRadius: '8px', fontSize: '12px', textAlign: 'center', lineHeight: '1.5', fontWeight: 'bold' }}>
              {bookingSuccessMsg}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: '16px', fontFamily: 'serif', color: '#fff', marginBottom: '4px' }}>1. Selecciona tus servicios deseados:</h1>
            <p style={{ color: '#888', fontSize: '10px', margin: 0 }}>Despliega cada categoría para ver los servicios y selecciónalos según prefieras.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {catalog.map((cat) => {
              const isCategoryExpanded = !!expandedCategories[cat.id];
              return (
                <div key={cat.id} style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div onClick={() => setExpandedCategories({ ...expandedCategories, [cat.id]: !isCategoryExpanded })} style={{ padding: '14px 18px', backgroundColor: '#181818', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{cat.icon || '✨'}</span> {cat.title} ({cat.subservices.length} servicios)
                    </span>
                    <span style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>{isCategoryExpanded ? 'Ocultar' : 'Desplegar'}</span>
                  </div>
                  {isCategoryExpanded && (
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(212,175,55,0.2)', maxHeight: '300px', overflowY: 'auto', backgroundColor: '#121212' }}>
                      {cat.subservices.map((sub) => {
                        const isSelected = selectedServicesToBook.some(s => s.id === sub.id);
                        const isExpanded = !!expandedSubDetails[sub.id];
                        return (
                          <div key={sub.id} style={{ backgroundColor: isSelected ? '#252012' : '#141414', border: isSelected ? '1px solid #d4af37' : '1px solid #333', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div onClick={() => {
                                if (isSelected) {
                                  setSelectedServicesToBook(selectedServicesToBook.some(s => s.id === sub.id) ? selectedServicesToBook.filter(s => s.id !== sub.id) : [...selectedServicesToBook, sub]);
                                } else {
                                  setSelectedServicesToBook([...selectedServicesToBook, sub]);
                                }
                              }} style={{ flex: 1, cursor: 'pointer' }}>
                                <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{sub.name}</div>
                                <div style={{ color: '#888', fontSize: '10px' }}>{sub.duration} - <strong style={{ color: '#d4af37' }}>{sub.price}</strong></div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button onClick={(e) => { e.stopPropagation(); setExpandedSubDetails({ ...expandedSubDetails, [sub.id]: !isExpanded }); }} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                                  {isExpanded ? 'Ocultar info' : 'Saber más ▼'}
                                </button>
                                <div onClick={() => {
                                  if (isSelected) {
                                    setSelectedServicesToBook(selectedServicesToBook.filter(s => s.id !== sub.id));
                                  } else {
                                    setSelectedServicesToBook([...selectedServicesToBook, sub]);
                                  }
                                }} style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid #d4af37', backgroundColor: isSelected ? '#d4af37' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                  {isSelected ? '✓' : ''}
                                </div>
                              </div>
                            </div>
                            {isExpanded && (
                              <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '6px', fontSize: '11px', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid #d4af37', marginTop: '4px' }}>
                                <div><strong style={{ color: '#d4af37' }}>Descripción:</strong> {sub.description}</div>
                                {sub.includesText && <div><strong style={{ color: '#d4af37' }}>Qué incluye:</strong> {sub.includesText}</div>}
                                {sub.achievedText && <div><strong style={{ color: '#d4af37' }}>Qué se consigue:</strong> {sub.achievedText}</div>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '14px', fontFamily: 'serif', color: '#d4af37', margin: 0 }}>2. Selecciona Fecha y Hora Laboral:</h2>
            {selectedServicesToBook.length === 0 ? (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,12,12,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '20px', textAlign: 'center' }}>
                <span style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold', fontFamily: 'serif', letterSpacing: '1px', textShadow: '0 0 10px rgba(212,175,55,0.4)' }}>
                  SELECCIONA UN SERVICIO PARA ACTIVAR ESTE PASO
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ color: '#ccc', fontSize: '11px', margin: 0 }}>¡Servicio seleccionado! Accede a la agenda visual interactiva con franjas de 15 min.</p>
                <button onClick={() => setCurrentScreen('visualAgenda')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}>
                  📅 Abrir Agenda Visual Interactiva
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2.4. AGENDA VISUAL INTERACTIVA */}
      {currentScreen === 'visualAgenda' && (
        <div style={{ maxWidth: '680px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '16px', padding: '25px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', display: 'block' }}>PORTAL PRIVADO DE CLIENTAS</span>
              <h2 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: '2px 0 0 0' }}>{bizConfig.name}</h2>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px', padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: '#d4af37', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>GESTIONAR CITA ACTUAL</span>
                <div style={{ display: 'flex', gap: '10px', fontSize: '10px' }}>
                  <button onClick={() => {
                    if (clientNextAppointment) {
                      setRescheduleModalAppt(clientNextAppointment);
                      setNewRescheduleTime(clientNextAppointment.time);
                      setNewRescheduleDate(clientNextAppointment.dateKey);
                    } else {
                      alert('No hay cita actual activa.');
                    }
                  }} style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}>Modificar Hora</button>
                  <span style={{ color: '#444' }}>|</span>
                  <button onClick={() => {
                    if (clientNextAppointment) {
                      handleDeleteAppointment(clientNextAppointment.id);
                    } else {
                      alert('No hay cita actual activa para cancelar.');
                    }
                  }} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', textDecoration: 'underline' }}>Cancelar Cita</button>
                </div>
              </div>
              <button onClick={() => setCurrentScreen('catalogBooking')} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
                ← Volver a Selección
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold', fontFamily: 'serif' }}>
              MI AGENDA VISUAL: {bookingDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <input type="date" value={formatDateKey(bookingDate)} onChange={(e) => setBookingDate(new Date(e.target.value))} style={{ backgroundColor: '#181818', border: '1px solid #d4af37', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }} />
          </div>
          <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {hoursList.map((time) => {
              const targetKey = formatDateKey(bookingDate);
              const isOccupied = isTimeSlotOccupied(targetKey, time);
              const isSelectedVisual = selectedVisualTime === time;
              return (
                <div key={time} style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
                  <span style={{ color: '#888', fontSize: '10px', width: '45px', fontWeight: 'bold' }}>{time}h</span>
                  <div style={{ flex: 1 }}>
                    {isOccupied ? (
                      <div style={{ backgroundColor: '#211d12', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.95, pointerEvents: 'none' }}>
                        <span style={{ color: '#d4af37', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>OCUPADO</span>
                        <span style={{ color: '#888', fontSize: '9px' }}>NO DISPONIBLE</span>
                      </div>
                    ) : (
                      <div onClick={() => setSelectedVisualTime(time)} style={{ backgroundColor: isSelectedVisual ? '#2a2412' : '#1c1c1c', border: isSelectedVisual ? '2px solid #d4af37' : '1px dashed rgba(212,175,55,0.3)', borderRadius: '6px', padding: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <span style={{ color: isSelectedVisual ? '#fff' : '#d4af37', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
                          {isSelectedVisual ? `HUECO SELECCIONADO (${time})` : 'HUECO LIBRE'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '5px' }}>
            <button onClick={() => setCurrentScreen('catalogBooking')} style={{ backgroundColor: '#222', border: '1px solid #444', color: '#aaa', padding: '12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              SELECCIONA HUECO
            </button>
            <button onClick={handleConfirmarCitaVisual} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}>
              CONFIRMAR CITA: {bookingDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric' })}, {selectedVisualTime}
            </button>
          </div>
        </div>
      )}

      {/* 2.3. HISTORIAL DE CLIENTE */}
      {currentScreen === 'clientHistoryPage' && (
        <div style={{ maxWidth: '700px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '30px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>Hola, {currentClientRecord?.nombre || 'Clienta'}</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>ID #{currentClientRecord?.idNum || '1'} ({currentClientRecord?.registroId || 'LSTUDIO-001'}) - Ficha Personal y Fórmulas</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPortal')} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              ← Volver al Portal
            </button>
          </div>
          <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: 0 }}>Mi Pasaporte de Experiencias de Autor</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['[Septiembre]', '[Agosto]', '[Junio]'].map((mes, idx) => (
                <div key={idx} style={{ backgroundColor: idx === 0 ? '#d4af37' : '#1c1c1c', color: idx === 0 ? '#000' : '#d4af37', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '20px', padding: '6px 14px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {mes}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              {currentClientRecord?.pastVisits && currentClientRecord.pastVisits.length > 0 ? (
                currentClientRecord.pastVisits.map((v, i) => (
                  <div key={i} style={{ backgroundColor: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong style={{ color: '#d4af37' }}>Visita:</strong> {v.date}</div>
                    <div><strong style={{ color: '#d4af37' }}>Servicio:</strong> {v.service}</div>
                    <div><strong style={{ color: '#d4af37' }}>Estilista:</strong> {v.stylist}</div>
                    <div><strong style={{ color: '#d4af37' }}>Notas de Estilo:</strong> {v.notes}</div>
                  </div>
                ))
              ) : (
                <div style={{ backgroundColor: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong style={{ color: '#d4af37' }}>Estilista:</strong> Ana</div>
                  <div><strong style={{ color: '#d4af37' }}>Notas de Estilo:</strong> Matizado en tonos perla, corte capeado orgánico.</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>DNI Capilar Activo</div>
              <div style={{ color: '#ccc', fontSize: '11px' }}>{currentClientRecord?.dniCapilar || 'Porosidad: Media | Hidratación: Necesaria | Textura: Fina'}</div>
            </div>
            <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Mantenimiento en Casa</div>
              <div style={{ color: '#ccc', fontSize: '11px' }}>{currentClientRecord?.prescripcionCasa || 'Champú Hidratante | Acondicionador Sellador'}</div>
            </div>
          </div>
          {editMsg && (
            <div style={{ padding: '10px', backgroundColor: '#1a331a', border: '1px solid #44bb44', color: '#44bb44', borderRadius: '6px', fontSize: '12px', textAlign: 'center' }}>
              {editMsg}
            </div>
          )}
          <form onSubmit={handleGuardarCambiosFichaClienta} style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '14px', fontFamily: 'serif', margin: 0, borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '8px' }}>
              Fórmulas y Próxima Visita (Modo Manual)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>Última Visita Registrada:</label>
                <input type="text" value={currentClientRecord?.ultimaVisita || ''} disabled style={{ backgroundColor: '#121212', border: '1px solid #333', color: '#888', padding: '8px', borderRadius: '6px', fontSize: '11px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>Próxima Visita Sugerida:</label>
                <input type="text" value={editProximaVisita} onChange={(e) => setEditProximaVisita(e.target.value)} onFocus={(e) => e.target.select()} placeholder="Ej. 15/10/2026" style={{ backgroundColor: '#121212', border: '1px solid #d4af37', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '11px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>Fórmulas Aplicadas & Diagnóstico:</label>
              <textarea value={editFormulas} onChange={(e) => setEditFormulas(e.target.value)} onFocus={(e) => e.target.select()} rows={2} placeholder="Introduce fórmulas..." style={{ backgroundColor: '#121212', border: '1px solid #d4af37', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '11px', resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                Guardar Fórmulas y Fecha
              </button>
            </div>
          </form>
          <div style={{ backgroundColor: '#161616', border: '1px solid #d4af37', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '14px', fontFamily: 'serif', margin: 0 }}>
              Asistente IA de Visagismo & Recomendación
            </h3>
            <form onSubmit={handleRunAiRecommendation} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea value={clientWishText} onChange={(e) => setClientWishText(e.target.value)} onFocus={(e) => e.target.select()} placeholder="Ej. Quiero matizar mi rubio..." rows={2} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '11px', resize: 'none' }} />
              <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                Consultar con la IA
              </button>
            </form>
            {aiRecommendation && (
              <div style={{ backgroundColor: '#1f1a10', border: '1px solid #d4af37', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
                <span style={{ color: '#d4af37', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>Tratamiento Sugerido:</span>
                <h4 style={{ color: '#fff', fontSize: '13px', margin: 0, fontWeight: 'bold' }}>{aiRecommendation.serviceName}</h4>
                <p style={{ color: '#ccc', fontSize: '11px', margin: 0, lineHeight: '1.4' }}>{aiRecommendation.reason}</p>
              </div>
            )}
          </div>
          <button onClick={() => setCurrentScreen('clientPortal')} style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #444', color: '#ccc', padding: '12px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}>
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
            <input type="password" placeholder="PIN de Administración (0000)" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} onFocus={(e) => e.target.select()} maxLength={4} style={{ padding: '12px', backgroundColor: '#1f1f1f', border: adminError ? '1px solid #ff4444' : '1px solid #444', color: '#fff', borderRadius: '8px', textAlign: 'center', fontSize: '16px', letterSpacing: '4px' }} />
            {adminError && <p style={{ color: '#ff4444', fontSize: '11px', margin: 0 }}>PIN de administrador incorrecto.</p>}
            <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
              Acceder al Panel Maestro
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
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>360STUDIO - PORTAL MAESTRO (INTRANET)</h2>
              <p style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>{bizConfig.name} - Sincronizado en tiempo real</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPin')} style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              Cerrar Sesión
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setAdminTab('agenda')} style={{ backgroundColor: adminTab === 'agenda' ? '#d4af37' : '#1a1a1a', color: adminTab === 'agenda' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Agenda Maestra</button>
            <button onClick={() => setAdminTab('config')} style={{ backgroundColor: adminTab === 'config' ? '#d4af37' : '#1a1a1a', color: adminTab === 'config' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Configuración</button>
            <button onClick={() => setAdminTab('catalog')} style={{ backgroundColor: adminTab === 'catalog' ? '#d4af37' : '#1a1a1a', color: adminTab === 'catalog' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Catálogo</button>
            <button onClick={() => setAdminTab('clients')} style={{ backgroundColor: adminTab === 'clients' ? '#d4af37' : '#1a1a1a', color: adminTab === 'clients' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Clientes</button>
            <button onClick={() => setAdminTab('detractors')} style={{ backgroundColor: adminTab === 'detractors' ? '#d4af37' : '#1a1a1a', color: adminTab === 'detractors' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>⚠️ Buzón ({feedbackList.filter(f => f.type === 'detractor').length})</button>
            <button onClick={() => setAdminTab('crm')} style={{ backgroundColor: adminTab === 'crm' ? '#d4af37' : '#1a1a1a', color: adminTab === 'crm' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>CRM & KPIs</button>
          </div>

          {/* TAB 1: AGENDA MAESTRA */}
          {adminTab === 'agenda' && (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ width: '260px', backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '15px', boxSizing: 'border-box', height: 'fit-content' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <button onClick={() => cambiarMesMiniCal(-1)} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#d4af37', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>◄</button>
                  <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', fontFamily: 'serif' }}>{nombresMeses[mesMini]} {añoMini}</span>
                  <button onClick={() => cambiarMesMiniCal(1)} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#d4af37', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>►</button>
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
                      <button key={i} onClick={() => setFechaSeleccionada(dateObj)} style={{ backgroundColor: isSelected ? '#d4af37' : '#1c1c1c', color: isSelected ? '#000' : '#ccc', border: 'none', borderRadius: '4px', padding: '6px 0', fontSize: '11px', cursor: 'pointer', fontWeight: isSelected ? 'bold' : 'normal' }}>
                        {dateObj.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: 0 }}>Agenda Maestra (Control Total & Sincronizada)</h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => { const d = new Date(fechaSeleccionada); d.setDate(d.getDate() - 7); setFechaSeleccionada(d); }} style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>◄ Anterior</button>
                    <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold' }}>Semana del {semanaActual[0].dateFormatted}</span>
                    <button onClick={() => { const d = new Date(fechaSeleccionada); d.setDate(d.getDate() + 7); setFechaSeleccionada(d); }} style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Siguiente ►</button>
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
                        <div style={{ padding: '8px 4px', textAlign: 'center', color: '#888', fontSize: '10px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {time}
                        </div>
                        {semanaActual.map((day, dIdx) => {
                          const targetKey = formatDateKey(day.dateObj);
                          const appt = appointments.find(a => a.dateKey === targetKey && a.time === time);
                          const occupiedByDuration = isTimeSlotOccupied(targetKey, time);
                          return (
                            <div key={dIdx} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, day.dateObj, day.name, time)} onClick={() => handleCellClick(day.dateObj, day.name, time)} style={{ backgroundColor: appt ? '#221e10' : (occupiedByDuration ? '#1a1510' : '#1a1a1a'), border: appt ? '1px solid #d4af37' : (occupiedByDuration ? '1px dashed #554422' : '1px dashed #2c2c2c'), borderRadius: '6px', padding: '6px', minHeight: '35px', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              {appt ? (
                                <div draggable onDragStart={(e) => handleDragStart(e, appt.id)} title="Arrastra para mover a cualquier hora u otro día" style={{ fontSize: '10px' }}>
                                  <div style={{ color: '#d4af37', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{appt.clientName}</span>
                                    <button onClick={(e) => handleDeleteAppointment(appt.id, e)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '10px', cursor: 'pointer' }}>X</button>
                                  </div>
                                  <div style={{ color: '#bbb', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.serviceSubcategory}</div>
                                </div>
                              ) : occupiedByDuration ? (
                                <div style={{ color: '#a68a4c', fontSize: '9px', textAlign: 'center', fontStyle: 'italic' }}>Ocupado</div>
                              ) : (
                                <div style={{ color: '#444', fontSize: '9px', textAlign: 'center' }}>+ Libre</div>
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
              <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setConfigSubTab('marca')} style={{ background: configSubTab === 'marca' ? '#d4af37' : 'transparent', color: configSubTab === 'marca' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Marca & Identidad</button>
                <button onClick={() => setConfigSubTab('general')} style={{ background: configSubTab === 'general' ? '#d4af37' : 'transparent', color: configSubTab === 'general' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>General, Redes & PIN Maestro</button>
                <button onClick={() => setConfigSubTab('schedule')} style={{ background: configSubTab === 'schedule' ? '#d4af37' : 'transparent', color: configSubTab === 'schedule' ? '#000' : '#ccc', border: '1px solid rgba(212,175,55,0.3)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Horarios & Zona Horaria</button>
              </div>
              {savedMsg && (
                <div style={{ padding: '10px', backgroundColor: '#1a331a', border: '1px solid #44bb44', color: '#44bb44', borderRadius: '6px', fontSize: '12px', textAlign: 'center' }}>
                  {savedMsg}
                </div>
              )}
              
              {configSubTab === 'marca' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: 0 }}>Gestor de Marca</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: '15px', alignItems: 'stretch' }}>
                    <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                      <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', alignSelf: 'flex-start' }}>Logotipo de la Marca</span>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '1px solid #d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37', fontSize: '20px', fontFamily: 'serif' }}>L'A</div>
                      <button type="button" onClick={() => alert('Función de subida de logotipo')} style={{ backgroundColor: 'transparent', border: '1px solid rgba(212,175,55,0.4)', color: '#d4af37', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>✎ Editar</button>
                    </div>

                    <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                      <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', alignSelf: 'flex-start' }}>Cabecera Principal</span>
                      <div style={{ width: '100%', height: '70px', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37', fontSize: '14px', letterSpacing: '2px', fontFamily: 'serif' }}>L'STUDIO</div>
                      <button type="button" onClick={() => alert('Función de edición de cabecera')} style={{ backgroundColor: 'transparent', border: '1px solid rgba(212,175,55,0.4)', color: '#d4af37', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>✎ Editar</button>
                    </div>

                    <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>Vista Previa del Portal</span>
                      <div style={{ width: '100%', backgroundColor: '#000', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '10px', padding: '12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ textAlign: 'center', fontSize: '11px', color: '#d4af37', fontFamily: 'serif', fontWeight: 'bold' }}>L'STUDIO ANA</div>
                        <div style={{ textAlign: 'center', fontSize: '8px', color: '#888', letterSpacing: '1px' }}>PORTAL PRIVADO</div>
                        <div style={{ backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '6px', padding: '8px' }}>
                          <div style={{ fontSize: '10px', color: '#d4af37', fontWeight: 'bold' }}>{tempConfig.name}</div>
                          <div style={{ fontSize: '8px', color: '#aaa' }}>{tempConfig.location}</div>
                        </div>
                        <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '2px', width: '80%' }}></div>
                        <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '2px', width: '60%' }}></div>
                        <div style={{ backgroundColor: '#d4af37', color: '#000', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', padding: '6px', borderRadius: '4px', marginTop: '4px' }}>Reservar Cita</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '20px' }}>
                    <span style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold' }}>Detalles del Salón</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#aaa', fontSize: '11px' }}>Nombre oficial</label>
                      <input type="text" value={tempConfig.name} onChange={(e) => setTempConfig({ ...tempConfig, name: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#aaa', fontSize: '11px' }}>Descripción Corporativa</label>
                      <textarea value={tempConfig.description} onChange={(e) => setTempConfig({ ...tempConfig, description: e.target.value })} onFocus={(e) => e.target.select()} rows={3} style={{ padding: '10px', backgroundColor: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px', resize: 'vertical' }} />
                    </div>
                  </div>

                  <button onClick={() => handleSaveSection('Cambios de Marca')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}>
                    Guardar Cambios de Marca
                  </button>
                </div>
              )}

              {configSubTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Nombre del Salón:</label>
                    <input type="text" value={tempConfig.name} onChange={(e) => setTempConfig({ ...tempConfig, name: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Ubicación:</label>
                    <input type="text" value={tempConfig.location} onChange={(e) => setTempConfig({ ...tempConfig, location: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Enlace Google Maps:</label>
                    <input type="text" value={tempConfig.googleMapsUrl} onChange={(e) => setTempConfig({ ...tempConfig, googleMapsUrl: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Enlace Reseñas Google My Business:</label>
                    <input type="text" value={tempConfig.googleReviewUrl} onChange={(e) => setTempConfig({ ...tempConfig, googleReviewUrl: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  
                  <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '10px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <h4 style={{ color: '#d4af37', fontSize: '13px', margin: 0, fontFamily: 'serif' }}>Gestión de Contraseña PIN de Administrador (Maestro)</h4>
                    <p style={{ color: '#aaa', fontSize: '11px', margin: 0 }}>Modifica el PIN de 4 dígitos para acceder al panel de gestión.</p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input type="password" maxLength={4} placeholder="Nuevo PIN" id="inputNuevoMasterPin" style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #d4af37', color: '#fff', borderRadius: '6px', fontSize: '14px', width: '140px', textAlign: 'center', letterSpacing: '6px' }} />
                      <button type="button" onClick={() => {
                        const inputEl = document.getElementById('inputNuevoMasterPin') as HTMLInputElement;
                        const val = inputEl?.value;
                        if (val && val.length === 4 && !isNaN(Number(val))) {
                          setTempConfig(prev => ({ ...prev, masterPin: val }));
                          setBizConfig(prev => ({ ...prev, masterPin: val }));
                          setSavedMsg('¡PIN maestro actualizado con éxito!');
                          inputEl.value = '';
                          setTimeout(() => setSavedMsg(null), 3000);
                        } else {
                          alert('Introduce un PIN válido compuesto estrictamente por 4 números.');
                        }
                      }} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Actualizar PIN
                      </button>
                    </div>
                  </div>

                  <button onClick={() => handleSaveSection('Datos Generales, Redes y PIN')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '10px' }}>Guardar Cambios Generales</button>
                </div>
              )}

              {configSubTab === 'schedule' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Horario Lunes:</label>
                    <input type="text" value={tempConfig.scheduleMonday} onChange={(e) => setTempConfig({ ...tempConfig, scheduleMonday: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Horario Martes y Miércoles:</label>
                    <input type="text" value={tempConfig.scheduleTueWed} onChange={(e) => setTempConfig({ ...tempConfig, scheduleTueWed: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Horario Jueves y Viernes:</label>
                    <input type="text" value={tempConfig.scheduleThuFri} onChange={(e) => setTempConfig({ ...tempConfig, scheduleThuFri: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Horario Sábados:</label>
                    <input type="text" value={tempConfig.scheduleSaturday} onChange={(e) => setTempConfig({ ...tempConfig, scheduleSaturday: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <button onClick={() => handleSaveSection('Horarios')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Guardar Horarios</button>
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
                    <input type="text" placeholder="Código (ej. 0.10)" value={newCatCode} onChange={(e) => setNewCatCode(e.target.value)} onFocus={(e) => e.target.select()} style={{ width: '120px', padding: '8px', backgroundColor: '#141414', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                    <input type="text" placeholder="Título de la Categoría" value={newCatTitle} onChange={(e) => setNewCatTitle(e.target.value)} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: '8px', backgroundColor: '#141414', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setIsAddingCategory(false)} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Categoría</button>
                  </div>
                </form>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {catalog.map((cat, catIdx) => {
                  const isCategoryExpandedAdmin = !!expandedCategories[`admin_cat_${cat.id}`];
                  return (
                    <div key={cat.id} style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                          <input type="text" value={cat.code} onChange={(e) => handleUpdateCategoryCode(cat.id, e.target.value)} onFocus={(e) => e.target.select()} style={{ width: '55px', padding: '4px', backgroundColor: '#1c1c1c', border: '1px solid #333', color: '#d4af37', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' }} />
                          <input type="text" value={cat.title} onChange={(e) => handleUpdateCategoryTitle(cat.id, e.target.value)} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: '4px 8px', backgroundColor: '#1c1c1c', border: '1px solid #333', color: '#fff', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          <button onClick={() => setExpandedCategories({ ...expandedCategories, [`admin_cat_${cat.id}`]: !isCategoryExpandedAdmin })} style={{ background: '#1c1c1c', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>
                            {isCategoryExpandedAdmin ? 'Ocultar ▲' : 'Ver Servicios ▼'}
                          </button>
                          <button onClick={() => handleMoveCategory(catIdx, -1)} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>▲</button>
                          <button onClick={() => handleMoveCategory(catIdx, 1)} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>▼</button>
                          <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: '#2a1212', border: '1px solid #552222', color: '#ff4444', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Eliminar</button>
                        </div>
                      </div>
                      {isCategoryExpandedAdmin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '15px', borderLeft: '2px solid rgba(212,175,55,0.2)', marginTop: '8px' }}>
                          {cat.subservices.map((sub) => {
                            const isExpandedAdmin = !!expandedSubDetails[`admin_${sub.id}`];
                            return (
                              <div key={sub.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#1c1c1c', padding: '10px 12px', borderRadius: '6px', fontSize: '11px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ flex: 1 }}>
                                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{sub.name}</span>
                                    <span style={{ color: '#888', marginLeft: '10px' }}>({sub.duration} - <strong style={{ color: '#d4af37' }}>{sub.price}</strong>)</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button onClick={() => setExpandedSubDetails({ ...expandedSubDetails, [`admin_${sub.id}`]: !isExpandedAdmin })} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', fontSize: '10px', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}>
                                      {isExpandedAdmin ? 'Ocultar ▲' : 'Ver info ▼'}
                                    </button>
                                    <button onClick={() => handleDeleteSubservice(cat.id, sub.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '11px' }}>X</button>
                                  </div>
                                </div>
                                {isExpandedAdmin && (
                                  <div style={{ backgroundColor: '#141414', padding: '8px', borderRadius: '4px', fontSize: '10px', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '3px', borderLeft: '2px solid #d4af37', marginTop: '4px' }}>
                                    <div><strong style={{ color: '#d4af37' }}>Descripción:</strong> {sub.description}</div>
                                    {sub.includesText && <div><strong style={{ color: '#d4af37' }}>Incluye:</strong> {sub.includesText}</div>}
                                    {sub.achievedText && <div><strong style={{ color: '#d4af37' }}>Se consigue:</strong> {sub.achievedText}</div>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {isAddingSub === cat.id ? (
                            <form onSubmit={(e) => handleAddSubserviceSubmit(cat.id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '6px', border: '1px solid #333', marginTop: '5px' }}>
                              <h5 style={{ color: '#d4af37', fontSize: '12px', margin: 0 }}>Nuevo Subservicio</h5>
                              <input type="text" placeholder="Nombre del servicio" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                              <input type="text" placeholder="Descripción breve" value={newSubDesc} onChange={(e) => setNewSubDesc(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="text" placeholder="Duración (ej. 45 min)" value={newSubDur} onChange={(e) => setNewSubDur(e.target.value)} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select value={newSubPriceType} onChange={(e) => setNewSubPriceType(e.target.value as any)} style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#d4af37', borderRadius: '4px', fontSize: '11px' }}>
                                  <option value="desde">Desde</option>
                                  <option value="aprox">Aprox.</option>
                                  <option value="fijo">Fijo</option>
                                  <option value="consultar">Consultar</option>
                                </select>
                                <input type="text" placeholder="Precio (ej. 45 €)" value={newSubPrice} onChange={(e) => setNewSubPrice(e.target.value)} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                              </div>
                              <input type="text" placeholder="Qué incluye el servicio..." value={newSubIncludes} onChange={(e) => setNewSubIncludes(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                              <input type="text" placeholder="Qué se consigue con él..." value={newSubAchieved} onChange={(e) => setNewSubAchieved(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button type="button" onClick={() => setIsAddingSub(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Añadir Subservicio</button>
                              </div>
                            </form>
                          ) : (
                            <button onClick={() => setIsAddingSub(cat.id)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#d4af37', fontSize: '11px', cursor: 'pointer', padding: '2px 0' }}>+ Añadir servicio a esta categoría</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CLIENTES */}
          {adminTab === 'clients' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: '0 0 4px 0' }}>Base de Clientes & Fichas Técnicas de Autor</h3>
                  <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>Consulta rápida, historial, fórmulas aplicadas y control de PIN de acceso.</p>
                </div>
                <button onClick={() => setIsAddingClient(!isAddingClient)} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isAddingClient ? 'Cancelar' : '+ Dar de Alta Clienta'}
                </button>
              </div>
              {isAddingClient && (
                <form onSubmit={handleGuardarNuevoCliente} style={{ backgroundColor: '#181818', border: '1px solid #d4af37', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: '#d4af37', fontSize: '13px', margin: 0 }}>Nueva Ficha de Clienta</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <input type="text" placeholder="Nombre *" value={novoNombre} onChange={(e) => setNovoNombre(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                    <input type="text" placeholder="Apellidos" value={novoApellidos} onChange={(e) => setNovoApellidos(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                    <input type="text" placeholder="Fecha Nacimiento" value={novoNacimiento} onChange={(e) => setNovoNacimiento(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                    <input type="text" placeholder="Teléfono" value={novoTelefono} onChange={(e) => setNovoTelefono(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                    <input type="email" placeholder="Email (Identificador) *" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                    <input type="text" placeholder="PIN acceso (4 dígs)" maxLength={4} value={novoPin} onChange={(e) => setNovoPin(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                  </div>
                  <input type="text" placeholder="Diagnóstico capilar o notas" value={novoDiagnostico} onChange={(e) => setNovoDiagnostico(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Clienta</button>
                  </div>
                </form>
              )}
              <div>
                <input type="text" placeholder="Buscar por Nombre, Email, Teléfono o ID..." value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)} onFocus={(e) => e.target.select()} style={{ width: '100%', maxWidth: '350px', padding: '8px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '11px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {listaClientes
                  .filter(c =>
                    c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
                    c.apellidos.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
                    c.email.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
                    c.telefono.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
                    c.registroId.toLowerCase().includes(busquedaCliente.toLowerCase())
                  )
                  .map((c) => {
                    const isEditing = editingClientId === c.idNum;
                    return (
                      <div key={c.idNum} style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ backgroundColor: '#262626', color: '#d4af37', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                              ID #{c.idNum} ({c.registroId})
                            </span>
                            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{c.nombre} {c.apellidos}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => {
                              if (isEditing) {
                                setEditingClientId(null);
                              } else {
                                setEditingClientId(c.idNum);
                                setEditAdminUltimaVisita(c.ultimaVisita);
                                setEditAdminProxima(c.proximaVisitaSugerida);
                                setEditAdminFormulas(c.formulasAplicadas);
                              }
                            }} style={{ background: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                              {isEditing ? 'Cerrar Edición' : 'Editar Ficha / Fórmulas'}
                            </button>
                            <button onClick={() => handleBorrarCliente(c.idNum)} title="Eliminar clienta" style={{ background: 'transparent', border: 'none', color: '#ff4444', fontSize: '14px', cursor: 'pointer' }}> X </button>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '11px', color: '#aaa', backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '6px' }}>
                          <div><strong>Email:</strong> {c.email}</div>
                          <div><strong>Teléfono:</strong> {c.telefono}</div>
                          <div><strong>PIN Acceso:</strong> <span style={{ color: '#d4af37', fontWeight: 'bold' }}>{c.pinAcceso}</span></div>
                          <div><strong>F. Nacimiento:</strong> {c.fechaNacimiento}</div>
                        </div>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#1f1a10', padding: '12px', borderRadius: '8px', border: '1px solid #d4af37' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ color: '#d4af37', fontSize: '10px', display: 'block', marginBottom: '2px' }}>Última Visita:</label>
                                <input type="text" value={editAdminUltimaVisita} onChange={(e) => setEditAdminUltimaVisita(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                              </div>
                              <div>
                                <label style={{ color: '#d4af37', fontSize: '10px', display: 'block', marginBottom: '2px' }}>Próxima Visita Sugerida:</label>
                                <input type="text" value={editAdminProxima} onChange={(e) => setEditAdminProxima(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px' }} />
                              </div>
                            </div>
                            <div>
                              <label style={{ color: '#d4af37', fontSize: '10px', display: 'block', marginBottom: '2px' }}>Fórmulas Aplicadas & Diagnóstico:</label>
                              <textarea value={editAdminFormulas} onChange={(e) => setEditAdminFormulas(e.target.value)} rows={2} style={{ width: '100%', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '11px', resize: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                              <button onClick={() => setEditingClientId(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button>
                              <button onClick={() => handleGuardarEdicionAdminCliente(c.idNum)} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Cambios en Ficha</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#ccc', borderLeft: '2px solid #d4af37', paddingLeft: '10px' }}>
                            <div><strong style={{ color: '#d4af37' }}>Última Visita:</strong> {c.ultimaVisita} | <strong style={{ color: '#d4af37' }}>Próxima Sugerida:</strong> {c.proximaVisitaSugerida}</div>
                            <div><strong style={{ color: '#d4af37' }}>Diagnóstico / Fórmulas:</strong> {c.formulasAplicadas}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 5: BUZÓN DE DETRACTORES */}
          {adminTab === 'detractors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: '0 0 4px 0' }}>Buzón Privado de Detractores y Reclamaciones</h3>
                <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>Aquí puedes ver de forma privada las valoraciones negativas o sugerencias de mejora.</p>
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
                        <span style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '12px' }}>Valoración: {fb.rating} ({fb.clientName})</span>
                        <span style={{ color: '#888', fontSize: '10px' }}>{fb.date}</span>
                      </div>
                      <p style={{ color: '#fff', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>"{fb.comment}"</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '5px' }}>
                        <button onClick={() => setFeedbackList(feedbackList.filter(item => item.id !== fb.id))} style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>
                          Resolver/Borrar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CRM & KPIS (DASHBOARD MEJORADO CON FILTROS, GRÁFICA, MOTIVOS, OPORTUNIDADES Y INSIGHTS) */}
          {adminTab === 'crm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Cabecera & Selector de Periodo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: '0 0 4px 0' }}>Panel CRM & Analítica de Demanda</h3>
                  <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>Monitorización de conversiones, oportunidades recuperables e insights de negocio.</p>
                </div>
                <div style={{ display: 'flex', gap: '6px', backgroundColor: '#181818', padding: '4px', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.3)' }}>
                  {(['hoy', '7d', '30d', 'personalizado'] as const).map((p) => (
                    <button key={p} onClick={() => setCrmPeriod(p)} style={{ backgroundColor: crmPeriod === p ? '#d4af37' : 'transparent', color: crmPeriod === p ? '#000' : '#ccc', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase' }}>
                      {p === '7d' ? '7 días' : p === '30d' ? '30 días' : p === 'hoy' ? 'Hoy' : 'Personalizado'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtros por Fecha, Servicio y Motivo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', backgroundColor: '#161616', padding: '12px', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: '#d4af37', fontSize: '10px', fontWeight: 'bold' }}>Filtrar por Servicio:</label>
                  <select value={crmFilterService} onChange={(e) => setCrmFilterService(e.target.value)} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', padding: '6px', borderRadius: '6px', fontSize: '11px' }}>
                    <option value="todos">Todos los servicios</option>
                    <option value="Balayage">Balayage & Melt & Lights</option>
                    <option value="Corte">Corte de Autor</option>
                    <option value="Color">Coloración Global</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: '#d4af37', fontSize: '10px', fontWeight: 'bold' }}>Filtrar por Motivo de Pérdida:</label>
                  <select value={crmFilterReason} onChange={(e) => setCrmFilterReason(e.target.value)} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', padding: '6px', borderRadius: '6px', fontSize: '11px' }}>
                    <option value="todos">Todos los motivos</option>
                    <option value="sin_disponibilidad">Sin disponibilidad</option>
                    <option value="abandono_sin_servicio">Abandono de reserva</option>
                    <option value="intento_fallido">Error / Problema técnico</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: '#d4af37', fontSize: '10px', fontWeight: 'bold' }}>Rango de Fechas:</label>
                  <input type="date" style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', padding: '6px', borderRadius: '6px', fontSize: '11px' }} />
                </div>
              </div>

              {/* KPIs Superiores (Visitas, Citas Agendadas, Tasa de Conversión, Demanda Perdida) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '18px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Visitas Web / App</div>
                  <input type="number" value={appVisitsCount} onChange={(e) => setAppVisitsCount(parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} style={{ backgroundColor: '#1c1c1c', border: '1px solid #d4af37', color: '#d4af37', fontSize: '24px', fontWeight: 'bold', fontFamily: 'serif', textAlign: 'center', padding: '4px', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '18px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Citas Agendadas</div>
                  <div style={{ color: '#d4af37', fontSize: '28px', fontWeight: 'bold', fontFamily: 'serif', padding: '4px' }}>{appointments.length}</div>
                </div>
                <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '18px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Tasa de Conversión</div>
                  <div style={{ color: '#44bb44', fontSize: '28px', fontWeight: 'bold', fontFamily: 'serif', padding: '4px' }}>
                    {appVisitsCount > 0 ? `${((appointments.length / appVisitsCount) * 100).toFixed(1)}%` : '0%'}
                  </div>
                </div>
                <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '18px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Demanda Perdida</div>
                  <div style={{ color: '#ff4444', fontSize: '28px', fontWeight: 'bold', fontFamily: 'serif', padding: '4px' }}>{lostDemandsList.length}</div>
                </div>
              </div>

              {/* Sección de Gráfica Sencilla de Evolución */}
              <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ color: '#d4af37', fontSize: '13px', fontFamily: 'serif', margin: 0 }}>Evolución Semanal (Visitas vs Citas vs Demanda Perdida)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
                  {[
                    { label: 'Lunes', visits: 12, appts: 3, lost: 1 },
                    { label: 'Martes', visits: 18, appts: 5, lost: 0 },
                    { label: 'Miércoles', visits: 15, appts: 4, lost: 2 },
                    { label: 'Jueves', visits: 22, appts: 7, lost: 1 },
                    { label: 'Viernes', visits: 30, appts: 9, lost: 3 },
                    { label: 'Sábado', visits: 45, appts: 12, lost: 5 }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
                      <span style={{ color: '#aaa', width: '70px', fontWeight: 'bold' }}>{item.label}</span>
                      <div style={{ flex: 1, display: 'flex', height: '14px', backgroundColor: '#1c1c1c', borderRadius: '4px', overflow: 'hidden', gap: '2px' }}>
                        <div style={{ width: `${item.visits * 2}%`, backgroundColor: '#d4af37', title: `Visitas: ${item.visits}` }} />
                        <div style={{ width: `${item.appts * 5}%`, backgroundColor: '#44bb44', title: `Citas: ${item.appts}` }} />
                        <div style={{ width: `${item.lost * 5}%`, backgroundColor: '#ff4444', title: `Perdidas: ${item.lost}` }} />
                      </div>
                      <span style={{ color: '#888', width: '90px', textAlign: 'right' }}>{item.visits}v / {item.appts}c</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '15px', fontSize: '10px', color: '#aaa', justifyContent: 'center', marginTop: '5px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#d4af37', borderRadius: '50%' }} /> Visitas</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#44bb44', borderRadius: '50%' }} /> Citas Agendadas</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#ff4444', borderRadius: '50%' }} /> Demanda Perdida</span>
                </div>
              </div>

              {/* Sección de Motivos Agrupados de Demanda Perdida */}
              <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ color: '#d4af37', fontSize: '13px', fontFamily: 'serif', margin: 0 }}>Motivos de Demanda Perdida Agrupados</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ backgroundColor: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold' }}>Sin disponibilidad</div>
                    <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{lostDemandsList.filter(l => l.reason === 'sin_disponibilidad').length + 2} casos</div>
                    <div style={{ color: '#888', fontSize: '10px' }}>Principalmente sábados por la mañana</div>
                  </div>
                  <div style={{ backgroundColor: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold' }}>Abandono de reserva</div>
                    <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{lostDemandsList.filter(l => l.reason === 'abandono_sin_servicio').length + 1} casos</div>
                    <div style={{ color: '#888', fontSize: '10px' }}>Salieron en la selección de servicios</div>
                  </div>
                  <div style={{ backgroundColor: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold' }}>Error / problema técnico</div>
                    <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{lostDemandsList.filter(l => l.reason === 'intento_fallido').length} casos</div>
                    <div style={{ color: '#888', fontSize: '10px' }}>Dificultades con PIN o flujo</div>
                  </div>
                </div>
              </div>

              {/* Sección de Oportunidades Recuperables con Valor Potencial y Botones */}
              <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ color: '#d4af37', fontSize: '13px', fontFamily: 'serif', margin: 0 }}>Oportunidades Recuperables (Valor Potencial Total: <strong style={{ color: '#44bb44' }}>195 €</strong>)</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {lostDemandsList.map((item) => (
                    <div key={item.id} style={{ backgroundColor: '#1c1c1c', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{item.clientName}</span>
                          <span style={{ color: '#44bb44', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#1a261a', padding: '2px 8px', borderRadius: '4px' }}>Valor: {item.potentialValue} €</span>
                        </div>
                        <div style={{ color: '#d4af37', fontSize: '11px' }}>Servicio: {item.serviceName}</div>
                        <div style={{ color: '#888', fontSize: '10px' }}>Motivo: {item.reason.replace('_', ' ')} | Nota: "{item.clientNote}"</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => alert(`Abriendo ficha de cliente para ${item.clientName}`)} style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                          Ver cliente
                        </button>
                        <button onClick={() => {
                          setAdminTab('agenda');
                        }} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                          Buscar hueco
                        </button>
                        <a href={`https://wa.me/34${item.phone}?text=${encodeURIComponent(`Hola ${item.clientName}, vimos que no pudiste concretar tu cita para ${item.serviceName} en L'Studio Ana. ¿Te ayudamos a buscar un hueco esta semana?`)}`} target="_blank" rel="noreferrer" style={{ backgroundColor: '#1a331a', border: '1px solid #44bb44', color: '#44bb44', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                          Contactar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección de Insights con Avisos Automáticos */}
              <div style={{ backgroundColor: '#1f1a10', border: '1px solid #d4af37', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ color: '#d4af37', fontSize: '13px', fontFamily: 'serif', margin: 0 }}>💡 Insights & Avisos Automáticos de IA</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#ccc', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><strong style={{ color: '#fff' }}>"La mayoría de pérdidas se producen los sábados."</strong> (Considera abrir turno intensivo o ampliar franjas).</li>
                  <li><strong style={{ color: '#fff' }}>"Hay mucha demanda entre las 10:00 y 12:00."</strong> (Franja horaria preferida por tus clientas de Balayage).</li>
                  <li><strong style={{ color: '#fff' }}>"Puedes recuperar aproximadamente 195 €"</strong> contactando hoy mismo con las 3 oportunidades pendientes de cierre.</li>
                </ul>
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
                <label style={{ color: '#aaa', fontSize: '11px' }}>Nombre y Apellidos:</label>
                <input type="text" placeholder="Ej. Laura M." value={modalClientName} onChange={(e) => setModalClientName(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '8px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>Teléfono móvil:</label>
                <input type="text" placeholder="Ej. 600123456" value={modalPhone} onChange={(e) => setModalPhone(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '8px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>Email (para recordatorio 48h):</label>
                <input type="email" placeholder="cliente@gmail.com" value={modalEmail} onChange={(e) => setModalEmail(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '8px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
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

      {/* MODAL VER / ELIMINAR / RECORDATORIOS DE CITA EXISTENTE */}
      {viewApptModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '16px', padding: '25px', maxWidth: '380px', width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: 0 }}>Detalle de Cita & Recordatorios</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#ccc' }}>
              <div><strong style={{ color: '#fff' }}>Clienta:</strong> {viewApptModal.clientName}</div>
              <div><strong style={{ color: '#fff' }}>Teléfono:</strong> {viewApptModal.phone}</div>
              <div><strong style={{ color: '#fff' }}>Email:</strong> {viewApptModal.email}</div>
              <div><strong style={{ color: '#fff' }}>Día y Hora:</strong> {viewApptModal.dayName} ({viewApptModal.dateKey}) a las {viewApptModal.time} ({viewApptModal.durationMinutes || 45} min)</div>
              <div><strong style={{ color: '#fff' }}>Servicio:</strong> {viewApptModal.serviceSubcategory}</div>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <a href={`https://wa.me/34${viewApptModal.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${viewApptModal.clientName}, te recordamos tu cita en L'Studio Ana para el ${viewApptModal.dateKey} a las ${viewApptModal.time}. ¡Te esperamos!`)}`} target="_blank" rel="noreferrer" style={{ flex: 1, backgroundColor: '#1a331a', border: '1px solid #44bb44', color: '#44bb44', padding: '8px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' }}>
                  💬 Enviar WhatsApp
                </a>
                <a href={`mailto:${viewApptModal.email}?subject=${encodeURIComponent("Recordatorio de Cita - L'Studio Ana")}&body=${encodeURIComponent(`Hola ${viewApptModal.clientName},\n\nTe recordamos tu cita reservada en L'Studio Ana para el día ${viewApptModal.dateKey} a las ${viewApptModal.time}.\n\nServicio:${viewApptModal.serviceSubcategory}\n\n¡Gracias por confiar en nosotros!`)}`} style={{ flex: 1, backgroundColor: '#1a2233', border: '1px solid #4488ff', color: '#4488ff', padding: '8px', borderRadius: '6px', textAlign: 'center', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' }}>
                  ✉️ Enviar Email
                </a>
              </div>

              <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '6px', border: '1px solid #333', marginTop: '5px' }}>
                <div style={{ color: '#d4af37', fontWeight: 'bold', marginBottom: '4px' }}>Estado de Automatizaciones:</div>
                <div style={{ fontSize: '11px', color: '#44bb44' }}>Email 48h antes: Programado</div>
                <div style={{ fontSize: '11px', color: '#44bb44' }}>WhatsApp 48h antes: Programado</div>
                <div style={{ fontSize: '11px', color: '#44bb44' }}>WhatsApp 24h antes: Programado</div>
                <div style={{ fontSize: '11px', color: '#44bb44' }}>WhatsApp 2h antes: Programado (Crítico)</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '10px' }}>
              <button onClick={(e) => handleDeleteAppointment(viewApptModal.id, e)} style={{ backgroundColor: '#2a1212', border: '1px solid #ff4444', color: '#ff4444', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar Cita</button>
              <button onClick={() => {
                const apptToChange = viewApptModal;
                setViewApptModal(null);
                setRescheduleModalAppt(apptToChange);
                setNewRescheduleTime(apptToChange.time);
                setNewRescheduleDate(apptToChange.dateKey);
              }} style={{ backgroundColor: '#2a2212', border: '1px solid #d4af37', color: '#d4af37', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Modificar Hora</button>
              <button onClick={() => setViewApptModal(null)} style={{ background: '#1c1c1c', border: '1px solid #444', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA MODIFICAR HORA DE CITA (ADMIN Y CLIENTA) */}
      {rescheduleModalAppt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1100 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '16px', padding: '25px', maxWidth: '380px', width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: 0 }}>Modificar Horario de Cita</h3>
            <p style={{ color: '#aaa', fontSize: '11px', margin: 0 }}>Clienta: <strong style={{ color: '#fff' }}>{rescheduleModalAppt.clientName}</strong></p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>Nueva Fecha:</label>
              <input type="date" value={newRescheduleDate} onChange={(e) => setNewRescheduleDate(e.target.value)} style={{ padding: '8px', backgroundColor: '#1c1c1c', border: '1px solid #d4af37', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>Nueva Hora:</label>
              <select value={newRescheduleTime} onChange={(e) => setNewRescheduleTime(e.target.value)} style={{ padding: '8px', backgroundColor: '#1c1c1c', border: '1px solid #d4af37', color: '#fff', borderRadius: '6px', fontSize: '12px' }}>
                {hoursList.map(h => (
                  <option key={h} value={h}>{h}h</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setRescheduleModalAppt(null)} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={() => {
                const dayNamesMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                const parts = newRescheduleDate.split('-');
                let dayNameStr = rescheduleModalAppt.dayName;
                if (parts.length === 3) {
                  const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  dayNameStr = dayNamesMap[dObj.getDay()];
                }
                
                setAppointments(appointments.map(a => a.id === rescheduleModalAppt.id ? { ...a, dateKey: newRescheduleDate, dayName: dayNameStr, time: newRescheduleTime } : a));
                setRescheduleModalAppt(null);
                alert('¡Cita modificada de hora y fecha con éxito!');
              }} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Cambio</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}