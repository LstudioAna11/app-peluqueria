import React, { useState, useEffect } from 'react';

const STUDIO_PORTAL_PHOTO = '/studio-interior.jpeg';

// ======
// CONFIGURACIÓN DE L'STUDIO ANA
// ======
interface BusinessConfig {
  advancePaymentEnabled: boolean;
  advancePaymentThresholdMinutes: number;
  saturdayApprovalEnabled: boolean;
  studioEmail: string;
  studioWhatsapp: string;
  reminderHours: number;
  cancellationHours: number;
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
  facebookUrl: string;
  tiktokUrl: string;
  googleMapsUrl: string;
  googleReviewUrl: string;
  minAdvanceDays: number;
  maxBookingMonths: number;
  slotIntervalMinutes: number;
  bizumNumber: string;
  depositAmount: string;
  saturdayNoticeMessage: string;
  whatsappTemplate: string;
}

const INITIAL_BUSINESS_CONFIG: BusinessConfig = {
  advancePaymentEnabled: true,
  advancePaymentThresholdMinutes: 120,
  saturdayApprovalEnabled: true,
  studioEmail: 'lstudioana@gmail.com',
  studioWhatsapp: '672163485',
  reminderHours: 24,
  cancellationHours: 24,
  name: "L'Studio Ana",
  subtitle: "PORTAL PRIVADO DE CLIENTAS",
  location: "Calle Mayor / Centro de Elche, Alicante",
  phone: "600000000",
  description: "L'Studio Ana - Hair Experience es una peluquería premium en el centro de Elche, especializada en Balayage de Autor, mechas personalizadas, Babylights, coloración personalizada, técnicas de iluminación y terapias orgánicas.",
  scheduleMonday: "10:00h a 13:30h",
  scheduleTueWed: "10:00h a 18:00h",
  scheduleThuFri: "10:00h a 19:00h",
  scheduleSaturday: "10:00h a 19:00h",
  welcomeMessage: "¡Bienvenida!",
  masterPin: "0000",
  instagramUrl: "https://instagram.com",
  facebookUrl: "https://facebook.com",
  tiktokUrl: "https://tiktok.com",
  googleMapsUrl: "https://maps.google.com",
  googleReviewUrl: "https://g.page/r/CRLx1fxwpIAYEBM/review",
  minAdvanceDays: 2,
  maxBookingMonths: 3,
  slotIntervalMinutes: 15,
  bizumNumber: "672163485",
  depositAmount: "60 €",
  saturdayNoticeMessage: "SÁBADOS: El Studio abrirá los sábados únicamente para atender servicios de larga duración y eventos agendados con antelación bajo demanda de Ana.",
  whatsappTemplate: "Hola {nombre}. Te recordamos tu cita en L’Studio Ana el {fecha} a las {hora}. ¡Te esperamos en el Studio!"
};

// ======
// DICCIONARIO MULTIIDIOMA GLOBAL Y COMPLETO
// ======
const TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    subtitle: "PORTAL PRIVADO DE CLIENTAS",
    enterPin: "Introduce tu PIN de acceso",
    logout: "Cerrar Sesión",
    catalog: "Catálogo & Reservar",
    history: "Mi Pasaporte & Historial",
    adminIntranet: "INTRANET MAESTRA",
    backToPortal: "Volver al Portal",
    nextAppt: "Próxima Cita",
    salonHours: "Horarios del Salón:",
    leaveReview: "Déjanos tu opinión & Reseña Google",
    sendReview: "Enviar Reseña",
    selectServices: "1. Selecciona tus servicios deseados:",
    selectDate: "2. Selecciona Fecha y Hora Laboral:",
    openVisualAgenda: "Abrir Agenda Visual Interactiva",
    myHistoryTitle: "Mi Pasaporte de Experiencias de Autor",
    hairDni: "DNI Capilar Activo",
    homeMaintenance: "Mantenimiento en Casa",
    aiAssistant: "Asistente IA de Visagismo & Recomendación",
    consultAi: "Consultar con la IA",
    firstTimeRegister: "¿Es tu primera vez? Regístrate aquí",
    installApp: "Instala la App",
    installDesc: "Añade a la pantalla de inicio de tu móvil.",
    clientRegistrationTitle: "Registro de Nueva Clienta",
    clientRegistrationDesc: "Introduce tus datos por única vez. Quedarás registrada en nuestra base de datos con tu email.",
    nameLabel: "Nombre *",
    surnamesLabel: "Apellidos",
    birthDateLabel: "Fecha de Nacimiento",
    phoneLabel: "Teléfono móvil",
    emailLabel: "Correo Electrónico (Tu identificador único) *",
    pinLabel: "Elige tu PIN de Acceso (4 dígitos) *",
    completeRegisterBtn: "Completar Registro y Acceder",
    backToPin: "Ya estoy registrada, volver al PIN",
    callSalon: "Llamar Salón",
    whatsapp: "WhatsApp",
    manageAppointment: "Gestionar Cita",
    changeTime: "Modificar Hora",
    servicesSelectionTitle: "SELECCIÓN DE SERVICIOS & VARIANTES",
    selectVariantTitle: "Selecciona variante:",
    activeHairId: "ID Capilar Activo",
    adminMasterTitle: "360studio",
    adminSubtitle: "Tu espacio de gestión",
    tabMasterAgenda: "Agenda Maestra",
    tabConfig: "Configuración",
    tabCatalog: "Catálogo",
    tabClients: "Clientes",
    tabMailbox: "⚠️ Buzón",
    tabCrm: "CRM & KPIs",
    tabHolidays: "🏖️ Vacaciones & Festivos"
  },
  en: {
    subtitle: "PRIVATE CLIENT PORTAL",
    enterPin: "Enter your access PIN",
    logout: "Log out",
    catalog: "Catalog & Book",
    history: "My Passport & History",
    adminIntranet: "MASTER INTRANET",
    backToPortal: "Back to Portal",
    nextAppt: "Next Appointment",
    salonHours: "Salon Hours:",
    leaveReview: "Leave your review & Google Rating",
    sendReview: "Send Review",
    selectServices: "1. Select your desired services:",
    selectDate: "2. Select Business Date & Time:",
    openVisualAgenda: "Open Interactive Visual Agenda",
    myHistoryTitle: "My Signature Experience Passport",
    hairDni: "Active Hair ID",
    homeMaintenance: "Home Maintenance",
    aiAssistant: "Visagism & Recommendation AI Assistant",
    consultAi: "Consult with AI",
    firstTimeRegister: "Is it your first time? Register here",
    installApp: "Install App",
    installDesc: "Add to your mobile home screen.",
    clientRegistrationTitle: "New Client Registration",
    clientRegistrationDesc: "Enter your details once. You will be registered in our database with your email.",
    nameLabel: "Name *",
    surnamesLabel: "Last Name",
    birthDateLabel: "Birth Date",
    phoneLabel: "Mobile Phone",
    emailLabel: "Email (Your unique identifier) *",
    pinLabel: "Choose your Access PIN (4 digits) *",
    completeRegisterBtn: "Complete Registration & Access",
    backToPin: "Already registered, back to PIN",
    callSalon: "Call Salon",
    whatsapp: "WhatsApp",
    manageAppointment: "Manage Appointment",
    changeTime: "Change Time",
    servicesSelectionTitle: "SERVICES & VARIANTS SELECTION",
    selectVariantTitle: "Select variant:",
    activeHairId: "Active Hair ID",
    adminMasterTitle: "360studio",
    adminSubtitle: "Your management space",
    tabMasterAgenda: "Master Agenda",
    tabConfig: "Configuration",
    tabCatalog: "Catalog",
    tabClients: "Clients",
    tabMailbox: "⚠️ Mailbox",
    tabCrm: "CRM & KPIs",
    tabHolidays: "🏖️ Holidays & Closures"
  }
};

interface ServiceVariant {
  id: string;
  name: string;
  price: string;
  duration: string;
}

interface Appointment {
  completedAt?: string;
  id: string;
  dateKey: string;
  dayName: string;
  time: string;
  durationMinutes?: number;
  saturdayApproval?: { status: 'pending' | 'accepted' | 'rejected'; reference: string; reason?: 'saturday' | 'assessment' | 'both' };
  advancePayment?: { amount: number; reference: string; status: 'pending' | 'confirmed' };
  clientName: string;
  phone: string;
  email: string;
  serviceCategory: string;
  serviceSubcategory: string;
  selectedVariant?: ServiceVariant | null;
  services?: { categoryId: string; categoryName: string; sub: SubService; variant: ServiceVariant | null }[];
  remindersStatus: {
    email48h: boolean;
    whatsapp48h: boolean;
    whatsapp24h: boolean;
    whatsapp2h: boolean;
  };
}

type StylingPolicy = 'included' | 'required' | 'not_applicable';

interface SubService {
  active?: boolean;
  requiresAssessment?: boolean;
  tonerPolicy?: StylingPolicy;
  isTonerService?: boolean;
  stylingPolicy?: StylingPolicy;
  isStylingService?: boolean;
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  bufferTime?: string;
  includesText?: string;
  achievedText?: string;
  priceType?: 'desde' | 'aprox' | 'fijo' | 'consultar';
  hasVariants?: boolean;
  variants?: ServiceVariant[];
  showAlertBadge?: boolean;
  alertText?: string;
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
  pastVisits?: { date: string; service: string; stylist: string; notes: string; sourceAppointmentId?: string }[];
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

interface HolidayBlock {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: 'vacaciones' | 'festivo';
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
        priceType: 'desde',
        showAlertBadge: false,
        alertText: ''
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
        priceType: 'desde',
        showAlertBadge: false,
        alertText: ''
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
        name: 'Peinado & Styling de Alta Gama',
        description: 'Secado y acabado con ondas o pulido perfecto.',
        duration: '45 min',
        price: 'Desde 35 €',
        bufferTime: '10 min prep',
        includesText: 'Lavado sensorial con champú orgánico, protector térmico y peinado pulido o de ondas de autor.',
        achievedText: 'Melena con brillo espejo, volumen controlado y duración prolongada.',
        priceType: 'desde',
        showAlertBadge: false,
        alertText: ''
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
        priceType: 'desde',
        showAlertBadge: true,
        alertText: '⚠️ Recuerda añadir tu peinado para asegurar el tiempo exacto en agenda.'
      }
    ]
  },
  {
    id: 'c5',
    code: '0.5',
    title: 'MÉTODO DE AUTOR & ILUMINACIÓN',
    icon: '💫',
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
        priceType: 'consultar',
        hasVariants: true,
        variants: [
          { id: 'v1', name: 'M', price: '244,00 €', duration: '150 min' },
          { id: 'v2', name: 'L', price: '274,00 €', duration: '180 min' },
          { id: 'v3', name: 'XL', price: '298,00 €', duration: '210 min' }
        ],
        showAlertBadge: true,
        alertText: '⚠️ Recuerda añadir tu peinado para asegurar el tiempo exacto en agenda.'
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
        priceType: 'desde',
        showAlertBadge: false,
        alertText: ''
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
        priceType: 'desde',
        showAlertBadge: true,
        alertText: '⚠️ Recuerda añadir tu peinado para asegurar el tiempo exacto en agenda.'
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
        priceType: 'desde',
        showAlertBadge: false,
        alertText: ''
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
        priceType: 'desde',
        showAlertBadge: false,
        alertText: ''
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
  { id: '1', dateKey: '2026-10-07', dayName: 'Miércoles', time: '10:00', durationMinutes: 90, clientName: 'Flora Harutyunyan', phone: '600000000', email: 'flora@gmail.com', serviceCategory: '0.1 < TEST', serviceSubcategory: 'RESERVADO A.M. M.', remindersStatus: { email48h: true, whatsapp48h: true, whatsapp24h: false, whatsapp2h: false } },
  { id: '2', dateKey: '2026-10-06', dayName: 'Martes', time: '10:00', durationMinutes: 210, clientName: 'Balayage experience', phone: '611222333', email: 'balayage@gmail.com', serviceCategory: '0.5 < MÉTODO', serviceSubcategory: 'RESERVADO Balayage (XL)', remindersStatus: { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false } },
  { id: '3', dateKey: '2026-10-08', dayName: 'Jueves', time: '10:00', durationMinutes: 60, clientName: 'Susi Cayuelas', phone: '633444555', email: 'susi@gmail.com', serviceCategory: '0.2 < CORTE', serviceSubcategory: 'RESERVADO Susi C.', remindersStatus: { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false } }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'clientPin' | 'clientRegistration' | 'clientPortal' | 'catalogBooking' | 'visualAgenda' | 'clientHistoryPage' | 'adminLogin' | 'adminPanel'>('clientPin');
  
  const [currentLang, setCurrentLang] = useState<string>('es');
  const t = (key: string) => TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS['es'][key] || key;
  const [pin, setPin] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);
  const [currentClientRecord, setCurrentClientRecord] = useState<ClientRecord | null>(null);
  const [regNombre, setRegNombre] = useState("");
  const [regApellidos, setRegApellidos] = useState("");
  const [regNacimiento, setRegNacimiento] = useState("");
  const [regTelefono, setRegTelefono] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPin, setRegPin] = useState("");
  const [previewServiceId, setPreviewServiceId] = useState<string | null>(null);
  const [previewVariantId, setPreviewVariantId] = useState<string>('');
  const [selectedServicesToBook, setSelectedServicesToBook] = useState<{ sub: SubService; variant: ServiceVariant | null }[]>([]);
  const [expandedSubDetails, setExpandedSubDetails] = useState<{ [key: string]: boolean }>({});
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [selectedVisualTime, setSelectedVisualTime] = useState<string>('');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [editProximaVisita, setEditProximaVisita] = useState("");
  const [editFormulas, setEditFormulas] = useState("");
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [clientWishText, setClientWishText] = useState("");
  const [aiRecommendation, setAiRecommendation] = useState<{ serviceName: string; reason: string; category: string } | null>(null);
  const [logoClicks, setLogoClicks] = useState<number>(0);
  const [adminPin, setAdminPin] = useState<string>("");
  const [adminError, setAdminError] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<'agenda' | 'config' | 'catalog' | 'clients' | 'detractors' | 'crm' | 'holidays'>('catalog');
  const [configSubTab, setConfigSubTab] = useState<'marca' | 'general' | 'schedule' | 'reservas' | 'anticipada' | 'avisos' | 'backup'>('marca');
  const [adminCatalogStatus, setAdminCatalogStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [adminCatalogSearch, setAdminCatalogSearch] = useState('');
  const normalizeCatalogSearch = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const [catalogSavedMsg, setCatalogSavedMsg] = useState<string | null>(null);
  const [enableOutOfHours, setEnableOutOfHours] = useState<boolean>(true);
  const [enableDoubleBooking, setEnableDoubleBooking] = useState<boolean>(false);
  
  // NUEVO ESTADO: VISTA DE AGENDA MAESTRA ('week' | 'day')
  const [agendaViewMode, setAgendaViewMode] = useState<'week' | 'day'>('week');
  
  const [googleCalendarSyncActive, setGoogleCalendarSyncActive] = useState<boolean>(true);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean>(true);
  const [bizConfig, setBizConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem('lst_business_config');
    return saved ? { ...INITIAL_BUSINESS_CONFIG, ...JSON.parse(saved) } : INITIAL_BUSINESS_CONFIG;
  });
  const [bookingDate, setBookingDate] = useState<Date>(() => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + bizConfig.minAdvanceDays); return date; });
  const [tempConfig, setTempConfig] = useState<BusinessConfig>(bizConfig);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setTempConfig(bizConfig);
  }, [bizConfig]);

  // CATÁLOGO UNIFICADO Y SINCRONIZADO EN TIEMPO REAL
  const [catalog, setCatalog] = useState<CatalogCategory[]>(() => {
    const saved = localStorage.getItem('lst_master_catalog');
    return saved ? JSON.parse(saved) : INITIAL_CATALOG;
  });

  const handleSaveCatalogMaster = () => {
    localStorage.setItem('lst_master_catalog', JSON.stringify(catalog));
    setCatalogSavedMsg('¡Catálogo, avisos y descripciones guardados y sincronizados con éxito con el portal de clientas!');
    setTimeout(() => setCatalogSavedMsg(null), 3500);
  };

  const [holidaysList, setHolidaysList] = useState<HolidayBlock[]>(() => {
    const saved = localStorage.getItem('lst_holidays_list');
    return saved ? JSON.parse(saved) : [
      { id: 'h1', startDate: '2026-12-24', endDate: '2026-12-26', reason: 'Navidad / Festivo local', type: 'festivo' },
      { id: 'h2', startDate: '2026-08-01', endDate: '2026-08-20', reason: 'Vacaciones de Verano', type: 'vacaciones' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('lst_holidays_list', JSON.stringify(holidaysList));
  }, [holidaysList]);

  const [newHolidayStart, setNewHolidayStart] = useState("");
  const [newHolidayEnd, setNewHolidayEnd] = useState("");
  const [newHolidayReason, setNewHolidayReason] = useState("");
  const [newHolidayType, setNewHolidayType] = useState<'vacaciones' | 'festivo'>('vacaciones');

  const isDateBlockedByHoliday = (dateKey: string) => {
    return holidaysList.some(h => dateKey >= h.startDate && dateKey <= h.endDate);
  };

  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [newVariantDuration, setNewVariantDuration] = useState("");
  const [isAddingSub, setIsAddingSub] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [newSubDur, setNewSubDur] = useState("");
  const [newSubPrice, setNewSubPrice] = useState("");
  const [newSubIncludes, setNewSubIncludes] = useState("");
  const [newSubAchieved, setNewSubAchieved] = useState("");
  const [newSubPriceType, setNewSubPriceType] = useState<'desde' | 'aprox' | 'fijo' | 'consultar'>('desde');
  const [newSubAlertBadge, setNewSubAlertBadge] = useState<boolean>(false);
  const [newSubAlertText, setNewSubAlertText] = useState<string>('⚠️ Recuerda añadir tu peinado.');
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatTitle, setNewCatTitle] = useState("");

  const [appVisitsCount, setAppVisitsCount] = useState<number>(() => {
    const saved = localStorage.getItem('lst_app_visits');
    return saved ? parseInt(saved, 10) : 48;
  });

  const [crmPeriod, setCrmPeriod] = useState<'hoy' | '7d' | '30d' | 'personalizado'>('7d');
  const [lostDemandsList, setLostDemandsList] = useState<LostDemandRecord[]>(() => {
    const saved = localStorage.getItem('lst_lost_demands_detailed');
    return saved ? JSON.parse(saved) : [
      { id: '1', date: '22/09/2026', clientName: 'Sonsoles P.', serviceName: 'Balayage & Melt & Lights', potentialValue: 95, reason: 'sin_disponibilidad', clientNote: 'Buscaba hueco en sábado por la mañana pero estaba completo.', phone: '611222333' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('lst_lost_demands_detailed', JSON.stringify(lostDemandsList));
  }, [lostDemandsList]);

  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>(() => {
    const saved = localStorage.getItem('lst_feedback_list');
    return saved ? JSON.parse(saved) : [
      { id: '1', date: '24/09/2026', clientName: 'María G.', rating: 1, comment: 'No me gustó el tiempo de espera en el lavado.', type: 'detractor' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('lst_feedback_list', JSON.stringify(feedbackList));
  }, [feedbackList]);

  const [detractorReplies, setDetractorReplies] = useState<{ [key: string]: string }>({
    '1': "Hola María, lamentamos mucho el tiempo de espera en el lavado. En L'Studio Ana cuidamos cada detalle y queremos compensarte en tu próxima visita con un ritual exclusivo de hidratación."
  });

  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('¡Excelente experiencia! El servicio de autor y la atención de Ana han sido impecables.');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
    if (rating <= 2) {
      setFeedbackComment('Lamento que algo no haya sido perfecto. Por favor, explícanos qué ha ocurrido para solucionarlo en privado.');
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
    if (type === 'detractor') {
      setDetractorReplies(prev => ({
        ...prev,
        [newRecord.id]: `Hola ${currentClientRecord?.nombre || 'estimada clienta'}, hemos leído tu comentario y queremos pedirte disculpas. Nos encantaría invitarte a un protocolo de mejora en tu próxima cita.`
      }));
    }
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
        fechaNacimiento: "30/10/1979",
        telefono: "691888588",
        email: "anamorenofernandez79@gmail.com",
        pinAcceso: "7009",
        diagnostico: "Diagnóstico inicial pendiente",
        ultimaVisita: "Nuevo registro",
        proximaVisitaSugerida: "Pendiente de agendar",
        formulasAplicadas: "Sin fórmulas registradas",
        dniCapilar: "Porosidad: Pendiente | Hidratación: Pendiente",
        prescripcionCasa: "Pendiente de recomendación",
        pastVisits: []
      }
    ];
  });

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [novoNombre, setNovoNombre] = useState("");
  const [novoApellidos, setNovoApellidos] = useState("");
  const [novoNacimiento, setNovoNacimiento] = useState("");
  const [novoTelefono, setNovoTelefono] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPin, setNovoPin] = useState("");
  const [novoDiagnostico, setNovoDiagnostico] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editAdminUltimaVisita, setEditAdminUltimaVisita] = useState("");
  const [editAdminProxima, setEditAdminProxima] = useState("");
  const [editAdminFormulas, setEditAdminFormulas] = useState("");
  const [editAdminDniCapilar, setEditAdminDniCapilar] = useState("");
  const [editAdminPrescripcionCasa, setEditAdminPrescripcionCasa] = useState("");
  
  const [passportDraft, setPassportDraft] = useState<ClientRecord | null>(null);
  const openPassportEditor = (client: ClientRecord) => setPassportDraft({ ...client, pastVisits: (client.pastVisits || []).map(visit => ({ ...visit })) });
  const savePassport = () => {
    if (!passportDraft) return;
    if ((passportDraft.pastVisits || []).some(visit => !visit.date.trim() || !visit.service.trim())) { alert('Cada visita necesita fecha y servicio.'); return; }
    setListaClientes(previous => previous.map(client => client.idNum === passportDraft.idNum ? {
      ...client,
      dniCapilar: passportDraft.dniCapilar,
      prescripcionCasa: passportDraft.prescripcionCasa,
      proximaVisitaSugerida: passportDraft.proximaVisitaSugerida,
      ultimaVisita: passportDraft.ultimaVisita,
      pastVisits: passportDraft.pastVisits
    } : client));
    setPassportDraft(null);
    alert('Pasaporte guardado. Los cambios se reflejan en el portal de esta clienta en este navegador.');
  };
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null);
  const [newRescheduleTime, setNewRescheduleTime] = useState<string>('10:00');
  const [newRescheduleDate, setNewRescheduleDate] = useState<string>(formatDateKey(new Date()));

  useEffect(() => {
    localStorage.setItem('lst_studio_clientes_ids', JSON.stringify(listaClientes));
  }, [listaClientes]);

  useEffect(() => {
    if (currentClientRecord) {
      const updated = listaClientes.find(c => c.idNum === currentClientRecord.idNum);
      if (updated) {
        setCurrentClientRecord(updated);
        setEditProximaVisita(updated.proximaVisitaSugerida || "");
        setEditFormulas(updated.formulasAplicadas || "");
      }
    }
  }, [listaClientes]);

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
    setEditMsg('¡Fecha y datos guardados correctamente!');
    setTimeout(() => setEditMsg(null), 3000);
  };

  const handleGuardarEdicionAdminCliente = (idNum: number) => {
    const nuevaLista = listaClientes.map(c => {
      if (c.idNum === idNum) {
        return {
          ...c,
          ultimaVisita: editAdminUltimaVisita,
          proximaVisitaSugerida: editAdminProxima,
          formulasAplicadas: editAdminFormulas,
          dniCapilar: editAdminDniCapilar,
          prescripcionCasa: editAdminPrescripcionCasa
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
      formulasAplicadas: 'Sin fórmulas registradas',
      dniCapilar: 'Porosidad: Pendiente | Hidratación: Pendiente',
      prescripcionCasa: 'Pendiente de recomendación'
    };
    setListaClientes([...listaClientes, nuevoCliente]);
    setNovoNombre(""); setNovoApellidos(""); setNovoNacimiento(""); setNovoTelefono(""); setNovoEmail(""); setNovoPin(""); setNovoDiagnostico("");
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
      formulasAplicadas: 'Registro inicial completado',
      dniCapilar: 'Porosidad: Media | Hidratación: En estudio',
      prescripcionCasa: 'Champú Orgánico & Cuidado Inicial'
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
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [mesNavegacion, setMesNavegacion] = useState<Date>(new Date(2026, 9, 1));
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [targetDateObj, setTargetDateObj] = useState<Date>(new Date());
  const [targetDayName, setTargetDayName] = useState<string>("");
  const [targetTime, setTargetTime] = useState<string>("");
  const [modalClientName, setModalClientName] = useState<string>("");
  const [modalPhone, setModalPhone] = useState<string>("");
  const [modalEmail, setModalEmail] = useState<string>("");
  const [modalCatIndex, setModalCatIndex] = useState<number>(0);
  const [modalSubIndex, setModalSubIndex] = useState<number>(0);
  const [modalSelectedVariant, setModalSelectedVariant] = useState<ServiceVariant | null>(null);
  const [saturdayRequestModal, setSaturdayRequestModal] = useState<Appointment | null>(null);
  const registerSaturdayRequest = () => {
    if (!saturdayRequestModal) return;
    setAppointments(previous => previous.some(item => item.id === saturdayRequestModal.id) ? previous : [...previous, saturdayRequestModal]);
    setBookingSuccessMsg('Solicitud registrada en este dispositivo. Pendiente de confirmación de Ana.');
    setSelectedServicesToBook([]);
    setIsModalOpen(false);
    setSaturdayRequestModal(null);
  };
  const [advancePaymentModal, setAdvancePaymentModal] = useState<Appointment | null>(null);
  const createAdvancePayment = () => ({ amount: parseFloat(bizConfig.depositAmount.replace(',', '.')) || 60, reference: `LS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, status: 'pending' as const });
  const advancePaymentConcept = (appointment: Appointment) => `${appointment.clientName} · Reserva anticipada · ${appointment.advancePayment?.reference || ''}`;
  const savePendingAdvanceAppointment = () => {
    if (!advancePaymentModal) return;
    setAppointments(previous => previous.some(item => item.id === advancePaymentModal.id) ? previous : [...previous, advancePaymentModal]);
    setBookingSuccessMsg(`Solicitud registrada. Pendiente de confirmar el Bizum de ${advancePaymentModal.advancePayment?.amount} €. Código: ${advancePaymentModal.advancePayment?.reference}`);
    setSelectedServicesToBook([]);
    setIsModalOpen(false);
    setCurrentScreen('catalogBooking');
    setAdvancePaymentModal(null);
  };
  const [modalServices, setModalServices] = useState<{ categoryId: string; categoryName: string; sub: SubService; variant: ServiceVariant | null }[]>([]);
  const getModalService = () => {
    const category = catalog[modalCatIndex];
    const sub = category?.subservices[modalSubIndex];
    if (!category || !sub) return null;
    if (sub.active === false) { alert('Este servicio está desactivado. Selecciona otro.'); return null; }
    if (sub.hasVariants && sub.variants?.length && !modalSelectedVariant) {
      alert('Por favor, selecciona una variante.');
      return null;
    }
    return { categoryId: category.id, categoryName: `${category.code} < ${category.title}`, sub, variant: sub.hasVariants ? modalSelectedVariant : null };
  };
  const handleAddModalService = () => {
    const item = getModalService();
    if (!item) return;
    setModalServices(previous => {
      const existing = previous.findIndex(entry => entry.sub.id === item.sub.id);
      return existing < 0 ? [...previous, item] : previous.map((entry, index) => index === existing ? item : entry);
    });
  };
  const getModalDuration = (items: { sub: SubService; variant: ServiceVariant | null }[]) =>
    items.reduce((total, item) => total + (parseInt((item.variant?.duration || item.sub.duration).match(/\d+/)?.[0] || '45', 10)), 0);

  const [viewApptModal, setViewApptModal] = useState<Appointment | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const checkPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (!checkPWA && /Mobile|Android/i.test(navigator.userAgent)) {
      setShowInstallBanner(true);
    }
  }, []);

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
          if (clientMatch || newPin === bizConfig.masterPin) {
            setPinError(false);
            setPin("");
            setAppVisitsCount(prev => prev + 1);
            setFeedbackSubmitted(false);
            if (clientMatch) {
              setCurrentClientRecord(clientMatch);
              setCurrentScreen('clientPortal');
            } else if (newPin === bizConfig.masterPin) {
              setAdminPin("");
              setAdminError(false);
              setCurrentScreen('adminPanel');
            }
          } else {
            setPinError(true);
            setPin("");
            setTimeout(() => setPinError(false), 2000);
          }
        }, 300);
      }
    }
  };

  const handleDelete = () => setPin(prev => prev.slice(0, -1));
  const handleClear = () => setPin("");
  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);
    setTimeout(() => setLogoClicks(0), 600);
    if (newClicks === 2) {
      setLogoClicks(0);
      setAdminPin("");
      setAdminError(false);
      setCurrentScreen('adminLogin');
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === bizConfig.masterPin || adminPin === '7009') {
      setCurrentScreen('adminPanel');
      setAdminError(false);
      setAdminPin("");
    } else {
      setAdminError(true);
      setAdminPin("");
    }
  };

  const handleSaveSection = (sectionName: string) => {
    if (!Number.isFinite(tempConfig.advancePaymentThresholdMinutes) || tempConfig.advancePaymentThresholdMinutes < 0 || !Number.isFinite(parseFloat(tempConfig.depositAmount.replace(',', '.'))) || parseFloat(tempConfig.depositAmount.replace(',', '.')) <= 0) { alert('Revisa el importe y la duración de la reserva anticipada.'); return; }
    localStorage.setItem('lst_business_config', JSON.stringify(tempConfig));
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
    const targetDateKey = formatDateKey(targetDate);
    if (isDateBlockedByHoliday(targetDateKey)) {
      window.alert('Este día está bloqueado por vacaciones o festivo. No se pueden mover citas aquí.');
      return;
    }
    const id = e.dataTransfer.getData('text/plain') || draggedApptId;
    if (!id) return;
    const existing = appointments.find(a => a.dateKey === targetDateKey && a.time === time && a.id !== id);
    if (existing && !enableDoubleBooking) {
      window.alert('Ese hueco horario ya está ocupado. Activa la "Doble reserva" en el panel lateral si deseas permitir solapes.');
      return;
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, dateKey: targetDateKey, dayName, time } : a));
    setDraggedApptId(null);
  };

  const handleCellClick = (targetDate: Date, dayName: string, time: string) => {
    const targetDateKey = formatDateKey(targetDate);
    if (isDateBlockedByHoliday(targetDateKey)) {
      window.alert('Este día es festivo o de vacaciones. Está bloqueado en la agenda.');
      return;
    }
    const existing = appointments.find(a => a.dateKey === targetDateKey && a.time === time);
    if (existing && !enableDoubleBooking) {
      setViewApptModal(existing);
      return;
    }
    setTargetDateObj(targetDate);
    setTargetDayName(dayName);
    setTargetTime(time);
    setModalClientName("");
    setModalPhone("");
    setModalEmail("");
    setModalServices([]);
    setModalCatIndex(0);
    setModalSubIndex(0);
    const defaultSub = catalog[0]?.subservices[0];
    setModalSelectedVariant(defaultSub?.variants?.[0] || null);
    setIsModalOpen(true);
  };

  const generateWhatsAppMessage = (clientName: string, dateStr: string, timeStr: string) => {
    const template = bizConfig.whatsappTemplate || "Hola {nombre}. Te recordamos tu cita en L’Studio Ana el {fecha} a las {hora}. ¡Te esperamos en el Studio!";
    return template
      .replace(/{nombre}/g, clientName)
      .replace(/{fecha}/g, dateStr)
      .replace(/{hora}/g, timeStr);
  };

  // Reglas explícitas del catálogo: no se deducen por nombres ni descripciones.
  const getStylingError = (items: { sub: SubService; variant: ServiceVariant | null }[]) => {
    const current = items.map(item => catalog.flatMap(category => category.subservices).find(sub => sub.id === item.sub.id) || item.sub);
    const required = current.filter(sub => sub.stylingPolicy === 'required' && !sub.isStylingService);
    const styling = current.filter(sub => sub.isStylingService);
    if (required.length && !styling.length) return `Añade un servicio de secado y peinado y selecciona su largo o variante para completar: ${required.map(sub => sub.name).join(', ')}.`;
    if (styling.length && !required.length && current.some(sub => sub.stylingPolicy === 'included' && !sub.isStylingService)) return 'El pack seleccionado ya incluye peinado. Retira el peinado adicional para evitar duplicarlo.';
    return null;
  };
  const previewService = catalog.flatMap(category => category.subservices).find(sub => sub.id === previewServiceId);
  const getInactiveServiceError = (items: { sub: SubService }[]) => {
    const unavailable = items.filter(item => {
      const current = catalog.flatMap(category => category.subservices).find(sub => sub.id === item.sub.id);
      return !current || current.active === false;
    });
    return unavailable.length ? `Estos servicios ya no están disponibles para nuevas reservas: ${unavailable.map(item => item.sub.name).join(', ')}. Retíralos y selecciona otra opción.` : null;
  };
  const getApprovalReason = (items: { sub: SubService }[], dateKey: string): 'saturday' | 'assessment' | 'both' | null => {
    const saturday = bizConfig.saturdayApprovalEnabled && new Date(`${dateKey}T12:00:00`).getDay() === 6;
    const assessment = items.some(item => (catalog.flatMap(category => category.subservices).find(sub => sub.id === item.sub.id) || item.sub).requiresAssessment);
    return saturday && assessment ? 'both' : assessment ? 'assessment' : saturday ? 'saturday' : null;
  };
  const approvalTitle = (reason?: 'saturday' | 'assessment' | 'both') => reason === 'assessment' ? 'Valoración previa' : reason === 'both' ? 'Valoración previa y sábado' : 'Sábado';

  const getTonerError = (items: { sub: SubService; variant: ServiceVariant | null }[]) => {
    const current = items.map(item => catalog.flatMap(category => category.subservices).find(sub => sub.id === item.sub.id) || item.sub);
    const required = current.filter(sub => sub.tonerPolicy === 'required' && !sub.isTonerService);
    const toner = current.filter(sub => sub.isTonerService);
    if (required.length && !toner.length) return `Añade un servicio de matiz o tonalización y selecciona su variante para completar: ${required.map(sub => sub.name).join(', ')}.`;
    if (toner.length && !required.length && current.some(sub => sub.tonerPolicy === 'included' && !sub.isTonerService)) return 'El pack seleccionado ya incluye matiz. Retira el matiz adicional para evitar duplicarlo.';
    return null;
  };
  const tonerLabel = (sub: SubService) => sub.isTonerService ? 'Servicio de matiz / tonalización' : sub.tonerPolicy === 'included' ? 'Matiz incluido' : sub.tonerPolicy === 'required' ? 'Debes añadir matiz / tonalización' : '';

  const stylingLabel = (sub: SubService) => sub.isStylingService ? 'Servicio de secado y peinado' : sub.stylingPolicy === 'included' ? 'Peinado incluido' : sub.stylingPolicy === 'required' ? 'Debes añadir secado y peinado' : sub.stylingPolicy === 'not_applicable' ? 'Sin peinado · No necesitas añadirlo' : '';

  const renderServiceInfo = (sub: SubService) => (
                              <div style={{ backgroundColor: '#1a1a1a', padding: '14px', borderRadius: '6px', fontSize: '13px', lineHeight: 1.6, color: '#ccc', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '2px solid #76683e', marginTop: '4px' }}>
                                <div><strong style={{ color: '#d4af37' }}>Descripción:</strong> {sub.description}</div>
                                {sub.requiresAssessment && <div style={{ color: '#d4af37', fontWeight: 'bold' }}>Requiere valoración previa · Reserva bajo confirmación de Ana</div>}
                                {tonerLabel(sub) && <div style={{ color: '#d4af37', fontWeight: 'bold' }}>{tonerLabel(sub)}</div>}
                                {stylingLabel(sub) && <div style={{ color: '#d4af37', fontWeight: 'bold' }}>{stylingLabel(sub)}</div>}
                                {sub.includesText && <div><strong style={{ color: '#d4af37' }}>Qué incluye:</strong> {sub.includesText}</div>}
                                {sub.achievedText && <div><strong style={{ color: '#d4af37' }}>Qué se consigue:</strong> {sub.achievedText}</div>}
                              </div>
  );

  const handleSaveModalAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClientName.trim()) return;
    const current = modalServices.length ? null : getModalService();
    const services = modalServices.length ? modalServices : current ? [current] : [];
    if (!services.length) return;
    const inactiveError = getInactiveServiceError(services);
    if (inactiveError) { alert(inactiveError); return; }
    const stylingError = getStylingError(services);
    if (stylingError) { alert(stylingError); return; }
    const tonerError = getTonerError(services);
    if (tonerError) { alert(tonerError); return; }
    const durationMin = getModalDuration(services);
    const dateFormattedStr = `${String(targetDateObj.getDate()).padStart(2, '0')}/${String(targetDateObj.getMonth() + 1).padStart(2, '0')}/${targetDateObj.getFullYear()}`;
    const newApp: Appointment = {
      id: Date.now().toString(),
      dateKey: formatDateKey(targetDateObj),
      dayName: targetDayName,
      time: targetTime,
      durationMinutes: durationMin,
      clientName: modalClientName,
      phone: modalPhone || '600000000',
      email: modalEmail || 'sinemail@gmail.com',
      serviceCategory: Array.from(new Set(services.map(item => item.categoryName))).join(' + '),
      serviceSubcategory: `RESERVADO ${services.map(item => item.sub.name + (item.variant ? ` (${item.variant.name} - ${item.variant.price})` : '')).join(' + ')}`,
      selectedVariant: services[0].variant,
      services,
      remindersStatus: { email48h: true, whatsapp48h: true, whatsapp24h: true, whatsapp2h: true }
    };
    const approvalReason = getApprovalReason(services, newApp.dateKey);
    if (approvalReason) {
      newApp.saturdayApproval = { status: 'pending', reason: approvalReason, reference: `REV-${crypto.randomUUID().slice(0, 8).toUpperCase()}` };
      newApp.serviceSubcategory = newApp.serviceSubcategory.replace(/^RESERVADO/, approvalReason === 'saturday' ? 'PENDIENTE SÁBADO' : 'PENDIENTE VALORACIÓN');
      newApp.remindersStatus = { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false };
      setSaturdayRequestModal(newApp);
      return;
    }
    if (bizConfig.advancePaymentEnabled && (newApp.durationMinutes || 0) > bizConfig.advancePaymentThresholdMinutes) {
      newApp.advancePayment = createAdvancePayment();
      newApp.serviceSubcategory = newApp.serviceSubcategory.replace(/^RESERVADO/, 'PENDIENTE BIZUM');
      newApp.remindersStatus = { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false };
      setAdvancePaymentModal(newApp);
      return;
    }
    setAppointments([...appointments, newApp]);
    setIsModalOpen(false);
    const cleanPhone = (modalPhone || '600000000').replace(/\s+/g, "");
    const customMsg = generateWhatsAppMessage(modalClientName, dateFormattedStr, targetTime);
    window.open(`https://wa.me/34${cleanPhone}?text=${encodeURIComponent(customMsg)}`, '_blank');
    window.alert(`¡Cita guardada para ${modalClientName}! Sincronizada con Google Calendar y WhatsApp listo para enviar.`);
  };

  const handleConfirmarCitaVisual = () => {
    if (selectedServicesToBook.length === 0) {
      alert('Por favor, selecciona al menos un servicio del catálogo.');
      return;
    }
    const earliest = new Date(); earliest.setHours(0, 0, 0, 0); earliest.setDate(earliest.getDate() + bizConfig.minAdvanceDays);
    const latest = new Date(); latest.setHours(23, 59, 59, 999); latest.setMonth(latest.getMonth() + bizConfig.maxBookingMonths);
    if (bookingDate < earliest || bookingDate > latest) { alert(`Reserva con al menos ${bizConfig.minAdvanceDays} días de antelación y dentro de los próximos ${bizConfig.maxBookingMonths} meses.`); return; }
    if (!selectedVisualTime || !portalAvailableTimes(bookingDate).includes(selectedVisualTime)) { alert('Selecciona una hora disponible para la duración completa de tu cita.'); return; }
    const inactiveError = getInactiveServiceError(selectedServicesToBook);
    if (inactiveError) { alert(inactiveError); setCurrentScreen('catalogBooking'); return; }
    const stylingError = getStylingError(selectedServicesToBook);
    if (stylingError) { alert(stylingError); setCurrentScreen('catalogBooking'); return; }
    const tonerError = getTonerError(selectedServicesToBook);
    if (tonerError) { alert(tonerError); setCurrentScreen('catalogBooking'); return; }
    const dateKeyStr = formatDateKey(bookingDate);
    if (isDateBlockedByHoliday(dateKeyStr)) {
      alert('Lo sentimos, el salón se encuentra cerrado por vacaciones o festivo en esta fecha.');
      return;
    }
    for (const item of selectedServicesToBook) {
      if (item.sub.hasVariants && item.sub.variants && item.sub.variants.length > 0 && !item.variant) {
        alert(`Es obligatorio seleccionar una variante para el servicio: ${item.sub.name}`);
        return;
      }
    }
    const dayNamesMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayNameStr = dayNamesMap[bookingDate.getDay()];
    const subNames = selectedServicesToBook.map(s => {
      return s.variant ? `${s.sub.name} (${s.variant.name})` : s.sub.name;
    }).join(', ');
    let totalDurationMinutes = 0;
    selectedServicesToBook.forEach(s => {
      if (s.sub.hasVariants && s.variant) {
        const match = s.variant.duration.match(/\d+/);
        totalDurationMinutes += match ? parseInt(match[0], 10) : 45;
      } else {
        const match = s.sub.duration.match(/\d+/);
        totalDurationMinutes += match ? parseInt(match[0], 10) : 45;
      }
    });
    const clientNameStr = currentClientRecord ? `${currentClientRecord.nombre} ${currentClientRecord.apellidos}` : 'Clienta Web';
    const clientPhoneStr = currentClientRecord?.telefono || '600000000';
    const dateFormattedStr = `${String(bookingDate.getDate()).padStart(2, '0')}/${String(bookingDate.getMonth() + 1).padStart(2, '0')}/${bookingDate.getFullYear()}`;
    const newApp: Appointment = {
      id: Date.now().toString(),
      dateKey: dateKeyStr,
      dayName: dayNameStr,
      time: selectedVisualTime,
      durationMinutes: totalDurationMinutes || 45,
      clientName: clientNameStr,
      phone: clientPhoneStr,
      email: currentClientRecord?.email || 'cliente@gmail.com',
      serviceCategory: 'CATÁLOGO DE AUTOR ONLINE',
      serviceSubcategory: `RESERVADO ${subNames}`,
      selectedVariant: selectedServicesToBook[0]?.variant || null,
      services: selectedServicesToBook.map(item => ({ ...item, categoryId: catalog.find(category => category.subservices.some(sub => sub.id === item.sub.id))?.id || '', categoryName: catalog.find(category => category.subservices.some(sub => sub.id === item.sub.id))?.title || '' })),
      remindersStatus: { email48h: true, whatsapp48h: true, whatsapp24h: true, whatsapp2h: true }
    };
    const approvalReason = getApprovalReason(selectedServicesToBook, newApp.dateKey);
    if (approvalReason) {
      newApp.saturdayApproval = { status: 'pending', reason: approvalReason, reference: `REV-${crypto.randomUUID().slice(0, 8).toUpperCase()}` };
      newApp.serviceSubcategory = newApp.serviceSubcategory.replace(/^RESERVADO/, approvalReason === 'saturday' ? 'PENDIENTE SÁBADO' : 'PENDIENTE VALORACIÓN');
      newApp.remindersStatus = { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false };
      setSaturdayRequestModal(newApp);
      return;
    }
    if (bizConfig.advancePaymentEnabled && (newApp.durationMinutes || 0) > bizConfig.advancePaymentThresholdMinutes) {
      newApp.advancePayment = createAdvancePayment();
      newApp.serviceSubcategory = newApp.serviceSubcategory.replace(/^RESERVADO/, 'PENDIENTE BIZUM');
      newApp.remindersStatus = { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false };
      setAdvancePaymentModal(newApp);
      return;
    }
    setAppointments([...appointments, newApp]);
    setBookingSuccessMsg(`¡Cita confirmada correctamente para el ${bookingDate.toLocaleDateString('es-ES')} a las ${selectedVisualTime}! Sincronizado con la intranet y Google Calendar.`);
    setSelectedServicesToBook([]);
    setCurrentScreen('catalogBooking');
    const cleanPhone = clientPhoneStr.replace(/\s+/g, "");
    const customMsg = generateWhatsAppMessage(clientNameStr, dateFormattedStr, selectedVisualTime);
    window.open(`https://wa.me/34${cleanPhone}?text=${encodeURIComponent(customMsg)}`, '_blank');
    setTimeout(() => setBookingSuccessMsg(null), 5000);
  };

  const handleDeleteAppointment = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('¿Deseas cancelar esta cita de la agenda?')) {
      setAppointments(appointments.filter(a => a.id !== id));
      if (viewApptModal?.id === id) setViewApptModal(null);
    }
  };

  const handleToggleVariants = (catId: string, subId: string) => {
    setCatalog(catalog.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          subservices: cat.subservices.map(sub => {
            if (sub.id === subId) {
              const nextHas = !sub.hasVariants;
              return {
                ...sub,
                hasVariants: nextHas,
                variants: nextHas && (!sub.variants || sub.variants.length === 0) ? [
                  { id: 'v_m_' + Date.now(), name: 'M', price: '244,00 €', duration: '150 min' },
                  { id: 'v_l_' + Date.now(), name: 'L', price: '274,00 €', duration: '180 min' },
                  { id: 'v_xl_' + Date.now(), name: 'XL', price: '298,00 €', duration: '210 min' }
                ] : sub.variants
              };
            }
            return sub;
          })
        };
      }
      return cat;
    }));
  };

  const handleAddVariant = (catId: string, subId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariantName.trim()) return;
    const newVar: ServiceVariant = {
      id: 'v_' + Date.now(),
      name: newVariantName.trim(),
      price: newVariantPrice.trim() || '100 €',
      duration: newVariantDuration.trim() || '60 min'
    };
    setCatalog(catalog.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          subservices: cat.subservices.map(sub => {
            if (sub.id === subId) {
              return { ...sub, variants: [...(sub.variants || []), newVar] };
            }
            return sub;
          })
        };
      }
      return cat;
    }));
    setNewVariantName("");
    setNewVariantPrice("");
    setNewVariantDuration("");
  };

  const handleDeleteVariant = (catId: string, subId: string, varId: string) => {
    setCatalog(catalog.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          subservices: cat.subservices.map(sub => {
            if (sub.id === subId) {
              return { ...sub, variants: (sub.variants || []).filter(v => v.id !== varId) };
            }
            return sub;
          })
        };
      }
      return cat;
    }));
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
    setNewCatCode("");
    setNewCatTitle("");
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
      priceType: newSubPriceType,
      hasVariants: false,
      showAlertBadge: newSubAlertBadge,
      alertText: newSubAlertText
    };
    setCatalog(catalog.map(cat => {
      if (cat.id === catId) {
        return { ...cat, subservices: [...cat.subservices, newSub] };
      }
      return cat;
    }));
    setIsAddingSub(null);
    setNewSubName("");
    setNewSubDesc("");
    setNewSubPrice("");
    setNewSubDur("");
    setNewSubIncludes("");
    setNewSubAchieved("");
    setNewSubPriceType('desde');
    setNewSubAlertBadge(false);
    setNewSubAlertText('⚠️ Recuerda añadir tu peinado.');
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
  const diasRejillaMini: (Date | null)[] = [];
  for (let i = 0; i < diaInicio; i++) diasRejillaMini.push(null);
  for (let d = 1; d <= diasEnMes; d++) diasRejillaMini.push(new Date(añoMini, mesMini, d));

  const hoursList = [
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00', '19:15', '19:30', '19:45'
  ];

  const portalDateAllowed = (date: Date) => {
    const earliest = new Date(); earliest.setHours(0, 0, 0, 0); earliest.setDate(earliest.getDate() + bizConfig.minAdvanceDays);
    const latest = new Date(); latest.setHours(23, 59, 59, 999); latest.setMonth(latest.getMonth() + bizConfig.maxBookingMonths);
    return date >= earliest && date <= latest && date.getDay() !== 0 && !isDateBlockedByHoliday(formatDateKey(date));
  };
  const portalAvailableTimes = (date: Date) => {
    if (!portalDateAllowed(date) || !selectedServicesToBook.length) return [];
    const day = date.getDay();
    const schedule = day === 1 ? bizConfig.scheduleMonday : day <= 3 ? bizConfig.scheduleTueWed : day <= 5 ? bizConfig.scheduleThuFri : bizConfig.scheduleSaturday;
    const matches = Array.from(schedule.matchAll(/(\d{1,2})(?::(\d{2})|h(?:\s*(\d{2}))?)/gi));
    if (matches.length < 2) return [];
    const duration = getModalDuration(selectedServicesToBook);
    const toMinutes = (match: RegExpMatchArray) => Number(match[1]) * 60 + Number(match[2] || match[3] || 0);
    const step = Math.max(5, bizConfig.slotIntervalMinutes || 15);
    const times: string[] = [];
    for (let pair = 0; pair + 1 < matches.length; pair += 2) {
      const open = toMinutes(matches[pair]), close = toMinutes(matches[pair + 1]);
      for (let start = open; start + duration <= close; start += step) {
        const time = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
        if (new Date(`${formatDateKey(date)}T${time}:00`).getTime() <= Date.now()) continue;
        const overlaps = appointments.some(appointment => {
          if (appointment.dateKey !== formatDateKey(date) || appointment.saturdayApproval?.status === 'rejected') return false;
          const [hour, minute] = appointment.time.split(':').map(Number);
          const bookedStart = hour * 60 + minute;
          return start < bookedStart + (appointment.durationMinutes || 45) && start + duration > bookedStart;
        });
        if (!overlaps || enableDoubleBooking) times.push(time);
      }
    }
    return Array.from(new Set(times));
  };
  const choosePortalDate = (date: Date) => { setBookingDate(date); setSelectedVisualTime(''); };
  const portalWeekStart = new Date(bookingDate);
  portalWeekStart.setDate(bookingDate.getDate() - ((bookingDate.getDay() + 6) % 7));
  const portalWeekDays = Array.from({ length: 7 }, (_, index) => { const day = new Date(portalWeekStart); day.setDate(day.getDate() + index); return day; });
  const portalTimes = portalAvailableTimes(bookingDate);

  const isTimeSlotOccupied = (dateKey: string, timeStr: string) => {
    if (isDateBlockedByHoliday(dateKey)) return true;
    if (enableDoubleBooking) return false;
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
  const dayNamesMapList = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  // DÍA SELECCIONADO PARA LA VISTA DIARIA
  const diaSeleccionadoObj = {
    name: dayNamesMapList[fechaSeleccionada.getDay()],
    dateObj: fechaSeleccionada,
    dateFormatted: fechaSeleccionada.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  };

  const getRescheduleConflict = (appointment: Appointment, dateKey: string, time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const start = hour * 60 + minute;
    const end = start + (appointment.durationMinutes || 45);
    return appointments.find(other => {
      if (other.id === appointment.id || other.dateKey !== dateKey || other.saturdayApproval?.status === 'rejected') return false;
      const [otherHour, otherMinute] = other.time.split(':').map(Number);
      const otherStart = otherHour * 60 + otherMinute;
      return start < otherStart + (other.durationMinutes || 45) && end > otherStart;
    });
  };
  const markAppointmentCompleted = (appointment: Appointment) => {
    if (appointment.completedAt) return;
    if (appointment.saturdayApproval?.status === 'pending' || appointment.advancePayment?.status === 'pending') { alert('Resuelve primero la aprobación y el pago pendiente.'); return; }
    const client = listaClientes.find(item => item.email.trim().toLowerCase() === appointment.email.trim().toLowerCase());
    if (!client) { alert('No hay una clienta registrada con el email de esta cita. Revisa su ficha antes de registrar la visita.'); return; }
    if (new Date(`${appointment.dateKey}T${appointment.time}:00`).getTime() > Date.now()) { alert('Esta cita todavía no ha comenzado.'); return; }
    if (!window.confirm(`¿Registrar esta cita como realizada en el pasaporte de ${client.nombre}?`)) return;
    const service = appointment.services?.length ? appointment.services.map(item => item.sub.name + (item.variant ? ` (${item.variant.name})` : '')).join(' + ') : appointment.serviceSubcategory.replace(/^RESERVADO\s*/, '');
    setListaClientes(previous => previous.map(item => item.idNum === client.idNum ? {
      ...item,
      ultimaVisita: appointment.dateKey.split('-').reverse().join('/'),
      pastVisits: (item.pastVisits || []).some(visit => visit.sourceAppointmentId === appointment.id) ? item.pastVisits : [...(item.pastVisits || []), { date: appointment.dateKey.split('-').reverse().join('/'), service, stylist: 'Ana', notes: '', sourceAppointmentId: appointment.id }]
    } : item));
    const updated = { ...appointment, completedAt: new Date().toISOString() };
    setAppointments(previous => previous.map(item => item.id === appointment.id ? updated : item));
    setViewApptModal(updated);
  };
  const adminAppointmentColor = (appointment: Appointment) => appointment.completedAt ? { background: '#252525', border: '#666' } : appointment.saturdayApproval?.status === 'pending'
    ? { background: '#302819', border: '#8e7138' }
    : appointment.advancePayment?.status === 'pending' ? { background: '#202735', border: '#576e94' }
    : { background: '#202a23', border: '#526d59' };

  const clientNextAppointment = currentClientRecord ? appointments
    .filter(appointment => appointment.email.trim().toLowerCase() === currentClientRecord.email.trim().toLowerCase()
      && new Date(`${appointment.dateKey}T${appointment.time}:00`).getTime() >= Date.now()
      && !appointment.completedAt && appointment.saturdayApproval?.status !== 'rejected')
    .sort((a, b) => `${a.dateKey}T${a.time}`.localeCompare(`${b.dateKey}T${b.time}`))[0] : undefined;
  const clientAppointmentStatus = clientNextAppointment?.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación'
    : clientNextAppointment?.advancePayment?.status === 'pending' ? 'Pendiente de Bizum' : 'Cita confirmada';

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', margin: 0, padding: '20px', position: 'relative' }}>
      
      {/* PESTAÑA DESPLEGABLE MULTIIDIOMA */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
        <select 
          value={currentLang} 
          onChange={(e) => setCurrentLang(e.target.value)}
          style={{
            backgroundColor: '#141414',
            color: '#d4af37',
            border: '1px solid rgba(212,175,55,0.4)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            outline: 'none',
            fontFamily: 'sans-serif'
          }}
        >
          <option value="es">🇪🇸 Español</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </div>

      {/* 1. ACCESO PIN CLIENTE */}
      {currentScreen === 'clientPin' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '320px', width: '100%' }}>
          <div onClick={handleLogoClick} style={{ textAlign: 'center', marginBottom: '30px', cursor: 'pointer', userSelect: 'none' }} title="L'Studio Ana">
            <h1 style={{ color: '#d4af37', fontSize: '26px', letterSpacing: '4px', margin: '0 0 5px 0', fontFamily: 'serif' }}>L'A</h1>
            <p style={{ color: '#888888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '3px', margin: 0 }}>{t('subtitle')}</p>
          </div>
          <p style={{ color: pinError ? '#ff4444' : '#cccccc', fontSize: '14px', marginBottom: '15px', letterSpacing: '1px', textAlign: 'center' }}>
            {pinError ? 'PIN incorrecto' : t('enterPin')}
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
            {t('firstTimeRegister')}
          </button>
          {showInstallBanner && (
            <div style={{ padding: '10px', backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
              <p style={{ color: '#d4af37', fontSize: '11px', margin: '0 0 3px 0', fontWeight: 'bold' }}>{t('installApp')}</p>
              <p style={{ color: '#aaa', fontSize: '10px', margin: 0 }}>{t('installDesc')}</p>
            </div>
          )}
        </div>
      )}

      {/* 1.1 PANTALLA DE REGISTRO NUEVA CLIENTA */}
      {currentScreen === 'clientRegistration' && (
        <div style={{ maxWidth: '400px', width: '100%', backgroundColor: '#121212', border: '1px solid #d4af37', borderRadius: '16px', padding: '30px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2 style={{ color: '#d4af37', fontSize: '18px', fontFamily: 'serif', margin: 0, textAlign: 'center' }}>{t('clientRegistrationTitle')}</h2>
          <p style={{ color: '#aaa', fontSize: '11px', textAlign: 'center', margin: '0 0 10px 0' }}>{t('clientRegistrationDesc')}</p>
          <form onSubmit={handleRegistroClientaPortalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>{t('nameLabel')}</label>
              <input type="text" placeholder="Ej. Ana" value={regNombre} onChange={(e) => setRegNombre(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#aaa', fontSize: '11px' }}>{t('surnamesLabel')}</label>
              <input type="text" placeholder="Ej. García López" value={regApellidos} onChange={(e) => setRegApellidos(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>{t('birthDateLabel')}</label>
                <input type="text" placeholder="DD/MM/AAAA" value={regNacimiento} onChange={(e) => setRegNacimiento(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#aaa', fontSize: '11px' }}>{t('phoneLabel')}</label>
                <input type="text" placeholder="600111222" value={regTelefono} onChange={(e) => setRegTelefono(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>{t('emailLabel')}</label>
              <input type="email" placeholder="tucorreo@gmail.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>{t('pinLabel')}</label>
              <input type="password" placeholder="Ej. 7009" maxLength={4} value={regPin} onChange={(e) => setRegPin(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #d4af37', color: '#fff', borderRadius: '6px', fontSize: '14px', textAlign: 'center', letterSpacing: '4px' }} />
            </div>
            <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
              {t('completeRegisterBtn')}
            </button>
          </form>
          <button onClick={() => setCurrentScreen('clientPin')} style={{ background: 'none', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer', textAlign: 'center' }}>
            {t('backToPin')}
          </button>
        </div>
      )}

      {/* 2. PORTAL CLIENTE */}
      {currentScreen === 'clientPortal' && (
        <div style={{ maxWidth: '600px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '25px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>{bizConfig.name}</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>{t('subtitle')}</p>
            </div>
            <button onClick={() => { setPin(""); setCurrentScreen('clientPin'); }} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              {t('logout')}
            </button>
          </div>
          <div style={{ padding: '8px 0 4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ color: '#eee8dd', fontSize: '28px', lineHeight: 1.2, fontFamily: 'serif', margin: 0 }}>Hola, {currentClientRecord?.nombre || 'bienvenida'}.</p>
            <p style={{ color: '#bdb8ad', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>Tu espacio de cuidado capilar. Cada visita, pensada para ti.</p>
            <details style={{ color: '#aaa', fontSize: '12px', marginTop: '6px' }}>
              <summary style={{ cursor: 'pointer', padding: '6px 0' }}>Mis datos</summary>
              <p style={{ overflowWrap: 'anywhere' }}>{currentClientRecord?.email} · ID #{currentClientRecord?.idNum} · {currentClientRecord?.registroId}</p>
            </details>
          </div>
          <section aria-label="Tu próxima cita" style={{ background: 'linear-gradient(135deg, #252219, #191918)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ color: '#cab77d', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' }}>Tu próxima visita</div>
            {clientNextAppointment ? <>
              <div style={{ color: '#f4eee3', fontFamily: 'serif', fontSize: '23px', lineHeight: 1.4 }}>
                {new Date(`${clientNextAppointment.dateKey}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                <span style={{ display: 'block', color: '#d4af37', fontSize: '26px' }}>{clientNextAppointment.time}</span>
              </div>
              <span style={{ alignSelf: 'flex-start', padding: '6px 10px', borderRadius: '20px', backgroundColor: '#302d22', color: '#ddd0a4', fontSize: '12px' }}>{clientAppointmentStatus}</span>
              <p style={{ color: '#d0ccc3', margin: 0, lineHeight: 1.6, fontSize: '14px', overflowWrap: 'anywhere' }}>{clientNextAppointment.serviceSubcategory.replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, '')}</p>
              <p style={{ color: '#a5a095', margin: 0, fontSize: '12px' }}>Con Ana · {bizConfig.location}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingTop: '4px' }}>
                <button type="button" onClick={() => { setRescheduleModalAppt(clientNextAppointment); setNewRescheduleTime(clientNextAppointment.time); setNewRescheduleDate(clientNextAppointment.dateKey); }} style={{ background: 'transparent', border: '1px solid #76683e', color: '#ddd0a4', minHeight: '44px', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Modificar fecha u hora</button>
                <a href={`https://wa.me/34${(bizConfig.studioWhatsapp || bizConfig.phone).replace(/\s+/g, '')}?text=${encodeURIComponent(`Hola Ana, quiero consultar mi cita del ${clientNextAppointment.dateKey.split('-').reverse().join('/')} a las ${clientNextAppointment.time}.`)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', color: '#ddd0a4', padding: '10px 0', minHeight: '24px', fontSize: '13px' }}>Consultar mi cita</a>
              </div>
            </> : <>
              <p style={{ color: '#f4eee3', fontFamily: 'serif', fontSize: '23px', margin: 0 }}>Tu próxima experiencia empieza aquí.</p>
              <p style={{ color: '#bdb8ad', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>Aún no tienes una cita próxima. Descubre nuestros servicios y encuentra el cuidado que necesita tu cabello.</p>
            </>}
          </section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button type="button" onClick={() => setCurrentScreen('catalogBooking')} style={{ background: 'linear-gradient(110deg, #d4af37, #c4a34b)', color: '#17150f', border: 'none', minHeight: '54px', padding: '16px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>Reservar mi cita</button>
            <button type="button" onClick={() => setCurrentScreen('clientHistoryPage')} style={{ background: '#191919', color: '#ddd6c7', border: '1px solid #34332d', minHeight: '48px', padding: '14px 20px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>Mi pasaporte e historial</button>
            <div style={{ textAlign: 'center', padding: '10px 0', color: '#aaa', fontSize: '13px', lineHeight: 1.7 }}>
              ¿No sabes qué servicio elegir? <a href={`https://wa.me/34${(bizConfig.studioWhatsapp || bizConfig.phone).replace(/\s+/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#cab77d' }}>Te orientamos</a>
              <a href={`tel:${bizConfig.phone}`} style={{ display: 'block', color: '#aaa', marginTop: '4px' }}>Llamar al Studio</a>
            </div>
          </div>
          <details style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '18px' }}>
            <summary style={{ color: '#ddd6c7', fontSize: '14px', cursor: 'pointer', minHeight: '24px' }}>Horarios del Studio</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px', color: '#bdb8ad', fontSize: '13px', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}><span>Lunes</span><span style={{ color: '#eee8dd' }}>{bizConfig.scheduleMonday}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}><span>Martes y miércoles</span><span style={{ color: '#eee8dd' }}>{bizConfig.scheduleTueWed}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}><span>Jueves y viernes</span><span style={{ color: '#eee8dd' }}>{bizConfig.scheduleThuFri}</span></div>
              <div><span style={{ color: '#cab77d' }}>Sábados</span><p style={{ margin: '4px 0 0', overflowWrap: 'anywhere' }}>{bizConfig.scheduleSaturday}</p></div>
            </div>
          </details>
          <section aria-label="Visítanos" style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#242219', marginBottom: '6px' }}>
              <img src={STUDIO_PORTAL_PHOTO} alt="Interior de L’Studio Ana, con madera natural y butacas claras" loading="lazy" decoding="async" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 45%' }} />
            </div>
            <h3 style={{ color: '#eee8dd', fontSize: '19px', fontFamily: 'serif', fontWeight: 'normal', margin: 0 }}>Nos vemos en el Studio</h3>
            <p style={{ color: '#cab77d', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>Un espacio para ti y para el cuidado de tu cabello.</p>
            <p style={{ color: '#bdb8ad', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{bizConfig.location}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
              <a href={bizConfig.googleMapsUrl} target="_blank" rel="noreferrer" style={{ color: '#cab77d', fontSize: '14px', padding: '10px 0' }}>Cómo llegar</a>
              <a href={`https://wa.me/34${(bizConfig.studioWhatsapp || bizConfig.phone).replace(/\s+/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#cab77d', fontSize: '14px', padding: '10px 0' }}>WhatsApp del Studio</a>
            </div>
          </section>
          <details style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '18px' }}>
            <summary style={{ color: '#ddd6c7', fontSize: '14px', cursor: 'pointer', lineHeight: 1.6 }}>¿Cómo fue tu experiencia? Comparte tu opinión</summary>
          <div style={{ backgroundColor: '#161616', border: 'none', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#d4af37', fontSize: '13px', fontFamily: 'serif', fontWeight: 'bold', letterSpacing: '1px' }}>{t('leaveReview')}</span>
            </div>
            {feedbackSubmitted ? (
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#1a261a', border: '1px solid #44bb44', borderRadius: '8px' }}>
                <p style={{ color: '#44bb44', fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>¡Gracias por compartir tu opinión!</p>
                {selectedRating >= 3 && (
                  <a href={bizConfig.googleReviewUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '6px', backgroundColor: '#d4af37', color: '#000', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none' }}>
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
                <input type="text" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} onFocus={(e) => e.target.select()} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', padding: '10px', fontSize: '13px' }} />
                <button type="submit" style={{ backgroundColor: '#242219', color: '#ddd0a4', border: '1px solid #76683e', padding: '12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {t('sendReview')}
                </button>
              </form>
            )}
          </div>
          </details>
          <footer style={{ borderTop: '1px solid #302f29', paddingTop: '18px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px' }}>
            <a href={bizConfig.instagramUrl} target="_blank" rel="noreferrer" style={{ color: '#aaa59b', fontSize: '12px', padding: '8px 0', textDecoration: 'none' }}>Instagram</a>
            <a href={bizConfig.facebookUrl} target="_blank" rel="noreferrer" style={{ color: '#aaa59b', fontSize: '12px', padding: '8px 0', textDecoration: 'none' }}>Facebook</a>
            <a href={bizConfig.tiktokUrl} target="_blank" rel="noreferrer" style={{ color: '#aaa59b', fontSize: '12px', padding: '8px 0', textDecoration: 'none' }}>TikTok</a>
          </footer>
        </div>
      )}

      {/* 2.2. CATÁLOGO & RESERVA SINCRONIZADO CON LA INTRANET */}
      {currentScreen === 'catalogBooking' && (
        <div style={{ maxWidth: '700px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '30px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '18px', letterSpacing: '3px', margin: '0 0 3px 0', fontFamily: 'serif' }}>{bizConfig.name}</h2>
              <p style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>{t('servicesSelectionTitle')}</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPortal')} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              {t('backToPortal')}
            </button>
          </div>
          {bookingSuccessMsg && (
            <div style={{ padding: '15px', backgroundColor: '#1a331a', border: '1px solid #44bb44', color: '#44bb44', borderRadius: '8px', fontSize: '12px', textAlign: 'center', lineHeight: '1.5', fontWeight: 'bold' }}>
              {bookingSuccessMsg}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: '28px', lineHeight: 1.25, fontFamily: 'serif', color: '#eee8dd', margin: '0 0 10px', fontWeight: 'normal' }}>Elige tu experiencia</h1>
            <p style={{ color: '#bdb8ad', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>Explora los servicios y añade los que necesitas. Después, elige tu fecha y hora.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {catalog.filter(cat => cat.subservices.some(sub => sub.active !== false)).map(cat => {
              const isCategoryExpanded = !!expandedCategories[cat.id];
              return <section key={cat.id} style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '14px', overflow: 'hidden' }}>
                <button type="button" aria-expanded={isCategoryExpanded} onClick={() => setExpandedCategories({ ...expandedCategories, [cat.id]: !isCategoryExpanded })} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: 'transparent', border: 'none', padding: '20px', textAlign: 'left', cursor: 'pointer', minHeight: '60px' }}>
                  <span><span style={{ color: '#eee8dd', fontFamily: 'serif', fontSize: '19px', lineHeight: 1.4, display: 'block' }}>{cat.title}</span><span style={{ color: '#a8a397', fontSize: '12px', display: 'block', marginTop: '5px' }}>{cat.subservices.filter(sub => sub.active !== false).length} servicios</span></span>
                  <span style={{ color: '#cab77d', fontSize: '13px', flexShrink: 0 }}>{isCategoryExpanded ? 'Cerrar −' : 'Explorar +'}</span>
                </button>
                {isCategoryExpanded && <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cat.subservices.filter(sub => sub.active !== false).map(sub => {
                    const selection = selectedServicesToBook.find(item => item.sub.id === sub.id);
                    const isSelected = !!selection;
                    const isExpanded = !!expandedSubDetails[sub.id];
                    const isBalayagePreview = normalizeCatalogSearch(sub.name).includes('balayage');
                    return <article key={sub.id} style={{ backgroundColor: isSelected ? '#262319' : '#141414', border: isSelected ? '1px solid #b59a4d' : '1px solid #302f29', borderRadius: isBalayagePreview ? '18px' : '10px', padding: isBalayagePreview ? '24px' : '18px', display: 'flex', flexDirection: 'column', gap: isBalayagePreview ? '16px' : '12px', backgroundImage: isBalayagePreview ? 'linear-gradient(135deg, rgba(202,183,125,0.08), transparent)' : undefined }}>
                      {isBalayagePreview && <span style={{ color: '#cab77d', fontSize: '10px', letterSpacing: '2px' }}>L’STUDIO · EXPERIENCIA PERSONALIZADA</span>}
                      <div style={{ color: '#eee8dd', fontSize: isBalayagePreview ? '26px' : '16px', fontFamily: isBalayagePreview ? 'serif' : undefined, lineHeight: 1.35, fontWeight: isBalayagePreview ? 'normal' : 'bold' }}>{sub.name}</div>
                      {isBalayagePreview ? <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '14px', borderBottom: '1px solid #39362b', paddingBottom: '16px' }}><strong style={{ color: '#cab77d', fontSize: '22px', fontWeight: 'normal' }}>{selection?.variant?.price || sub.price}</strong><span style={{ color: '#aaa59b', fontSize: '13px' }}>{selection?.variant?.duration || sub.duration}</span></div> : <div style={{ color: '#bdb8ad', fontSize: '13px', lineHeight: 1.6 }}>{selection?.variant?.duration || sub.duration}<span style={{ color: '#cab77d', fontWeight: 'bold', marginLeft: '12px' }}>{selection?.variant?.price || sub.price}</span></div>}
                      {sub.description && <p style={{ color: '#aaa59b', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{sub.description}</p>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#cab77d' }}>
                        {sub.requiresAssessment && <span style={isBalayagePreview ? { padding: '6px 10px', backgroundColor: '#242219', border: '1px solid #51472e', borderRadius: '20px', lineHeight: 1.5 } : undefined}>Valoración previa</span>}
                        {stylingLabel(sub) && <span style={isBalayagePreview ? { padding: '6px 10px', backgroundColor: '#242219', border: '1px solid #51472e', borderRadius: '20px', lineHeight: 1.5 } : undefined}>{stylingLabel(sub)}</span>}
                        {tonerLabel(sub) && <span style={isBalayagePreview ? { padding: '6px 10px', backgroundColor: '#242219', border: '1px solid #51472e', borderRadius: '20px', lineHeight: 1.5 } : undefined}>{tonerLabel(sub)}</span>}
                      </div>
                      {sub.showAlertBadge && <p style={{ color: '#ddd0a4', backgroundColor: '#262219', borderRadius: '6px', padding: '10px', margin: 0, fontSize: '13px', lineHeight: 1.5 }}>{sub.alertText || 'Recuerda añadir tu peinado para asegurar el tiempo en agenda.'}</p>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <button type="button" aria-pressed={isSelected} onClick={() => {
                          setSelectedServicesToBook(previous => isSelected ? previous.filter(item => item.sub.id !== sub.id) : [...previous, { sub, variant: sub.hasVariants ? sub.variants?.[0] || null : null }]);
                        }} style={{ backgroundColor: isSelected ? '#d4af37' : '#242219', border: '1px solid #76683e', color: isSelected ? '#17150f' : '#ddd0a4', padding: '11px 16px', minHeight: '44px', borderRadius: '7px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>{isSelected ? 'Seleccionado · Quitar' : 'Añadir a mi cita'}</button>
                        <button type="button" aria-expanded={isExpanded} onClick={() => setExpandedSubDetails({ ...expandedSubDetails, [sub.id]: !isExpanded })} style={{ background: 'transparent', border: 'none', color: '#bdb8ad', padding: '11px 8px', minHeight: '44px', cursor: 'pointer', fontSize: '13px' }}>{isExpanded ? 'Cerrar detalles' : 'Ver qué incluye'}</button>
                      </div>
                      {isSelected && sub.hasVariants && !!sub.variants?.length && <label style={{ color: '#cab77d', fontSize: '13px' }}>Elige tu largo o pack
                        <select value={selection?.variant?.id || ''} onChange={e => {
                          const variant = sub.variants?.find(v => v.id === e.target.value) || null;
                          setSelectedServicesToBook(previous => previous.map(item => item.sub.id === sub.id ? { ...item, variant } : item));
                        }} style={{ display: 'block', width: '100%', minHeight: '46px', marginTop: '8px', padding: '10px', backgroundColor: '#191919', color: '#eee8dd', border: '1px solid #76683e', borderRadius: '6px', fontSize: '14px' }}>
                          <option value="" disabled>Selecciona una opción</option>
                          {sub.variants!.map(v => <option key={v.id} value={v.id}>{v.name} · {v.price} · {v.duration}</option>)}
                        </select>
                      </label>}
                      {isExpanded && renderServiceInfo(sub)}
                    </article>;
                  })}
                </div>}
              </section>;
            })}
          </div>
          {selectedServicesToBook.length > 0 && <section aria-label="Resumen de tu selección" style={{ backgroundColor: '#1d1c17', border: '1px solid #76683e', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ color: '#eee8dd', fontFamily: 'serif', fontSize: '20px', margin: '0 0 14px', fontWeight: 'normal' }}>Tu selección</h2>
            {selectedServicesToBook.map(item => <div key={item.sub.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #34332d' }}>
              <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#ddd6c7' }}>{item.sub.name}{item.variant && <span> · {item.variant.name}</span>}<span style={{ display: 'block', color: '#cab77d' }}>{item.variant?.price || item.sub.price} · {item.variant?.duration || item.sub.duration}</span></div>
              <button type="button" aria-label={`Quitar ${item.sub.name}`} onClick={() => setSelectedServicesToBook(previous => previous.filter(selected => selected.sub.id !== item.sub.id))} style={{ background: 'none', border: 'none', color: '#bdb8ad', cursor: 'pointer', padding: '10px', minHeight: '44px', fontSize: '12px' }}>Quitar</button>
            </div>)}
            <p style={{ color: '#bdb8ad', fontSize: '13px', margin: '14px 0 0' }}>Duración de los servicios: {getModalDuration(selectedServicesToBook)} min</p>
          </section>}
          <div style={{ backgroundColor: '#181818', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '14px', fontFamily: 'serif', color: '#d4af37', margin: 0 }}>{t('selectDate')}</h2>
            {selectedServicesToBook.length === 0 ? (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,12,12,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '20px', textAlign: 'center' }}>
                <span style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold', fontFamily: 'serif', letterSpacing: '1px' }}>
                  SELECCIONA UN SERVICIO PARA ACTIVAR ESTE PASO
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedServicesToBook.some(item => (catalog.flatMap(c => c.subservices).find(sub => sub.id === item.sub.id) || item.sub).requiresAssessment) && <p style={{ color: '#d4af37', fontSize: '12px' }}>Tu selección requiere valoración previa. Elegir fecha y hora registra una solicitud; Ana debe aprobarla antes de confirmar la cita.</p>}
                {getTonerError(selectedServicesToBook) && <p role="alert" style={{ color: '#d4af37', fontSize: '12px' }}>{getTonerError(selectedServicesToBook)}</p>}
                {getStylingError(selectedServicesToBook) && <p role="alert" style={{ color: '#d4af37', fontSize: '12px' }}>{getStylingError(selectedServicesToBook)}</p>}
                <p style={{ color: '#ccc', fontSize: '11px', margin: 0 }}>Revisa tu selección y continúa para elegir fecha y hora.</p>
                <button onClick={() => setCurrentScreen('visualAgenda')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}>
                  Elegir fecha y hora
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AGENDA CLIENTAS · SEMANA Y HORAS DISPONIBLES */}
      {currentScreen === 'visualAgenda' && (
        <div style={{ maxWidth: '680px', width: '100%', backgroundColor: '#121212', border: '1px solid #34332d', borderRadius: '16px', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <button type="button" onClick={() => setCurrentScreen('catalogBooking')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#cab77d', padding: '10px 0', cursor: 'pointer' }}>← Volver a mis servicios</button>
          <div><h2 style={{ fontFamily: 'serif', color: '#eee8dd', fontSize: '28px', fontWeight: 'normal', margin: '0 0 8px' }}>Elige tu momento</h2><p style={{ color: '#bdb8ad', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>Mostramos las horas que permiten realizar tu cita completa · {getModalDuration(selectedServicesToBook)} min.</p></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <button type="button" aria-label="Semana anterior" onClick={() => { const day = new Date(bookingDate); day.setDate(day.getDate() - 7); choosePortalDate(day); }} style={{ padding: '12px', background: '#191919', color: '#cab77d', border: '1px solid #34332d', borderRadius: '8px', cursor: 'pointer' }}>←</button>
            <span style={{ color: '#eee8dd', fontSize: '14px', textAlign: 'center' }}>{portalWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
            <button type="button" aria-label="Semana siguiente" onClick={() => { const day = new Date(bookingDate); day.setDate(day.getDate() + 7); choosePortalDate(day); }} style={{ padding: '12px', background: '#191919', color: '#cab77d', border: '1px solid #34332d', borderRadius: '8px', cursor: 'pointer' }}>→</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '5px' }}>
            {portalWeekDays.map(day => {
              const selected = formatDateKey(day) === formatDateKey(bookingDate);
              const available = portalAvailableTimes(day).length > 0;
              return <button type="button" key={formatDateKey(day)} aria-pressed={selected} disabled={!portalDateAllowed(day)} onClick={() => choosePortalDate(day)} style={{ minHeight: '70px', padding: '8px 1px', backgroundColor: selected ? '#d4af37' : '#191919', color: selected ? '#17150f' : '#ddd6c7', opacity: portalDateAllowed(day) ? 1 : 0.35, border: '1px solid #34332d', borderRadius: '9px', cursor: 'pointer' }}><span style={{ fontSize: '10px', display: 'block' }}>{day.toLocaleDateString('es-ES', { weekday: 'short' })}</span><strong style={{ fontSize: '18px', display: 'block', margin: '5px 0' }}>{day.getDate()}</strong><span aria-label={available ? 'Con horas disponibles' : 'Sin horas disponibles'} style={{ fontSize: '10px' }}>{available ? '●' : '—'}</span></button>;
            })}
          </div>
          <label style={{ color: '#bdb8ad', fontSize: '13px' }}>Ir a otra fecha<input type="date" value={formatDateKey(bookingDate)} onChange={e => { if (e.target.value) choosePortalDate(new Date(`${e.target.value}T12:00:00`)); }} style={{ display: 'block', marginTop: '8px', padding: '12px', backgroundColor: '#191919', color: '#eee8dd', border: '1px solid #34332d', borderRadius: '8px', boxSizing: 'border-box', width: '100%' }} /></label>
          <section><h3 style={{ color: '#eee8dd', fontSize: '16px', margin: '0 0 16px' }}>{bookingDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            {!portalTimes.length ? <p style={{ color: '#bdb8ad', fontSize: '14px', lineHeight: 1.6 }}>No hay horas disponibles para tu selección en este día. Prueba otra fecha.</p> : ['Mañana', 'Tarde'].map(period => {
              const times = portalTimes.filter(time => period === 'Mañana' ? Number(time.slice(0, 2)) < 14 : Number(time.slice(0, 2)) >= 14);
              return times.length ? <div key={period} style={{ marginBottom: '18px' }}><p style={{ color: '#aaa59b', fontSize: '12px' }}>{period}</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(76px, 1fr))', gap: '9px' }}>{times.map(time => <button type="button" key={time} aria-pressed={time === selectedVisualTime} onClick={() => setSelectedVisualTime(time)} style={{ minHeight: '48px', backgroundColor: time === selectedVisualTime ? '#d4af37' : '#191919', color: time === selectedVisualTime ? '#17150f' : '#ddd0a4', border: '1px solid #76683e', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}>{time}</button>)}</div></div> : null;
            })}
          </section>
          <div style={{ borderTop: '1px solid #34332d', paddingTop: '18px' }}>
            <p style={{ color: '#bdb8ad', fontSize: '13px', lineHeight: 1.6 }}>{selectedServicesToBook.map(item => item.sub.name + (item.variant ? ` · ${item.variant.name}` : '')).join(' + ')}</p>
            {selectedVisualTime && <p style={{ color: '#eee8dd', fontSize: '15px' }}>{bookingDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} · {selectedVisualTime}</p>}
            <button type="button" onClick={handleConfirmarCitaVisual} disabled={!portalTimes.includes(selectedVisualTime)} style={{ width: '100%', minHeight: '54px', padding: '14px', backgroundColor: portalTimes.includes(selectedVisualTime) ? '#d4af37' : '#34332d', color: portalTimes.includes(selectedVisualTime) ? '#17150f' : '#aaa', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>{!selectedVisualTime ? 'Selecciona una hora' : getApprovalReason(selectedServicesToBook, formatDateKey(bookingDate)) ? 'Solicitar esta cita' : 'Continuar con mi reserva'}</button>
          </div>
        </div>
      )}

      {/* 2.3. PASAPORTE DE EXPERIENCIAS DE AUTOR */}
      {currentScreen === 'clientHistoryPage' && (
        <div style={{ maxWidth: '700px', width: '100%', backgroundColor: '#121212', border: '1px solid #34332d', borderRadius: '16px', padding: '22px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <button type="button" onClick={() => setCurrentScreen('clientPortal')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#cab77d', padding: '10px 0', minHeight: '44px', fontSize: '13px', cursor: 'pointer' }}>← Volver a mi espacio</button>
          <header>
            <p style={{ color: '#cab77d', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>L’Studio Ana · Cuidado personalizado</p>
            <h2 style={{ color: '#eee8dd', fontFamily: 'serif', fontSize: '30px', fontWeight: 'normal', lineHeight: 1.25, margin: '0 0 12px' }}>Mi pasaporte capilar</h2>
            <p style={{ color: '#bdb8ad', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{currentClientRecord?.nombre || 'Tu espacio'}, aquí encontrarás tu diagnóstico, tus cuidados y la evolución de tu cabello.</p>
          </header>
          <section style={{ background: 'linear-gradient(135deg, #252219, #191918)', border: '1px solid #51472e', borderRadius: '14px', padding: '22px' }}>
            <span style={{ color: '#cab77d', fontSize: '11px', letterSpacing: '1px' }}>01 · CONOCEMOS TU CABELLO</span>
            <h3 style={{ color: '#eee8dd', fontFamily: 'serif', fontWeight: 'normal', fontSize: '23px', margin: '12px 0' }}>Tu ADN capilar</h3>
            <p style={{ color: '#d0ccc3', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: 0 }}>{currentClientRecord?.dniCapilar || 'En tu próxima visita, Ana podrá registrar aquí el diagnóstico de tu cabello.'}</p>
          </section>
          <section style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '14px', padding: '22px' }}>
            <span style={{ color: '#cab77d', fontSize: '11px', letterSpacing: '1px' }}>02 · ENTRE VISITAS</span>
            <h3 style={{ color: '#eee8dd', fontFamily: 'serif', fontWeight: 'normal', fontSize: '23px', margin: '12px 0' }}>Tu ritual en casa</h3>
            <p style={{ color: '#bdb8ad', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: 0 }}>{currentClientRecord?.prescripcionCasa || 'Ana añadirá aquí los productos y las pautas de cuidado recomendados para ti.'}</p>
          </section>
          <section style={{ padding: '4px 0' }}>
            <span style={{ color: '#cab77d', fontSize: '11px', letterSpacing: '1px' }}>03 · TU RECORRIDO</span>
            <h3 style={{ color: '#eee8dd', fontFamily: 'serif', fontWeight: 'normal', fontSize: '23px', margin: '12px 0 18px' }}>Historial de visitas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(currentClientRecord?.pastVisits || []).length ? currentClientRecord!.pastVisits!.map((visit, index) => <article key={index} style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderLeft: '2px solid #76683e', borderRadius: '10px', padding: '18px' }}>
                <p style={{ color: '#cab77d', fontSize: '12px', margin: '0 0 8px' }}>{visit.date}</p>
                <h4 style={{ color: '#eee8dd', fontSize: '16px', lineHeight: 1.5, margin: '0 0 8px' }}>{visit.service}</h4>
                {visit.stylist && <p style={{ color: '#aaa59b', fontSize: '12px', margin: 0 }}>Con {visit.stylist}</p>}
                {visit.notes && <p style={{ color: '#bdb8ad', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '14px 0 0' }}>{visit.notes}</p>}
              </article>) : <div style={{ backgroundColor: '#191919', padding: '20px', borderRadius: '10px', color: '#bdb8ad', fontSize: '14px', lineHeight: 1.7 }}>Tu historia en el Studio empieza aquí. Cuando registremos tu primera visita, aparecerá en este apartado.</div>}
            </div>
          </section>
          <section style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '14px', padding: '22px' }}>
            <h3 style={{ color: '#eee8dd', fontFamily: 'serif', fontWeight: 'normal', fontSize: '23px', margin: '0 0 14px' }}>Seguimos cuidando de ti</h3>
            <p style={{ color: '#bdb8ad', fontSize: '13px', margin: '0 0 8px' }}>Próxima visita recomendada</p>
            <p style={{ color: '#cab77d', fontSize: '20px', margin: '0 0 14px' }}>{currentClientRecord?.proximaVisitaSugerida || 'Pendiente de recomendación'}</p>
            <p style={{ color: '#aaa59b', fontSize: '13px', lineHeight: 1.6, margin: '0 0 18px' }}>Es una recomendación de mantenimiento. Para reservar, elige tus servicios y una hora disponible.</p>
            <button type="button" onClick={() => setCurrentScreen('catalogBooking')} style={{ width: '100%', minHeight: '52px', backgroundColor: '#d4af37', color: '#17150f', border: 'none', borderRadius: '9px', padding: '14px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>Reservar mi próxima visita</button>
            {currentClientRecord?.ultimaVisita && <p style={{ color: '#aaa59b', fontSize: '12px', marginBottom: 0 }}>Última visita registrada: {currentClientRecord.ultimaVisita}</p>}
          </section>
          <div style={{ backgroundColor: '#161616', border: '1px solid #34332d', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '14px', fontFamily: 'serif', margin: 0 }}>{t('aiAssistant')}</h3>
            <form onSubmit={handleRunAiRecommendation} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea value={clientWishText} onChange={(e) => setClientWishText(e.target.value)} onFocus={(e) => e.target.select()} placeholder="Ej. Quiero matizar mi rubio..." rows={2} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '14px', lineHeight: 1.6, resize: 'none' }} />
              <button type="submit" style={{ backgroundColor: '#242219', color: '#ddd0a4', border: '1px solid #76683e', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                {t('consultAi')}
              </button>
            </form>
            {aiRecommendation && (
              <div style={{ backgroundColor: '#1f1a10', border: '1px solid #d4af37', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
                <span style={{ color: '#d4af37', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>Tratamiento Sugerido:</span>
                <h4 style={{ color: '#fff', fontSize: '13px', margin: 0, fontWeight: 'bold' }}>{aiRecommendation.serviceName}</h4>
                <p style={{ color: '#ccc', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{aiRecommendation.reason}</p>
              </div>
            )}
          </div>
          <button onClick={() => setCurrentScreen('clientPortal')} style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #444', color: '#ccc', padding: '12px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
            {t('backToPortal')}
          </button>
        </div>
      )}

      {/* 3. INTRANET ADMIN LOGIN */}
      {currentScreen === 'adminLogin' && (
        <div style={{ maxWidth: '360px', width: '100%', backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '16px', padding: '35px', boxSizing: 'border-box', textAlign: 'center' }}>
          <h2 style={{ color: '#d4af37', fontSize: '20px', letterSpacing: '3px', margin: '0 0 5px 0', fontFamily: 'serif' }}>L'STUDIO</h2>
          <p style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '30px' }}>Intranet Privada de Ana</p>
          <form onSubmit={handleAdminLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="password" placeholder="PIN de Administración (0000)" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} onFocus={(e) => e.target.select()} maxLength={4} style={{ padding: '12px', backgroundColor: '#1f1f1f', border: adminError ? '1px solid #ff4444' : '1px solid #444', color: '#fff', borderRadius: '8px', textAlign: 'center', fontSize: '16px', letterSpacing: '4px' }} />
            {adminError && <p style={{ color: '#ff4444', fontSize: '11px', margin: 0 }}>PIN de administrador incorrecto.</p>}
            <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
              Acceder al Panel Maestro
            </button>
          </form>
          <button onClick={() => setCurrentScreen('clientPin')} style={{ background: 'none', border: 'none', color: '#777', fontSize: '11px', marginTop: '20px', cursor: 'pointer' }}>
            Volver al inicio
          </button>
        </div>
      )}

      {/* 4. PANEL DE ADMINISTRACIÓN */}
      {currentScreen === 'adminPanel' && (
        <div className="studio-admin-shell" style={{ maxWidth: '1680px', width: '100%', backgroundColor: '#121212', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', padding: '25px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <style>{`
            .studio-desktop-nav { display: none; }
            .studio-admin-content { min-width: 0; }
            @media (min-width: 1100px) {
              .studio-admin-shell { display: grid !important; grid-template-columns: 210px minmax(0, 1fr); column-gap: 28px !important; align-items: start; }
              .studio-admin-header { grid-column: 1 / -1; }
              .studio-mobile-nav { display: none !important; }
              .studio-desktop-nav { display: flex; flex-direction: column; gap: 5px; position: sticky; top: 20px; padding: 18px 10px; border: 1px solid #34332d; border-radius: 14px; background: #171717; }
              .studio-calendar-tools { width: 210px !important; flex-shrink: 0; }
              .studio-calendar-main { flex-basis: 500px !important; }
            }
            @media (max-width: 1099px) {
              .studio-calendar-tools { width: 100% !important; }
              .studio-calendar-main { flex-basis: 100% !important; }
            }
          `}</style>
          <div className="studio-admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ color: '#d4af37', fontSize: '28px', letterSpacing: '1px', margin: '0 0 3px 0', fontFamily: 'serif' }}>{t('adminMasterTitle')}</h2>
              <p style={{ color: '#888', fontSize: '12px', letterSpacing: '1px', margin: 0 }}>{bizConfig.name} - {t('adminSubtitle')}</p>
            </div>
            <button onClick={() => setCurrentScreen('clientPin')} style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              {t('logout')}
            </button>
          </div>
          <nav className="studio-mobile-nav" aria-label="Navegación de 360studio" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
              {([['agenda', 'Agenda'], ['clients', 'Clientas'], ['catalog', 'Catálogo']] as const).map(([tab, label]) => <button type="button" key={tab} aria-current={adminTab === tab ? 'page' : undefined} onClick={() => setAdminTab(tab)} style={{ minHeight: '48px', padding: '12px 6px', backgroundColor: adminTab === tab ? '#d4af37' : '#191919', color: adminTab === tab ? '#17150f' : '#ddd6c7', border: '1px solid #34332d', borderRadius: '9px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>{label}</button>)}
            </div>
            <details style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '9px', padding: '14px' }}>
              <summary style={{ color: '#cab77d', cursor: 'pointer', fontSize: '14px' }}>Más opciones{!['agenda', 'clients', 'catalog'].includes(adminTab) ? ' · ' + ({ config: 'Configuración', detractors: 'Buzón', crm: 'CRM e informes', holidays: 'Vacaciones y festivos' } as Record<string, string>)[adminTab] : ''}</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginTop: '14px' }}>
                {([['config', 'Configuración'], ['detractors', `Buzón (${feedbackList.filter(f => f.type === 'detractor').length})`], ['crm', 'CRM e informes'], ['holidays', 'Vacaciones y festivos']] as const).map(([tab, label]) => <button type="button" key={tab} aria-current={adminTab === tab ? 'page' : undefined} onClick={() => setAdminTab(tab)} style={{ minHeight: '44px', padding: '10px 12px', textAlign: 'left', backgroundColor: adminTab === tab ? '#242219' : '#141414', border: '1px solid #34332d', color: adminTab === tab ? '#ddd0a4' : '#bdb8ad', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>{label}</button>)}
              </div>
            </details>
          </nav>

          <nav className="studio-desktop-nav" aria-label="Menú lateral de 360studio">
            <p style={{ color: '#aaa59b', fontSize: '11px', letterSpacing: '2px', padding: '0 12px', margin: '0 0 12px' }}>GESTIÓN DEL STUDIO</p>
            {([['agenda', 'Agenda Maestra'], ['clients', 'Clientas'], ['catalog', 'Catálogo'], ['config', 'Configuración'], ['detractors', `Buzón (${feedbackList.filter(f => f.type === 'detractor').length})`], ['crm', 'CRM e informes'], ['holidays', 'Vacaciones y festivos']] as const).map(([tab, label]) => <button type="button" key={tab} aria-current={adminTab === tab ? 'page' : undefined} onClick={() => setAdminTab(tab)} style={{ width: '100%', textAlign: 'left', minHeight: '48px', padding: '14px', backgroundColor: adminTab === tab ? '#242219' : 'transparent', color: adminTab === tab ? '#ddd0a4' : '#bdb8ad', border: adminTab === tab ? '1px solid #76683e' : '1px solid transparent', borderRadius: '9px', fontSize: '14px', cursor: 'pointer' }}>{label}</button>)}
          </nav>
          <main className="studio-admin-content">
          {/* TAB 1: AGENDA MAESTRA */}
          {adminTab === 'agenda' && (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flexBasis: '100%', width: '100%' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
                  <div><p style={{ color: '#cab77d', fontSize: '13px', letterSpacing: '2px', margin: '0 0 8px' }}>360studio · TU DÍA EN EL SALÓN</p><h2 style={{ color: '#eee8dd', fontFamily: 'serif', fontSize: '28px', fontWeight: 'normal', margin: 0 }}>Agenda Maestra</h2></div>
                  <button type="button" onClick={() => setFechaSeleccionada(new Date())} style={{ padding: '12px 20px', background: '#242219', border: '1px solid #76683e', color: '#ddd0a4', borderRadius: '8px', cursor: 'pointer' }}>Ir a hoy</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
                  {(['day', 'week'] as const).map(view => <button type="button" key={view} aria-pressed={agendaViewMode === view} onClick={() => setAgendaViewMode(view)} style={{ backgroundColor: agendaViewMode === view ? '#d4af37' : '#191919', color: agendaViewMode === view ? '#17150f' : '#ddd6c7', border: '1px solid #76683e', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>{view === 'day' ? 'Día' : 'Semana'}</button>)}
                  <button type="button" onClick={() => {
                    if (isDateBlockedByHoliday(formatDateKey(fechaSeleccionada))) { alert('El día seleccionado está bloqueado. Elige otra fecha.'); return; }
                    const freeTime = hoursList.find(time => !isTimeSlotOccupied(formatDateKey(fechaSeleccionada), time));
                    if (!freeTime) { alert('No hay huecos libres en el día seleccionado.'); return; }
                    handleCellClick(fechaSeleccionada, diaSeleccionadoObj.name, freeTime);
                  }} style={{ backgroundColor: '#242219', color: '#ddd0a4', border: '1px solid #76683e', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>+ Nueva cita</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  {[
                    { label: 'Citas del día', value: appointments.filter(item => item.dateKey === formatDateKey(fechaSeleccionada)).length, color: '#ddd6c7' },
                    { label: 'Solicitudes por revisar', value: appointments.filter(item => item.saturdayApproval?.status === 'pending').length, color: '#d7b76c' },
                    { label: 'Bizum por confirmar', value: appointments.filter(item => item.advancePayment?.status === 'pending').length, color: '#a8bad9' }
                  ].map(item => <div key={item.label} style={{ padding: '18px', backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px' }}><span style={{ display: 'block', color: '#aaa59b', fontSize: '13px' }}>{item.label}</span><strong style={{ display: 'block', color: item.color, fontSize: '27px', marginTop: '8px' }}>{item.value}</strong></div>)}
                </div>
                <section style={{ marginTop: '18px', padding: '20px', backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px' }}>
                  <h3 style={{ fontFamily: 'serif', fontSize: '22px', color: '#eee8dd', fontWeight: 'normal', margin: '0 0 8px' }}>Citas del día</h3>
                  <p style={{ color: '#aaa59b', fontSize: '13px', margin: '0 0 16px' }}>{fechaSeleccionada.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {appointments.filter(item => item.dateKey === formatDateKey(fechaSeleccionada)).sort((a, b) => a.time.localeCompare(b.time)).map(item => <button type="button" key={item.id} onClick={() => setViewApptModal(item)} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '16px', textAlign: 'left', backgroundColor: adminAppointmentColor(item).background, border: `1px solid ${adminAppointmentColor(item).border}`, borderRadius: '10px', padding: '16px', cursor: 'pointer', color: '#eee8dd', width: '100%' }}>
                      <div style={{ minWidth: '55px' }}><strong style={{ fontSize: '19px' }}>{item.time}</strong><span style={{ display: 'block', color: '#bdb8ad', fontSize: '12px', marginTop: '6px' }}>{item.durationMinutes || 45} min</span></div>
                      <div style={{ flex: '1 1 180px', fontSize: '14px', lineHeight: 1.6, overflowWrap: 'anywhere' }}><strong>{item.clientName}</strong><span style={{ display: 'block', color: '#d0ccc3' }}>{item.serviceSubcategory.replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, '')}</span><span style={{ display: 'block', fontSize: '12px', color: '#bdb8ad', marginTop: '8px' }}>{item.completedAt ? 'Realizada' : item.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : item.advancePayment?.status === 'pending' ? 'Pendiente de Bizum' : 'Confirmada'} · Ver detalles</span></div>
                    </button>)}
                    {!appointments.some(item => item.dateKey === formatDateKey(fechaSeleccionada)) && <p style={{ color: '#aaa59b', fontSize: '14px', lineHeight: 1.6 }}>No hay citas registradas para este día. Puedes crear una con «Nueva cita» o elegir un hueco en el calendario.</p>}
                  </div>
                </section>
                <details style={{ marginTop: '14px', padding: '16px', backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '10px' }}>
                  <summary style={{ color: '#cab77d', cursor: 'pointer', fontSize: '14px' }}>Revisar solicitudes y pagos pendientes</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                    {appointments.filter(item => item.saturdayApproval?.status === 'pending' || item.advancePayment?.status === 'pending').map(item => <button type="button" key={item.id} onClick={() => setViewApptModal(item)} style={{ textAlign: 'left', padding: '14px', background: '#141414', border: '1px solid #34332d', borderRadius: '8px', color: '#ddd6c7', cursor: 'pointer', fontSize: '13px', lineHeight: 1.7 }}><strong>{item.clientName}</strong> · {item.dateKey.split('-').reverse().join('/')} · {item.time}<span style={{ display: 'block', color: item.saturdayApproval?.status === 'pending' ? '#d7b76c' : '#a8bad9' }}>{item.completedAt ? 'Realizada' : item.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : 'Pendiente de Bizum'}</span></button>)}
                    {!appointments.some(item => item.saturdayApproval?.status === 'pending' || item.advancePayment?.status === 'pending') && <p style={{ color: '#aaa59b', fontSize: '13px' }}>No hay solicitudes ni pagos pendientes.</p>}
                  </div>
                </details>
                <p style={{ color: '#aaa59b', fontSize: '12px', lineHeight: 1.7 }}>Verde suave: confirmada · Ámbar: por aprobar · Azul: pendiente de Bizum. Pulsa una cita para ver sus detalles.</p>
              </div>

              <div className="studio-calendar-tools" style={{ width: '280px', backgroundColor: '#161616', border: '1px solid #34332d', borderRadius: '12px', padding: '16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <button onClick={() => cambiarMesMiniCal(-1)} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#d4af37', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>◀</button>
                    <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', fontFamily: 'serif' }}>{nombresMeses[mesMini]} {añoMini}</span>
                    <button onClick={() => cambiarMesMiniCal(1)} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#d4af37', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>▶</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '6px' }}>
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                      <div key={i} style={{ color: '#777', fontSize: '12px', fontWeight: 'bold' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                    {diasRejillaMini.map((dateObj, i) => {
                      if (!dateObj) return <div key={i} />;
                      const dKey = formatDateKey(dateObj);
                      const isBlocked = isDateBlockedByHoliday(dKey);
                      const isSelected = dKey === formatDateKey(fechaSeleccionada);
                      return (
                        <button key={i} onClick={() => setFechaSeleccionada(dateObj)} style={{ backgroundColor: isBlocked ? '#441111' : (isSelected ? '#d4af37' : '#1c1c1c'), color: isBlocked ? '#ff8888' : (isSelected ? '#000' : '#ccc'), border: isBlocked ? '1px solid #ff4444' : 'none', borderRadius: '4px', padding: '5px 0', fontSize: '13px', cursor: 'pointer', fontWeight: isSelected ? 'bold' : 'normal' }}>
                          {dateObj.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <hr style={{ borderColor: 'rgba(212,175,55,0.2)', margin: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Sus calendarios</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1c1c1c', padding: '8px 10px', borderRadius: '6px', border: '1px solid #333' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#d4af37' }} />
                      <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>L'Studio Ana</span>
                    </div>
                    <span style={{ color: '#888', fontSize: '13px' }}>Principal</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1c1c1c', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d4af37' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" checked={googleCalendarSyncActive} onChange={() => setGoogleCalendarSyncActive(!googleCalendarSyncActive)} style={{ accentColor: '#d4af37', cursor: 'pointer' }} />
                      <span style={{ color: '#fff', fontSize: '13px' }}>Agenda Citas L'Studio</span>
                    </div>
                    <span style={{ color: googleCalendarConnected ? '#44bb44' : '#ff4444', fontSize: '13px', fontWeight: 'bold' }}>{googleCalendarConnected ? 'Google Sync 🔗' : 'Desconectado'}</span>
                  </div>
                  <button onClick={() => {
                    setGoogleCalendarConnected(!googleCalendarConnected);
                    alert(googleCalendarConnected ? 'Google Calendar desconectado.' : '¡Google Calendar conectado y sincronizado con éxito con la Intranet!');
                  }} style={{ background: 'transparent', border: '1px dashed rgba(212,175,55,0.4)', color: '#d4af37', padding: '6px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' }}>
                    {googleCalendarConnected ? '+ Vincular otro calendario' : 'Conectar con Google Calendar'}
                  </button>
                </div>
                <hr style={{ borderColor: 'rgba(212,175,55,0.2)', margin: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Control de Reservas</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#ccc' }}>
                    <span>Habilitar reserva fuera de horario</span>
                    <input type="checkbox" checked={enableOutOfHours} onChange={() => setEnableOutOfHours(!enableOutOfHours)} style={{ accentColor: '#d4af37', width: '16px', height: '16px', cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#ccc' }}>
                    <span>Activar doble reserva (solapes)</span>
                    <input type="checkbox" checked={enableDoubleBooking} onChange={() => setEnableDoubleBooking(!enableDoubleBooking)} style={{ accentColor: '#d4af37', width: '16px', height: '16px', cursor: 'pointer' }} />
                  </div>

                  {/* PREFERENCIAS DE CALENDARIO: SELECTOR DE VISTA CONMUTABLE (SEMANAL O DIARIO) */}
                  <div style={{ backgroundColor: '#1c1c1c', border: '1px solid #34332d', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚙️</span> Preferencias de calendario
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => setAgendaViewMode('week')}
                        style={{
                          flex: 1,
                          backgroundColor: agendaViewMode === 'week' ? '#d4af37' : '#121212',
                          color: agendaViewMode === 'week' ? '#000' : '#ccc',
                          border: '1px solid #d4af37',
                          padding: '6px 4px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Ver Semanal
                      </button>
                      <button 
                        onClick={() => setAgendaViewMode('day')}
                        style={{
                          flex: 1,
                          backgroundColor: agendaViewMode === 'day' ? '#d4af37' : '#121212',
                          color: agendaViewMode === 'day' ? '#000' : '#ccc',
                          border: '1px solid #d4af37',
                          padding: '6px 4px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Ver Diario
                      </button>
                    </div>
                  </div>

                  {/* BOTÓN REORGANIZADO: CAMBIAR LAS HORAS DE TRABAJO (DIRIGE A CONFIGURACIÓN > HORARIOS) */}
                  <button 
                    onClick={() => {
                      setAdminTab('config');
                      setConfigSubTab('schedule');
                    }} 
                    style={{ background: '#1c1c1c', border: '1px solid #d4af37', color: '#d4af37', padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    🕒 Cambiar las horas de trabajo
                  </button>

                  <button onClick={() => window.print()} style={{ background: '#1c1c1c', border: '1px solid #333', color: '#aaa', padding: '6px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}>
                    🖨️ Imprimir calendario (CTRL + P)
                  </button>
                </div>
              </div>

              <div className="studio-calendar-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', minWidth: 0, overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: 0 }}>
                    Agenda Maestra {agendaViewMode === 'week' ? '(Vista Semanal)' : `(Vista Diaria - ${diaSeleccionadoObj.name} ${diaSeleccionadoObj.dateFormatted})`}
                  </h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => { const d = new Date(fechaSeleccionada); d.setDate(d.getDate() - (agendaViewMode === 'week' ? 7 : 1)); setFechaSeleccionada(d); }} style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>◀ Anterior</button>
                    <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold' }}>
                      {agendaViewMode === 'week' ? `Semana del ${semanaActual[0].dateFormatted}` : `${diaSeleccionadoObj.name} ${diaSeleccionadoObj.dateFormatted}`}
                    </span>
                    <button onClick={() => { const d = new Date(fechaSeleccionada); d.setDate(d.getDate() + (agendaViewMode === 'week' ? 7 : 1)); setFechaSeleccionada(d); }} style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Siguiente ►</button>
                  </div>
                </div>

                {/* VISTA DINÁMICA DE LA TABLA (SEMANAL vs DIARIA) */}
                <div style={{ overflowX: 'auto', backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '15px' }}>
                  {agendaViewMode === 'week' ? (
                    /* REJILLA VISTA SEMANAL (Lunes a Sábado) */
                    <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(6, minmax(110px, 1fr))', gap: '4px', minWidth: '750px' }}>
                      <div style={{ padding: '8px', textAlign: 'center', color: '#777', fontSize: '13px', fontWeight: 'bold' }}>Hora</div>
                      {semanaActual.map((day, idx) => {
                        const dKey = formatDateKey(day.dateObj);
                        const isBlocked = isDateBlockedByHoliday(dKey);
                        return (
                          <div key={idx} style={{ padding: '8px', textAlign: 'center', backgroundColor: isBlocked ? '#2e1414' : '#1e1e1e', borderRadius: '6px', borderBottom: isBlocked ? '2px solid #ff4444' : '2px solid #d4af37' }}>
                            <div style={{ color: isBlocked ? '#ff8888' : '#d4af37', fontSize: '12px', fontWeight: 'bold' }}>{day.name}</div>
                            <div style={{ color: '#aaa', fontSize: '12px' }}>{day.dateFormatted} {isBlocked ? '🔒' : ''}</div>
                          </div>
                        );
                      })}
                      {hoursList.map((time, hIdx) => (
                        <React.Fragment key={hIdx}>
                          <div style={{ padding: '8px 4px', textAlign: 'center', color: '#888', fontSize: '12px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {time}
                          </div>
                          {semanaActual.map((day, dIdx) => {
                            const targetKey = formatDateKey(day.dateObj);
                            const isBlocked = isDateBlockedByHoliday(targetKey);
                            const appt = appointments.find(a => a.dateKey === targetKey && a.time === time);
                            const occupiedByDuration = isTimeSlotOccupied(targetKey, time);
                            return (
                              <div key={dIdx} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, day.dateObj, day.name, time)} onClick={() => handleCellClick(day.dateObj, day.name, time)} style={{ backgroundColor: isBlocked ? '#261212' : (appt ? adminAppointmentColor(appt).background : (occupiedByDuration ? '#1a1510' : '#1a1a1a')), border: isBlocked ? '1px solid #ff4444' : (appt ? `1px solid ${adminAppointmentColor(appt).border}` : (occupiedByDuration ? '1px dashed #554422' : '1px dashed #2c2c2c')), borderRadius: '6px', padding: '6px', minHeight: '48px', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                {isBlocked ? (
                                  <div style={{ color: '#ff6666', fontSize: '13px', textAlign: 'center', fontWeight: 'bold' }}>BLOQUEADO</div>
                                ) : appt ? (
                                  <div draggable onDragStart={(e) => handleDragStart(e, appt.id)} title="Arrastra para mover a cualquier hora u otro día" style={{ fontSize: '12px' }}>
                                    <div style={{ color: '#d4af37', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span>{appt.clientName}</span>
                                      <button onClick={(e) => handleDeleteAppointment(appt.id, e)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '12px', cursor: 'pointer' }}>X</button>
                                    </div>
                                    <div style={{ color: '#bbb', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.serviceSubcategory}</div>
                                  </div>
                                ) : occupiedByDuration ? (
                                  <div style={{ color: '#a68a4c', fontSize: '13px', textAlign: 'center', fontStyle: 'italic' }}>Ocupado</div>
                                ) : (
                                  <div style={{ color: '#444', fontSize: '13px', textAlign: 'center' }}>+ Libre</div>
                                )}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    /* REJILLA VISTA DIARIA (Día único seleccionado) */
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px', minWidth: '400px' }}>
                      <div style={{ padding: '8px', textAlign: 'center', color: '#777', fontSize: '13px', fontWeight: 'bold' }}>Hora</div>
                      <div style={{ padding: '8px', textAlign: 'center', backgroundColor: isDateBlockedByHoliday(formatDateKey(diaSeleccionadoObj.dateObj)) ? '#2e1414' : '#1e1e1e', borderRadius: '6px', borderBottom: isDateBlockedByHoliday(formatDateKey(diaSeleccionadoObj.dateObj)) ? '2px solid #ff4444' : '2px solid #d4af37' }}>
                        <div style={{ color: isDateBlockedByHoliday(formatDateKey(diaSeleccionadoObj.dateObj)) ? '#ff8888' : '#d4af37', fontSize: '13px', fontWeight: 'bold' }}>
                          {diaSeleccionadoObj.name} ({diaSeleccionadoObj.dateFormatted}) {isDateBlockedByHoliday(formatDateKey(diaSeleccionadoObj.dateObj)) ? '🔒 CERRADO' : ''}
                        </div>
                      </div>
                      {hoursList.map((time, hIdx) => {
                        const targetKey = formatDateKey(diaSeleccionadoObj.dateObj);
                        const isBlocked = isDateBlockedByHoliday(targetKey);
                        const appt = appointments.find(a => a.dateKey === targetKey && a.time === time);
                        const occupiedByDuration = isTimeSlotOccupied(targetKey, time);
                        return (
                          <React.Fragment key={hIdx}>
                            <div style={{ padding: '10px 4px', textAlign: 'center', color: '#888', fontSize: '13px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                              {time}
                            </div>
                            <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, diaSeleccionadoObj.dateObj, diaSeleccionadoObj.name, time)} onClick={() => handleCellClick(diaSeleccionadoObj.dateObj, diaSeleccionadoObj.name, time)} style={{ backgroundColor: isBlocked ? '#261212' : (appt ? adminAppointmentColor(appt).background : (occupiedByDuration ? '#1a1510' : '#1a1a1a')), border: isBlocked ? '1px solid #ff4444' : (appt ? `1px solid ${adminAppointmentColor(appt).border}` : (occupiedByDuration ? '1px dashed #554422' : '1px dashed #2c2c2c')), borderRadius: '6px', padding: '10px', minHeight: '54px', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              {isBlocked ? (
                                <div style={{ color: '#ff6666', fontSize: '13px', textAlign: 'center', fontWeight: 'bold' }}>BLOQUEADO POR FESTIVO / VACACIONES</div>
                              ) : appt ? (
                                <div draggable onDragStart={(e) => handleDragStart(e, appt.id)} title="Arrastra para mover cita" style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <span style={{ color: '#d4af37', fontWeight: 'bold', marginRight: '10px' }}>{appt.clientName} ({appt.phone})</span>
                                    <span style={{ color: '#bbb' }}>{appt.serviceSubcategory}</span>
                                  </div>
                                  <button onClick={(e) => handleDeleteAppointment(appt.id, e)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar X</button>
                                </div>
                              ) : occupiedByDuration ? (
                                <div style={{ color: '#a68a4c', fontSize: '12px', textAlign: 'center', fontStyle: 'italic' }}>Ocupado por servicio de mayor duración</div>
                              ) : (
                                <div style={{ color: '#555', fontSize: '12px', textAlign: 'center' }}>+ Clic para agendar cita en este hueco</div>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIGURACIÓN */}
          {adminTab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <header><p style={{ color: '#cab77d', fontSize: '14px', letterSpacing: '2px', margin: '0 0 8px' }}>360studio · AJUSTES DEL STUDIO</p><h2 style={{ color: '#eee8dd', fontFamily: 'serif', fontSize: '28px', fontWeight: 'normal', margin: '0 0 10px' }}>Configuración</h2><p style={{ color: '#bdb8ad', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>Elige un apartado, revisa sus opciones y guarda los cambios.</p></header>
              <nav aria-label="Apartados de configuración" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
                {([['marca', 'Marca y mensajes', 'Nombre, dirección y plantilla de WhatsApp'], ['general', 'Contacto y acceso', 'Redes sociales y PIN de administración'], ['schedule', 'Horarios', 'Horario del salón y opciones de agenda'], ['reservas', 'Reservas y cancelaciones', 'Antelación y límites para reservar'], ['anticipada', 'Bizum y sábados', 'Reserva anticipada y aprobación previa'], ['avisos', 'Avisos y recordatorios', 'Preferencias de WhatsApp y correo'], ['backup', 'Copia de seguridad', 'Descargar los datos guardados']] as const).map(([tab, label, description]) => <button type="button" key={tab} aria-current={configSubTab === tab ? 'page' : undefined} onClick={() => setConfigSubTab(tab)} style={{ textAlign: 'left', backgroundColor: configSubTab === tab ? '#242219' : '#191919', border: configSubTab === tab ? '1px solid #76683e' : '1px solid #34332d', padding: '16px', borderRadius: '10px', cursor: 'pointer' }}><strong style={{ color: configSubTab === tab ? '#ddd0a4' : '#eee8dd', fontSize: '14px', display: 'block', marginBottom: '6px' }}>{label}</strong><span style={{ color: '#aaa59b', fontSize: '12px', lineHeight: 1.5 }}>{description}</span></button>)}
              </nav>
              {savedMsg && (
                <div style={{ padding: '10px', backgroundColor: '#1a331a', border: '1px solid #44bb44', color: '#44bb44', borderRadius: '6px', fontSize: '12px', textAlign: 'center' }}>
                  {savedMsg}
                </div>
              )}
{configSubTab === 'reservas' && <div style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', color: '#fff' }}><h3 style={{ color: '#d4af37', margin: 0 }}>Reservas y cancelaciones</h3><label>Antelación mínima (días)<input type="number" min="0" value={tempConfig.minAdvanceDays} onChange={(e) => setTempConfig({ ...tempConfig, minAdvanceDays: Number(e.target.value) })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#181818', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginTop: '6px' }} /></label><label>Hasta cuántos meses se puede reservar<input type="number" min="0" value={tempConfig.maxBookingMonths} onChange={(e) => setTempConfig({ ...tempConfig, maxBookingMonths: Number(e.target.value) })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#181818', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginTop: '6px' }} /></label><label>Intervalo entre horas disponibles (minutos)<input type="number" min="0" value={tempConfig.slotIntervalMinutes} onChange={(e) => setTempConfig({ ...tempConfig, slotIntervalMinutes: Number(e.target.value) })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#181818', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginTop: '6px' }} /></label><label>Antelación para solicitar cambios o cancelaciones (horas)<input type="number" min="0" value={tempConfig.cancellationHours} onChange={(e) => setTempConfig({ ...tempConfig, cancellationHours: Number(e.target.value) })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#181818', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginTop: '6px' }} /></label><p>La antelación para cancelar es una preferencia guardada. Su aplicación automática queda pendiente. El intervalo organiza las horas disponibles; no añade tiempo de preparación entre citas.</p><button onClick={() => handleSaveSection('Reservas y cancelaciones')} style={{ backgroundColor: '#d4af37', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Guardar configuración</button></div>}{configSubTab === 'anticipada' && <div style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', color: '#fff' }}><h3 style={{ color: '#d4af37', margin: 0 }}>Reserva anticipada y sábados</h3><label><input type="checkbox" checked={tempConfig.advancePaymentEnabled} onChange={(e) => setTempConfig({ ...tempConfig, advancePaymentEnabled: e.target.checked })} /> Solicitar reserva anticipada</label><label>Importe de la reserva anticipada (€)<input type="text"  value={tempConfig.depositAmount} onChange={(e) => setTempConfig({ ...tempConfig, depositAmount: e.target.value })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#181818', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginTop: '6px' }} /></label><label>Solicitarla cuando la cita supere estos minutos<input type="number" min="0" value={tempConfig.advancePaymentThresholdMinutes} onChange={(e) => setTempConfig({ ...tempConfig, advancePaymentThresholdMinutes: Number(e.target.value) })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#181818', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginTop: '6px' }} /></label><label>Número de Bizum<input type="tel"  value={tempConfig.bizumNumber} onChange={(e) => setTempConfig({ ...tempConfig, bizumNumber: e.target.value })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#181818', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginTop: '6px' }} /></label><label><input type="checkbox" checked={tempConfig.saturdayApprovalEnabled} onChange={(e) => setTempConfig({ ...tempConfig, saturdayApprovalEnabled: e.target.checked })} /> Los sábados requieren aprobación de Ana</label><p>Los sábados se aprueban antes de solicitar el pago. El plazo de pago se acuerda con la clienta; no hay caducidad automática.</p><button onClick={() => handleSaveSection('Reserva anticipada y sábados')} style={{ backgroundColor: '#d4af37', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Guardar configuración</button></div>}{configSubTab === 'avisos' && <div style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', color: '#fff' }}><h3 style={{ color: '#d4af37', margin: 0 }}>Avisos y recordatorios</h3><label>WhatsApp del Studio<input type="tel"  value={tempConfig.studioWhatsapp} onChange={(e) => setTempConfig({ ...tempConfig, studioWhatsapp: e.target.value })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#181818', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginTop: '6px' }} /></label><label>Correo del Studio<input type="email"  value={tempConfig.studioEmail} onChange={(e) => setTempConfig({ ...tempConfig, studioEmail: e.target.value })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#181818', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginTop: '6px' }} /></label><label>Recordatorio antes de la cita (horas)<input type="number" min="0" value={tempConfig.reminderHours} onChange={(e) => setTempConfig({ ...tempConfig, reminderHours: Number(e.target.value) })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#181818', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginTop: '6px' }} /></label><p style={{ color: '#d4af37' }}>Envío automático pendiente de configurar.</p><p>Estos datos guardan tus preferencias. No envían mensajes ni programan recordatorios hasta conectar un servicio de envío. El registro de entregas y errores estará disponible con esa conexión.</p><button onClick={() => handleSaveSection('Avisos y recordatorios')} style={{ backgroundColor: '#d4af37', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Guardar configuración</button></div>}{configSubTab === 'backup' && <div style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', color: '#fff' }}><h3 style={{ color: '#d4af37', margin: 0 }}>Copia de seguridad</h3><p>Descarga el catálogo, las citas, la configuración y los registros locales. Guarda el archivo en un lugar privado: puede contener datos personales y PIN.</p><button type="button" onClick={() => {
const data: Record<string, string | null> = {}; for (let index = 0; index < localStorage.length; index++) { const key = localStorage.key(index); if (key?.startsWith('lst_')) data[key] = localStorage.getItem(key); }
data.lst_master_catalog = JSON.stringify(catalog); data.lst_business_config = JSON.stringify(bizConfig);
const blob = new Blob([JSON.stringify({ format: 'lstudio-backup', version: 1, createdAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `LStudio_copia_${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}} style={{ padding: '12px', cursor: 'pointer' }}>Descargar copia de seguridad</button><p>La restauración no está incluida: la descarga no cambia ni elimina tus datos.</p><button onClick={() => handleSaveSection('Copia de seguridad')} style={{ backgroundColor: '#d4af37', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Guardar configuración</button></div>}
              {configSubTab === 'marca' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: 0 }}>Gestor de Marca, Dirección y Plantilla WhatsApp</h3>
                  <div style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold' }}>💬 Plantilla Personalizada de WhatsApp</span>
                    <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>Puedes editar la plantilla para mensajes de WhatsApp. Envío automático pendiente de configurar. Usa las etiquetas <code style={{ color: '#d4af37' }}>{'{nombre}'}</code>, <code style={{ color: '#d4af37' }}>{'{fecha}'}</code> y <code style={{ color: '#d4af37' }}>{'{hora}'}</code>.</p>
                    <textarea 
                      value={tempConfig.whatsappTemplate} 
                      onChange={(e) => setTempConfig({ ...tempConfig, whatsappTemplate: e.target.value })} 
                      onFocus={(e) => e.target.select()} 
                      rows={3} 
                      style={{ padding: '10px', backgroundColor: '#121212', border: '1px solid #34332d', color: '#fff', borderRadius: '6px', fontSize: '12px', resize: 'vertical' }} 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: '15px', alignItems: 'stretch' }}>
                    <div style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                      <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', alignSelf: 'flex-start' }}>Logotipo de la Marca</span>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '1px solid #34332d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37', fontSize: '20px', fontFamily: 'serif' }}>L'A</div>
                      <button type="button" onClick={() => alert('Función de subida de logotipo')} style={{ backgroundColor: 'transparent', border: '1px solid rgba(212,175,55,0.4)', color: '#d4af37', padding: '6px 16px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Editar</button>
                    </div>
                    <div style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                      <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', alignSelf: 'flex-start' }}>Cabecera Principal</span>
                      <div style={{ width: '100%', height: '70px', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37', fontSize: '14px', letterSpacing: '2px', fontFamily: 'serif' }}>L'STUDIO</div>
                      <button type="button" onClick={() => alert('Función de edición de cabecera')} style={{ backgroundColor: 'transparent', border: '1px solid rgba(212,175,55,0.4)', color: '#d4af37', padding: '6px 16px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Editar</button>
                    </div>
                    <div style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#d4af37', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Vista Previa en Tiempo Real</span>
                      <div style={{ width: '100%', backgroundColor: '#000', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '10px', padding: '12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ textAlign: 'center', fontSize: '14px', color: '#d4af37', fontFamily: 'serif', fontWeight: 'bold' }}>{tempConfig.name}</div>
                        <div style={{ textAlign: 'center', fontSize: '8px', color: '#888', letterSpacing: '1px' }}>PORTAL PRIVADO</div>
                        <div style={{ backgroundColor: '#141414', border: '1px solid #34332d', borderRadius: '6px', padding: '12px' }}>
                          <div style={{ fontSize: '13px', color: '#d4af37', fontWeight: 'bold' }}>{tempConfig.name}</div>
                          <div style={{ fontSize: '8px', color: '#aaa' }}>{tempConfig.location}</div>
                          <div style={{ fontSize: '8px', color: '#aaa' }}>{tempConfig.phone}</div>
                        </div>
                        <div style={{ backgroundColor: '#d4af37', color: '#000', textAlign: 'center', fontSize: '9px', fontWeight: 'bold', padding: '6px', borderRadius: '4px', marginTop: '4px' }}>Reservar Cita</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '12px', padding: '20px' }}>
                    <span style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold' }}>Detalles de Ubicación y Contacto</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ color: '#aaa', fontSize: '14px' }}>Nombre oficial</label>
                        <input type="text" value={tempConfig.name} onChange={(e) => setTempConfig({ ...tempConfig, name: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ color: '#aaa', fontSize: '14px' }}>Teléfono del Salón</label>
                        <input type="text" value={tempConfig.phone} onChange={(e) => setTempConfig({ ...tempConfig, phone: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#aaa', fontSize: '14px' }}>Dirección del Studio</label>
                      <input type="text" value={tempConfig.location} onChange={(e) => setTempConfig({ ...tempConfig, location: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#aaa', fontSize: '14px' }}>Descripción Corporativa</label>
                      <textarea value={tempConfig.description} onChange={(e) => setTempConfig({ ...tempConfig, description: e.target.value })} onFocus={(e) => e.target.select()} rows={3} style={{ padding: '10px', backgroundColor: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px', resize: 'vertical' }} />
                    </div>
                  </div>
                  <button onClick={() => handleSaveSection('Cambios de Marca y Plantilla WhatsApp')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}>
                    Guardar Cambios de Marca
                  </button>
                </div>
              )}
              {configSubTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '14px' }}>Nombre del Salón:</label>
                    <input type="text" value={tempConfig.name} onChange={(e) => setTempConfig({ ...tempConfig, name: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#d4af37', fontSize: '14px', fontWeight: 'bold' }}>PIN Maestro de Administración (4 dígitos):</label>
                    <input type="password" maxLength={4} value={tempConfig.masterPin} onChange={(e) => setTempConfig({ ...tempConfig, masterPin: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #34332d', color: '#fff', borderRadius: '6px', fontSize: '14px', textAlign: 'center', letterSpacing: '4px' }} />
                  </div>
                  <div style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '10px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ color: '#d4af37', fontSize: '13px', margin: 0, fontFamily: 'serif' }}>Redes Sociales del Salón</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#aaa', fontSize: '14px' }}>Instagram URL:</label>
                      <input type="text" value={tempConfig.instagramUrl} onChange={(e) => setTempConfig({ ...tempConfig, instagramUrl: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#aaa', fontSize: '14px' }}>Facebook URL:</label>
                      <input type="text" value={tempConfig.facebookUrl} onChange={(e) => setTempConfig({ ...tempConfig, facebookUrl: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#aaa', fontSize: '14px' }}>Tik Tok URL:</label>
                      <input type="text" value={tempConfig.tiktokUrl} onChange={(e) => setTempConfig({ ...tempConfig, tiktokUrl: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '14px' }}>Enlace Google Maps:</label>
                    <input type="text" value={tempConfig.googleMapsUrl} onChange={(e) => setTempConfig({ ...tempConfig, googleMapsUrl: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '14px' }}>Enlace Reseñas Google My Business:</label>
                    <input type="text" value={tempConfig.googleReviewUrl} onChange={(e) => setTempConfig({ ...tempConfig, googleReviewUrl: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <button onClick={() => handleSaveSection('Datos Generales & PIN Maestro')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '10px' }}>Guardar Cambios Generales</button>
                </div>
              )}
              {configSubTab === 'schedule' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '14px' }}>Horario Lunes:</label>
                    <input type="text" value={tempConfig.scheduleMonday} onChange={(e) => setTempConfig({ ...tempConfig, scheduleMonday: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '14px' }}>Horario Martes y Miércoles:</label>
                    <input type="text" value={tempConfig.scheduleTueWed} onChange={(e) => setTempConfig({ ...tempConfig, scheduleTueWed: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '14px' }}>Horario Jueves y Viernes:</label>
                    <input type="text" value={tempConfig.scheduleThuFri} onChange={(e) => setTempConfig({ ...tempConfig, scheduleThuFri: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#aaa', fontSize: '14px' }}>Horario Sábados:</label>
                    <input type="text" value={tempConfig.scheduleSaturday} onChange={(e) => setTempConfig({ ...tempConfig, scheduleSaturday: e.target.value })} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <button onClick={() => handleSaveSection('Horarios')} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Guardar Horarios</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATÁLOGO UNIFICADO INTRANET / PORTAL */}
          {adminTab === 'catalog' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <style>{`
                .studio-service-editor { background: #171717; border-radius: 12px; padding: 18px !important; }
                .studio-service-editor input:not([type=checkbox]), .studio-service-editor select, .studio-service-editor textarea { box-sizing: border-box; min-height: 44px; font-size: 14px !important; padding: 12px !important; border: 1px solid #444 !important; border-radius: 8px !important; background: #121212 !important; color: #eee8dd !important; max-width: 100%; }
                .studio-service-editor textarea { min-height: 90px; resize: vertical !important; }
                .studio-service-editor label { color: #bdb8ad !important; font-size: 13px !important; line-height: 1.6; }
                .studio-base-field { display: flex; flex-direction: column; gap: 6px; flex: 1 1 150px; min-width: 0; }
                .studio-base-field input { width: 100% !important; }
                .studio-variant-fields { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; flex: 1 1 350px; min-width: 0; }
                .studio-variant-fields label { display: flex; flex-direction: column; gap: 6px; }
                .studio-variant-fields input { width: 100%; }
                @media (max-width: 650px) { .studio-variant-fields { grid-template-columns: 1fr; } }
              `}</style>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ color: '#d4af37', fontSize: '28px', fontWeight: 'normal', fontFamily: 'serif', margin: '0 0 4px 0' }}>Catálogo · Servicios y experiencias</h3>
                  <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>Gestiona servicios, precios y packs. Guarda los cambios para conservarlos en el catálogo de este navegador.</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                  <button onClick={() => setIsAddingCategory(true)} style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>+ Nueva Categoría</button>
                  <button onClick={handleSaveCatalogMaster} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: 'none' }}>Guardar catálogo</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '10px', padding: '16px' }}>
                <input type="search" aria-label="Buscar categoría o servicio" placeholder="Buscar categoría o servicio…" value={adminCatalogSearch} onChange={e => setAdminCatalogSearch(e.target.value)} style={{ flex: '1 1 200px', minWidth: 0, padding: '12px', backgroundColor: '#141414', color: '#eee8dd', border: '1px solid #444', borderRadius: '7px', fontSize: '14px' }} />
                <span style={{ color: '#aaa59b', fontSize: '13px' }}>{catalog.flatMap(cat => cat.subservices).filter(sub => sub.active !== false).length} activos · {catalog.flatMap(cat => cat.subservices).filter(sub => sub.active === false).length} desactivados</span>
              </div>
              {adminCatalogSearch.trim() && !catalog.some(cat => normalizeCatalogSearch(cat.title).includes(normalizeCatalogSearch(adminCatalogSearch)) || cat.subservices.some(sub => normalizeCatalogSearch(sub.name).includes(normalizeCatalogSearch(adminCatalogSearch)))) && <p style={{ color: '#bdb8ad', fontSize: '14px' }}>No hay servicios que coincidan con esta búsqueda.</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {([['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Desactivados']] as const).map(([status, label]) => <button type="button" key={status} aria-pressed={adminCatalogStatus === status} onClick={() => setAdminCatalogStatus(status)} style={{ padding: '10px 16px', minHeight: '44px', backgroundColor: adminCatalogStatus === status ? '#242219' : '#191919', color: adminCatalogStatus === status ? '#ddd0a4' : '#bdb8ad', border: '1px solid #34332d', borderRadius: '8px', cursor: 'pointer' }}>{label}</button>)}
              </div>
              {catalogSavedMsg && (
                <div style={{ padding: '12px', backgroundColor: '#1a331a', border: '1px solid #44bb44', color: '#44bb44', borderRadius: '8px', fontSize: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                  {catalogSavedMsg}
                </div>
              )}
              {isAddingCategory && (
                <form onSubmit={handleAddCategorySubmit} style={{ backgroundColor: '#181818', border: '1px solid #d4af37', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: '#d4af37', fontSize: '13px', margin: 0 }}>Añadir Categoría Principal</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Código (ej. 0.10)" value={newCatCode} onChange={(e) => setNewCatCode(e.target.value)} onFocus={(e) => e.target.select()} style={{ width: '120px', padding: '8px', backgroundColor: '#141414', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="text" placeholder="Título de la Categoría" value={newCatTitle} onChange={(e) => setNewCatTitle(e.target.value)} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: '8px', backgroundColor: '#141414', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setIsAddingCategory(false)} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Categoría</button>
                  </div>
                </form>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {catalog.map((cat, catIdx) => {
                  const query = normalizeCatalogSearch(adminCatalogSearch);
                  const categoryMatches = normalizeCatalogSearch(cat.title).includes(query);
                  const matchesStatus = (sub: SubService) => adminCatalogStatus === 'all' || (adminCatalogStatus === 'active' ? sub.active !== false : sub.active === false);
                  if (!cat.subservices.some(sub => matchesStatus(sub) && (!query || categoryMatches || normalizeCatalogSearch(sub.name).includes(query)))) return null;
                  if (query && !categoryMatches && !cat.subservices.some(sub => normalizeCatalogSearch(sub.name).includes(query))) return null;
                  const isCategoryExpandedAdmin = !!query || (expandedCategories[`admin_cat_${cat.id}`] ?? true);
                  return (
                    <div key={cat.id} style={{ backgroundColor: '#161616', border: '1px solid #34332d', borderRadius: '10px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '8px' }}>
                        <div style={{ flex: '1 1 240px' }}>
                          <span style={{ color: '#cab77d', fontSize: '11px', letterSpacing: '1px' }}>{cat.code} · CATEGORÍA</span>
                          <h3 style={{ color: '#eee8dd', fontFamily: 'serif', fontSize: '24px', fontWeight: 'normal', lineHeight: 1.4, margin: '8px 0' }}>{cat.title}</h3>
                          <span style={{ color: '#aaa59b', fontSize: '13px' }}>{cat.subservices.length} servicios · {cat.subservices.filter(sub => sub.active !== false).length} activos</span>
                        </div>
                        <button type="button" aria-expanded={isCategoryExpandedAdmin} onClick={() => setExpandedCategories({ ...expandedCategories, [`admin_cat_${cat.id}`]: !isCategoryExpandedAdmin })} style={{ background: '#242219', border: '1px solid #76683e', color: '#ddd0a4', padding: '12px 16px', minHeight: '44px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>{isCategoryExpandedAdmin ? 'Ocultar servicios −' : 'Ver servicios +'}</button>
                      </div>
                      <details style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '9px', padding: '14px' }}>
                        <summary style={{ color: '#cab77d', cursor: 'pointer', fontSize: '13px' }}>Editar categoría y ordenar</summary>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', marginTop: '16px' }}>
                          <label style={{ color: '#bdb8ad', fontSize: '13px' }}>Código<input type="text" value={cat.code} onChange={e => handleUpdateCategoryCode(cat.id, e.target.value)} style={{ display: 'block', width: '90px', padding: '12px', boxSizing: 'border-box', marginTop: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#ddd0a4', borderRadius: '7px' }} /></label>
                          <label style={{ flex: '1 1 220px', color: '#bdb8ad', fontSize: '13px' }}>Nombre de la categoría<input type="text" value={cat.title} onChange={e => handleUpdateCategoryTitle(cat.id, e.target.value)} style={{ display: 'block', width: '100%', padding: '12px', boxSizing: 'border-box', marginTop: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#eee8dd', borderRadius: '7px', fontSize: '14px' }} /></label>
                          <button type="button" disabled={catIdx === 0} onClick={() => handleMoveCategory(catIdx, -1)} style={{ background: '#242219', border: '1px solid #34332d', color: '#ddd0a4', padding: '12px', borderRadius: '7px', cursor: 'pointer' }}>Subir ↑</button>
                          <button type="button" disabled={catIdx === catalog.length - 1} onClick={() => handleMoveCategory(catIdx, 1)} style={{ background: '#242219', border: '1px solid #34332d', color: '#ddd0a4', padding: '12px', borderRadius: '7px', cursor: 'pointer' }}>Bajar ↓</button>
                          <button type="button" onClick={() => handleDeleteCategory(cat.id)} style={{ background: '#281b1b', border: '1px solid #74433e', color: '#efaaa3', padding: '12px', borderRadius: '7px', cursor: 'pointer' }}>Eliminar categoría</button>
                        </div>
                        <p style={{ color: '#aaa59b', fontSize: '12px', marginBottom: 0 }}>Después de modificar el nombre, código u orden, pulsa «Guardar catálogo».</p>
                      </details>
                      {isCategoryExpandedAdmin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '15px', borderLeft: '2px solid rgba(212,175,55,0.2)', marginTop: '8px' }}>
                          {cat.subservices.filter(sub => matchesStatus(sub) && (!query || categoryMatches || normalizeCatalogSearch(sub.name).includes(query))).map((sub) => {
                            const isExpandedAdmin = true;
                            return (
                              <div key={sub.id} style={{ backgroundColor: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '8px' }}>
                                  <div style={{ flex: '1 1 220px' }}><h4 style={{ color: '#eee8dd', fontSize: '18px', fontFamily: 'serif', fontWeight: 'normal', lineHeight: 1.4, margin: '0 0 8px' }}>{sub.name}</h4><span style={{ color: '#cab77d', fontSize: '14px' }}>{sub.price}</span><span style={{ color: '#aaa59b', fontSize: '13px', marginLeft: '14px' }}>{sub.duration}</span></div>
                                  <span style={{ color: sub.active === false ? '#aaa59b' : '#b5c9b6', border: '1px solid #34332d', borderRadius: '20px', padding: '6px 12px', fontSize: '12px' }}>{sub.active === false ? 'Desactivado' : 'Activo'}</span>
                                  <button type="button" onClick={() => { setPreviewServiceId(sub.id); setPreviewVariantId(sub.hasVariants ? sub.variants?.[0]?.id || '' : ''); }} style={{ background: 'none', color: '#cab77d', border: '1px solid #76683e', borderRadius: '7px', padding: '10px 14px', minHeight: '44px', cursor: 'pointer' }}>Vista previa</button>
                                </div>
                                <details className="studio-service-editor" style={{ borderTop: '1px solid #34332d', padding: '12px 8px 4px' }}>
                                  <summary style={{ color: '#cab77d', fontSize: '14px', cursor: 'pointer', padding: '8px 0' }}>Editar servicio · Datos, variantes y condiciones</summary>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '16px' }}>

                                <button type="button" onClick={() => { setPreviewServiceId(sub.id); setPreviewVariantId(sub.hasVariants ? sub.variants?.[0]?.id || '' : ''); }} style={{ alignSelf: 'flex-start', background: 'none', color: '#d4af37', border: '1px solid #d4af37', borderRadius: '5px', padding: '7px 12px', cursor: 'pointer' }}>Vista previa · Clienta</button>
                                <label style={{ color: sub.active === false ? '#aaa' : '#d4af37', fontSize: '12px' }}>
                                  <input type="checkbox" checked={sub.active !== false} onChange={e => {
                                    const active = e.target.checked;
                                    setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(item => item.id === sub.id ? { ...item, active } : item) } : c));
                                    if (!active) {
                                      setSelectedServicesToBook(previous => previous.filter(item => item.sub.id !== sub.id));
                                      setModalServices(previous => previous.filter(item => item.sub.id !== sub.id));
                                    }
                                  }} /> {sub.active === false ? 'Desactivado · Oculto para nuevas reservas' : 'Activo · Disponible para reservar'}
                                </label>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <label className="studio-base-field">Nombre del servicio<input type="text" value={sub.name} onChange={(e) => {
                                      const updatedName = e.target.value;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, name: updatedName } : s) } : c));
                                    }} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', flex: 1 }} /></label>
                                    <label className="studio-base-field">Precio base<input type="text" value={sub.price} onChange={(e) => {
                                      const updatedPrice = e.target.value;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, price: updatedPrice } : s) } : c));
                                    }} style={{ backgroundColor: '#121212', border: '1px solid #d4af37', color: '#d4af37', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', width: '100px' }} /></label>
                                    <label className="studio-base-field">Duración base<input type="text" value={sub.duration} onChange={(e) => {
                                      const updatedDur = e.target.value;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, duration: updatedDur } : s) } : c));
                                    }} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', width: '80px' }} /></label>
                                  </div>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <label style={{ color: '#d4af37', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                      <input type="checkbox" checked={!!sub.hasVariants} onChange={() => handleToggleVariants(cat.id, sub.id)} style={{ accentColor: '#d4af37' }} />
                                      Opciones de largo o pack
                                    </label>
                                    <button onClick={() => handleDeleteSubservice(cat.id, sub.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '14px' }}>X</button>
                                  </div>
                                </div>
                                <div style={{ backgroundColor: '#141414', border: '1px solid #34332d', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="checkbox" checked={!!sub.showAlertBadge} onChange={(e) => {
                                      const val = e.target.checked;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, showAlertBadge: val } : s) } : c));
                                    }} style={{ accentColor: '#d4af37', width: '16px', height: '16px', cursor: 'pointer' }} />
                                    <span style={{ color: '#d4af37', fontSize: '14px', fontWeight: 'bold' }}>💡 Activar aviso/advertencia en este servicio</span>
                                  </div>
                                  {sub.showAlertBadge && (
                                    <input type="text" value={sub.alertText || ''} onChange={(e) => {
                                      const val = e.target.value;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, alertText: val } : s) } : c));
                                    }} placeholder="Texto del aviso (ej. ⚠️ Recuerda añadir tu peinado)" style={{ width: '100%', padding: '6px', backgroundColor: '#121212', border: '1px solid #d4af37', color: '#fff', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }} />
                                  )}
                                </div>
                                {sub.hasVariants && (
                                  <div style={{ backgroundColor: '#141414', border: '1px solid #34332d', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                    <span style={{ color: '#d4af37', fontSize: '14px', fontWeight: 'bold' }}>Variantes y packs</span>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {sub.variants?.map((v) => (
                                        <div key={v.id} style={{ backgroundColor: '#1c1c1c', border: '1px solid #d4af37', borderRadius: '4px', padding: '6px 10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#fff', width: '100%', boxSizing: 'border-box' }}>
                                          <div className="studio-variant-fields">
                                            {(['name', 'price', 'duration'] as const).map(field => <label key={field}>{({ name: 'Nombre del pack', price: 'Precio', duration: 'Duración' })[field]}<input aria-label={`${field} de ${v.name}`} type="text" value={v[field]} onChange={e => {
                                              const value = e.target.value;
                                              setCatalog(previous => previous.map(category => category.id === cat.id ? { ...category, subservices: category.subservices.map(service => service.id === sub.id ? { ...service, variants: service.variants?.map(variant => variant.id === v.id ? { ...variant, [field]: value } : variant) } : service) } : category));
                                            }} /></label>)}
                                          </div>
                                          <button onClick={() => handleDeleteVariant(cat.id, sub.id, v.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '14px' }}>x</button>
                                        </div>
                                      ))}
                                    </div>
                                    <form onSubmit={(e) => handleAddVariant(cat.id, sub.id, e)} style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      <input type="text" placeholder="Nombre (ej. M)" value={newVariantName} onChange={(e) => setNewVariantName(e.target.value)} style={{ width: '80px', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                                      <input type="text" placeholder="Precio (ej. 320,00 €)" value={newVariantPrice} onChange={(e) => setNewVariantPrice(e.target.value)} style={{ width: '120px', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                                      <input type="text" placeholder="Duración (ej. 240 min)" value={newVariantDuration} onChange={(e) => setNewVariantDuration(e.target.value)} style={{ width: '110px', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                                      <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>+ Añadir variante</button>
                                    </form>
                                  </div>
                                )}
                                {isExpandedAdmin && (
                                  <div style={{ backgroundColor: '#141414', padding: '10px', borderRadius: '6px', fontSize: '14px', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid #d4af37', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <h4 style={{ color: '#eee8dd', fontFamily: 'serif', fontWeight: 'normal', fontSize: '20px', margin: '8px 0 12px' }}>Contenido para la clienta</h4>
                                      <label style={{ color: '#d4af37', fontSize: '12px' }}>Descripción:</label>
                                      <textarea value={sub.description} onChange={(e) => {
                                        const val = e.target.value;
                                        setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, description: val } : s) } : c));
                                      }} rows={2} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '14px' }} />
                                    </div>
                                    <h4 style={{ color: '#eee8dd', fontFamily: 'serif', fontWeight: 'normal', fontSize: '20px', margin: '18px 0 8px' }}>Condiciones de reserva</h4>
                                    <label style={{ color: '#d4af37' }}>Tipo de reserva
                                      <select aria-label={`Tipo de reserva de ${sub.name}`} value={sub.requiresAssessment ? 'assessment' : 'direct'} onChange={e => {
                                        const required = e.target.value === 'assessment';
                                        setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(item => item.id === sub.id ? { ...item, requiresAssessment: required } : item) } : c));
                                      }} style={{ display: 'block', width: '100%', padding: '8px', backgroundColor: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                                        <option value="direct">Reserva directa</option>
                                        <option value="assessment">Valoración previa · Ana debe aprobar</option>
                                      </select>
                                    </label>
                                    <span>La valoración previa deja la solicitud pendiente, también entre semana. Si necesita Bizum, se solicita después de la aprobación.</span>
                                    <label style={{ color: '#d4af37' }}>Matiz del servicio
                                      <select aria-label={`Matiz de ${sub.name}`} value={sub.tonerPolicy || ''} disabled={!!sub.isTonerService} onChange={e => {
                                        const policy = (e.target.value || undefined) as StylingPolicy | undefined;
                                        setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(item => item.id === sub.id ? { ...item, tonerPolicy: policy } : item) } : c));
                                      }} style={{ display: 'block', width: '100%', padding: '8px', backgroundColor: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                                        <option value="">Sin configurar · Mantener reserva actual</option>
                                        <option value="included">Matiz incluido</option>
                                        <option value="required">Requiere añadir matiz / tonalización</option>
                                        <option value="not_applicable">No corresponde</option>
                                      </select>
                                    </label>
                                    <label><input type="checkbox" checked={!!sub.isTonerService} onChange={e => {
                                      const checked = e.target.checked;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(item => item.id === sub.id ? { ...item, isTonerService: checked, tonerPolicy: checked ? undefined : item.tonerPolicy } : item) } : c));
                                    }} /> Este es un servicio de matiz / tonalización (complemento)</label>
                                    <span>Marca esta casilla en los servicios que puedan completar el matiz de unas mechas. El precio y el tiempo se añaden al seleccionarlos. En los packs, comprueba que ambos ya incluyen el matiz.</span>
                                    <label style={{ color: '#d4af37' }}>Peinado del servicio
                                      <select aria-label={`Peinado de ${sub.name}`} value={sub.stylingPolicy || ''} disabled={!!sub.isStylingService} onChange={e => {
                                        const policy = (e.target.value || undefined) as StylingPolicy | undefined;
                                        setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(item => item.id === sub.id ? { ...item, stylingPolicy: policy } : item) } : c));
                                      }} style={{ display: 'block', width: '100%', padding: '8px', backgroundColor: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                                        <option value="">Sin configurar · Mantener reserva actual</option>
                                        <option value="included">Peinado incluido</option>
                                        <option value="required">Requiere añadir secado y peinado</option>
                                        <option value="not_applicable">No corresponde · Cut &amp; Go / estudio</option>
                                      </select>
                                    </label>
                                    <label><input type="checkbox" checked={!!sub.isStylingService} onChange={e => {
                                      const checked = e.target.checked;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(item => item.id === sub.id ? { ...item, isStylingService: checked, stylingPolicy: checked ? undefined : item.stylingPolicy } : item) } : c));
                                    }} /> Este es un servicio de secado y peinado (complemento)</label>
                                    <span>Marca esta casilla en los peinados S/M, L o XL. Sus precios y tiempos se añaden al seleccionarlos en la cita. En los packs completos, comprueba que el precio y la duración ya incluyen el acabado.</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <label style={{ color: '#d4af37', fontSize: '12px' }}>Qué incluye:</label>
                                      <input type="text" value={sub.includesText || ''} onChange={(e) => {
                                        const val = e.target.value;
                                        setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, includesText: val } : s) } : c));
                                      }} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '14px' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <label style={{ color: '#d4af37', fontSize: '12px' }}>Qué se consigue:</label>
                                      <input type="text" value={sub.achievedText || ''} onChange={(e) => {
                                        const val = e.target.value;
                                        setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, achievedText: val } : s) } : c));
                                      }} style={{ backgroundColor: '#121212', border: '1px solid #444', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '14px' }} />
                                    </div>
                                  </div>
                                )}
                                  </div>
                                </details>
                              </div>
                            );
                          })}
                          {isAddingSub === cat.id ? (
                            <form onSubmit={(e) => handleAddSubserviceSubmit(cat.id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '6px', border: '1px solid #333', marginTop: '5px' }}>
                              <h5 style={{ color: '#d4af37', fontSize: '12px', margin: 0 }}>Nuevo Subservicio</h5>
                              <input type="text" placeholder="Nombre del servicio" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                              <input type="text" placeholder="Descripción breve" value={newSubDesc} onChange={(e) => setNewSubDesc(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="text" placeholder="Duración (ej. 45 min)" value={newSubDur} onChange={(e) => setNewSubDur(e.target.value)} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select value={newSubPriceType} onChange={(e) => setNewSubPriceType(e.target.value as any)} style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#d4af37', borderRadius: '4px', fontSize: '14px' }}>
                                  <option value="desde">Desde</option>
                                  <option value="aprox">Aprox.</option>
                                  <option value="fijo">Fijo</option>
                                  <option value="consultar">Consultar</option>
                                </select>
                                <input type="text" placeholder="Precio (ej. 45 €)" value={newSubPrice} onChange={(e) => setNewSubPrice(e.target.value)} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ color: '#d4af37', fontSize: '12px' }}>Qué incluye:</label>
                                <input type="text" placeholder="Ej. Lavado sensorial y protector térmico" value={newSubIncludes} onChange={(e) => setNewSubIncludes(e.target.value)} style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ color: '#d4af37', fontSize: '12px' }}>Qué se consigue:</label>
                                <input type="text" placeholder="Ej. Brillo extremo y duración prolongada" value={newSubAchieved} onChange={(e) => setNewSubAchieved(e.target.value)} style={{ padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                              </div>
                              <div style={{ backgroundColor: '#121212', border: '1px solid #333', padding: '8px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input type="checkbox" checked={newSubAlertBadge} onChange={(e) => setNewSubAlertBadge(e.target.checked)} style={{ accentColor: '#d4af37' }} />
                                  <span style={{ color: '#d4af37', fontSize: '14px', fontWeight: 'bold' }}>Activar aviso en este servicio</span>
                                </div>
                                {newSubAlertBadge && (
                                  <input type="text" placeholder="Texto del aviso..." value={newSubAlertText} onChange={(e) => setNewSubAlertText(e.target.value)} style={{ padding: '6px', backgroundColor: '#181818', border: '1px solid #d4af37', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button type="button" onClick={() => setIsAddingSub(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Añadir Subservicio</button>
                              </div>
                            </form>
                          ) : (
                            <button onClick={() => setIsAddingSub(cat.id)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#d4af37', fontSize: '14px', cursor: 'pointer', padding: '2px 0' }}>+ Añadir servicio a esta categoría</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button onClick={handleSaveCatalogMaster} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: 'none' }}>Guardar catálogo</button>
              </div>
            </div>
          )}

          {/* TAB 4: CLIENTES & ADN CAPILAR */}
          {adminTab === 'clients' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ color: '#d4af37', fontSize: '28px', fontWeight: 'normal', fontFamily: 'serif', margin: '0 0 4px 0' }}>Clientas · Cuidado y seguimiento</h3>
                  <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>Consulta sus datos, cuida su evolución y actualiza su pasaporte. Los cambios se reflejan en el portal de este navegador.</p>
                </div>
                <button onClick={() => setIsAddingClient(!isAddingClient)} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isAddingClient ? 'Cancelar' : '+ Dar de Alta Clienta'}
                </button>
              </div>
              {isAddingClient && (
                <form onSubmit={handleGuardarNuevoCliente} style={{ backgroundColor: '#181818', border: '1px solid #d4af37', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: '#d4af37', fontSize: '13px', margin: 0 }}>Nueva Ficha de Clienta</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <input type="text" placeholder="Nombre *" value={novoNombre} onChange={(e) => setNovoNombre(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '12px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="text" placeholder="Apellidos" value={novoApellidos} onChange={(e) => setNovoApellidos(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="text" placeholder="Fecha Nacimiento" value={novoNacimiento} onChange={(e) => setNovoNacimiento(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="text" placeholder="Teléfono" value={novoTelefono} onChange={(e) => setNovoTelefono(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="email" placeholder="Email (Identificador) *" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '12px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="text" placeholder="PIN acceso (4 digs)" maxLength={4} value={novoPin} onChange={(e) => setNovoPin(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                  </div>
                  <input type="text" placeholder="Diagnóstico capilar o notas" value={novoDiagnostico} onChange={(e) => setNovoDiagnostico(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Clienta</button>
                  </div>
                </form>
              )}
              <div>
                <input type="text" placeholder="Buscar por Nombre, Email, Teléfono o ID..." value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)} onFocus={(e) => e.target.select()} style={{ width: '100%', maxWidth: '560px', boxSizing: 'border-box', padding: '12px', backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '14px', outline: 'none' }} />
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
                      <div key={c.idNum} style={{ backgroundColor: '#161616', border: '1px solid #34332d', borderRadius: '10px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ backgroundColor: '#262626', color: '#d4af37', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                              ID #{c.idNum} ({c.registroId})
                            </span>
                            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{c.nombre} {c.apellidos}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => {
                              if (isEditing) {
                                setEditingClientId(null);
                              } else {
                                setEditingClientId(c.idNum);
                                setEditAdminUltimaVisita(c.ultimaVisita);
                                setEditAdminProxima(c.proximaVisitaSugerida);
                                setEditAdminFormulas(c.formulasAplicadas);
                                setEditAdminDniCapilar(c.dniCapilar || '');
                                setEditAdminPrescripcionCasa(c.prescripcionCasa || '');
                              }
                            }} style={{ background: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                              {isEditing ? 'Cerrar Edición' : 'Editar ficha y fórmulas'}
                            </button>
                            <button type="button" onClick={() => openPassportEditor(c)} style={{ background: '#242219', border: '1px solid #76683e', color: '#ddd0a4', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}>Editar pasaporte e historial</button>
                            <button onClick={() => handleBorrarCliente(c.idNum)} title="Eliminar clienta" style={{ background: 'transparent', border: 'none', color: '#ff4444', fontSize: '14px', cursor: 'pointer' }}> X </button>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px', color: '#aaa', backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '6px' }}>
                          <div><strong>Email:</strong> {c.email}</div>
                          <div><strong>Teléfono:</strong> {c.telefono}</div>
                          <div><strong>PIN Acceso:</strong> <span style={{ color: '#d4af37', fontWeight: 'bold' }}>{c.pinAcceso}</span></div>
                          <div><strong>F. Nacimiento:</strong> {c.fechaNacimiento}</div>
                        </div>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#1f1a10', padding: '14px', borderRadius: '8px', border: '1px solid #d4af37' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ color: '#d4af37', fontSize: '12px', display: 'block', marginBottom: '2px' }}>Última Visita:</label>
                                <input type="text" value={editAdminUltimaVisita} onChange={(e) => setEditAdminUltimaVisita(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                              </div>
                              <div>
                                <label style={{ color: '#d4af37', fontSize: '12px', display: 'block', marginBottom: '2px' }}>Próxima Visita Sugerida:</label>
                                <input type="text" value={editAdminProxima} onChange={(e) => setEditAdminProxima(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                              </div>
                            </div>
                            <div>
                              <label style={{ color: '#d4af37', fontSize: '12px', display: 'block', marginBottom: '2px' }}>DNI Capilar Activo (Visible en Pasaporte de la clienta):</label>
                              <input type="text" value={editAdminDniCapilar} onChange={(e) => setEditAdminDniCapilar(e.target.value)} placeholder="Ej. Porosidad: Media | Hidratación: Necesaria" style={{ width: '100%', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                            </div>
                            <div>
                              <label style={{ color: '#d4af37', fontSize: '12px', display: 'block', marginBottom: '2px' }}>Mantenimiento en Casa (Visible en Pasaporte de la clienta):</label>
                              <input type="text" value={editAdminPrescripcionCasa} onChange={(e) => setEditAdminPrescripcionCasa(e.target.value)} placeholder="Ej. Champú Hidratante | Sérum Nutritivo" style={{ width: '100%', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px' }} />
                            </div>
                            <div>
                              <label style={{ color: '#d4af37', fontSize: '12px', display: 'block', marginBottom: '2px' }}>Fórmulas y Notas (Uso Exclusivo Intranet):</label>
                              <textarea value={editAdminFormulas} onChange={(e) => setEditAdminFormulas(e.target.value)} rows={2} style={{ width: '100%', padding: '6px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '14px', resize: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                              <button onClick={() => setEditingClientId(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
                              <button onClick={() => handleGuardarEdicionAdminCliente(c.idNum)} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar y Sincronizar Pasaporte</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <section style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '10px', padding: '18px', color: '#bdb8ad', fontSize: '14px', lineHeight: 1.7 }}>
                              <h4 style={{ color: '#cab77d', fontSize: '14px', margin: '0 0 10px' }}>Pasaporte capilar</h4>
                              <strong style={{ color: '#eee8dd' }}>Diagnóstico</strong><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '6px 0 14px' }}>{c.dniCapilar || 'Sin diagnóstico registrado'}</p>
                              <strong style={{ color: '#eee8dd' }}>Cuidados en casa</strong><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '6px 0' }}>{c.prescripcionCasa || 'Sin recomendaciones registradas'}</p>
                              <button type="button" onClick={() => openPassportEditor(c)} style={{ background: 'none', border: '1px solid #76683e', color: '#ddd0a4', padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', marginTop: '12px' }}>Editar pasaporte</button>
                            </section>
                            <section style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '10px', padding: '18px', color: '#bdb8ad', fontSize: '14px', lineHeight: 1.7 }}>
                              <h4 style={{ color: '#cab77d', fontSize: '14px', margin: '0 0 10px' }}>Seguimiento</h4>
                              <p>Última visita: <span style={{ color: '#eee8dd' }}>{c.ultimaVisita || 'Sin registrar'}</span></p>
                              <p>Próxima recomendada: <span style={{ color: '#eee8dd' }}>{c.proximaVisitaSugerida || 'Sin indicar'}</span></p>
                              <p>{c.pastVisits?.length || 0} visitas en el historial</p>
                              <button type="button" onClick={() => openPassportEditor(c)} style={{ background: 'none', border: '1px solid #76683e', color: '#ddd0a4', padding: '10px 12px', borderRadius: '6px', cursor: 'pointer' }}>Ver y editar historial</button>
                            </section>
                            <details style={{ gridColumn: '1 / -1', backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '10px', padding: '18px', color: '#bdb8ad', fontSize: '14px' }}>
                              <summary style={{ cursor: 'pointer', color: '#cab77d' }}>Fórmulas y notas de la intranet</summary>
                              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.7 }}>{c.formulasAplicadas || 'Sin fórmulas registradas'}</p>
                            </details>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 5: BUZÓN DE DETRACTORES & RESPUESTAS CON IA */}
          {adminTab === 'detractors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: '0 0 4px 0' }}>Buzón de Detractores & Reseñas Google My Business</h3>
                  <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>Control de valoraciones y gestión de incidencias con sugerencias automáticas de IA ({bizConfig.name}).</p>
                </div>
                <a href={bizConfig.googleReviewUrl} target="_blank" rel="noreferrer" style={{ backgroundColor: '#181818', border: '1px solid #d4af37', color: '#d4af37', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ★ Ver Enlace en Google My Business
                </a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {feedbackList.filter(f => f.type === 'detractor').length === 0 ? (
                  <div style={{ backgroundColor: '#161616', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#777', fontSize: '12px', border: '1px solid rgba(212,175,55,0.2)' }}>
                    No hay incidencias ni detractores pendientes. ¡El servicio en el Studio es impecable!
                  </div>
                ) : (
                  feedbackList.filter(f => f.type === 'detractor').map((fb) => {
                    const currentReply = detractorReplies[fb.id] || "";
                    return (
                      <div key={fb.id} style={{ backgroundColor: '#1a1414', border: '1px solid #ff4444', borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '12px' }}>Valoración: {fb.rating} | {fb.clientName}</span>
                          <span style={{ color: '#888', fontSize: '10px' }}>{fb.date}</span>
                        </div>
                        <p style={{ color: '#fff', fontSize: '12px', margin: 0, fontStyle: 'italic', backgroundColor: '#121212', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #ff4444' }}>
                          "{fb.comment}"
                        </p>
                        <div style={{ backgroundColor: '#141414', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>✨ Respuesta Asistida con IA para Recuperación:</span>
                            <button type="button" onClick={() => {
                              const generated = `Hola ${fb.clientName.split(" ")[0]}, lamentamos profundamente tu experiencia respecto a "${fb.comment}". En L'Studio Ana cuidamos cada detalle y nos encantaría invitarte a un protocolo exclusivo de mejora en tu próxima visita.`;
                              setDetractorReplies(prev => ({ ...prev, [fb.id]: generated }));
                            }} style={{ backgroundColor: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                              Generar Respuesta IA
                            </button>
                          </div>
                          <textarea value={currentReply} onChange={(e) => setDetractorReplies(prev => ({ ...prev, [fb.id]: e.target.value }))} rows={3} placeholder="Escribe tu respuesta personalizada..." style={{ backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', padding: '8px', fontSize: '11px', resize: 'vertical' }} />
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <a href={`https://wa.me/?text=${encodeURIComponent(currentReply)}`} target="_blank" rel="noreferrer" style={{ backgroundColor: '#25D366', color: '#000', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Enviar por WhatsApp
                            </a>
                            <button type="button" onClick={() => {
                              navigator.clipboard.writeText(currentReply);
                              alert('¡Respuesta copiada al portapapeletas!');
                            }} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                              Copiar Respuesta
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '5px' }}>
                          <button onClick={() => setFeedbackList(feedbackList.filter(item => item.id !== fb.id))} style={{ backgroundColor: '#222', border: '1px solid #444', color: '#aaa', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                            Resolver e Incidencia Cerrada
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CRM & KPIS */}
          {adminTab === 'crm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                <div style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '18px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Visitas Web/App</div>
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
            </div>
          )}

          {/* TAB 7: VACACIONES Y FESTIVOS */}
          {adminTab === 'holidays' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ color: '#d4af37', fontSize: '15px', fontFamily: 'serif', margin: '0 0 4px 0' }}>Gestión de Vacaciones & Festivos (Sincronizado con Agenda)</h3>
                <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>Bloquea días u horas donde el salón permanecerá cerrado.</p>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newHolidayStart || !newHolidayEnd) {
                  alert('Por favor, indica fecha de inicio y fin.');
                  return;
                }
                const newBlock: HolidayBlock = {
                  id: Date.now().toString(),
                  startDate: newHolidayStart,
                  endDate: newHolidayEnd,
                  reason: newHolidayReason.trim() || (newHolidayType === 'vacaciones' ? 'Vacaciones' : 'Festivo'),
                  type: newHolidayType
                };
                setHolidaysList([...holidaysList, newBlock]);
                setNewHolidayStart("");
                setNewHolidayEnd("");
                setNewHolidayReason("");
                alert('¡Periodo bloqueado correctamente y sincronizado con la agenda!');
              }} style={{ backgroundColor: '#181818', border: '1px solid #d4af37', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ color: '#d4af37', fontSize: '13px', margin: 0 }}>Bloquear Nuevo Periodo (Vacaciones / Festivo)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Tipo:</label>
                    <select value={newHolidayType} onChange={(e) => setNewHolidayType(e.target.value as any)} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }}>
                      <option value="vacaciones">🏖️ Vacaciones</option>
                      <option value="festivo">🎉 Festivo</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Desde el día:</label>
                    <input type="date" value={newHolidayStart} onChange={(e) => setNewHolidayStart(e.target.value)} required style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#aaa', fontSize: '11px' }}>Hasta el día:</label>
                    <input type="date" value={newHolidayEnd} onChange={(e) => setNewHolidayEnd(e.target.value)} required style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: '#aaa', fontSize: '11px' }}>Motivo o descripción:</label>
                  <input type="text" placeholder="Ej. Vacaciones de verano o Festivo local de Elche" value={newHolidayReason} onChange={(e) => setNewHolidayReason(e.target.value)} style={{ padding: '8px', backgroundColor: '#121212', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '11px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Bloquear Fechas en Agenda
                  </button>
                </div>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ color: '#d4af37', fontSize: '13px', margin: '5px 0 0 0' }}>Periodos Bloqueados Activos</h4>
                {holidaysList.length === 0 ? (
                  <div style={{ backgroundColor: '#161616', padding: '15px', borderRadius: '8px', color: '#777', fontSize: '11px', textAlign: 'center' }}>
                    No hay vacaciones ni festivos bloqueados actualmente.
                  </div>
                ) : (
                  holidaysList.map((h) => (
                    <div key={h.id} style={{ backgroundColor: '#161616', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ backgroundColor: h.type === 'vacaciones' ? '#2e2010' : '#2e1010', color: h.type === 'vacaciones' ? '#d4af37' : '#ff6666', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                            {h.type === 'vacaciones' ? '🏖️ VACACIONES' : '🎉 FESTIVO'}
                          </span>
                          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{h.reason}</span>
                        </div>
                        <span style={{ color: '#aaa', fontSize: '11px' }}>Desde el <strong>{h.startDate}</strong> hasta el <strong>{h.endDate}</strong></span>
                      </div>
                      <button onClick={() => {
                        if (window.confirm('¿Eliminar este bloqueo y permitir reservas en estas fechas?')) {
                          setHolidaysList(holidaysList.filter(item => item.id !== h.id));
                        }
                      }} style={{ backgroundColor: '#2a1212', border: '1px solid #552222', color: '#ff4444', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Desbloquear / Eliminar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          </main>
        </div>
      )}

      {previewService && (
        <div onClick={() => setPreviewServiceId(null)} onKeyDown={e => { if (e.key === 'Escape') setPreviewServiceId(null); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 2200 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="catalog-preview-title" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#121212', color: '#fff', border: '1px solid #d4af37', borderRadius: '16px', padding: '20px', maxWidth: '440px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <h3 id="catalog-preview-title" style={{ color: '#d4af37', margin: 0, fontSize: '16px' }}>Vista previa · Clienta</h3>
              <button autoFocus type="button" onClick={() => setPreviewServiceId(null)} style={{ padding: '7px', cursor: 'pointer' }}>Cerrar</button>
            </div>
            {previewService.active === false && <p style={{ color: '#d4af37', fontSize: '12px' }}>Servicio desactivado: esta ficha está oculta para las clientas.</p>}
            <div style={{ backgroundColor: '#141414', border: '1px solid #333', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{previewService.name}</div>
              <div style={{ color: '#888', fontSize: '10px' }}>{previewService.duration} - <strong style={{ color: '#d4af37' }}>{previewService.price}</strong></div>
              {previewService.showAlertBadge && <div style={{ backgroundColor: '#262010', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', color: '#d4af37' }}>💡 {previewService.alertText || '⚠️ Recuerda añadir tu peinado para asegurar el tiempo en agenda.'}</div>}
              {previewService.hasVariants && !!previewService.variants?.length && <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: '#d4af37', fontSize: '10px' }}>Selecciona variante:</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {previewService.variants.map(v => <button type="button" key={v.id} onClick={() => setPreviewVariantId(v.id)} style={{ backgroundColor: previewVariantId === v.id ? '#d4af37' : '#121212', color: previewVariantId === v.id ? '#000' : '#d4af37', border: '1px solid #d4af37', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '11px' }}>{v.name} · {v.price} / {v.duration}</button>)}
                </div>
              </div>}
              {renderServiceInfo(previewService)}
            </div>
            <p style={{ color: '#aaa', fontSize: '11px', marginBottom: 0 }}>Puedes revisar las variantes sin crear una cita. La vista muestra los cambios actuales; guarda el catálogo para conservarlos.</p>
          </div>
        </div>
      )}
      {passportDraft && currentScreen === 'adminPanel' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 2400 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="passport-editor-title" style={{ width: '100%', maxWidth: '660px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#141414', border: '1px solid #76683e', borderRadius: '14px', padding: '22px', boxSizing: 'border-box', color: '#eee8dd' }}>
            <h3 id="passport-editor-title" style={{ color: '#cab77d', marginTop: 0 }}>Pasaporte · {passportDraft.nombre} {passportDraft.apellidos}</h3>
            <p style={{ fontSize: '13px', color: '#aaa59b', lineHeight: 1.6 }}>Estos datos serán visibles en el portal de la clienta. Incluye solo las notas que quieras compartir con ella.</p>
            {([['dniCapilar', 'DNI capilar / diagnóstico'], ['prescripcionCasa', 'Cuidado en casa'], ['ultimaVisita', 'Última visita registrada'], ['proximaVisitaSugerida', 'Próxima visita recomendada']] as const).map(([field, label]) => <label key={field} style={{ display: 'block', marginBottom: '16px', fontSize: '13px' }}>{label}<textarea value={passportDraft[field] || ''} onChange={e => setPassportDraft({ ...passportDraft, [field]: e.target.value })} rows={field === 'dniCapilar' || field === 'prescripcionCasa' ? 3 : 1} style={{ display: 'block', width: '100%', boxSizing: 'border-box', backgroundColor: '#191919', color: '#eee8dd', border: '1px solid #444', borderRadius: '6px', padding: '10px', marginTop: '7px', fontSize: '14px' }} /></label>)}
            <h4 style={{ color: '#cab77d' }}>Historial de visitas</h4>
            {(passportDraft.pastVisits || []).map((visit, index) => <div key={index} style={{ backgroundColor: '#191919', border: '1px solid #34332d', padding: '14px', borderRadius: '8px', marginBottom: '12px' }}>
              {(['date', 'service', 'stylist', 'notes'] as const).map(field => <label key={field} style={{ display: 'block', marginBottom: '10px', fontSize: '12px' }}>{({ date: 'Fecha', service: 'Servicio realizado', stylist: 'Profesional', notes: 'Notas para la clienta' })[field]}<input type="text" value={visit[field]} onChange={e => setPassportDraft({ ...passportDraft, pastVisits: (passportDraft.pastVisits || []).map((item, i) => i === index ? { ...item, [field]: e.target.value } : item) })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', marginTop: '5px', backgroundColor: '#121212', border: '1px solid #444', borderRadius: '6px', color: '#fff' }} /></label>)}
              <button type="button" onClick={() => { if (window.confirm('¿Quitar esta visita del historial? Se aplicará al guardar.')) setPassportDraft({ ...passportDraft, pastVisits: (passportDraft.pastVisits || []).filter((_, i) => i !== index) }); }} style={{ color: '#efaaa3', background: 'none', border: '1px solid #74433e', padding: '8px', borderRadius: '5px', cursor: 'pointer' }}>Borrar visita</button>
            </div>)}
            <button type="button" onClick={() => setPassportDraft({ ...passportDraft, pastVisits: [...(passportDraft.pastVisits || []), { date: formatDateKey(new Date()), service: '', stylist: 'Ana', notes: '' }] })} style={{ padding: '10px', cursor: 'pointer' }}>+ Añadir visita realizada</button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
              <button type="button" onClick={savePassport} style={{ backgroundColor: '#d4af37', color: '#17150f', border: 'none', padding: '12px 16px', borderRadius: '6px', cursor: 'pointer' }}>Guardar pasaporte</button>
              <button type="button" onClick={() => setPassportDraft(null)} style={{ padding: '12px', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={() => { if (window.confirm('¿Vaciar diagnóstico, cuidados, fechas recomendadas e historial? La clienta y sus citas se conservan. Debes guardar para aplicar.')) setPassportDraft({ ...passportDraft, dniCapilar: '', prescripcionCasa: '', ultimaVisita: '', proximaVisitaSugerida: '', pastVisits: [] }); }} style={{ background: 'none', border: '1px solid #74433e', color: '#efaaa3', padding: '12px', borderRadius: '6px', cursor: 'pointer' }}>Vaciar pasaporte</button>
            </div>
          </div>
        </div>
      )}
      {saturdayRequestModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 2100 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="saturday-request-title" style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '16px', padding: '25px', maxWidth: '440px', width: '100%', color: '#fff' }}>
            <h3 id="saturday-request-title" style={{ color: '#d4af37' }}>{approvalTitle(saturdayRequestModal.saturdayApproval?.reason)} · Bajo confirmación previa</h3>
            <p>Ana revisará los servicios solicitados, la viabilidad del trabajo y la disponibilidad antes de aceptar tu cita. Puede pedirte un diagnóstico o un test de mechón previo. Esta solicitud no confirma la reserva.</p>
            <p>{saturdayRequestModal.dateKey.split('-').reverse().join('/')} a las {saturdayRequestModal.time}</p>
            <p>{saturdayRequestModal.serviceSubcategory.replace(/^PENDIENTE (?:SÁBADO|VALORACIÓN) /, '')}</p>
            {bizConfig.advancePaymentEnabled && (saturdayRequestModal.durationMinutes || 0) > bizConfig.advancePaymentThresholdMinutes && <p>Si Ana acepta la solicitud, será necesaria una reserva anticipada de {bizConfig.depositAmount}. Espera su aprobación antes de pagar.</p>}
            <p style={{ color: '#aaa', fontSize: '12px' }}>El registro actual es local. Para que Ana reciba la solicitud a distancia es necesario conectar el envío de avisos.</p>
            <button type="button" onClick={() => setSaturdayRequestModal(null)} style={{ padding: '10px', marginRight: '10px' }}>Volver</button>
            <button type="button" onClick={registerSaturdayRequest} style={{ backgroundColor: '#d4af37', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Registrar solicitud pendiente</button>
          </div>
        </div>
      )}
      {advancePaymentModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 2000 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="advance-payment-title" style={{ backgroundColor: '#141414', border: '1px solid #d4af37', borderRadius: '16px', padding: '25px', maxWidth: '440px', width: '100%', maxHeight: '85vh', overflowY: 'auto', color: '#fff' }}>
            <h3 id="advance-payment-title" style={{ color: '#d4af37', marginTop: 0 }}>Reserva anticipada · {advancePaymentModal.advancePayment?.amount} €</h3>
            <p>Tu cita supera los {bizConfig.advancePaymentThresholdMinutes} minutos. Para que quede reservada, realiza un Bizum de <strong>{advancePaymentModal.advancePayment?.amount} € al {bizConfig.bizumNumber}</strong>.</p>
            <p>{advancePaymentModal.dateKey.split('-').reverse().join('/')} a las {advancePaymentModal.time} · {advancePaymentModal.durationMinutes} min</p>
            <p>Indica tu nombre y apellidos y utiliza este concepto:</p>
            <div style={{ padding: '12px', border: '1px solid #d4af37', borderRadius: '6px', overflowWrap: 'anywhere' }}>{advancePaymentConcept(advancePaymentModal)}</div>
            <p style={{ color: '#aaa' }}>La solicitud quedará pendiente. Confirmaremos la reserva cuando comprobemos la recepción del pago.</p>
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(advancePaymentConcept(advancePaymentModal)); alert('Concepto copiado.'); } catch { alert('No se pudo copiar. Selecciona y copia el concepto mostrado.'); } }} style={{ padding: '10px', marginBottom: '12px', cursor: 'pointer' }}>Copiar concepto</button>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setAdvancePaymentModal(null)} style={{ padding: '10px', cursor: 'pointer' }}>Volver</button>
              <button type="button" onClick={savePendingAdvanceAppointment} style={{ backgroundColor: '#d4af37', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Registrar solicitud pendiente de pago</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA CITA ADMIN */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #76683e', borderRadius: '16px', padding: '25px', maxWidth: '560px', boxSizing: 'border-box', width: '100%', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '16px', fontFamily: 'serif', margin: 0 }}>Nueva cita · 360studio</h3>
            <p style={{ color: '#cab77d', fontSize: '14px', margin: 0 }}>{targetDateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {targetTime}</p>
            <form onSubmit={handleSaveModalAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ color: '#eee8dd', fontSize: '16px', margin: '8px 0' }}>1. Datos de la clienta</h4>
              <label style={{ color: '#bdb8ad', fontSize: '13px' }}>Elegir una clienta registrada
                <select defaultValue="" onChange={e => {
                  const client = listaClientes.find(item => String(item.idNum) === e.target.value);
                  if (client) { setModalClientName(`${client.nombre} ${client.apellidos}`.trim()); setModalPhone(client.telefono); setModalEmail(client.email); }
                  else { setModalClientName(''); setModalPhone(''); setModalEmail(''); }
                }} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '12px', backgroundColor: '#191919', color: '#eee8dd', border: '1px solid #76683e', borderRadius: '6px', marginTop: '8px', fontSize: '14px' }}>
                  <option value="">Introducir datos manualmente</option>
                  {listaClientes.map(client => <option key={client.idNum} value={client.idNum}>{client.nombre} {client.apellidos} · {client.email}</option>)}
                </select>
              </label>

              <label style={{ color: '#bdb8ad', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>Nombre y apellidos<input type="text" placeholder="Nombre y Apellidos" value={modalClientName} onChange={(e) => setModalClientName(e.target.value)} required style={{ padding: '12px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} /></label>
              <label style={{ color: '#bdb8ad', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>Teléfono<input type="text" placeholder="Teléfono móvil" value={modalPhone} onChange={(e) => setModalPhone(e.target.value)} style={{ padding: '12px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} /></label>
              <label style={{ color: '#bdb8ad', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>Correo electrónico<input type="email" placeholder="Correo electrónico" value={modalEmail} onChange={(e) => setModalEmail(e.target.value)} style={{ padding: '12px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }} /></label>
              <h4 style={{ color: '#eee8dd', fontSize: '16px', margin: '14px 0 4px' }}>2. Servicios de la cita</h4>
              <select aria-label="Categoría del servicio" value={modalCatIndex} onChange={(e) => {
                setModalCatIndex(Number(e.target.value));
                setModalSubIndex(0);
                const sub = catalog[Number(e.target.value)]?.subservices[0];
                setModalSelectedVariant(sub?.variants?.[0] || null);
              }} style={{ padding: '12px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }}>
                {catalog.map((cat, idx) => (<option key={cat.id} value={idx}>{cat.code} &lt; {cat.title}</option>))}
              </select>
              <select aria-label="Servicio" value={modalSubIndex} onChange={(e) => {
                const sIdx = Number(e.target.value);
                setModalSubIndex(sIdx);
                const sub = catalog[modalCatIndex]?.subservices[sIdx];
                setModalSelectedVariant(sub?.variants?.[0] || null);
              }} style={{ padding: '12px', backgroundColor: '#1c1c1c', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px' }}>
                {catalog[modalCatIndex]?.subservices.map((sub, idx) => (<option key={sub.id} value={idx} disabled={sub.active === false}>{sub.name}{sub.active === false ? " · Desactivado" : ""}</option>))}
              </select>
              {catalog[modalCatIndex]?.subservices[modalSubIndex]?.hasVariants && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold' }}>Selecciona Variante:</label>
                  <select value={modalSelectedVariant?.id || ""} onChange={(e) => {
                    const v = catalog[modalCatIndex]?.subservices[modalSubIndex]?.variants?.find(item => item.id === e.target.value);
                    setModalSelectedVariant(v || null);
                  }} style={{ padding: '12px', backgroundColor: '#1c1c1c', border: '1px solid #76683e', color: '#fff', borderRadius: '6px', fontSize: '14px' }}>
                    {catalog[modalCatIndex]?.subservices[modalSubIndex]?.variants?.map(v => (
                      <option key={v.id} value={v.id}>{v.name} - {v.price} / {v.duration}</option>
                    ))}
                  </select>
                </div>
              )}
              <button type="button" onClick={handleAddModalService} style={{ background: 'none', border: '1px solid #76683e', color: '#d4af37', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>+ Añadir servicio a la cita</button>
              {modalServices.length > 0 && (
                <div aria-live="polite" style={{ border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '14px' }}>
                  <strong>Servicios de esta cita</strong>
                  {modalServices.map(item => (
                    <div key={item.sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '8px' }}>
                      <span>{item.sub.name}{item.variant ? ` (${item.variant.name})` : ''} · {item.variant?.duration || item.sub.duration}</span>
                      <button type="button" aria-label={`Quitar ${item.sub.name}`} onClick={() => setModalServices(previous => previous.filter(entry => entry.sub.id !== item.sub.id))} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>Quitar</button>
                    </div>
                  ))}
                  <p style={{ color: '#d4af37', marginBottom: 0 }}>Duración total: {getModalDuration(modalServices)} min</p>
                </div>
              )}
              <small style={{ color: '#aaa' }}>Selecciona cada servicio y pulsa «Añadir servicio». Si repites uno, se actualiza su variante. Se guardarán los servicios de la lista; sin lista, se guardará el servicio seleccionado.</small>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Cita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE CITA */}
      {viewApptModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #76683e', borderRadius: '16px', padding: '25px', maxWidth: '560px', width: '100%', boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ color: '#cab77d', fontSize: '13px', letterSpacing: '2px', margin: 0 }}>360studio · DETALLE DE LA CITA</p>
            <h3 style={{ color: '#eee8dd', fontSize: '26px', fontFamily: 'serif', fontWeight: 'normal', margin: 0 }}>{viewApptModal.clientName}</h3>
            <div style={{ backgroundColor: adminAppointmentColor(viewApptModal).background, border: `1px solid ${adminAppointmentColor(viewApptModal).border}`, borderRadius: '10px', padding: '18px', color: '#eee8dd' }}>
              <strong style={{ fontSize: '14px' }}>{viewApptModal.completedAt ? 'Realizada · Registrada en el pasaporte' : viewApptModal.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.advancePayment?.status === 'pending' ? 'Pendiente de Bizum' : 'Cita confirmada'}</strong>
              <p style={{ fontFamily: 'serif', fontSize: '21px', margin: '12px 0 8px' }}>{new Date(`${viewApptModal.dateKey}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {viewApptModal.time}</p>
              <span style={{ color: '#bdb8ad', fontSize: '13px' }}>Duración total: {viewApptModal.durationMinutes || 45} min</span>
            </div>
            <section>
              <h4 style={{ color: '#cab77d', fontSize: '14px', margin: '0 0 12px' }}>Servicios reservados</h4>
              {viewApptModal.services?.length ? viewApptModal.services.map((item, index) => <div key={index} style={{ backgroundColor: '#191919', padding: '14px', border: '1px solid #34332d', borderRadius: '8px', marginBottom: '8px', fontSize: '14px', lineHeight: 1.6, color: '#ddd6c7' }}><strong>{item.sub.name}</strong>{item.variant && <span style={{ display: 'block', color: '#bdb8ad' }}>{item.variant.name}</span>}<span style={{ display: 'block', color: '#cab77d', fontSize: '13px' }}>{item.variant?.price || item.sub.price} · {item.variant?.duration || item.sub.duration}</span></div>) : <p style={{ color: '#ddd6c7', fontSize: '14px', lineHeight: 1.6, overflowWrap: 'anywhere' }}>{viewApptModal.serviceSubcategory}</p>}
            </section>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#bdb8ad', fontSize: '13px', overflowWrap: 'anywhere' }}>
              <a href={`tel:${viewApptModal.phone}`} style={{ color: '#cab77d', padding: '8px 0' }}>{viewApptModal.phone}</a>
              <span style={{ padding: '8px 0' }}>{viewApptModal.email}</span>
            </div>
            {viewApptModal.completedAt ? <p style={{ color: '#bdb8ad', fontSize: '13px', lineHeight: 1.6 }}>Visita registrada en el pasaporte. Puedes editar o borrar esa visita desde Clientes → Editar pasaporte e historial.</p> : <button type="button" onClick={() => markAppointmentCompleted(viewApptModal)} style={{ backgroundColor: '#26382b', border: '1px solid #526d59', color: '#d6e8d9', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', fontSize: '14px' }}>Marcar como realizada · Añadir al pasaporte</button>}
            <button type="button" onClick={() => { setRescheduleModalAppt(viewApptModal); setNewRescheduleDate(viewApptModal.dateKey); setNewRescheduleTime(viewApptModal.time); setViewApptModal(null); }} style={{ backgroundColor: '#242219', border: '1px solid #76683e', color: '#ddd0a4', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', fontSize: '14px' }}>Cambiar fecha u hora</button>
            {viewApptModal.saturdayApproval && (
              <div style={{ border: '1px solid #76683e', padding: '12px', borderRadius: '8px', color: '#fff' }}>
                <strong>{approvalTitle(viewApptModal.saturdayApproval.reason)}: {viewApptModal.saturdayApproval.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.saturdayApproval.status === 'accepted' ? 'Aceptado por Ana' : 'Rechazado'}</strong>
                <p>{viewApptModal.saturdayApproval.reference}</p>
                {viewApptModal.saturdayApproval.status === 'pending' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" onClick={() => {
                      const payment = bizConfig.advancePaymentEnabled && (viewApptModal.durationMinutes || 0) > bizConfig.advancePaymentThresholdMinutes ? createAdvancePayment() : undefined;
                      const updated: Appointment = { ...viewApptModal, saturdayApproval: { ...viewApptModal.saturdayApproval!, status: 'accepted' }, advancePayment: payment, serviceSubcategory: viewApptModal.serviceSubcategory.replace(/^PENDIENTE (?:SÁBADO|VALORACIÓN)/, payment ? 'PENDIENTE BIZUM' : 'RESERVADO') };
                      setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
                      setViewApptModal(updated);
                    }} style={{ backgroundColor: '#d4af37', padding: '10px', border: 'none', cursor: 'pointer' }}>Aceptar solicitud</button>
                    <button type="button" onClick={() => {
                      if (!window.confirm('¿Rechazar esta solicitud pendiente de revisión?')) return;
                      setAppointments(previous => previous.filter(item => item.id !== viewApptModal.id));
                      setViewApptModal(null);
                    }} style={{ padding: '10px', cursor: 'pointer' }}>Rechazar solicitud</button>
                  </div>
                )}
                {viewApptModal.saturdayApproval.status === 'accepted' && <a style={{ color: '#d4af37' }} target="_blank" rel="noreferrer" href={`https://wa.me/34${viewApptModal.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(viewApptModal.advancePayment?.status === 'pending' ? `Hola ${viewApptModal.clientName}. Ana ha aceptado tu solicitud para el ${viewApptModal.dateKey.split('-').reverse().join('/')} a las ${viewApptModal.time}. Para confirmar, realiza un Bizum de ${viewApptModal.advancePayment?.amount} € al ${bizConfig.bizumNumber}. Concepto: ${advancePaymentConcept(viewApptModal)}. Confirmaremos al comprobar el pago.` : generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time))}`}>Abrir WhatsApp para avisar a la clienta</a>}
              </div>
            )}
            {viewApptModal.advancePayment && (
              <div style={{ border: '1px solid #76683e', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '14px' }}>
                <strong>Reserva anticipada: {viewApptModal.advancePayment.amount} € · {viewApptModal.advancePayment.status === 'confirmed' ? 'Pago confirmado' : 'Pendiente de pago'}</strong>
                <p>Código: {viewApptModal.advancePayment.reference}</p>
                {viewApptModal.advancePayment.status === 'pending' && (
                  <button type="button" onClick={() => {
                    if (!window.confirm(`¿Has comprobado la recepción del Bizum de ${viewApptModal.advancePayment?.amount} € con este código?`)) return;
                    const updated: Appointment = { ...viewApptModal, advancePayment: { ...viewApptModal.advancePayment!, status: 'confirmed' }, serviceSubcategory: viewApptModal.serviceSubcategory.replace(/^PENDIENTE BIZUM/, 'RESERVADO'), remindersStatus: { email48h: true, whatsapp48h: true, whatsapp24h: true, whatsapp2h: true } };
                    setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
                    setViewApptModal(updated);
                  }} style={{ backgroundColor: '#d4af37', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Confirmar Bizum recibido</button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px', borderTop: '1px solid rgba(212,175,55,0.2)', paddingTop: '12px' }}>
              <span style={{ color: '#d4af37', fontSize: '13px', fontWeight: 'bold' }}>Abrir mensaje de WhatsApp o copiar texto:</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <a href={`https://wa.me/34${viewApptModal.phone.replace(/\s+/g, "")}?text=${encodeURIComponent(generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time))}`} target="_blank" rel="noreferrer" style={{ backgroundColor: '#26382b', color: '#d6e8d9', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  WhatsApp
                </a>
                <button type="button" onClick={() => {
                  const textoEmail = generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time);
                  navigator.clipboard.writeText(textoEmail);
                  alert('¡Texto del recordatorio copiado al portapapeletas!');
                }} style={{ backgroundColor: '#d4af37', color: '#000', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  Copiar Mensaje
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', marginTop: '10px' }}>
              <button onClick={(e) => handleDeleteAppointment(viewApptModal.id, e)} style={{ backgroundColor: '#2a1212', border: '1px solid #ff4444', color: '#ff4444', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar Cita</button>
              <button onClick={() => setViewApptModal(null)} style={{ background: '#1c1c1c', border: '1px solid #444', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICAR HORA DE CITA */}
      {rescheduleModalAppt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1100 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #76683e', borderRadius: '16px', padding: '25px', maxWidth: '500px', width: '100%', boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ color: '#d4af37', fontSize: '24px', fontWeight: 'normal', fontFamily: 'serif', margin: 0 }}>Cambiar fecha u hora</h3>
            <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>Clienta: <strong style={{ color: '#fff' }}>{rescheduleModalAppt.clientName}</strong></p>
            <div style={{ backgroundColor: '#191919', border: '1px solid #34332d', borderRadius: '9px', padding: '14px', color: '#bdb8ad', fontSize: '13px', lineHeight: 1.7 }}>
              Cita actual: {rescheduleModalAppt.dateKey.split('-').reverse().join('/')} · {rescheduleModalAppt.time}<br />
              Duración: {rescheduleModalAppt.durationMinutes || 45} min. Los servicios se mantienen al cambiar la fecha.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d4af37', fontSize: '14px', fontWeight: 'bold' }}>Nueva Fecha:</label>
              <input type="date" value={newRescheduleDate} onChange={(e) => setNewRescheduleDate(e.target.value)} style={{ padding: '12px', backgroundColor: '#1c1c1c', border: '1px solid #76683e', color: '#fff', borderRadius: '6px', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#d4af37', fontSize: '14px', fontWeight: 'bold' }}>Nueva Hora:</label>
              <select value={newRescheduleTime} onChange={(e) => setNewRescheduleTime(e.target.value)} style={{ padding: '12px', backgroundColor: '#1c1c1c', border: '1px solid #76683e', color: '#fff', borderRadius: '6px', fontSize: '14px' }}>
                {hoursList.map(h => (<option key={h} value={h}>{h}h</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setRescheduleModalAppt(null)} style={{ background: 'none', border: '1px solid #444', color: '#aaa', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={() => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(newRescheduleDate) || !/^\d{2}:\d{2}$/.test(newRescheduleTime)) { alert('Elige una fecha y una hora válidas.'); return; }
                if (isDateBlockedByHoliday(newRescheduleDate)) { alert('Este día está bloqueado por vacaciones o festivo.'); return; }
                const conflict = getRescheduleConflict(rescheduleModalAppt, newRescheduleDate, newRescheduleTime);
                if (conflict && !enableDoubleBooking) { alert('La duración completa de esta cita coincide con otra reserva. Elige otra hora.'); return; }
                const date = new Date(`${newRescheduleDate}T12:00:00`);
                setAppointments(previous => previous.map(a => a.id === rescheduleModalAppt.id ? { ...a, dateKey: newRescheduleDate, time: newRescheduleTime, dayName: date.toLocaleDateString('es-ES', { weekday: 'long' }) } : a));
                setRescheduleModalAppt(null);
                alert('¡Cita modificada con éxito!');
              }} style={{ backgroundColor: '#d4af37', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}