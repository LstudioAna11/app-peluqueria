import { AddonChoices, addonError, type AddonGroup } from './ServiceAddons';
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Home, Scissors, CalendarDays, User, LogOut, BookOpen, ArrowRight, ArrowLeft, UserRoundSearch, Sparkles, Info, ChevronLeft, ChevronRight, ChevronDown, ImagePlus, Trash2, Globe, MapPin, MessageCircle, Clock3, Instagram, Facebook, Music2 } from 'lucide-react';
import './catalog.css';
import { PromotionsPortalButton } from './PromotionsView';
import type { Promotion } from './promotions';
import { promotionServiceIds } from './promotions';
import { calculatePromotionDiscount, exactPrice } from './promotionPricing';
import type { PromotionDiscount } from './promotionPricing';
import { getBookingName, getAppointmentServiceNames, compactServiceText } from './serviceNames';
import * as studioApi from './studioApi';
const LazyAdminPanelView = React.lazy(() => import('./AdminPanelView'));
// Optimized copies of bundled photos only; custom uploads remain unchanged.
const FAST_PHOTO_URLS: Readonly<Record<string,string>> = {
  "/s1.webp": "/s1-fast.webp",
  "/s2.webp": "/s2-fast.webp",
  "/s3.webp": "/s3-fast.webp",
  "/s4.webp": "/s4-fast.webp",
  "/s5.webp": "/s5-fast.webp",
  "/s6.webp": "/s6-fast.webp",
  "/s7.webp": "/s7-fast.webp",
  "/s8.webp": "/s8-fast.webp",
  "/s9.webp": "/s9-fast.webp",
  "/Salon_elegante_con_luz_calida.png": "/salon-inicio-fast.webp"
};
function normalizeServiceSearch(value: string): string {
  const plurals: Record<string, string> = { raices: 'raiz', cortes: 'corte', peinados: 'peinado', mechas: 'mecha', rubios: 'rubio', colores: 'color', tratamientos: 'tratamiento' };
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).map(word => plurals[word] || word).join(' ');
}

function optimizedImageUrl(source: string | undefined | null): string {
 return source ? FAST_PHOTO_URLS[source] || source : '';
}



// Prepara el aviso; el envío se confirma manualmente en WhatsApp.
function delayWhatsAppUrl(phone: string): string | null {
  let number = String(phone || '').replace(/\D/g, '');
  if (number.startsWith('00')) number = number.slice(2);
  if (number.length === 9) number = '34' + number;
  if (!/^[1-9]\d{8,14}$/.test(number)) return null;
  const message = "Hola, te escribo desde L'STUDIO ANA 🌿.\n\nVeo que tu cita comenzaba hace 10 minutos y todavía no has llegado al estudio.\n\nTe escribo para recordarte que, para no retrasar los servicios de las siguientes clientas, el tiempo máximo de cortesía es de 15 minutos.⏳\n\nSi crees que vas a tardar más, por favor avísame ahora mismo para ver si podemos reajustar tu servicio o si debemos agendarlo para otro momento. ¡Muchas gracias!";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function cancelledWhatsAppUrl(phone: string): string | null {
  let number = String(phone || '').replace(/\D/g, '');
  if (number.startsWith('00')) number = number.slice(2);
  if (number.length === 9) number = '34' + number;
  if (!/^[1-9]\d{8,14}$/.test(number)) return null;
  const message = "Hola, te escribo desde L'STUDIO ANA 🌿.\n\nSiento informarte que, al haber transcurrido los 15 minutos de cortesía sin haber recibido noticias tuyas, me veo en la necesidad de cancelar tu cita de hoy para no perjudicar el horario de las siguientes clientas.\n\nComo profesional, cuido mucho el tiempo de cada servicio para daros la mejor calidad. ⏳✨\n\nPuedes volver a consultar mis huecos disponibles y reservar una nueva cita aquí:\n\n🗓️ RESERVA ONLINE: https://lstudioana.es\n\n¡Espero verte en otra ocasión!";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

const DEFAULT_HEADER_LOGO = '/studio-header-default.webp';


// Consultas de estado acotadas: nunca crean citas ni reenvían notificaciones.
function statusWithTimeout<T>(request: Promise<T>, milliseconds = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('El servidor no ha respondido en 15 segundos. Vuelve a consultar; si persiste, revisa la función studio-api y el servicio de notificaciones.')), milliseconds);
    request.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

// ======
// CONFIGURACIÓN DE L'STUDIO ANA
// ======
export type StudioEmployee = { id: string; name: string; role: string; photo: string; status: 'active' | 'future' | 'inactive' };

export interface BusinessConfig {
  promotions?: Promotion[];
  brandLogoUrl?: string;
  headerLogoUrl?: string;
  showPrices?: boolean;
  employees?: StudioEmployee[];
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
  saturdayPolicyEnabled?: boolean;
  whatsappTemplate: string;
  homeHeroImage: string;
  homeHeroImagePosition: { x: number; y: number };
}

const INITIAL_BUSINESS_CONFIG: BusinessConfig = {
  showPrices: true,
  employees: [],
  advancePaymentEnabled: true,
  advancePaymentThresholdMinutes: 120,
  saturdayApprovalEnabled: true,
  studioEmail: 'lstudioana@gmail.com',
  studioWhatsapp: '672163485',
  reminderHours: 24,
  cancellationHours: 24,
  name: "L'Studio Ana",
  subtitle: "PORTAL PRIVADO DE CLIENTAS",
  location: "Carrer Porta d'Alacant 11, Bajo, 03202 Elx (Alicante), España",
  phone: "672163485",
  description: "L'Studio Ana - Hair Experience es una peluquería premium en el centro de Elche, especializada en Balayage de Autor, mechas personalizadas, Babylights, coloración personalizada, técnicas de iluminación y terapias orgánicas.",
  scheduleMonday: "10:00h a 13:30h",
  scheduleTueWed: "10:00h a 18:00h",
  scheduleThuFri: "10:00h a 19:00h",
  scheduleSaturday: "09:00h a 13:00h",
  welcomeMessage: "¡Bienvenida!",
  masterPin: "0000",
  instagramUrl: "https://instagram.com",
  facebookUrl: "https://facebook.com",
  tiktokUrl: "https://tiktok.com",
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Carrer+Porta+d%27Alacant+11+03202+Elx+Alicante+Espa%C3%B1a",
  googleReviewUrl: "https://g.page/r/CRLx1fxwpIAYEBM/review",
  minAdvanceDays: 2,
  maxBookingMonths: 3,
  slotIntervalMinutes: 15,
  bizumNumber: "672163485",
  depositAmount: "60 €",
  saturdayPolicyEnabled: true,
  saturdayNoticeMessage: "En L’Studio Ana abrimos los sábados exclusivamente bajo demanda anticipada para servicios de eventos y trabajos técnicos de larga duración.\n\nCada solicitud está sujeta a disponibilidad y confirmación de Ana. Si no hay reservas previamente confirmadas, el Studio permanecerá cerrado.",
  whatsappTemplate: "Hola {nombre}. Te recordamos tu cita en L’Studio Ana el {fecha} a las {hora}. ¡Te esperamos en el Studio!",
  homeHeroImage: '/Salon_elegante_con_luz_calida.png',
  homeHeroImagePosition: { x: 50, y: 62 }
};

// ======
// DICCIONARIO MULTIIDIOMA GLOBAL Y COMPLETO
// ======
const DEFAULT_BRAND_LOGO = '/studio-brand-default.webp';

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
    sendReview: "Enviar mi opinión",
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


// Idiomas del portal · primera fase: acceso y navegación.
TRANSLATIONS["fr"] = {"subtitle": "ESPACE PRIVÉ CLIENTES", "enterPin": "Saisissez votre code PIN", "logout": "Déconnexion", "catalog": "Services et réservation", "history": "Mon passeport et historique", "backToPortal": "Retour à mon espace", "firstTimeRegister": "Première visite ? Inscrivez-vous", "backToPin": "Déjà inscrite ? Se connecter", "nameLabel": "Prénom *", "surnamesLabel": "Nom", "phoneLabel": "Téléphone portable", "emailLabel": "Adresse e-mail *", "pinLabel": "Choisissez un code PIN à 4 chiffres *", "completeRegisterBtn": "Créer mon compte", "clientRegistrationTitle": "Inscription"};
TRANSLATIONS["it"] = {"subtitle": "AREA PRIVATA CLIENTI", "enterPin": "Inserisci il tuo PIN", "logout": "Esci", "catalog": "Servizi e prenotazioni", "history": "Passaporto e cronologia", "backToPortal": "Torna alla mia area", "firstTimeRegister": "Prima visita? Registrati", "backToPin": "Già registrata? Accedi", "nameLabel": "Nome *", "surnamesLabel": "Cognome", "phoneLabel": "Cellulare", "emailLabel": "E-mail *", "pinLabel": "Scegli un PIN di 4 cifre *", "completeRegisterBtn": "Crea il mio account", "clientRegistrationTitle": "Registrazione"};
TRANSLATIONS["pt"] = {"subtitle": "ÁREA PRIVADA DE CLIENTES", "enterPin": "Introduza o seu PIN", "logout": "Terminar sessão", "catalog": "Serviços e reservas", "history": "Passaporte e histórico", "backToPortal": "Voltar à minha área", "firstTimeRegister": "Primeira visita? Registe-se", "backToPin": "Já tem registo? Entrar", "nameLabel": "Nome *", "surnamesLabel": "Apelidos", "phoneLabel": "Telemóvel", "emailLabel": "E-mail *", "pinLabel": "Escolha um PIN de 4 dígitos *", "completeRegisterBtn": "Criar conta", "clientRegistrationTitle": "Registo"};
TRANSLATIONS["de"] = {"subtitle": "PRIVATER KUNDENBEREICH", "enterPin": "Bitte PIN eingeben", "logout": "Abmelden", "catalog": "Leistungen und Buchung", "history": "Haarpass und Verlauf", "backToPortal": "Zurück zu meinem Bereich", "firstTimeRegister": "Erster Besuch? Registrieren", "backToPin": "Bereits registriert? Anmelden", "nameLabel": "Vorname *", "surnamesLabel": "Nachname", "phoneLabel": "Mobiltelefon", "emailLabel": "E-Mail *", "pinLabel": "Vierstellige PIN wählen *", "completeRegisterBtn": "Konto erstellen", "clientRegistrationTitle": "Registrierung"};
TRANSLATIONS["nl"] = {"subtitle": "PRIVÉ KLANTENPORTAAL", "enterPin": "Voer je pincode in", "logout": "Uitloggen", "catalog": "Diensten en boeken", "history": "Haarpaspoort en geschiedenis", "backToPortal": "Terug naar mijn portaal", "firstTimeRegister": "Eerste bezoek? Registreren", "backToPin": "Al geregistreerd? Inloggen", "nameLabel": "Voornaam *", "surnamesLabel": "Achternaam", "phoneLabel": "Mobiel nummer", "emailLabel": "E-mail *", "pinLabel": "Kies een pincode van 4 cijfers *", "completeRegisterBtn": "Account aanmaken", "clientRegistrationTitle": "Registratie"};
TRANSLATIONS["pl"] = {"subtitle": "PRYWATNY PORTAL KLIENTEK", "enterPin": "Wpisz kod PIN", "logout": "Wyloguj", "catalog": "Usługi i rezerwacja", "history": "Paszport włosów i historia", "backToPortal": "Powrót do mojego portalu", "firstTimeRegister": "Pierwsza wizyta? Zarejestruj się", "backToPin": "Masz już konto? Zaloguj się", "nameLabel": "Imię *", "surnamesLabel": "Nazwisko", "phoneLabel": "Telefon komórkowy", "emailLabel": "E-mail *", "pinLabel": "Wybierz 4-cyfrowy PIN *", "completeRegisterBtn": "Utwórz konto", "clientRegistrationTitle": "Rejestracja"};
TRANSLATIONS["cs"] = {"subtitle": "SOUKROMÝ KLIENTSKÝ PORTÁL", "enterPin": "Zadejte svůj PIN", "logout": "Odhlásit se", "catalog": "Služby a rezervace", "history": "Vlasový pas a historie", "backToPortal": "Zpět do mého portálu", "firstTimeRegister": "První návštěva? Zaregistrujte se", "backToPin": "Máte účet? Přihlaste se", "nameLabel": "Jméno *", "surnamesLabel": "Příjmení", "phoneLabel": "Mobilní telefon", "emailLabel": "E-mail *", "pinLabel": "Zvolte čtyřmístný PIN *", "completeRegisterBtn": "Vytvořit účet", "clientRegistrationTitle": "Registrace"};
TRANSLATIONS["nb"] = {"subtitle": "PRIVAT KUNDEPORTAL", "enterPin": "Skriv inn PIN-koden", "logout": "Logg ut", "catalog": "Tjenester og bestilling", "history": "Hårpass og historikk", "backToPortal": "Tilbake til portalen", "firstTimeRegister": "Første besøk? Registrer deg", "backToPin": "Allerede registrert? Logg inn", "nameLabel": "Fornavn *", "surnamesLabel": "Etternavn", "phoneLabel": "Mobiltelefon", "emailLabel": "E-post *", "pinLabel": "Velg en PIN-kode med 4 sifre *", "completeRegisterBtn": "Opprett konto", "clientRegistrationTitle": "Registrering"};
TRANSLATIONS["sv"] = {"subtitle": "PRIVAT KUNDPORTAL", "enterPin": "Ange din PIN-kod", "logout": "Logga ut", "catalog": "Tjänster och bokning", "history": "Hårpass och historik", "backToPortal": "Tillbaka till portalen", "firstTimeRegister": "Första besöket? Registrera dig", "backToPin": "Redan registrerad? Logga in", "nameLabel": "Förnamn *", "surnamesLabel": "Efternamn", "phoneLabel": "Mobilnummer", "emailLabel": "E-post *", "pinLabel": "Välj en PIN-kod med 4 siffror *", "completeRegisterBtn": "Skapa konto", "clientRegistrationTitle": "Registrering"};
TRANSLATIONS["ar"] = {"subtitle": "بوابة العميلات الخاصة", "enterPin": "أدخلي رمز الدخول", "logout": "تسجيل الخروج", "catalog": "الخدمات والحجز", "history": "ملف الشعر وسجل الزيارات", "backToPortal": "العودة إلى حسابي", "firstTimeRegister": "زيارتك الأولى؟ سجّلي هنا", "backToPin": "لديك حساب؟ تسجيل الدخول", "nameLabel": "الاسم الأول *", "surnamesLabel": "اسم العائلة", "phoneLabel": "رقم الهاتف المحمول", "emailLabel": "البريد الإلكتروني *", "pinLabel": "اختاري رمز دخول من 4 أرقام *", "completeRegisterBtn": "إنشاء حساب", "clientRegistrationTitle": "التسجيل"};


// Booking interface translations
Object.assign(TRANSLATIONS["es"], {"viewService":"Ver servicio","chooseAndBook":"Elegir mi cita","backToCatalog":"Volver al catálogo","serviceIncludesTitle":"Qué incluye","serviceConditionsTitle":"Condiciones y requisitos","serviceOptionsTitle":"Opciones"});
Object.assign(TRANSLATIONS["en"], {"viewService":"View service","chooseAndBook":"Choose my appointment","backToCatalog":"Back to catalog","serviceIncludesTitle":"What is included","serviceConditionsTitle":"Conditions and requirements","serviceOptionsTitle":"Options"});
Object.assign(TRANSLATIONS["fr"], {"viewService":"Voir le service","chooseAndBook":"Choisir mon rendez-vous","backToCatalog":"Retour au catalogue","serviceIncludesTitle":"Ce qui est inclus","serviceConditionsTitle":"Conditions et prérequis","serviceOptionsTitle":"Options"});
Object.assign(TRANSLATIONS["it"], {"viewService":"Vedi servizio","chooseAndBook":"Scegli il mio appuntamento","backToCatalog":"Torna al catalogo","serviceIncludesTitle":"Cosa include","serviceConditionsTitle":"Condizioni e requisiti","serviceOptionsTitle":"Opzioni"});
Object.assign(TRANSLATIONS["pt"], {"viewService":"Ver serviço","chooseAndBook":"Escolher a minha marcação","backToCatalog":"Voltar ao catálogo","serviceIncludesTitle":"O que inclui","serviceConditionsTitle":"Condições e requisitos","serviceOptionsTitle":"Opções"});
Object.assign(TRANSLATIONS["de"], {"viewService":"Service ansehen","chooseAndBook":"Termin wählen","backToCatalog":"Zurück zum Katalog","serviceIncludesTitle":"Was enthalten ist","serviceConditionsTitle":"Bedingungen und Voraussetzungen","serviceOptionsTitle":"Optionen"});
Object.assign(TRANSLATIONS["nl"], {"viewService":"Service bekijken","chooseAndBook":"Afspraak kiezen","backToCatalog":"Terug naar de catalogus","serviceIncludesTitle":"Wat er inbegrepen is","serviceConditionsTitle":"Voorwaarden en vereisten","serviceOptionsTitle":"Opties"});
Object.assign(TRANSLATIONS["pl"], {"viewService":"Zobacz usługę","chooseAndBook":"Wybierz wizytę","backToCatalog":"Powrót do katalogu","serviceIncludesTitle":"Co obejmuje","serviceConditionsTitle":"Warunki i wymagania","serviceOptionsTitle":"Opcje"});
Object.assign(TRANSLATIONS["cs"], {"viewService":"Zobrazit službu","chooseAndBook":"Vybrat si termín","backToCatalog":"Zpět na katalog","serviceIncludesTitle":"Co zahrnuje","serviceConditionsTitle":"Podmínky a požadavky","serviceOptionsTitle":"Možnosti"});
Object.assign(TRANSLATIONS["nb"], {"viewService":"Se tjenesten","chooseAndBook":"Velg time","backToCatalog":"Tilbake til katalogen","serviceIncludesTitle":"Hva som er inkludert","serviceConditionsTitle":"Vilkår og krav","serviceOptionsTitle":"Alternativer"});
Object.assign(TRANSLATIONS["sv"], {"viewService":"Se tjänsten","chooseAndBook":"Välj tid","backToCatalog":"Tillbaka till katalogen","serviceIncludesTitle":"Vad som ingår","serviceConditionsTitle":"Villkor och krav","serviceOptionsTitle":"Alternativ"});
Object.assign(TRANSLATIONS["ar"], {"viewService":"عرض الخدمة","chooseAndBook":"اختيار موعدي","backToCatalog":"العودة إلى الكتالوج","serviceIncludesTitle":"ما يشمله","serviceConditionsTitle":"الشروط والمتطلبات","serviceOptionsTitle":"الخيارات"});
Object.assign(TRANSLATIONS["es"], {"addShort": "Añadir"}); Object.assign(TRANSLATIONS["en"], {"addShort": "Add"}); Object.assign(TRANSLATIONS["fr"], {"addShort": "Ajouter"}); Object.assign(TRANSLATIONS["it"], {"addShort": "Aggiungi"}); Object.assign(TRANSLATIONS["pt"], {"addShort": "Adicionar"}); Object.assign(TRANSLATIONS["de"], {"addShort": "Hinzufügen"}); Object.assign(TRANSLATIONS["nl"], {"addShort": "Toevoegen"}); Object.assign(TRANSLATIONS["pl"], {"addShort": "Dodaj"}); Object.assign(TRANSLATIONS["cs"], {"addShort": "Přidat"}); Object.assign(TRANSLATIONS["nb"], {"addShort": "Legg til"}); Object.assign(TRANSLATIONS["sv"], {"addShort": "Lägg till"}); Object.assign(TRANSLATIONS["ar"], {"addShort": "إضافة"});
Object.assign(TRANSLATIONS["es"], {"backServices": "Volver a mis servicios", "chooseMoment": "Elige tu momento", "fullSlots": "Horas disponibles para tu cita completa", "previousWeek": "Semana anterior", "nextWeek": "Semana siguiente", "slotsAvailable": "Con horas disponibles", "noSlots": "Sin horas disponibles", "otherDate": "Ir a otra fecha", "noSlotsDay": "No hay horas disponibles para tu selección en este día. Prueba otra fecha.", "morning": "Mañana", "afternoon": "Tarde", "chooseHour": "Selecciona una hora", "requestAppointment": "Solicitar esta cita", "continueBooking": "Continuar con mi reserva", "chooseDateTime": "Elegir fecha y hora", "reviewSelection": "Revisa tu selección y continúa para elegir fecha y hora.", "selectedRemove": "Seleccionado · Quitar", "addAppointment": "Añadir a mi cita", "chooseOption": "Selecciona una opción"});
Object.assign(TRANSLATIONS["en"], {"backServices": "Back to my services", "chooseMoment": "Choose your time", "fullSlots": "Available times for your full appointment", "previousWeek": "Previous week", "nextWeek": "Next week", "slotsAvailable": "Times available", "noSlots": "No times available", "otherDate": "Choose another date", "noSlotsDay": "No times are available for your selection on this day. Try another date.", "morning": "Morning", "afternoon": "Afternoon", "chooseHour": "Choose a time", "requestAppointment": "Request this appointment", "continueBooking": "Continue booking", "chooseDateTime": "Choose date and time", "reviewSelection": "Review your selection, then choose a date and time.", "selectedRemove": "Selected · Remove", "addAppointment": "Add to my appointment", "chooseOption": "Choose an option"});
Object.assign(TRANSLATIONS["fr"], {"backServices": "Retour à mes services", "chooseMoment": "Choisissez votre créneau", "fullSlots": "Créneaux disponibles pour votre rendez-vous complet", "previousWeek": "Semaine précédente", "nextWeek": "Semaine suivante", "slotsAvailable": "Créneaux disponibles", "noSlots": "Aucun créneau", "otherDate": "Choisir une autre date", "noSlotsDay": "Aucun créneau pour votre sélection ce jour-là. Essayez une autre date.", "morning": "Matin", "afternoon": "Après-midi", "chooseHour": "Choisissez une heure", "requestAppointment": "Demander ce rendez-vous", "continueBooking": "Continuer ma réservation", "chooseDateTime": "Choisir la date et l’heure", "reviewSelection": "Vérifiez votre sélection, puis choisissez la date et l’heure.", "selectedRemove": "Sélectionné · Retirer", "addAppointment": "Ajouter à mon rendez-vous", "chooseOption": "Choisissez une option"});
Object.assign(TRANSLATIONS["it"], {"backServices": "Torna ai miei servizi", "chooseMoment": "Scegli il tuo orario", "fullSlots": "Orari disponibili per l’intero appuntamento", "previousWeek": "Settimana precedente", "nextWeek": "Settimana successiva", "slotsAvailable": "Orari disponibili", "noSlots": "Nessun orario disponibile", "otherDate": "Scegli un’altra data", "noSlotsDay": "Nessun orario disponibile per questa selezione oggi. Prova un’altra data.", "morning": "Mattina", "afternoon": "Pomeriggio", "chooseHour": "Scegli un orario", "requestAppointment": "Richiedi questo appuntamento", "continueBooking": "Continua la prenotazione", "chooseDateTime": "Scegli data e ora", "reviewSelection": "Controlla la selezione, poi scegli data e ora.", "selectedRemove": "Selezionato · Rimuovi", "addAppointment": "Aggiungi al mio appuntamento", "chooseOption": "Scegli un’opzione"});
Object.assign(TRANSLATIONS["pt"], {"backServices": "Voltar aos meus serviços", "chooseMoment": "Escolha o seu horário", "fullSlots": "Horários disponíveis para a consulta completa", "previousWeek": "Semana anterior", "nextWeek": "Semana seguinte", "slotsAvailable": "Horários disponíveis", "noSlots": "Sem horários disponíveis", "otherDate": "Escolher outra data", "noSlotsDay": "Não há horários para esta seleção neste dia. Experimente outra data.", "morning": "Manhã", "afternoon": "Tarde", "chooseHour": "Escolha uma hora", "requestAppointment": "Solicitar esta marcação", "continueBooking": "Continuar a reserva", "chooseDateTime": "Escolher data e hora", "reviewSelection": "Reveja a seleção e escolha data e hora.", "selectedRemove": "Selecionado · Remover", "addAppointment": "Adicionar à minha marcação", "chooseOption": "Escolha uma opção"});
Object.assign(TRANSLATIONS["de"], {"backServices": "Zurück zu meinen Leistungen", "chooseMoment": "Wählen Sie Ihre Zeit", "fullSlots": "Verfügbare Zeiten für den gesamten Termin", "previousWeek": "Vorherige Woche", "nextWeek": "Nächste Woche", "slotsAvailable": "Zeiten verfügbar", "noSlots": "Keine Zeiten verfügbar", "otherDate": "Anderes Datum wählen", "noSlotsDay": "Für Ihre Auswahl sind an diesem Tag keine Zeiten verfügbar. Wählen Sie ein anderes Datum.", "morning": "Vormittag", "afternoon": "Nachmittag", "chooseHour": "Uhrzeit wählen", "requestAppointment": "Diesen Termin anfragen", "continueBooking": "Buchung fortsetzen", "chooseDateTime": "Datum und Uhrzeit wählen", "reviewSelection": "Prüfen Sie Ihre Auswahl und wählen Sie Datum und Uhrzeit.", "selectedRemove": "Ausgewählt · Entfernen", "addAppointment": "Zu meinem Termin hinzufügen", "chooseOption": "Option wählen"});
Object.assign(TRANSLATIONS["nl"], {"backServices": "Terug naar mijn diensten", "chooseMoment": "Kies je tijd", "fullSlots": "Beschikbare tijden voor je volledige afspraak", "previousWeek": "Vorige week", "nextWeek": "Volgende week", "slotsAvailable": "Tijden beschikbaar", "noSlots": "Geen tijden beschikbaar", "otherDate": "Andere datum kiezen", "noSlotsDay": "Geen tijden voor je selectie op deze dag. Probeer een andere datum.", "morning": "Ochtend", "afternoon": "Middag", "chooseHour": "Kies een tijd", "requestAppointment": "Deze afspraak aanvragen", "continueBooking": "Doorgaan met boeken", "chooseDateTime": "Datum en tijd kiezen", "reviewSelection": "Controleer je selectie en kies datum en tijd.", "selectedRemove": "Geselecteerd · Verwijderen", "addAppointment": "Aan mijn afspraak toevoegen", "chooseOption": "Kies een optie"});
Object.assign(TRANSLATIONS["pl"], {"backServices": "Wróć do moich usług", "chooseMoment": "Wybierz termin", "fullSlots": "Dostępne godziny na całą wizytę", "previousWeek": "Poprzedni tydzień", "nextWeek": "Następny tydzień", "slotsAvailable": "Dostępne godziny", "noSlots": "Brak dostępnych godzin", "otherDate": "Wybierz inną datę", "noSlotsDay": "Brak godzin dla wybranych usług w tym dniu. Wybierz inną datę.", "morning": "Rano", "afternoon": "Po południu", "chooseHour": "Wybierz godzinę", "requestAppointment": "Poproś o tę wizytę", "continueBooking": "Kontynuuj rezerwację", "chooseDateTime": "Wybierz datę i godzinę", "reviewSelection": "Sprawdź wybór i wybierz datę oraz godzinę.", "selectedRemove": "Wybrano · Usuń", "addAppointment": "Dodaj do mojej wizyty", "chooseOption": "Wybierz opcję"});
Object.assign(TRANSLATIONS["cs"], {"backServices": "Zpět k mým službám", "chooseMoment": "Vyberte si termín", "fullSlots": "Dostupné časy pro celou návštěvu", "previousWeek": "Předchozí týden", "nextWeek": "Příští týden", "slotsAvailable": "Dostupné časy", "noSlots": "Žádné dostupné časy", "otherDate": "Vybrat jiné datum", "noSlotsDay": "Pro vybrané služby nejsou tento den volné časy. Zkuste jiné datum.", "morning": "Dopoledne", "afternoon": "Odpoledne", "chooseHour": "Vyberte čas", "requestAppointment": "Požádat o tento termín", "continueBooking": "Pokračovat v rezervaci", "chooseDateTime": "Vybrat datum a čas", "reviewSelection": "Zkontrolujte výběr a vyberte datum a čas.", "selectedRemove": "Vybráno · Odebrat", "addAppointment": "Přidat k mé návštěvě", "chooseOption": "Vyberte možnost"});
Object.assign(TRANSLATIONS["nb"], {"backServices": "Tilbake til mine tjenester", "chooseMoment": "Velg tidspunkt", "fullSlots": "Ledige tider for hele avtalen", "previousWeek": "Forrige uke", "nextWeek": "Neste uke", "slotsAvailable": "Ledige tider", "noSlots": "Ingen ledige tider", "otherDate": "Velg en annen dato", "noSlotsDay": "Ingen ledige tider for valget ditt denne dagen. Prøv en annen dato.", "morning": "Formiddag", "afternoon": "Ettermiddag", "chooseHour": "Velg et tidspunkt", "requestAppointment": "Be om denne avtalen", "continueBooking": "Fortsett bestillingen", "chooseDateTime": "Velg dato og tid", "reviewSelection": "Se gjennom valget og velg dato og tid.", "selectedRemove": "Valgt · Fjern", "addAppointment": "Legg til i avtalen min", "chooseOption": "Velg et alternativ"});
Object.assign(TRANSLATIONS["sv"], {"backServices": "Tillbaka till mina tjänster", "chooseMoment": "Välj din tid", "fullSlots": "Lediga tider för hela besöket", "previousWeek": "Föregående vecka", "nextWeek": "Nästa vecka", "slotsAvailable": "Lediga tider", "noSlots": "Inga lediga tider", "otherDate": "Välj ett annat datum", "noSlotsDay": "Inga lediga tider för ditt val denna dag. Prova ett annat datum.", "morning": "Förmiddag", "afternoon": "Eftermiddag", "chooseHour": "Välj en tid", "requestAppointment": "Begär denna tid", "continueBooking": "Fortsätt bokningen", "chooseDateTime": "Välj datum och tid", "reviewSelection": "Kontrollera ditt val och välj datum och tid.", "selectedRemove": "Vald · Ta bort", "addAppointment": "Lägg till i mitt besök", "chooseOption": "Välj ett alternativ"});
Object.assign(TRANSLATIONS["ar"], {"backServices": "العودة إلى خدماتي", "chooseMoment": "اختاري موعدك", "fullSlots": "الأوقات المتاحة لكامل موعدك", "previousWeek": "الأسبوع السابق", "nextWeek": "الأسبوع التالي", "slotsAvailable": "توجد أوقات متاحة", "noSlots": "لا توجد أوقات متاحة", "otherDate": "اختيار تاريخ آخر", "noSlotsDay": "لا توجد أوقات متاحة للخدمات المختارة في هذا اليوم. جرّبي تاريخًا آخر.", "morning": "صباحًا", "afternoon": "بعد الظهر", "chooseHour": "اختاري وقتًا", "requestAppointment": "طلب هذا الموعد", "continueBooking": "متابعة الحجز", "chooseDateTime": "اختيار التاريخ والوقت", "reviewSelection": "راجعي الخدمات المختارة ثم اختاري التاريخ والوقت.", "selectedRemove": "تم الاختيار · إزالة", "addAppointment": "إضافة إلى موعدي", "chooseOption": "اختاري خيارًا"});


// Booking results and validation messages
Object.assign(TRANSLATIONS["es"], {"bookingConfirmed": "Cita confirmada: {date} · {time}.", "requestSaved": "Solicitud registrada en este dispositivo. Pendiente de confirmación de Ana.", "paymentSaved": "Solicitud registrada. Pago pendiente: {amount} €. Código: {reference}.", "selectOneService": "Selecciona al menos un servicio del catálogo.", "fullTimeRequired": "Selecciona una hora disponible para la duración completa de tu cita.", "salonClosed": "El salón está cerrado en esta fecha.", "requiredVariant": "Selecciona una variante para: {service}.", "registerRequest": "Registrar solicitud pendiente", "registerPayment": "Registrar solicitud pendiente de pago", "backAction": "Volver", "depositTitle": "Reserva anticipada"});
Object.assign(TRANSLATIONS["en"], {"bookingConfirmed": "Appointment confirmed: {date} · {time}.", "requestSaved": "Request saved on this device. Awaiting Ana’s confirmation.", "paymentSaved": "Request saved. Payment pending: {amount} €. Reference: {reference}.", "selectOneService": "Select at least one service.", "fullTimeRequired": "Select a time available for your full appointment.", "salonClosed": "The salon is closed on this date.", "requiredVariant": "Select an option for: {service}.", "registerRequest": "Submit appointment request", "registerPayment": "Submit request awaiting payment", "backAction": "Back", "depositTitle": "Advance payment"});
Object.assign(TRANSLATIONS["fr"], {"bookingConfirmed": "Rendez-vous confirmé : {date} · {time}.", "requestSaved": "Demande enregistrée sur cet appareil. En attente de confirmation par Ana.", "paymentSaved": "Demande enregistrée. Paiement en attente : {amount} €. Référence : {reference}.", "selectOneService": "Sélectionnez au moins un service.", "fullTimeRequired": "Choisissez un créneau pour la durée complète du rendez-vous.", "salonClosed": "Le salon est fermé à cette date.", "requiredVariant": "Choisissez une variante pour : {service}.", "registerRequest": "Enregistrer la demande", "registerPayment": "Enregistrer la demande en attente de paiement", "backAction": "Retour", "depositTitle": "Acompte"});
Object.assign(TRANSLATIONS["it"], {"bookingConfirmed": "Appuntamento confermato: {date} · {time}.", "requestSaved": "Richiesta salvata su questo dispositivo. In attesa della conferma di Ana.", "paymentSaved": "Richiesta salvata. Pagamento in attesa: {amount} €. Riferimento: {reference}.", "selectOneService": "Seleziona almeno un servizio.", "fullTimeRequired": "Scegli un orario disponibile per l’intero appuntamento.", "salonClosed": "Il salone è chiuso in questa data.", "requiredVariant": "Scegli una variante per: {service}.", "registerRequest": "Invia la richiesta", "registerPayment": "Invia la richiesta in attesa di pagamento", "backAction": "Indietro", "depositTitle": "Acconto"});
Object.assign(TRANSLATIONS["pt"], {"bookingConfirmed": "Marcação confirmada: {date} · {time}.", "requestSaved": "Pedido guardado neste dispositivo. A aguardar confirmação da Ana.", "paymentSaved": "Pedido guardado. Pagamento pendente: {amount} €. Referência: {reference}.", "selectOneService": "Selecione pelo menos um serviço.", "fullTimeRequired": "Escolha uma hora disponível para a duração total da marcação.", "salonClosed": "O salão está fechado nesta data.", "requiredVariant": "Escolha uma variante para: {service}.", "registerRequest": "Registar pedido pendente", "registerPayment": "Registar pedido com pagamento pendente", "backAction": "Voltar", "depositTitle": "Pagamento antecipado"});
Object.assign(TRANSLATIONS["de"], {"bookingConfirmed": "Termin bestätigt: {date} · {time}.", "requestSaved": "Anfrage auf diesem Gerät gespeichert. Bestätigung durch Ana steht aus.", "paymentSaved": "Anfrage gespeichert. Zahlung ausstehend: {amount} €. Referenz: {reference}.", "selectOneService": "Wählen Sie mindestens eine Leistung.", "fullTimeRequired": "Wählen Sie eine verfügbare Zeit für den gesamten Termin.", "salonClosed": "Der Salon ist an diesem Datum geschlossen.", "requiredVariant": "Wählen Sie eine Variante für: {service}.", "registerRequest": "Terminanfrage speichern", "registerPayment": "Anfrage mit ausstehender Zahlung speichern", "backAction": "Zurück", "depositTitle": "Anzahlung"});
Object.assign(TRANSLATIONS["nl"], {"bookingConfirmed": "Afspraak bevestigd: {date} · {time}.", "requestSaved": "Aanvraag opgeslagen op dit apparaat. Wacht op bevestiging van Ana.", "paymentSaved": "Aanvraag opgeslagen. Betaling in afwachting: {amount} €. Referentie: {reference}.", "selectOneService": "Selecteer minstens één dienst.", "fullTimeRequired": "Kies een beschikbare tijd voor je volledige afspraak.", "salonClosed": "De salon is gesloten op deze datum.", "requiredVariant": "Kies een variant voor: {service}.", "registerRequest": "Afspraakaanvraag opslaan", "registerPayment": "Aanvraag met openstaande betaling opslaan", "backAction": "Terug", "depositTitle": "Aanbetaling"});
Object.assign(TRANSLATIONS["pl"], {"bookingConfirmed": "Wizyta potwierdzona: {date} · {time}.", "requestSaved": "Prośba zapisana na tym urządzeniu. Oczekuje na potwierdzenie Any.", "paymentSaved": "Prośba zapisana. Płatność oczekująca: {amount} €. Kod: {reference}.", "selectOneService": "Wybierz co najmniej jedną usługę.", "fullTimeRequired": "Wybierz godzinę dostępną na całą wizytę.", "salonClosed": "Salon jest zamknięty w tym dniu.", "requiredVariant": "Wybierz wariant usługi: {service}.", "registerRequest": "Zapisz prośbę o wizytę", "registerPayment": "Zapisz prośbę oczekującą na płatność", "backAction": "Wróć", "depositTitle": "Zaliczka"});
Object.assign(TRANSLATIONS["cs"], {"bookingConfirmed": "Návštěva potvrzena: {date} · {time}.", "requestSaved": "Žádost uložena v tomto zařízení. Čeká na potvrzení od Any.", "paymentSaved": "Žádost uložena. Platba čeká: {amount} €. Kód: {reference}.", "selectOneService": "Vyberte alespoň jednu službu.", "fullTimeRequired": "Vyberte dostupný čas pro celou návštěvu.", "salonClosed": "Salon je v tento den zavřený.", "requiredVariant": "Vyberte variantu pro: {service}.", "registerRequest": "Uložit žádost o termín", "registerPayment": "Uložit žádost čekající na platbu", "backAction": "Zpět", "depositTitle": "Záloha"});
Object.assign(TRANSLATIONS["nb"], {"bookingConfirmed": "Avtale bekreftet: {date} · {time}.", "requestSaved": "Forespørsel lagret på denne enheten. Venter på bekreftelse fra Ana.", "paymentSaved": "Forespørsel lagret. Betaling venter: {amount} €. Referanse: {reference}.", "selectOneService": "Velg minst én tjeneste.", "fullTimeRequired": "Velg en ledig tid for hele avtalen.", "salonClosed": "Salongen er stengt denne datoen.", "requiredVariant": "Velg et alternativ for: {service}.", "registerRequest": "Lagre forespørsel", "registerPayment": "Lagre forespørsel med ventende betaling", "backAction": "Tilbake", "depositTitle": "Forskuddsbetaling"});
Object.assign(TRANSLATIONS["sv"], {"bookingConfirmed": "Besök bekräftat: {date} · {time}.", "requestSaved": "Förfrågan sparad på denna enhet. Väntar på bekräftelse från Ana.", "paymentSaved": "Förfrågan sparad. Betalning väntar: {amount} €. Referens: {reference}.", "selectOneService": "Välj minst en tjänst.", "fullTimeRequired": "Välj en ledig tid för hela besöket.", "salonClosed": "Salongen är stängd detta datum.", "requiredVariant": "Välj ett alternativ för: {service}.", "registerRequest": "Spara förfrågan", "registerPayment": "Spara förfrågan med väntande betalning", "backAction": "Tillbaka", "depositTitle": "Förskottsbetalning"});
Object.assign(TRANSLATIONS["ar"], {"bookingConfirmed": "تم تأكيد الموعد: {date} · {time}.", "requestSaved": "تم حفظ الطلب على هذا الجهاز. بانتظار تأكيد آنا.", "paymentSaved": "تم حفظ الطلب. الدفع قيد الانتظار: {amount} €. الرمز: {reference}.", "selectOneService": "اختاري خدمة واحدة على الأقل.", "fullTimeRequired": "اختاري وقتًا متاحًا لكامل موعدك.", "salonClosed": "الصالون مغلق في هذا التاريخ.", "requiredVariant": "اختاري نوع الخدمة: {service}.", "registerRequest": "تسجيل طلب الموعد", "registerPayment": "تسجيل الطلب بانتظار الدفع", "backAction": "رجوع", "depositTitle": "دفعة مقدّمة"});


// Review and payment explanations
Object.assign(TRANSLATIONS["es"], {"reviewTitle": "Solicitud bajo confirmación previa", "reviewExplanation": "Ana revisará los servicios, la viabilidad del trabajo y la disponibilidad. Puede solicitar un diagnóstico o test de mechón. La solicitud no confirma la cita.", "reviewDeposit": "Si Ana acepta, se solicitará una reserva anticipada de {amount}. Espera su aprobación antes de pagar.", "localRequestNotice": "La solicitud se guarda en este dispositivo. El envío a distancia todavía no está conectado.", "bizumExplanation": "Tu cita supera los {minutes} minutos. Realiza un Bizum de {amount} € al {phone}; la reserva se confirmará tras comprobar el pago.", "paymentConceptHelp": "Indica tu nombre y apellidos y utiliza este concepto:", "paymentPendingExplanation": "La solicitud queda pendiente hasta que comprobemos la recepción del pago.", "copyConcept": "Copiar concepto", "copiedConcept": "Concepto copiado.", "copyFailed": "No se pudo copiar. Selecciona y copia el concepto mostrado."});
Object.assign(TRANSLATIONS["en"], {"reviewTitle": "Appointment request awaiting approval", "reviewExplanation": "Ana will review the services, technical feasibility and availability. She may request a consultation or strand test. This request does not confirm your appointment.", "reviewDeposit": "If Ana accepts, an advance payment of {amount} will be required. Wait for approval before paying.", "localRequestNotice": "The request is saved on this device. Remote submission is not connected yet.", "bizumExplanation": "Your appointment exceeds {minutes} minutes. Send {amount} € via Bizum to {phone}; the booking will be confirmed after payment is checked.", "paymentConceptHelp": "Enter your full name and use this payment reference:", "paymentPendingExplanation": "The request remains pending until we verify receipt of payment.", "copyConcept": "Copy payment reference", "copiedConcept": "Reference copied.", "copyFailed": "Could not copy. Select and copy the displayed reference."});
Object.assign(TRANSLATIONS["fr"], {"reviewTitle": "Demande soumise à confirmation", "reviewExplanation": "Ana vérifiera les services, la faisabilité et les disponibilités. Un diagnostic ou un test de mèche peut être demandé. Cette demande ne confirme pas le rendez-vous.", "reviewDeposit": "Si Ana accepte, un acompte de {amount} sera demandé. Attendez son accord avant de payer.", "localRequestNotice": "La demande est enregistrée sur cet appareil. L’envoi à distance n’est pas encore connecté.", "bizumExplanation": "Votre rendez-vous dépasse {minutes} minutes. Envoyez {amount} € par Bizum au {phone}. La réservation sera confirmée après vérification du paiement.", "paymentConceptHelp": "Indiquez votre nom complet et utilisez ce motif de paiement :", "paymentPendingExplanation": "La demande reste en attente jusqu’à vérification du paiement.", "copyConcept": "Copier le motif", "copiedConcept": "Motif copié.", "copyFailed": "Copie impossible. Sélectionnez et copiez le motif affiché."});
Object.assign(TRANSLATIONS["it"], {"reviewTitle": "Richiesta soggetta a conferma", "reviewExplanation": "Ana valuterà i servizi, la fattibilità e la disponibilità. Potrebbe richiedere una consulenza o un test su una ciocca. La richiesta non conferma l’appuntamento.", "reviewDeposit": "Se Ana accetta, sarà richiesto un acconto di {amount}. Attendi la conferma prima di pagare.", "localRequestNotice": "La richiesta è salvata su questo dispositivo. L’invio a distanza non è ancora collegato.", "bizumExplanation": "L’appuntamento supera {minutes} minuti. Invia {amount} € con Bizum al {phone}. La prenotazione sarà confermata dopo la verifica del pagamento.", "paymentConceptHelp": "Indica nome e cognome e usa questa causale:", "paymentPendingExplanation": "La richiesta resta in attesa fino alla verifica del pagamento.", "copyConcept": "Copia causale", "copiedConcept": "Causale copiata.", "copyFailed": "Copia non riuscita. Seleziona e copia la causale mostrata."});
Object.assign(TRANSLATIONS["pt"], {"reviewTitle": "Pedido sujeito a confirmação", "reviewExplanation": "A Ana avaliará os serviços, a viabilidade e a disponibilidade. Pode pedir um diagnóstico ou teste de madeixa. O pedido não confirma a marcação.", "reviewDeposit": "Se a Ana aceitar, será pedido um pagamento antecipado de {amount}. Aguarde a aprovação antes de pagar.", "localRequestNotice": "O pedido é guardado neste dispositivo. O envio à distância ainda não está ligado.", "bizumExplanation": "A marcação supera {minutes} minutos. Envie {amount} € por Bizum para {phone}. Confirmaremos após verificar o pagamento.", "paymentConceptHelp": "Indique o nome completo e utilize esta descrição:", "paymentPendingExplanation": "O pedido fica pendente até verificarmos o pagamento.", "copyConcept": "Copiar descrição", "copiedConcept": "Descrição copiada.", "copyFailed": "Não foi possível copiar. Selecione e copie a descrição apresentada."});
Object.assign(TRANSLATIONS["de"], {"reviewTitle": "Terminanfrage unter Vorbehalt", "reviewExplanation": "Ana prüft die Leistungen, die technische Machbarkeit und die Verfügbarkeit. Eine Beratung oder ein Strähnentest kann nötig sein. Die Anfrage bestätigt keinen Termin.", "reviewDeposit": "Wenn Ana zustimmt, ist eine Anzahlung von {amount} erforderlich. Warten Sie vor der Zahlung auf die Zustimmung.", "localRequestNotice": "Die Anfrage wird auf diesem Gerät gespeichert. Die Fernübermittlung ist noch nicht verbunden.", "bizumExplanation": "Ihr Termin dauert länger als {minutes} Minuten. Senden Sie {amount} € per Bizum an {phone}. Nach Zahlungsprüfung bestätigen wir die Buchung.", "paymentConceptHelp": "Geben Sie Ihren vollständigen Namen und diesen Verwendungszweck an:", "paymentPendingExplanation": "Die Anfrage bleibt bis zur Prüfung des Zahlungseingangs offen.", "copyConcept": "Verwendungszweck kopieren", "copiedConcept": "Verwendungszweck kopiert.", "copyFailed": "Kopieren fehlgeschlagen. Markieren und kopieren Sie den angezeigten Text."});
Object.assign(TRANSLATIONS["nl"], {"reviewTitle": "Afspraakaanvraag onder voorbehoud", "reviewExplanation": "Ana beoordeelt de diensten, haalbaarheid en beschikbaarheid. Een consult of pluktest kan nodig zijn. De aanvraag bevestigt geen afspraak.", "reviewDeposit": "Als Ana akkoord gaat, is een aanbetaling van {amount} nodig. Wacht op goedkeuring voordat je betaalt.", "localRequestNotice": "De aanvraag wordt op dit apparaat opgeslagen. Verzenden op afstand is nog niet aangesloten.", "bizumExplanation": "Je afspraak duurt langer dan {minutes} minuten. Stuur {amount} € via Bizum naar {phone}. We bevestigen na controle van de betaling.", "paymentConceptHelp": "Vermeld je volledige naam en gebruik deze omschrijving:", "paymentPendingExplanation": "De aanvraag blijft in afwachting tot we de betaling controleren.", "copyConcept": "Omschrijving kopiëren", "copiedConcept": "Omschrijving gekopieerd.", "copyFailed": "Kopiëren mislukt. Selecteer en kopieer de getoonde omschrijving."});
Object.assign(TRANSLATIONS["pl"], {"reviewTitle": "Prośba wymaga potwierdzenia", "reviewExplanation": "Ana oceni usługi, wykonalność i dostępność. Może poprosić o konsultację lub test pasma. Prośba nie potwierdza wizyty.", "reviewDeposit": "Po akceptacji Any wymagana będzie zaliczka {amount}. Poczekaj na akceptację przed płatnością.", "localRequestNotice": "Prośba jest zapisywana na tym urządzeniu. Wysyłanie zdalne nie jest jeszcze podłączone.", "bizumExplanation": "Wizyta trwa ponad {minutes} minut. Wyślij {amount} € przez Bizum na {phone}. Potwierdzimy po sprawdzeniu płatności.", "paymentConceptHelp": "Podaj imię i nazwisko oraz ten tytuł płatności:", "paymentPendingExplanation": "Prośba oczekuje do czasu potwierdzenia otrzymania płatności.", "copyConcept": "Kopiuj tytuł płatności", "copiedConcept": "Tytuł skopiowany.", "copyFailed": "Nie udało się skopiować. Zaznacz i skopiuj wyświetlony tytuł."});
Object.assign(TRANSLATIONS["cs"], {"reviewTitle": "Žádost vyžaduje potvrzení", "reviewExplanation": "Ana posoudí služby, proveditelnost a dostupnost. Může požádat o konzultaci nebo test pramene. Žádost nepotvrzuje návštěvu.", "reviewDeposit": "Pokud Ana souhlasí, bude vyžadována záloha {amount}. Před platbou vyčkejte na souhlas.", "localRequestNotice": "Žádost se ukládá v tomto zařízení. Vzdálené odesílání ještě není připojeno.", "bizumExplanation": "Návštěva přesahuje {minutes} minut. Pošlete {amount} € přes Bizum na {phone}. Rezervaci potvrdíme po ověření platby.", "paymentConceptHelp": "Uveďte celé jméno a tento účel platby:", "paymentPendingExplanation": "Žádost čeká do ověření přijetí platby.", "copyConcept": "Kopírovat účel platby", "copiedConcept": "Účel platby zkopírován.", "copyFailed": "Kopírování selhalo. Označte a zkopírujte zobrazený text."});
Object.assign(TRANSLATIONS["nb"], {"reviewTitle": "Forespørsel krever godkjenning", "reviewExplanation": "Ana vurderer tjenestene, gjennomførbarheten og tilgjengeligheten. Hun kan be om konsultasjon eller en test på en hårlokk. Forespørselen bekrefter ikke avtalen.", "reviewDeposit": "Hvis Ana godtar, kreves en forskuddsbetaling på {amount}. Vent på godkjenning før du betaler.", "localRequestNotice": "Forespørselen lagres på denne enheten. Fjerninnsending er ikke tilkoblet ennå.", "bizumExplanation": "Avtalen varer over {minutes} minutter. Send {amount} € via Bizum til {phone}. Vi bekrefter etter betalingskontroll.", "paymentConceptHelp": "Oppgi fullt navn og bruk denne betalingsreferansen:", "paymentPendingExplanation": "Forespørselen venter til vi har kontrollert betalingen.", "copyConcept": "Kopier referanse", "copiedConcept": "Referanse kopiert.", "copyFailed": "Kunne ikke kopiere. Marker og kopier referansen som vises."});
Object.assign(TRANSLATIONS["sv"], {"reviewTitle": "Förfrågan kräver godkännande", "reviewExplanation": "Ana bedömer tjänsterna, genomförbarheten och tillgängligheten. Hon kan be om konsultation eller ett test på en hårslinga. Förfrågan bekräftar inte besöket.", "reviewDeposit": "Om Ana godkänner krävs en förskottsbetalning på {amount}. Vänta på godkännande innan du betalar.", "localRequestNotice": "Förfrågan sparas på denna enhet. Fjärröverföring är ännu inte ansluten.", "bizumExplanation": "Besöket överstiger {minutes} minuter. Skicka {amount} € via Bizum till {phone}. Vi bekräftar efter kontroll av betalningen.", "paymentConceptHelp": "Ange ditt fullständiga namn och använd denna betalningsreferens:", "paymentPendingExplanation": "Förfrågan väntar tills vi har kontrollerat betalningen.", "copyConcept": "Kopiera referens", "copiedConcept": "Referens kopierad.", "copyFailed": "Kunde inte kopiera. Markera och kopiera referensen som visas."});
Object.assign(TRANSLATIONS["ar"], {"reviewTitle": "طلب موعد بانتظار الموافقة", "reviewExplanation": "ستراجع آنا الخدمات وإمكانية تنفيذها والأوقات المتاحة. قد تطلب استشارة أو اختبار خصلة. هذا الطلب لا يؤكد الموعد.", "reviewDeposit": "إذا وافقت آنا، ستُطلب دفعة مقدّمة بقيمة {amount}. انتظري الموافقة قبل الدفع.", "localRequestNotice": "يُحفظ الطلب على هذا الجهاز. الإرسال عن بُعد غير متصل بعد.", "bizumExplanation": "مدة موعدك تتجاوز {minutes} دقيقة. أرسلي {amount} € عبر Bizum إلى {phone}. سنؤكد الحجز بعد التحقق من الدفع.", "paymentConceptHelp": "اكتبي اسمك الكامل واستخدمي مرجع الدفع التالي:", "paymentPendingExplanation": "يبقى الطلب معلّقًا حتى نتحقق من استلام الدفع.", "copyConcept": "نسخ مرجع الدفع", "copiedConcept": "تم نسخ المرجع.", "copyFailed": "تعذّر النسخ. حدّدي المرجع المعروض وانسخيه."});


// Portal, passport and catalogue labels
Object.assign(TRANSLATIONS["es"], {"hello": "Hola", "welcome": "bienvenida", "myDetails": "Mis datos", "nextVisit": "Tu próxima visita", "changeDate": "Modificar fecha u hora", "askAppointment": "Consultar mi cita", "guidance": "Te orientamos", "callStudio": "Llamar al Studio", "studioHours": "Horarios del Studio", "directions": "Cómo llegar", "passportTitle": "Mi pasaporte capilar", "hairDna": "Tu ADN capilar", "homeRitual": "Tu ritual en casa", "visitHistory": "Historial de visitas", "recommendedVisit": "Próxima visita recomendada", "pendingRecommendation": "Pendiente de recomendación", "bookNext": "Reservar mi próxima visita", "closeDetails": "Cerrar detalles", "viewIncludes": "Ver qué incluye", "choosePack": "Elige tu largo o pack", "remove": "Quitar", "descriptionLabel": "Descripción", "includesLabel": "Qué incluye", "resultsLabel": "¿Qué te llevas?"});
Object.assign(TRANSLATIONS["en"], {"hello": "Hello", "welcome": "welcome", "myDetails": "My details", "nextVisit": "Your next visit", "changeDate": "Change date or time", "askAppointment": "Ask about my appointment", "guidance": "We can help", "callStudio": "Call the Studio", "studioHours": "Studio opening hours", "directions": "Directions", "passportTitle": "My hair passport", "hairDna": "Your hair DNA", "homeRitual": "Your home routine", "visitHistory": "Visit history", "recommendedVisit": "Recommended next visit", "pendingRecommendation": "Awaiting recommendation", "bookNext": "Book my next visit", "closeDetails": "Close details", "viewIncludes": "See what is included", "choosePack": "Choose your length or package", "remove": "Remove", "descriptionLabel": "Description", "includesLabel": "What is included", "resultsLabel": "Your results"});
Object.assign(TRANSLATIONS["fr"], {"hello": "Bonjour", "welcome": "bienvenue", "myDetails": "Mes informations", "nextVisit": "Votre prochaine visite", "changeDate": "Modifier la date ou l’heure", "askAppointment": "Question sur mon rendez-vous", "guidance": "Nous vous conseillons", "callStudio": "Appeler le Studio", "studioHours": "Horaires du Studio", "directions": "Itinéraire", "passportTitle": "Mon passeport capillaire", "hairDna": "Votre ADN capillaire", "homeRitual": "Votre rituel à la maison", "visitHistory": "Historique des visites", "recommendedVisit": "Prochaine visite recommandée", "pendingRecommendation": "En attente de recommandation", "bookNext": "Réserver ma prochaine visite", "closeDetails": "Fermer les détails", "viewIncludes": "Voir ce qui est inclus", "choosePack": "Choisissez votre longueur ou forfait", "remove": "Retirer", "descriptionLabel": "Description", "includesLabel": "Ce qui est inclus", "resultsLabel": "Les résultats"});
Object.assign(TRANSLATIONS["it"], {"hello": "Ciao", "welcome": "benvenuta", "myDetails": "I miei dati", "nextVisit": "La tua prossima visita", "changeDate": "Modifica data o ora", "askAppointment": "Informazioni sul mio appuntamento", "guidance": "Ti aiutiamo a scegliere", "callStudio": "Chiama lo Studio", "studioHours": "Orari dello Studio", "directions": "Come arrivare", "passportTitle": "Il mio passaporto capelli", "hairDna": "Il tuo DNA dei capelli", "homeRitual": "Il tuo rituale a casa", "visitHistory": "Storico delle visite", "recommendedVisit": "Prossima visita consigliata", "pendingRecommendation": "In attesa di consiglio", "bookNext": "Prenota la prossima visita", "closeDetails": "Chiudi dettagli", "viewIncludes": "Scopri cosa include", "choosePack": "Scegli lunghezza o pacchetto", "remove": "Rimuovi", "descriptionLabel": "Descrizione", "includesLabel": "Cosa include", "resultsLabel": "Risultati"});
Object.assign(TRANSLATIONS["pt"], {"hello": "Olá", "welcome": "bem-vinda", "myDetails": "Os meus dados", "nextVisit": "A sua próxima visita", "changeDate": "Alterar data ou hora", "askAppointment": "Consultar a minha marcação", "guidance": "Ajudamos a escolher", "callStudio": "Ligar ao Studio", "studioHours": "Horários do Studio", "directions": "Como chegar", "passportTitle": "O meu passaporte capilar", "hairDna": "O seu ADN capilar", "homeRitual": "O seu ritual em casa", "visitHistory": "Histórico de visitas", "recommendedVisit": "Próxima visita recomendada", "pendingRecommendation": "A aguardar recomendação", "bookNext": "Reservar a próxima visita", "closeDetails": "Fechar detalhes", "viewIncludes": "Ver o que inclui", "choosePack": "Escolha o comprimento ou pack", "remove": "Remover", "descriptionLabel": "Descrição", "includesLabel": "O que inclui", "resultsLabel": "Resultados"});
Object.assign(TRANSLATIONS["de"], {"hello": "Hallo", "welcome": "willkommen", "myDetails": "Meine Daten", "nextVisit": "Ihr nächster Besuch", "changeDate": "Datum oder Uhrzeit ändern", "askAppointment": "Frage zu meinem Termin", "guidance": "Wir beraten Sie", "callStudio": "Studio anrufen", "studioHours": "Öffnungszeiten", "directions": "Anfahrt", "passportTitle": "Mein Haarpass", "hairDna": "Ihre Haar-DNA", "homeRitual": "Ihre Pflege zu Hause", "visitHistory": "Besuchsverlauf", "recommendedVisit": "Empfohlener nächster Besuch", "pendingRecommendation": "Empfehlung steht aus", "bookNext": "Nächsten Besuch buchen", "closeDetails": "Details schließen", "viewIncludes": "Enthaltene Leistungen ansehen", "choosePack": "Länge oder Paket wählen", "remove": "Entfernen", "descriptionLabel": "Beschreibung", "includesLabel": "Enthaltene Leistungen", "resultsLabel": "Ergebnis"});
Object.assign(TRANSLATIONS["nl"], {"hello": "Hallo", "welcome": "welkom", "myDetails": "Mijn gegevens", "nextVisit": "Je volgende bezoek", "changeDate": "Datum of tijd wijzigen", "askAppointment": "Vraag over mijn afspraak", "guidance": "We helpen je kiezen", "callStudio": "Bel de Studio", "studioHours": "Openingstijden", "directions": "Route", "passportTitle": "Mijn haarpaspoort", "hairDna": "Jouw haar-DNA", "homeRitual": "Jouw verzorging thuis", "visitHistory": "Bezoekgeschiedenis", "recommendedVisit": "Aanbevolen volgend bezoek", "pendingRecommendation": "Wacht op advies", "bookNext": "Mijn volgende bezoek boeken", "closeDetails": "Details sluiten", "viewIncludes": "Bekijk wat inbegrepen is", "choosePack": "Kies je lengte of pakket", "remove": "Verwijderen", "descriptionLabel": "Beschrijving", "includesLabel": "Wat inbegrepen is", "resultsLabel": "Resultaten"});
Object.assign(TRANSLATIONS["pl"], {"hello": "Witaj", "welcome": "witamy", "myDetails": "Moje dane", "nextVisit": "Twoja następna wizyta", "changeDate": "Zmień datę lub godzinę", "askAppointment": "Zapytaj o wizytę", "guidance": "Pomożemy Ci wybrać", "callStudio": "Zadzwoń do Studio", "studioHours": "Godziny otwarcia", "directions": "Jak dojechać", "passportTitle": "Mój paszport włosów", "hairDna": "DNA Twoich włosów", "homeRitual": "Twoja pielęgnacja w domu", "visitHistory": "Historia wizyt", "recommendedVisit": "Zalecana następna wizyta", "pendingRecommendation": "Oczekuje na zalecenie", "bookNext": "Zarezerwuj następną wizytę", "closeDetails": "Zamknij szczegóły", "viewIncludes": "Zobacz, co obejmuje", "choosePack": "Wybierz długość lub pakiet", "remove": "Usuń", "descriptionLabel": "Opis", "includesLabel": "Co obejmuje", "resultsLabel": "Rezultaty"});
Object.assign(TRANSLATIONS["cs"], {"hello": "Dobrý den", "welcome": "vítejte", "myDetails": "Moje údaje", "nextVisit": "Vaše příští návštěva", "changeDate": "Změnit datum nebo čas", "askAppointment": "Dotaz k mé návštěvě", "guidance": "Pomůžeme vám vybrat", "callStudio": "Zavolat do Studia", "studioHours": "Otevírací doba", "directions": "Jak se k nám dostat", "passportTitle": "Můj vlasový pas", "hairDna": "DNA vašich vlasů", "homeRitual": "Vaše domácí péče", "visitHistory": "Historie návštěv", "recommendedVisit": "Doporučená příští návštěva", "pendingRecommendation": "Čeká na doporučení", "bookNext": "Rezervovat příští návštěvu", "closeDetails": "Zavřít podrobnosti", "viewIncludes": "Zobrazit obsah služby", "choosePack": "Vyberte délku nebo balíček", "remove": "Odebrat", "descriptionLabel": "Popis", "includesLabel": "Co je zahrnuto", "resultsLabel": "Výsledky"});
Object.assign(TRANSLATIONS["nb"], {"hello": "Hei", "welcome": "velkommen", "myDetails": "Mine opplysninger", "nextVisit": "Ditt neste besøk", "changeDate": "Endre dato eller tid", "askAppointment": "Spør om avtalen min", "guidance": "Vi hjelper deg å velge", "callStudio": "Ring Studio", "studioHours": "Åpningstider", "directions": "Veibeskrivelse", "passportTitle": "Mitt hårpass", "hairDna": "Ditt hår-DNA", "homeRitual": "Din hjemmepleie", "visitHistory": "Besøkshistorikk", "recommendedVisit": "Anbefalt neste besøk", "pendingRecommendation": "Venter på anbefaling", "bookNext": "Bestill neste besøk", "closeDetails": "Lukk detaljer", "viewIncludes": "Se hva som er inkludert", "choosePack": "Velg lengde eller pakke", "remove": "Fjern", "descriptionLabel": "Beskrivelse", "includesLabel": "Hva som er inkludert", "resultsLabel": "Resultater"});
Object.assign(TRANSLATIONS["sv"], {"hello": "Hej", "welcome": "välkommen", "myDetails": "Mina uppgifter", "nextVisit": "Ditt nästa besök", "changeDate": "Ändra datum eller tid", "askAppointment": "Fråga om mitt besök", "guidance": "Vi hjälper dig att välja", "callStudio": "Ring Studio", "studioHours": "Öppettider", "directions": "Hitta hit", "passportTitle": "Mitt hårpass", "hairDna": "Ditt hår-DNA", "homeRitual": "Din vård hemma", "visitHistory": "Besökshistorik", "recommendedVisit": "Rekommenderat nästa besök", "pendingRecommendation": "Väntar på rekommendation", "bookNext": "Boka nästa besök", "closeDetails": "Stäng detaljer", "viewIncludes": "Se vad som ingår", "choosePack": "Välj längd eller paket", "remove": "Ta bort", "descriptionLabel": "Beskrivning", "includesLabel": "Vad som ingår", "resultsLabel": "Resultat"});
Object.assign(TRANSLATIONS["ar"], {"hello": "مرحبًا", "welcome": "أهلًا بك", "myDetails": "بياناتي", "nextVisit": "زيارتك القادمة", "changeDate": "تعديل التاريخ أو الوقت", "askAppointment": "الاستفسار عن موعدي", "guidance": "نساعدك على الاختيار", "callStudio": "الاتصال بالصالون", "studioHours": "ساعات العمل", "directions": "كيفية الوصول", "passportTitle": "ملف شعري", "hairDna": "هوية شعرك", "homeRitual": "روتين العناية في المنزل", "visitHistory": "سجل الزيارات", "recommendedVisit": "الزيارة القادمة الموصى بها", "pendingRecommendation": "بانتظار التوصية", "bookNext": "حجز زيارتي القادمة", "closeDetails": "إغلاق التفاصيل", "viewIncludes": "عرض ما تشمله الخدمة", "choosePack": "اختاري طول الشعر أو الباقة", "remove": "إزالة", "descriptionLabel": "الوصف", "includesLabel": "ما تشمله الخدمة", "resultsLabel": "النتائج"});


// Portal explanations and empty passport states
Object.assign(TRANSLATIONS["es"], {"careIntro": "Tu estilo, nuestra inspiración. Descubre experiencias de cuidado creadas para realzar lo que te hace única.", "experienceStart": "Tu próxima experiencia empieza aquí.", "noUpcoming": "Aún no tienes una cita próxima. Descubre nuestros servicios y encuentra el cuidado que necesita tu cabello.", "passportIntro": "Aquí encontrarás tu diagnóstico, tus cuidados y la evolución de tu cabello.", "emptyDna": "En tu próxima visita, Ana podrá registrar aquí el diagnóstico de tu cabello.", "emptyCare": "Ana añadirá aquí los productos y las pautas de cuidado recomendados para ti.", "emptyVisits": "Tu historia en el Studio empieza aquí. Cuando registremos tu primera visita, aparecerá en este apartado.", "maintenanceNote": "Es una recomendación de mantenimiento. Para reservar, elige tus servicios y una hora disponible."});
Object.assign(TRANSLATIONS["en"], {"careIntro": "Your space for hair care. Every visit designed for you.", "experienceStart": "Your next experience starts here.", "noUpcoming": "You have no upcoming appointment. Explore our services and find the care your hair needs.", "passportIntro": "Here you can find your assessment, care recommendations and hair progress.", "emptyDna": "At your next visit, Ana can record your hair assessment here.", "emptyCare": "Ana will add your recommended products and care routine here.", "emptyVisits": "Your Studio story starts here. Your first recorded visit will appear in this section.", "maintenanceNote": "This is a maintenance recommendation. To book, choose your services and an available time."});
Object.assign(TRANSLATIONS["fr"], {"careIntro": "Votre espace de soin capillaire. Chaque visite pensée pour vous.", "experienceStart": "Votre prochaine expérience commence ici.", "noUpcoming": "Vous n’avez pas de rendez-vous à venir. Découvrez nos services et les soins adaptés à vos cheveux.", "passportIntro": "Retrouvez ici votre diagnostic, vos soins et l’évolution de vos cheveux.", "emptyDna": "Lors de votre prochaine visite, Ana pourra enregistrer votre diagnostic ici.", "emptyCare": "Ana ajoutera ici les produits et conseils de soin recommandés pour vous.", "emptyVisits": "Votre histoire au Studio commence ici. Votre première visite enregistrée apparaîtra dans cette rubrique.", "maintenanceNote": "Il s’agit d’un conseil d’entretien. Pour réserver, choisissez vos services et un créneau disponible."});
Object.assign(TRANSLATIONS["it"], {"careIntro": "Il tuo spazio per la cura dei capelli. Ogni visita pensata per te.", "experienceStart": "La tua prossima esperienza inizia qui.", "noUpcoming": "Non hai appuntamenti in programma. Scopri i servizi e la cura adatta ai tuoi capelli.", "passportIntro": "Qui trovi la valutazione, i consigli di cura e l’evoluzione dei tuoi capelli.", "emptyDna": "Alla prossima visita, Ana potrà registrare qui la valutazione dei tuoi capelli.", "emptyCare": "Ana aggiungerà qui prodotti e consigli di cura personalizzati.", "emptyVisits": "La tua storia nello Studio inizia qui. La prima visita registrata apparirà in questa sezione.", "maintenanceNote": "È un consiglio di mantenimento. Per prenotare, scegli servizi e un orario disponibile."});
Object.assign(TRANSLATIONS["pt"], {"careIntro": "O seu espaço de cuidado capilar. Cada visita pensada para si.", "experienceStart": "A sua próxima experiência começa aqui.", "noUpcoming": "Ainda não tem uma marcação próxima. Descubra os serviços e o cuidado de que o seu cabelo precisa.", "passportIntro": "Aqui encontra o diagnóstico, os cuidados e a evolução do seu cabelo.", "emptyDna": "Na próxima visita, a Ana poderá registar aqui o diagnóstico do seu cabelo.", "emptyCare": "A Ana adicionará aqui os produtos e cuidados recomendados para si.", "emptyVisits": "A sua história no Studio começa aqui. A primeira visita registada aparecerá nesta secção.", "maintenanceNote": "É uma recomendação de manutenção. Para reservar, escolha serviços e uma hora disponível."});
Object.assign(TRANSLATIONS["de"], {"careIntro": "Ihr Bereich für Haarpflege. Jeder Besuch auf Sie abgestimmt.", "experienceStart": "Ihr nächstes Erlebnis beginnt hier.", "noUpcoming": "Sie haben keinen bevorstehenden Termin. Entdecken Sie unsere Leistungen und die passende Pflege für Ihr Haar.", "passportIntro": "Hier finden Sie Ihre Haaranalyse, Pflegeempfehlungen und die Entwicklung Ihres Haars.", "emptyDna": "Bei Ihrem nächsten Besuch kann Ana hier Ihre Haaranalyse erfassen.", "emptyCare": "Ana ergänzt hier die für Sie empfohlenen Produkte und Pflegetipps.", "emptyVisits": "Ihre Geschichte im Studio beginnt hier. Ihr erster erfasster Besuch erscheint in diesem Bereich.", "maintenanceNote": "Dies ist eine Pflegeempfehlung. Wählen Sie für eine Buchung Ihre Leistungen und eine verfügbare Zeit."});
Object.assign(TRANSLATIONS["nl"], {"careIntro": "Jouw plek voor haarverzorging. Elk bezoek afgestemd op jou.", "experienceStart": "Je volgende ervaring begint hier.", "noUpcoming": "Je hebt geen komende afspraak. Ontdek onze diensten en de verzorging die je haar nodig heeft.", "passportIntro": "Hier vind je je haaranalyse, verzorgingsadvies en de ontwikkeling van je haar.", "emptyDna": "Bij je volgende bezoek kan Ana hier je haaranalyse vastleggen.", "emptyCare": "Ana voegt hier de aanbevolen producten en verzorgingstips toe.", "emptyVisits": "Je verhaal bij de Studio begint hier. Je eerste geregistreerde bezoek verschijnt in dit onderdeel.", "maintenanceNote": "Dit is een onderhoudsadvies. Kies je diensten en een beschikbare tijd om te boeken."});
Object.assign(TRANSLATIONS["pl"], {"careIntro": "Twoja przestrzeń pielęgnacji włosów. Każda wizyta dopasowana do Ciebie.", "experienceStart": "Twoje następne doświadczenie zaczyna się tutaj.", "noUpcoming": "Nie masz nadchodzącej wizyty. Poznaj nasze usługi i pielęgnację odpowiednią dla Twoich włosów.", "passportIntro": "Tutaj znajdziesz diagnozę, zalecenia pielęgnacyjne i postępy Twoich włosów.", "emptyDna": "Podczas następnej wizyty Ana może zapisać tutaj diagnozę Twoich włosów.", "emptyCare": "Ana doda tutaj zalecane produkty i wskazówki pielęgnacyjne.", "emptyVisits": "Twoja historia w Studio zaczyna się tutaj. Pierwsza zapisana wizyta pojawi się w tej sekcji.", "maintenanceNote": "To zalecenie dotyczące pielęgnacji. Aby zarezerwować, wybierz usługi i dostępną godzinę."});
Object.assign(TRANSLATIONS["cs"], {"careIntro": "Váš prostor pro péči o vlasy. Každá návštěva přizpůsobená vám.", "experienceStart": "Váš příští zážitek začíná tady.", "noUpcoming": "Nemáte nadcházející návštěvu. Objevte naše služby a péči, kterou vaše vlasy potřebují.", "passportIntro": "Zde najdete diagnostiku, doporučenou péči a vývoj svých vlasů.", "emptyDna": "Při příští návštěvě může Ana zaznamenat diagnostiku vašich vlasů zde.", "emptyCare": "Ana zde doplní doporučené produkty a postupy péče.", "emptyVisits": "Váš příběh ve Studiu začíná zde. První zaznamenaná návštěva se objeví v této části.", "maintenanceNote": "Jde o doporučení péče. Pro rezervaci vyberte služby a dostupný čas."});
Object.assign(TRANSLATIONS["nb"], {"careIntro": "Ditt område for hårpleie. Hvert besøk tilpasset deg.", "experienceStart": "Din neste opplevelse starter her.", "noUpcoming": "Du har ingen kommende avtale. Utforsk tjenestene og pleien håret ditt trenger.", "passportIntro": "Her finner du hårvurderingen, pleierådene og utviklingen til håret ditt.", "emptyDna": "Ved neste besøk kan Ana registrere hårvurderingen din her.", "emptyCare": "Ana legger til anbefalte produkter og pleieråd her.", "emptyVisits": "Din historie i Studio starter her. Ditt første registrerte besøk vises i denne delen.", "maintenanceNote": "Dette er en anbefaling for vedlikehold. Velg tjenester og en ledig tid for å bestille."});
Object.assign(TRANSLATIONS["sv"], {"careIntro": "Din plats för hårvård. Varje besök anpassat för dig.", "experienceStart": "Din nästa upplevelse börjar här.", "noUpcoming": "Du har inget kommande besök. Utforska tjänsterna och vården som ditt hår behöver.", "passportIntro": "Här hittar du hårbedömningen, vårdråden och ditt hårs utveckling.", "emptyDna": "Vid nästa besök kan Ana registrera din hårbedömning här.", "emptyCare": "Ana lägger till rekommenderade produkter och vårdråd här.", "emptyVisits": "Din historia i Studio börjar här. Ditt första registrerade besök visas i denna del.", "maintenanceNote": "Detta är en rekommendation för underhåll. Välj tjänster och en ledig tid för att boka."});
Object.assign(TRANSLATIONS["ar"], {"careIntro": "مساحتك للعناية بالشعر. كل زيارة مصمّمة من أجلك.", "experienceStart": "تجربتك القادمة تبدأ هنا.", "noUpcoming": "ليس لديك موعد قادم. اكتشفي خدماتنا والعناية التي يحتاجها شعرك.", "passportIntro": "هنا تجدين تقييم شعرك وتوصيات العناية وتطوّر حالته.", "emptyDna": "في زيارتك القادمة، يمكن لآنا تسجيل تقييم شعرك هنا.", "emptyCare": "ستضيف آنا هنا المنتجات ونصائح العناية الموصى بها لك.", "emptyVisits": "تبدأ قصتك في الصالون هنا. ستظهر زيارتك الأولى في هذا القسم بعد تسجيلها.", "maintenanceNote": "هذه توصية للعناية الدورية. للحجز، اختاري الخدمات ووقتًا متاحًا."});


// Catalogue header and known category names
Object.assign(TRANSLATIONS["es"], {"experienceTitle": "Elige tu experiencia", "experienceIntro": "Explora los servicios y añade los que necesitas. Después, elige tu fecha y hora.", "servicesCount": "servicios", "exploreCategory": "Explorar +", "closeCategory": "Cerrar −", "categoryDiagnosis": "DIAGNÓSTICO & ASESORÍA", "categoryCuts": "CORTES L’STUDIO", "categoryStyling": "STYLING & ACABADO", "categoryColor": "COLOR COLLECTION L’STUDIO"});
Object.assign(TRANSLATIONS["en"], {"experienceTitle": "Choose your experience", "experienceIntro": "Explore the services and add what you need. Then choose your date and time.", "servicesCount": "services", "exploreCategory": "Explore +", "closeCategory": "Close −", "categoryDiagnosis": "DIAGNOSIS & CONSULTATION", "categoryCuts": "L’STUDIO HAIRCUTS", "categoryStyling": "STYLING & FINISH", "categoryColor": "L’STUDIO COLOR COLLECTION"});
Object.assign(TRANSLATIONS["fr"], {"experienceTitle": "Choisissez votre expérience", "experienceIntro": "Découvrez les services et ajoutez ceux dont vous avez besoin. Choisissez ensuite la date et l’heure.", "servicesCount": "services", "exploreCategory": "Explorer +", "closeCategory": "Fermer −", "categoryDiagnosis": "DIAGNOSTIC & CONSEIL", "categoryCuts": "COUPES L’STUDIO", "categoryStyling": "COIFFAGE & FINITION", "categoryColor": "COLLECTION COULEUR L’STUDIO"});
Object.assign(TRANSLATIONS["it"], {"experienceTitle": "Scegli la tua esperienza", "experienceIntro": "Scopri i servizi e aggiungi quelli che desideri. Poi scegli data e ora.", "servicesCount": "servizi", "exploreCategory": "Esplora +", "closeCategory": "Chiudi −", "categoryDiagnosis": "DIAGNOSI & CONSULENZA", "categoryCuts": "TAGLI L’STUDIO", "categoryStyling": "STYLING & FINITURA", "categoryColor": "COLLEZIONE COLORE L’STUDIO"});
Object.assign(TRANSLATIONS["pt"], {"experienceTitle": "Escolha a sua experiência", "experienceIntro": "Explore os serviços e adicione os que precisa. Depois escolha a data e a hora.", "servicesCount": "serviços", "exploreCategory": "Explorar +", "closeCategory": "Fechar −", "categoryDiagnosis": "DIAGNÓSTICO & ACONSELHAMENTO", "categoryCuts": "CORTES L’STUDIO", "categoryStyling": "PENTEADO & ACABAMENTO", "categoryColor": "COLEÇÃO DE COR L’STUDIO"});
Object.assign(TRANSLATIONS["de"], {"experienceTitle": "Wählen Sie Ihr Erlebnis", "experienceIntro": "Entdecken Sie die Leistungen und fügen Sie die gewünschten hinzu. Wählen Sie dann Datum und Uhrzeit.", "servicesCount": "Leistungen", "exploreCategory": "Entdecken +", "closeCategory": "Schließen −", "categoryDiagnosis": "HAARANALYSE & BERATUNG", "categoryCuts": "L’STUDIO HAARSCHNITTE", "categoryStyling": "STYLING & FINISH", "categoryColor": "L’STUDIO FARBKOLLEKTION"});
Object.assign(TRANSLATIONS["nl"], {"experienceTitle": "Kies je ervaring", "experienceIntro": "Ontdek de diensten en voeg toe wat je nodig hebt. Kies daarna je datum en tijd.", "servicesCount": "diensten", "exploreCategory": "Ontdekken +", "closeCategory": "Sluiten −", "categoryDiagnosis": "HAARANALYSE & ADVIES", "categoryCuts": "L’STUDIO KNIPBEHANDELINGEN", "categoryStyling": "STYLING & AFWERKING", "categoryColor": "L’STUDIO KLEURCOLLECTIE"});
Object.assign(TRANSLATIONS["pl"], {"experienceTitle": "Wybierz swoje doświadczenie", "experienceIntro": "Poznaj usługi i dodaj wybrane. Następnie wybierz datę i godzinę.", "servicesCount": "usług", "exploreCategory": "Zobacz +", "closeCategory": "Zamknij −", "categoryDiagnosis": "DIAGNOZA & KONSULTACJA", "categoryCuts": "STRZYŻENIA L’STUDIO", "categoryStyling": "STYLIZACJA & WYKOŃCZENIE", "categoryColor": "KOLEKCJA KOLORYZACJI L’STUDIO"});
Object.assign(TRANSLATIONS["cs"], {"experienceTitle": "Vyberte si svůj zážitek", "experienceIntro": "Prohlédněte si služby a přidejte vybrané. Poté zvolte datum a čas.", "servicesCount": "služeb", "exploreCategory": "Prozkoumat +", "closeCategory": "Zavřít −", "categoryDiagnosis": "DIAGNOSTIKA & PORADENSTVÍ", "categoryCuts": "STŘIHY L’STUDIO", "categoryStyling": "STYLING & FINÁLNÍ ÚPRAVA", "categoryColor": "BAREVNÁ KOLEKCE L’STUDIO"});
Object.assign(TRANSLATIONS["nb"], {"experienceTitle": "Velg din opplevelse", "experienceIntro": "Utforsk tjenestene og legg til det du trenger. Velg deretter dato og tid.", "servicesCount": "tjenester", "exploreCategory": "Utforsk +", "closeCategory": "Lukk −", "categoryDiagnosis": "HÅRANALYSE & VEILEDNING", "categoryCuts": "L’STUDIO HÅRKLIPP", "categoryStyling": "STYLING & FINISH", "categoryColor": "L’STUDIO FARGEKOLLEKSJON"});
Object.assign(TRANSLATIONS["sv"], {"experienceTitle": "Välj din upplevelse", "experienceIntro": "Utforska tjänsterna och lägg till det du behöver. Välj sedan datum och tid.", "servicesCount": "tjänster", "exploreCategory": "Utforska +", "closeCategory": "Stäng −", "categoryDiagnosis": "HÅRANALYS & RÅDGIVNING", "categoryCuts": "L’STUDIO KLIPPNINGAR", "categoryStyling": "STYLING & FINISH", "categoryColor": "L’STUDIO FÄRGKOLLEKTION"});
Object.assign(TRANSLATIONS["ar"], {"experienceTitle": "اختاري تجربتك", "experienceIntro": "اكتشفي الخدمات وأضيفي ما تحتاجينه. ثم اختاري التاريخ والوقت.", "servicesCount": "خدمات", "exploreCategory": "استكشاف +", "closeCategory": "إغلاق −", "categoryDiagnosis": "تقييم الشعر والاستشارة", "categoryCuts": "قصّات L’STUDIO", "categoryStyling": "التصفيف واللمسات النهائية", "categoryColor": "مجموعة ألوان L’STUDIO"});


// Remaining catalogue categories and history shortcut
Object.assign(TRANSLATIONS["es"], {"categoryBlond": "MECHAS BLOND COLLECTION L’STUDIO", "categoryHealth": "SALUD CAPILAR & RECONSTRUCCIÓN", "categoryTexture": "TEXTURA & MOLDEADO ORGÁNICO", "categoryMen": "GROOMING & MAN", "categoryExtras": "ADD-ONS & COMPLEMENTOS", "consultHistory": "Consultar mi historial"});
Object.assign(TRANSLATIONS["en"], {"categoryBlond": "L’STUDIO BLOND HIGHLIGHTS COLLECTION", "categoryHealth": "HAIR HEALTH & RECONSTRUCTION", "categoryTexture": "TEXTURE & ORGANIC SHAPING", "categoryMen": "MEN’S GROOMING", "categoryExtras": "ADD-ONS & EXTRAS", "consultHistory": "View my history"});
Object.assign(TRANSLATIONS["fr"], {"categoryBlond": "COLLECTION MÈCHES BLONDES L’STUDIO", "categoryHealth": "SANTÉ CAPILLAIRE & RECONSTRUCTION", "categoryTexture": "TEXTURE & MISE EN FORME ORGANIQUE", "categoryMen": "SOINS & COIFFURE HOMME", "categoryExtras": "OPTIONS & COMPLÉMENTS", "consultHistory": "Consulter mon historique"});
Object.assign(TRANSLATIONS["it"], {"categoryBlond": "COLLEZIONE MECHES BIONDE L’STUDIO", "categoryHealth": "SALUTE DEI CAPELLI & RICOSTRUZIONE", "categoryTexture": "TEXTURE & MODELLATURA ORGANICA", "categoryMen": "CURA & STYLING UOMO", "categoryExtras": "EXTRA & COMPLEMENTI", "consultHistory": "Consulta il mio storico"});
Object.assign(TRANSLATIONS["pt"], {"categoryBlond": "COLEÇÃO DE MADEIXAS LOIRAS L’STUDIO", "categoryHealth": "SAÚDE CAPILAR & RECONSTRUÇÃO", "categoryTexture": "TEXTURA & MODELAÇÃO ORGÂNICA", "categoryMen": "CUIDADO & STYLING MASCULINO", "categoryExtras": "EXTRAS & COMPLEMENTOS", "consultHistory": "Consultar o meu histórico"});
Object.assign(TRANSLATIONS["de"], {"categoryBlond": "L’STUDIO BLOND-STRÄHNENKOLLEKTION", "categoryHealth": "HAARGESUNDHEIT & REKONSTRUKTION", "categoryTexture": "TEXTUR & ORGANISCHE UMFORMUNG", "categoryMen": "HERRENPFLEGE & STYLING", "categoryExtras": "ZUSATZLEISTUNGEN & EXTRAS", "consultHistory": "Meinen Verlauf ansehen"});
Object.assign(TRANSLATIONS["nl"], {"categoryBlond": "L’STUDIO BLONDE HIGHLIGHTS COLLECTIE", "categoryHealth": "HAARGEZONDHEID & HERSTEL", "categoryTexture": "TEXTUUR & ORGANISCHE VORMGEVING", "categoryMen": "HERENVERZORGING & STYLING", "categoryExtras": "AANVULLINGEN & EXTRA’S", "consultHistory": "Mijn geschiedenis bekijken"});
Object.assign(TRANSLATIONS["pl"], {"categoryBlond": "KOLEKCJA BLOND PASEMEK L’STUDIO", "categoryHealth": "ZDROWIE WŁOSÓW & REKONSTRUKCJA", "categoryTexture": "TEKSTURA & ORGANICZNE MODELOWANIE", "categoryMen": "PIELĘGNACJA & STYLIZACJA MĘSKA", "categoryExtras": "DODATKI & USŁUGI UZUPEŁNIAJĄCE", "consultHistory": "Zobacz moją historię"});
Object.assign(TRANSLATIONS["cs"], {"categoryBlond": "KOLEKCE BLOND MELÍRŮ L’STUDIO", "categoryHealth": "ZDRAVÍ VLASŮ & REKONSTRUKCE", "categoryTexture": "TEXTURA & ORGANICKÉ TVAROVÁNÍ", "categoryMen": "PÁNSKÁ PÉČE & STYLING", "categoryExtras": "DOPLŇKOVÉ SLUŽBY", "consultHistory": "Zobrazit mou historii"});
Object.assign(TRANSLATIONS["nb"], {"categoryBlond": "L’STUDIO BLONDE STRIPER", "categoryHealth": "HÅRHELSE & REKONSTRUKSJON", "categoryTexture": "TEKSTUR & ORGANISK FORMING", "categoryMen": "HERREPLEIE & STYLING", "categoryExtras": "TILLEGG & EKSTRATJENESTER", "consultHistory": "Se min historikk"});
Object.assign(TRANSLATIONS["sv"], {"categoryBlond": "L’STUDIO BLONDA SLINGOR", "categoryHealth": "HÅRHÄLSA & REKONSTRUKTION", "categoryTexture": "TEXTUR & ORGANISK FORMNING", "categoryMen": "HERRVÅRD & STYLING", "categoryExtras": "TILLÄGG & EXTRATJÄNSTER", "consultHistory": "Visa min historik"});
Object.assign(TRANSLATIONS["ar"], {"categoryBlond": "مجموعة خصلات الأشقر L’STUDIO", "categoryHealth": "صحة الشعر وإعادة بنائه", "categoryTexture": "ملمس الشعر وتشكيله العضوي", "categoryMen": "العناية والتصفيف للرجال", "categoryExtras": "الإضافات والخدمات المكمّلة", "consultHistory": "عرض سجل زياراتي"});


// Client catalogue search
Object.assign(TRANSLATIONS["es"], {"searchServices": "Buscar servicios", "searchPlaceholder": "Escribe un servicio o lo que necesitas", "clearSearch": "Limpiar búsqueda", "noSearchResults": "No encontramos servicios. Prueba otra palabra.", "searchResults": "Resultados"});
Object.assign(TRANSLATIONS["en"], {"searchServices": "Search services", "searchPlaceholder": "Enter a service or what you need", "clearSearch": "Clear search", "noSearchResults": "No services found. Try another word.", "searchResults": "Results"});
Object.assign(TRANSLATIONS["fr"], {"searchServices": "Rechercher des services", "searchPlaceholder": "Saisissez un service ou votre besoin", "clearSearch": "Effacer la recherche", "noSearchResults": "Aucun service trouvé. Essayez un autre mot.", "searchResults": "Résultats"});
Object.assign(TRANSLATIONS["it"], {"searchServices": "Cerca servizi", "searchPlaceholder": "Scrivi un servizio o ciò che desideri", "clearSearch": "Cancella ricerca", "noSearchResults": "Nessun servizio trovato. Prova un’altra parola.", "searchResults": "Risultati"});
Object.assign(TRANSLATIONS["pt"], {"searchServices": "Pesquisar serviços", "searchPlaceholder": "Escreva um serviço ou o que precisa", "clearSearch": "Limpar pesquisa", "noSearchResults": "Não encontrámos serviços. Experimente outra palavra.", "searchResults": "Resultados"});
Object.assign(TRANSLATIONS["de"], {"searchServices": "Leistungen suchen", "searchPlaceholder": "Leistung oder Wunsch eingeben", "clearSearch": "Suche löschen", "noSearchResults": "Keine Leistungen gefunden. Versuchen Sie ein anderes Wort.", "searchResults": "Ergebnisse"});
Object.assign(TRANSLATIONS["nl"], {"searchServices": "Diensten zoeken", "searchPlaceholder": "Typ een dienst of je wens", "clearSearch": "Zoekopdracht wissen", "noSearchResults": "Geen diensten gevonden. Probeer een ander woord.", "searchResults": "Resultaten"});
Object.assign(TRANSLATIONS["pl"], {"searchServices": "Szukaj usług", "searchPlaceholder": "Wpisz usługę lub swoje potrzeby", "clearSearch": "Wyczyść wyszukiwanie", "noSearchResults": "Nie znaleziono usług. Spróbuj innego słowa.", "searchResults": "Wyniki"});
Object.assign(TRANSLATIONS["cs"], {"searchServices": "Hledat služby", "searchPlaceholder": "Zadejte službu nebo své přání", "clearSearch": "Vymazat hledání", "noSearchResults": "Žádné služby nenalezeny. Zkuste jiné slovo.", "searchResults": "Výsledky"});
Object.assign(TRANSLATIONS["nb"], {"searchServices": "Søk etter tjenester", "searchPlaceholder": "Skriv en tjeneste eller et ønske", "clearSearch": "Tøm søket", "noSearchResults": "Ingen tjenester funnet. Prøv et annet ord.", "searchResults": "Resultater"});
Object.assign(TRANSLATIONS["sv"], {"searchServices": "Sök tjänster", "searchPlaceholder": "Skriv en tjänst eller ditt önskemål", "clearSearch": "Rensa sökning", "noSearchResults": "Inga tjänster hittades. Prova ett annat ord.", "searchResults": "Resultat"});
Object.assign(TRANSLATIONS["ar"], {"searchServices": "البحث عن الخدمات", "searchPlaceholder": "اكتبي الخدمة أو ما تحتاجينه", "clearSearch": "مسح البحث", "noSearchResults": "لم نعثر على خدمات. جرّبي كلمة أخرى.", "searchResults": "النتائج"});


// Shared service advisor
Object.assign(TRANSLATIONS["es"], {"advisorTitle": "Tu asesor de servicios", "advisorIntro": "Cuéntanos qué buscas para explorar opciones de nuestro catálogo. Ana confirmará qué servicio se adapta a tu cabello.", "advisorPlaceholder": "Por ejemplo: quiero más luz, un corte o cuidar mi cabello", "advisorButton": "Explorar mis opciones", "advisorView": "Ver este servicio", "advisorNone": "No encontramos una coincidencia clara. Consulta con Ana para elegir el servicio adecuado.", "advisorReason": "Una opción relacionada con lo que buscas. La valoración de Ana determinará si es adecuada para ti.", "advisorAccess": "¿Necesitas ayuda para elegir?"});
Object.assign(TRANSLATIONS["en"], {"advisorTitle": "Your service advisor", "advisorIntro": "Tell us what you want to explore options from our catalogue. Ana will confirm what suits your hair.", "advisorPlaceholder": "For example: more brightness, a haircut or hair care", "advisorButton": "Explore my options", "advisorView": "View this service", "advisorNone": "No clear match found. Ask Ana to help you choose.", "advisorReason": "An option related to your wishes. Ana will assess whether it suits you.", "advisorAccess": "Need help choosing?"});
Object.assign(TRANSLATIONS["fr"], {"advisorTitle": "Votre guide des services", "advisorIntro": "Décrivez votre souhait pour explorer notre catalogue. Ana confirmera ce qui convient à vos cheveux.", "advisorPlaceholder": "Par exemple : plus de lumière, une coupe ou un soin", "advisorButton": "Explorer mes options", "advisorView": "Voir ce service", "advisorNone": "Aucune correspondance claire. Demandez conseil à Ana.", "advisorReason": "Une option liée à votre souhait. Ana évaluera si elle vous convient.", "advisorAccess": "Besoin d’aide pour choisir ?"});
Object.assign(TRANSLATIONS["it"], {"advisorTitle": "La tua guida ai servizi", "advisorIntro": "Raccontaci cosa desideri per esplorare il catalogo. Ana confermerà cosa è adatto ai tuoi capelli.", "advisorPlaceholder": "Ad esempio: più luce, un taglio o cura dei capelli", "advisorButton": "Esplora le mie opzioni", "advisorView": "Vedi questo servizio", "advisorNone": "Nessuna corrispondenza chiara. Chiedi consiglio ad Ana.", "advisorReason": "Un’opzione legata al tuo desiderio. Ana valuterà se è adatta a te.", "advisorAccess": "Ti serve aiuto per scegliere?"});
Object.assign(TRANSLATIONS["pt"], {"advisorTitle": "O seu guia de serviços", "advisorIntro": "Diga-nos o que procura para explorar o catálogo. A Ana confirmará o que se adapta ao seu cabelo.", "advisorPlaceholder": "Por exemplo: mais luz, um corte ou cuidado capilar", "advisorButton": "Explorar opções", "advisorView": "Ver este serviço", "advisorNone": "Não há uma correspondência clara. Peça ajuda à Ana.", "advisorReason": "Uma opção relacionada com o que procura. A Ana avaliará se é adequada.", "advisorAccess": "Precisa de ajuda para escolher?"});
Object.assign(TRANSLATIONS["de"], {"advisorTitle": "Ihr Leistungsberater", "advisorIntro": "Beschreiben Sie Ihren Wunsch, um unseren Katalog zu erkunden. Ana bestätigt, was zu Ihrem Haar passt.", "advisorPlaceholder": "Zum Beispiel: mehr Helligkeit, ein Schnitt oder Haarpflege", "advisorButton": "Meine Optionen entdecken", "advisorView": "Leistung ansehen", "advisorNone": "Keine eindeutige Übereinstimmung. Fragen Sie Ana nach Beratung.", "advisorReason": "Eine Option passend zu Ihrem Wunsch. Ana prüft, ob sie für Sie geeignet ist.", "advisorAccess": "Brauchen Sie Hilfe bei der Auswahl?"});
Object.assign(TRANSLATIONS["nl"], {"advisorTitle": "Jouw dienstengids", "advisorIntro": "Vertel wat je zoekt om ons aanbod te bekijken. Ana bevestigt wat bij je haar past.", "advisorPlaceholder": "Bijvoorbeeld: meer licht, een knipbeurt of haarverzorging", "advisorButton": "Mijn opties ontdekken", "advisorView": "Bekijk deze dienst", "advisorNone": "Geen duidelijke match. Vraag Ana om advies.", "advisorReason": "Een optie bij je wens. Ana beoordeelt of deze geschikt is.", "advisorAccess": "Hulp nodig bij kiezen?"});
Object.assign(TRANSLATIONS["pl"], {"advisorTitle": "Twój doradca usług", "advisorIntro": "Opisz swoje potrzeby, aby poznać katalog. Ana potwierdzi, co odpowiada Twoim włosom.", "advisorPlaceholder": "Na przykład: rozświetlenie, strzyżenie lub pielęgnacja", "advisorButton": "Poznaj moje opcje", "advisorView": "Zobacz usługę", "advisorNone": "Brak wyraźnego dopasowania. Poproś Anę o poradę.", "advisorReason": "Opcja związana z Twoimi potrzebami. Ana oceni jej odpowiedniość.", "advisorAccess": "Potrzebujesz pomocy w wyborze?"});
Object.assign(TRANSLATIONS["cs"], {"advisorTitle": "Váš průvodce službami", "advisorIntro": "Popište své přání a prozkoumejte katalog. Ana potvrdí vhodnou péči pro vaše vlasy.", "advisorPlaceholder": "Například: více světla, střih nebo péče o vlasy", "advisorButton": "Prozkoumat možnosti", "advisorView": "Zobrazit službu", "advisorNone": "Žádná jasná shoda. Požádejte Anu o radu.", "advisorReason": "Možnost související s vaším přáním. Ana posoudí její vhodnost.", "advisorAccess": "Potřebujete pomoc s výběrem?"});
Object.assign(TRANSLATIONS["nb"], {"advisorTitle": "Din tjenesteguide", "advisorIntro": "Fortell hva du ønsker for å utforske katalogen. Ana bekrefter hva som passer håret ditt.", "advisorPlaceholder": "For eksempel: mer lys, en klipp eller hårpleie", "advisorButton": "Utforsk mine valg", "advisorView": "Se tjenesten", "advisorNone": "Ingen tydelig match. Spør Ana om råd.", "advisorReason": "Et alternativ knyttet til ønsket ditt. Ana vurderer om det passer.", "advisorAccess": "Trenger du hjelp til å velge?"});
Object.assign(TRANSLATIONS["sv"], {"advisorTitle": "Din tjänsteguide", "advisorIntro": "Berätta vad du önskar för att utforska katalogen. Ana bekräftar vad som passar ditt hår.", "advisorPlaceholder": "Till exempel: mer ljus, en klippning eller hårvård", "advisorButton": "Utforska mina alternativ", "advisorView": "Visa tjänsten", "advisorNone": "Ingen tydlig match. Fråga Ana om råd.", "advisorReason": "Ett alternativ kopplat till ditt önskemål. Ana bedömer om det passar.", "advisorAccess": "Behöver du hjälp att välja?"});
Object.assign(TRANSLATIONS["ar"], {"advisorTitle": "دليلك لاختيار الخدمات", "advisorIntro": "أخبرينا بما تبحثين عنه لاستكشاف خدماتنا. ستؤكد آنا ما يناسب شعرك.", "advisorPlaceholder": "مثلًا: إضاءة الشعر أو قصّه أو العناية به", "advisorButton": "استكشاف الخيارات", "advisorView": "عرض هذه الخدمة", "advisorNone": "لم نجد تطابقًا واضحًا. استشيري آنا لاختيار الخدمة المناسبة.", "advisorReason": "خيار مرتبط بما تبحثين عنه. ستقيّم آنا مدى ملاءمته لك.", "advisorAccess": "هل تحتاجين مساعدة في الاختيار؟"});


TRANSLATIONS["es"].subtitle = "PORTAL PRIVADO";
TRANSLATIONS["en"].subtitle = "PRIVATE PORTAL";
TRANSLATIONS["fr"].subtitle = "ESPACE PRIVÉ";
TRANSLATIONS["it"].subtitle = "AREA PRIVATA";
TRANSLATIONS["pt"].subtitle = "PORTAL PRIVADO";
TRANSLATIONS["de"].subtitle = "PRIVATER BEREICH";
TRANSLATIONS["nl"].subtitle = "PRIVÉPORTAAL";
TRANSLATIONS["pl"].subtitle = "PRYWATNY PORTAL";
TRANSLATIONS["cs"].subtitle = "SOUKROMÝ PORTÁL";
TRANSLATIONS["nb"].subtitle = "PRIVAT PORTAL";
TRANSLATIONS["sv"].subtitle = "PRIVAT PORTAL";
TRANSLATIONS["ar"].subtitle = "البوابة الخاصة";


TRANSLATIONS["es"].enterPortal = "Entrar";
TRANSLATIONS["en"].enterPortal = "Enter";
TRANSLATIONS["fr"].enterPortal = "Entrer";
TRANSLATIONS["it"].enterPortal = "Accedi";
TRANSLATIONS["pt"].enterPortal = "Entrar";
TRANSLATIONS["de"].enterPortal = "Anmelden";
TRANSLATIONS["nl"].enterPortal = "Inloggen";
TRANSLATIONS["pl"].enterPortal = "Zaloguj się";
TRANSLATIONS["cs"].enterPortal = "Přihlásit se";
TRANSLATIONS["nb"].enterPortal = "Logg inn";
TRANSLATIONS["sv"].enterPortal = "Logga in";
TRANSLATIONS["ar"].enterPortal = "دخول";

export interface ServiceVariant {
  description?: string;
  translations?: Record<string, { name?: string }>; 
  id: string;
  name: string;
  price: string;
  duration: string;
}

export interface Appointment {
  promotionOrigin?: { id: string; title: string };
  promotion?: PromotionDiscount;
  clientId?: string | null;
  bookingChannel?: 'portal' | 'admin';
  lifecycleStatus?: 'cancelled' | 'no_show';
  statusChangedAt?: string;
  internalNotes?: string;
  completedAt?: string;
  id: string;
  serverId?: string | null;
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
  professionalId?: string | null;
  professionalName?: string | null;
}

const isActiveAppointment = (appointment: Appointment) =>
  appointment.lifecycleStatus !== 'cancelled' && appointment.lifecycleStatus !== 'no_show';

export type StylingPolicy = 'included' | 'required' | 'optional' | 'not_applicable';
export type FinishKind = 'styling' | 'toner';
const FINISH_COPY: Record<StylingPolicy, string> = {
  included: 'Forma parte del precio y del tiempo del servicio. No se cobra de nuevo.',
  required: 'La clienta debe elegir un complemento compatible. Se suman su precio y duración.',
  optional: 'La clienta puede añadirlo o continuar sin él. Si lo añade, se suman precio y duración.',
  not_applicable: 'Este servicio no necesita este complemento. No impide reservarlo con otros servicios.'
};

export type ServiceTranslation = Partial<Pick<SubService, 'name' | 'slogan' | 'description' | 'includesText' | 'achievedText' | 'forWhomText' | 'conditionsText' | 'alertText'>>;

export interface SubService {
  addonGroups?: AddonGroup[];
  bookingName?: string;
  consultationPhotoVersion?: number;
  cutPhotoVersion?: number;
  imageCredit?: string;
  slogan?: string;
  translations?: Record<string, ServiceTranslation>;
  imageUrl?: string;
  imageIsAiPlaceholder?: boolean;
  imagePosition?: { x: number; y: number };
  active?: boolean;
  requiresAssessment?: boolean;
  tonerPolicy?: StylingPolicy;
  isTonerService?: boolean;
  stylingPolicy?: StylingPolicy;
  stylingAllowedIds?: string[];
  tonerAllowedIds?: string[];
  stylingMessage?: string;
  tonerMessage?: string;
  allowCutGo?: boolean;
  isCutGoService?: boolean;
  isStylingService?: boolean;
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  bufferTime?: string;
  includesText?: string;
  achievedText?: string;
  forWhomText?: string;
  conditionsText?: string;
  cutAllowedIds?: string[];
  priceType?: 'desde' | 'aprox' | 'fijo' | 'consultar';
  hasVariants?: boolean;
  variants?: ServiceVariant[];
  showAlertBadge?: boolean;
  alertText?: string;
}

export interface CatalogCategory {
  portalTitle?: string;
  slogan?: string;
  translations?: Record<string, { title?: string }>; 
  id: string;
  code: string;
  title: string;
  icon?: string;
  imageUrl?: string;
  imageIsAiPlaceholder?: boolean;
  imagePosition?: { x: number; y: number };
  subservices: SubService[];
}

export interface ClientRecord {
  archivedAt?: string | null;
  createdAt?: string;
  serverId?: string;
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

export interface LostDemandRecord {
  observedAt?: string;
  desiredDate?: string;
  clientEmail?: string;
  recoveredAt?: string;
  contactedAt?: string;
  id: string;
  date: string;
  clientName: string;
  serviceName: string;
  potentialValue: number;
  reason: 'sin_disponibilidad' | 'abandono_sin_servicio' | 'intento_fallido' | 'otro';
  clientNote: string;
  phone: string;
}

export interface FeedbackRecord {
  id: string;
  date: string;
  clientName: string;
  rating: number;
  comment: string;
  type: 'detractor' | 'neutral' | 'promoter';
  serverStored?: boolean;
  resolvedAt?: string;
}

export interface HolidayBlock {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: 'vacaciones' | 'festivo';
}

const CONSULTATION_PHOTOS = {"strand": "/test-viabilidad.png", "visagism": "/consulta-visagismo.png"};

// Apply once per matched service. Later manual uploads keep the version marker.
const CUT_SERVICE_PHOTOS = {"trend": "/corte-tendencia.png", "ends": "/mantenimiento-puntas.png"};
function withConsultationPhoto(sub: SubService): SubService {
  // Uploaded/server pictures always take precedence over bundled suggestions.
  if (/^(https?:|data:)/i.test(sub.imageUrl || '')) return sub;


  const name = sub.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const trendCut = /corte/.test(name) && /cambio.*look|tendencia/.test(name);
  const endsCut = /corte/.test(name) && /mantenimiento.*puntas|puntas.*mantenimiento/.test(name);
  if ((trendCut || endsCut) && !(sub.cutPhotoVersion === 1 && sub.imageUrl)) {
    return { ...sub, cutPhotoVersion: 1, imageUrl: trendCut ? CUT_SERVICE_PHOTOS.trend : CUT_SERVICE_PHOTOS.ends, imageIsAiPlaceholder: true, imagePosition: { x: 50, y: trendCut ? 45 : 60 }, imageCredit: 'Imagen ilustrativa creada con IA para L’Studio Ana' };
  }
  const exactTechnicalTest = name.replace(/\s+/g, ' ').trim() === 'test de viabilidad tecnica & resistencia';
  const strand = exactTechnicalTest || /hasta\s+donde.*(?:cabello|pelo)/.test(name) || /viabilidad|test.*mechon|prueba.*mechon|antes del gran cambio/.test(name);
  const visagism = !/corte|dni|microcamara/.test(name) && (/visagismo/.test(name) && /consulta|estudio|asesor/.test(name) || /tu look,? con sentido/.test(name));
  if (!strand && !visagism) return sub;
  const photoVersion = strand ? 5 : 1;
  if (sub.consultationPhotoVersion === photoVersion && sub.imageUrl) return sub;
  return { ...sub, consultationPhotoVersion: photoVersion, imageUrl: strand ? CONSULTATION_PHOTOS.strand : CONSULTATION_PHOTOS.visagism, imageIsAiPlaceholder: strand, imagePosition: { x: 50, y: 45 }, imageCredit: strand ? 'Imagen ilustrativa creada con IA para L’Studio Ana' : 'Imagen de referencia: Salon CHRIS · https://www.chris.ma/post/coupe-sur-mesure-marrakech' };
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

const SERVICE_AI_IMAGES: Record<string, { imageUrl: string; imageIsAiPlaceholder: boolean; imagePosition: { x: number; y: number } }> = {
  s1: { imageUrl: '/s1.webp', imageIsAiPlaceholder: true, imagePosition: { x: 50, y: 30 } },
  s2: { imageUrl: '/s2.webp', imageIsAiPlaceholder: true, imagePosition: { x: 50, y: 30 } },
  s3: { imageUrl: '/s3.webp', imageIsAiPlaceholder: true, imagePosition: { x: 50, y: 30 } },
  s4: { imageUrl: '/s4.webp', imageIsAiPlaceholder: true, imagePosition: { x: 50, y: 35 } },
  s5: { imageUrl: '/s5.webp', imageIsAiPlaceholder: true, imagePosition: { x: 50, y: 30 } },
  s6: { imageUrl: '/s6.webp', imageIsAiPlaceholder: true, imagePosition: { x: 50, y: 40 } },
  s7: { imageUrl: '/s7.webp', imageIsAiPlaceholder: true, imagePosition: { x: 50, y: 35 } },
  s8: { imageUrl: '/s8.webp', imageIsAiPlaceholder: true, imagePosition: { x: 50, y: 30 } },
  s9: { imageUrl: '/s9.webp', imageIsAiPlaceholder: true, imagePosition: { x: 50, y: 35 } }
};

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


const normalizeOpeningHours = (config: BusinessConfig): BusinessConfig => {
  // No reescribe los horarios escritos: solo añade la hora de apertura si el texto no contiene ninguna.
  const opening = (schedule: string, time: string) =>
    /\d{1,2}(?::\d{2}|h(?:\s*\d{2})?)/i.test(schedule) ? schedule : (schedule.trim() ? `${schedule.trim()} ${time}` : schedule);
  return { ...config,
    scheduleMonday: opening(config.scheduleMonday, '10:00'),
    scheduleTueWed: opening(config.scheduleTueWed, '10:00'),
    scheduleThuFri: opening(config.scheduleThuFri, '10:00'),
    scheduleSaturday: opening(config.scheduleSaturday, '09:00') };
};

const normalizeEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const safeText = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

function readStoredValue(key: string, raw: string): any {
  // Conservar el original antes de normalizar o recuperar datos antiguos.
  try {
    const backupKey = key + '_original_before_access_fix';
    if (localStorage.getItem(backupKey) === null) localStorage.setItem(backupKey, raw);
  } catch { /* La falta de espacio no debe impedir leer los datos. */ }
  let value: any;
  try { value = JSON.parse(raw); } catch {
    return key === 'lst_business_config' ? {} : [];
  }
  if (key === 'lst_business_config') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const config: any = { ...INITIAL_BUSINESS_CONFIG, ...value };
    Object.entries(INITIAL_BUSINESS_CONFIG).forEach(([field, fallback]) => {
      if (typeof config[field] !== typeof fallback ||
          (typeof fallback === 'number' && !Number.isFinite(config[field]))) {
        config[field] = fallback;
      }
    });
    return normalizeOpeningHours(config);
  }
  if (!Array.isArray(value)) return [];
  const records = value.filter(item => item && typeof item === 'object' && !Array.isArray(item));
  if (key === 'lst_studio_clientes_ids') return records.map((item, index) => {
    const client = { ...item };
    ['registroId', 'nombre', 'apellidos', 'fechaNacimiento', 'telefono', 'email',
     'pinAcceso', 'diagnostico', 'ultimaVisita', 'proximaVisitaSugerida',
     'formulasAplicadas', 'dniCapilar', 'prescripcionCasa'].forEach(field => {
      client[field] = safeText(client[field]);
    });
    client.idNum = Number.isFinite(Number(item.idNum)) && Number(item.idNum) > 0 ? Number(item.idNum) : index + 1;
    client.pastVisits = Array.isArray(item.pastVisits) ? item.pastVisits
      .filter((visit: any) => visit && typeof visit === 'object')
      .map((visit: any) => ({ ...visit, date: safeText(visit.date), service: safeText(visit.service),
        stylist: safeText(visit.stylist), notes: safeText(visit.notes) })) : [];
    return client;
  });
  if (key === 'lst_studio_appointments') return records.map(item => ({
    ...item, id: safeText(item.id), dateKey: safeText(item.dateKey),
    dayName: safeText(item.dayName), time: safeText(item.time),
    clientName: safeText(item.clientName), phone: safeText(item.phone),
    email: safeText(item.email), serviceCategory: safeText(item.serviceCategory),
    serviceSubcategory: safeText(item.serviceSubcategory),
    remindersStatus: { email48h: false, whatsapp48h: false, whatsapp24h: false,
      whatsapp2h: false, ...(item.remindersStatus || {}) }
  }));
  if (key === 'lst_master_catalog') return records.map(category => ({
    ...category, id: safeText(category.id), code: safeText(category.code),
    title: safeText(category.title), portalTitle: safeText(category.portalTitle), slogan: safeText(category.slogan),
    subservices: (Array.isArray(category.subservices) ? category.subservices : [])
      .filter((sub: any) => sub && typeof sub === 'object').map((sub: any) => ({
        ...sub, id: safeText(sub.id), name: safeText(sub.name), bookingName: safeText(sub.bookingName),
        slogan: safeText(sub.slogan), description: safeText(sub.description), duration: safeText(sub.duration),
        price: safeText(sub.price),
        variants: (Array.isArray(sub.variants) ? sub.variants : [])
          .filter((variant: any) => variant && typeof variant === 'object')
          .map((variant: any) => ({ ...variant, id: safeText(variant.id),
            name: safeText(variant.name), price: safeText(variant.price),
            duration: safeText(variant.duration) }))
      }))
  }));
  return records;
}

const AGENDA_SWATCHES = [
  { id: 'champagne', label: 'Champán', panel: '#322A25', soft: '#3E342C', border: '#3A312A' },
  { id: 'sage', label: 'Salvia', panel: '#C2CDBD', soft: '#D6DECE', border: '#9DAD93' },
  { id: 'terracotta', label: 'Terracota', panel: '#D9A98A', soft: '#E8C4A8', border: '#C08B65' },
  { id: 'blush', label: 'Rosa tostado', panel: '#DCB4A4', soft: '#EBCFC3', border: '#C69785' },
  { id: 'stone', label: 'Piedra', panel: '#CFC8BC', soft: '#E0DAD0', border: '#B0A899' },
] as const;

class PortalErrorBoundary extends React.Component<
  { children: React.ReactNode }, { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error en el portal de L’Studio Ana:', error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main style={{ minHeight: '100vh', background: '#29231F', color: '#FFF8EE',
      display: 'grid', placeContent: 'center', padding: '24px', textAlign: 'center' }}>
      <h1 style={{ fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', color: '#C99E52' }}>L’Studio Ana</h1>
      <p>No hemos podido abrir el portal. Tus datos guardados se conservan.</p>
      <button type="button" onClick={() => window.location.reload()}
        style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', border: 0, padding: '14px', cursor: 'pointer' }}>
        Volver al acceso
      </button>
    </main>;
  }
}

export default function App() {
  return <PortalErrorBoundary><StudioApp /></PortalErrorBoundary>;
}

function StudioApp() {
  const [currentScreen, setCurrentScreen] = useState<'clientPin' | 'clientRegistration' | 'clientPortal' | 'myAppointmentsPage' | 'catalogBooking' | 'categoryScreen' | 'serviceDetail' | 'visualAgenda' | 'clientHistoryPage' | 'adminLogin' | 'adminPanel'>('clientPin');
  
  const [currentLang, setCurrentLang] = useState<string>(() => { const saved = localStorage.getItem('lst_portal_language'); return saved && TRANSLATIONS[saved] ? saved : 'es'; });
  useEffect(() => { localStorage.setItem('lst_portal_language', currentLang); }, [currentLang]);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const portalLocale = ({ es: 'es-ES', en: 'en-GB', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT', de: 'de-DE', nl: 'nl-NL', pl: 'pl-PL', cs: 'cs-CZ', nb: 'nb-NO', sv: 'sv-SE', ar: 'ar-MA' } as Record<string, string>)[currentLang] || 'es-ES';
  const t = (key: string) => TRANSLATIONS[currentScreen === 'adminPanel' || currentScreen === 'adminLogin' ? 'es' : currentLang]?.[key] || TRANSLATIONS['es'][key] || key;
  const tf = (key: string, values: Record<string, string | number | undefined>) => t(key).replace(/\{(\w+)\}/g, (token, name: string) => values[name] === undefined ? token : String(values[name]));
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
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [detailAddonTab, setDetailAddonTab] = useState<'styling' | 'cut' | 'toner'>('styling');
  const [viewServiceDetail, setViewServiceDetail] = useState<{ cat: CatalogCategory; sub: SubService } | null>(null);
  const [activeCatalogTab, setActiveCatalogTab] = useState<string>('');
  const carouselScrollerRef = useRef<HTMLDivElement | null>(null);
  const carouselPosRef = useRef<Record<string, number>>({});
  const scrollCarousel = (dir: number) => {
    const el = carouselScrollerRef.current;
    if (!el) return;
    const card = el.querySelector('.lst-c-card') as HTMLElement | null;
    const step = card ? card.offsetWidth + 14 : 260;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [expandedSubDetails, setExpandedSubDetails] = useState<{ [key: string]: boolean }>({});
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [selectedVisualTime, setSelectedVisualTime] = useState<string>('');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [selectedPromotionOrigin, setSelectedPromotionOrigin] = useState<{ id: string; title: string } | null>(null);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [visualBookingBusy, setVisualBookingBusy] = useState(false);
  const [visualBookingError, setVisualBookingError] = useState('');
  const visualBookingBusyRef = useRef(false);
  const visualBookingAttemptRef = useRef<{ signature: string; draft: Appointment } | null>(null);

  const [editProximaVisita, setEditProximaVisita] = useState("");
  const [editFormulas, setEditFormulas] = useState("");
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [clientWishText, setClientWishText] = useState("");
  const [aiRecommendation, setAiRecommendation] = useState<string[] | null>(null);
  const [logoClicks, setLogoClicks] = useState<number>(0);
  const [adminPin, setAdminPin] = useState<string>("");
  const [adminLoginBusy, setAdminLoginBusy] = useState(false);
  const [adminLoginMessage, setAdminLoginMessage] = useState('');
  const [adminError, setAdminError] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<'agenda' | 'config' | 'catalog' | 'clients' | 'detractors' | 'crm' | 'demands' | 'holidays'>('agenda');
  const [configSubTab, setConfigSubTab] = useState<'marca' | 'general' | 'schedule' | 'reservas' | 'anticipada' | 'avisos' | 'backup' | 'precios' | 'empleados'>('marca');
  const [adminCatalogStatus, setAdminCatalogStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [adminCatalogSearch, setAdminCatalogSearch] = useState('');
  const normalizeCatalogSearch = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const [catalogSavedMsg, setCatalogSavedMsg] = useState<string | null>(null);
  const [catalogEditorId, setCatalogEditorId] = useState<string | null>(null);
  const [catalogEditorTab, setCatalogEditorTab] = useState<'data' | 'options' | 'booking' | 'languages'>('data');

  const [enableOutOfHours, setEnableOutOfHours] = useState<boolean>(false);
  const [enableDoubleBooking, setEnableDoubleBooking] = useState<boolean>(false);
  
  // NUEVO ESTADO: VISTA DE AGENDA MAESTRA ('week' | 'day')
  const [agendaViewMode, setAgendaViewMode] = useState<'week' | 'day'>(() => window.matchMedia('(max-width: 700px)').matches ? 'day' : 'week');
  const [agendaSwatch, setAgendaSwatch] = useState<'champagne' | 'sage' | 'terracotta' | 'blush' | 'stone'>('champagne');
  const agendaLayoutRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = agendaLayoutRef.current;
    if (!root) return;
    const target = AGENDA_SWATCHES.find(s => s.id === agendaSwatch) ?? AGENDA_SWATCHES[0];
    const toRgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };
    const map = new Map<string, string>();
    for (const p of AGENDA_SWATCHES) {
      map.set(toRgb(p.panel), toRgb(target.panel));
      map.set(toRgb(p.soft), toRgb(target.soft));
      map.set(toRgb(p.border), toRgb(target.border));
    }
    const tint = () => {
      for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
        const bg = el.style.backgroundColor;
        if (bg && map.has(bg)) el.style.backgroundColor = map.get(bg)!;
        const bc = el.style.borderColor;
        if (bc && map.has(bc)) el.style.borderColor = map.get(bc)!;
      }
    };
    tint();
    const observer = new MutationObserver(tint);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [agendaSwatch]);
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [agendaSidePanel, setAgendaSidePanel] = useState<'day' | 'pending' | null>(null);
  const [pendingPanelFilter, setPendingPanelFilter] = useState<'all' | 'approval' | 'payment'>('all');
  const [returnToAppointmentId, setReturnToAppointmentId] = useState<string | null>(null);

  const [agendaExpanded, setAgendaExpanded] = useState(false);
  const [compactAgenda, setCompactAgenda] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setCompactAgenda(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const agendaRowHeight = compactAgenda ? 44 : 30;

  const [agendaNow, setAgendaNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setAgendaNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const appointmentSearchQuery = appointmentSearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  
  const [googleCalendarSyncActive, setGoogleCalendarSyncActive] = useState<boolean>(true);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean>(true);
  const [bizConfig, setBizConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem('lst_business_config');
    return saved ? { ...INITIAL_BUSINESS_CONFIG, ...readStoredValue('lst_business_config', saved) } : INITIAL_BUSINESS_CONFIG;
  });
  const brandLogoSrc = bizConfig.brandLogoUrl || DEFAULT_BRAND_LOGO;
  const headerLogoSrc = bizConfig.headerLogoUrl || DEFAULT_HEADER_LOGO;
  const [logoUploadBusy, setLogoUploadBusy] = useState<'brandLogoUrl' | 'headerLogoUrl' | null>(null);
  const logoUploadRef = useRef(false);
  const [logoUploadMessage, setLogoUploadMessage] = useState('');
  const fallbackBrandLogo = (event: React.SyntheticEvent<HTMLImageElement>) => { if (!event.currentTarget.src.endsWith(DEFAULT_BRAND_LOGO)) event.currentTarget.src = DEFAULT_BRAND_LOGO; };
  const fallbackHeaderLogo = (event: React.SyntheticEvent<HTMLImageElement>) => { if (!event.currentTarget.src.endsWith(DEFAULT_HEADER_LOGO)) event.currentTarget.src = DEFAULT_HEADER_LOGO; };
  useEffect(() => {
    if (!studioApi.serverConfigured) return;
    let cancelled = false;
    const initialBrandLogo = bizConfig.brandLogoUrl;
    const initialHeaderLogo = bizConfig.headerLogoUrl;
    void statusWithTimeout(studioApi.fetchPublicBranding()).then(branding => {
      if (cancelled) return;
      setBizConfig(previous => previous.brandLogoUrl !== initialBrandLogo || previous.headerLogoUrl !== initialHeaderLogo ? previous : ({ ...previous, brandLogoUrl: branding.brandLogoUrl || undefined, headerLogoUrl: branding.headerLogoUrl || undefined }));
    }).catch(() => { /* Saved/default logos remain available if the connection fails. */ });
    return () => { cancelled = true; };
  }, []);
  const uploadStudioLogo = async (key: 'brandLogoUrl' | 'headerLogoUrl', file: File) => {
    if (logoUploadRef.current) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setLogoUploadMessage('Elige una imagen PNG, JPG o WebP.'); return; }
    if (file.size > 12 * 1024 * 1024) { setLogoUploadMessage('La imagen original debe pesar menos de 12 MB.'); return; }
    const token = studioApi.currentToken();
    if (!token || studioApi.storedRole() !== 'admin' || !studioApi.serverConfigured) { setLogoUploadMessage('Inicia sesión en la intranet para subir el logo.'); return; }
    logoUploadRef.current = true; setLogoUploadBusy(key); setLogoUploadMessage('Optimizando y subiendo el logo…');
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('No se pudo leer esta imagen.')); image.src = objectUrl; });
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 30000000) throw new Error('La imagen tiene demasiada resolución. Usa una versión más pequeña.');
      const scale = Math.min(1, 1024 / image.naturalWidth, 1024 / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); if (!context) throw new Error('El navegador no puede preparar la imagen.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo optimizar la imagen.')), 'image/webp', 0.92));
      if (blob.size > 1024 * 1024) throw new Error('El logo sigue pesando más de 1 MB. Elige una imagen más sencilla.');
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('No se pudo preparar la subida.')); reader.readAsDataURL(blob); });
      const uploaded = await studioApi.uploadServiceImage(token, dataUrl);
      if (!uploaded.url) throw new Error('No se recibió el enlace del logo.');
      setTempConfig(previous => ({ ...previous, [key]: uploaded.url }));
      setLogoUploadMessage(`Logo preparado (${Math.ceil(blob.size / 1024)} KB). Pulsa Guardar cambios para publicarlo.`);
    } catch (error) { setLogoUploadMessage(error instanceof Error ? error.message : 'No se pudo subir el logo.'); }
    finally { if (objectUrl) URL.revokeObjectURL(objectUrl); logoUploadRef.current = false; setLogoUploadBusy(null); }
  };
  const [reservationPolicyOpen, setReservationPolicyOpen] = useState(false);
  const [reservationPolicyChecked, setReservationPolicyChecked] = useState(false);
  const [acceptedSaturdayPolicy, setAcceptedSaturdayPolicy] = useState('');
  const reservationPolicyDialog = useRef<HTMLDialogElement>(null);
  const portalDateInputRef = useRef<HTMLInputElement>(null);
  const [bookingDate, setBookingDate] = useState<Date>(() => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + bizConfig.minAdvanceDays); return date; });
  const [tempConfig, setTempConfigState] = useState<BusinessConfig>(() => structuredClone(bizConfig));
  const [employeePhotoBusy, setEmployeePhotoBusy] = useState<string | null>(null);
  const employeePhotoBusyRef = useRef(false);
  const portalShowsPrices = bizConfig.showPrices !== false;
  const [professionalsLoading, setProfessionalsLoading] = useState(false);
  const [professionalsError, setProfessionalsError] = useState('');
  const [professionalsReload, setProfessionalsReload] = useState(0);
  const activeEmployees = (bizConfig.employees || []).filter(e => e.status === 'active' && e.name.trim());

  // Fetch independently of saved sessions whenever the booking agenda opens.
  useEffect(() => {
    if (currentScreen !== 'visualAgenda' || !studioApi.serverConfigured) return;
    let cancelled = false;
    setProfessionalsLoading(true);
    setProfessionalsError('');
    void statusWithTimeout(studioApi.fetchPublicProfessionals<{ employees?: StudioEmployee[] }>())
      .then(data => {
        if (cancelled) return;
        if (!Array.isArray(data.employees)) throw new Error('missing employees');
        const employees = data.employees.filter(employee =>
          employee && typeof employee.id === 'string' &&
          typeof employee.name === 'string' && employee.name.trim() && employee.status === 'active');
        setBizConfig(previous => {
          const next = { ...previous, employees };
          bizConfigRef.current = next;
          return next;
        });
        setSelectedProfessionalId(previous => employees.some(employee => employee.id === previous)
          ? previous : employees.length === 1 ? employees[0].id : null);
      })
      .catch(() => {
        if (!cancelled) setProfessionalsError('No hemos podido consultar los profesionales. Pulsa Reintentar.');
      })
      .finally(() => { if (!cancelled) setProfessionalsLoading(false); });
    return () => { cancelled = true; };
  }, [currentScreen, professionalsReload]);
  useEffect(() => {
    if (activeEmployees.length === 1) setSelectedProfessionalId(activeEmployees[0].id);
    else if (activeEmployees.length === 0) setSelectedProfessionalId(null);
  }, [activeEmployees.length]);
  const clientPrice = (price: string | undefined) => portalShowsPrices ? (price || '') : '';
  const updateEmployee = (id: string, patch: Partial<StudioEmployee>) => setTempConfig(previous => ({ ...previous, employees: (previous.employees || []).map(employee => employee.id === id ? { ...employee, ...patch } : employee) }));
  const uploadEmployeePhoto = async (id: string, file?: File) => {
    if (!file || employeePhotoBusyRef.current) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) { alert('Elige una foto JPG, PNG o WebP de hasta 8 MB.'); return; }
    const token = studioApi.currentToken();
    if (!token || studioApi.storedRole() !== 'admin') { alert('Inicia sesión como administradora para subir la foto.'); return; }
    employeePhotoBusyRef.current = true; setEmployeePhotoBusy(id);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('No se pudo leer la imagen.')); reader.readAsDataURL(file); });
      const uploaded = await studioApi.uploadServiceImage(token, dataUrl);
      updateEmployee(id, { photo: uploaded.url });
    } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo subir la foto.'); }
    finally { employeePhotoBusyRef.current = false; setEmployeePhotoBusy(null); }
  };
  const configDraftRef = useRef(tempConfig);
  const configBaselineRef = useRef(structuredClone(bizConfig));
  const configSavingRef = useRef(false);
  const configEqual = (left: unknown, right: unknown): boolean => {
    const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical)
      : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
    return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
  };
  const setTempConfig: React.Dispatch<React.SetStateAction<BusinessConfig>> = update => {
    const next = typeof update === 'function' ? update(configDraftRef.current) : update;
    configDraftRef.current = structuredClone(next);
    setTempConfigState(configDraftRef.current);
    setSaveState('idle');
    setSaveErrorMsg(null);
    setSavedMsg(null);
  };
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const bizConfigRef = useRef(bizConfig);
  useEffect(() => {
    bizConfigRef.current = bizConfig;
  }, [bizConfig]);

  // CATÁLOGO UNIFICADO Y SINCRONIZADO EN TIEMPO REAL
  const [catalog, setCatalog] = useState<CatalogCategory[]>(() => {
    const saved = localStorage.getItem('lst_master_catalog');
    const parsed = saved ? readStoredValue('lst_master_catalog', saved) : INITIAL_CATALOG;
    // Añadir fotos iniciales solo a servicios sin foto propia guardada.
    return parsed.map((category: CatalogCategory) => ({
      ...category,
      subservices: category.subservices.map(sub => {
        const seed = SERVICE_AI_IMAGES[sub.id];
        if (!seed) return withConsultationPhoto(sub);
        return withConsultationPhoto({
          ...seed,
          ...sub,
          imageIsAiPlaceholder: sub.imageUrl && sub.imageUrl !== seed.imageUrl ? sub.imageIsAiPlaceholder : seed.imageIsAiPlaceholder
        });
      })
    }));
  });

  const bookingName = (sub: SubService) => getBookingName(sub, catalog);
  const appointmentServiceNames = (appointment: Appointment) => getAppointmentServiceNames(appointment, catalog);
  const compactVisitText = (text: string) => compactServiceText(text, catalog);

  const [savedCatalogSnapshot, setSavedCatalogSnapshot] = useState(() => JSON.stringify(catalog));
  const catalogHasChanges = JSON.stringify(catalog) !== savedCatalogSnapshot;

  const [photoUploadBusy, setPhotoUploadBusy] = useState(false);
  const updateSubserviceField = (categoryId: string, subId: string, patch: Partial<SubService>) => {
    setCatalog(previous => previous.map(c => c.id !== categoryId ? c : {
      ...c,
      subservices: c.subservices.map(s => s.id !== subId ? s : { ...s, ...patch })
    }));
  };
  const handleServicePhotoSelect = async (categoryId: string, subId: string, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Elige un archivo de imagen.'); return; }
    if (file.size > 8 * 1024 * 1024) { alert('La imagen supera 8 MB. Elige una más ligera.'); return; }
    if (!studioApi.serverConfigured || studioApi.storedRole() !== 'admin' || !studioApi.currentToken()) {
      alert('Para gestionar fotografías necesitas entrar en 360studio con el PIN maestro.'); return;
    }
    setPhotoUploadBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });
      const uploaded = await studioApi.uploadServiceImage(studioApi.currentToken()!, dataUrl);
      updateSubserviceField(categoryId, subId, { imageUrl: uploaded.url, imageIsAiPlaceholder: false });
      alert('Foto subida. Pulsa "Guardar catálogo" para hacerla visible en el portal de clientas.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo subir la foto.');
    } finally {
      setPhotoUploadBusy(false);
    }
  };
  const storagePathFromUrl = (url: string | undefined) =>
    (/^https:\/\/.+\/storage\/v1\/object\/public\/service-images\/(.+)$/.exec(url || '') || [])[1];
  const handleCategoryPhotoSelect = async (catId: string, file: File | undefined) => {
    if (!file || photoUploadBusy) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { alert('Elige una foto PNG, JPG o WebP. Convierte otros formatos antes de subirlos.'); return; }
    if (file.size > 4 * 1024 * 1024) { alert('La imagen supera 4 MB. Elige una más ligera.'); return; }
    if (!studioApi.serverConfigured || studioApi.storedRole() !== 'admin' || !studioApi.currentToken()) {
      alert('Para gestionar fotografías necesitas entrar en 360studio con el PIN maestro.'); return;
    }
    setPhotoUploadBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });
      const uploaded = await studioApi.uploadServiceImage(studioApi.currentToken()!, dataUrl);
      if (!uploaded?.ok || typeof uploaded.url !== 'string' || !uploaded.url.startsWith('https://')) {
        throw new Error('El servidor no devolvió una dirección válida para la foto. La imagen anterior se conserva.');
      }
      setCatalog(previous => previous.map(c => c.id !== catId ? c : { ...c, imageUrl: uploaded.url, imageIsAiPlaceholder: false }));
      alert('Foto de la categoría subida. Pulsa "Guardar catálogo" para hacerla visible en el portal de clientas.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo subir la foto.';
      alert(message.includes('publicUrl')
        ? 'La función de subida del servidor necesita la corrección de publicUrl. La foto anterior se conserva. Actualiza y despliega studio-api antes de reintentar.'
        : message);
    } finally {
      setPhotoUploadBusy(false);
    }
  };
  const handleCategoryPhotoDelete = async (catId: string) => {
    if (!window.confirm('¿Eliminar la fotografía de esta categoría? Volverá a mostrarse la foto de su primer servicio.')) return;
    if (!studioApi.serverConfigured || studioApi.storedRole() !== 'admin' || !studioApi.currentToken()) {
      alert('Para gestionar fotografías necesitas entrar en 360studio con el PIN maestro.'); return;
    }
    setPhotoUploadBusy(true);
    try {
      const marker = storagePathFromUrl(catalog.find(c => c.id === catId)?.imageUrl);
      if (marker) await studioApi.deleteServiceImage(studioApi.currentToken()!, marker);
      const updated = catalog.map(c => c.id !== catId ? c : { ...c, imageUrl: undefined, imageIsAiPlaceholder: false });
      setCatalog(updated);
      localStorage.setItem('lst_master_catalog', JSON.stringify(updated));
      setSavedCatalogSnapshot(JSON.stringify(updated));
      if (studioApi.serverConfigured && studioApi.storedRole() === 'admin') {
        studioApi.pushCatalog(studioApi.currentToken()!, updated).catch(() => {
          setCatalogSavedMsg('Guardado en este dispositivo. No se pudo sincronizar con el servidor: revisa tu conexión e inténtalo de nuevo.');
        });
      }
      alert('Fotografía de la categoría eliminada y guardada.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo eliminar la foto.');
    } finally {
      setPhotoUploadBusy(false);
    }
  };
  const handleServicePhotoDelete = async (categoryId: string, subId: string) => {
    const sub = catalog.find(c => c.id === categoryId)?.subservices.find(s => s.id === subId);
    if (!sub) return;
    if (!window.confirm('¿Eliminar la fotografía de este servicio? El portal mostrará el marcador de marca hasta que subas otra.')) return;
    if (!studioApi.serverConfigured || studioApi.storedRole() !== 'admin' || !studioApi.currentToken()) {
      alert('Para gestionar fotografías necesitas entrar en 360studio con el PIN maestro.'); return;
    }
    setPhotoUploadBusy(true);
    try {
      const marker = /^https:\/\/.+\/storage\/v1\/object\/public\/service-images\/(.+)$/.exec(sub.imageUrl || '');
      if (marker) await studioApi.deleteServiceImage(studioApi.currentToken()!, marker[1]);
      const updated = catalog.map(c => c.id !== categoryId ? c : {
        ...c,
        subservices: c.subservices.map(s => s.id !== subId ? s : { ...s, imageUrl: undefined, imageIsAiPlaceholder: false })
      });
      setCatalog(updated);
      localStorage.setItem('lst_master_catalog', JSON.stringify(updated));
      setSavedCatalogSnapshot(JSON.stringify(updated));
      if (studioApi.serverConfigured && studioApi.storedRole() === 'admin') {
        studioApi.pushCatalog(studioApi.currentToken()!, updated).catch(() => {
          setCatalogSavedMsg('Guardado en este dispositivo. No se pudo sincronizar con el servidor: revisa tu conexión e inténtalo de nuevo.');
        });
      }
      alert('Fotografía eliminada y guardada. El portal mostrará el marcador de marca.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo eliminar la foto.');
    } finally {
      setPhotoUploadBusy(false);
    }
  };

  const catalogSavingRef = useRef(false);
  const handleSaveCatalogMaster = async () => {
    if (catalogSavingRef.current || photoUploadBusy) return;
    catalogSavingRef.current = true;
    const invalidAddon = catalog.flatMap(c=>c.subservices).find(sub=>sub.addonGroups?.some(g=>!g.title.trim() || (g.mode!=='included'&&!g.serviceIds.some(id=>catalog.some(c=>c.subservices.some(s=>s.id===id&&s.id!==sub.id&&s.active!==false))))));
    if(invalidAddon){catalogSavingRef.current=false;setCatalogSavedMsg('Revisa los complementos de '+bookingName(invalidAddon)+': cada grupo necesita nombre y opciones activas, salvo los incluidos en el pack.');return;}
    const submitted = structuredClone(catalog);
    setCatalogSavedMsg('Guardando catálogo…');
    try {
      const token = studioApi.currentToken();
      if (!studioApi.serverConfigured || !token || studioApi.storedRole() !== 'admin') {
        throw new Error('Necesitas una sesión de administración y conexión con el servidor para guardar el catálogo.');
      }
      await studioApi.pushCatalog(token, submitted);
      const verify = await studioApi.syncAll<{ catalog?: { category?: CatalogCategory }[] }>(token, ['catalog']);
      const categories = verify?.catalog?.map(row => row.category).filter(Boolean) as CatalogCategory[] | undefined;
      if (!categories || submitted.some(category => {
        const stored = categories.find(item => item.id === category.id);
        const keys = ['name', 'bookingName', 'imageUrl', 'imageIsAiPlaceholder', 'includesText', 'achievedText', 'forWhomText', 'conditionsText', 'cutAllowedIds', 'addonGroups', 'slogan', 'tonerPolicy', 'stylingPolicy', 'tonerAllowedIds', 'stylingAllowedIds', 'tonerMessage', 'stylingMessage', 'allowCutGo', 'isCutGoService', 'isStylingService', 'isTonerService', 'requiresAssessment'] as const;
        return !stored || stored.title !== category.title || (stored.portalTitle || '') !== (category.portalTitle || '') || (stored.slogan || '') !== (category.slogan || '') || (stored.imageUrl || '') !== (category.imageUrl || '') || category.subservices.some(service => {
          const saved = stored.subservices?.find(s => s.id === service.id);
          return !saved || keys.some(key => JSON.stringify(saved[key] ?? null) !== JSON.stringify(service[key] ?? null));
        });
      })) throw new Error('El servidor no ha conservado todas las fotos o condiciones de reserva. Los cambios siguen pendientes; revisa la API antes de continuar.');
      setSavedCatalogSnapshot(JSON.stringify(submitted));
      try { localStorage.setItem('lst_master_catalog', JSON.stringify(submitted)); } catch { /* optional cache */ }
      setCatalogSavedMsg('Catálogo guardado. Fotos y condiciones de reserva comprobadas en el servidor.');
    } catch (error) {
      setCatalogSavedMsg(error instanceof Error ? error.message : 'No se pudo guardar. Los cambios se conservan para reintentar.');
    } finally {
      catalogSavingRef.current = false;
    }
  };

  const [holidaysList, setHolidaysList] = useState<HolidayBlock[]>(() => {
    const saved = localStorage.getItem('lst_holidays_list');
    return saved ? readStoredValue('lst_holidays_list', saved) : [
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

  const [bookingAttempts, setBookingAttempts] = useState<{ id: string; email: string; name: string; services: string; date: string; time: string; step: string; updatedAt: string; registered?: boolean; contactedAt?: string; recoveredAt?: string; reachedDate?: boolean; reachedTime?: boolean }[]>(() => readStoredValue('lst_booking_attempts', localStorage.getItem('lst_booking_attempts') || '[]'));
  const [attemptClock, setAttemptClock] = useState(Date.now());
  useEffect(() => { localStorage.setItem('lst_booking_attempts', JSON.stringify(bookingAttempts)); }, [bookingAttempts]);
  useEffect(() => { const timer = window.setInterval(() => setAttemptClock(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  const [opportunityStatus, setOpportunityStatus] = useState<'pending' | 'contacted' | 'recovered' | 'all'>('pending');
  const [opportunitySearch, setOpportunitySearch] = useState('');
  const [opportunityPage, setOpportunityPage] = useState(1);
  const [demandFilter, setDemandFilter] = useState<'all' | 'no_slots' | 'unfinished' | 'contacted' | 'recovered'>('all');
  const [trafficEvents, setTrafficEvents] = useState<{ id: string; type: string; visitor: string; session: string; at: string; source: string }[]>(() => readStoredValue('lst_traffic_events', localStorage.getItem('lst_traffic_events') || '[]'));
  const trackTraffic = (type: string) => {
    let visitor = localStorage.getItem('lst_visitor_id');
    if (!visitor) { visitor = crypto.randomUUID(); localStorage.setItem('lst_visitor_id', visitor); }
    let session = sessionStorage.getItem('lst_session_id');
    if (!session) { session = crypto.randomUUID(); sessionStorage.setItem('lst_session_id', session); }
    const utm = new URLSearchParams(window.location.search).get('utm_source');
    const source = utm || (document.referrer ? new URL(document.referrer).hostname : 'directo');
    const record = { id: crypto.randomUUID(), type, visitor, session, at: new Date().toISOString(), source };
    setTrafficEvents(previous => [record, ...previous]);
  };
  useEffect(() => { localStorage.setItem('lst_traffic_events', JSON.stringify(trafficEvents)); }, [trafficEvents]);
  useEffect(() => { if (!sessionStorage.getItem('lst_visit_recorded')) { trackTraffic('visit'); sessionStorage.setItem('lst_visit_recorded', '1'); } }, []);
  const [compareStart, setCompareStart] = useState(() => { const date = new Date(); date.setDate(date.getDate() - 6); return formatDateKey(date); });
  const [compareEnd, setCompareEnd] = useState(() => formatDateKey(new Date()));
  const [crmView, setCrmView] = useState<'resumen' | 'clientas' | 'servicios' | 'informes'>('resumen');
  const [dashboardStart, setDashboardStart] = useState(() => { const date = new Date(); date.setDate(date.getDate() - 6); return formatDateKey(date); });
  const [dashboardEnd, setDashboardEnd] = useState(() => formatDateKey(new Date()));
  const [demandStart, setDemandStart] = useState('');
  const [demandEnd, setDemandEnd] = useState('');
  const [crmPeriod, setCrmPeriod] = useState<'hoy' | '7d' | '30d' | 'personalizado'>('7d');
  useEffect(() => { setOpportunityPage(1); }, [opportunityStatus, opportunitySearch, demandFilter, crmPeriod, demandStart, demandEnd]);
  const [lostDemandsList, setLostDemandsList] = useState<LostDemandRecord[]>(() => {
    const saved = localStorage.getItem('lst_lost_demands_detailed');
    return saved ? readStoredValue('lst_lost_demands_detailed', saved) : [
      { id: '1', date: '22/09/2026', clientName: 'Sonsoles P.', serviceName: 'Balayage & Melt & Lights', potentialValue: 95, reason: 'sin_disponibilidad', clientNote: 'Buscaba hueco en sábado por la mañana pero estaba completo.', phone: '611222333' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('lst_lost_demands_detailed', JSON.stringify(lostDemandsList));
  }, [lostDemandsList]);

  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>(() => {
    const saved = localStorage.getItem('lst_feedback_list');
    return saved ? readStoredValue('lst_feedback_list', saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('lst_feedback_list', JSON.stringify(feedbackList));
  }, [feedbackList]);

  const [detractorReplies, setDetractorReplies] = useState<{ [key: string]: string }>({});
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const feedbackSending = useRef(false);
  const feedbackRequestId = useRef<string | null>(null);
  const [feedbackError, setFeedbackError] = useState('');
  const [mailboxError, setMailboxError] = useState('');
  const [feedbackStatusBusy, setFeedbackStatusBusy] = useState<string | null>(null);
  const handleFeedbackResolution = async (fb: FeedbackRecord) => {
    if (feedbackStatusBusy) return;
    setMailboxError(''); setFeedbackStatusBusy(fb.id);
    try {
      let resolvedAt: string | undefined;
      if (fb.serverStored) {
        const token = studioApi.currentToken();
        if (!token) throw new Error('Vuelve a entrar en la intranet.');
        const result = await studioApi.updateFeedbackStatus(token, fb.id, !fb.resolvedAt);
        resolvedAt = result.resolvedAt || undefined;
      } else resolvedAt = fb.resolvedAt ? undefined : new Date().toISOString();
      setFeedbackList(previous => previous.map(item => item.id === fb.id ? { ...item, resolvedAt } : item));
    } catch (error) { setMailboxError(error instanceof Error ? error.message : 'No se pudo guardar el estado.'); }
    finally { setFeedbackStatusBusy(null); }
  };
  useEffect(() => {
    if (currentScreen !== 'adminPanel' || adminTab !== 'detractors' || !studioApi.serverConfigured || !studioApi.currentToken()) return;
    setMailboxError('');
    void syncFromServer().catch(() => setMailboxError('No se pudieron actualizar las opiniones. Vuelve a abrir el buzón.'));
  }, [currentScreen, adminTab]);

  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<'low' | 'high' | 'all'>('low');
  const [mailboxFilter, setMailboxFilter] = useState<'pending' | 'all' | 'resolved'>('pending');
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);

  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackSending.current) return;
    setFeedbackError('');
    const comment = feedbackComment.trim();
    if (!Number.isInteger(selectedRating) || selectedRating < 1 || selectedRating > 5 || comment.length > 3000) { setFeedbackError('Revisa la valoración y escribe como máximo 3000 caracteres.'); return; }
    const token = studioApi.currentToken();
    if (!studioApi.serverConfigured || !token) { setFeedbackError('Vuelve a acceder al portal para enviar tu opinión al Studio.'); return; }
    feedbackSending.current = true; setFeedbackSaving(true);
    if (!feedbackRequestId.current) feedbackRequestId.current = crypto.randomUUID();
    try {
      const result = await studioApi.submitFeedback(token, { id: feedbackRequestId.current, rating: selectedRating, comment });
      const newRecord: FeedbackRecord = {
        id: result.feedback.id, date: new Date(result.feedback.created_at).toLocaleDateString('es-ES'),
        clientName: currentClientRecord ? `${currentClientRecord.nombre} ${currentClientRecord.apellidos}`.trim() : 'Clienta',
        rating: result.feedback.rating, comment: result.feedback.comment || '', serverStored: true,
        type: result.feedback.rating <= 2 ? 'detractor' : result.feedback.rating === 3 ? 'neutral' : 'promoter',
      };
      setFeedbackList(previous => [newRecord, ...previous.filter(item => item.id !== newRecord.id)]);
      setFeedbackSubmitted(true); feedbackRequestId.current = null;
    } catch (error) { setFeedbackError(error instanceof Error ? error.message : 'No se pudo enviar tu opinión. Tu texto se conserva; inténtalo de nuevo.'); }
    finally { feedbackSending.current = false; setFeedbackSaving(false); }
  };

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('lst_studio_appointments');
    return saved ? readStoredValue('lst_studio_appointments', saved) : INITIAL_APPOINTMENTS;
  });

  useEffect(() => {
    localStorage.setItem('lst_studio_appointments', JSON.stringify(appointments));
  }, [appointments]);

  const appointmentSearchResults = appointmentSearchQuery ? appointments.filter(appointment => {
    const name = (appointment.clientName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const phone = (appointment.phone || '').replace(/[^0-9]/g, '');
    const digits = appointmentSearchQuery.replace(/[^0-9]/g, '');
    return name.includes(appointmentSearchQuery) || (!!digits && /^[+()\s\d.-]+$/.test(appointmentSearchQuery) && phone.includes(digits));
  }).sort((left, right) => (right.dateKey + right.time).localeCompare(left.dateKey + left.time)) : [];

  const [registeredAppointment, setRegisteredAppointment] = useState<Appointment | null>(null);
  const knownAppointmentIds = useRef(new Set(appointments.map(appointment => appointment.id)));
  useEffect(() => {
    const added = appointments.filter(appointment => !knownAppointmentIds.current.has(appointment.id));
    knownAppointmentIds.current = new Set(appointments.map(appointment => appointment.id));
    if (added.length) setLostDemandsList(previous => previous.map(record => record.clientEmail && added.some(item => item.email.trim().toLowerCase() === record.clientEmail) ? { ...record, recoveredAt: record.recoveredAt || new Date().toISOString() } : record));
    if (added.length) { added.forEach(() => trackTraffic('booking')); }
    if (added.length) setBookingAttempts(previous => previous.map(attempt => added.some(item => item.email.trim().toLowerCase() === attempt.email) ? { ...attempt, registered: true, recoveredAt: new Date().toISOString() } : attempt));
    if (added.length) setRegisteredAppointment(added[added.length - 1]);
  }, [appointments]);

  const [listaClientes, setListaClientes] = useState<ClientRecord[]>(() => {
    const saved = localStorage.getItem('lst_studio_clientes_ids');
    return saved ? readStoredValue('lst_studio_clientes_ids', saved) : [
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

  const [clientDetailsDraft, setClientDetailsDraft] = useState<ClientRecord | null>(null);
  const validateClientIdentity = (email: string, accessPin: string, excludeId?: number) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPin = accessPin.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return 'Introduce un email válido.';
    if (!/^\d{4}$/.test(normalizedPin)) return 'El PIN debe tener exactamente 4 números.';
    if (normalizedPin === bizConfig.masterPin) return 'El PIN de clienta no puede ser el PIN maestro.';
    if (listaClientes.some(client => client.idNum !== excludeId && normalizeEmail(client.email) === normalizedEmail)) return 'Ya existe una clienta con este email.';
    if (listaClientes.some(client => client.idNum !== excludeId && String(client.pinAcceso).trim() === normalizedPin)) return 'Este PIN ya está asignado a otra clienta. Elige otro.';
    return null;
  };
  const clientDetailsSavingRef = useRef(false);
  const saveClientDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientDetailsDraft) return;
    const original = listaClientes.find(client => client.idNum === clientDetailsDraft.idNum);
    if (!original) { alert('No encontramos la ficha original.'); return; }
    if (!clientDetailsDraft.nombre.trim()) { alert('Indica el nombre de la clienta.'); return; }
    const error = validateClientIdentity(clientDetailsDraft.email, clientDetailsDraft.pinAcceso, original.idNum);
    if (error) { alert(error); return; }
    const oldEmail = normalizeEmail(original.email);
    if (oldEmail && listaClientes.filter(client => normalizeEmail(client.email) === oldEmail).length > 1) {
      alert('Varias fichas comparten el email actual. Revisa esa duplicidad antes de actualizar las citas.'); return;
    }
    const updated = { ...original, nombre: clientDetailsDraft.nombre.trim(), apellidos: clientDetailsDraft.apellidos.trim(),
      telefono: clientDetailsDraft.telefono.trim(), email: normalizeEmail(clientDetailsDraft.email),
      pinAcceso: clientDetailsDraft.pinAcceso.trim(), fechaNacimiento: clientDetailsDraft.fechaNacimiento.trim() };
    if(clientDetailsSavingRef.current)return;
    clientDetailsSavingRef.current=true;
    try {
      const token=studioApi.currentToken();
      if(!token||!original.serverId)throw new Error('La ficha debe estar sincronizada y la sesión de administración activa.');
      await studioApi.saveClientDetailsOnServer(token,original.serverId,updated);
    }catch(error){alert(error instanceof Error?error.message:'No se pudieron guardar los datos en el servidor.');return;}
    finally{clientDetailsSavingRef.current=false;}
    setListaClientes(previous => previous.map(client => client.idNum === original.idNum ? updated : client));
    if (oldEmail) setAppointments(previous => previous.map(appointment => normalizeEmail(appointment.email) === oldEmail ? {
      ...appointment, email: updated.email, phone: updated.telefono, clientName: (updated.nombre + ' ' + updated.apellidos).trim()
    } : appointment));
    setBusquedaCliente(updated.registroId || updated.email); setClientDetailsDraft(null);
    alert('Datos y PIN guardados en el servidor. Ya puedes entrar al portal con este PIN.');
  };

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [novoNombre, setNovoNombre] = useState("");
  const [novoApellidos, setNovoApellidos] = useState("");
  const [novoNacimiento, setNovoNacimiento] = useState("");
  const [novoTelefono, setNovoTelefono] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPin, setNovoPin] = useState("");
  const [novoDiagnostico, setNovoDiagnostico] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [clientsPage, setClientsPage] = useState(1);
  const [clientStatusBusy, setClientStatusBusy] = useState<number | null>(null);
  const [clientStatusError, setClientStatusError] = useState('');
  const filteredClientRows = listaClientes.filter(client => {
    if (clientStatusFilter === 'active' && client.archivedAt) return false;
    if (clientStatusFilter === 'archived' && !client.archivedAt) return false;
    const query = busquedaCliente.trim().toLocaleLowerCase('es');
    return [client.nombre, client.apellidos, `${client.nombre} ${client.apellidos}`, client.email,
      client.telefono, client.registroId, String(client.idNum)].some(value => String(value || '').toLocaleLowerCase('es').includes(query));
  });
  const clientsPageCount = Math.max(1, Math.ceil(filteredClientRows.length / 15));
  const effectiveClientsPage = Math.min(clientsPage, clientsPageCount);
  const visibleClientRows = filteredClientRows.slice((effectiveClientsPage - 1) * 15, effectiveClientsPage * 15);
  useEffect(() => { setClientsPage(1); setExpandedClientId(null); setEditingClientId(null); }, [busquedaCliente, clientStatusFilter]);

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
  const [cancelApptModal, setCancelApptModal] = useState<Appointment | null>(null);
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null);
  const [repeatAppointmentMode, setRepeatAppointmentMode] = useState(false);
  const [newRescheduleTime, setNewRescheduleTime] = useState<string>('10:00');
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const rescheduleSavingRef = useRef(false);
  const [rescheduleError, setRescheduleError] = useState('');
  useEffect(() => { setRescheduleError(''); }, [rescheduleModalAppt?.id]);
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

  const advisorNormalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const handleRunAiRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientWishText.trim()) return;
    const query = advisorNormalize(clientWishText);
    const tokens = query.split(/[^\p{L}\p{N}]+/u).filter(token => token.length >= 3);
    const groups = [
      ['balayage', 'mechas', 'rubio', 'blond', 'highlights', 'babylights', 'luz', 'lumiere', 'licht', 'اشقر', 'خصلات'],
      ['corte', 'haircut', 'cut', 'coupe', 'taglio', 'schnitt', 'knip', 'strzyz', 'strih', 'klipp', 'قص'],
      ['color', 'colour', 'raices', 'tinte', 'farbe', 'kleur', 'kolor', 'farge', 'farg', 'صبغ'],
      ['hidrata', 'care', 'soin', 'cura', 'pflege', 'verzorg', 'pieleg', 'pece', 'pleie', 'vard', 'عناية', 'reconstru', 'salud']
    ];
    const intent = groups.filter(group => group.some(word => query.includes(word))).flat();
    const ranked = catalog.flatMap(category => category.subservices.filter(service => service.active !== false).map(service => {
      const text = advisorNormalize([service.name, serviceText(service, 'name'), service.description, serviceText(service, 'description'), category.title, categoryText(category)].join(' '));
      const score = tokens.reduce((total, token) => total + (text.includes(token) ? 2 : 0), 0) + intent.reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0);
      return { id: service.id, score };
    })).filter(item => item.score > 0).sort((left, right) => right.score - left.score).slice(0, 3);
    setAiRecommendation(ranked.map(item => item.id));
  };

  const handleGuardarNuevoCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNombre.trim()) return;
    const identityError = validateClientIdentity(novoEmail, novoPin);
    if (identityError) { alert(identityError); return; }
    const siguienteIdNum = listaClientes.length > 0 ? Math.max(...listaClientes.map(c => c.idNum || 0)) + 1 : 1;
    const idFormateado = `LSTUDIO-${String(siguienteIdNum).padStart(3, '0')}`;
    const nuevoCliente: ClientRecord = { createdAt: new Date().toISOString(),
      idNum: siguienteIdNum,
      registroId: idFormateado,
      nombre: novoNombre.trim(),
      apellidos: novoApellidos.trim() || 'Sin apellidos',
      fechaNacimiento: novoNacimiento.trim() || '01/01/1990',
      telefono: novoTelefono.trim() || 'No facilitado',
      email: normalizeEmail(novoEmail),
      pinAcceso: novoPin.trim(),
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
    const identityError = validateClientIdentity(regEmail, regPin);
    if (identityError) { alert(identityError); return; }
    const siguienteIdNum = listaClientes.length > 0 ? Math.max(...listaClientes.map(c => c.idNum || 0)) + 1 : 1;
    const idFormateado = `LSTUDIO-${String(siguienteIdNum).padStart(3, '0')}`;
    const nuevaClienta: ClientRecord = { createdAt: new Date().toISOString(),
      idNum: siguienteIdNum,
      registroId: idFormateado,
      nombre: regNombre.trim(),
      apellidos: regApellidos.trim(),
      fechaNacimiento: regNacimiento.trim(),
      telefono: regTelefono.trim(),
      email: normalizeEmail(regEmail),
      pinAcceso: regPin.trim(),
      diagnostico: 'Primera visita registrada desde app',
      ultimaVisita: 'Nuevo registro',
      proximaVisitaSugerida: 'Pendiente',
      formulasAplicadas: 'Registro inicial completado',
      dniCapilar: 'Porosidad: Media | Hidratación: En estudio',
      prescripcionCasa: 'Champú Orgánico & Cuidado Inicial'
    };
    trackTraffic('registration');
    setListaClientes([...listaClientes, nuevaClienta]);
    setCurrentClientRecord(nuevaClienta);
    setCurrentScreen('clientPortal');
  };

  const clientDeleteBusyRef = useRef(false);
  const handleDeleteClient = async (client: ClientRecord) => {
    if(clientDeleteBusyRef.current || clientStatusBusy!==null)return;
    clientDeleteBusyRef.current=true;setClientStatusBusy(client.idNum);setClientStatusError('');
    try{
      const token=studioApi.currentToken();
      if(!token||studioApi.storedRole()!=='admin'||!client.serverId)throw new Error('Necesitas una ficha sincronizada y sesión de administración.');
      const info=await studioApi.inspectClientDelete(token,client.serverId);
      if(!window.confirm(`¿Eliminar definitivamente a ${client.nombre} ${client.apellidos} (registro ${client.registroId||client.idNum})? Se borrarán ${info.appointments} citas, ${info.visits} visitas y ${info.feedback} opiniones, además de su ficha, pasaporte y accesos. No se puede deshacer.`))return;
      const result=await studioApi.deleteClientPermanently(token,client.serverId);
      if(!result.deleted)throw new Error('El servidor no confirmó la eliminación.');
      const removed = new Set((result as any).appointmentIds || []);
      setAppointments(previous=>previous.filter(item=>!item.serverId || !removed.has(item.serverId)));
      setListaClientes(previous=>previous.filter(item=>item.serverId!==client.serverId));
      setExpandedClientId(null);setEditingClientId(null);
    }catch(error){setClientStatusError(error instanceof Error?error.message:'No se pudo eliminar la ficha.');}
    finally{clientDeleteBusyRef.current=false;setClientStatusBusy(null);}
  };

  const handleClientStatus = async (client: ClientRecord) => {
    if (clientStatusBusy !== null) return;
    const archive = !client.archivedAt;
    const today = formatDateKey(new Date());
    const upcoming = appointments.filter(appointment => isActiveAppointment(appointment) && appointment.dateKey >= today &&
      (Boolean(normalizeEmail(client.email)) && normalizeEmail(appointment.email) === normalizeEmail(client.email))).length;
    const message = archive
      ? `¿Dar de baja a ${client.nombre} ${client.apellidos}? Se conservarán su ficha, citas e historial.${upcoming ? ` Tiene ${upcoming} citas futuras: NO se cancelarán.` : ''}`
      : `¿Reactivar a ${client.nombre} ${client.apellidos}? Volverá al listado de clientas activas.`;
    if (!window.confirm(message)) return;
    setClientStatusError('');
    setClientStatusBusy(client.idNum);
    try {
      let archivedAt: string | null = archive ? new Date().toISOString() : null;
      if (studioApi.serverConfigured) {
        const token = studioApi.currentToken();
        if (!token || studioApi.storedRole() !== 'admin' || !client.serverId) {
          throw new Error('La ficha debe estar sincronizada y debes acceder como administración. Vuelve a abrir Clientas e inténtalo de nuevo.');
        }
        const result = await studioApi.setClientArchived(token, client.serverId, archive);
        archivedAt = result.archivedAt;
      }
      setListaClientes(previous => previous.map(item => item.idNum === client.idNum ? { ...item, archivedAt } : item));
      setExpandedClientId(null);
      setEditingClientId(null);
    } catch (error) {
      setClientStatusError(error instanceof Error ? error.message : 'No se pudo guardar la baja. Inténtalo de nuevo.');
    } finally { setClientStatusBusy(null); }
  };

  const [timeBlocks, setTimeBlocks] = useState<{ id: string; dateKey: string; time: string; durationMinutes: number; reason: string }[]>(() => {
    try { const raw = localStorage.getItem('lst_time_blocks'); const value = raw ? JSON.parse(raw) : [];
      return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string' && typeof item.dateKey === 'string' &&
        typeof item.time === 'string' && Number.isFinite(item.durationMinutes) && item.durationMinutes > 0) : [];
    } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('lst_time_blocks', JSON.stringify(timeBlocks)); }, [timeBlocks]);
  const [slotAction, setSlotAction] = useState<{ date: Date; day: string; time: string } | null>(null);
  const [blockDuration, setBlockDuration] = useState(30);
  const [blockReason, setBlockReason] = useState('');
  const [blockMode, setBlockMode] = useState(false);
  const timeBlockConflict = (dateKey: string, time: string, duration = 1) => {
    const toMinutes = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
    const start = toMinutes(time);
    return timeBlocks.some(block => block.dateKey === dateKey &&
      start < toMinutes(block.time) + block.durationMinutes && start + duration > toMinutes(block.time));
  };
  const chooseSlotAction = (date: Date, day: string, time: string) => {
    const appt = appointments.find(item => isActiveAppointment(item) && item.dateKey === formatDateKey(date) && item.time === time);
    if (appt) { setViewApptModal(appt); return; }
    setBlockMode(false); setBlockDuration(30); setBlockReason(''); setSlotAction({ date, day, time });
  };

  const [draggedApptId, setDraggedApptId] = useState<string | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [mesNavegacion, setMesNavegacion] = useState<Date>(new Date(2026, 9, 1));
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [targetDateObj, setTargetDateObj] = useState<Date>(new Date());
  const [targetDayName, setTargetDayName] = useState<string>("");
  const [targetTime, setTargetTime] = useState<string>("");
  const [modalClientName, setModalClientName] = useState<string>("");
  const [modalClientSearch, setModalClientSearch] = useState('');
  const [adminBookingSaving, setAdminBookingSaving] = useState(false);
  const adminBookingSavingRef = useRef(false);
  const adminBookingDraftId = useRef('');
  const [quickClientMode, setQuickClientMode] = useState(false);
  const [quickClientPin, setQuickClientPin] = useState('');
  const [quickClientSurname, setQuickClientSurname] = useState('');
  const [quickClientMessage, setQuickClientMessage] = useState('');
  const saveQuickClient = () => {
    if (!modalClientName.trim()) { alert('Indica el nombre de la clienta.'); return; }
    const error = validateClientIdentity(modalEmail, quickClientPin);
    if (error) { alert(error); return; }
    const idNum = Math.max(0, ...listaClientes.map(client => client.idNum || 0)) + 1;
    const client: ClientRecord = { createdAt: new Date().toISOString(), idNum, registroId: 'LSTUDIO-' + String(idNum).padStart(3, '0'),
      nombre: modalClientName.trim(), apellidos: quickClientSurname.trim(), fechaNacimiento: '',
      telefono: modalPhone.trim(), email: normalizeEmail(modalEmail), pinAcceso: quickClientPin,
      diagnostico: 'Pendiente de diagnóstico', ultimaVisita: 'Nuevo registro', proximaVisitaSugerida: '',
      formulasAplicadas: '', dniCapilar: '', prescripcionCasa: '', pastVisits: [] };
    setListaClientes(previous => [...previous, client]);
    setModalClientName((client.nombre + ' ' + client.apellidos).trim()); setModalEmail(client.email);
    setQuickClientMode(false); setQuickClientPin(''); setQuickClientSurname('');
    setQuickClientMessage('Ficha creada: ' + client.registroId + '. Puedes continuar con los servicios.');
  };

  const [modalPhone, setModalPhone] = useState<string>("");
  const [modalEmail, setModalEmail] = useState<string>("");
  const [modalCatIndex, setModalCatIndex] = useState<number>(0);
  const [modalSubIndex, setModalSubIndex] = useState<number>(0);
  const [modalSelectedVariant, setModalSelectedVariant] = useState<ServiceVariant | null>(null);
  const [saturdayRequestModal, setSaturdayRequestModal] = useState<Appointment | null>(null);
  const [pendingBookingBusy, setPendingBookingBusy] = useState(false);
  const [pendingBookingError, setPendingBookingError] = useState('');
  const pendingBookingBusyRef = useRef(false);
  const registerSaturdayRequest = async () => {
    if (!saturdayRequestModal || pendingBookingBusyRef.current) return;
    pendingBookingBusyRef.current = true; setPendingBookingBusy(true); setPendingBookingError('');
    try {
      const saved = await persistPendingAppointment(saturdayRequestModal);
      setAppointments(previous => [...previous.filter(item => item.id !== saved.id && item.serverId !== saved.serverId), saved]);
      setRegisteredAppointment(saved);
      setBookingSuccessMsg('Solicitud enviada al Studio · Pendiente de confirmación de Ana.');
      setSelectedServicesToBook([]); setSelectedPromotionId(null); setSelectedPromotionOrigin(null); setIsModalOpen(false); setSaturdayRequestModal(null);
      setCurrentScreen('catalogBooking');
    } catch (error) {
      setPendingBookingError(error instanceof Error ? error.message : 'No se ha podido enviar la solicitud. Conservamos tus datos para reintentar.');
    } finally { pendingBookingBusyRef.current = false; setPendingBookingBusy(false); }
  };
  const [advancePaymentModal, setAdvancePaymentModal] = useState<Appointment | null>(null);
  const createAdvancePayment = () => ({ amount: parseFloat(bizConfig.depositAmount.replace(',', '.')) || 60, reference: `LS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, status: 'pending' as const });
  const advancePaymentConcept = (appointment: Appointment) => `${appointment.clientName} · Reserva anticipada · ${appointment.advancePayment?.reference || ''}`;
  useEffect(() => { setPendingBookingError(''); }, [saturdayRequestModal?.id, advancePaymentModal?.id]);
  const persistPendingAppointment = async (draft: Appointment): Promise<Appointment> => {
    const token = studioApi.currentToken();
    if (!studioApi.serverConfigured || !token) throw new Error('Necesitas conexión y una sesión válida para enviar la solicitud. Tus datos siguen aquí.');
    // Recover an earlier successful send if its response was lost; do not create a second booking.
    const before = await studioApi.syncAll<{ appointments?: Record<string, any>[]; clients?: Record<string, any>[] }>(token, ['appointments', 'clients']);
    const existing = before.appointments?.find(row => row.id === draft.serverId || String(row.source_legacy_id || '') === draft.id);
    if (existing) {
      const saved = mapServerAppointment(existing);
      if (saved.dateKey !== draft.dateKey || saved.time !== draft.time || saved.email.trim().toLowerCase() !== draft.email.trim().toLowerCase()) throw new Error('Hay una reserva con esta referencia y otros datos. Revisa Mis citas o consulta con Ana antes de reintentar.');
      return saved;
    }
    // Admin bookings must target the registered client's push subscriptions, not the admin session.
    let bookingClientId: string | null = currentClientRecord?.serverId || studioApi.storedClientId() || null;
    if (studioApi.storedRole() === 'admin') {
      const email = normalizeEmail(draft.email);
      const matches = (before.clients || []).filter(client => email && normalizeEmail(String(client.email || '')) === email);
      if (matches.length > 1) throw new Error('Hay varias fichas con este email. Revisa la clienta antes de guardar.');
      bookingClientId = matches.length === 1 ? String(matches[0].id) : null;
    }
    const result = await studioApi.createAppointmentOnServer(token, {
      id: draft.id, clientId: bookingClientId, promotionId: draft.promotion?.promotionId, promotionOriginId: draft.promotionOrigin?.id,
      dateKey: draft.dateKey, time: draft.time, dayName: draft.dayName,
      durationMinutes: draft.durationMinutes, bookingChannel: draft.bookingChannel || (studioApi.storedRole() === 'admin' ? 'admin' : 'portal'),
      approval: draft.saturdayApproval ? { status: draft.saturdayApproval.status, reason: draft.saturdayApproval.reason, reference: draft.saturdayApproval.reference } : null,
      advancePayment: draft.advancePayment ? { status: draft.advancePayment.status, amount: draft.advancePayment.amount, reference: draft.advancePayment.reference } : null,
      services: draft.services, clientName: draft.clientName, phone: draft.phone, email: draft.email,
      serviceCategory: draft.serviceCategory, serviceSubcategory: draft.serviceSubcategory,
      selectedVariant: draft.selectedVariant, remindersStatus: draft.remindersStatus,
      professionalId: draft.professionalId, professionalName: draft.professionalName,
    });
    if (!result.ok || !result.id) throw new Error('El servidor no ha confirmado el guardado. Reintenta sin cerrar esta ventana.');
    try {
      const after = await studioApi.syncAll<{ appointments?: Record<string, any>[] }>(token, ['appointments']);
      const row = after.appointments?.find(item => item.id === result.id);
      if (row) return mapServerAppointment(row);
    } catch { /* The successful POST already confirms persistence. */ }
    return { ...draft, serverId: result.id };
  };
  const savePendingAdvanceAppointment = async () => {
    if (!advancePaymentModal || pendingBookingBusyRef.current) return;
    pendingBookingBusyRef.current = true; setPendingBookingBusy(true); setPendingBookingError('');
    try {
      const saved = await persistPendingAppointment(advancePaymentModal);
      setAppointments(previous => [...previous.filter(item => item.id !== saved.id && item.serverId !== saved.serverId), saved]);
      setRegisteredAppointment(saved);
      setBookingSuccessMsg(saved.saturdayApproval?.status === 'pending' ? 'Solicitud enviada al Studio · Pendiente de confirmación de Ana.' : 'Solicitud enviada al Studio · Pendiente de comprobar el anticipo.');
      setSelectedServicesToBook([]); setSelectedPromotionId(null); setSelectedPromotionOrigin(null); setIsModalOpen(false); setCurrentScreen('catalogBooking'); setAdvancePaymentModal(null);
    } catch (error) {
      setPendingBookingError(error instanceof Error ? error.message : 'No se ha podido enviar la solicitud. Conservamos tus datos para reintentar.');
    } finally { pendingBookingBusyRef.current = false; setPendingBookingBusy(false); }
  };
  const [modalServices, setModalServices] = useState<{ categoryId: string; categoryName: string; sub: SubService; variant: ServiceVariant | null }[]>([]);
  const getModalService = () => {
    const category = catalog[modalCatIndex];
    const sub = category?.subservices[modalSubIndex];
    if (!category || !sub) return null;

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

  const selectedPromotion = bizConfig.promotions?.find(item => item.id === selectedPromotionId);
  const promotionPreview = (date = '') => {
    if (!selectedPromotionId) return { discount: null as PromotionDiscount | null, error: '' };
    try {
      return { discount: calculatePromotionDiscount(selectedPromotion, selectedServicesToBook, catalog.flatMap(cat => cat.subservices), date, madridTodayForPromotion()), error: '' };
    } catch (error) { return { discount: null as PromotionDiscount | null, error: error instanceof Error ? error.message : 'Revisa la promoción.' }; }
  };
  const madridTodayForPromotion = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const renderPromotionSummary = () => {
    if (!selectedPromotionId) return null;
    const preview = promotionPreview();
    return <section style={{ border: '1px solid #C99E52', borderRadius: 10, padding: 12, margin: '10px 0', color: '#E4C687', fontSize: 13 }}>
      <strong>Promoción: {selectedPromotion?.title || 'No disponible'}</strong>
      {preview.discount ? <p>{preview.discount.serviceName}{preview.discount.variantName ? ' · ' + preview.discount.variantName : ''}: <del>{preview.discount.originalAmount.toFixed(2)} €</del> → <strong>{preview.discount.finalAmount.toFixed(2)} €</strong> (−{preview.discount.percent} %). Los otros servicios conservan su precio.</p> : <p role="status">{preview.error}</p>}
      <button type="button" onClick={() => { setSelectedPromotionId(null); setSelectedPromotionOrigin(null); }} style={{ minHeight: 44, background: 'transparent', border: '1px solid #67543C', color: '#FFF8EE', borderRadius: 6 }}>Continuar sin promoción</button>
    </section>;
  };
  const getSelectionTotal = (items: { sub: SubService; variant: ServiceVariant | null }[]) => {
    let total = 0;
    let orientative = false;
    for (const item of items) {
      const price = String(item.variant?.price || item.sub.price || '');
      const value = exactPrice(price) ?? parseFloat(price.replace(/\./g, '').replace(',', '.').match(/\d+(\.\d+)?/)?.[0] || '');
      if (!Number.isFinite(value)) { orientative = true; continue; }
      if (/consultar|desde|aprox/i.test(price) || (item.sub.priceType && item.sub.priceType !== 'fijo')) orientative = true;
      total += value;
    }
    const discount = selectedPromotionId && items === selectedServicesToBook ? promotionPreview().discount : null;
    return { total: Math.round((total - (discount?.discountAmount || 0)) * 100) / 100, orientative };
  };

  const [viewApptModal, setViewApptModal] = useState<Appointment | null>(null);
  const [bizumSavingId, setBizumSavingId] = useState<string | null>(null);
  const [bizumSaveError, setBizumSaveError] = useState<{ id: string; message: string } | null>(null);
  const bizumSavingRef = useRef(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);
  const deletingAppointmentRef = useRef(false);
  const approvalSavingRef = useRef(false);
  const [approvalSavingId, setApprovalSavingId] = useState<string | null>(null);
  const [approvalSaveError, setApprovalSaveError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (!viewApptModal || currentScreen !== 'adminPanel') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewApptModal(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [viewApptModal?.id, currentScreen]);

  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get('cita');
    if (!target) return;
    const appt = appointments.find(item => item.id === target || item.serverId === target);
    if (appt) setViewApptModal(appt);
  }, [appointments.length]);
  const [appointmentNoteDraft, setAppointmentNoteDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const notesSavingRef = useRef(false);
  const [notesFeedback, setNotesFeedback] = useState('');
  useEffect(() => { setNotesFeedback(''); }, [viewApptModal?.id]);
  const saveAppointmentNotes = async () => {
    if (!viewApptModal || notesSavingRef.current) return;
    const appointment = viewApptModal; const note = appointmentNoteDraft;
    notesSavingRef.current = true; setNotesSaving(true); setNotesFeedback('');
    try {
      const token = studioApi.currentToken();
      if (!studioApi.serverConfigured || !token || studioApi.storedRole() !== 'admin') throw new Error('Necesitas una sesión de administración y conexión para guardar las notas.');
      const before = await studioApi.syncAll<{ appointments?: Record<string, any>[] }>(token, ['appointments']);
      const row = before.appointments?.find(item => item.id === appointment.serverId || item.id === appointment.id || String(item.source_legacy_id || '') === appointment.id);
      if (!row) throw new Error('La cita no está guardada en el servidor. Actualiza la agenda antes de reintentar.');
      await studioApi.updateAppointmentOnServer(token, { id: row.id, internalNotes: note });
      const after = await studioApi.syncAll<{ appointments?: Record<string, any>[] }>(token, ['appointments']);
      const savedRow = after.appointments?.find(item => item.id === row.id);
      if (!savedRow || String(savedRow.client_snapshot?.internalNotes || '') !== note) throw new Error('No se ha podido verificar el guardado. Conservamos tu texto; comprueba que studio-api esté actualizado y reintenta.');
      setAppointments(previous => previous.map(item => item.id === appointment.id || item.serverId === row.id ? { ...item, internalNotes: note } : item));
      setViewApptModal(current => current?.id === appointment.id ? { ...current, internalNotes: note } : current);
      setNotesFeedback('Notas guardadas en el servidor.');
    } catch (error) { setNotesFeedback(error instanceof Error ? error.message : 'No se pudieron guardar las notas. Tu texto sigue aquí.'); }
    finally { notesSavingRef.current = false; setNotesSaving(false); }
  };
  useEffect(() => { setAppointmentNoteDraft(viewApptModal?.internalNotes || ''); }, [viewApptModal?.id]);
  const [appointmentEmails, setAppointmentEmails] = useState<studioApi.AppointmentEmailRow[]>([]);
  const [appointmentEmailsLoading, setAppointmentEmailsLoading] = useState(false);
  const [appointmentEmailsError, setAppointmentEmailsError] = useState<string | null>(null);
  const whatsappStatusRequest = useRef(0);
  const pushStatusRequest = useRef(0);
  const [appointmentWhatsApp, setAppointmentWhatsApp] = useState<studioApi.AppointmentWhatsAppRow[]>([]);
  const [appointmentWhatsAppLoading, setAppointmentWhatsAppLoading] = useState(false);
  const [appointmentWhatsAppError, setAppointmentWhatsAppError] = useState<string | null>(null);
  const [appointmentPushes, setAppointmentPushes] = useState<studioApi.PushStatusRow[]>([]);
  const [appointmentPushesLoading, setAppointmentPushesLoading] = useState(false);
  const [appointmentPushesError, setAppointmentPushesError] = useState<string | null>(null);
  useEffect(() => { setAppointmentEmails([]); setAppointmentEmailsError(null); }, [viewApptModal?.id]);
  useEffect(() => {
    whatsappStatusRequest.current++; pushStatusRequest.current++;
    setAppointmentWhatsApp([]); setAppointmentWhatsAppError(null); setAppointmentWhatsAppLoading(false);
    setAppointmentPushes([]); setAppointmentPushesError(null); setAppointmentPushesLoading(false);
    return () => { whatsappStatusRequest.current++; pushStatusRequest.current++; };
  }, [viewApptModal?.id]);
  const validRecipientEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').toLowerCase().trim());
  const validRecipientPhone = (value: string) => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 15;
  };
  const whatsappStatusLabel = (status: string) => ({
    scheduled: 'Pendiente', sending: 'Enviando', sent: 'Enviado', delivered: 'Entregado', read: 'Leído', failed: 'Error', skipped: 'Anulado',
  } as Record<string, string>)[status] || status;
  const whatsappStatusColor = (status: string) => ({
    sent: '#8FC98F', delivered: '#8FC98F', read: '#8FC98F', scheduled: '#E4C687', sending: '#E4C687', failed: '#C0392B', skipped: '#8A7E6E',
  } as Record<string, string>)[status] || '#D6CBB8';
  const loadAppointmentWhatsApp = async () => {
    if (!viewApptModal) return;
    const requestId = ++whatsappStatusRequest.current;
    setAppointmentWhatsAppLoading(true); setAppointmentWhatsAppError(null);
    try {
      const token = studioApi.currentToken();
      if (!studioApi.serverConfigured || !token || studioApi.storedRole() !== 'admin') throw new Error('Inicia sesión como administradora para consultar el estado.');
      const appointmentId = viewApptModal.serverId;
      if (!appointmentId) throw new Error('Esta cita no tiene identificador del servidor. Cierra la ficha y actualiza la agenda para sincronizarla. Consultar el estado no creará otra cita.');
      const result = await statusWithTimeout(studioApi.fetchAppointmentWhatsApp(token, appointmentId));
      if (requestId !== whatsappStatusRequest.current) return;
      setAppointmentWhatsApp(Array.isArray(result.messages) ? result.messages : []);
      if (!result.messages?.length) setAppointmentWhatsAppError('El servidor no devuelve envíos de WhatsApp para esta cita. Revisa la configuración y el procesamiento de notificaciones.');
    } catch (err) {
      if (requestId === whatsappStatusRequest.current) setAppointmentWhatsAppError(err instanceof Error ? err.message : 'No se pudo consultar el estado de WhatsApp.');
    } finally {
      if (requestId === whatsappStatusRequest.current) setAppointmentWhatsAppLoading(false);
    }
  };
  const loadAppointmentPushes = async () => {
    if (!viewApptModal) return;
    const requestId = ++pushStatusRequest.current;
    setAppointmentPushesLoading(true); setAppointmentPushesError(null);
    try {
      const token = studioApi.currentToken();
      if (!studioApi.serverConfigured || !token || studioApi.storedRole() !== 'admin') throw new Error('Inicia sesión como administradora para consultar el estado.');
      const appointmentId = viewApptModal.serverId;
      if (!appointmentId) throw new Error('Esta cita no tiene identificador del servidor. Cierra la ficha y actualiza la agenda para sincronizarla. Consultar el estado no creará otra cita.');
      const result = await statusWithTimeout(studioApi.fetchAppointmentPushes(token, appointmentId));
      if (requestId !== pushStatusRequest.current) return;
      setAppointmentPushes(Array.isArray(result.pushes) ? result.pushes : []);
      if (!result.pushes?.length) setAppointmentPushesError('El servidor no devuelve envíos de push para esta cita. Revisa la configuración y el procesamiento de notificaciones.');
    } catch (err) {
      if (requestId === pushStatusRequest.current) setAppointmentPushesError(err instanceof Error ? err.message : 'No se pudo consultar el estado de push.');
    } finally {
      if (requestId === pushStatusRequest.current) setAppointmentPushesLoading(false);
    }
  };
  const pushKindLabel = (kind: string) => ({
    confirmation: 'Confirmación',
    pending: 'Solicitud pendiente',
    update: 'Modificación',
  } as Record<string, string>)[kind] || kind;
  const pushStatusLabelAdmin = (status: string) => ({
    accepted: 'Aceptado por el servicio',
    delivered: 'Entregado en el dispositivo',
    failed: 'Error',
    expired: 'Suscripción caducada',
    sending: 'Enviando',
  } as Record<string, string>)[status] || status;
  const pushStatusColorAdmin = (status: string) => ({
    accepted: '#8FC98F', delivered: '#8FC98F', failed: '#C0392B', expired: '#8A7E6E', sending: '#E4C687',
  } as Record<string, string>)[status] || '#D6CBB8';
  const emailKindLabel = (kind: string) => ({
    confirmation: 'Confirmación de reserva',
    request_received: 'Solicitud recibida',
    update: 'Actualización de cita',
    cancellation: 'Cancelación',
    reminder_48h: 'Recordatorio 48 h',
    reminder_24h: 'Recordatorio 24 h',
  } as Record<string, string>)[kind] || kind;
  const emailStatusLabel = (status: string) => ({
    scheduled: 'Programado',
    sending: 'Enviando',
    sent: 'Enviado',
    failed: 'Error',
    skipped: 'Anulado',
  } as Record<string, string>)[status] || status;
  const emailStatusColor = (status: string) => ({
    sent: '#8FC98F', scheduled: '#E4C687', sending: '#E4C687', failed: '#C0392B', skipped: '#8A7E6E',
  } as Record<string, string>)[status] || '#D6CBB8';
  const loadAppointmentEmails = async () => {
    if (!viewApptModal || !studioApi.serverConfigured || studioApi.storedRole() !== 'admin') return;
    setAppointmentEmailsLoading(true); setAppointmentEmailsError(null);
    try {
      let appointmentId = viewApptModal.serverId;
      // A local-only appointment has no UUID yet: save it first so its
      // notifications can be consulted, without inventing an identifier.
      if (!appointmentId && viewApptModal.dateKey && viewApptModal.time) {
        const created = await studioApi.createAppointmentOnServer(studioApi.currentToken()!, {
          id: viewApptModal.id,
          dateKey: viewApptModal.dateKey,
          time: viewApptModal.time,
          dayName: viewApptModal.dayName,
          durationMinutes: viewApptModal.durationMinutes,
          bookingChannel: viewApptModal.bookingChannel || 'admin',
          services: viewApptModal.services ?? [],
          clientName: viewApptModal.clientName,
          phone: viewApptModal.phone,
          email: viewApptModal.email,
          serviceCategory: viewApptModal.serviceCategory,
          serviceSubcategory: viewApptModal.serviceSubcategory,
          selectedVariant: viewApptModal.selectedVariant ?? null,
          remindersStatus: viewApptModal.remindersStatus,
        });
        appointmentId = created.id;
        const synced: Appointment = { ...viewApptModal, serverId: created.id };
        setViewApptModal(synced);
        setAppointments(previous => previous.map(item => item.id === synced.id ? synced : item));
      }
      if (!appointmentId) { setAppointmentEmails([]); return; }
      const result = await studioApi.fetchAppointmentEmails(studioApi.currentToken()!, appointmentId);
      setAppointmentEmails(Array.isArray(result.emails) ? result.emails : []);
    } catch (error) {
      setAppointmentEmails([]);
      setAppointmentEmailsError('No se pudo consultar el estado de los emails. Inténtalo de nuevo en unos segundos.');
      console.error('email-status failed:', error);
    } finally {
      setAppointmentEmailsLoading(false);
    }
  };
  const [emailConfigStatus, setEmailConfigStatus] = useState<studioApi.EmailConfigStatus | null>(null);
  const [whatsappConfigStatus, setWhatsappConfigStatus] = useState<studioApi.WhatsAppConfigStatus | null>(null);
  useEffect(() => {
    if (currentScreen !== 'adminPanel' || !studioApi.serverConfigured || studioApi.storedRole() !== 'admin') return;
    studioApi.fetchEmailConfigStatus(studioApi.currentToken()!)
      .then(status => setEmailConfigStatus(status))
      .catch(() => setEmailConfigStatus(null));
    studioApi.fetchWhatsAppConfigStatus(studioApi.currentToken()!)
      .then(status => setWhatsappConfigStatus(status))
      .catch(() => setWhatsappConfigStatus(null));
  }, [currentScreen]);
  useEffect(() => { setAppointmentNoteDraft(viewApptModal?.internalNotes || ''); }, [viewApptModal?.id]);
  const changeAppointmentStatus = async (appointment: Appointment, status: 'cancelled' | 'no_show') => {
    if (appointment.completedAt) { alert('Una visita realizada ya consta en el pasaporte.'); return; }
    if (status === 'no_show' && new Date(appointment.dateKey + 'T' + appointment.time + ':00').getTime() > Date.now()) {
      alert('La cita todavía no ha comenzado.'); return;
    }
    const alreadyCancelled = status === 'cancelled' && appointment.lifecycleStatus === 'cancelled';
    if (!alreadyCancelled) {
      if (!window.confirm(status === 'cancelled' ? '¿Marcar esta cita como cancelada y liberar su hueco?' : '¿Registrar que la clienta no se ha presentado?')) return;
      const updated = { ...appointment, internalNotes: appointmentNoteDraft, lifecycleStatus: status,
        statusChangedAt: new Date().toISOString(),
        remindersStatus: { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false } };
      if (studioApi.serverConfigured) {
        const token = studioApi.currentToken();
        if (!token || studioApi.storedRole() !== 'admin') { alert('Inicia sesión de nuevo en la intranet.'); return; }
        try {
          await studioApi.updateAppointmentOnServer(token, { id: updated.serverId || updated.id, lifecycleStatus: status });
        } catch {
          alert('No se pudo guardar el cambio. La cita no se ha marcado como cancelada ni se abrirá WhatsApp. Inténtalo de nuevo.'); return;
        }
      }
      setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
      setViewApptModal(updated);
    }
    if (status === 'cancelled' && window.confirm('¿La cancelación es por haber superado los 15 minutos de cortesía sin aviso? Aceptar abre tu mensaje en WhatsApp. Cancelar mantiene la cita cancelada sin abrir WhatsApp.')) {
      const url = cancelledWhatsAppUrl(appointment.phone);
      if (!url) { alert('La cita no tiene un teléfono válido.'); return; }
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirmCancelAppointment = (appointment: Appointment) => {
    if (appointment.lifecycleStatus === 'cancelled' || appointment.completedAt) { setCancelApptModal(null); return; }
    const updated: Appointment = { ...appointment, lifecycleStatus: 'cancelled', statusChangedAt: new Date().toISOString(),
      remindersStatus: { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false } };
    setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
    setCancelApptModal(null);
    if (studioApi.serverConfigured && studioApi.currentToken()) {
      studioApi.updateAppointmentOnServer(studioApi.currentToken()!, {
        id: updated.serverId || updated.id,
        lifecycleStatus: 'cancelled',
        clientSnapshot: {
          clientName: appointment.clientName, phone: appointment.phone, email: appointment.email,
          serviceCategory: appointment.serviceCategory, serviceSubcategory: appointment.serviceSubcategory,
          dayName: appointment.dayName, selectedVariant: appointment.selectedVariant ?? null,
          remindersStatus: updated.remindersStatus,
        },
      }).catch(() => {
        alert('No se pudo comunicar la cancelación al Studio. Inténtalo de nuevo en unos segundos o avísanos por WhatsApp.');
      });
    }
  };

  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [whatsappConsent, setWhatsappConsent] = useState<boolean>(() => {
    try { return localStorage.getItem('lst_whatsapp_consent') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('lst_whatsapp_consent', whatsappConsent ? '1' : '0'); } catch { /* sin espacio se recoge de nuevo */ }
    if (studioApi.serverConfigured && studioApi.currentToken() && studioApi.storedRole() === 'client') {
      studioApi.saveWhatsAppConsent(studioApi.currentToken()!, whatsappConsent).catch(() => undefined);
    }
  }, [whatsappConsent]);

  // ---------- Notificaciones push ----------
  const urlBase64ToUint8Array = (base64: string): Uint8Array => {
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const decoded = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
    return bytes;
  };
  const [pushStatus, setPushStatus] = useState<'unsupported' | 'config-pending' | 'denied' | 'subscribed' | 'default'>('default');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushPanelOpen, setPushPanelOpen] = useState(false);
  const [pushNeedsLogin, setPushNeedsLogin] = useState(false);
  const [pushLoginPin, setPushLoginPin] = useState('');
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushTestResult, setPushTestResult] = useState<string | null>(null);
  const refreshPushStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setPushStatus('unsupported'); return; }
    if (Notification.permission === 'denied') { setPushStatus('denied'); return; }
    try {
      const registration = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('No se ha podido iniciar el servicio de notificaciones. Recarga la app y reintenta.')), 12000))]);
      const existing = await registration.pushManager.getSubscription();
      if (existing && Notification.permission === 'granted' && studioApi.currentToken()) {
        await persistPushSubscription(existing);
        setPushNeedsLogin(false);
        setPushStatus('subscribed'); return;
      }
    } catch { /* el service worker aún no está listo */ }
    setPushStatus(Notification.permission === 'granted' ? 'default' : 'default');
  };
  useEffect(() => { refreshPushStatus(); }, [currentScreen, currentClientRecord?.serverId]);
  const persistPushSubscription = async (subscription: PushSubscription) => {
    if (!studioApi.serverConfigured || !studioApi.currentToken()) throw new Error('Inicia sesión en el portal para activar las notificaciones.');
    const json = subscription.toJSON();
    await studioApi.subscribePush(studioApi.currentToken()!, {
      endpoint: String(json.endpoint || ''),
      keys: { p256dh: String(json.keys?.p256dh || ''), auth: String(json.keys?.auth || '') },
      userAgent: navigator.userAgent,
    });
  };
  const handleEnablePush = async () => {
    setPushBusy(true); setPushError(null); setPushTestResult(null);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setPushStatus('unsupported'); setPushError('Este navegador no admite notificaciones push. Prueba en Chrome, Edge o Safari actualizado.'); return;
      }
      if (!studioApi.currentToken()) { setPushNeedsLogin(true); throw new Error('Inicia sesión en el portal para activar las notificaciones.'); }
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') { setPushStatus(permission === 'denied' ? 'denied' : 'default'); setPushError('Para recibir avisos debes conceder permiso en tu dispositivo.'); return; }
      const registration = await navigator.serviceWorker.register('/sw.js');
      await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('No se ha podido iniciar el servicio de notificaciones. Recarga la app y reintenta.')), 12000))]);
      const existing = await registration.pushManager.getSubscription();
      const vapid = await studioApi.fetchPushPublicKey(studioApi.currentToken()!);
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey) as unknown as ArrayBuffer,
      });
      // 1) Permiso concedido; 2) suscripción registrada en el servidor;
      // 3) envío de prueba aceptado. Solo se marca "subscribed" tras el paso 2.
      await persistPushSubscription(subscription);
      setPushStatus('subscribed');
      setPushNeedsLogin(false);
      try {
        const test = await studioApi.sendTestPush(studioApi.currentToken()!);
        setPushTestResult(test.sent > 0
          ? 'Avisos activados. El servidor ha aceptado el envío de prueba; comprueba si llega a tu dispositivo.'
          : (test.errors?.[0] || 'Avisos activados en este dispositivo.'));
      } catch (testError) {
        const testMessage = testError instanceof Error ? testError.message : '';
        setPushTestResult(testMessage.includes('VAPID')
          ? 'Avisos activados en este dispositivo. Falta configurar el envío en el servidor del Studio.'
          : 'Avisos activados en este dispositivo. La notificación de prueba no se pudo enviar.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron activar las notificaciones.';
      if (message.includes('Falta autenticación') || message.includes('Sesión caducada') || message.includes('Inicia sesión')) {
        setPushStatus('default');
        setPushNeedsLogin(true);
        setPushError('Tu sesión ha caducado. Inicia sesión de nuevo con tu PIN y vuelve a pulsar «Activar notificaciones de mi cita»; no perderás los servicios seleccionados.');
      } else {
        setPushError(message);
      }
    } finally { setPushBusy(false); }
  };
  const handlePushLogin = async () => {
    if (!/^\d{4}$/.test(pushLoginPin)) return;
    setPushBusy(true); setPushError(null);
    try {
      const previousClientId = studioApi.storedClientId() || currentClientRecord?.serverId;
      const result = await studioApi.authenticate(pushLoginPin);
      setPushLoginPin('');
      if (result.role !== 'client' || (previousClientId && result.clientId !== previousClientId)) {
        studioApi.clearStoredToken();
        throw new Error('Usa el PIN de la clienta de esta reserva.');
      }
      setPushNeedsLogin(false);
      setPushStatus('default');
      setPushError('Sesión recuperada. Pulsa «Activar notificaciones de mi cita» para continuar.');
    } catch (error) {
      setPushLoginPin('');
      setPushError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally { setPushBusy(false); }
  };
  const pushStatusLabel = () => ({
    unsupported: 'No disponibles en este navegador',
    'config-pending': 'Pendiente de configuración del Studio',
    denied: 'Permiso bloqueado · Actívalas en los ajustes del navegador',
    subscribed: 'Activadas en este dispositivo',
    default: 'Desactivadas en este dispositivo',
  } as Record<string, string>)[pushStatus];

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

  const handleClientPinSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(pin)) return;
          const clientMatch = listaClientes.find(c => String(c.pinAcceso ?? '').trim() === pin);
          if (studioApi.serverConfigured && !clientMatch && pin !== bizConfig.masterPin) {
            const enteredPin = pin;
            (async () => {
              try {
                await studioApi.authenticate(enteredPin);
                await syncFromServer();
                setPinError(false);
                setPin("");
                setAppVisitsCount(prev => prev + 1);
                setFeedbackSubmitted(false);
                if (studioApi.storedRole() === 'admin') {
                  setCurrentScreen('adminPanel');
                } else {
                  const record = listaClientes.find(client => String(client.pinAcceso).trim() === enteredPin)
                    || currentClientRecord;
                  if (record) { setCurrentClientRecord(record); trackTraffic('login'); }
                  setCurrentScreen('clientPortal');
                }
              } catch { setPinError(true); setPin(""); setTimeout(() => setPinError(false), 2000); }
            })();
            return;
          }
          if (clientMatch || pin === bizConfig.masterPin) {
            const enteredPin = pin;
            const matched = clientMatch;
            setPinError(false);
            setPin("");
            setAppVisitsCount(prev => prev + 1);
            setFeedbackSubmitted(false);
            const finishLocalLogin = () => {
              if (matched) {
                setCurrentClientRecord(matched);
                trackTraffic('login');
                setCurrentScreen('clientPortal');
              } else {
                setAdminPin("");
                setAdminError(false);
                setCurrentScreen('adminPanel');
              }
            };
            if (studioApi.serverConfigured) {
              // Entrar con PIN también crea una sesión válida en el servidor,
              // necesaria para registrar la suscripción push.
              (async () => {
                try {
                  await studioApi.authenticate(enteredPin);
                } catch {
                  studioApi.clearStoredToken();
                  setPinError(true);
                  return;
                }
                await syncFromServer().catch(() => undefined);
                finishLocalLogin();
              })();
            } else {
              finishLocalLogin();
            }
          } else {
            setPinError(true);
            setPin("");
            setTimeout(() => setPinError(false), 2000);
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

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminLoginBusy) return;
    const enteredPin = adminPin.trim();
    setAdminError(false); setAdminLoginMessage('');
    if (!/^\d{4}$/.test(enteredPin)) { setAdminError(true); setAdminLoginMessage('Introduce los cuatro números del PIN maestro.'); return; }
    if (!studioApi.serverConfigured) {
      if (enteredPin === String(bizConfig.masterPin)) { setCurrentScreen('adminPanel'); setAdminPin(''); }
      else { setAdminError(true); setAdminLoginMessage('El PIN no coincide con la configuración de este dispositivo.'); }
      return;
    }
    setAdminLoginBusy(true);
    try {
      const result = await statusWithTimeout(studioApi.authenticate(enteredPin));
      if (result.role !== 'admin') { studioApi.clearStoredToken(); throw new Error('Este PIN corresponde a un acceso de clienta, no a la intranet.'); }
    } catch (error) {
      setAdminError(true);
      const detail = error instanceof Error ? error.message : '';
      setAdminLoginMessage(/failed to fetch|network|fetch|conexi|15 segundos/i.test(detail) ? 'No se pudo conectar con el servidor. Comprueba la conexión y vuelve a intentarlo.' : (detail || 'El servidor no ha aceptado el PIN maestro.'));
      setAdminLoginBusy(false);
      return;
    }
    // Authentication has succeeded. A data-loading failure is not an invalid PIN.
    setAdminPin(''); setCurrentScreen('adminPanel');
    try { await statusWithTimeout(syncFromServer()); }
    catch { setSavedMsg(null); setSaveState('error'); setSaveErrorMsg('Acceso correcto. No se han podido actualizar los datos del servidor. Recarga la app antes de modificar o guardar datos.'); alert('El PIN es correcto, pero no se han podido cargar los datos actualizados. Recarga la app antes de modificar o guardar datos.'); }
    finally { setAdminLoginBusy(false); }
  };

  const mapServerAppointment = (row: Record<string, any>): Appointment => {
    const iso = String(row.starts_at || '');
    const snap = (row.client_snapshot || {}) as Record<string, any>;
    const appointment: Appointment = {
      id: row.source_legacy_id || row.id,
      serverId: row.id,
      clientId: row.client_id ?? null,
      dateKey: iso.slice(0, 10),
      dayName: snap.dayName || '',
      time: iso.slice(11, 16),
      durationMinutes: row.duration_minutes ?? 45,
      internalNotes: typeof snap.internalNotes === 'string' ? snap.internalNotes : '',
      clientName: snap.clientName || '',
      phone: snap.phone || '',
      email: snap.email || '',
      serviceCategory: snap.serviceCategory || '',
      serviceSubcategory: row.legacy_service_text || snap.serviceSubcategory || '',
      selectedVariant: snap.selectedVariant ?? null,
      services: Array.isArray(row.services) ? row.services : undefined,
      remindersStatus: { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false, ...(snap.remindersStatus || {}) },
      professionalId: row.professional_id ?? null,
      professionalName: row.professional_name ?? null,
      promotion: snap.promotion || undefined,
      promotionOrigin: snap.promotionOrigin || undefined,
    };
    if (row.lifecycle_status) appointment.lifecycleStatus = row.lifecycle_status as Appointment['lifecycleStatus'];
    if (['pending', 'accepted', 'rejected'].includes(String(row.approval_status))) {
      appointment.saturdayApproval = { status: row.approval_status, reason: row.approval_reason, reference: row.approval_reference || '' } as Appointment['saturdayApproval'];
    }
    if (['pending', 'confirmed', 'received', 'paid'].includes(String(row.deposit_status))) {
      appointment.advancePayment = {
        status: row.deposit_status === 'pending' ? 'pending' : 'confirmed',
        amount: Number(row.deposit_amount) || 0,
        reference: row.deposit_reference || ''
      };
    }
    if (row.completed_at) appointment.completedAt = row.completed_at;
    return appointment;
  };

  const syncFromServer = async (): Promise<Record<string, any> | null> => {
    if (!studioApi.serverConfigured || !studioApi.currentToken()) return null;
    const data = await studioApi.syncAll<Record<string, any>>(studioApi.currentToken()!);
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data.catalog) && data.catalog.length) {
      const serverCatalog = (data.catalog
        .map((row: { category?: CatalogCategory }) => row?.category)
        .filter(Boolean) as CatalogCategory[])
        .map(category => ({
          ...category,
          subservices: (category.subservices || []).map(sub => {
            const seed = SERVICE_AI_IMAGES[sub.id];
            return withConsultationPhoto(seed ? { ...seed, ...sub } : sub);
          }),
        }));
      if (serverCatalog.length) {
        setCatalog(serverCatalog);
        localStorage.setItem('lst_master_catalog', JSON.stringify(serverCatalog));
        setSavedCatalogSnapshot(JSON.stringify(serverCatalog));
      }
    }
    if (data.settings && typeof data.settings === 'object') {
      const merged = { ...bizConfigRef.current, ...data.settings } as BusinessConfig;
      // Preserve the draft when a background sync completes during editing or saving.
      const pristine = configEqual(configDraftRef.current, configBaselineRef.current);
      setBizConfig(merged);
      bizConfigRef.current = merged;
      if (pristine && !configSavingRef.current) {
        configBaselineRef.current = structuredClone(merged);
        configDraftRef.current = structuredClone(merged);
        setTempConfigState(configDraftRef.current);
      }
    }
    if (Array.isArray(data.closures)) {
      setHolidaysList(data.closures.map((c: Record<string, any>) => ({
        id: String(c.id), startDate: c.start_date || '', endDate: c.end_date || '',
        type: c.type === 'festivo' ? 'festivo' : 'vacaciones', reason: c.reason || '',
      })));
    }
    if (Array.isArray(data.timeBlocks)) {
      setTimeBlocks(data.timeBlocks.map((b: Record<string, any>) => {
        const iso = String(b.starts_at || '');
        return { id: String(b.id), dateKey: iso.slice(0, 10), time: iso.slice(11, 16) || '00:00', durationMinutes: 30, reason: b.reason || '' };
      }));
    }
    if (Array.isArray(data.appointments) && data.appointments.length) {
      const serverAppointments = data.appointments.map(mapServerAppointment);
      serverAppointments.forEach(item => knownAppointmentIds.current.add(item.id));
      setAppointments(previous => {
        const byId = new Map(previous.map(item => [item.id, item]));
        serverAppointments.forEach(item => byId.set(item.id, item));
        return Array.from(byId.values());
      });
    }
    if (Array.isArray(data.clients) && data.clients.length) {
      const serverClients = data.clients.map((c: Record<string, any>): ClientRecord => ({
        archivedAt: c.archived_at ?? null,
        createdAt: c.created_at,
        serverId: c.id,
        idNum: Number(c.legacy_id) || 0,
        registroId: c.registration_id || '',
        nombre: c.first_name || '',
        apellidos: c.last_name || '',
        fechaNacimiento: c.birth_date || '',
        telefono: c.phone || '',
        email: c.email || '',
        pinAcceso: String(c.legacy_id ?? ''),
        diagnostico: c.passport?.hair_diagnosis || 'Diagnóstico inicial pendiente',
        ultimaVisita: c.passport?.last_visit_text || 'Nuevo registro',
        proximaVisitaSugerida: c.passport?.next_visit_text || 'Pendiente de agendar',
        formulasAplicadas: c.notes?.formulas || 'Sin fórmulas registradas',
        dniCapilar: c.passport?.hair_diagnosis || '',
        prescripcionCasa: c.passport?.home_care || '',
        pastVisits: (c.visits || []).map((v: Record<string, any>) => ({
          date: v.visit_date || '', service: v.service || '', stylist: v.stylist || '', notes: v.shared_notes || '',
        })),
      }));
      setListaClientes(previous => {
        const byId = new Map(previous.map(client => [client.idNum, client]));
        serverClients.forEach(client => { if (client.idNum) byId.set(client.idNum, client); });
        return Array.from(byId.values()).sort((left, right) => left.idNum - right.idNum);
      });
      if (Array.isArray(data.feedback)) {
        const nameByClientId = new Map(data.clients.map((c: Record<string, any>) => [c.id, `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Clienta']));
        const serverFeedback: FeedbackRecord[] = data.feedback.map((f: Record<string, any>) => ({
          id: String(f.id),
          date: String(f.created_at || '').slice(0, 10).split('-').reverse().join('/'),
          clientName: f.client_id ? (nameByClientId.get(f.client_id) || 'Clienta') : 'Clienta Verificada',
          rating: f.rating ?? 5,
          comment: f.comment || '',
          type: (f.rating ?? 5) <= 2 ? 'detractor' : (f.rating ?? 5) === 3 ? 'neutral' : 'promoter',
          resolvedAt: f.resolved_at || undefined,
          serverStored: true,
        }));
        {
          setFeedbackList(previous => {
            const byId = new Map(previous.filter(item => !item.serverStored).map(item => [item.id, item]));
            serverFeedback.forEach(item => byId.set(item.id, item));
            return Array.from(byId.values());
          });
        }
      }
    }
    if (data.role === 'client' && data.me) {
      const c = data.me;
      const record: ClientRecord = {
        archivedAt: c.archived_at ?? null,
        createdAt: c.created_at,
        serverId: c.id,
        idNum: Number(c.legacy_id) || 0,
        registroId: c.registration_id || '',
        nombre: c.first_name || '',
        apellidos: c.last_name || '',
        fechaNacimiento: c.birth_date || '',
        telefono: c.phone || '',
        email: c.email || '',
        pinAcceso: String(c.legacy_id ?? ''),
        diagnostico: data.passport?.hair_diagnosis || 'Diagnóstico inicial pendiente',
        ultimaVisita: data.passport?.last_visit_text || 'Nuevo registro',
        proximaVisitaSugerida: data.passport?.next_visit_text || 'Pendiente de agendar',
        formulasAplicadas: 'Sin fórmulas registradas',
        dniCapilar: data.passport?.hair_diagnosis || '',
        prescripcionCasa: data.passport?.home_care || '',
        pastVisits: (data.visits || []).map((v: Record<string, any>) => ({
          date: v.visit_date || '', service: v.service || '', stylist: v.stylist || '', notes: v.shared_notes || '',
        })),
      };
      setListaClientes(previous => {
        const without = previous.filter(client => client.idNum !== record.idNum);
        return [...without, record].sort((left, right) => left.idNum - right.idNum);
      });
      setCurrentClientRecord(record);
    }
    return data;
  };

  useEffect(() => {
    if (studioApi.serverConfigured && studioApi.currentToken() && studioApi.storedRole()) {
      syncFromServer().catch(() => undefined);
    } else if (studioApi.serverConfigured) {
      studioApi.fetchPublicCatalog<{ catalog: { category?: CatalogCategory }[]; employees?: { id: string; name: string; role: string; photo: string; status: string }[] }>().then(data => {
        if (Array.isArray(data?.employees) && data.employees.length) {
          setBizConfig(prev => {
            const merged = { ...prev, employees: data.employees as any };
            bizConfigRef.current = merged;
            return merged;
          });
        }
        if (!Array.isArray(data?.catalog) || !data.catalog.length) return;
        const serverCatalog = (data.catalog
          .map(row => row?.category)
          .filter(Boolean) as CatalogCategory[])
          .map(category => ({
            ...category,
            subservices: (category.subservices || []).map((sub: SubService) => {
              const seed = SERVICE_AI_IMAGES[sub.id];
              return withConsultationPhoto(seed ? { ...seed, ...sub } : sub);
            }),
          }));
        if (!serverCatalog.length) return;
        setCatalog(serverCatalog);
        localStorage.setItem('lst_master_catalog', JSON.stringify(serverCatalog));
        setSavedCatalogSnapshot(JSON.stringify(serverCatalog));
      }).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configHasPendingChanges = !configEqual(tempConfig, configBaselineRef.current);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!configEqual(configDraftRef.current, configBaselineRef.current)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const handleSaveSection = async (sectionName: string) => {
    if (configSavingRef.current) return;
    if (logoUploadRef.current) { alert('Espera a que termine de subir el logo.'); return; }
    if (employeePhotoBusyRef.current) { alert('Espera a que termine de subir la foto.'); return; }
    if ((configDraftRef.current.employees || []).some(employee => !employee.name.trim())) { alert('Escribe el nombre de cada empleado antes de guardar.'); return; }
    if (configSubTab === 'backup') {
      if (!/^\d{4}$/.test(tempConfig.masterPin)) { alert('El PIN maestro debe tener exactamente 4 números.'); return; }
      if (listaClientes.some(client => String(client.pinAcceso).trim() === tempConfig.masterPin)) {
        alert('Este PIN maestro ya pertenece a una clienta. Elige otro.'); return;
      }
    }
    if (configSubTab === 'reservas' && (!Number.isFinite(tempConfig.advancePaymentThresholdMinutes) || tempConfig.advancePaymentThresholdMinutes < 0 || !Number.isFinite(parseFloat(tempConfig.depositAmount.replace(',', '.'))) || parseFloat(tempConfig.depositAmount.replace(',', '.')) <= 0)) { alert('Revisa el importe y la duración de la reserva anticipada.'); return; }
    const submittedDraft = structuredClone(configDraftRef.current);
    const normalizedConfig = normalizeOpeningHours(submittedDraft);
    const changedKeys = (Object.keys(normalizedConfig) as (keyof BusinessConfig)[])
      .filter(key => !configEqual(normalizedConfig[key], configBaselineRef.current[key]));
    configSavingRef.current = true;
    setSavedMsg(null);
    setSaveErrorMsg(null);
    setSaveState('saving');
    try {
      const token = studioApi.currentToken();
      if (!studioApi.serverConfigured) throw new Error('Servidor no configurado. No se han guardado los cambios.');
      if (!token || studioApi.storedRole() !== 'admin') throw new Error('Se necesita una sesión de administración válida. Vuelve a iniciar sesión con el PIN maestro.');
      // Read the latest settings before merging to preserve unrelated server values.
      const before = await studioApi.syncAll<Record<string, any>>(token, ['settings']);
      if (!before?.settings || typeof before.settings !== 'object') throw new Error('No se pudo leer la configuración del servidor.');
      const toSave = { ...bizConfigRef.current, ...before.settings } as BusinessConfig;
      for (const key of changedKeys) (toSave as any)[key] = normalizedConfig[key];
      await studioApi.pushSettings(token, toSave);
      const verify = await studioApi.syncAll<Record<string, any>>(token, ['settings']);
      const reloaded = verify?.settings;
      if (!reloaded || typeof reloaded !== 'object') throw new Error('El servidor no devolvió la configuración guardada.');
      if (changedKeys.some(key => !configEqual(reloaded[key], normalizedConfig[key]))) {
        throw new Error('El servidor no conservó todos los ajustes modificados. Lo editado se conserva para reintentar.');
      }
      const confirmed = { ...toSave, ...reloaded } as BusinessConfig;
      bizConfigRef.current = confirmed;
      configBaselineRef.current = structuredClone(confirmed);
      setBizConfig(confirmed);
      // Keep any new edits typed while the request was in flight.
      const latest = configDraftRef.current;
      const nextDraft = structuredClone(confirmed);
      for (const key of Object.keys(latest) as (keyof BusinessConfig)[]) {
        if (!configEqual(latest[key], submittedDraft[key])) (nextDraft as any)[key] = latest[key];
      }
      configDraftRef.current = nextDraft;
      setTempConfigState(nextDraft);
      try { localStorage.setItem('lst_business_config', JSON.stringify(confirmed)); } catch { /* Server persistence succeeded; browser cache is optional. */ }
      setSaveState('saved');
      setSavedMsg(`¡${sectionName} guardados correctamente!`);
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (error) {
      setSaveState('error');
      setSaveErrorMsg(error instanceof Error && error.message ? error.message : 'No se pudo guardar en el servidor. Tus cambios se conservan aquí para reintentar.');
    } finally {
      configSavingRef.current = false;
    }
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
    const moving = appointments.find(a => a.id === id);
    if (!moving || !isActiveAppointment(moving)) return;
    if (!enableOutOfHours && !isAgendaTimeWorking(targetDate, time, moving.durationMinutes || 45)) {
      alert('La cita completa debe estar dentro del horario laboral.'); return;
    }
    if (timeBlockConflict(targetDateKey, time, moving.durationMinutes || 45)) { alert('Este periodo está bloqueado.'); return; }
    const existing = getRescheduleConflict(moving, targetDateKey, time);
    if (existing && !enableDoubleBooking) {
      window.alert('Ese hueco horario ya está ocupado. Activa la "Doble reserva" en el panel lateral si deseas permitir solapes.');
      return;
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, dateKey: targetDateKey, dayName, time } : a));
    setDraggedApptId(null);
  };

  const handleCellClick = (targetDate: Date, dayName: string, time: string) => {
    if (adminBookingSavingRef.current) return;
    adminBookingDraftId.current = '';
    const targetDateKey = formatDateKey(targetDate);
    if (isDateBlockedByHoliday(targetDateKey)) {
      window.alert('Este día es festivo o de vacaciones. Está bloqueado en la agenda.');
      return;
    }
    const existing = appointments.find(a => isActiveAppointment(a) && a.dateKey === targetDateKey && a.time === time);
    if (existing && !enableDoubleBooking) {
      setViewApptModal(existing);
      return;
    }
    if (!enableOutOfHours && !isAgendaTimeWorking(targetDate, time)) { alert('Este hueco está fuera del horario laboral.'); return; }
    if (timeBlockConflict(targetDateKey, time)) { alert('Este periodo está bloqueado.'); return; }
    setEditingAppointment(null);
    setTargetDateObj(targetDate);
    setTargetDayName(dayName);
    setTargetTime(time);
    setModalClientSearch(''); setQuickClientMode(false); setQuickClientPin(''); setQuickClientSurname(''); setQuickClientMessage('');
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
  const latestSub = (sub: SubService) => catalog.flatMap(c => c.subservices).find(s => s.id === sub.id) || sub;
  const finishPolicy = (sub: SubService, kind: FinishKind) => sub.addonGroups !== undefined ? undefined : kind === 'styling' ? sub.stylingPolicy : sub.tonerPolicy;
  const isFinish = (sub: SubService, kind: FinishKind) => kind === 'styling' ? !!sub.isStylingService : !!sub.isTonerService;
  const finishCandidates = (owner: SubService, kind: FinishKind) => {
    const ids = kind === 'styling' ? owner.stylingAllowedIds : owner.tonerAllowedIds;
    return catalog.flatMap(c => c.subservices).filter(candidate =>
      candidate.id !== owner.id && candidate.active !== false && isFinish(candidate, kind) &&
      (!candidate.isCutGoService || kind === 'styling' && owner.allowCutGo) &&
      (ids === undefined || ids.includes(candidate.id))
    );
  };
  const getFinishError = (items: { sub: SubService; variant: ServiceVariant | null }[], kind: FinishKind): string | null => {
    const label = kind === 'styling' ? 'peinado' : 'matiz';
    const current = items.map(item => ({ ...item, sub: latestSub(item.sub) }));
    if (kind === 'styling' && current.some(i => i.sub.isCutGoService) && current.some(i => i.sub.isStylingService && !i.sub.isCutGoService)) return 'Elige peinado o Cut & Go. No se pueden cobrar ambas modalidades en la misma reserva.';
    // Cada complemento puede cubrir varios servicios únicamente si está permitido en todos ellos.
    for (const item of current) {
      if (isFinish(item.sub, kind) || finishPolicy(item.sub, kind) !== 'required') continue;
      const candidates = finishCandidates(item.sub, kind);
      if (!candidates.length) return `Ana debe configurar las opciones de ${label} para «${bookingName(item.sub)}». Contacta con el estudio antes de reservar.`;
      if (!current.some(selected => candidates.some(c => c.id === selected.sub.id)))
        return `Completa «${bookingName(item.sub)}»: selecciona ${label === 'peinado' && item.sub.allowCutGo ? 'peinado o Cut & Go compatible' : 'un ' + label + ' compatible'} antes de elegir fecha y hora.`;
    }
    for (const item of current.filter(i => isFinish(i.sub, kind))) {
      const duration = item.variant?.duration || item.sub.duration;
      if (!/\d/.test(duration || '') || parseFloat(duration) <= 0) return `Ana debe configurar una duración válida para «${bookingName(item.sub)}» antes de reservar.`;
      if (item.sub.hasVariants && item.sub.variants?.length && (!item.variant || !item.sub.variants.some(v => v.id === item.variant?.id)))
        return `Selecciona el largo o variante de «${bookingName(item.sub)}».`;
      if (item.sub.isCutGoService && !current.some(parent => !parent.sub.isStylingService && parent.sub.allowCutGo && finishCandidates(parent.sub, 'styling').some(c => c.id === item.sub.id)))
        return 'Cut & Go debe acompañar a un servicio que permita esta modalidad.';
      const owners = current.filter(i => !isFinish(i.sub, kind));
      const relevant = owners.filter(i => finishPolicy(i.sub, kind) === 'required' || finishPolicy(i.sub, kind) === 'optional');
      if (relevant.length && !relevant.some(owner => finishCandidates(owner.sub, kind).some(c => c.id === item.sub.id)))
        return `«${bookingName(item.sub)}» no es un complemento compatible con los servicios elegidos.`;
      if (owners.length && !relevant.length && owners.every(i => finishPolicy(i.sub, kind) === 'included'))
        return `El ${label} ya está incluido en los servicios elegidos. Retira el complemento adicional para evitar duplicarlo.`;
    }
    return null;
  };
  useEffect(()=>{
    if(currentScreen!=='serviceDetail'||!viewServiceDetail)return;
    const sub=catalog.flatMap(c=>c.subservices).find(s=>s.id===viewServiceDetail.sub.id);
    if(!sub?.addonGroups?.length)return;
    setSelectedServicesToBook(previous=>previous.map(item=>item.sub.id===sub.id?{...item,sub:{...sub,hasVariants:false,variants:undefined},variant:null}:item));
  },[currentScreen,viewServiceDetail?.sub.id,catalog]);
  const getStylingError = (items: { sub: SubService; variant: ServiceVariant | null }[]) => addonError(items, catalog) || getFinishError(items, 'styling');
  const previewService = catalog.flatMap(category => category.subservices).find(sub => sub.id === previewServiceId);
  const getInactiveServiceError = (items: { sub: SubService }[]) => {
    const unavailable = items.filter(item => {
      const current = catalog.flatMap(category => category.subservices).find(sub => sub.id === item.sub.id);
      return !current || current.active === false;
    });
    return unavailable.length ? `Estos servicios ya no están disponibles para nuevas reservas: ${unavailable.map(item => bookingName(item.sub)).join(', ')}. Retíralos y selecciona otra opción.` : null;
  };
  const getApprovalReason = (items: { sub: SubService }[], dateKey: string): 'saturday' | 'assessment' | 'both' | null => {
    const saturday = new Date(`${dateKey}T12:00:00`).getDay() === 6;
    const assessment = items.some(item => (catalog.flatMap(category => category.subservices).find(sub => sub.id === item.sub.id) || item.sub).requiresAssessment);
    return saturday && assessment ? 'both' : assessment ? 'assessment' : saturday ? 'saturday' : null;
  };
  const approvalTitle = (reason?: 'saturday' | 'assessment' | 'both') => reason === 'assessment' ? 'Valoración previa' : reason === 'both' ? 'Valoración previa y sábado' : 'Sábado';

  const getTonerError = (items: { sub: SubService; variant: ServiceVariant | null }[]) => getFinishError(items, 'toner');
  const finishLabel = (sub: SubService, kind: FinishKind) => {
    const label = kind === 'styling' ? 'Peinado' : 'Matiz';
    if (isFinish(sub, kind)) return sub.isCutGoService ? 'Cut & Go · Sin secado' : 'Complemento de ' + label.toLowerCase();
    const policy = finishPolicy(sub, kind);
    if (policy === 'included') return label + ' incluido en precio y duración';
    if (policy === 'required') return label + (kind === 'styling' && sub.allowCutGo ? ' o Cut & Go obligatorio · Se cobra aparte' : ' obligatorio · Se cobra aparte');
    if (policy === 'optional') return label + ' opcional · Se cobra aparte';
    if (policy === 'not_applicable') return label + ' no necesario para este servicio';
    return '';
  };
  const tonerLabel = (sub: SubService) => finishLabel(sub, 'toner');
  const stylingLabel = (sub: SubService) => finishLabel(sub, 'styling');
  const selectFinish = (owner: SubService, kind: FinishKind, sub: SubService, variant: ServiceVariant | null) => {
    setSelectedServicesToBook(previous => {
      const allowed = finishCandidates(owner, kind).map(s => s.id);
      // Sustituye la opción del mismo requisito; conserva complementos necesarios para otros servicios.
      const next = previous.filter(item => item.sub.id !== sub.id && (!allowed.includes(item.sub.id) || previous.some(other =>
        other.sub.id !== owner.id && !isFinish(latestSub(other.sub), kind) && finishPolicy(latestSub(other.sub), kind) === 'required' &&
        finishCandidates(latestSub(other.sub), kind).some(c => c.id === item.sub.id) &&
        !finishCandidates(latestSub(other.sub), kind).some(c => c.id === sub.id)
      )));
      return [...next, { sub, variant }];
    });
  };
  const renderFinishChoices = (items: { sub: SubService; variant: ServiceVariant | null }[], onlyKind?: FinishKind) => <>
    {items.map(item=>latestSub(item.sub)).filter(owner=>owner.addonGroups!==undefined).map(owner=><AddonChoices key={owner.id} owner={owner} catalog={catalog} items={selectedServicesToBook} setItems={setSelectedServicesToBook} showPrices={portalShowsPrices}/>)}

    {items.map(item => latestSub(item.sub)).map(owner => (['styling', 'toner'] as const).map(kind => {
      if (onlyKind && kind !== onlyKind) return null;
      const policy = finishPolicy(owner, kind);
      if (isFinish(owner, kind) || policy !== 'required' && policy !== 'optional') return null;
      const candidates = finishCandidates(owner, kind);
      const message = kind === 'styling' ? owner.stylingMessage : owner.tonerMessage;
      const label = kind === 'styling' ? 'peinado' : 'matiz';
      return <section key={owner.id + kind} style={{ marginTop: 16, padding: 14, border: '1px solid #C5A059', borderRadius: 10 }}>
        <h3 style={{ fontSize: 15, color: '#FFF8EE', margin: '0 0 8px' }}>{owner.name} · {label === 'peinado' ? 'Peinado y acabado' : 'Matiz'}</h3>
        <p style={{ fontSize: 13, color: '#E4C687', lineHeight: 1.5 }}>{message?.trim() || (policy === 'required' ? 'Selecciona una opción para completar tu servicio. Su precio y tiempo se suman a la reserva.' : 'Puedes añadir este acabado o continuar sin él.')}</p>
        {!candidates.length && <p role="alert" style={{ color: '#FFF8EE', fontSize: 13 }}>No hay opciones disponibles. Contacta con el estudio{policy === 'required' ? ' para completar la reserva' : ''}.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {candidates.map(sub => <div key={sub.id} style={{ padding: 10, background: '#29231F', borderRadius: 8 }}>
            <strong style={{ color: '#FFF8EE', fontSize: 14 }}>{sub.name}</strong>
            <p style={{ fontSize: 12, color: '#D6CBB8' }}>{sub.description}</p>
            {(sub.hasVariants && sub.variants?.length ? sub.variants : [null]).map(variant => {
              const selected = selectedServicesToBook.some(i => i.sub.id === sub.id && (i.variant?.id || '') === (variant?.id || ''));
              return <button key={variant?.id || sub.id} type="button" aria-pressed={selected} onClick={() => selectFinish(owner, kind, sub, variant)} style={{ display: 'block', width: '100%', minHeight: 48, padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #C5A059', background: selected ? '#C5A059' : '#322A25', color: selected ? '#121212' : '#FFF8EE', cursor: 'pointer' }}>
                {selected ? '✓ ' : ''}{variant?.name || 'Seleccionar'}{portalShowsPrices ? ' · ' + clientPrice(variant?.price || sub.price) : ''} · {variant?.duration || sub.duration}
              </button>;
            })}
          </div>)}
        </div>
      </section>;
    }))}
  </>;

  const [catalogTranslationLang, setCatalogTranslationLang] = useState('en');
  const serviceText = (sub: SubService, field: keyof ServiceTranslation) => {
    const language = currentScreen === 'adminPanel' || currentScreen === 'adminLogin' ? 'es' : currentLang;
    return (language !== 'es' ? sub.translations?.[language]?.[field]?.trim() : '') || sub[field] || '';
  };
  const chooseServiceLabel = ({ es: 'Elegir este servicio', en: 'Choose this service', fr: 'Choisir ce service', it: 'Scegli questo servizio', pt: 'Escolher este serviço', de: 'Diese Leistung wählen', nl: 'Deze behandeling kiezen', pl: 'Wybierz tę usługę', cs: 'Vybrat tuto službu', nb: 'Velg denne behandlingen', sv: 'Välj denna behandling', ar: 'اختاري هذه الخدمة' } as Record<string, string>)[currentLang] || 'Elegir este servicio';
  const categoryText = (category: CatalogCategory) => {
    const custom = category.translations?.[currentLang]?.title?.trim();
    if (custom) return custom;
    if (category.portalTitle?.trim()) return category.portalTitle.trim();
    if (currentLang === 'es') return category.title;
    const normalized = category.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
    const known: Record<string, string> = {
      'MECHAS BLOND COLLECTION LSTUDIO': 'categoryBlond', 'MECHAS BLOND COLLECTION L STUDIO': 'categoryBlond', 'METODO DE AUTOR & ILUMINACION': 'categoryBlond',
      'SALUD CAPILAR & RECONSTRUCCION': 'categoryHealth',
      'TEXTURA & MOLDEADO ORGANICO': 'categoryTexture',
      'GROOMING & MAN': 'categoryMen',
      'ADD-ONS & COMPLEMENTOS': 'categoryExtras',
      'DIAGNOSTICO & ASESORIA': 'categoryDiagnosis', 'VISAGISMO & DIAGNOSTICO': 'categoryDiagnosis',
      'CORTES LSTUDIO': 'categoryCuts', 'CORTES L STUDIO': 'categoryCuts', 'VISAGISMO & CORTE': 'categoryCuts',
      'STYLING & ACABADO': 'categoryStyling',
      'COLOR COLLECTION LSTUDIO': 'categoryColor', 'COLOR COLLECTION L STUDIO': 'categoryColor', 'COLOR ATELIER': 'categoryColor'
    };
    return known[normalized] ? t(known[normalized]) : category.title;
  };
  const variantText = (variant: ServiceVariant, service?: SubService) => {
    const latest = service ? catalog.flatMap(category => category.subservices).find(item => item.id === service.id)?.variants?.find(item => item.id === variant.id) || variant : variant;
    return latest.translations?.[currentLang]?.name?.trim() || latest.name;
  };
  const [portalSearch, setPortalSearch] = useState('');
  const portalSearchQuery = normalizeServiceSearch(portalSearch);
  const [portalSearchExpanded, setPortalSearchExpanded] = useState<Record<string, boolean>>({});
  const portalServiceMatches = (category: CatalogCategory, service: SubService) => {
    if (service.active === false) return false;
    if (!portalSearchQuery) return true;
    const text = normalizeServiceSearch([categoryText(category), category.title, category.slogan, bookingName(service), serviceText(service, 'name'), service.name, serviceText(service, 'slogan'), service.slogan, serviceText(service, 'description'), service.description, ...(service.variants || []).map(variant => variantText(variant, service))].filter(Boolean).join(' '));
    return portalSearchQuery.split(' ').every(word => text.includes(word));
  };
  const portalSearchCount = catalog.reduce((total, category) => total + category.subservices.filter(service => portalServiceMatches(category, service)).length, 0);
  const translationLanguagePicker = () => <label style={{ display: 'block', color: '#D6CBB8', fontSize: '13px', margin: '12px 0' }}>Idioma<select value={catalogTranslationLang} onChange={event => setCatalogTranslationLang(event.target.value)} style={{ display: 'block', width: '100%', padding: '12px', marginTop: '6px', background: '#3E342C', color: '#FFF8EE', border: '1px solid #C5A059', borderRadius: '7px' }}>{Object.keys(TRANSLATIONS).filter(language => language !== 'es').map(language => <option key={language} value={language}>{({en: 'English', fr: 'Français', it: 'Italiano', pt: 'Português', de: 'Deutsch', nl: 'Nederlands', pl: 'Polski', cs: 'Čeština', nb: 'Norsk', sv: 'Svenska', ar: 'العربية'} as Record<string, string>)[language]}</option>)}</select></label>;
  const updateServiceTranslation = (categoryId: string, serviceId: string, field: keyof ServiceTranslation, value: string) => {
    setCatalog(previous => previous.map(category => category.id !== categoryId ? category : {
      ...category, subservices: category.subservices.map(service => service.id !== serviceId ? service : {
        ...service, translations: { ...service.translations, [catalogTranslationLang]: { ...service.translations?.[catalogTranslationLang], [field]: value } }
      })
    }));
  };

  const renderServiceInfo = (sub: SubService) => (
                              <div style={{ backgroundColor: '#3E342C', padding: '14px', borderRadius: '6px', fontSize: '13px', lineHeight: 1.6, color: '#D6CBB8', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '2px solid #B98A3E', marginTop: '4px' }}>
                                <div><strong style={{ color: '#C99E52' }}>{t('descriptionLabel')}:</strong> {serviceText(sub, 'description')}</div>
                                {sub.requiresAssessment && <div style={{ color: '#C99E52', fontWeight: 'bold' }}>Requiere valoración previa · Reserva bajo confirmación de Ana</div>}
                                {tonerLabel(sub) && <div style={{ color: '#C99E52', fontWeight: 'bold' }}>{tonerLabel(sub)}</div>}
                                {stylingLabel(sub) && <div style={{ color: '#C99E52', fontWeight: 'bold' }}>{stylingLabel(sub)}</div>}
                                {serviceText(sub, 'includesText') && <div><strong style={{ color: '#C99E52' }}>{t('includesLabel')}:</strong> {serviceText(sub, 'includesText')}</div>}
                                {serviceText(sub, 'achievedText') && <div><strong style={{ color: '#C99E52' }}>{t('resultsLabel')}:</strong> {serviceText(sub, 'achievedText')}</div>}
                              </div>
  );

  const renderCatalogCard = (cat: CatalogCategory, sub: SubService) => {
    const serviceImage = sub.imageUrl;
    const isCompactService = !!sub.isTonerService || !!sub.isStylingService;
    if (isCompactService) {
      return (
        <article key={sub.id} id={`portal-service-${sub.id}`} className="studio-service-card studio-service-card-compact">
          <div className="studio-service-card-body">
            <div className="studio-service-card-head">
              <h3 className="studio-service-card-title">{bookingName(sub)}</h3>
              {(serviceText(sub, 'name') || sub.name).trim() !== bookingName(sub).trim() && <p>{serviceText(sub, 'name') || sub.name}</p>}
              <p className="studio-service-card-meta"><span>{sub.duration}</span>{portalShowsPrices && <strong>{sub.price}</strong>}</p>
            </div>
            <div className="studio-service-card-actions">
              <button type="button" onClick={() => { setViewServiceDetail({ cat, sub }); setCurrentScreen('serviceDetail'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="studio-btn-ghost">{t('viewService')}</button>
            </div>
          </div>
        </article>
      );
    }
    return (
      <article key={sub.id} id={`portal-service-${sub.id}`} className="lst-card" style={{ boxShadow: '0 6px 18px rgba(60, 50, 40, 0.05)' }}>
        {(serviceImage
          ? <button type="button" style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }} onClick={() => setLightboxImage(serviceImage)} aria-label="Ampliar imagen"><img className="lst-card-media" style={{ objectPosition: `${sub.imagePosition?.x ?? 50}% ${sub.imagePosition?.y ?? 50}%` }} src={optimizedImageUrl(serviceImage)} alt={serviceText(sub, 'name') || sub.name} loading="lazy" />{sub.imageIsAiPlaceholder && <span className="lst-ai-tag">Imagen ilustrativa</span>}</button>
          : <div className="studio-service-media studio-service-media-empty" aria-hidden="true"><span>LS</span><small>{bizConfig.name}</small></div>)}
        <div className="lst-card-footer">
          <div style={{ minWidth: 0 }}>
            <strong>{bookingName(sub)}</strong>
            {(serviceText(sub, 'name') || sub.name).trim() !== bookingName(sub).trim() && <span>{serviceText(sub, 'name') || sub.name}</span>}
            {!!serviceText(sub, 'slogan').trim() && <span>{serviceText(sub, 'slogan')}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => { setViewServiceDetail({ cat, sub }); setCurrentScreen('serviceDetail'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="lst-btn-ver">
              {t('viewService')} <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            </button>

          </div>
        </div>
      </article>
    );
  };

  const handleSaveModalAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminBookingSavingRef.current) return;
    if (!modalClientName.trim()) return;
    if (quickClientMode) { alert('Crea primero la ficha con «Crear ficha y continuar» o cancela el alta.'); return; }
    if (editingAppointment && !modalServices.length) { alert('Añade al menos un servicio a la cita.'); return; }
    const current = modalServices.length ? null : getModalService();
    const services = modalServices.length ? modalServices : current ? [current] : [];
    if (!services.length) return;
    // Staff choose all services directly; portal complement rules do not apply here.
    if (services.some(item=>item.sub.hasVariants&&item.sub.variants?.length&&!item.sub.variants.some(v=>v.id===item.variant?.id))) {alert('Selecciona una variante válida para cada servicio.');return;}
    const durationMin = getModalDuration(services);
    if (timeBlockConflict(formatDateKey(targetDateObj), targetTime, durationMin)) { alert('La cita coincide con un periodo bloqueado.'); return; }
    if (!enableOutOfHours && !isAgendaTimeWorking(targetDateObj, targetTime, durationMin)) {
      alert('La cita completa no cabe en el horario laboral. Elige otra hora o revisa la duración.'); return;
    }
    if (!enableDoubleBooking && getRescheduleConflict({ id: editingAppointment?.id || '', durationMinutes: durationMin } as Appointment, formatDateKey(targetDateObj), targetTime)) {
      alert('La duración de esta cita se solapa con otra reserva.'); return;
    }

    const dateFormattedStr = `${String(targetDateObj.getDate()).padStart(2, '0')}/${String(targetDateObj.getMonth() + 1).padStart(2, '0')}/${targetDateObj.getFullYear()}`;
    const newApp: Appointment = {
      bookingChannel: 'admin',
      id: adminBookingDraftId.current || (adminBookingDraftId.current = Date.now().toString()),
      dateKey: formatDateKey(targetDateObj),
      dayName: targetDayName,
      time: targetTime,
      durationMinutes: durationMin,
      clientName: modalClientName,
      phone: modalPhone || '600000000',
      email: modalEmail || 'sinemail@gmail.com',
      serviceCategory: Array.from(new Set(services.map(item => item.categoryName))).join(' + '),
      serviceSubcategory: `RESERVADO ${services.map(item => bookingName(item.sub) + (item.variant ? ` (${item.variant.name} - ${item.variant.price})` : '')).join(' + ')}`,
      selectedVariant: services[0].variant,
      services,
      remindersStatus: { email48h: true, whatsapp48h: true, whatsapp24h: true, whatsapp2h: true }
    };

    if (editingAppointment) {
      if (!modalServices.length) { alert('Añade al menos un servicio a la lista de la cita.'); return; }
      const needsNewAssessment = services.some(item => item.sub.requiresAssessment) &&
        !(editingAppointment.services || []).some(item => item.sub.requiresAssessment);
      const approval = needsNewAssessment ? { status: 'pending' as const, reason: 'assessment' as const,
        reference: 'REV-' + crypto.randomUUID().slice(0, 8).toUpperCase() } : editingAppointment.saturdayApproval;
      const payment = editingAppointment.advancePayment ||
        (approval?.status !== 'pending' && bizConfig.advancePaymentEnabled && durationMin > bizConfig.advancePaymentThresholdMinutes ? createAdvancePayment() : undefined);
      const prefix = approval?.status === 'pending' ? 'PENDIENTE VALORACIÓN' :
        payment?.status === 'pending' ? 'PENDIENTE BIZUM' : 'RESERVADO';
      const updated: Appointment = { ...editingAppointment, clientName: modalClientName,
        phone: modalPhone, email: modalEmail, services, durationMinutes: durationMin,
        saturdayApproval: approval, advancePayment: payment,
        selectedVariant: services[0].variant, serviceCategory: newApp.serviceCategory,
        serviceSubcategory: newApp.serviceSubcategory.replace(/^RESERVADO/, prefix) };
      setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
      setIsModalOpen(false); setEditingAppointment(null); setViewApptModal(updated);
      if (studioApi.serverConfigured && studioApi.storedRole() === 'admin') {
        const serverId = updated.serverId || undefined;
        studioApi.updateAppointmentOnServer(studioApi.currentToken()!, {
          id: serverId || updated.id,
          dateKey: updated.dateKey,
          time: updated.time,
          dayName: updated.dayName,
          durationMinutes: updated.durationMinutes,
          services: updated.services,
          clientSnapshot: {
            clientName: updated.clientName, phone: updated.phone, email: updated.email,
            serviceCategory: updated.serviceCategory, serviceSubcategory: updated.serviceSubcategory,
            dayName: updated.dayName, selectedVariant: updated.selectedVariant ?? null,
            remindersStatus: updated.remindersStatus,
          },
        }).then(() => {
          if (!serverId) {
            return studioApi.syncAll<Record<string, any>>(studioApi.currentToken()!, ['appointments']).then(data => {
              const row = Array.isArray(data?.appointments) ? data.appointments.find((r: Record<string, any>) => r.source_legacy_id === updated.id) : null;
              if (row) {
                const synced: Appointment = { ...updated, serverId: row.id };
                setAppointments(previous => previous.map(item => item.id === synced.id ? synced : item));
                setViewApptModal(current => current?.id === synced.id ? synced : current);
              }
            });
          }
          return undefined;
        }).catch(() => undefined);
      }
      return;
    }
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
    adminBookingSavingRef.current = true; setAdminBookingSaving(true);
    try {
      const saved = await persistPendingAppointment(newApp);
      setAppointments(previous => previous.some(item => item.id === saved.id || (saved.serverId && item.serverId === saved.serverId))
        ? previous.map(item => item.id === saved.id || (saved.serverId && item.serverId === saved.serverId) ? saved : item)
        : [...previous, saved]);
      adminBookingDraftId.current = '';
      setIsModalOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se ha podido guardar la cita. Tus datos siguen en el formulario.');
    } finally { adminBookingSavingRef.current = false; setAdminBookingSaving(false); }


  };

  const visualBookingSignature = () => JSON.stringify({
    client: currentClientRecord?.serverId || currentClientRecord?.email || '',
    date: formatDateKey(bookingDate), time: selectedVisualTime, professional: selectedProfessionalId,
    promotionId: selectedPromotionId, promotionOriginId: selectedPromotionOrigin?.id,
    services: selectedServicesToBook.map(item => ({ id: item.sub.id, variant: item.variant?.id || null }))
  });
  const handleConfirmarCitaVisual = async () => {
    if (visualBookingBusyRef.current) return;
    const signature = visualBookingSignature();
    const retry = visualBookingAttemptRef.current?.signature === signature;
    setVisualBookingError('');
    setBookingSuccessMsg(null);

    if (saturdayNeedsAcceptance && acceptedSaturdayPolicy !== saturdayPolicyKey) {
      setReservationPolicyChecked(false); setReservationPolicyOpen(true); return;
    }
    if (selectedServicesToBook.length === 0) {
      alert(t('selectOneService'));
      return;
    }
    const earliest = new Date(); earliest.setHours(0, 0, 0, 0); earliest.setDate(earliest.getDate() + bizConfig.minAdvanceDays);
    const latest = new Date(); latest.setHours(23, 59, 59, 999); latest.setMonth(latest.getMonth() + bizConfig.maxBookingMonths);
    if (bookingDate < earliest || bookingDate > latest) { alert(`Reserva con al menos ${bizConfig.minAdvanceDays} días de antelación y dentro de los próximos ${bizConfig.maxBookingMonths} meses.`); return; }
    if (!selectedVisualTime || (!retry && !portalAvailableTimes(bookingDate).includes(selectedVisualTime))) { alert(t('fullTimeRequired')); return; }
    const inactiveError = getInactiveServiceError(selectedServicesToBook);
    if (inactiveError) { alert(inactiveError); setCurrentScreen('catalogBooking'); return; }
    const stylingError = getStylingError(selectedServicesToBook);
    if (stylingError) { alert(stylingError); setCurrentScreen('catalogBooking'); return; }
    const tonerError = getTonerError(selectedServicesToBook);
    if (tonerError) { alert(tonerError); setCurrentScreen('catalogBooking'); return; }
    const dateKeyStr = formatDateKey(bookingDate);
    const promoPreview = promotionPreview(dateKeyStr);
    if (selectedPromotionId && promoPreview.error) { setVisualBookingError(promoPreview.error); return; }
    if (isDateBlockedByHoliday(dateKeyStr)) {
      alert(t('salonClosed'));
      return;
    }
    for (const item of selectedServicesToBook) {
      if (item.sub.hasVariants && item.sub.variants && item.sub.variants.length > 0 && !item.variant) {
        alert(tf('requiredVariant', {service: bookingName(item.sub)}));
        return;
      }
    }
    const dayNamesMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayNameStr = dayNamesMap[bookingDate.getDay()];
    const subNames = selectedServicesToBook.map(s => {
      return s.variant ? `${bookingName(s.sub)} (${s.variant.name})` : bookingName(s.sub);
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
      bookingChannel: 'portal',
      promotion: promoPreview.discount || undefined,
      promotionOrigin: selectedPromotionOrigin || undefined,
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
    const profEmp = activeEmployees.find(e => e.id === selectedProfessionalId);
    newApp.professionalId = selectedProfessionalId;
    newApp.professionalName = profEmp?.name.trim() || null;
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
    // Retain the reference after an uncertain response so a retry can recover
    // the saved appointment through persistPendingAppointment instead of duplicating it.
    const draft = retry ? visualBookingAttemptRef.current!.draft : newApp;
    visualBookingAttemptRef.current = { signature, draft };
    visualBookingBusyRef.current = true;
    setVisualBookingBusy(true);
    try {
      const saved = await persistPendingAppointment(draft);
      setAppointments(previous => [
        ...previous.filter(item => item.id !== draft.id && item.id !== saved.id && !(saved.serverId && item.serverId === saved.serverId)),
        saved
      ]);
      setRegisteredAppointment(saved);
      const message = saved.saturdayApproval?.status === 'pending'
        ? 'Solicitud enviada al Studio · Pendiente de confirmación de Ana.'
        : saved.advancePayment?.status === 'pending'
          ? 'Solicitud enviada al Studio · Pendiente de comprobar el anticipo.'
          : tf('bookingConfirmed', { date: new Date(saved.dateKey + 'T12:00:00').toLocaleDateString(portalLocale), time: saved.time });
      setBookingSuccessMsg(message);
      visualBookingAttemptRef.current = null;
      setSelectedServicesToBook([]); setSelectedPromotionId(null); setSelectedPromotionOrigin(null);
      setCurrentScreen('catalogBooking');
      setTimeout(() => setBookingSuccessMsg(null), 8000);
    } catch (error) {
      setVisualBookingError((error instanceof Error ? error.message : 'No se pudo confirmar el guardado en el servidor.') + ' Conservamos tu selección. Pulsa «Comprobar y reintentar» para revisar si se guardó antes de volver a enviarla.');
    } finally {
      visualBookingBusyRef.current = false;
      setVisualBookingBusy(false);
    }
  };

  const handleLogout = () => {
    if (approvalSavingRef.current || visualBookingBusyRef.current || pendingBookingBusyRef.current || bizumSavingRef.current || deletingAppointmentRef.current || configSavingRef.current || catalogSavingRef.current) {
      alert('Espera a que termine el guardado antes de cerrar sesión.');
      return;
    }
    studioApi.clearStoredToken();
    if (studioApi.currentToken() || studioApi.storedRole() || studioApi.storedClientId()) {
      alert('No se ha podido borrar la sesión guardada. Vuelve a intentarlo.');
      return;
    }
    // Reload resets all PINs, private views, open dialogs and in-memory drafts.
    // Business data and confirmed appointments remain stored in Supabase.
    window.location.reload();
  };

  const handleDeleteAppointment = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (deletingAppointmentRef.current) return;
    const target = appointments.find(item => item.id === id);
    if (!target) return;
    if (!window.confirm('¿Eliminar definitivamente esta cita? Se quitará de la agenda y del registro. Si quieres conservarla en el historial, utiliza Cancelar cita.')) return;
    deletingAppointmentRef.current = true;
    setDeletingAppointmentId(id);
    try {
      const token = studioApi.currentToken();
      if (!studioApi.serverConfigured || !token || studioApi.storedRole() !== 'admin') {
        throw new Error('Necesitas conexión y una sesión de administración válida para eliminar la cita.');
      }
      const before = await studioApi.syncAll<{ appointments?: Record<string, any>[] }>(token, ['appointments']);
      if (!Array.isArray(before.appointments)) throw new Error('No se ha podido consultar la agenda del servidor. Reintenta.');
      const matches = (row: Record<string, any>) => row.id === target.serverId || row.id === id || String(row.source_legacy_id || '') === id;
      const row = before.appointments.find(matches);
      if (row) {
        const result = await studioApi.deleteAppointmentOnServer(token, row.id);
        if (!result.ok) throw new Error('El servidor no ha confirmado la eliminación.');
        const after = await studioApi.syncAll<{ appointments?: Record<string, any>[] }>(token, ['appointments']);
        if (!Array.isArray(after.appointments) || after.appointments.some(item => item.id === row.id || matches(item))) {
          throw new Error('No se ha podido verificar la eliminación. La cita sigue visible hasta comprobarlo. Reintenta para consultar su estado.');
        }
      }
      // If it was already deleted on the server, reconcile this device without another DELETE.
      setAppointments(previous => previous.filter(item => item.id !== id && !(target.serverId && item.serverId === target.serverId)));
      setViewApptModal(previous => previous && (previous.id === id || (target.serverId && previous.serverId === target.serverId)) ? null : previous);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo eliminar la cita. Conservamos su estado en pantalla; vuelve a intentarlo.');
    } finally {
      deletingAppointmentRef.current = false;
      setDeletingAppointmentId(null);
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
    if (!newVariantName.trim() || !newVariantPrice.trim() || !newVariantDuration.trim()) { alert('Completa nombre, precio y duración de la opción.'); return; }
    if (!/\d/.test(newVariantDuration) || parseFloat(newVariantDuration) <= 0) { alert('Indica una duración válida, por ejemplo 60 min.'); return; }
    const newVar: ServiceVariant = {
      id: 'v_' + Date.now(),
      name: newVariantName.trim(),
      price: newVariantPrice.trim(),
      duration: newVariantDuration.trim()
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
    if (!newSubName.trim() || !newSubDur.trim() || (newSubPriceType !== 'consultar' && !newSubPrice.trim())) { alert('Completa el nombre, la duración y el precio, o elige Consultar.'); return; }
    if (!/\d/.test(newSubDur) || parseFloat(newSubDur) <= 0) { alert('Indica una duración válida, por ejemplo 45 min.'); return; }
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
      description: newSubDesc.trim(),
      duration: newSubDur.trim(),
      price: formattedPrice,
      bufferTime: '10 min prep',
      includesText: newSubIncludes.trim(),
      achievedText: newSubAchieved.trim(),
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

  const anioMini = mesNavegacion.getFullYear();
  const mesMini = mesNavegacion.getMonth();
  const primerDiaMes = new Date(anioMini, mesMini, 1).getDay();
  const diaInicio = primerDiaMes === 0 ? 6 : primerDiaMes - 1;
  const diasEnMes = new Date(anioMini, mesMini + 1, 0).getDate();
  const diasRejillaMini: (Date | null)[] = [];
  for (let i = 0; i < diaInicio; i++) diasRejillaMini.push(null);
  for (let d = 1; d <= diasEnMes; d++) diasRejillaMini.push(new Date(anioMini, mesMini, d));

  const workingRanges = (date: Date): { start: number; end: number }[] => {
    if (date.getDay() === 0 || isDateBlockedByHoliday(formatDateKey(date))) return [];
    const day = date.getDay();
    const schedule = day === 1 ? bizConfig.scheduleMonday : day <= 3 ? bizConfig.scheduleTueWed : day <= 5 ? bizConfig.scheduleThuFri : bizConfig.scheduleSaturday;
    const matches = Array.from(schedule.matchAll(/(\d{1,2})(?::(\d{2})|h(?:\s*(\d{2}))?)/gi));
    const ranges: { start: number; end: number }[] = [];
    for (let i = 0; i + 1 < matches.length; i += 2) {
      const start = Number(matches[i][1]) * 60 + Number(matches[i][2] || matches[i][3] || 0);
      const end = Number(matches[i + 1][1]) * 60 + Number(matches[i + 1][2] || matches[i + 1][3] || 0);
      if (start >= 0 && end <= 1440 && start < end) ranges.push({ start, end });
    }
    if (!ranges.length && day === 6 &&
        !/cerrado|closed/i.test(schedule)) {
      // Un aviso de sábado bajo demanda no equivale a salón cerrado.
      return [{ start: 9 * 60, end: 19 * 60 }];
    }
    return ranges;
  };
  const minuteTime = (minutes: number) => String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  const isAgendaTimeWorking = (date: Date, time: string, duration = 1) => {
    const [hour, minute] = time.split(':').map(Number);
    const start = hour * 60 + minute;
    return Number.isFinite(start) && duration > 0 && workingRanges(date).some(range => start >= range.start && start + duration <= range.end);
  };
  const agendaDates = agendaViewMode === 'day' ? [fechaSeleccionada] : Array.from({ length: 6 }, (_, index) => {
    const date = new Date(fechaSeleccionada);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + index);
    return date;
  });
  const agendaStep = Math.max(5, bizConfig.slotIntervalMinutes || 15);
  const agendaTimes = new Set<string>();
  agendaDates.forEach(date => {
    workingRanges(date).forEach(range => {
      for (let minute = range.start; minute < range.end; minute += agendaStep) agendaTimes.add(minuteTime(minute));
    });
    timeBlocks.filter(block => block.dateKey === formatDateKey(date)).forEach(block => {
      agendaTimes.add(block.time);
      const [h, m] = block.time.split(':').map(Number);
      for (let minute = h * 60 + m; minute < h * 60 + m + block.durationMinutes; minute += agendaStep) agendaTimes.add(minuteTime(minute));
    });
    // Las citas ya existentes siguen visibles si se cambia el horario laboral.
    appointments.filter(appointment => appointment.dateKey === formatDateKey(date))
      .forEach(appointment => agendaTimes.add(appointment.time));
  });
  if (enableOutOfHours) {
    for (let minute = 8 * 60; minute < 22 * 60; minute += agendaStep) agendaTimes.add(minuteTime(minute));
  }
  const hoursList = Array.from(agendaTimes).sort();

  const portalDateAllowed = (date: Date) => {
    const earliest = new Date(); earliest.setHours(0, 0, 0, 0); earliest.setDate(earliest.getDate() + bizConfig.minAdvanceDays);
    const latest = new Date(); latest.setHours(23, 59, 59, 999); latest.setMonth(latest.getMonth() + bizConfig.maxBookingMonths);
    return date >= earliest && date <= latest && date.getDay() !== 0 && !isDateBlockedByHoliday(formatDateKey(date));
  };
  const portalAvailableTimes = (date: Date) => {
    if (!portalDateAllowed(date) || !selectedServicesToBook.length) return [];
    const duration = getModalDuration(selectedServicesToBook);
    const step = Math.max(5, bizConfig.slotIntervalMinutes || 15);
    const times: string[] = [];
    for (const { start: open, end: close } of workingRanges(date)) {
      for (let start = open; start + duration <= close; start += step) {
        const time = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
        if (new Date(`${formatDateKey(date)}T${time}:00`).getTime() <= Date.now()) continue;
        const overlaps = appointments.some(appointment => {
          if (!isActiveAppointment(appointment) || appointment.dateKey !== formatDateKey(date) || appointment.saturdayApproval?.status === 'rejected') return false;
          const [hour, minute] = appointment.time.split(':').map(Number);
          const bookedStart = hour * 60 + minute;
          return start < bookedStart + (appointment.durationMinutes || 45) && start + duration > bookedStart;
        });
        if ((!overlaps || enableDoubleBooking) && !timeBlockConflict(formatDateKey(date), time, duration)) times.push(time);
      }
    }
    return Array.from(new Set(times));
  };
  const choosePortalDate = (date: Date) => { setBookingDate(date); setSelectedVisualTime(''); };
  const saturdayPolicyText = bizConfig.saturdayNoticeMessage?.trim() || INITIAL_BUSINESS_CONFIG.saturdayNoticeMessage;
  const saturdayPolicyKey = formatDateKey(bookingDate) + '|' + saturdayPolicyText;
  const saturdayNeedsAcceptance = bookingDate.getDay() === 6 && bizConfig.saturdayPolicyEnabled !== false;
  useEffect(() => {
    if (currentScreen === 'visualAgenda' && saturdayNeedsAcceptance && acceptedSaturdayPolicy !== saturdayPolicyKey) {
      setReservationPolicyChecked(false);
      setReservationPolicyOpen(true);
    }
  }, [currentScreen, saturdayNeedsAcceptance, saturdayPolicyKey, acceptedSaturdayPolicy]);
  useEffect(() => {
    if (reservationPolicyOpen && reservationPolicyDialog.current && !reservationPolicyDialog.current.open) reservationPolicyDialog.current.showModal();
  }, [reservationPolicyOpen]);
  const leaveReservationPolicy = () => {
    // Stay on the booking calendar and keep the selected services/professional.
    reservationPolicyDialog.current?.close();
    setReservationPolicyOpen(false);
    setReservationPolicyChecked(false);
    setSelectedVisualTime('');
    const input = portalDateInputRef.current;
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus({ preventScroll: true });
      try { input.showPicker?.(); } catch { /* Focus remains usable if the browser blocks the native picker. */ }
    }
  };

  const portalWeekStart = new Date(bookingDate);
  portalWeekStart.setDate(bookingDate.getDate() - ((bookingDate.getDay() + 6) % 7));
  const portalWeekDays = Array.from({ length: 7 }, (_, index) => { const day = new Date(portalWeekStart); day.setDate(day.getDate() + index); return day; });
  const portalTimes = portalAvailableTimes(bookingDate);
  useEffect(() => {
    if (!['catalogBooking', 'visualAgenda'].includes(currentScreen) || !currentClientRecord || !selectedServicesToBook.length) return;
    const email = currentClientRecord.email.trim().toLowerCase();
    const services = selectedServicesToBook.map(item => bookingName(item.sub) + (item.variant ? ` (${item.variant.name})` : '')).join(' + ');
    const date = currentScreen === 'visualAgenda' ? formatDateKey(bookingDate) : '';
    const time = currentScreen === 'visualAgenda' ? selectedVisualTime : '';
    const step = time ? 'Hora seleccionada' : date ? 'Buscando fecha' : 'Servicios seleccionados';
    setBookingAttempts(previous => {
      const open = previous.find(item => item.email === email && !item.registered);
      if (open && open.services === services && open.date === date && open.time === time && open.step === step) return previous;
      const record = { ...open, id: open?.id || 'attempt_' + Date.now(), email, name: `${currentClientRecord.nombre} ${currentClientRecord.apellidos}`.trim(), services, date, time, step, reachedDate: !!open?.reachedDate || !!date, reachedTime: !!open?.reachedTime || !!time, updatedAt: new Date().toISOString() };
      return open ? previous.map(item => item.id === open.id ? record : item) : [record, ...previous];
    });
  }, [currentScreen, currentClientRecord, selectedServicesToBook, bookingDate, selectedVisualTime]);

  useEffect(() => {
    if (currentScreen !== 'visualAgenda' || !currentClientRecord || !selectedServicesToBook.length || !portalDateAllowed(bookingDate) || portalTimes.length) return;
    const desiredDate = formatDateKey(bookingDate);
    const serviceName = selectedServicesToBook.map(item => bookingName(item.sub) + (item.variant ? ` (${item.variant.name})` : '')).join(' + ');
    const clientEmail = currentClientRecord.email.trim().toLowerCase();
    const observedAt = new Date().toISOString();
    setLostDemandsList(previous => {
      if (previous.some(item => item.clientEmail === clientEmail && item.desiredDate === desiredDate && item.serviceName === serviceName && item.observedAt?.slice(0,10) === observedAt.slice(0,10))) return previous;
      return [{ id: 'demand_' + Date.now(), date: new Date().toLocaleDateString('es-ES'), observedAt, desiredDate, clientEmail, clientName: `${currentClientRecord.nombre} ${currentClientRecord.apellidos}`.trim(), phone: currentClientRecord.telefono, serviceName, potentialValue: 0, reason: 'sin_disponibilidad', clientNote: 'Sin hueco para la duración completa de los servicios seleccionados.' }, ...previous];
    });
  }, [currentScreen, bookingDate, currentClientRecord, selectedServicesToBook, portalTimes.length]);


  const isTimeSlotOccupied = (dateKey: string, timeStr: string) => {
    if (isDateBlockedByHoliday(dateKey)) return true;
    if (enableDoubleBooking) return false;
    const [checkHour, checkMin] = timeStr.split(':').map(Number);
    const checkTotalMinutes = checkHour * 60 + checkMin;
    if (timeBlockConflict(dateKey, timeStr)) return true;
    return appointments.some(appt => {
      if (!isActiveAppointment(appt) || appt.dateKey !== dateKey) return false;
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
      if (!isActiveAppointment(other) || other.id === appointment.id || other.dateKey !== dateKey || other.saturdayApproval?.status === 'rejected') return false;
      const [otherHour, otherMinute] = other.time.split(':').map(Number);
      const otherStart = otherHour * 60 + otherMinute;
      return start < otherStart + (other.durationMinutes || 45) && end > otherStart;
    });
  };
  const markAppointmentCompleted = async (appointment: Appointment) => {
    if (appointment.completedAt || !isActiveAppointment(appointment)) return;
    if (appointment.saturdayApproval?.status === 'pending' || appointment.advancePayment?.status === 'pending') { alert('Resuelve primero la aprobación y el pago pendiente.'); return; }
    const client = listaClientes.find(item => !!normalizeEmail(appointment.email) && normalizeEmail(item.email) === normalizeEmail(appointment.email));
    if (!client) { alert('No hay una clienta registrada con el email de esta cita. Revisa su ficha antes de registrar la visita.'); return; }
    if (new Date(`${appointment.dateKey}T${appointment.time}:00`).getTime() > Date.now()) { alert('Esta cita todavía no ha comenzado.'); return; }
    if (!window.confirm(`¿Registrar esta cita como realizada en el pasaporte de ${client.nombre}?`)) return;
    const service = appointment.services?.length ? appointment.services.map(item => bookingName(item.sub) + (item.variant ? ` (${item.variant.name})` : '')).join(' + ') : appointmentServiceNames(appointment);
    const updated = { ...appointment, completedAt: new Date().toISOString() };
    if (studioApi.serverConfigured) {
      const token = studioApi.currentToken();
      if (!token || studioApi.storedRole() !== 'admin') { alert('Inicia sesión de nuevo en la intranet.'); return; }
      try {
        await studioApi.updateAppointmentOnServer(token, { id: appointment.serverId || appointment.id, completedAt: updated.completedAt });
      } catch {
        alert('No se pudo registrar la finalización en el servidor. No se ha marcado como realizada. Inténtalo de nuevo.'); return;
      }
    }
    setListaClientes(previous => previous.map(item => item.idNum === client.idNum ? {
      ...item,
      ultimaVisita: appointment.dateKey.split('-').reverse().join('/'),
      pastVisits: (item.pastVisits || []).some(visit => visit.sourceAppointmentId === appointment.id) ? item.pastVisits : [...(item.pastVisits || []), { date: appointment.dateKey.split('-').reverse().join('/'), service, stylist: 'Ana', notes: '', sourceAppointmentId: appointment.id }]
    } : item));
    setAppointments(previous => previous.map(item => item.id === appointment.id ? updated : item));
    setViewApptModal(updated);
  };
  const adminAppointmentText = (appointment: Appointment) => appointment.completedAt || appointment.saturdayApproval?.status === 'pending' ? '#FFF8EE' : '#243529';
  const adminAppointmentColor = (appointment: Appointment) => appointment.saturdayApproval?.status === 'rejected' ? { background: '#F2DCD8', border: '#9B3C2D' } : appointment.completedAt ? { background: '#322A25', border: '#B8972E' } : appointment.saturdayApproval?.status === 'pending'
    ? { background: '#3E342C', border: '#C99E52' }
    : appointment.advancePayment?.status === 'pending' ? { background: '#DCE3EE', border: '#4A6FA5' }
    : { background: '#8FC98F', border: '#2E7D32' };

  const clientNextAppointment = currentClientRecord ? appointments
    .filter(appointment => isActiveAppointment(appointment) && !!normalizeEmail(currentClientRecord.email) && normalizeEmail(appointment.email) === normalizeEmail(currentClientRecord.email)
      && new Date(`${appointment.dateKey}T${appointment.time}:00`).getTime() >= Date.now()
      && !appointment.completedAt && appointment.saturdayApproval?.status !== 'rejected')
    .sort((a, b) => `${a.dateKey}T${a.time}`.localeCompare(`${b.dateKey}T${b.time}`))[0] : undefined;
  const clientAppointmentStatus = clientNextAppointment?.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación'
    : clientNextAppointment?.advancePayment?.status === 'pending' ? 'Pendiente de Bizum' : 'Cita confirmada';
  const clientUpcomingAppointments = currentClientRecord ? appointments
    .filter(appointment => isActiveAppointment(appointment) && !!normalizeEmail(currentClientRecord.email) && normalizeEmail(appointment.email) === normalizeEmail(currentClientRecord.email)
      && new Date(`${appointment.dateKey}T${appointment.time}:00`).getTime() >= Date.now()
      && !appointment.completedAt && appointment.saturdayApproval?.status !== 'rejected')
    .sort((a, b) => `${a.dateKey}T${a.time}`.localeCompare(`${b.dateKey}T${b.time}`)) : [];


  const renderAgendaLinks = () => <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '4px 5px 10px 12px' }}>
    {(['day', 'pending'] as const).map(panel => <button key={panel} type="button" onClick={() => { setAdminTab('agenda'); setPendingPanelFilter('all'); setAgendaSidePanel(panel); }}
      style={{ textAlign: 'left', background: 'transparent', color: '#C99E52', border: '1px solid #3A312A',
        borderRadius: '6px', padding: '9px 7px', fontSize: '11px', cursor: 'pointer' }}>
      {panel === 'day' ? 'Citas del día' : 'Pendientes'} · {panel === 'day' ? appointments.filter(item => item.dateKey === formatDateKey(fechaSeleccionada)).length :
        appointments.filter(item => isActiveAppointment(item) && (item.saturdayApproval?.status === 'pending' || item.advancePayment?.status === 'pending')).length}
    </button>)}
  </div>;

  const saveAppointmentApproval = async (source: Appointment, status: 'accepted' | 'rejected') => {
    if (approvalSavingRef.current) return;
    if (status === 'rejected' && !window.confirm('¿Rechazar esta solicitud? Se liberará el hueco y se conservará el registro.')) return;
    approvalSavingRef.current = true;
    setApprovalSavingId(source.id);
    setApprovalSaveError(null);
    try {
      const token = studioApi.currentToken();
      if (!studioApi.serverConfigured || !token || studioApi.storedRole() !== 'admin') throw new Error('Necesitas conexión y una sesión de administración válida.');
      const before = await studioApi.syncAll<{ appointments?: Record<string, any>[]; settings?: BusinessConfig }>(token, ['appointments', 'settings']);
      let row = before.appointments?.find(item => item.id === source.serverId || item.id === source.id || String(item.source_legacy_id || '') === source.id);
      if (!row) throw new Error('No se ha encontrado la solicitud en el servidor. Actualiza la agenda.');
      if (row.lifecycle_status === 'cancelled' || row.lifecycle_status === 'no_show' || row.completed_at) throw new Error('Esta cita ya no admite una decisión de aprobación. Actualiza la agenda.');
      if (row.approval_status !== status) {
        if (row.approval_status !== 'pending') throw new Error('La solicitud ya se ha resuelto con otra decisión. Actualiza la agenda antes de continuar.');
        const patch: studioApi.ServerAppointmentPatch = {
          id: row.id,
          approval: { status, reason: row.approval_reason || undefined, reference: row.approval_reference || undefined }
        };
        if (status === 'accepted') {
          const cfg = before.settings;
          if (!cfg) throw new Error('No se ha podido leer la configuración de anticipos. Reintenta.');
          const threshold = Number(cfg.advancePaymentThresholdMinutes);
          if (cfg.advancePaymentEnabled !== false && !Number.isFinite(threshold)) throw new Error('Revisa la duración mínima para pedir anticipo en Configuración.');
          const needsDeposit = cfg.advancePaymentEnabled !== false && Number(row.duration_minutes) > threshold;
          // Preserve an existing payment, including one already received.
          if (needsDeposit && !['pending', 'confirmed', 'received', 'paid'].includes(String(row.deposit_status))) {
            const amount = parseFloat(String(cfg.depositAmount || '').replace(',', '.'));
            if (!Number.isFinite(amount) || amount <= 0) throw new Error('Revisa el importe del anticipo en Configuración.');
            patch.advancePayment = { status: 'pending', amount, reference: 'LS-' + crypto.randomUUID().slice(0, 8).toUpperCase() };
          }
        }
        const result = await studioApi.updateAppointmentOnServer(token, patch);
        if (!result.ok) throw new Error('El servidor no ha confirmado el guardado.');
        const after = await studioApi.syncAll<{ appointments?: Record<string, any>[] }>(token, ['appointments']);
        const verified = after.appointments?.find(item => item.id === row!.id);
        if (!verified || verified.approval_status !== status) throw new Error('No se ha podido verificar la decisión. Reintenta para consultar su estado antes de enviarla otra vez.');
        row = verified;
      }
      const reloaded = mapServerAppointment(row);
      const prefix = status === 'rejected' ? 'SOLICITUD RECHAZADA' : reloaded.advancePayment?.status === 'pending' ? 'PENDIENTE BIZUM' : 'RESERVADO';
      const saved: Appointment = { ...reloaded, serviceSubcategory: reloaded.serviceSubcategory.replace(/^(?:PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM)|RESERVADO)/, prefix) };
      setAppointments(previous => previous.map(item => item.id === source.id || item.serverId === row!.id || item.id === row!.id ? saved : item));
      setViewApptModal(previous => previous && (previous.id === source.id || previous.serverId === row!.id) ? saved : previous);
    } catch (error) {
      setApprovalSaveError({ id: source.id, message: error instanceof Error ? error.message : 'No se pudo guardar la decisión. Conservamos el estado anterior para reintentar.' });
    } finally {
      approvalSavingRef.current = false;
      setApprovalSavingId(null);
    }
  };

  const confirmBizumReceived = async (source: Appointment) => {
    if (bizumSavingRef.current || source.advancePayment?.status !== 'pending') return;
    if (!window.confirm(`¿Has comprobado la recepción del Bizum de ${source.advancePayment.amount} € con este código: ${source.advancePayment.reference}?`)) return;
    bizumSavingRef.current = true;
    setBizumSavingId(source.id);
    setBizumSaveError(null);
    try {
      const token = studioApi.currentToken();
      if (!studioApi.serverConfigured || !token || studioApi.storedRole() !== 'admin') {
        throw new Error('Necesitas conexión y una sesión de administración válida para confirmar el Bizum.');
      }
      const before = await studioApi.syncAll<{ appointments?: Record<string, any>[] }>(token, ['appointments']);
      let row = before.appointments?.find(item => item.id === source.serverId || item.id === source.id || String(item.source_legacy_id || '') === source.id);
      if (!row) throw new Error('No se ha encontrado esta cita en el servidor. Actualiza la agenda antes de reintentar.');
      const current = mapServerAppointment(row);
      if (!isActiveAppointment(current) || current.completedAt) throw new Error('La cita ya no está activa. Actualiza la agenda antes de confirmar el anticipo.');
      const alreadyConfirmed = ['confirmed', 'received', 'paid'].includes(String(row.deposit_status));
      if (!alreadyConfirmed) {
        if (row.deposit_status !== 'pending' || !current.advancePayment) throw new Error('Esta cita ya no tiene un anticipo pendiente. Actualiza la agenda.');
        if (Number(current.advancePayment.amount) !== Number(source.advancePayment.amount) || current.advancePayment.reference !== source.advancePayment.reference) {
          throw new Error('El importe o la referencia han cambiado. Actualiza la agenda y comprueba el Bizum antes de confirmar.');
        }
        const result = await studioApi.updateAppointmentOnServer(token, {
          id: row.id,
          advancePayment: { status: 'confirmed', amount: current.advancePayment.amount, reference: current.advancePayment.reference }
        });
        if (!result.ok) throw new Error('El servidor no ha confirmado el guardado.');
        const after = await studioApi.syncAll<{ appointments?: Record<string, any>[] }>(token, ['appointments']);
        const verified = after.appointments?.find(item => item.id === row!.id);
        if (!verified || !['confirmed', 'received', 'paid'].includes(String(verified.deposit_status))) {
          throw new Error('No se ha podido verificar la confirmación. Reintenta para consultar el estado guardado antes de volver a enviarlo.');
        }
        row = verified;
      }
      const reloaded = mapServerAppointment(row);
      const saved: Appointment = {
        ...reloaded,
        advancePayment: { amount: Number(row.deposit_amount), reference: String(row.deposit_reference || ''), status: 'confirmed' },
        serviceSubcategory: reloaded.serviceSubcategory.replace(/^PENDIENTE BIZUM/, reloaded.saturdayApproval?.status === 'pending' ? 'PENDIENTE VALORACIÓN' : 'RESERVADO')
      };
      setAppointments(previous => previous.map(item => item.id === source.id || item.serverId === row!.id || item.id === row!.id ? saved : item));
      setViewApptModal(previous => previous && (previous.id === source.id || previous.serverId === row!.id) ? saved : previous);
    } catch (error) {
      setBizumSaveError({ id: source.id, message: error instanceof Error ? error.message : 'No se pudo confirmar el Bizum. Conservamos el estado anterior; vuelve a intentarlo.' });
    } finally {
      bizumSavingRef.current = false;
      setBizumSavingId(null);
    }
  };

  const renderBookedServicePrice = (appointment: Appointment, item: { sub: SubService; variant: ServiceVariant | null }) => {
    const discount = appointment.promotion;
    const duration = item.variant?.duration || item.sub.duration;
    if (discount?.serviceId === item.sub.id) {
      return <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 7, marginTop: 6, color: '#E4C687', fontSize: 13 }}>
        <del style={{ color: '#D6CBB8', fontSize: 12 }}>{discount.originalAmount.toFixed(2).replace('.', ',')} €</del>
        <strong>{discount.finalAmount.toFixed(2).replace('.', ',')} €</strong><span>· {duration}</span>
      </span>;
    }
    return <span style={{ display: 'block', color: '#E4C687', fontSize: 13 }}>{item.variant?.price || item.sub.price} · {duration}</span>;
  };

  const renderPromotionBadge = (appointment: Appointment) => {
    const title = appointment.promotionOrigin?.title || appointment.promotion?.title;
    const percent = Number(appointment.promotion?.percent);
    const badgeText = Number.isFinite(percent) && percent > 0 ? '−' + percent + ' % · Promo' : 'Promo';
    if (!appointment.promotionOrigin?.id && !appointment.promotion?.promotionId) return null;
    return <span title={'Reserva con promoción: ' + (title || 'Promoción')} aria-label={'Reserva con promoción: ' + (title || 'Promoción')}
      style={{ display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', gap: 4, padding: '3px 7px', borderRadius: 6, background: '#C99E52', color: '#221D19', fontSize: 10, fontWeight: 700, lineHeight: 1.3, marginTop: 3 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 13 13 20a2 2 0 0 1-2.83 0L2 11.83V2h9.83L20 10.17a2 2 0 0 1 0 2.83Z"/><circle cx="7" cy="7" r="1"/></svg>{badgeText}
    </span>;
  };

  const renderDurationAgenda = (days: { name: string; dateObj: Date; dateFormatted: string }[]) => {
    const minutes = (time: string) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; };
    return <div className="studio-agenda-grid" style={{ display: 'grid', gridTemplateColumns: '52px repeat(' + days.length + ', minmax(105px, 1fr))',
      gridTemplateRows: 'auto repeat(' + hoursList.length + ', ' + agendaRowHeight + 'px)', gap: '2px',
      minWidth: days.length > 1 ? '700px' : '280px' }}>
      <div style={{ gridRow: 1, gridColumn: 1, color: '#D8C29A', padding: '8px', fontSize: '12px' }}>Hora</div>
      {days.map((day, column) => <div key={'header-' + column} className={`studio-agenda-day-heading ${formatDateKey(day.dateObj) === formatDateKey(agendaNow) ? 'studio-agenda-today' : ''}`} style={{ gridRow: 1, gridColumn: column + 2,
        background: '#322A25', color: '#FFF8EE', textAlign: 'center', padding: '8px', fontSize: '12px',
        borderBottom: '1px solid #C5A059' }}><strong>{day.name}</strong><div>{day.dateFormatted}</div>
      </div>)}
      {hoursList.map((time, row) => <React.Fragment key={time}>
        <div style={{ gridRow: row + 2, gridColumn: 1, color: '#D8C29A', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{time}</div>
        {days.map((day, column) => {
          const key = formatDateKey(day.dateObj);
          const holiday = isDateBlockedByHoliday(key);
          const working = !holiday && (enableOutOfHours || isAgendaTimeWorking(day.dateObj, time));
          const occupied = appointments.some(item => isActiveAppointment(item) && item.dateKey === key && item.saturdayApproval?.status !== 'rejected' &&
            minutes(time) >= minutes(item.time) && minutes(time) < minutes(item.time) + (item.durationMinutes || 45));
          return <button key={key} className={`studio-agenda-slot ${formatDateKey(day.dateObj) === formatDateKey(agendaNow) ? 'studio-agenda-today' : ''}`} type="button" disabled={!working || timeBlockConflict(key, time) || (occupied && !enableDoubleBooking)}
            aria-label={day.name + ' ' + day.dateFormatted + ' ' + time + (working ? ' Crear cita' : ' No disponible')}
            onClick={() => chooseSlotAction(day.dateObj, day.name, time)} onDragOver={handleDragOver}
            onDrop={event => handleDrop(event, day.dateObj, day.name, time)}
            style={{ gridRow: row + 2, gridColumn: column + 2, border: '1px solid rgba(234, 220, 199, 0.35)', borderRadius: '1px',
              background: holiday && day.dateObj.getDay() !== 6 ? '#F2DCD8' : working ? '#322A25' : 'rgba(41, 35, 31, 0.55)', color: '#FFF8EE', cursor: working ? 'pointer' : 'default',
              padding: '2px', fontSize: '10px' }}>{holiday ? 'Cerrado' : ''}</button>;
        })}
      </React.Fragment>)}
      {(() => {
        const column = days.findIndex(day => formatDateKey(day.dateObj) === formatDateKey(agendaNow));
        const nowMinute = agendaNow.getHours() * 60 + agendaNow.getMinutes();
        const row = hoursList.findIndex((time, index) => nowMinute >= minutes(time) &&
          nowMinute < Math.min(minutes(time) + agendaStep, index + 1 < hoursList.length ? minutes(hoursList[index + 1]) : 1440));
        if (column < 0 || row < 0) return null;
        const offset = Math.min(1, (nowMinute - minutes(hoursList[row])) / agendaStep) * agendaRowHeight;
        return <div aria-label={'Hora actual: ' + agendaNow.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          style={{ gridRow: row + 2, gridColumn: column + 2, position: 'relative', alignSelf: 'start',
            top: offset, height: 0, borderTop: '1px solid #B8972E', zIndex: 5, pointerEvents: 'none' }}>
          <span style={{ position: 'absolute', left: '-3px', top: '-3px', width: '5px', height: '5px', borderRadius: '50%', background: '#C99E52' }} />
        </div>;
      })()}
      {days.flatMap((day, column) => timeBlocks.filter(block => block.dateKey === formatDateKey(day.dateObj)).map(block => {
        const row = hoursList.indexOf(block.time), start = minutes(block.time);
        const span = Math.max(1, hoursList.filter(time => minutes(time) >= start && minutes(time) < start + block.durationMinutes).length);
        return <button type="button" key={block.id} onClick={() => { if (window.confirm('¿Desbloquear este periodo: ' + block.reason + '?')) setTimeBlocks(previous => previous.filter(item => item.id !== block.id)); }}
          title="Pulsa para desbloquear" style={{ gridRow: (row + 2) + ' / span ' + span, gridColumn: column + 2,
            zIndex: 3, background: '#3E342C', border: '1px dashed rgba(255, 248, 238, 0.35)', color: '#D6CBB8', padding: '6px', borderRadius: '5px',
            textAlign: 'left', cursor: 'pointer', fontSize: '11px', overflow: 'hidden' }}>
          <strong>{block.time}–{minuteTime(start + block.durationMinutes)}</strong><div>Bloqueado · {block.reason}</div>
        </button>;
      }))}
      {days.flatMap((day, column) => {
        const daily = appointments.filter(item => isActiveAppointment(item) && item.dateKey === formatDateKey(day.dateObj) && item.saturdayApproval?.status !== 'rejected')
          .sort((left, right) => left.time.localeCompare(right.time));
        const laneEnds: number[] = [];
        const placed = daily.map(item => {
          const start = minutes(item.time), end = start + (item.durationMinutes || 45);
          let lane = laneEnds.findIndex(value => value <= start);
          if (lane < 0) lane = laneEnds.length;
          laneEnds[lane] = end;
          return { item, lane, start, end };
        });
        const lanes = Math.max(1, laneEnds.length);
        return placed.map(({item, lane, start, end}) => {
          const row = hoursList.indexOf(item.time);
          if (row < 0) return null;
          const span = Math.max(1, hoursList.filter(time => minutes(time) >= start && minutes(time) < end).length);
          const serviceLabel = item.services?.length
            ? item.services.map(service => bookingName(service.sub)).join(' + ')
            : appointmentServiceNames(item);
          const appointmentText = item.completedAt || item.saturdayApproval?.status === 'pending' ? '#FFF8EE' : '#243529';
          return <button type="button" className="studio-agenda-appointment" key={item.id} draggable onDragStart={event => handleDragStart(event, item.id)}
            onClick={() => setViewApptModal(item)} onDragOver={handleDragOver}
            onDrop={event => { event.stopPropagation(); handleDrop(event, day.dateObj, day.name, item.time); }}
            title={item.clientName + ' · ' + item.time + '–' + minuteTime(end) + ' · ' + serviceLabel}
            style={{ gridRow: (row + 2) + ' / span ' + span, gridColumn: column + 2, zIndex: 2,
              marginLeft: (lane * 100 / lanes) + '%', width: (100 / lanes) + '%', boxSizing: 'border-box',
              alignSelf: 'stretch', minWidth: 0, textAlign: 'left', padding: '7px 8px',
              background: adminAppointmentColor(item).background, border: '1px solid #3A312A', borderLeft: '3px solid ' + adminAppointmentColor(item).border,
              color: appointmentText, borderRadius: '5px', cursor: 'pointer', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '3px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 3, width: '100%' }}><strong style={{ fontSize: '10px', letterSpacing: '0.3px', color: appointmentText }}>{item.time}–{minuteTime(end)}</strong>{renderPromotionBadge(item)}</div>
            <strong style={{ color: appointmentText, fontSize: '13px', lineHeight: 1.25, overflowWrap: 'anywhere' }}>{item.clientName}</strong>
            <span style={{ fontSize: '11px', lineHeight: 1.3, color: appointmentText, overflowWrap: 'anywhere' }}>{serviceLabel}</span>
          </button>;
        });
      })}
    </div>;
  };

  const renderClientPushPanel = () => (<section style={{ padding: '12px', background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '8px' }}>
              <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, margin: '0 0 10px' }}>Notificaciones push: <strong style={{ color: pushStatus === 'subscribed' ? '#8FC98F' : '#E4C687' }}>{pushStatusLabel()}</strong></p>
              {pushNeedsLogin && <div style={{ marginBottom: '12px', color: '#FFF8EE' }}>
                <label htmlFor="push-login-pin">Confirma tu PIN para activar los avisos</label>
                <input id="push-login-pin" type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={pushLoginPin} onChange={event => setPushLoginPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} style={{ display: 'block', margin: '8px 0', padding: '10px', color: '#2C2521', background: '#EADCC7' }} />
                <button type="button" onClick={handlePushLogin} disabled={pushBusy || pushLoginPin.length !== 4}>Recuperar sesión sin perder mi reserva</button>
              </div>}
              {(pushStatus === 'default' || pushStatus === 'subscribed') && !pushNeedsLogin && <button type="button" onClick={handleEnablePush} disabled={pushBusy} style={{ width: '100%', minHeight: '46px', padding: '12px', background: 'transparent', color: '#E4C687', border: '1px solid #C49A58', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: pushBusy ? 'wait' : 'pointer' }}>{pushBusy ? 'Comprobando…' : pushStatus === 'subscribed' ? 'Enviar notificación de prueba' : 'Activar notificaciones'}</button>}
              {pushStatus === 'config-pending' && <p style={{ color: '#E4C687', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>El Studio todavía no tiene activas las notificaciones. Prueba de nuevo más tarde.</p>}
              {pushStatus === 'denied' && <p style={{ color: '#F2B8AC', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>Tienes las notificaciones bloqueadas para este sitio. Para recibirlas, toca el icono de información junto a la dirección en tu navegador y permite las notificaciones{showInstallBanner ? ', o instala primero la app del Studio desde el aviso de instalación' : ''}.</p>}
              {(() => {
                const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                const isAndroid = /Android/.test(navigator.userAgent);
                if (isIos) return (
                  <details style={{ marginTop: '10px' }}>
                    <summary style={{ color: '#D8C29A', fontSize: '12px', cursor: 'pointer' }}>Instrucciones para iPhone o iPad</summary>
                    <ol style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.7, margin: '8px 0 0', paddingLeft: '18px' }}>
                      <li>Abre esta página con Safari.</li>
                      <li>Toca el botón Compartir (el cuadrado con una flecha hacia arriba).</li>
                      <li>Elige «Añadir a pantalla de inicio» y confirma con «Añadir».</li>
                      <li>Abre la app del Studio desde el icono nuevo de tu pantalla de inicio.</li>
                      <li>Inicia sesión con tu PIN y vuelve a pulsar «Activar notificaciones».</li>
                    </ol>
                  </details>
                );
                if (isAndroid) return (
                  <details style={{ marginTop: '10px' }}>
                    <summary style={{ color: '#D8C29A', fontSize: '12px', cursor: 'pointer' }}>Instrucciones para Android</summary>
                    <ol style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.7, margin: '8px 0 0', paddingLeft: '18px' }}>
                      <li>Abre esta página con Chrome.</li>
                      <li>Toca el aviso de instalación que aparece abajo, o el menú ⋮ y luego «Añadir a pantalla de inicio».</li>
                      <li>Abre la app del Studio desde el icono nuevo de tu pantalla de inicio.</li>
                      <li>Inicia sesión con tu PIN y vuelve a pulsar «Activar notificaciones».</li>
                    </ol>
                  </details>
                );
                return (
                  <details style={{ marginTop: '10px' }}>
                    <summary style={{ color: '#D8C29A', fontSize: '12px', cursor: 'pointer' }}>Instrucciones para ordenador</summary>
                    <ol style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.7, margin: '8px 0 0', paddingLeft: '18px' }}>
                      <li>Haz clic en el icono de la candado o de información junto a la dirección.</li>
                      <li>Permite las notificaciones para este sitio.</li>
                      <li>Vuelve a pulsar «Activar notificaciones».</li>
                    </ol>
                  </details>
                );
              })()}
              {pushTestResult && <p role="status" style={{ color: '#8FC98F', fontSize: '12px', lineHeight: 1.6, margin: '10px 0 0' }}>{pushTestResult}</p>}
              {pushError && <p role="alert" style={{ color: '#F2B8AC', fontSize: '12px', lineHeight: 1.6, margin: '10px 0 0' }}>{pushError}</p>}
            </section>);
  return (
    <div className={selectedServicesToBook.length > 0 && ['catalogBooking', 'categoryScreen', 'serviceDetail'].includes(currentScreen) ? 'lst-has-booking-summary' : undefined} lang={currentScreen === 'adminPanel' || currentScreen === 'adminLogin' ? 'es' : currentLang} dir={currentLang === 'ar' && currentScreen !== 'adminPanel' && currentScreen !== 'adminLogin' ? 'rtl' : 'ltr'} style={{ backgroundColor: '#29231F', color: '#FFF8EE', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: "'Garet', 'Poppins', sans-serif", margin: 0, padding: '20px 20px 96px', position: 'relative' }}>
      
      <style>{`
        .lst-app-header { display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 520px; padding: 4px 0 12px; }
        .lst-app-header-title { color: #FFF8EE; font-family: 'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif; letter-spacing: 0.03em; font-size: 24px; font-weight: 400; margin: 0; text-align: center; }
        .lst-app-header-sub { color: #C9BCA9; font-size: 9px; letter-spacing: 2px; margin: 2px 0 0; text-align: center; }
        .lst-app-header-btn { background: none; border: none; color: #FFF8EE; width: 40px; height: 40px; min-width: 40px; min-height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 50%; padding: 0; }
        .lst-app-header-btn:hover { background: rgba(255, 248, 238, 0.14); }
        .lst-card { background: #322A25; border: 1px solid rgba(255, 248, 238, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); }
        .lst-card-media { width: 100%; height: 200px; object-fit: cover; display: block; }
        .lst-ai-tag { position: absolute; top: 10px; right: 10px; background: rgba(20, 15, 12, 0.66); color: #FBF6EC; font-size: 10px; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 999px; }
        .lst-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-top: 1px solid rgba(255, 248, 238, 0.14); }
        .lst-card-footer strong { display: block; font-family: 'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif; letter-spacing: 0.02em; font-size: 19px; font-weight: 400; color: #FFF8EE; }
        .lst-card-footer span { display: block; color: #4E443B; font-size: 13px; margin-top: 3px; }
        .lst-btn-ver { display: inline-flex; align-items: center; gap: 6px; background: #C49A58; color: #29231F; border: none; padding: 9px 16px; min-height: 38px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .lst-c-cta { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
        .lst-c-cta .lst-btn-ver { flex: 1 1 auto; min-width: 0; min-height: 44px; padding: 0 10px; font-size: 13px; font-weight: 500; justify-content: center; }
        .lst-btn-ver:hover { background: #CFA765; }
        .lst-advisor-panel > summary::-webkit-details-marker { display: none; }
        .lst-advisor-panel > summary:focus-visible { outline: 2px solid #E4C687; outline-offset: 5px; border-radius: 8px; }
        .lst-advisor-close-label { display: none; }
        .lst-advisor-panel[open] .lst-advisor-open-label { display: none; }
        .lst-advisor-panel[open] .lst-advisor-close-label { display: inline; }
        .lst-advisor-panel[open] summary > span:last-child > svg { transform: rotate(180deg); }
        .lst-mobile-booking { display: none; }
        @media (max-width: 640px) {
          .lst-mobile-booking { display: block; position: fixed; bottom: calc(76px + env(safe-area-inset-bottom)); left: 10px; right: 10px; z-index: 49; background: #221D19; border: 1px solid rgba(196,154,88,.45); border-radius: 14px; padding: 12px; box-shadow: 0 -4px 24px rgba(0,0,0,.35); max-height: 50dvh; overflow-y: auto; }
          .lst-has-booking-summary { padding-bottom: calc(230px + env(safe-area-inset-bottom)) !important; }
          #booking-selection-summary { scroll-margin-top: 20px; }
        }
        .lst-bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: #221D19; border-top: 1px solid rgba(255, 248, 238, 0.08); display: flex; justify-content: space-around; padding: 6px 8px calc(10px + env(safe-area-inset-bottom)); max-width: 640px; margin: 0 auto; }
        .lst-bottom-nav button { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; color: #C9BCA9; font-size: 11px; cursor: pointer; padding: 6px 0; }
        .lst-bottom-nav button.lst-bottom-active { color: #C49A58; }
        .lst-bottom-nav button:hover { color: #E4C687; }
        .lst-detail-eyebrow { color: #D8C29A; font-size: 11px; letter-spacing: 1.5px; }
        .lst-detail-title { font-family: 'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif; letter-spacing: 0.02em; font-size: 24px; font-weight: 400; color: #E4C687; margin: 6px 0 0; }
        .lst-detail-desc { color: #EFE5D4; font-size: 14px; line-height: 1.7; margin: 8px 0 0; }
        .lst-include-row { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid rgba(255, 248, 238, 0.14); }
        .lst-include-row:last-child { border-bottom: none; }
        .lst-include-icon { width: 38px; height: 38px; min-width: 38px; border-radius: 50%; background: rgba(255, 248, 238, 0.07); border: 1px solid rgba(255, 248, 238, 0.14); display: flex; align-items: center; justify-content: center; color: #E4C687; }
        .lst-include-label { color: #FFF8EE; font-size: 14px; }
        .lst-price-box { display: flex; align-items: center; gap: 10px; border: 1px solid rgba(255, 248, 238, 0.14); background: rgba(255, 248, 238, 0.06); border-radius: 10px; padding: 12px 14px; color: #FFF8EE; font-size: 13px; }
        .lst-cta-full { width: 100%; min-height: 54px; background: #C49A58; color: #29231F; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .lst-cta-full:hover { background: #CFA765; }
        .lst-btn-back { background: none; border: none; color: #FFF8EE; width: 40px; height: 40px; min-width: 40px; min-height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
        .lst-btn-back:hover { background: rgba(255, 248, 238, 0.1); border-radius: 50%; }
        .lst-cat-card { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; background: #322A25; border: 1px solid rgba(255, 248, 238, 0.08); border-radius: 16px; padding: 12px; min-height: 76px; cursor: pointer; box-shadow: 0 8px 22px rgba(0, 0, 0, 0.25); touch-action: manipulation; }
        .lst-cat-card:hover { background: #3A312A; }
        .lst-cat-card:active { transform: scale(0.99); }
        .lst-cat-thumb { width: 56px; height: 56px; min-width: 56px; border-radius: 12px; overflow: hidden; background: #3E342C; display: flex; align-items: center; justify-content: center; }
        .lst-cat-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .lst-cat-thumb strong { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; letter-spacing: 3px; color: #E4C687; }
        .lst-cat-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .lst-cat-info strong { color: #FFF8EE; font-size: 16px; line-height: 1.3; font-weight: 500; }
        .lst-cat-info small { color: #4E443B; font-size: 12px; }
        .lst-cat-card svg { color: #E4C687; flex-shrink: 0; pointer-events: none; }
        .lst-carousel-shell { position: relative; display: flex; align-items: center; gap: 6px; min-width: 0; }
        .lst-carousel { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 4px 2px 8px; scrollbar-width: none; min-width: 0; -webkit-overflow-scrolling: touch; }
        .lst-carousel::-webkit-scrollbar { display: none; }
        .lst-c-card { flex: 0 0 240px; scroll-snap-align: start; background: #322A25; border: 1px solid rgba(255, 248, 238, 0.08); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 22px rgba(0, 0, 0, 0.25); }
        .lst-c-media { display: block; width: 100%; height: 190px; padding: 0; border: none; background: #3E342C; cursor: pointer; overflow: hidden; position: relative; }
        .lst-c-media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s ease; }
        .lst-c-media .lst-ai-tag { position: absolute; top: 10px; right: 10px; background: rgba(20, 15, 12, 0.66); color: #FBF6EC; font-size: 10px; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 999px; }
        .lst-c-media:hover img { transform: scale(1.04); }
        .lst-c-media-fallback { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; height: 100%; }
        .lst-c-media-fallback strong { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 38px; letter-spacing: 4px; color: #E4C687; line-height: 1; }
        .lst-c-media-fallback small { font-size: 10px; letter-spacing: 2px; color: #E4C687; }
        .lst-c-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .lst-c-name { background: none; border: none; padding: 0; text-align: left; font-family: 'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif; letter-spacing: 0.02em; font-size: 18px; font-weight: 400; color: #FFF8EE; cursor: pointer; }
        .lst-c-desc { color: #4E443B; font-size: 12px; line-height: 1.55; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .lst-c-meta { color: #E4C687; font-size: 13px; font-weight: 600; margin: auto 0 0; padding-top: 10px; }
        .lst-c-cta { margin-top: 4px; justify-content: center; }
        .lst-carousel-arrow { display: none; width: 36px; height: 36px; min-width: 36px; border-radius: 50%; border: 1px solid rgba(255, 248, 238, 0.14); background: #221D19; color: #E4C687; cursor: pointer; align-items: center; justify-content: center; padding: 0; }
        .lst-carousel-arrow:hover { background: #322A25; }
        @media (max-width: 640px) {
          .lst-bottom-nav { max-width: 100%; }
          .lst-c-card { flex-basis: 76%; }
          .lst-carousel { scroll-padding-left: 2px; }
        }
        @media (min-width: 900px) { .lst-carousel-arrow { display: flex; } }
      `}</style>
      {/* IDIOMA + SESIÓN · fila superior compacta */}
      <div hidden={currentScreen === 'adminPanel' || currentScreen === 'adminLogin'} style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '12px' }}>
        {currentScreen === 'clientPortal' && (
          <button type="button" className="lst-app-header-btn" onClick={handleLogout} aria-label={t('logout')} style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, background: '#221D19', border: '1px solid rgba(212, 175, 55, 0.4)', color: '#E4C687' }}>
            <LogOut size={20} strokeWidth={1.7} aria-hidden="true" />
          </button>
        )}
        <div style={{ position: 'relative' }}>
          <button type="button" aria-haspopup="listbox" aria-expanded={langMenuOpen} aria-label="Language / Idioma" onClick={() => setLangMenuOpen(open => !open)} style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#221D19', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '999px', color: '#FFF8EE', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer', padding: 0 }}>
            <Globe size={16} strokeWidth={1.7} style={{ color: '#E4C687' }} aria-hidden="true" />{currentLang.toUpperCase()}
          </button>
          {langMenuOpen && <>
            <div aria-hidden="true" onClick={() => setLangMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'transparent' }} />
            <div role="listbox" aria-label="Language / Idioma" style={{ position: 'absolute', top: '52px', right: 0, zIndex: 999, background: '#221D19', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '12px', padding: '6px', minWidth: '160px', maxHeight: '56vh', overflowY: 'auto', boxShadow: '0 16px 38px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {([['es', 'Español'], ['en', 'English'], ['fr', 'Français'], ['it', 'Italiano'], ['pt', 'Português'], ['de', 'Deutsch'], ['nl', 'Nederlands'], ['pl', 'Polski'], ['cs', 'Čeština'], ['nb', 'Norsk'], ['sv', 'Svenska'], ['ar', 'العربية']] as const).map(([code, label]) => (
                <button key={code} type="button" role="option" aria-selected={currentLang === code} onClick={() => { setCurrentLang(code); setLangMenuOpen(false); }} style={{ textAlign: 'left', background: currentLang === code ? 'rgba(201, 158, 82, 0.16)' : 'transparent', border: 'none', borderLeft: currentLang === code ? '2px solid #C99E52' : '2px solid transparent', color: currentLang === code ? '#E4C687' : '#FFF8EE', fontSize: '13px', padding: '10px 12px', minHeight: '44px', borderRadius: '8px', cursor: 'pointer' }}>{label}</button>
              ))}
            </div>
          </>}
        </div>
      </div>

      {!['clientPin', 'clientRegistration', 'adminLogin', 'adminPanel'].includes(currentScreen) && (
        <nav className="lst-bottom-nav" aria-label="Navegación principal" onClickCapture={event => { if (visualBookingBusyRef.current) { event.preventDefault(); event.stopPropagation(); } }} style={visualBookingBusy ? { pointerEvents: 'none', opacity: 0.6 } : undefined}>
          <button type="button" className={currentScreen === 'clientPortal' ? 'lst-bottom-active' : ''} onClick={() => { setViewServiceDetail(null); setCurrentScreen('clientPortal'); }}>
            <Home size={20} strokeWidth={1.7} aria-hidden="true" /><span>Inicio</span>
          </button>
          <button type="button" className={currentScreen === 'catalogBooking' || currentScreen === 'categoryScreen' || currentScreen === 'serviceDetail' ? 'lst-bottom-active' : ''} onClick={() => { setViewServiceDetail(null); setCurrentScreen('catalogBooking'); }}>
            <Scissors size={20} strokeWidth={1.7} aria-hidden="true" /><span>Servicios</span>
          </button>
          <button type="button" className={currentScreen === 'myAppointmentsPage' ? 'lst-bottom-active' : ''} onClick={() => { setViewServiceDetail(null); setCurrentScreen('myAppointmentsPage'); }}>
            <CalendarDays size={20} strokeWidth={1.7} aria-hidden="true" /><span>Mis citas</span>
          </button>
          <button type="button" aria-label="Mis notificaciones" aria-expanded={pushPanelOpen} onClick={() => { setPushPanelOpen(true); setPushError(null); setPushTestResult(null); void refreshPushStatus(); }}>
            <Bell size={20} strokeWidth={1.7} aria-hidden="true" /><span>Avisos</span>
          </button>
          <PromotionsPortalButton
            promotions={bizConfig.promotions}
            serviceOptions={catalog.flatMap(cat => cat.subservices.filter(sub => sub.active !== false).map(sub => ({ id: sub.id, label: bookingName(sub) })))}
            onReserve={promotion => {
              const currentPromotion = bizConfig.promotions?.find(item => item.id === promotion.id);
              const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
              if (!currentPromotion || !currentPromotion.active || (currentPromotion.startDate && currentPromotion.startDate > today) || (currentPromotion.endDate && currentPromotion.endDate < today)) {
                alert('Esta promoción ya no está disponible.'); return false;
              }
              const ids = promotionServiceIds(currentPromotion);
              const services = ids.map(id => catalog.flatMap(category => category.subservices).find(service => service.id === id && service.active !== false));
              if (!ids.length || services.some(service => !service)) { alert('Uno de los servicios de esta promoción no está disponible. Contacta con el Studio.'); return false; }
              const selection = services.map(service => ({ sub: service!, variant: null }));
              if (selection.some(item => item.sub.isCutGoService) && selection.some(item => item.sub.isStylingService && !item.sub.isCutGoService)) {
                alert('Esta promoción combina peinado y Cut & Go. Contacta con el Studio para revisar los servicios incluidos.'); return false;
              }
              setSelectedPromotionOrigin({ id: currentPromotion.id, title: currentPromotion.title });
              setSelectedPromotionId(currentPromotion.discountPercent ? currentPromotion.id : null);
              setSelectedServicesToBook(selection);
              setViewServiceDetail(null);
              setPortalSearch('');
              setPortalSearchExpanded({});
              setCurrentScreen('catalogBooking');
              window.setTimeout(() => document.getElementById('booking-selection-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              return true;
            }}
          />
          <button type="button" className={currentScreen === 'clientHistoryPage' ? 'lst-bottom-active' : ''} onClick={() => setCurrentScreen('clientHistoryPage')}>
            <User size={20} strokeWidth={1.7} aria-hidden="true" /><span>Perfil</span>
          </button>
        </nav>
      )}

      {selectedServicesToBook.length > 0 && ['catalogBooking', 'categoryScreen', 'serviceDetail'].includes(currentScreen) && (() => {
        const total = getSelectionTotal(selectedServicesToBook);
        const continueBooking = () => {
          const missing = selectedServicesToBook.find(item => item.sub.hasVariants && !!item.sub.variants?.length && !item.variant);
          const error = missing ? tf('requiredVariant', { service: bookingName(missing.sub) }) : getInactiveServiceError(selectedServicesToBook) || getStylingError(selectedServicesToBook) || getTonerError(selectedServicesToBook);
          if (error) {
            alert(error);
            setViewServiceDetail(null);
            setCurrentScreen('catalogBooking');
            window.setTimeout(() => document.getElementById('booking-selection-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            return;
          }
          setViewServiceDetail(null);
          setCurrentScreen('visualAgenda');
          window.scrollTo({ top: 0 });
        };
        return <>
          
          <aside className="lst-mobile-booking" aria-label="Resumen de reserva">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', color: '#FFF8EE', fontSize: 14 }}>{selectedServicesToBook.length} {selectedServicesToBook.length === 1 ? 'servicio elegido' : 'servicios elegidos'}</strong>
                <p style={{ margin: '4px 0 0', color: '#D6CBB8', fontSize: 12 }}>{getModalDuration(selectedServicesToBook)} min{portalShowsPrices && total.total > 0 && <> · {total.orientative ? 'Orientativo: ' : ''}{total.total.toFixed(2).replace('.', ',')} €</>}</p>
              </div>
              <button type="button" onClick={continueBooking} style={{ minHeight: 46, padding: '10px 16px', border: 0, borderRadius: 9, background: '#C49A58', color: '#221D19', fontWeight: 600, cursor: 'pointer' }}>Continuar →</button>
            </div>
            <details key={currentScreen} style={{ marginTop: 6 }}>
              <summary style={{ color: '#E4C687', fontSize: 12, minHeight: 30, cursor: 'pointer', padding: '6px 0' }}>Ver servicios elegidos</summary>
              <div style={{ maxHeight: '25dvh', overflowY: 'auto' }}>
                {selectedServicesToBook.map(item => <div key={item.sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid rgba(255,248,238,.12)', fontSize: 12 }}>
                  <span style={{ flex: 1, color: '#FFF8EE', padding: '8px 0' }}>{serviceText(catalog.flatMap(category => category.subservices).find(service => service.id === item.sub.id) || item.sub, 'name')}{item.variant && <> · {variantText(item.variant, item.sub)}</>}</span>
                  <button type="button" aria-label={'Quitar ' + serviceText(item.sub, 'name')} onClick={() => setSelectedServicesToBook(previous => previous.filter(selected => selected.sub.id !== item.sub.id))} style={{ minHeight: 44, minWidth: 44, background: 'none', border: 0, color: '#E4C687', cursor: 'pointer' }}>×</button>
                </div>)}
              </div>
            </details>
          </aside>
        </>;
      })()}

      {/* 1. ACCESO PIN CLIENTE */}
      {currentScreen === 'clientPin' && (
        <main style={{ width: '100%', maxWidth: '460px', boxSizing: 'border-box', padding: '60px 24px 30px', textAlign: 'center' }}>
          <style>{`
            .studio-editorial-pin { background: transparent; border: none; border-bottom: 1px solid #B98A3E; border-radius: 0; color: #FFF8EE; width: 100%; height: 64px; font-family: 'Royal Hefana', 'Cormorant Garamond', Georgia, serif; font-size: 30px; letter-spacing: 18px; text-align: center; box-sizing: border-box; padding: 8px 0 8px 18px; outline: none; }
            .studio-editorial-pin:focus { border-bottom-color: #E4C687; }
            .studio-editorial-enter:hover { background: #E5C158 !important; }
            .studio-editorial-enter:focus-visible, .studio-editorial-logo:focus-visible { outline: 2px solid #B98A3E; outline-offset: 5px; }
            @media (max-width: 600px) { .studio-editorial-logo img { width: 180px !important; height: auto !important; } }
          `}</style>
          <button className="studio-editorial-logo" type="button" onClick={handleLogoClick} aria-label="L’Studio Ana" style={{ display: 'inline-block', border: 'none', background: 'none', padding: 0, cursor: 'pointer', marginBottom: '18px' }}>
            <img src={optimizedImageUrl(brandLogoSrc)} onError={fallbackBrandLogo} decoding="async" alt="L’A · Hair Experience" draggable={false} style={{ width: '210px', height: 'auto', objectFit: 'contain', display: 'block', mixBlendMode: 'screen' }} />
          </button>
          <h1 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', fontSize: '30px', margin: '0 0 12px' }}>L’Studio Ana</h1>
          <p style={{ color: '#D8C29A', fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 40px', lineHeight: 1.6 }}>{t('subtitle')}</p>
          <form onSubmit={handleClientPinSubmit} style={{ maxWidth: '280px', margin: '0 auto' }}>
            <label htmlFor="client-access-pin" style={{ display: 'block', color: '#D6CBB8', fontSize: '13px', marginBottom: '10px' }}>{t('enterPin')}</label>
            <input id="client-access-pin" className="studio-editorial-pin" dir="ltr" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" value={pin} onChange={event => { setPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4)); setPinError(false); }} aria-invalid={pinError} aria-describedby={pinError ? 'client-pin-error' : undefined} required />
            {pinError && <p id="client-pin-error" role="alert" style={{ color: '#F2B8AC', fontSize: '13px' }}>PIN incorrecto. Comprueba que es el correcto o usa «Primera vez» para registrarte.</p>}
            <button className="studio-editorial-enter" type="submit" disabled={pin.length !== 4} style={{ width: '100%', minHeight: '48px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 'none', borderRadius: '3px', padding: '14px', marginTop: '24px', fontSize: '13px', letterSpacing: '1px', cursor: 'pointer', opacity: pin.length === 4 ? 1 : 0.45 }}>{t('enterPortal')}</button>
          </form>
          <div style={{ width: '34px', height: '1px', background: 'rgba(212, 175, 55, 0.5)', margin: '30px auto 20px' }} />
          <button type="button" onClick={() => setCurrentScreen('clientRegistration')} style={{ background: 'none', border: 'none', color: '#D8C29A', padding: '12px 4px', minHeight: '44px', fontSize: '12px', cursor: 'pointer', lineHeight: 1.6 }}>{t('firstTimeRegister')}</button>
          {showInstallBanner && <p style={{ color: '#C9BCA9', fontSize: '11px', lineHeight: 1.7, margin: '16px 0 0' }}>{t('installDesc')}</p>}
        </main>
      )}

      {/* 1.1 PANTALLA DE REGISTRO NUEVA CLIENTA */}
      {currentScreen === 'clientRegistration' && (
        <div className="studio-registration" style={{ maxWidth: '440px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '0', padding: '48px 20px 24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <style>{`
            .studio-registration input { background: #3E342C !important; border: 1px solid rgba(212, 175, 55, 0.22) !important; border-radius: 5px !important; min-height: 46px; box-sizing: border-box; width: 100%; padding: 12px !important; font-size: 16px !important; color: #FFF8EE !important; }
            .studio-registration input:focus { outline: none; border-color: #E4C687 !important; }
            .studio-registration label { font-size: 12px !important; color: #D6CBB8 !important; margin-bottom: 4px; }
            .studio-registration button:focus-visible { outline: 2px solid #B98A3E; outline-offset: 4px; }
          `}</style>
          <img src={optimizedImageUrl(brandLogoSrc)} onError={fallbackBrandLogo} decoding="async" alt="L’A · Hair Experience" style={{ width: '150px', height: 'auto', mixBlendMode: 'screen', display: 'block', margin: '0 auto 12px' }} />
          <h2 style={{ color: '#FFF8EE', fontSize: '25px', fontWeight: 'normal', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: 0, textAlign: 'center' }}>{t('clientRegistrationTitle')}</h2>
          <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.7, textAlign: 'center', margin: '0 0 10px 0' }}>{t('clientRegistrationDesc')}</p>
          <form onSubmit={handleRegistroClientaPortalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#D6CBB8', fontSize: '11px', fontWeight: 'bold' }}>{t('nameLabel')}</label>
              <input type="text" placeholder="Ej. Ana" value={regNombre} onChange={(e) => setRegNombre(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '10px', backgroundColor: '#3E342C', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#D6CBB8', fontSize: '11px' }}>{t('surnamesLabel')}</label>
              <input type="text" placeholder="Ej. García López" value={regApellidos} onChange={(e) => setRegApellidos(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#3E342C', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#D6CBB8', fontSize: '11px' }}>{t('birthDateLabel')}</label>
                <input type="text" placeholder="DD/MM/AAAA" value={regNacimiento} onChange={(e) => setRegNacimiento(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#3E342C', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#D6CBB8', fontSize: '11px' }}>{t('phoneLabel')}</label>
                <input type="tel" autoComplete="tel" placeholder="600111222" value={regTelefono} onChange={(e) => setRegTelefono(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#3E342C', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#D6CBB8', fontSize: '11px', fontWeight: 'bold' }}>{t('emailLabel')}</label>
              <input type="email" autoComplete="email" placeholder="tucorreo@gmail.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '10px', backgroundColor: '#3E342C', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#D6CBB8', fontSize: '11px', fontWeight: 'bold' }}>{t('pinLabel')}</label>
              <input type="password" inputMode="numeric" pattern="[0-9]{4}" placeholder="••••" maxLength={4} value={regPin} onChange={(e) => setRegPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} onFocus={(e) => e.target.select()} required style={{ padding: '10px', backgroundColor: '#3E342C', border: '1px solid #B98A3E', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px', textAlign: 'center', letterSpacing: '4px' }} />
            </div>
            <button type="submit" disabled={adminBookingSaving} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '14px', minHeight: '48px', borderRadius: '3px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' }}>
              {t('completeRegisterBtn')}
            </button>
          </form>
          <button onClick={() => setCurrentScreen('clientPin')} style={{ background: 'none', border: 'none', color: '#D6CBB8', fontSize: '12px', minHeight: '44px', cursor: 'pointer', textAlign: 'center' }}>
            {t('backToPin')}
          </button>
        </div>
      )}

      {/* 2. PORTAL CLIENTE */}
      {currentScreen === 'clientPortal' && (
        <div className="lst-page" style={{ maxWidth: '520px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '16px', padding: '0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="lst-app-header">
            <span style={{ width: 40, display: 'block' }} aria-hidden="true" />
            <div style={{ textAlign: 'center' }}>
              <h2 className="lst-app-header-title">{bizConfig.name}</h2>
              <p className="lst-app-header-sub">{t('subtitle')}</p>
            </div>
            <button className="lst-app-header-btn" onClick={handleLogout} aria-label={t('logout')}>
              <LogOut size={20} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
          {bizConfig.homeHeroImage && (
            <figure style={{ margin: 0, borderRadius: '18px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)', lineHeight: 0 }}>
              <img
                src={optimizedImageUrl(bizConfig.homeHeroImage)}
                alt="Interior de L’Studio Ana"
                decoding="async"
                fetchPriority="high"
                style={{ width: '100%', height: 'min(58vw, 340px)', objectFit: 'cover', objectPosition: `${bizConfig.homeHeroImagePosition?.x ?? 50}% ${bizConfig.homeHeroImagePosition?.y ?? 62}%`, display: 'block' }}
              />
            </figure>
          )}
          <div style={{ padding: '6px 0 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ color: '#FFF8EE', fontSize: '30px', lineHeight: 1.2, fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.04em', margin: 0 }}>Bienvenida a tu espacio L’Studio.</p>
            <p style={{ color: '#D6CBB8', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{currentLang === 'es' ? t('careIntro') : `${t('hello')}, ${currentClientRecord?.nombre || t('welcome')}. ${t('careIntro')}`}</p>
            <details style={{ color: '#FFF8EE', fontSize: '12px', marginTop: '6px' }}>
              <summary style={{ cursor: 'pointer', padding: '6px 0' }}>{t('myDetails')}</summary>
              <p style={{ overflowWrap: 'anywhere' }}>{currentClientRecord?.email} · ID #{currentClientRecord?.idNum} · {currentClientRecord?.registroId}</p>
            </details>
          </div>
          <section aria-label="Reserva tu cita" style={{ background: 'linear-gradient(135deg, #221D19 0%, #322A25 100%)', border: '1px solid rgba(212, 175, 55, 0.45)', borderRadius: '14px', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: 40, height: 40, minWidth: 40, borderRadius: '50%', background: 'rgba(201, 158, 82, 0.14)', border: '1px solid rgba(212, 175, 55, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E4C687' }}><Scissors size={19} strokeWidth={1.7} aria-hidden="true" /></span>
              <div>
                <h3 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.03em', fontSize: '19px', fontWeight: 'normal', margin: 0 }}>Reserva tu cita</h3>
                <p style={{ color: '#D6CBB8', fontSize: '12px', margin: '2px 0 0', lineHeight: 1.5 }}>Elige tus servicios y tu momento en el Studio.</p>
              </div>
            </div>
            <button type="button" onClick={() => { setViewServiceDetail(null); setPortalSearch(''); setPortalSearchExpanded({}); setCurrentScreen('catalogBooking'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ width: '100%', minHeight: '52px', background: '#C49A58', color: '#29231F', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{t('bookNext')} <ArrowRight size={17} strokeWidth={2} aria-hidden="true" /></button>
          </section>
          <div style={{ textAlign: 'center', padding: '10px 0', color: '#FFF8EE', fontSize: '13px', lineHeight: 1.7 }}>
            <strong style={{ display: 'block', fontWeight: 500 }}>¿Prefieres hablar con Ana?</strong>
            <p style={{ margin: '3px 0 8px', color: '#D6CBB8', fontSize: 12 }}>Resolvemos tus dudas antes de reservar.</p>
            <a href={`tel:${bizConfig.phone}`} style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>{t('callStudio')} · {bizConfig.phone}</a>
          </div>
          <details style={{ backgroundColor: '#26201B', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '14px', padding: '20px 18px', boxShadow: '0 10px 26px rgba(0, 0, 0, 0.25)' }}>
            <summary style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '19px', fontWeight: 'normal', cursor: 'pointer', minHeight: '24px', display: 'flex', alignItems: 'center', gap: '10px', listStyle: 'none' }}>
              <Clock3 size={19} strokeWidth={1.7} aria-hidden="true" style={{ color: '#E4C687', flexShrink: 0 }} />
              {t('studioHours')}
              <span aria-hidden="true" style={{ marginLeft: 'auto', color: '#D8C29A', fontSize: '13px', transition: 'transform 0.3s ease' }}>⌄</span>
            </summary>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column' }}>
              {[
                { day: 'Lunes', time: bizConfig.scheduleMonday },
                { day: 'Martes y miércoles', time: bizConfig.scheduleTueWed },
                { day: 'Jueves y viernes', time: bizConfig.scheduleThuFri },
                { day: 'Sábados', time: bizConfig.scheduleSaturday }
              ].map((row, index) => (
                <div key={row.day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px', padding: '13px 0', borderTop: index === 0 ? 'none' : '1px solid rgba(255, 248, 238, 0.08)' }}>
                  <span style={{ color: '#FFF8EE', fontSize: '14px', lineHeight: 1.5 }}>{row.day}</span>
                  <span style={{ color: '#FFF8EE', fontSize: '14px', lineHeight: 1.5, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {(row.time.match(/(\d{1,2}:\d{2})\D+(\d{1,2}:\d{2})/) || []).slice(1).join('–') || row.time}
                  </span>
                </div>
              ))}
            </div>
          </details>
          <section aria-label="Visítanos" style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ color: '#FFF8EE', fontSize: '19px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', margin: 0 }}>Nos vemos en el Studio</h3>
            <p style={{ color: '#D8C29A', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>Un espacio para ti y para el cuidado de tu cabello.</p>
            <p style={{ color: '#FFF8EE', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{bizConfig.location}</p>
          </section>
          <details style={{ background: 'linear-gradient(160deg, #221D19 0%, #322A25 100%)', border: '1px solid rgba(212, 175, 55, 0.45)', borderRadius: '14px', padding: '20px 18px', boxShadow: '0 14px 34px rgba(0, 0, 0, 0.35)' }}>
            <summary style={{ color: '#E4C687', fontSize: '15px', cursor: 'pointer', lineHeight: 1.5, fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.04em' }}>¿Cómo fue tu experiencia? Comparte tu opinión</summary>
          <div style={{ borderRadius: '12px', padding: '16px 0 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <a href={bizConfig.googleReviewUrl} target="_blank" rel="noreferrer" style={{ color: '#D8C29A', fontSize: '13px', minHeight: '44px', display: 'flex', alignItems: 'center' }}>Compartir mi experiencia en Google ↗</a>
            {feedbackSubmitted ? (
              <div style={{ textAlign: 'center', padding: '14px 12px', borderRadius: '8px', backgroundColor: selectedRating >= 4 ? '#8FC98F' : '#3E342C', border: `1px solid ${selectedRating >= 4 ? '#2E7D32' : 'rgba(212, 175, 55, 0.45)'}` }}>
                <p style={{ color: selectedRating >= 4 ? '#2E7D32' : '#8F6D24', fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                  {selectedRating >= 4 ? '¡Gracias por compartir tu opinión!' : 'Gracias por tu sinceridad'}
                </p>
                <p style={{ color: '#FFF8EE', fontSize: '12px', margin: '0 0 12px', lineHeight: 1.6 }}>Tu opinión se ha guardado y Ana podrá revisarla en la intranet. Si quieres, también puedes compartir tu experiencia en Google.</p>
                <a href={bizConfig.googleReviewUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: '#C49A58', color: '#29231F', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', minHeight: 44, boxSizing: 'border-box' }}>Compartir mi experiencia en Google ↗</a>

              </div>
            ) : (
              <form onSubmit={handleSendFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '4px 0' }}>
                  {[
                    { val: 1, label: 'Mala' },
                    { val: 2, label: 'Regular' },
                    { val: 3, label: 'Neutral' },
                    { val: 4, label: 'Buena' },
                    { val: 5, label: 'Excelente' }
                  ].map((item) => (
                    <div key={item.val} role="radio" aria-checked={selectedRating === item.val} aria-label={item.label} onClick={() => handleRatingSelect(item.val)} style={{ textAlign: 'center', cursor: 'pointer', opacity: selectedRating === item.val ? 1 : 0.45, transform: selectedRating === item.val ? 'scale(1.12)' : 'scale(1)', transition: 'all 0.3s ease', padding: '8px 6px', minWidth: '44px' }}>
                      <div style={{ fontSize: '30px', color: selectedRating === item.val ? '#E4C687' : '#D8C29A', textShadow: selectedRating === item.val ? '0 0 14px rgba(212, 175, 55, 0.45)' : 'none', transition: 'all 0.3s ease' }}>★</div>
                      <div style={{ fontSize: '10px', color: selectedRating === item.val ? '#E4C687' : '#D6CBB8', marginTop: '4px', letterSpacing: '0.03em' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="portal-feedback-comment" style={{ color: '#E4C687', fontSize: '15px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.04em' }}>Cuéntanos tu experiencia</label>
                  <p style={{ color: '#FFF8EE', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>¿Qué servicio te has realizado y cómo ha sido tu experiencia en L’Studio Ana? Nos encantará saber cómo te has sentido y qué destacarías de tu visita.</p>
                  <textarea maxLength={3000} disabled={feedbackSaving} id="portal-feedback-comment" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder="Escribe aquí tu experiencia…" rows={4} style={{ backgroundColor: 'rgba(234, 220, 199, 0.07)', border: '1px solid rgba(212, 175, 55, 0.35)', color: '#FFF8EE', borderRadius: '10px', padding: '12px', fontSize: '14px', lineHeight: 1.55, width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '44px' }} />
                </div>
                {feedbackError && <p role="alert" style={{ color: '#F5C7B8', fontSize: 13 }}>{feedbackError}</p>}
                <button disabled={feedbackSaving} type="submit" style={{ backgroundColor: '#C49A58', color: '#29231F', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', minHeight: '48px', letterSpacing: '0.03em', boxShadow: '0 8px 20px rgba(196, 154, 88, 0.3)' }}>
                  {feedbackSaving ? 'Enviando…' : t('sendReview')}
                </button>
              </form>
            )}
          </div>
          </details>
          <footer aria-label="Contacto y redes sociales" style={{ borderTop: '1px solid #302f29', paddingTop: '22px', paddingBottom: '96px' }}>
            <p style={{ color: '#D8C29A', fontSize: '11px', letterSpacing: '1.5px', textAlign: 'center', margin: '0 0 14px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}>CONTACTO Y REDES</p>
            <nav style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
              {[
                { key: 'maps', href: bizConfig.googleMapsUrl, label: 'Cómo llegar', Icon: MapPin },
                { key: 'wa', href: `https://wa.me/34${(bizConfig.studioWhatsapp || bizConfig.phone).replace(/\s+/g, '')}`, label: 'WhatsApp', Icon: MessageCircle },
                { key: 'ig', href: bizConfig.instagramUrl, label: 'Instagram', Icon: Instagram },
                { key: 'fb', href: bizConfig.facebookUrl, label: 'Facebook', Icon: Facebook },
                { key: 'tt', href: bizConfig.tiktokUrl, label: 'TikTok', Icon: Music2 }
              ].filter(link => !!link.href).map(({ key, href, label, Icon }) => (
                <a key={key} href={href} target="_blank" rel="noreferrer" aria-label={label} style={{ minWidth: '86px', minHeight: '44px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(234, 220, 199, 0.06)', border: '1px solid rgba(212, 175, 55, 0.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', textDecoration: 'none' }}>
                  <Icon size={20} strokeWidth={1.5} style={{ color: '#E4C687' }} aria-hidden="true" />
                  <span style={{ color: '#FFF8EE', fontSize: '11px', lineHeight: 1.2 }}>{label}</span>
                </a>
              ))}
            </nav>
          </footer>
        </div>
      )}

      {/* 2.1 MIS CITAS — pantalla dedicada con el detalle completo */}
      {currentScreen === 'myAppointmentsPage' && (
        <div className="lst-page" style={{ maxWidth: '520px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '16px', padding: '0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="lst-app-header">
            <button type="button" onClick={() => setCurrentScreen('clientPortal')} aria-label="Volver" style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, background: '#221D19', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '999px', color: '#E4C687', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={20} strokeWidth={1.7} aria-hidden="true" /></button>
            <div style={{ textAlign: 'center' }}>
              <h2 className="lst-app-header-title">Mis citas</h2>
              <p className="lst-app-header-sub">{bizConfig.name}</p>
            </div>
            <span style={{ width: 44, display: 'block' }} aria-hidden="true" />
          </div>
          <section aria-label="Detalle de tus citas" style={{ background: '#344239', border: '1px solid #64745D', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: '#E4C687', fontSize: '11px', letterSpacing: '1px' }}>TU PRÓXIMA CITA</span>
              <span style={{ backgroundColor: 'rgba(255, 248, 238, 0.08)', color: '#E0E8D9', fontSize: '10px', padding: '3px 9px', borderRadius: '20px' }}>{clientAppointmentStatus}</span>
            </div>
            {clientNextAppointment ? <>
              {renderPromotionBadge(clientNextAppointment)}
              <div style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontSize: '19px', lineHeight: 1.35 }}>
                {new Date(`${clientNextAppointment.dateKey}T12:00:00`).toLocaleDateString(portalLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
                <span style={{ color: '#E4C687' }}> · {clientNextAppointment.time}</span>
              </div>
              <p style={{ color: '#E0E8D9', margin: 0, lineHeight: 1.5, fontSize: '13px', overflowWrap: 'anywhere' }}>{appointmentServiceNames(clientNextAppointment)}</p>
              <p style={{ color: '#E0E8D9', margin: 0, fontSize: '12px' }}>Estilista: Ana · L’Studio Ana — Hair Experience</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingTop: '2px' }}>
                <button type="button" onClick={() => { setRepeatAppointmentMode(false); setRescheduleModalAppt(clientNextAppointment); setNewRescheduleTime(clientNextAppointment.time); setNewRescheduleDate(clientNextAppointment.dateKey); }} style={{ background: 'transparent', border: '1px solid #88927B', color: '#F0D89E', minHeight: '44px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>{t('changeDate')}</button>
                <button type="button" onClick={() => setCancelApptModal(clientNextAppointment)} style={{ background: 'transparent', border: '1px solid #D58D7C', color: '#FFC4B5', minHeight: '44px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Cancelar cita</button>
                <a href={`https://wa.me/34${(bizConfig.studioWhatsapp || bizConfig.phone).replace(/\s+/g, '')}?text=${encodeURIComponent(`Hola Ana, quiero consultar mi cita del ${clientNextAppointment.dateKey.split('-').reverse().join('/')} a las ${clientNextAppointment.time}.`)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', color: '#E4C687', padding: '10px 0', minHeight: '44px', fontSize: '12px' }}>{t('askAppointment')}</a>
              </div>
            </> : <>
              <p style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontSize: '17px', margin: 0 }}>{t('experienceStart')}</p>
              <p style={{ color: '#E0E8D9', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>{t('noUpcoming')}</p>
            </>}
          </section>
          {clientUpcomingAppointments.length > 1 && (
            <section aria-label="Otras citas próximas" style={{ background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ color: '#E4C687', fontSize: '11px', letterSpacing: '1px' }}>OTRAS CITAS PRÓXIMAS ({clientUpcomingAppointments.length - 1})</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {clientUpcomingAppointments.slice(1).map(appointment => <article key={appointment.id} style={{ background: '#344239', border: '1px solid #64745D', borderRadius: '8px', padding: '10px' }}>
                  {renderPromotionBadge(appointment)}
                  <strong style={{ fontSize: '12px', color: '#FFF8EE' }}>{new Date(`${appointment.dateKey}T12:00:00`).toLocaleDateString(portalLocale, { weekday: 'long', day: 'numeric', month: 'long' })} · {appointment.time}</strong>
                  <p style={{ color: '#E0E8D9', fontSize: '11px', margin: '4px 0 8px', overflowWrap: 'anywhere' }}>{appointmentServiceNames(appointment)}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button type="button" onClick={() => { setRepeatAppointmentMode(false); setRescheduleModalAppt(appointment); setNewRescheduleTime(appointment.time); setNewRescheduleDate(appointment.dateKey); }} style={{ background: 'transparent', border: '1px solid #88927B', color: '#F0D89E', minHeight: '40px', padding: '6px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '11px' }}>{t('changeDate')}</button>
                    <button type="button" onClick={() => setCancelApptModal(appointment)} style={{ background: 'transparent', border: '1px solid #D58D7C', color: '#FFC4B5', minHeight: '40px', padding: '6px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Cancelar cita</button>
                  </div>
                </article>)}
              </div>
            </section>
          )}
          <section aria-label="Reservar otra cita" style={{ background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.03em', fontSize: '17px', fontWeight: 'normal', margin: 0 }}>Reserva tu cita</h3>
            <p style={{ color: '#E0E8D9', fontSize: '12px', margin: '2px 0 0', lineHeight: 1.5 }}>Elige tus servicios y tu momento en el Studio.</p>
            <button type="button" onClick={() => { setViewServiceDetail(null); setPortalSearch(''); setPortalSearchExpanded({}); setCurrentScreen('catalogBooking'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ width: '100%', minHeight: '52px', background: '#C49A58', color: '#29231F', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{t('bookNext')} <ArrowRight size={17} strokeWidth={2} aria-hidden="true" /></button>
          </section>
        </div>
      )}

      {/* 2.2. CATÁLOGO & RESERVA SINCRONIZADO CON LA INTRANET */}
      {currentScreen === 'catalogBooking' && (
        <div className="lst-page" style={{ maxWidth: '520px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '16px', padding: '0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {bookingSuccessMsg && (
            <div style={{ padding: '15px', backgroundColor: '#8FC98F', border: '1px solid #3E6B47', color: '#2E7D32', borderRadius: '8px', fontSize: '12px', textAlign: 'center', lineHeight: '1.5', fontWeight: 'bold' }}>
              {bookingSuccessMsg}
            </div>
          )}
          <div className="lst-app-header">
            <span style={{ width: 40, display: 'block' }} aria-hidden="true" />
            <div style={{ textAlign: 'center' }}>
              <h2 className="lst-app-header-title">{bizConfig.name}</h2>
              <p className="lst-app-header-sub">{t('subtitle')}</p>
            </div>
            <button className="lst-app-header-btn" onClick={() => setCurrentScreen('clientPortal')} aria-label={t('backToPortal')}>
              <LogOut size={20} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
          <div>
            <h1 style={{ fontSize: '26px', lineHeight: 1.25, fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', color: '#FFF8EE', margin: '0 0 8px', fontWeight: 400 }}>{t('experienceTitle')}</h1>
            <p style={{ color: '#F0E6D2', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{t('experienceIntro')}</p>
          </div>
          <section aria-label={t('searchServices')} style={{ background: '#322A25', border: '1px solid rgba(196,154,88,.3)', borderRadius: 12, padding: 14 }}>
            <label htmlFor="portal-service-search" style={{ display: 'block', color: '#FFF8EE', fontSize: 14, marginBottom: 8 }}>{t('searchServices')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="portal-service-search" type="search" value={portalSearch} maxLength={100} onChange={event => setPortalSearch(event.target.value)} placeholder={t('searchPlaceholder')} autoComplete="off" style={{ width: '100%', minWidth: 0, minHeight: 46, fontSize: 16, padding: '10px 12px', borderRadius: 8, background: '#221D19', color: '#FFF8EE', border: '1px solid rgba(196,154,88,.5)', boxSizing: 'border-box' }} />
              {portalSearch && <button type="button" aria-label={t('clearSearch')} onClick={() => { setPortalSearch(''); document.getElementById('portal-service-search')?.focus(); }} style={{ minWidth: 44, minHeight: 46, borderRadius: 8, background: '#221D19', border: '1px solid rgba(196,154,88,.4)', color: '#E4C687', cursor: 'pointer' }}>×</button>}
            </div>
            {currentLang === 'es' && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>{['Corte', 'Raíces', 'Mechas', 'Peinado'].map(word => <button key={word} type="button" aria-pressed={portalSearchQuery === normalizeServiceSearch(word)} onClick={() => setPortalSearch(word)} style={{ border: '1px solid rgba(196,154,88,.35)', borderRadius: 20, padding: '8px 12px', minHeight: 40, background: portalSearchQuery === normalizeServiceSearch(word) ? '#C49A58' : 'transparent', color: portalSearchQuery === normalizeServiceSearch(word) ? '#221D19' : '#E4C687', fontSize: 12, cursor: 'pointer' }}>{word}</button>)}</div>}
          </section>
          <details className="lst-advisor-panel" style={{ background: 'linear-gradient(135deg, #3E342C, #2B2520)', border: '1px solid #C49A58', borderRadius: 16, padding: 16, boxShadow: '0 5px 20px rgba(0,0,0,.16)' }}>
            <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span aria-hidden="true" style={{ width: 40, height: 40, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'rgba(196,154,88,.15)', borderRadius: 12 }}><Sparkles size={22} color="#E4C687" strokeWidth={1.6} /></span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', color: '#FFF8EE', fontSize: 17, lineHeight: 1.4, fontWeight: 500 }}>{currentLang === 'es' ? '¿No sabes qué servicio elegir?' : t('advisorAccess')}</strong>
                  <span style={{ display: 'block', color: '#D6CBB8', fontSize: 13, lineHeight: 1.5, marginTop: 5 }}>{currentLang === 'es' ? 'Cuéntanos qué te gustaría hacerte y te orientamos.' : t('advisorIntro')}</span>
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', minHeight: 44, padding: '8px 14px', boxSizing: 'border-box', background: '#C49A58', color: '#221D19', borderRadius: 9, fontSize: 14, fontWeight: 600 }}>
                <span className="lst-advisor-open-label">{currentLang === 'es' ? 'Ayúdame a elegir' : t('advisorAccess')}</span>
                <span className="lst-advisor-close-label">{currentLang === 'es' ? 'Cerrar ayuda' : t('advisorTitle')}</span>
                <ChevronDown size={17} aria-hidden="true" />
              </span>
            </summary>
            <p style={{ color: '#D6CBB8', fontSize: '11px', lineHeight: 1.4, margin: '8px 0' }}>{t('advisorIntro')}</p>
            <form onSubmit={handleRunAiRecommendation} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'stretch', margin: '12px 0' }}>
              <textarea aria-label={t('advisorTitle')} value={clientWishText} onChange={event => { setClientWishText(event.target.value); setAiRecommendation(null); }} placeholder={t('advisorPlaceholder')} rows={2} style={{ flex: '1 1 240px', minWidth: 0, width: '100%', boxSizing: 'border-box', background: '#3E342C', border: '1px solid rgba(255, 248, 238, 0.18)', color: '#FFF8EE', borderRadius: '8px', padding: '8px 10px', fontSize: '16px', lineHeight: 1.5, minHeight: '64px', resize: 'none' }} />
              <button type="submit" disabled={!clientWishText.trim()} style={{ minHeight: '44px', padding: '8px 14px', flex: '1 1 160px', background: '#C49A58', color: '#29231F', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', opacity: clientWishText.trim() ? 1 : 0.5 }}>{t('advisorButton')}</button>
            </form>
            {aiRecommendation !== null && <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!aiRecommendation.some(id => catalog.some(category => category.subservices.some(service => service.id === id && service.active !== false))) && <p style={{ color: '#FFF8EE', lineHeight: 1.7 }}>{t('advisorNone')}</p>}
              {aiRecommendation.map(id => { const category = catalog.find(item => item.subservices.some(service => service.id === id)); const service = category?.subservices.find(item => item.id === id && item.active !== false); if (!category || !service) return null; return <article key={id} style={{ background: '#3E342C', border: '1px solid rgba(255, 248, 238, 0.16)', padding: '12px', borderRadius: '12px' }}>
                <h4 style={{ color: '#FFF8EE', fontSize: '18px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', margin: '0 0 10px' }}>{serviceText(service, 'name')}</h4>
                <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.7 }}>{t('advisorReason')}</p>
                <button type="button" onClick={() => { setPortalSearch(''); setPortalSearchExpanded({}); setActiveCatalogTab(category.id); setViewServiceDetail(null); setCurrentScreen('categoryScreen'); window.setTimeout(() => document.getElementById(`portal-service-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }} style={{ minHeight: '44px', padding: '12px 16px', background: '#322A25', color: '#FFF8EE', border: '1px solid rgba(255, 248, 238, 0.16)', borderRadius: '8px', cursor: 'pointer' }}>{t('advisorView')}</button>
              </article>; })}
              <a href={`https://wa.me/34${(bizConfig.studioWhatsapp || bizConfig.phone).replace(/\s+/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#E4C687', padding: '12px 0' }}>WhatsApp · Ana</a>
            </div>}
          </details>
          {portalSearchQuery && <section aria-label={t('searchResults')}>
            <p role="status" aria-live="polite" style={{ color: '#D6CBB8', fontSize: 13, margin: '0 0 12px' }}>{t('searchResults')}: {portalSearchCount}</p>
            {!portalSearchCount && <p style={{ color: '#FFF8EE', lineHeight: 1.6 }}>{t('noSearchResults')}</p>}
            <div style={{ display: 'grid', gap: 10 }}>{catalog.flatMap(category => category.subservices.filter(service => portalServiceMatches(category, service)).map(service => <button key={category.id + ':' + service.id} type="button" onClick={() => { setActiveCatalogTab(category.id); setViewServiceDetail({ cat: category, sub: service }); setCurrentScreen('serviceDetail'); window.scrollTo({ top: 0 }); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 14, textAlign: 'start', background: '#322A25', color: '#FFF8EE', border: '1px solid rgba(255,248,238,.12)', borderRadius: 12, cursor: 'pointer', minHeight: 70 }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <small style={{ display: 'block', color: '#D6CBB8', fontSize: 11, marginBottom: 5 }}>{categoryText(category)}</small>
                <strong style={{ display: 'block', fontSize: 15, lineHeight: 1.5 }}>{bookingName(service)}</strong>
                {bookingName(service) !== serviceText(service, 'name') && <span style={{ display: 'block', color: '#D6CBB8', fontSize: 12, marginTop: 4 }}>{serviceText(service, 'name')}</span>}
                <span style={{ display: 'block', color: '#E4C687', fontSize: 12, marginTop: 6 }}>{service.hasVariants ? t('chooseOption') : (portalShowsPrices ? service.price + ' · ' : '') + service.duration}</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
            </button>))}</div>
          </section>}

          {!portalSearchQuery && <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontSize: '20px', fontWeight: 400, margin: '4px 0 2px' }}>Elige una categoría</h2>
            {catalog.map(cat => {
                const count = cat.subservices.filter(sub => sub.active !== false).length;
                const firstService = cat.subservices.find(sub => sub.active !== false);
                return (
                  <button key={cat.id} type="button" className="lst-cat-card" onClick={() => { setActiveCatalogTab(cat.id); setViewServiceDetail(null); setCurrentScreen('categoryScreen'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <span className="lst-cat-thumb" aria-hidden="true">
                      {(cat.imageUrl || firstService?.imageUrl)
                        ? <img src={optimizedImageUrl((cat.imageUrl || firstService!.imageUrl))} alt="" loading="lazy" decoding="async" style={{ objectPosition: `${(cat.imageUrl ? cat.imagePosition?.x : firstService!.imagePosition?.x) ?? 50}% ${(cat.imageUrl ? cat.imagePosition?.y : firstService!.imagePosition?.y) ?? 50}%` }} />
                        : <strong>LS</strong>}
                    </span>
                    <span className="lst-cat-info">
                      <strong>{categoryText(cat)}</strong>
                      {!!cat.slogan?.trim() && <span style={{ display: 'block', color: '#E5D7BF', fontSize: 12, lineHeight: 1.5, marginTop: 5, whiteSpace: 'normal' }}>{cat.slogan}</span>}
                      <small>{count === 1 ? '1 servicio' : count + ' servicios'}</small>
                    </span>
                    <ChevronRight size={20} strokeWidth={1.7} aria-hidden="true" />
                  </button>
                );
              })}
            </div>

          </>}
          {selectedServicesToBook.length > 0 && <section id="booking-selection-summary" aria-label="Resumen de tu selección" style={{ backgroundColor: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', padding: '20px', borderRadius: 12 }}>
            <h2 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontSize: '20px', margin: '0 0 14px', fontWeight: 400 }}>Tu selección</h2>
            {renderPromotionSummary()}
            {selectedServicesToBook.map(item => <div key={item.sub.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #E4DCCF' }}>
              <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#E4C687', flex: 1, minWidth: 0 }}>{bookingName(item.sub)}{item.variant && <span> · {variantText(item.variant, item.sub)}</span>}<span style={{ display: 'block', color: '#E4C687' }}>{item.sub.hasVariants && !item.variant ? t('chooseOption') : (portalShowsPrices ? (item.variant?.price || item.sub.price) + ' · ' : '') + (item.variant?.duration || item.sub.duration)}</span>
                {(() => {
                  const currentSub = catalog.flatMap(category => category.subservices).find(service => service.id === item.sub.id) || item.sub;
                  if (!currentSub.hasVariants || !currentSub.variants?.length) return null;
                  const selectedId = currentSub.variants.some(variant => variant.id === item.variant?.id) ? item.variant!.id : '';
                  return <label style={{ display: 'block', marginTop: 10 }}>
                    <span style={{ display: 'block', marginBottom: 6 }}>{t('chooseOption')}</span>
                    <select
                      aria-label={t('chooseOption') + ': ' + serviceText(currentSub, 'name')}
                      value={selectedId}
                      onChange={event => {
                        const variant = currentSub.variants!.find(option => option.id === event.target.value) || null;
                        setSelectedServicesToBook(previous => previous.map(selected => selected.sub.id === currentSub.id ? { ...selected, sub: currentSub, variant } : selected));
                      }}
                      style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '10px 8px', background: '#221D19', color: '#FFF8EE', border: '1px solid #C49A58', borderRadius: 8, fontSize: 14 }}
                    >
                      <option value="">{t('chooseOption')}</option>
                      {currentSub.variants.map(variant => <option key={variant.id} value={variant.id}>
                        {variantText(variant, currentSub)}{portalShowsPrices ? ' · ' + variant.price : ''} · {variant.duration}
                      </option>)}
                    </select>
                  </label>;
                })()}
              </div>
              <button type="button" aria-label={'Quitar ' + bookingName(item.sub)} onClick={() => setSelectedServicesToBook(previous => previous.filter(selected => selected.sub.id !== item.sub.id))} style={{ background: 'none', border: 'none', color: '#D6CBB8', cursor: 'pointer', padding: '10px', minHeight: '44px', minWidth: '44px', fontSize: '12px' }}>{t('remove')}</button>
            </div>)}
            <p style={{ color: '#D6CBB8', fontSize: '13px', margin: '14px 0 0' }}>Duración total: {getModalDuration(selectedServicesToBook)} min</p>
            {(() => {
              const totalSel = getSelectionTotal(selectedServicesToBook);
              if (portalShowsPrices && totalSel.total > 0 && !totalSel.orientative) return <p style={{ color: '#FFF8EE', fontSize: '14px', margin: '6px 0 0' }}>Importe total: {totalSel.total.toFixed(2).replace('.', ',')} €</p>;
              if (portalShowsPrices && totalSel.total > 0) return <p style={{ color: '#E4C687', fontSize: '12px', margin: '6px 0 0' }}>Importe orientativo: {totalSel.total.toFixed(2).replace('.', ',')} € · algún servicio tiene precio orientativo o requiere diagnóstico; el importe final se confirma en el estudio.</p>;
              return <p style={{ color: '#E4C687', fontSize: '12px', margin: '6px 0 0' }}>El importe se confirma en el estudio: algún servicio requiere diagnóstico.</p>;
            })()}
            {selectedServicesToBook.some(item => (catalog.flatMap(c => c.subservices).find(sub => sub.id === item.sub.id) || item.sub).requiresAssessment) && <p style={{ color: '#E4C687', fontSize: '12px', margin: 0 }}>Tu selección requiere valoración previa. Elegir fecha y hora registra una solicitud; Ana debe aprobarla antes de confirmar la cita.</p>}
            {renderFinishChoices(selectedServicesToBook)}
            {getTonerError(selectedServicesToBook) && <p role="alert" style={{ color: '#E4C687', fontSize: '12px', margin: 0 }}>{getTonerError(selectedServicesToBook)}</p>}
            {getStylingError(selectedServicesToBook) && <p role="alert" style={{ color: '#E4C687', fontSize: '12px', margin: 0 }}>{getStylingError(selectedServicesToBook)}</p>}
            <button type="button" onClick={() => {
              const missing = selectedServicesToBook.find(item => item.sub.hasVariants && !!item.sub.variants?.length && !item.variant);
              if (missing) { alert(tf('requiredVariant', { service: bookingName(missing.sub) })); return; }
              const conditionError = getInactiveServiceError(selectedServicesToBook) || getStylingError(selectedServicesToBook) || getTonerError(selectedServicesToBook);
              if (conditionError) { alert(conditionError); return; }
              const finishError = getInactiveServiceError(selectedServicesToBook) || getStylingError(selectedServicesToBook) || getTonerError(selectedServicesToBook); if (finishError) { alert(finishError); return; } setCurrentScreen('visualAgenda');
            }} style={{ background: '#C49A58', color: '#29231F', border: 'none', padding: '14px', borderRadius: 8, fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'center', minHeight: '48px' }}>
              {t('chooseDateTime')}
            </button>
          </section>}
        </div>
      )}

      {/* CATEGORIA · CARRUSEL DE SERVICIOS */}
      {currentScreen === 'categoryScreen' && (() => {
        const activeCategory = catalog.find(cat => cat.id === activeCatalogTab) || catalog[0];
        const activeServices = activeCategory ? activeCategory.subservices.filter(sub => sub.active !== false) : [];
        const openDetail = (sub: SubService) => { setViewServiceDetail({ cat: activeCategory!, sub }); setCurrentScreen('serviceDetail'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
        return (
        <div className="lst-page" style={{ maxWidth: '520px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '16px', padding: '0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="lst-app-header">
            <button type="button" className="lst-btn-back" onClick={() => setCurrentScreen('catalogBooking')} aria-label={t('backToCatalog')}><ChevronLeft size={20} strokeWidth={1.7} aria-hidden="true" /></button>
            <div style={{ textAlign: 'center' }}>
              <h2 className="lst-app-header-title">{bizConfig.name}</h2>
              <p className="lst-app-header-sub">{t('subtitle')}</p>
            </div>
            <span style={{ width: 40, display: 'block' }} aria-hidden="true" />
          </div>
          {activeCategory && <>
            <header style={{ padding: '2px 0 0' }}>
              <p style={{ color: '#D8C29A', fontSize: '11px', letterSpacing: '1.5px', margin: '0 0 4px' }}>{t('experienceTitle')}</p>
              <h1 style={{ fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', color: '#FFF8EE', fontSize: '27px', fontWeight: 400, lineHeight: 1.2, margin: 0 }}>{categoryText(activeCategory)}</h1>
              {!!activeCategory.slogan?.trim() && <p style={{ color: '#E5D7BF', fontSize: 14, lineHeight: 1.5, margin: '8px 0 0' }}>{activeCategory.slogan}</p>}
            </header>
            {activeServices.length === 0 ? <p style={{ color: '#F0E6D2', fontSize: '13px', margin: 0 }}>Actualmente no hay servicios activos en esta categoría.</p> : <>
            <p style={{ color: '#D6CBB8', fontSize: '13px', margin: 0, textAlign: 'center' }}><span id="lst-carousel-count" role="status">1 de {activeServices.length}</span></p>
            <div className="lst-carousel-shell">
              <button type="button" className="lst-carousel-arrow" aria-label={t('previousWeek')} onClick={() => scrollCarousel(-1)}><ChevronLeft size={18} strokeWidth={2} aria-hidden="true" /></button>
              <div className="lst-carousel" tabIndex={0} role="region" aria-label={categoryText(activeCategory)}
                ref={node => { carouselScrollerRef.current = node; if (node && activeCategory) node.scrollLeft = carouselPosRef.current[activeCategory.id] || 0; }}
                onScroll={event => {
                  const el = event.currentTarget;
                  if (activeCategory) carouselPosRef.current[activeCategory.id] = el.scrollLeft;
                  const card = el.querySelector('.lst-c-card') as HTMLElement | null;
                  if (!card) return;
                  const step = card.offsetWidth + 14 || 1;
                  const index = Math.min(activeServices.length - 1, Math.max(0, Math.round(el.scrollLeft / step)));
                  const counter = document.getElementById('lst-carousel-count');
                  if (counter) counter.textContent = (index + 1) + ' de ' + activeServices.length;
                  const dots = document.querySelectorAll('#lst-carousel-dots button');
                  dots.forEach((dot, dotIndex) => { (dot as HTMLElement).style.opacity = dotIndex === index ? '1' : '0.35'; });
                }}
                onKeyDown={event => {
                  if (event.key === 'ArrowRight') { event.preventDefault(); scrollCarousel(1); }
                  if (event.key === 'ArrowLeft') { event.preventDefault(); scrollCarousel(-1); }
                }}>
                {activeServices.map(sub => {
                  const name = serviceText(sub, 'name') || sub.name;
                  return (
                    <article key={sub.id} id={"portal-service-" + sub.id} className="lst-c-card">
                      <button type="button" className="lst-c-media" onClick={() => openDetail(sub)} aria-label={name + ' · ' + t('viewService')}>
                        {sub.imageUrl
                          ? <>
                            <img src={optimizedImageUrl(sub.imageUrl)} alt={name} loading="lazy" decoding="async" style={{ objectPosition: `${sub.imagePosition?.x ?? 50}% ${sub.imagePosition?.y ?? 50}%` }} />
                            {sub.imageIsAiPlaceholder && <span className="lst-ai-tag">Imagen ilustrativa</span>}
                          </>
                          : <span className="lst-c-media-fallback"><strong>LS</strong><small>{bizConfig.name}</small></span>}
                      </button>
                      <div className="lst-c-body">
                        <h2 className="lst-c-name" style={{ margin: '0 0 8px', color: '#E4C687', fontSize: 19, lineHeight: 1.3, cursor: 'default' }}>{bookingName(sub)}</h2>
                        {name.trim() !== bookingName(sub).trim() && <p style={{ color: '#F0E6D2', fontSize: 14, lineHeight: 1.5, margin: '0 0 8px' }}>{name}</p>}
                        {!!serviceText(sub, 'slogan').trim() && <p className="lst-c-desc" style={{ color: '#BFCDB9', fontSize: 13, lineHeight: 1.5 }}>{serviceText(sub, 'slogan')}</p>}
                        <div className="lst-c-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px 12px', width: '100%' }}>
                          {portalShowsPrices && <span>{sub.price}</span>}
                          {sub.duration && <span style={{ marginLeft: 'auto', textAlign: 'right', color: '#D6CBB8', fontSize: 12, fontWeight: 400 }}>{sub.duration}</span>}
                        </div>
                        <div className="lst-c-cta" style={{ display: 'flex' }}>
                          <button type="button" className="lst-btn-ver" style={{ width: '100%', justifyContent: 'center' }} onClick={() => openDetail(sub)}>{t('viewService')} <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /></button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <button type="button" className="lst-carousel-arrow" aria-label={t('nextWeek')} onClick={() => scrollCarousel(1)}><ChevronRight size={18} strokeWidth={2} aria-hidden="true" /></button>
            </div>
            <div id="lst-carousel-dots" style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {activeServices.map((sub, index) => (
                <button key={sub.id} type="button" aria-label={t('viewService') + ' · ' + (serviceText(sub, 'name') || sub.name)}
                  onClick={() => { const el = carouselScrollerRef.current; if (!el) return; const card = el.querySelector('.lst-c-card') as HTMLElement | null; if (card) el.scrollTo({ left: index * (card.offsetWidth + 14), behavior: 'smooth' }); }}
                  style={{ width: 10, height: 10, minWidth: 10, padding: 0, borderRadius: '50%', border: 'none', background: '#B8863B', opacity: index === 0 ? 1 : 0.35, cursor: 'pointer' }} />
              ))}
            </div>
            </>}
            {selectedServicesToBook.length > 0 && (
              <button type="button" onClick={() => {
                const missing = selectedServicesToBook.find(item => item.sub.hasVariants && !!item.sub.variants?.length && !item.variant);
                if (missing) { alert(tf('requiredVariant', { service: bookingName(missing.sub) })); return; }
                const finishError = getInactiveServiceError(selectedServicesToBook) || getStylingError(selectedServicesToBook) || getTonerError(selectedServicesToBook); if (finishError) { alert(finishError); return; } setCurrentScreen('visualAgenda');
              }} style={{ background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: 12, minHeight: '54px', padding: '16px', fontSize: '14px', fontWeight: 600, color: '#E4C687', cursor: 'pointer' }}>
                {t('reviewSelection')} ({selectedServicesToBook.length}) → {t('chooseDateTime')}
              </button>
            )}
          </>}
        </div>
        );
      })()}

      {/* FICHA DE SERVICIO */}
      {currentScreen === 'serviceDetail' && viewServiceDetail && (() => {
        const originalDetailSub = catalog.flatMap(category => category.subservices).find(service => service.id === viewServiceDetail.sub.id) || viewServiceDetail.sub;
        // A configured portal pack uses its base price/time; variants remain available to staff.
        const detailSub = originalDetailSub.addonGroups?.length ? {...originalDetailSub,hasVariants:false,variants:undefined} : originalDetailSub;
        const detailImage = detailSub.imageUrl;
        const detailSelection = selectedServicesToBook.find(item => item.sub.id === detailSub.id);
        return (
        <div className="lst-page" style={{ maxWidth: '520px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '16px', padding: '0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="lst-app-header">
            <button type="button" className="lst-btn-back" onClick={() => { setViewServiceDetail(null); setCurrentScreen('categoryScreen'); }} aria-label={t('backToCatalog')}><ArrowLeft size={20} strokeWidth={1.7} aria-hidden="true" /></button>
            <div style={{ textAlign: 'center' }}>
              <h2 className="lst-app-header-title">{bizConfig.name}</h2>
              <p className="lst-app-header-sub">{t('subtitle')}</p>
            </div>
            <span style={{ width: 40, display: 'block' }} aria-hidden="true" />
          </div>
          {detailImage
            ? <button type="button" style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', position: 'relative' }} onClick={() => setLightboxImage(detailImage)} aria-label="Ampliar imagen"><img className="lst-card-media" style={{ height: 280, borderRadius: 14, objectPosition: `${viewServiceDetail.sub.imagePosition?.x ?? 50}% ${viewServiceDetail.sub.imagePosition?.y ?? 50}%` }} src={optimizedImageUrl(detailImage)} alt={serviceText(detailSub, 'name') || detailSub.name} />{viewServiceDetail.sub.imageIsAiPlaceholder && <span className="lst-ai-tag">Imagen ilustrativa</span>}</button>
            : <div className="studio-service-media studio-service-media-empty" style={{ height: 280, borderRadius: 14 }} aria-hidden="true"><span>LS</span><small>{bizConfig.name}</small></div>}
          <header style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="lst-detail-eyebrow">{categoryText(viewServiceDetail.cat)}</span>
            <h1 className="lst-detail-title">{bookingName(detailSub)}</h1>
            {(serviceText(detailSub, 'name') || detailSub.name).trim() !== bookingName(detailSub).trim() && <p style={{ color: '#F0E6D2', fontSize: 14, lineHeight: 1.5, margin: '8px 0' }}>{serviceText(detailSub, 'name') || detailSub.name}</p>}
            {!!serviceText(detailSub, 'description') && <p className="lst-detail-desc">{serviceText(detailSub, 'description')}</p>}
            {detailSub.imageCredit && <p style={{ fontSize: 10, color: '#D6CBB8', lineHeight: 1.5 }}>{detailSub.imageCredit}</p>}
          </header>
          {([
            { field: 'includesText', title: '¿Qué incluye?', icon: Scissors },
            { field: 'achievedText', title: '¿Qué te llevas?', icon: Sparkles },
            { field: 'forWhomText', title: '¿Es para ti?', icon: UserRoundSearch },
            { field: 'conditionsText', title: 'Condiciones del servicio', icon: Info },
          ] as const).map(({ field, title, icon: Icon }) => {
            const text = serviceText(detailSub, field).trim();
            if (!text) return null;
            return <section key={field} style={{ background: '#322A25', border: '1px solid rgba(255,248,238,0.08)', borderRadius: 12, padding: '14px 16px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 500, color: '#E4C687', margin: '0 0 7px' }}><Icon size={17} aria-hidden="true" />{title}</h2>
              <p style={{ color: '#F0E6D2', fontSize: 13, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{text}</p>
            </section>;
          })}
          {(detailSub.requiresAssessment || tonerLabel(detailSub) || stylingLabel(detailSub) || detailSub.showAlertBadge) && (
            <section className="studio-ficha-section">
              <h2>{t('serviceConditionsTitle')}</h2>
              {detailSub.requiresAssessment && <div className="studio-ficha-condition"><strong>Valoración previa</strong><span>Reserva bajo confirmación de Ana</span></div>}
              {tonerLabel(detailSub) && <div className="studio-ficha-condition"><strong>Matiz</strong><span>{tonerLabel(detailSub)}</span></div>}
              {stylingLabel(detailSub) && <div className="studio-ficha-condition"><strong>Peinado</strong><span>{stylingLabel(detailSub)}</span></div>}
              {detailSub.showAlertBadge && <div className="studio-ficha-condition"><strong>Aviso</strong><span>{detailSub.alertText || 'Recuerda añadir tu peinado para asegurar el tiempo en agenda.'}</span></div>}
            </section>
          )}
          <div className="lst-price-box"><Info size={17} strokeWidth={1.7} aria-hidden="true" /> {portalShowsPrices ? (detailSelection?.variant?.price || detailSub.price) + ' · ' : ''} {detailSelection?.variant?.duration || detailSub.duration}</div>
          {detailSub.hasVariants && detailSub.variants && detailSub.variants.length > 0 && (
            <section className="studio-ficha-section">
              <h2>{t('serviceOptionsTitle')}</h2>
              <div className="studio-service-variants-grid">
                {detailSub.variants.map(variant => (
                  <button key={variant.id} type="button" aria-pressed={detailSelection?.variant?.id === variant.id}
                    onClick={() => setSelectedServicesToBook(previous => previous.some(item => item.sub.id === detailSub.id) ? previous.map(item => item.sub.id === detailSub.id ? { ...item, variant } : item) : [...previous, { sub: detailSub, variant }])}
                    className={detailSelection?.variant?.id === variant.id ? 'studio-variant-chip studio-variant-chip-active' : 'studio-variant-chip'}>
                    <strong>{variantText(variant, detailSub)}</strong>
                    {variant.description && <span>{variant.description}</span>}
                    <span>{portalShowsPrices ? variant.price + ' · ' : ''}{variant.duration}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {detailSelection && renderFinishChoices(selectedServicesToBook)}
          {detailSelection ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: 10, padding: '12px 14px' }}>
                <span style={{ color: '#E4C687', fontSize: 13 }}>{selectedServicesToBook.length} {selectedServicesToBook.length === 1 ? 'servicio' : 'servicios'} en tu cita</span>
                <button type="button" onClick={() => setSelectedServicesToBook(previous => previous.filter(item => item.sub.id !== detailSub.id))} style={{ background: 'none', border: 'none', color: '#D6CBB8', fontSize: 12, cursor: 'pointer', padding: '10px', minHeight: 44 }}>{t('remove')}</button>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => { setViewServiceDetail(null); setCurrentScreen('catalogBooking'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="lst-cta-full" style={{ flex: 1, background: '#322A25', color: '#FFF8EE', border: '1px solid rgba(255, 248, 238, 0.16)' }}>Añadir otro servicio</button>
                <button type="button" onClick={() => { const missing = selectedServicesToBook.find(item => item.sub.hasVariants && !!item.sub.variants?.length && !item.variant); if (missing) { alert(tf('requiredVariant', { service: bookingName(missing.sub) })); return; } const finishError = getInactiveServiceError(selectedServicesToBook) || getStylingError(selectedServicesToBook) || getTonerError(selectedServicesToBook); if (finishError) { alert(finishError); return; } setCurrentScreen('visualAgenda'); }} className="lst-cta-full" style={{ flex: 1 }}>{t('chooseDateTime')} <ArrowRight size={18} strokeWidth={2} aria-hidden="true" /></button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { if (detailSub.hasVariants && !!detailSub.variants?.length) { alert(tf('requiredVariant', { service: detailSub.name })); return; } setSelectedServicesToBook(previous => previous.some(item => item.sub.id === detailSub.id) ? previous : [...previous, { sub: detailSub, variant: null }]); }} className="lst-cta-full">{chooseServiceLabel} <ArrowRight size={18} strokeWidth={2} aria-hidden="true" /></button>
          )}
        </div>
        );
      })()}

      {lightboxImage && (
        <div role="dialog" aria-modal="true" aria-label="Imagen ampliada del servicio" onClick={() => setLightboxImage(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(28, 22, 18, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', cursor: 'zoom-out' }}>
          <img src={optimizedImageUrl(lightboxImage)} alt="Imagen ampliada del servicio" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}

      {/* AGENDA CLIENTAS · SEMANA Y HORAS DISPONIBLES */}
      {currentScreen === 'visualAgenda' && (
        <fieldset disabled={visualBookingBusy} aria-busy={visualBookingBusy} style={{ margin: 0, minWidth: 0, maxWidth: '520px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '16px', padding: '0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <button type="button" onClick={() => { setReservationPolicyChecked(saturdayNeedsAcceptance && acceptedSaturdayPolicy === saturdayPolicyKey); setReservationPolicyOpen(true); }} style={{ alignSelf: 'flex-end', color: '#E4C687', background: 'none', border: 'none', textDecoration: 'underline', padding: 10, minHeight: 44, cursor: 'pointer' }}>Políticas de reserva · Sábados</button>
          <button type="button" onClick={() => setCurrentScreen('catalogBooking')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#D8C29A', padding: '10px 0', cursor: 'pointer' }}>{t('backServices')}</button>
          <div><h2 style={{ fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', color: '#FFF8EE', fontSize: '28px', fontWeight: 'normal', margin: '0 0 8px' }}>{t('chooseMoment')}</h2><p style={{ color: '#D6CBB8', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{t('fullSlots')} · {getModalDuration(selectedServicesToBook)} min.</p></div>
          {<section aria-label="Selecciona profesional" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ color: '#FFF8EE', fontSize: '15px', margin: 0 }}>Elige profesional</h3>
            <div aria-live="polite">
              {professionalsLoading && <p style={{ color: '#D6CBB8', fontSize: 13 }}>Consultando profesionales…</p>}
              {professionalsError && <p role="alert" style={{ color: '#F5C7B8', fontSize: 13 }}>{professionalsError}</p>}
              {!professionalsLoading && !professionalsError && !activeEmployees.length && <p style={{ color: '#D6CBB8', fontSize: 13 }}>No hay profesionales disponibles para seleccionar en este momento.</p>}
              {(professionalsError || (!professionalsLoading && !activeEmployees.length)) && <button type="button" className="studio-btn-ghost" onClick={() => setProfessionalsReload(value => value + 1)}>Reintentar</button>}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {activeEmployees.map(emp => (
                <button key={emp.id} type="button" aria-pressed={selectedProfessionalId === emp.id} onClick={() => setSelectedProfessionalId(prev => prev === emp.id ? null : emp.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: selectedProfessionalId === emp.id ? '#C49A58' : '#322A25', color: selectedProfessionalId === emp.id ? '#29231F' : '#FFF8EE', border: '1px solid rgba(255,248,238,0.12)', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', minHeight: '48px' }}>
                  {emp.photo ? <img src={optimizedImageUrl(emp.photo)} alt={emp.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> : <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#3E342C', display: 'grid', placeItems: 'center', fontSize: 14, color: '#E4C687' }}>{emp.name.charAt(0).toUpperCase()}</span>}
                  <span>{emp.name.trim()}</span>
                </button>
              ))}
              <button type="button" aria-pressed={selectedProfessionalId === null} onClick={() => setSelectedProfessionalId(null)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: selectedProfessionalId === null ? '#C49A58' : '#322A25', color: selectedProfessionalId === null ? '#29231F' : '#FFF8EE', border: '1px solid rgba(255,248,238,0.12)', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', minHeight: '48px' }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#3E342C', display: 'grid', placeItems: 'center', fontSize: 13, color: '#E4C687' }}>—</span>
                <span>Sin preferencia</span>
              </button>
            </div>
          </section>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <button type="button" aria-label={t('previousWeek')} onClick={() => { const day = new Date(bookingDate); day.setDate(day.getDate() - 7); choosePortalDate(day); }} style={{ padding: '12px', background: '#322A25', color: '#FFF8EE', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '8px', cursor: 'pointer' }}>←</button>
            <span style={{ color: '#FFF8EE', fontSize: '14px', textAlign: 'center' }}>{portalWeekStart.toLocaleDateString(portalLocale, { month: 'long', year: 'numeric' })}</span>
            <button type="button" aria-label={t('nextWeek')} onClick={() => { const day = new Date(bookingDate); day.setDate(day.getDate() + 7); choosePortalDate(day); }} style={{ padding: '12px', background: '#322A25', color: '#FFF8EE', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '8px', cursor: 'pointer' }}>→</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '5px' }}>
            {portalWeekDays.map(day => {
              const selected = formatDateKey(day) === formatDateKey(bookingDate);
              const available = portalAvailableTimes(day).length > 0;
              return <button type="button" key={formatDateKey(day)} aria-pressed={selected} disabled={!portalDateAllowed(day)} onClick={() => choosePortalDate(day)} style={{ minHeight: '70px', padding: '8px 1px', backgroundColor: selected ? '#C49A58' : '#322A25', color: selected ? '#29231F' : '#FFF8EE', opacity: portalDateAllowed(day) ? 1 : 0.35, border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '9px', cursor: 'pointer' }}><span style={{ fontSize: '10px', display: 'block' }}>{day.toLocaleDateString(portalLocale, { weekday: 'short' })}</span><strong style={{ fontSize: '18px', display: 'block', margin: '5px 0' }}>{day.getDate()}</strong><span aria-label={available ? t('slotsAvailable') : t('noSlots')} style={{ fontSize: '10px' }}>{available ? '●' : '—'}</span></button>;
            })}
          </div>
          <label style={{ color: '#C9BCA9', fontSize: '13px' }}>{t('otherDate')}<input ref={portalDateInputRef} aria-label={t('otherDate')} type="date" value={formatDateKey(bookingDate)} onChange={e => { if (e.target.value) choosePortalDate(new Date(`${e.target.value}T12:00:00`)); }} style={{ display: 'block', marginTop: '8px', padding: '12px', backgroundColor: '#3E342C', color: '#FFF8EE', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '8px', boxSizing: 'border-box', width: '100%' }} /></label>
          <section><h3 style={{ color: '#FFF8EE', fontSize: '16px', margin: '0 0 16px' }}>{bookingDate.toLocaleDateString(portalLocale, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            {!portalTimes.length ? <p style={{ color: '#D6CBB8', fontSize: '14px', lineHeight: 1.6 }}>{t('noSlotsDay')}</p> : ['morning', 'afternoon'].map(period => {
              const times = portalTimes.filter(time => period === 'morning' ? Number(time.slice(0, 2)) < 14 : Number(time.slice(0, 2)) >= 14);
              return times.length ? <div key={period} style={{ marginBottom: '18px' }}><p style={{ color: '#C9BCA9', fontSize: '12px' }}>{t(period)}</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(76px, 1fr))', gap: '9px' }}>{times.map(time => <button type="button" key={time} aria-pressed={time === selectedVisualTime} onClick={() => setSelectedVisualTime(time)} style={{ minHeight: '48px', backgroundColor: time === selectedVisualTime ? '#C49A58' : '#322A25', color: time === selectedVisualTime ? '#29231F' : '#FFF8EE', border: '1px solid rgba(255, 248, 238, 0.12)', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}>{time}</button>)}</div></div> : null;
            })}
          </section>
          <div style={{ borderTop: '1px solid #3A312A', paddingTop: '18px' }}>
            <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.6 }}>{selectedServicesToBook.map(item => serviceText(catalog.flatMap(category => category.subservices).find(service => service.id === item.sub.id) || item.sub, 'name') + (item.variant ? ` · ${variantText(item.variant, item.sub)}` : '')).join(' + ')}</p>
            {(() => { const totalSel = getSelectionTotal(selectedServicesToBook); if (!portalShowsPrices || totalSel.total <= 0) return null; return <p style={{ color: totalSel.orientative ? '#E4C687' : '#FFF8EE', fontSize: '13px', margin: '6px 0 0' }}>{totalSel.orientative ? 'Importe orientativo' : 'Importe total'}: {totalSel.total.toFixed(2).replace('.', ',')} €{totalSel.orientative ? ' · se confirma en el estudio' : ''}</p>; })()}
            {selectedVisualTime && <p style={{ color: '#FFF8EE', fontSize: '15px' }}>{bookingDate.toLocaleDateString(portalLocale, { day: 'numeric', month: 'long' })} · {selectedVisualTime}</p>}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={whatsappConsent} onChange={e => setWhatsappConsent(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: '#C49A58', flexShrink: 0 }} />
              <span style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6 }}>Autorizo a L'Studio Ana a enviarme avisos de mi cita por WhatsApp al teléfono de mi ficha (confirmaciones y cambios). Puedo retirar el consentimiento cuando quiera en el portal.</span>
            </label>
            {renderPromotionSummary()}
            {renderClientPushPanel()}
            {visualBookingError && <p role="alert" style={{ color: '#FFC4B5', fontSize: 13, lineHeight: 1.5 }}>{visualBookingError}</p>}
            {visualBookingBusy && <p role="status" style={{ color: '#E4C687', fontSize: 13 }}>Guardando tu reserva en el Studio…</p>}
            <button type="button" onClick={handleConfirmarCitaVisual} disabled={visualBookingBusy || (!portalTimes.includes(selectedVisualTime) && visualBookingAttemptRef.current?.signature !== visualBookingSignature())} style={{ width: '100%', minHeight: '54px', padding: '14px', backgroundColor: portalTimes.includes(selectedVisualTime) ? '#C49A58' : '#322A25', color: portalTimes.includes(selectedVisualTime) ? '#29231F' : '#C9BCA9', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>{visualBookingBusy ? 'Guardando…' : visualBookingError && visualBookingAttemptRef.current?.signature === visualBookingSignature() ? 'Comprobar y reintentar' : !selectedVisualTime ? t('chooseHour') : getApprovalReason(selectedServicesToBook, formatDateKey(bookingDate)) ? t('requestAppointment') : t('continueBooking')}</button>
          </div>
        </fieldset>
      )}

      {/* 2.3. PASAPORTE DE EXPERIENCIAS DE AUTOR */}
      {currentScreen === 'clientHistoryPage' && (
        <div style={{ maxWidth: '520px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '16px', padding: '0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <button type="button" onClick={() => setCurrentScreen('clientPortal')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#D8C29A', padding: '10px 0', minHeight: '44px', fontSize: '13px', cursor: 'pointer' }}>{t('backToPortal')}</button>
          <header>
            <p style={{ color: '#D8C29A', fontSize: '11px', letterSpacing: '1.5px', margin: '0 0 12px' }}>L’Studio Ana · Cuidado personalizado</p>
            <h2 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontSize: '24px', fontWeight: 'normal', lineHeight: 1.25, margin: '0 0 12px' }}>{t('passportTitle')}</h2>
            <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{currentClientRecord?.nombre && <span>{currentClientRecord.nombre} · </span>}{t('passportIntro')}</p>
          </header>
          <section style={{ background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '10px', padding: '15px' }}>
            <span style={{ color: '#D8C29A', fontSize: '11px', letterSpacing: '1px' }}>01 · CONOCEMOS TU CABELLO</span>
            <h3 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontWeight: 'normal', fontSize: '19px', margin: '8px 0' }}>{t('hairDna')}</h3>
            <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: 0 }}>{currentClientRecord?.dniCapilar || t('emptyDna')}</p>
          </section>
          <section style={{ backgroundColor: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '10px', padding: '15px', boxShadow: '0 10px 26px rgba(0, 0, 0, 0.25)' }}>
            <span style={{ color: '#E4C687', fontSize: '11px', letterSpacing: '1px' }}>02 · ENTRE VISITAS</span>
            <h3 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontWeight: 'normal', fontSize: '19px', margin: '8px 0' }}>{t('homeRitual')}</h3>
            <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: 0 }}>{currentClientRecord?.prescripcionCasa || t('emptyCare')}</p>
          </section>
          <section style={{ padding: '4px 0' }}>
            <span style={{ color: '#D8C29A', fontSize: '11px', letterSpacing: '1px' }}>03 · TU RECORRIDO</span>
            <h3 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontWeight: 'normal', fontSize: '19px', margin: '8px 0 12px' }}>{t('visitHistory')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(currentClientRecord?.pastVisits || []).length ? currentClientRecord!.pastVisits!.map((visit, index) => <article key={index} style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderLeft: '2px solid #B98A3E', borderRadius: '10px', padding: '12px' }}>
                <p style={{ color: '#E4C687', fontSize: '12px', margin: '0 0 8px' }}>{visit.date}</p>
                <h4 style={{ color: '#FFF8EE', fontSize: '13px', lineHeight: 1.5, margin: '0 0 8px' }}>{compactVisitText(visit.service)}</h4>
                {visit.stylist && <p style={{ color: '#D6CBB8', fontSize: '12px', margin: 0 }}>Con {visit.stylist}</p>}
                {visit.notes && <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '14px 0 0' }}>{visit.notes}</p>}
              </article>) : <div style={{ backgroundColor: '#322A25', padding: '14px', borderRadius: '10px', color: '#D6CBB8', fontSize: '13px', lineHeight: 1.7 }}>{t('emptyVisits')}</div>}
            </div>
          </section>
          <section style={{ backgroundColor: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '10px', padding: '15px', boxShadow: '0 10px 26px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', fontSize: '19px', margin: '0 0 14px' }}>Seguimos cuidando de ti</h3>
            <p style={{ color: '#D6CBB8', fontSize: '13px', margin: '0 0 8px' }}>{t('recommendedVisit')}</p>
            <p style={{ color: '#E4C687', fontSize: '17px', margin: '0 0 14px' }}>{currentClientRecord?.proximaVisitaSugerida || t('pendingRecommendation')}</p>
            <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.6, margin: '0 0 18px' }}>{t('maintenanceNote')}</p>
            <button type="button" onClick={() => setCurrentScreen('catalogBooking')} style={{ width: '100%', minHeight: '52px', background: '#C49A58', color: '#29231F', border: 'none', borderRadius: '9px', padding: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>{t('bookNext')}</button>
            {currentClientRecord?.ultimaVisita && <p style={{ color: '#D6CBB8', fontSize: '12px', marginBottom: 0 }}>Última visita registrada: {currentClientRecord.ultimaVisita}</p>}
          </section>
          <button onClick={() => setCurrentScreen('clientPortal')} style={{ width: '100%', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#D6CBB8', padding: '12px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
            {t('backToPortal')}
          </button>
        </div>
      )}

      {/* 3. INTRANET ADMIN LOGIN */}
      {currentScreen === 'adminLogin' && (
        <main style={{ maxWidth: '460px', width: '100%', padding: '50px 24px 30px', boxSizing: 'border-box', textAlign: 'center' }}>
          <style>{`
            .studio-admin-access-input:focus { border-bottom-color: #E4C687 !important; outline: none; }
            .studio-admin-access-button:focus-visible { outline: 2px solid #E4C687; outline-offset: 4px; }
            .studio-admin-access-button:hover { background: #CFA765 !important; }
            @media (max-width: 600px) { .studio-admin-access-logo { width: 170px !important; } }
          `}</style>
          <img className="studio-admin-access-logo" src={optimizedImageUrl(brandLogoSrc)} onError={fallbackBrandLogo} decoding="async" alt="L’A · Hair Experience" style={{ width: '190px', height: 'auto', display: 'block', margin: '0 auto 22px', mixBlendMode: 'screen' }} />
          <h1 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '32px', fontWeight: 'normal', margin: '0 0 10px' }}>360studio</h1>
          <p style={{ color: '#D8C29A', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '3px', lineHeight: 1.6, margin: '0 0 36px' }}>Intranet privada · L’Studio Ana</p>
          <form onSubmit={handleAdminLoginSubmit} style={{ maxWidth: '280px', margin: '0 auto' }}>
            <label htmlFor="studio-admin-access-pin" style={{ color: '#D6CBB8', fontSize: '13px', display: 'block', marginBottom: '10px' }}>Introduce tu PIN maestro</label>
            <input className="studio-admin-access-input" id="studio-admin-access-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" autoComplete="off" required value={adminPin} onChange={event => { setAdminPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4)); setAdminError(false); setAdminLoginMessage(''); }} maxLength={4} aria-invalid={adminError} aria-describedby={adminError ? 'studio-admin-access-error' : undefined} style={{ width: '100%', boxSizing: 'border-box', height: '64px', background: 'rgba(255, 248, 238, 0.05)', border: '1px solid ' + (adminError ? '#E8A49B' : 'rgba(228, 198, 135, 0.55)'), borderRadius: '10px', color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", textAlign: 'center', fontSize: '30px', letterSpacing: '18px', padding: '8px 0 8px 18px' }} />
            {adminError && <p id="studio-admin-access-error" role="alert" style={{ color: '#F2B8AC', fontSize: '13px', margin: '12px 0 0' }}>{adminLoginMessage || 'No se pudo completar el acceso.'}</p>}
            <button className="studio-admin-access-button" type="submit" disabled={adminPin.length !== 4 || adminLoginBusy} style={{ width: '100%', minHeight: '48px', background: '#C49A58', color: '#29231F', border: 'none', borderRadius: '10px', padding: '14px', marginTop: '24px', fontSize: '14px', fontWeight: 600, letterSpacing: '1px', cursor: 'pointer', opacity: adminPin.length === 4 ? 1 : 0.45 }}>{adminLoginBusy ? 'Verificando…' : 'Acceder'}</button>
          </form>
          <div style={{ width: '34px', height: '1px', background: 'rgba(212, 175, 55, 0.5)', margin: '30px auto 16px' }} />
          <button type="button" onClick={() => { setAdminPin(''); setAdminError(false); setCurrentScreen('clientPin'); }} style={{ background: 'none', border: 'none', color: '#D8C29A', fontSize: '12px', padding: '12px', minHeight: '44px', cursor: 'pointer' }}>Volver al portal</button>
        </main>
      )}

      {/* 4. PANEL DE ADMINISTRACIÓN */}
      {currentScreen === 'adminPanel' && <React.Suspense fallback={<div role="status" style={{padding:32,color:'#E4C687',textAlign:'center'}}>Cargando la intranet…</div>}><LazyAdminPanelView onLogout={handleLogout} onPromotionsSaved={syncFromServer} bookingName={bookingName} appointmentServiceNames={appointmentServiceNames} compactVisitText={compactVisitText} AGENDA_SWATCHES={AGENDA_SWATCHES} DEFAULT_BRAND_LOGO={DEFAULT_BRAND_LOGO} DEFAULT_HEADER_LOGO={DEFAULT_HEADER_LOGO} FINISH_COPY={FINISH_COPY} TRANSLATIONS={TRANSLATIONS} activeEmployees={activeEmployees} adminCatalogSearch={adminCatalogSearch} adminCatalogStatus={adminCatalogStatus} adminTab={adminTab} agendaExpanded={agendaExpanded} agendaLayoutRef={agendaLayoutRef} agendaSwatch={agendaSwatch} agendaViewMode={agendaViewMode} anioMini={anioMini} appointmentSearch={appointmentSearch} appointmentSearchQuery={appointmentSearchQuery} appointmentSearchResults={appointmentSearchResults} appointments={appointments} attemptClock={attemptClock} bizConfig={bizConfig} bookingAttempts={bookingAttempts} busquedaCliente={busquedaCliente} cambiarMesMiniCal={cambiarMesMiniCal} catalog={catalog} catalogEditorId={catalogEditorId} catalogEditorTab={catalogEditorTab} catalogHasChanges={catalogHasChanges} catalogSavedMsg={catalogSavedMsg} catalogTranslationLang={catalogTranslationLang} clientStatusBusy={clientStatusBusy} clientStatusError={clientStatusError} clientStatusFilter={clientStatusFilter} clientsPageCount={clientsPageCount} configHasPendingChanges={configHasPendingChanges} configSubTab={configSubTab} crmPeriod={crmPeriod} crmView={crmView} dashboardEnd={dashboardEnd} dashboardStart={dashboardStart} demandEnd={demandEnd} demandFilter={demandFilter} demandStart={demandStart} detractorReplies={detractorReplies} diaSeleccionadoObj={diaSeleccionadoObj} diasRejillaMini={diasRejillaMini} editAdminDniCapilar={editAdminDniCapilar} editAdminFormulas={editAdminFormulas} editAdminPrescripcionCasa={editAdminPrescripcionCasa} editAdminProxima={editAdminProxima} editAdminUltimaVisita={editAdminUltimaVisita} editingClientId={editingClientId} effectiveClientsPage={effectiveClientsPage} emailConfigStatus={emailConfigStatus} employeePhotoBusy={employeePhotoBusy} enableDoubleBooking={enableDoubleBooking} enableOutOfHours={enableOutOfHours} expandedCategories={expandedCategories} expandedClientId={expandedClientId} fallbackHeaderLogo={fallbackHeaderLogo} fechaSeleccionada={fechaSeleccionada} feedbackList={feedbackList} feedbackRatingFilter={feedbackRatingFilter} feedbackStatusBusy={feedbackStatusBusy} filteredClientRows={filteredClientRows} formatDateKey={formatDateKey} googleCalendarConnected={googleCalendarConnected} googleCalendarSyncActive={googleCalendarSyncActive} handleAddCategorySubmit={handleAddCategorySubmit} handleAddSubserviceSubmit={handleAddSubserviceSubmit} handleAddVariant={handleAddVariant} handleCategoryPhotoDelete={handleCategoryPhotoDelete} handleCategoryPhotoSelect={handleCategoryPhotoSelect} handleCellClick={handleCellClick} handleClientStatus={handleClientStatus} handleDeleteClient={handleDeleteClient} handleDeleteCategory={handleDeleteCategory} handleDeleteSubservice={handleDeleteSubservice} handleDeleteVariant={handleDeleteVariant} handleFeedbackResolution={handleFeedbackResolution} handleGuardarEdicionAdminCliente={handleGuardarEdicionAdminCliente} handleGuardarNuevoCliente={handleGuardarNuevoCliente} handleMoveCategory={handleMoveCategory} handleSaveCatalogMaster={handleSaveCatalogMaster} handleSaveSection={handleSaveSection} handleServicePhotoDelete={handleServicePhotoDelete} handleServicePhotoSelect={handleServicePhotoSelect} handleToggleVariants={handleToggleVariants} handleUpdateCategoryCode={handleUpdateCategoryCode} handleUpdateCategoryTitle={handleUpdateCategoryTitle} headerLogoSrc={headerLogoSrc} holidaysList={holidaysList} hoursList={hoursList} isActiveAppointment={isActiveAppointment} isAddingCategory={isAddingCategory} isAddingClient={isAddingClient} isAddingSub={isAddingSub} isDateBlockedByHoliday={isDateBlockedByHoliday} isFinish={isFinish} isTimeSlotOccupied={isTimeSlotOccupied} listaClientes={listaClientes} logoUploadBusy={logoUploadBusy} logoUploadMessage={logoUploadMessage} lostDemandsList={lostDemandsList} mailboxError={mailboxError} mailboxFilter={mailboxFilter} mesMini={mesMini} newCatCode={newCatCode} newCatTitle={newCatTitle} newHolidayEnd={newHolidayEnd} newHolidayReason={newHolidayReason} newHolidayStart={newHolidayStart} newHolidayType={newHolidayType} newSubAchieved={newSubAchieved} newSubAlertBadge={newSubAlertBadge} newSubAlertText={newSubAlertText} newSubDesc={newSubDesc} newSubDur={newSubDur} newSubIncludes={newSubIncludes} newSubName={newSubName} newSubPrice={newSubPrice} newSubPriceType={newSubPriceType} newVariantDuration={newVariantDuration} newVariantName={newVariantName} newVariantPrice={newVariantPrice} nombresMeses={nombresMeses} normalizeCatalogSearch={normalizeCatalogSearch} normalizeEmail={normalizeEmail} novoApellidos={novoApellidos} novoDiagnostico={novoDiagnostico} novoEmail={novoEmail} novoNacimiento={novoNacimiento} novoNombre={novoNombre} novoPin={novoPin} novoTelefono={novoTelefono} openPassportEditor={openPassportEditor} opportunityPage={opportunityPage} opportunitySearch={opportunitySearch} opportunityStatus={opportunityStatus} photoUploadBusy={photoUploadBusy} renderAgendaLinks={renderAgendaLinks} renderDurationAgenda={renderDurationAgenda} returnToAppointmentId={returnToAppointmentId} saveErrorMsg={saveErrorMsg} saveState={saveState} savedMsg={savedMsg} semanaActual={semanaActual} setAdminCatalogSearch={setAdminCatalogSearch} setAdminCatalogStatus={setAdminCatalogStatus} setAdminTab={setAdminTab} setAgendaExpanded={setAgendaExpanded} setAgendaSidePanel={setAgendaSidePanel} setAgendaSwatch={setAgendaSwatch} setAgendaViewMode={setAgendaViewMode} setAppointmentSearch={setAppointmentSearch} setBookingAttempts={setBookingAttempts} setBusquedaCliente={setBusquedaCliente} setCatalog={setCatalog} setCatalogEditorId={setCatalogEditorId} setCatalogEditorTab={setCatalogEditorTab} setCatalogTranslationLang={setCatalogTranslationLang} setClientDetailsDraft={setClientDetailsDraft} setClientStatusFilter={setClientStatusFilter} setClientsPage={setClientsPage} setConfigSubTab={setConfigSubTab} setCrmPeriod={setCrmPeriod} setCrmView={setCrmView} setCurrentScreen={setCurrentScreen} setDashboardEnd={setDashboardEnd} setDashboardStart={setDashboardStart} setDemandEnd={setDemandEnd} setDemandFilter={setDemandFilter} setDemandStart={setDemandStart} setDetractorReplies={setDetractorReplies} setEditAdminDniCapilar={setEditAdminDniCapilar} setEditAdminFormulas={setEditAdminFormulas} setEditAdminPrescripcionCasa={setEditAdminPrescripcionCasa} setEditAdminProxima={setEditAdminProxima} setEditAdminUltimaVisita={setEditAdminUltimaVisita} setEditingClientId={setEditingClientId} setEnableDoubleBooking={setEnableDoubleBooking} setEnableOutOfHours={setEnableOutOfHours} setExpandedCategories={setExpandedCategories} setExpandedClientId={setExpandedClientId} setFechaSeleccionada={setFechaSeleccionada} setFeedbackRatingFilter={setFeedbackRatingFilter} setGoogleCalendarConnected={setGoogleCalendarConnected} setGoogleCalendarSyncActive={setGoogleCalendarSyncActive} setHolidaysList={setHolidaysList} setIsAddingCategory={setIsAddingCategory} setIsAddingClient={setIsAddingClient} setIsAddingSub={setIsAddingSub} setLogoUploadMessage={setLogoUploadMessage} setLostDemandsList={setLostDemandsList} setMailboxFilter={setMailboxFilter} setMesNavegacion={setMesNavegacion} setModalServices={setModalServices} setNewCatCode={setNewCatCode} setNewCatTitle={setNewCatTitle} setNewHolidayEnd={setNewHolidayEnd} setNewHolidayReason={setNewHolidayReason} setNewHolidayStart={setNewHolidayStart} setNewHolidayType={setNewHolidayType} setNewSubAchieved={setNewSubAchieved} setNewSubAlertBadge={setNewSubAlertBadge} setNewSubAlertText={setNewSubAlertText} setNewSubDesc={setNewSubDesc} setNewSubDur={setNewSubDur} setNewSubIncludes={setNewSubIncludes} setNewSubName={setNewSubName} setNewSubPrice={setNewSubPrice} setNewSubPriceType={setNewSubPriceType} setNewVariantDuration={setNewVariantDuration} setNewVariantName={setNewVariantName} setNewVariantPrice={setNewVariantPrice} setNovoApellidos={setNovoApellidos} setNovoDiagnostico={setNovoDiagnostico} setNovoEmail={setNovoEmail} setNovoNacimiento={setNovoNacimiento} setNovoNombre={setNovoNombre} setNovoPin={setNovoPin} setNovoTelefono={setNovoTelefono} setOpportunityPage={setOpportunityPage} setOpportunitySearch={setOpportunitySearch} setOpportunityStatus={setOpportunityStatus} setPendingPanelFilter={setPendingPanelFilter} setPreviewServiceId={setPreviewServiceId} setPreviewVariantId={setPreviewVariantId} setReturnToAppointmentId={setReturnToAppointmentId} setSelectedServicesToBook={setSelectedServicesToBook} setTempConfig={setTempConfig} setViewApptModal={setViewApptModal} t={t} tempConfig={tempConfig} timeBlocks={timeBlocks} trafficEvents={trafficEvents} translationLanguagePicker={translationLanguagePicker} updateEmployee={updateEmployee} updateServiceTranslation={updateServiceTranslation} updateSubserviceField={updateSubserviceField} uploadEmployeePhoto={uploadEmployeePhoto} uploadStudioLogo={uploadStudioLogo} visibleClientRows={visibleClientRows} whatsappConfigStatus={whatsappConfigStatus} workingRanges={workingRanges} /></React.Suspense>}

      {catalogEditorId && currentScreen === 'adminPanel' && adminTab === 'catalog' && <div onClick={() => setCatalogEditorId(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1700 }} />}
      {registeredAppointment && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'grid', placeItems: 'center', padding: '16px', zIndex: 3000 }}>
        <div role="dialog" aria-modal="true" aria-labelledby="appointment-registered-title" style={{ width: '100%', maxWidth: '440px', boxSizing: 'border-box',
          background: '#322A25', border: '1px solid rgba(228, 198, 135, 0.45)', borderRadius: '14px', padding: '26px', color: '#FFF8EE' }}>
          <h3 id="appointment-registered-title" style={{ margin: '0 0 14px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '26px', fontWeight: 'normal', color: '#E4C687' }}>Cita registrada</h3>
          <p style={{ lineHeight: 1.7 }}>{registeredAppointment.clientName}<br />
            {registeredAppointment.dateKey.split('-').reverse().join('/')} · {registeredAppointment.time}</p>
          <p style={{ color: '#D6CBB8', lineHeight: 1.6, fontSize: '13px' }}>{appointmentServiceNames(registeredAppointment)}</p>
          <p style={{ color: '#E4C687', lineHeight: 1.6 }}>{registeredAppointment.saturdayApproval?.status === 'pending'
            ? 'Tu solicitud está registrada. La cita queda pendiente de la confirmación de Ana.'
            : registeredAppointment.advancePayment?.status === 'pending'
            ? 'Tu solicitud está registrada. La cita queda pendiente de comprobar la reserva anticipada por Bizum.'
            : 'La cita ha quedado guardada en la agenda.'}</p>
          <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6 }}>WhatsApp no se envía automáticamente. El botón abre un mensaje preparado; debes pulsar «Enviar» en WhatsApp.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
            <button type="button" onClick={() => {
              const admin = currentScreen === 'adminPanel';
              const rawPhone = admin ? registeredAppointment.phone : (bizConfig.studioWhatsapp || bizConfig.phone);
              let phone = rawPhone.replace(/[^0-9]/g, '');
              if (phone.startsWith('00')) phone = phone.slice(2);
              if (phone.length === 9) phone = '34' + phone;
              if (phone.length < 10 || phone.length > 15) { alert('Revisa el teléfono antes de abrir WhatsApp.'); return; }
              const date = registeredAppointment.dateKey.split('-').reverse().join('/');
              const pending = registeredAppointment.saturdayApproval?.status === 'pending' || registeredAppointment.advancePayment?.status === 'pending';
              const text = admin
                ? 'Hola ' + registeredAppointment.clientName + '. Hemos registrado tu ' + (pending ? 'solicitud de cita' : 'cita') +
                  ' en L’Studio Ana para el ' + date + ' a las ' + registeredAppointment.time + '. ' +
                  (registeredAppointment.saturdayApproval?.status === 'pending' ? 'Está pendiente de la confirmación de Ana.' :
                    registeredAppointment.advancePayment?.status === 'pending' ? 'Está pendiente de comprobar tu reserva anticipada por Bizum.' : '¡Te esperamos!')
                : 'Hola Ana, soy ' + registeredAppointment.clientName + '. He registrado una solicitud para el ' + date +
                  ' a las ' + registeredAppointment.time + '. Servicios: ' + registeredAppointment.serviceSubcategory +
                  '. ¿Puedes revisar mi reserva?';
              window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
            }} style={{ padding: '12px', background: '#8FC98F', color: '#2C5538', border: '1px solid #3E6B47', borderRadius: '7px', cursor: 'pointer' }}>
              {currentScreen === 'adminPanel' ? 'Abrir WhatsApp de la clienta' : 'Enviar solicitud a Ana por WhatsApp'}
            </button>
            <button autoFocus type="button" onClick={() => setRegisteredAppointment(null)} style={{ padding: '12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F',
              border: 0, borderRadius: '7px', cursor: 'pointer' }}>Entendido</button>
          </div>
        </div>
      </div>}

      {previewService && (() => {
        const variant = previewService.hasVariants ? previewService.variants?.find(item => item.id === previewVariantId) : undefined;
        const category = catalog.find(item => item.subservices.some(service => service.id === previewService.id));
        const tags = [previewService.requiresAssessment ? 'Valoración previa' : '', stylingLabel(previewService), tonerLabel(previewService)].filter(Boolean);
        return <div onClick={() => setPreviewServiceId(null)} onKeyDown={event => { if (event.key === 'Escape') setPreviewServiceId(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(5px)',
            display: 'grid', placeItems: 'center', padding: '16px', zIndex: 2200 }}>
          <article role="dialog" aria-modal="true" aria-labelledby="catalog-preview-title" onClick={event => event.stopPropagation()}
            style={{ width: '100%', maxWidth: '590px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box',
              background: '#322A25', color: '#FFF8EE', border: '1px solid rgba(228, 198, 135, 0.45)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(60, 50, 40, 0.12)' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: '14px 22px', background: '#322A25',
              borderBottom: '1px solid rgba(255, 248, 238, 0.16)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#D6CBB8', fontSize: '11px', letterSpacing: '1px' }}>VISTA PREVIA · CATÁLOGO</span>
              <button autoFocus type="button" onClick={() => setPreviewServiceId(null)} aria-label="Cerrar vista previa"
                style={{ minHeight: '40px', padding: '9px 12px', background: '#3E342C', color: '#D6CBB8',
                  border: '1px solid #3A312A', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>Cerrar ×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ color: '#E4C687', fontSize: '10px', letterSpacing: '2px', margin: '0 0 12px', lineHeight: 1.7 }}>L’STUDIO ANA · {category?.title || 'HAIR EXPERIENCE'}</p>
              <h2 id="catalog-preview-title" style={{ fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', fontSize: '22px', lineHeight: 1.2,
                margin: '0 0 18px', overflowWrap: 'anywhere' }}>{previewService.name}</h2>
              {previewService.active === false && <p style={{ color: '#E4C687', fontSize: '12px' }}>Servicio desactivado · Oculto para nuevas reservas</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 248, 238, 0.16)' }}>
                <strong style={{ color: '#E4C687', fontSize: '18px', fontWeight: 'normal' }}>{variant?.price || previewService.price}</strong>
                <span style={{ color: '#D6CBB8', fontSize: '12px' }}>{variant?.duration || previewService.duration}</span>
                {variant && <span style={{ color: '#D6CBB8', fontSize: '12px' }}>{variant.name}</span>}
              </div>
              {previewService.description && <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: '22px 0' }}>{previewService.description}</p>}
              {!!tags.length && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', margin: '18px 0' }}>
                {tags.map(tag => <span key={tag} style={{ fontSize: '11px', color: '#E4C687', padding: '7px 10px', border: '1px solid #C5A059', borderRadius: '20px', lineHeight: 1.4 }}>{tag}</span>)}
              </div>}
              {previewService.showAlertBadge && previewService.alertText && <p style={{ fontSize: '13px', lineHeight: 1.7, padding: '12px 14px',
                borderLeft: '2px solid #C99E52', background: '#3E342C', color: '#FFF8EE', margin: '18px 0', whiteSpace: 'pre-wrap' }}>{previewService.alertText}</p>}
              {previewService.hasVariants && !!previewService.variants?.length && <section style={{ margin: '25px 0' }}>
                <h3 style={{ fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '16px', fontWeight: 'normal', margin: '0 0 12px' }}>Elige tu opción</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '9px' }}>
                  {previewService.variants.map(item => <button key={item.id} type="button" aria-pressed={item.id === previewVariantId}
                    onClick={() => setPreviewVariantId(item.id)} style={{ textAlign: 'left', padding: '14px', borderRadius: '9px', cursor: 'pointer',
                      background: item.id === previewVariantId ? '#3E342C' : '#322A25', color: '#FFF8EE',
                      border: item.id === previewVariantId ? '1px solid #8F6D24' : '1px solid rgba(255, 248, 238, 0.18)' }}>
                    <strong style={{ display: 'block', color: '#E4C687', fontSize: '13px' }}>{item.name}</strong>
                    {item.description && <span style={{ display: 'block', color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, marginTop: '8px' }}>{item.description}</span>}
                    <span style={{ display: 'block', fontSize: '13px', marginTop: '13px' }}>{item.price}</span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#D6CBB8', marginTop: '5px' }}>{item.duration}</span>
                  </button>)}
                </div>
              </section>}
              {([{ title: '¿Qué incluye?', text: previewService.includesText }, { title: '¿Qué te llevas?', text: previewService.achievedText }, { title: '¿Es para ti?', text: previewService.forWhomText }, { title: 'Condiciones del servicio', text: previewService.conditionsText }]
                .filter(section => !!section.text?.trim()).map(section => <section key={section.title} style={{ borderTop: '1px solid #C5A059', paddingTop: '20px', marginTop: '22px' }}>
                  <h3 style={{ color: '#E4C687', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '16px', fontWeight: 'normal', margin: '0 0 10px' }}>{section.title}</h3>
                  <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0, overflowWrap: 'anywhere' }}>{section.text}</p>
                </section>))}
              <footer style={{ marginTop: '26px', borderTop: '1px solid #C5A059', paddingTop: '16px', color: '#D6CBB8', fontSize: '11px', lineHeight: 1.7 }}>
                Esta vista permite revisar el servicio y sus opciones sin crear una cita. Guarda el catálogo para conservar los cambios.
              </footer>
            </div>
          </article>
        </div>;
      })()}
      {clientDetailsDraft && currentScreen === 'adminPanel' && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'grid', placeItems: 'center', zIndex: 2450, padding: '16px' }}>
        <form role="dialog" aria-modal="true" aria-labelledby="client-details-title" onSubmit={saveClientDetails}
          style={{ background: '#322A25', border: '1px solid #C5A059', borderRadius: '12px', padding: '22px',
            width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
          <h3 id="client-details-title" style={{ color: '#E4C687' }}>Datos y acceso · {clientDetailsDraft.nombre}</h3>
          {(['nombre', 'apellidos', 'telefono', 'email', 'pinAcceso', 'fechaNacimiento'] as const).map(field => <label key={field} style={{ display: 'block', color: '#D6CBB8', fontSize: '13px', marginBottom: '12px' }}>
            {({ nombre: 'Nombre', apellidos: 'Apellidos', telefono: 'Teléfono', email: 'Email', pinAcceso: 'PIN de acceso · 4 números', fechaNacimiento: 'Fecha de nacimiento' })[field]}
            <input value={clientDetailsDraft[field]} type={field === 'email' ? 'email' : field === 'pinAcceso' ? 'password' : field === 'telefono' ? 'tel' : 'text'}
              required={field === 'nombre' || field === 'email' || field === 'pinAcceso'}
              maxLength={field === 'pinAcceso' ? 4 : undefined} inputMode={field === 'pinAcceso' ? 'numeric' : undefined}
              onChange={event => setClientDetailsDraft({ ...clientDetailsDraft, [field]: field === 'pinAcceso' ? event.target.value.replace(/[^0-9]/g, '').slice(0, 4) : event.target.value })}
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '11px', marginTop: '6px', background: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', fontSize: '15px' }} />
          </label>)}
          <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6 }}>Al cambiar el email, nombre o teléfono se actualizarán las citas vinculadas a esta ficha.</p>
          <button type="submit" style={{ padding: '12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', border: 0, borderRadius: '6px', cursor: 'pointer' }}>Guardar datos</button>
          <button type="button" onClick={() => setClientDetailsDraft(null)} style={{ padding: '12px', marginLeft: '10px', background: 'none', color: '#D6CBB8', border: '1px solid #3A312A', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
        </form>
      </div>}

      {passportDraft && currentScreen === 'adminPanel' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 2400 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="passport-editor-title" style={{ width: '100%', maxWidth: '660px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '14px', padding: '22px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', boxSizing: 'border-box', color: '#FFF8EE' }}>
            <h3 id="passport-editor-title" style={{ color: '#E4C687', marginTop: 0 }}>Pasaporte · {passportDraft.nombre} {passportDraft.apellidos}</h3>
            <p style={{ fontSize: '13px', color: '#D6CBB8', lineHeight: 1.6 }}>Estos datos serán visibles en el portal de la clienta. Incluye solo las notas que quieras compartir con ella.</p>
            {([['dniCapilar', 'DNI capilar / diagnóstico'], ['prescripcionCasa', 'Cuidado en casa'], ['ultimaVisita', 'Última visita registrada'], ['proximaVisitaSugerida', 'Próxima visita recomendada']] as const).map(([field, label]) => <label key={field} style={{ display: 'block', marginBottom: '16px', fontSize: '13px' }}>{label}<textarea value={passportDraft[field] || ''} onChange={e => setPassportDraft({ ...passportDraft, [field]: e.target.value })} rows={field === 'dniCapilar' || field === 'prescripcionCasa' ? 3 : 1} style={{ display: 'block', width: '100%', boxSizing: 'border-box', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', padding: '10px', marginTop: '7px', fontSize: '14px' }} /></label>)}
            <h4 style={{ color: '#E4C687' }}>Historial de visitas</h4>
            {(passportDraft.pastVisits || []).map((visit, index) => <div key={index} style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', padding: '14px', borderRadius: '8px', marginBottom: '12px' }}>
              {(['date', 'service', 'stylist', 'notes'] as const).map(field => <label key={field} style={{ display: 'block', marginBottom: '10px', fontSize: '12px' }}>{({ date: 'Fecha', service: 'Servicio realizado', stylist: 'Profesional', notes: 'Notas para la clienta' })[field]}<input type="text" value={visit[field]} onChange={e => setPassportDraft({ ...passportDraft, pastVisits: (passportDraft.pastVisits || []).map((item, i) => i === index ? { ...item, [field]: e.target.value } : item) })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', marginTop: '5px', backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '6px', color: '#FFF8EE' }} /></label>)}
              <button type="button" onClick={() => { if (window.confirm('¿Quitar esta visita del historial? Se aplicará al guardar.')) setPassportDraft({ ...passportDraft, pastVisits: (passportDraft.pastVisits || []).filter((_, i) => i !== index) }); }} style={{ color: '#C0392B', background: 'none', border: '1px solid #74433e', padding: '8px', borderRadius: '5px', cursor: 'pointer' }}>Borrar visita</button>
            </div>)}
            <button type="button" onClick={() => setPassportDraft({ ...passportDraft, pastVisits: [...(passportDraft.pastVisits || []), { date: formatDateKey(new Date()), service: '', stylist: 'Ana', notes: '' }] })} style={{ padding: '10px', cursor: 'pointer' }}>+ Añadir visita realizada</button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
              <button type="button" onClick={savePassport} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '12px 16px', borderRadius: '6px', cursor: 'pointer' }}>Guardar pasaporte</button>
              <button type="button" onClick={() => setPassportDraft(null)} style={{ padding: '12px', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={() => { if (window.confirm('¿Vaciar diagnóstico, cuidados, fechas recomendadas e historial? La clienta y sus citas se conservan. Debes guardar para aplicar.')) setPassportDraft({ ...passportDraft, dniCapilar: '', prescripcionCasa: '', ultimaVisita: '', proximaVisitaSugerida: '', pastVisits: [] }); }} style={{ background: 'none', border: '1px solid #74433e', color: '#C0392B', padding: '12px', borderRadius: '6px', cursor: 'pointer' }}>Vaciar pasaporte</button>
            </div>
          </div>
        </div>
      )}
      {reservationPolicyOpen && <dialog ref={reservationPolicyDialog} aria-labelledby="reservation-policy-title" onCancel={e => { e.preventDefault(); leaveReservationPolicy(); }} style={{ width: 'min(480px, calc(100% - 32px))', maxHeight: '85dvh', overflowY: 'auto', boxSizing: 'border-box', padding: 24, border: '1px solid #C5A059', borderRadius: 16, background: '#29231F', color: '#FFF8EE', boxShadow: '0 20px 80px #0008' }}>
        <style>{`dialog::backdrop { background: rgba(0,0,0,.72); }`}</style>
        <p style={{ fontSize: 11, letterSpacing: 2, color: '#E4C687', margin: '0 0 10px' }}>L’STUDIO ANA · SÁBADOS</p>
        <h2 id="reservation-policy-title" style={{ fontFamily: 'Georgia, serif', fontSize: 25, fontWeight: 400, lineHeight: 1.3, margin: '0 0 12px', color: '#FFF8EE' }}>Solo con confirmación de Ana</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#D6CBB8', margin: '0 0 16px' }}>Abrimos bajo petición previa para eventos y servicios de larga duración.</p>
        <div style={{ background: '#3A312A', border: '1px solid #C49A58', borderLeft: '4px solid #C49A58', padding: 14, borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Clock3 size={22} aria-hidden="true" style={{ color: '#E4C687', flexShrink: 0, marginTop: 2 }} />
          <div><strong style={{ display: 'block', color: '#E4C687', fontSize: 16, lineHeight: 1.4 }}>Tu cita quedará pendiente</strong><p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.6, color: '#FFF8EE' }}>Te avisaremos cuando Ana la acepte. Si requiere un anticipo, te lo indicaremos después.</p></div>
        </div>
        <details style={{ marginTop: 12, color: '#D6CBB8', fontSize: 12 }}><summary style={{ cursor: 'pointer', padding: '8px 0', minHeight: 28 }}>Ver condiciones del Studio</summary><p style={{ whiteSpace: 'pre-line', fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>{saturdayPolicyText}</p></details>
        {saturdayNeedsAcceptance && <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginTop: 8, background: reservationPolicyChecked ? 'rgba(196,154,88,.12)' : 'transparent', border: '1px solid rgba(196,154,88,.35)', borderRadius: 10, fontSize: 14, lineHeight: 1.5, color: '#FFF8EE', cursor: 'pointer' }}><input autoFocus type="checkbox" checked={reservationPolicyChecked} onChange={e => setReservationPolicyChecked(e.target.checked)} style={{ width: 23, height: 23, flexShrink: 0, accentColor: '#C49A58', margin: 0 }} /> Entiendo que mi cita aún no está confirmada.</label>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" onClick={leaveReservationPolicy} style={{ flex: 1, minHeight: 48, padding: 12, border: '1px solid #C5A059', borderRadius: 8, background: 'transparent', color: '#FFF8EE', cursor: 'pointer' }}>Cambiar de día</button>
          <button type="button" disabled={saturdayNeedsAcceptance && !reservationPolicyChecked} onClick={() => { if (saturdayNeedsAcceptance) setAcceptedSaturdayPolicy(saturdayPolicyKey); setReservationPolicyOpen(false); }} style={{ flex: 1, minHeight: 48, padding: 12, border: 'none', borderRadius: 8, background: '#C5A059', color: '#121212', opacity: saturdayNeedsAcceptance && !reservationPolicyChecked ? .45 : 1, cursor: 'pointer' }}>{saturdayNeedsAcceptance ? 'Continuar' : 'Entendido'}</button>
        </div>
      </dialog>}

      {saturdayRequestModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 2100 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="saturday-request-title" style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '16px', padding: '25px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', maxWidth: '440px', width: '100%', color: '#FFF8EE' }}>
            <h3 id="saturday-request-title" style={{ color: '#E4C687' }}>{t('reviewTitle')}</h3>
            <p>{saturdayRequestModal.saturdayApproval?.reason === 'saturday' || saturdayRequestModal.saturdayApproval?.reason === 'both'
              ? (currentLang === 'es' || currentScreen === 'adminPanel'
                ? 'Las citas de los sábados necesitan la confirmación de Ana. Puedes registrar tu solicitud, pero la cita solo quedará confirmada cuando Ana la acepte.'
                : t('reviewExplanation'))
              : t('reviewExplanation')}</p>
            <p>{saturdayRequestModal.dateKey.split('-').reverse().join('/')} · {saturdayRequestModal.time}</p>
            <p>{appointmentServiceNames(saturdayRequestModal)}</p>
            {bizConfig.advancePaymentEnabled && (saturdayRequestModal.durationMinutes || 0) > bizConfig.advancePaymentThresholdMinutes && <p>{tf('reviewDeposit', {amount: bizConfig.depositAmount})}</p>}
            <p style={{ color: '#D6CBB8', fontSize: '12px' }}>{t('localRequestNotice')}</p>
            {pendingBookingError && <p role="alert" style={{color:'#F5C7B8',fontSize:13,lineHeight:1.6}}>{pendingBookingError}</p>}
            <button type="button" disabled={pendingBookingBusy} onClick={() => setSaturdayRequestModal(null)} style={{ padding: '10px', marginRight: '10px' }}>{t('backAction')}</button>
            <button type="button" disabled={pendingBookingBusy} onClick={registerSaturdayRequest} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{pendingBookingBusy ? 'Enviando al Studio…' : t('registerRequest')}</button>
          </div>
        </div>
      )}
      {advancePaymentModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 2000 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="advance-payment-title" style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '16px', padding: '25px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', maxWidth: '440px', width: '100%', maxHeight: '85vh', overflowY: 'auto', color: '#FFF8EE' }}>
            <h3 id="advance-payment-title" style={{ color: '#E4C687', marginTop: 0 }}>{t('depositTitle')} · {advancePaymentModal.advancePayment?.amount} €</h3>
            <p>{tf('bizumExplanation', {minutes: bizConfig.advancePaymentThresholdMinutes, amount: advancePaymentModal.advancePayment?.amount, phone: bizConfig.bizumNumber})}</p>
            <p>{advancePaymentModal.dateKey.split('-').reverse().join('/')} · {advancePaymentModal.time} · {advancePaymentModal.durationMinutes} min</p>
            <p>{t('paymentConceptHelp')}</p>
            <div dir="ltr" style={{ padding: '12px', border: '1px solid #B98A3E', borderRadius: '6px', overflowWrap: 'anywhere' }}>{advancePaymentConcept(advancePaymentModal)}</div>
            <p style={{ color: '#D6CBB8' }}>{t('paymentPendingExplanation')}</p>
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(advancePaymentConcept(advancePaymentModal)); alert(t('copiedConcept')); } catch { alert(t('copyFailed')); } }} style={{ padding: '10px', marginBottom: '12px', cursor: 'pointer' }}>{t('copyConcept')}</button>
            {pendingBookingError && <p role="alert" style={{color:'#F5C7B8',fontSize:13,lineHeight:1.6}}>{pendingBookingError}</p>}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" disabled={pendingBookingBusy} onClick={() => setAdvancePaymentModal(null)} style={{ padding: '10px', cursor: 'pointer' }}>{t('backAction')}</button>
              <button type="button" disabled={pendingBookingBusy} onClick={savePendingAdvanceAppointment} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{pendingBookingBusy ? 'Enviando al Studio…' : t('registerPayment')}</button>
            </div>
          </div>
        </div>
      )}

      {slotAction && currentScreen === 'adminPanel' && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'grid', placeItems: 'center', zIndex: 2500, padding: '16px' }}>
        <div role="dialog" aria-modal="true" aria-labelledby="slot-action-title" style={{ background: '#322A25', border: '1px solid #C5A059', borderRadius: '12px', padding: '22px', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>
          <h3 id="slot-action-title" style={{ color: '#E4C687' }}>{blockMode ? 'Bloquear tiempo' : '¿Qué quieres hacer?'}</h3>
          <p>{slotAction.date.toLocaleDateString('es-ES')} · {slotAction.time}</p>
          {!blockMode ? <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { handleCellClick(slotAction.date, slotAction.day, slotAction.time); setSlotAction(null); }} style={{ padding: '12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', border: 0, cursor: 'pointer' }}>Nueva cita</button>
            <button type="button" onClick={() => setBlockMode(true)} style={{ padding: '12px', cursor: 'pointer' }}>Bloquear tiempo</button>
          </div> : <form onSubmit={event => {
            event.preventDefault();
            if (!Number.isInteger(blockDuration) || blockDuration < 5 || blockDuration > 720) { alert('Indica una duración entre 5 y 720 minutos.'); return; }
            if (!isAgendaTimeWorking(slotAction.date, slotAction.time, blockDuration)) { alert('El bloqueo debe caber dentro del horario laboral.'); return; }
            if (timeBlockConflict(formatDateKey(slotAction.date), slotAction.time, blockDuration) ||
              getRescheduleConflict({ id: '', durationMinutes: blockDuration } as Appointment, formatDateKey(slotAction.date), slotAction.time)) {
              alert('Este periodo coincide con una cita o con otro bloqueo.'); return;
            }
            setTimeBlocks(previous => [...previous, { id: crypto.randomUUID(), dateKey: formatDateKey(slotAction.date),
              time: slotAction.time, durationMinutes: blockDuration, reason: blockReason.trim() || 'Tiempo reservado' }]);
            setSlotAction(null);
          }}>
            <label style={{ display: 'block', marginBottom: '14px' }}>Motivo<input autoFocus value={blockReason} onChange={event => setBlockReason(event.target.value)} placeholder="Comida, descanso, gestión…" style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', marginTop: '6px', background: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A' }} /></label>
            <label>Duración (minutos)<input type="number" min="5" max="720" step="5" required value={blockDuration} onChange={event => setBlockDuration(Number(event.target.value))} style={{ display: 'block', padding: '10px', margin: '6px 0 16px', background: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A' }} /></label>
            <button type="submit" style={{ padding: '12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', border: 0, cursor: 'pointer' }}>Guardar bloqueo</button>
          </form>}
          <button type="button" onClick={() => setSlotAction(null)} style={{ marginTop: '16px', background: 'none', border: 0, color: '#D6CBB8', cursor: 'pointer', padding: '10px' }}>Cancelar</button>
        </div>
      </div>}

      {agendaSidePanel && currentScreen === 'adminPanel' && <div onKeyDown={event => { if (event.key === 'Escape') setAgendaSidePanel(null); }} onClick={() => setAgendaSidePanel(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 900 }}>
        <aside role="dialog" aria-modal="true" aria-labelledby="agenda-side-title" onClick={event => event.stopPropagation()}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 'min(440px, 92vw)', overflowY: 'auto',
            boxSizing: 'border-box', padding: '20px', background: '#322A25', borderRight: '1px solid #B98A3E' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <h3 id="agenda-side-title" style={{ color: '#E4C687', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal' }}>{agendaSidePanel === 'day' ? 'Citas del día' : pendingPanelFilter === 'approval' ? 'Solicitudes por aprobar' : pendingPanelFilter === 'payment' ? 'Bizum por confirmar' : 'Solicitudes y pagos pendientes'}</h3>
            <button autoFocus type="button" onClick={() => setAgendaSidePanel(null)} style={{ padding: '10px', background: 'none', color: '#D6CBB8', border: '1px solid #3A312A', borderRadius: '5px', cursor: 'pointer' }}>Cerrar</button>
          </div>
          {agendaSidePanel === 'day' ? (
                <details open style={{ marginTop: '12px', padding: '14px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '12px' }}>
                  <summary style={{ color: '#E4C687', fontSize: '13px', cursor: 'pointer' }}>Ver lista de citas del día</summary>
                  <p style={{ color: '#D6CBB8', fontSize: '13px', margin: '0 0 16px' }}>{fechaSeleccionada.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {appointments.filter(item => item.dateKey === formatDateKey(fechaSeleccionada)).sort((a, b) => a.time.localeCompare(b.time)).map(item => <button type="button" key={item.id} onClick={() => setViewApptModal(item)} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '16px', textAlign: 'left', backgroundColor: adminAppointmentColor(item).background, border: `1px solid ${adminAppointmentColor(item).border}`, borderRadius: '10px', padding: '16px', cursor: 'pointer', color: '#FFF8EE', width: '100%' }}>
                      <div style={{ minWidth: '55px' }}><strong style={{ fontSize: '19px' }}>{item.time}</strong><span style={{ display: 'block', color: '#D6CBB8', fontSize: '12px', marginTop: '6px' }}>{item.durationMinutes || 45} min</span></div>
                      <div style={{ flex: '1 1 180px', fontSize: '14px', lineHeight: 1.6, overflowWrap: 'anywhere' }}><strong>{item.clientName}</strong><span style={{ display: 'block', color: '#D6CBB8' }}>{appointmentServiceNames(item)}</span><span style={{ display: 'block', fontSize: '12px', color: '#D6CBB8', marginTop: '8px' }}>{item.lifecycleStatus === 'cancelled' ? 'Cancelada' : item.lifecycleStatus === 'no_show' ? 'No presentada' : item.completedAt ? 'Realizada' : item.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : item.advancePayment?.status === 'pending' ? 'Pendiente de Bizum' : 'Confirmada'} · Ver detalles</span></div>
                    </button>)}
                    {!appointments.some(item => item.dateKey === formatDateKey(fechaSeleccionada)) && <p style={{ color: '#D6CBB8', fontSize: '14px', lineHeight: 1.6 }}>No hay citas registradas para este día. Puedes crear una con «Nueva cita» o elegir un hueco en el calendario.</p>}
                  </div>
                </details>
          ) : (
                <details open style={{ marginTop: '14px', padding: '16px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '10px' }}>
                  <summary style={{ color: '#E4C687', cursor: 'pointer', fontSize: '14px' }}>Revisar solicitudes y pagos pendientes</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
{pendingPanelFilter !== 'payment' && <h4 style={{ color: '#E4C687', fontSize: '13px' }}>Solicitudes por aprobar</h4>}                    {appointments.filter(item => pendingPanelFilter !== 'payment' && isActiveAppointment(item) && item.saturdayApproval?.status === 'pending').map(item => <button type="button" key={item.id} onClick={() => setViewApptModal(item)} style={{ textAlign: 'left', padding: '14px', background: '#322A25', border: '1px solid #C5A059', borderRadius: '8px', color: '#FFF8EE', cursor: 'pointer', fontSize: '13px', lineHeight: 1.7 }}><strong>{item.clientName}</strong> · {item.dateKey.split('-').reverse().join('/')} · {item.time}<span style={{ display: 'block', color: item.saturdayApproval?.status === 'pending' ? '#B3823B' : '#4A6FA5' }}>{item.lifecycleStatus === 'cancelled' ? 'Cancelada' : item.lifecycleStatus === 'no_show' ? 'No presentada' : item.completedAt ? 'Realizada' : item.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : 'Pendiente de Bizum'}</span></button>)}{pendingPanelFilter !== 'approval' && <h4 style={{ color: '#4A6FA5', fontSize: '13px' }}>Bizum por confirmar</h4>}                    {appointments.filter(item => pendingPanelFilter !== 'approval' && isActiveAppointment(item) && item.advancePayment?.status === 'pending' && item.saturdayApproval?.status !== 'pending').map(item => <button type="button" key={item.id} onClick={() => setViewApptModal(item)} style={{ textAlign: 'left', padding: '14px', background: '#322A25', border: '1px solid #C5A059', borderRadius: '8px', color: '#FFF8EE', cursor: 'pointer', fontSize: '13px', lineHeight: 1.7 }}><strong>{item.clientName}</strong> · {item.dateKey.split('-').reverse().join('/')} · {item.time}<span style={{ display: 'block', color: item.saturdayApproval?.status === 'pending' ? '#B3823B' : '#4A6FA5' }}>{item.lifecycleStatus === 'cancelled' ? 'Cancelada' : item.lifecycleStatus === 'no_show' ? 'No presentada' : item.completedAt ? 'Realizada' : item.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : 'Pendiente de Bizum'}</span></button>)}
                    {!appointments.some(item => isActiveAppointment(item) && ((pendingPanelFilter !== 'payment' && item.saturdayApproval?.status === 'pending') || (pendingPanelFilter !== 'approval' && item.saturdayApproval?.status !== 'pending' && item.advancePayment?.status === 'pending'))) && <p style={{ color: '#D6CBB8', fontSize: '13px' }}>No hay solicitudes ni pagos pendientes.</p>}
                  </div>
                </details>
          )}
        </aside>
      </div>}

      {/* MODAL NUEVA CITA ADMIN */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '16px', padding: '25px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', maxWidth: '560px', boxSizing: 'border-box', width: '100%', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ color: '#E4C687', fontSize: '16px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: 0 }}>{editingAppointment ? 'Editar servicios · 360studio' : 'Nueva cita · 360studio'}</h3>
            <p style={{ color: '#E4C687', fontSize: '14px', margin: 0 }}>{targetDateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {targetTime}</p>
            <form onSubmit={handleSaveModalAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ color: '#FFF8EE', fontSize: '16px', margin: '8px 0' }}>1. Datos de la clienta</h4>
              {!editingAppointment && <section style={{ background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px', padding: '12px' }}>
                <label htmlFor="new-appointment-client-search" style={{ color: '#E4C687', fontSize: '13px' }}>Buscar clienta registrada</label>
                <input id="new-appointment-client-search" type="search" value={modalClientSearch} onChange={event => setModalClientSearch(event.target.value)}
                  placeholder="Nombre, teléfono o email" style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '11px', marginTop: '8px',
                    background: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', fontSize: '15px' }} />
                {!!modalClientSearch.trim() && <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {listaClientes.filter(client => {
                    const query = normalizeCatalogSearch(modalClientSearch);
                    const digits = modalClientSearch.replace(/[^0-9]/g, '');
                    return normalizeCatalogSearch(client.nombre + ' ' + client.apellidos + ' ' + client.email).includes(query) ||
                      (!!digits && /^[+()\s\d.-]+$/.test(modalClientSearch) && client.telefono.replace(/[^0-9]/g, '').includes(digits));
                  }).map(client => <button type="button" key={client.idNum} onClick={() => {
                    setModalClientName((client.nombre + ' ' + client.apellidos).trim()); setModalPhone(client.telefono); setModalEmail(client.email);
                    setQuickClientMode(false); setQuickClientPin(''); setQuickClientMessage('Clienta seleccionada: ' + client.registroId); setModalClientSearch('');
                  }} style={{ textAlign: 'left', padding: '10px', background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', borderRadius: '5px', cursor: 'pointer' }}>
                    <strong>{client.nombre} {client.apellidos}</strong><span style={{ display: 'block', color: '#D6CBB8', fontSize: '11px', marginTop: '4px' }}>{client.telefono} · {client.email}</span>
                  </button>)}
                  {!listaClientes.some(client => {
                    const query = normalizeCatalogSearch(modalClientSearch), digits = modalClientSearch.replace(/[^0-9]/g, '');
                    return normalizeCatalogSearch(client.nombre + ' ' + client.apellidos + ' ' + client.email).includes(query) ||
                      (!!digits && /^[+()\s\d.-]+$/.test(modalClientSearch) && client.telefono.replace(/[^0-9]/g, '').includes(digits));
                  }) && <p role="status" style={{ color: '#D6CBB8', fontSize: '12px' }}>No encontramos una ficha. Puedes darla de alta aquí.</p>}
                </div>}
                <button type="button" onClick={() => { setQuickClientMode(previous => !previous); setQuickClientMessage(''); setQuickClientPin(''); }}
                  style={{ marginTop: '10px', padding: '9px', background: 'transparent', color: '#E4C687', border: '1px solid #C5A059', borderRadius: '5px', cursor: 'pointer' }}>
                  {quickClientMode ? 'Cancelar alta de ficha' : '+ Dar de alta nueva clienta'}
                </button>
                {quickClientMessage && <p role="status" style={{ color: '#2E7D32', fontSize: '12px', lineHeight: 1.5 }}>{quickClientMessage}</p>}
              </section>}

              <label style={{ color: '#D6CBB8', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>Nombre y apellidos<input type="text" placeholder="Nombre y Apellidos" value={modalClientName} onChange={(e) => setModalClientName(e.target.value)} required style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} /></label>
              <label style={{ color: '#D6CBB8', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>Teléfono<input type="text" placeholder="Teléfono móvil" value={modalPhone} onChange={(e) => setModalPhone(e.target.value)} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} /></label>
              <label style={{ color: '#D6CBB8', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>Correo electrónico<input type="email" placeholder="Correo electrónico" value={modalEmail} onChange={(e) => setModalEmail(e.target.value)} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} /></label>
              {quickClientMode && <section style={{ padding: '12px', border: '1px solid #C5A059', borderRadius: '8px' }}>
                <p style={{ color: '#D6CBB8', fontSize: '12px' }}>Usaremos el nombre, teléfono y correo indicados arriba para crear la ficha.</p>
                <label style={{ display: 'block', color: '#E4C687', fontSize: '12px' }}>Apellidos<input value={quickClientSurname} onChange={event => setQuickClientSurname(event.target.value)}
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', margin: '6px 0 12px', background: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '5px' }} /></label>
                <label style={{ display: 'block', color: '#E4C687', fontSize: '12px' }}>PIN de clienta · 4 números<input type="password" inputMode="numeric" maxLength={4} value={quickClientPin}
                  onChange={event => setQuickClientPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', margin: '6px 0 12px', background: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '5px' }} /></label>
                <button type="button" onClick={saveQuickClient} style={{ padding: '11px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', border: 0, borderRadius: '5px', cursor: 'pointer' }}>Crear ficha y continuar</button>
                <p style={{ color: '#D6CBB8', fontSize: '11px' }}>Crear la ficha no reserva la cita. Guarda después los servicios y el horario.</p>
              </section>}
              <h4 style={{ color: '#FFF8EE', fontSize: '16px', margin: '14px 0 4px' }}>2. Servicios de la cita</h4>
              <select aria-label="Categoría del servicio" value={modalCatIndex} onChange={(e) => {
                setModalCatIndex(Number(e.target.value));
                setModalSubIndex(0);
                const sub = catalog[Number(e.target.value)]?.subservices[0];
                setModalSelectedVariant(sub?.variants?.[0] || null);
              }} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }}>
                {catalog.map((cat, idx) => (<option key={cat.id} value={idx}>{cat.code} &lt; {cat.title}</option>))}
              </select>
              <select aria-label="Servicio" value={modalSubIndex} onChange={(e) => {
                const sIdx = Number(e.target.value);
                setModalSubIndex(sIdx);
                const sub = catalog[modalCatIndex]?.subservices[sIdx];
                setModalSelectedVariant(sub?.variants?.[0] || null);
              }} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }}>
                {catalog[modalCatIndex]?.subservices.map((sub, idx) => (<option key={sub.id} value={idx}>{bookingName(sub)}{sub.active === false ? " · Oculto en el portal" : ""}</option>))}
              </select>
              {catalog[modalCatIndex]?.subservices[modalSubIndex]?.hasVariants && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: '#E4C687', fontSize: '13px', fontWeight: 'bold' }}>Selecciona Variante:</label>
                  <select value={modalSelectedVariant?.id || ""} onChange={(e) => {
                    const v = catalog[modalCatIndex]?.subservices[modalSubIndex]?.variants?.find(item => item.id === e.target.value);
                    setModalSelectedVariant(v || null);
                  }} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }}>
                    {catalog[modalCatIndex]?.subservices[modalSubIndex]?.variants?.map(v => (
                      <option key={v.id} value={v.id}>{v.name} - {v.price} / {v.duration}</option>
                    ))}
                  </select>
                </div>
              )}
              <button type="button" onClick={handleAddModalService} style={{ background: 'none', border: '1px solid #C5A059', color: '#E4C687', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>+ Añadir servicio a la cita</button>
              {modalServices.length > 0 && (
                <div aria-live="polite" style={{ border: '1px solid #3A312A', borderRadius: '6px', padding: '10px', color: '#FFF8EE', fontSize: '14px' }}>
                  <strong>Servicios de esta cita</strong>
                  {modalServices.map(item => (
                    <div key={item.sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '8px' }}>
                      <span>{bookingName(item.sub)}{item.variant ? ` (${item.variant.name})` : ''} · {item.variant?.duration || item.sub.duration}</span>
                      <button type="button" aria-label={`Quitar ${bookingName(item.sub)}`} onClick={() => setModalServices(previous => previous.filter(entry => entry.sub.id !== item.sub.id))} style={{ background: 'none', border: '1px solid #3A312A', color: '#D6CBB8', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>Quitar</button>
                    </div>
                  ))}
                  <p style={{ color: '#E4C687', marginBottom: 0 }}>Duración total: {getModalDuration(modalServices)} min</p>
                </div>
              )}
              <small style={{ color: '#D6CBB8' }}>Selecciona cada servicio y pulsa «Añadir servicio». Si repites uno, se actualiza su variante. Se guardarán los servicios de la lista; sin lista, se guardará el servicio seleccionado.</small>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" disabled={adminBookingSaving} onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: '1px solid #3A312A', color: '#D6CBB8', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{adminBookingSaving ? 'Guardando…' : editingAppointment ? 'Guardar cambios' : 'Guardar Cita'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pushPanelOpen && !['clientPin', 'clientRegistration', 'adminLogin', 'adminPanel'].includes(currentScreen) && <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div role="dialog" aria-modal="true" aria-label="Mis notificaciones" style={{ width: '100%', maxWidth: 460, maxHeight: '85dvh', overflowY: 'auto', background: '#221D19', color: '#FFF8EE', padding: 20, borderRadius: 14, border: '1px solid #C49A58', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 22, color: '#E4C687', margin: 0 }}>Mis notificaciones</h2>
            <button type="button" aria-label="Cerrar notificaciones" onClick={() => setPushPanelOpen(false)} style={{ minWidth: 44, minHeight: 44, background: 'transparent', color: '#E4C687', border: '1px solid #67543C', borderRadius: 8 }}>✕</button>
          </div>
          <p style={{ color: '#D6CBB8', fontSize: 13, lineHeight: 1.6 }}>Activa los avisos de tus citas en este dispositivo. No necesitas hacer una reserva para probarlos.</p>
          {renderClientPushPanel()}
          <p style={{ color: '#D6CBB8', fontSize: 12, lineHeight: 1.6 }}>Un envío aceptado por el servidor no confirma la entrega. Comprueba si la prueba aparece en las notificaciones de tu móvil.</p>
        </div>
      </div>}
      {/* MODAL DETALLE CITA */}
      {viewApptModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          {Boolean(currentScreen === 'adminPanel') ? (<><style>{`
.lst-appt-dialog {width:min(780px,100%);max-width:100%;box-sizing:border-box;max-height:calc(100dvh - 40px);display:flex;flex-direction:column;background:#322A25;border:1px solid #C5A059;border-radius:16px;box-shadow:0 24px 80px #0008;overflow:hidden;color:#FFF8EE;}
.lst-appt-head {display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #655039;flex-shrink:0;}
.lst-appt-head>div {min-width:0;flex:1;}
.lst-appt-head>div>p:first-child {font-size:10px!important;letter-spacing:1.4px!important;}
.lst-appt-head h3 {font-size:21px!important;margin:5px 0 0!important;line-height:1.25;overflow-wrap:anywhere;}
.lst-appt-head p {line-height:1.4;}
.lst-appt-head>div>span {padding:3px 8px;border:1px solid #67543C;border-radius:20px;}
.lst-appt-body {display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.85fr);gap:14px;padding:16px 18px;overflow-y:auto;min-height:0;overscroll-behavior:contain;}
.lst-appt-column {display:flex;flex-direction:column;gap:10px;min-width:0;}
.lst-appt-column h4 {margin-bottom:8px!important;font-size:13px!important;}
.lst-appt-column>section>div {padding:10px!important;font-size:13px!important;}
.lst-appt-column>div,.lst-appt-column>section,.lst-appt-column>aside {overflow-wrap:anywhere;}
.lst-appt-column>div>p {font-size:17px!important;letter-spacing:.02em!important;}
.lst-appt-footer {display:flex;flex-wrap:wrap;align-items:center;gap:7px;padding:10px 18px;border-top:1px solid #655039;background:#29231F;flex-shrink:0;}
.lst-appt-footer>div {display:contents!important;}
.lst-appt-footer button {font-size:12px!important;min-height:44px;padding:9px 11px!important;}
.lst-appt-notices {border:1px solid #655039;border-radius:8px;padding:9px 11px;min-width:0;}
.lst-appt-notices summary {cursor:pointer;color:#E4C687;font-size:13px;min-height:30px;line-height:1.4;}
.lst-appt-notices[open] {display:flex;flex-direction:column;gap:10px;}
.lst-appt-manage>div {display:flex;flex-direction:column;gap:8px;margin-top:8px;}
.lst-appt-manage button {text-align:left;font-size:12px!important;min-height:44px;padding:10px!important;}
.lst-appt-more {position:relative;}
.lst-appt-more>summary {cursor:pointer;color:#D6CBB8;font-size:12px;min-height:44px;display:flex;align-items:center;padding:0 8px;}
.lst-appt-more>div {position:absolute;bottom:100%;right:0;background:#221D19;border:1px solid #67543C;border-radius:9px;padding:8px;display:flex;flex-direction:column;gap:8px;width:190px;box-shadow:0 8px 24px #0008;z-index:5;}
@media(max-width:620px){.lst-appt-dialog{max-height:calc(100dvh - 24px)}.lst-appt-body{grid-template-columns:1fr;padding:12px;gap:12px}.lst-appt-head{padding:12px}.lst-appt-head h3{font-size:20px!important}.lst-appt-footer{padding:8px 10px;max-height:28dvh;overflow-y:auto}.lst-appt-more>div{position:static;width:auto}}
`}</style><div className="lst-appt-dialog" role="dialog" aria-modal="true" aria-label="Detalle de la cita"><header className="lst-appt-head"><div><p style={{ color: '#E4C687', fontSize: '13px', letterSpacing: '2px', margin: 0 }}>360studio · DETALLE DE LA CITA</p>
<h3 style={{ color: '#FFF8EE', fontSize: '26px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', margin: 0 }}>{viewApptModal.clientName}</h3>
<p style={{ color: '#E4C687', fontSize: 14, margin: '7px 0 0' }}>{viewApptModal.dateKey.split('-').reverse().join('/')} · {viewApptModal.time} · {viewApptModal.durationMinutes || 45} min</p>
<span style={{ display: 'inline-block', fontSize: 11, color: '#E4C687', marginTop: 7 }}>{viewApptModal.lifecycleStatus === 'cancelled' ? 'Cancelada' : viewApptModal.lifecycleStatus === 'no_show' ? 'No presentada' : viewApptModal.completedAt ? 'Finalizada' : viewApptModal.saturdayApproval?.status === 'rejected' ? 'Solicitud rechazada' : viewApptModal.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.advancePayment?.status === 'pending' ? 'Anticipo pendiente' : 'Confirmada'}</span>
{renderPromotionBadge(viewApptModal)}
</div><button type="button" autoFocus onClick={() => setViewApptModal(null)} aria-label="Cerrar detalle de la cita" style={{background:'transparent',border:'1px solid #655039',borderRadius:8,color:'#FFF8EE',minWidth:40,minHeight:40,cursor:'pointer'}}>✕</button></header><div className="lst-appt-body"><div className="lst-appt-column">


<section>
              <h4 style={{ color: '#E4C687', fontSize: '14px', margin: '0 0 12px' }}>Servicios reservados</h4>
              {viewApptModal.services?.length ? viewApptModal.services.map((item, index) => <div key={index} style={{ backgroundColor: '#322A25', padding: '14px', border: '1px solid #3A312A', borderRadius: '8px', marginBottom: '8px', fontSize: '14px', lineHeight: 1.6, color: '#FFF8EE' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><strong>{bookingName(item.sub)}</strong>{viewApptModal.promotion?.serviceId === item.sub.id && renderPromotionBadge(viewApptModal)}</div>{item.variant && <span style={{ display: 'block', color: '#D6CBB8' }}>{item.variant.name}</span>}{renderBookedServicePrice(viewApptModal, item)}</div>) : <p style={{ color: '#E4C687', fontSize: '14px', lineHeight: 1.6, overflowWrap: 'anywhere' }}>{appointmentServiceNames(viewApptModal)}</p>}
            </section>
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#D6CBB8', fontSize: '13px', overflowWrap: 'anywhere' }}>
              <a href={`tel:${viewApptModal.phone}`} style={{ color: '#E4C687', padding: '8px 0' }}>{viewApptModal.phone}</a>
              {validRecipientPhone(viewApptModal.phone) && <a href={'https://wa.me/' + (viewApptModal.phone.replace(/[^0-9]/g, '').length === 9 ? '34' : '') + viewApptModal.phone.replace(/[^0-9]/g, '')} target="_blank" rel="noopener noreferrer" style={{ color: '#E4C687', padding: '8px 0' }}>Abrir WhatsApp</a>}
              <span style={{ padding: '8px 0' }}>{viewApptModal.email}</span>
            </div>
<details className="lst-appt-notices"><summary>Notas internas{viewApptModal.internalNotes ? ' · Con notas' : ''}</summary><section style={{ padding: '14px', background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px' }}>
              <label htmlFor="appointment-internal-notes" style={{ color: '#E4C687', fontSize: '13px' }}>Notas internas · Solo 360studio</label>
              <textarea id="appointment-internal-notes" disabled={notesSaving} value={appointmentNoteDraft} onChange={event => setAppointmentNoteDraft(event.target.value)}
                rows={3} placeholder="Detalles para preparar o hacer seguimiento de esta cita"
                style={{ width: '100%', boxSizing: 'border-box', margin: '10px 0', padding: '10px', background: '#322A25',
                  color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }} />
              <button type="button" disabled={notesSaving} onClick={saveAppointmentNotes} style={{ padding: '10px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', cursor: 'pointer' }}>{notesSaving ? 'Guardando…' : 'Guardar notas'}</button>
              {notesFeedback && <p role="status" style={{ color: '#E4C687', fontSize: 12, lineHeight: 1.5 }}>{notesFeedback}</p>}
            </section></details>
{!viewApptModal.completedAt && isActiveAppointment(viewApptModal) && (() => {
  const url = delayWhatsAppUrl(viewApptModal.phone);
  return <details className="lst-appt-notices"><summary>Avisar de un retraso de la clienta</summary><section style={{ padding: '8px 0', background: '#29231F' }}>
    <p style={{ margin: '0 0 8px', color: '#E4C687', fontSize: '13px', fontWeight: 600 }}>¿La clienta lleva 10 minutos de retraso?</p>
    {url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', minHeight: '44px', boxSizing: 'border-box', background: '#8FC98F', color: '#193923', borderRadius: '8px', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}><MessageCircle size={17} />WhatsApp · Clienta con retraso</a> : <p style={{ color: '#E4C687', fontSize: '12px', margin: 0 }}>Añade un teléfono válido a la cita para preparar el aviso.</p>}
    <p style={{ margin: '8px 0 0', color: '#D6CBB8', fontSize: '12px' }}>Envía este aviso solo si han pasado 10 minutos y la clienta no ha llegado. Revísalo y pulsa Enviar en WhatsApp.</p>
  </section></details>;
})()}
<details className="lst-appt-notices lst-appt-manage"><summary>Gestionar cita · Ficha, repetir y editar</summary><div>{currentScreen === 'adminPanel' && <button type="button" onClick={() => {
              const email = normalizeEmail(viewApptModal.email);
              const matches = email ? listaClientes.filter(client => normalizeEmail(client.email) === email) : [];
              if (matches.length !== 1) {
                alert(matches.length > 1 ? 'Hay varias fichas con este email. Revisa sus datos en Clientas.' :
                  'No hay una ficha vinculada al email de esta cita. Revisa o registra la clienta en Clientas.');
                return;
              }
              const client = matches[0];
              setReturnToAppointmentId(viewApptModal.id);
              setBusquedaCliente(client.registroId || client.email);
              setEditingClientId(null); setAgendaSidePanel(null); setViewApptModal(null);
              setAdminTab('clients'); setAgendaExpanded(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} style={{ padding: '12px', background: '#322A25', color: '#FFF8EE',
              border: '1px solid #C5A059', borderRadius: '8px', cursor: 'pointer' }}>Ficha de clienta · Diagnóstico y fórmulas</button>}
{currentScreen === 'adminPanel' && <button type="button" onClick={() => {
              if (!viewApptModal.services?.length) { alert('Esta cita antigua no tiene servicios estructurados. Crea una nueva cita y selecciona sus servicios.'); return; }
              const services = viewApptModal.services.map(item => {
                const category = catalog.find(category => category.subservices.some(service => service.id === item.sub.id));
                const sub = category?.subservices.find(service => service.id === item.sub.id);
                const variant = item.variant ? sub?.variants?.find(variant => variant.id === item.variant!.id) : null;
                return sub && category && (!item.variant || variant) ? { categoryId: category.id, categoryName: category.title, sub, variant: variant || null } : null;
              });
              if (services.some(item => !item)) { alert('Algún servicio o variante ya no existe. Crea una nueva cita con el catálogo actual.'); return; }
              const currentServices = services.filter((item): item is NonNullable<typeof item> => item !== null);
              const error = getInactiveServiceError(currentServices) || getStylingError(currentServices) || getTonerError(currentServices);
              if (error) { alert(error); return; }
              setRepeatAppointmentMode(true);
              setRescheduleModalAppt({ ...viewApptModal, services: currentServices, durationMinutes: getModalDuration(currentServices) });
              const next = new Date(); next.setHours(12, 0, 0, 0); next.setDate(next.getDate() + 1);
              setNewRescheduleDate(formatDateKey(next)); setNewRescheduleTime('');
              setViewApptModal(null);
            }} style={{ padding: '12px', background: '#322A25', color: '#FFF8EE', border: '1px solid #C5A059',
              borderRadius: '8px', cursor: 'pointer' }}>Repetir cita</button>}
{!viewApptModal.completedAt && isActiveAppointment(viewApptModal) && <button type="button" onClick={() => {
              setEditingAppointment(viewApptModal);
              setTargetDateObj(new Date(viewApptModal.dateKey + 'T12:00:00'));
              setTargetDayName(viewApptModal.dayName); setTargetTime(viewApptModal.time);
              setModalClientName(viewApptModal.clientName); setModalPhone(viewApptModal.phone); setModalEmail(viewApptModal.email);
              setModalServices(viewApptModal.services || []);
              setModalCatIndex(0); setModalSubIndex(0); setModalSelectedVariant(catalog[0]?.subservices[0]?.variants?.[0] || null);
              setViewApptModal(null); setIsModalOpen(true);
            }} style={{ background: '#322A25', color: '#FFF8EE', border: '1px solid #C5A059',
              borderRadius: '8px', padding: '12px', cursor: 'pointer' }}>Editar servicios y duración</button>}</div></details></div><aside className="lst-appt-column"><div style={{ backgroundColor: adminAppointmentColor(viewApptModal).background, border: `1px solid ${adminAppointmentColor(viewApptModal).border}`, borderRadius: '10px', padding: '18px', color: adminAppointmentText(viewApptModal) }}>
              <strong style={{ fontSize: '14px', color: adminAppointmentText(viewApptModal) }}>{viewApptModal.lifecycleStatus === 'cancelled' ? 'Cancelada · Hueco liberado' : viewApptModal.lifecycleStatus === 'no_show' ? 'No presentada · Registro conservado' : viewApptModal.completedAt ? 'Realizada · Registrada en el pasaporte' : viewApptModal.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.advancePayment?.status === 'pending' ? 'Pendiente de Bizum' : 'Cita confirmada'}</strong>
              <p style={{ color: adminAppointmentText(viewApptModal), fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '21px', margin: '12px 0 8px' }}>{new Date(`${viewApptModal.dateKey}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {viewApptModal.time}</p>
              <span style={{ color: adminAppointmentText(viewApptModal), fontSize: '13px' }}>Duración total: {viewApptModal.durationMinutes || 45} min</span>
              {viewApptModal.professionalName && <span style={{ color: adminAppointmentText(viewApptModal), fontSize: '13px', display: 'block', marginTop: '4px' }}>Profesional: {viewApptModal.professionalName}</span>}
            </div>
{viewApptModal.saturdayApproval && ['pending', 'accepted', 'rejected'].includes(String(viewApptModal.saturdayApproval.status)) && isActiveAppointment(viewApptModal) && (
              <div style={{ border: '1px solid #C5A059', padding: '12px', borderRadius: '8px', color: '#FFF8EE' }}>
                <strong>{approvalTitle(viewApptModal.saturdayApproval.reason)}: {viewApptModal.saturdayApproval.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.saturdayApproval.status === 'accepted' ? 'Aceptado por Ana' : 'Rechazado'}</strong>
                <p>{viewApptModal.saturdayApproval.reference}</p>
                {approvalSaveError?.id === viewApptModal.id && <p role="alert" style={{ color: '#FFC4B5', fontSize: 13 }}>{approvalSaveError.message}</p>}
                {approvalSavingId === viewApptModal.id && <p role="status" style={{ color: '#E4C687', fontSize: 13 }}>Guardando la decisión en el Studio…</p>}
                {viewApptModal.saturdayApproval.status === 'pending' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" disabled={approvalSavingId !== null} onClick={() => void saveAppointmentApproval(viewApptModal, 'accepted')}
                      style={{ padding: '10px', minHeight: 44, background: '#C99E52', color: '#29231F', border: '1px solid #C99E52', borderRadius: 6, cursor: approvalSavingId ? 'wait' : 'pointer', opacity: approvalSavingId ? 0.65 : 1 }}>
                      {approvalSavingId === viewApptModal.id ? 'Guardando…' : 'Aceptar solicitud'}
                    </button>
                    <button type="button" disabled={approvalSavingId !== null} onClick={() => void saveAppointmentApproval(viewApptModal, 'rejected')}
                      style={{ padding: '10px', minHeight: 44, background: '#322A25', color: '#FFF8EE', border: '1px solid #C99E52', borderRadius: 6, cursor: approvalSavingId ? 'wait' : 'pointer', opacity: approvalSavingId ? 0.65 : 1 }}>
                      {approvalSavingId === viewApptModal.id ? 'Guardando…' : 'Rechazar solicitud'}
                    </button>
                  </div>
                )}
                {viewApptModal.saturdayApproval.status === 'accepted' && <a style={{ color: '#E4C687' }} target="_blank" rel="noreferrer" href={`https://wa.me/34${viewApptModal.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(viewApptModal.advancePayment?.status === 'pending' ? `Hola ${viewApptModal.clientName}. Ana ha aceptado tu solicitud para el ${viewApptModal.dateKey.split('-').reverse().join('/')} a las ${viewApptModal.time}. Para confirmar, realiza un Bizum de ${viewApptModal.advancePayment?.amount} € al ${bizConfig.bizumNumber}. Concepto: ${advancePaymentConcept(viewApptModal)}. Confirmaremos al comprobar el pago.` : generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time))}`}>Abrir WhatsApp para avisar a la clienta</a>}
              </div>
            )}
{viewApptModal.promotionOrigin && !viewApptModal.promotion && <p style={{ color: '#E4C687', fontSize: 13 }}>Promoción: {viewApptModal.promotionOrigin.title}</p>}
{viewApptModal.promotion && <section style={{ border: '1px solid #C99E52', padding: 12, borderRadius: 8, color: '#E4C687', fontSize: 13 }}><strong>Promoción aplicada · {viewApptModal.promotion.title}</strong><p>{viewApptModal.promotion.serviceName} · {viewApptModal.promotion.variantName}</p><p>{viewApptModal.promotion.originalAmount.toFixed(2)} € → {viewApptModal.promotion.finalAmount.toFixed(2)} € (−{viewApptModal.promotion.percent} %)</p>{viewApptModal.promotion.totalAfter != null && <p>{viewApptModal.promotion.orientative ? 'Total orientativo' : 'Total acordado'}: {viewApptModal.promotion.totalAfter.toFixed(2)} €</p>}<small>Descuento solo en este servicio. Los demás mantienen su precio.</small></section>}
{viewApptModal.advancePayment && ['pending', 'confirmed', 'received', 'paid'].includes(String(viewApptModal.advancePayment.status)) && Number(viewApptModal.advancePayment.amount) > 0 && isActiveAppointment(viewApptModal) && (
              <div style={{ border: '1px solid #C5A059', borderRadius: '8px', padding: '12px', color: '#FFF8EE', fontSize: '14px' }}>
                <strong>Reserva anticipada: {viewApptModal.advancePayment.amount} € · {['confirmed', 'received', 'paid'].includes(String(viewApptModal.advancePayment.status)) ? 'Pago confirmado' : 'Pendiente de pago'}</strong>
                <p>Código: {viewApptModal.advancePayment.reference}</p>
                {bizumSaveError?.id === viewApptModal.id && <p role="alert" style={{ color: '#FFC4B5', fontSize: 13, lineHeight: 1.5 }}>{bizumSaveError.message}</p>}
                {bizumSavingId === viewApptModal.id && <p role="status" style={{ color: '#E4C687', fontSize: 13 }}>Comprobando y guardando el anticipo en el Studio…</p>}
                {viewApptModal.advancePayment.status === 'pending' && (
                  <button type="button" disabled={bizumSavingId !== null} onClick={() => void confirmBizumReceived(viewApptModal)}
                    style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', padding: '10px', border: 'none', borderRadius: '6px', cursor: bizumSavingId ? 'wait' : 'pointer', opacity: bizumSavingId ? 0.65 : 1 }}>
                    {bizumSavingId === viewApptModal.id ? 'Guardando confirmación…' : 'Confirmar Bizum recibido'}
                  </button>
                )}
              </div>
            )}
{!isActiveAppointment(viewApptModal) && <p style={{ color: '#D6CBB8', fontSize: '12px' }}>El registro se conserva en «Citas del día» y en el buscador. No ocupa un hueco ni se añade como visita realizada al pasaporte.</p>}<details className="lst-appt-notices"><summary>Notificaciones · Email, WhatsApp y push</summary>{!viewApptModal.completedAt && currentScreen === 'adminPanel' && (
              <section style={{ padding: '14px', background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#E4C687', fontSize: '14px', margin: 0 }}>Emails automáticos de la cita</h4>
                  <button type="button" onClick={loadAppointmentEmails} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{appointmentEmailsLoading ? 'Cargando…' : 'Consultar estado'}</button>
                </div>
                {!validRecipientEmail(viewApptModal.email) && <p style={{ color: '#E4C687', fontSize: '12px', lineHeight: 1.6, margin: '10px 0 0' }}>Esta reserva no tiene una dirección de email válida: no se enviará ningún correo. Revisa el email de la clienta.</p>}
                {appointmentEmailsError && <p style={{ color: '#C0392B', fontSize: '12px', margin: '10px 0 0' }}>{appointmentEmailsError}</p>}
                {appointmentEmails.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {appointmentEmails.map(row => (
                      <div key={row.id} style={{ fontSize: '12px', lineHeight: 1.6, color: '#FFF8EE', background: '#29231F', border: '1px solid #3A312A', borderRadius: '6px', padding: '10px' }}>
                        <strong>{emailKindLabel(row.kind)}</strong> · <span style={{ color: emailStatusColor(row.status) }}>{emailStatusLabel(row.status)}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>{row.subject}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>Para: {row.to_email || '(sin email)'} · Programado: {new Date(row.scheduled_at).toLocaleString('es-ES')}{row.sent_at ? ` · Enviado: ${new Date(row.sent_at).toLocaleString('es-ES')} (${row.provider})` : ''}{row.attempts ? ` · Intentos: ${row.attempts}` : ''}</span>
                        {row.last_error && <span style={{ display: 'block', color: '#C0392B', marginTop: '4px' }}>{row.last_error}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {appointmentEmails.length === 0 && !appointmentEmailsLoading && !appointmentEmailsError && validRecipientEmail(viewApptModal.email) && <p style={{ color: '#D6CBB8', fontSize: '12px', margin: '10px 0 0' }}>Pulsa «Consultar estado» para ver los emails programados y enviados de esta cita.</p>}
              </section>
            )}
{!viewApptModal.completedAt && currentScreen === 'adminPanel' && (
              <section style={{ padding: '14px', background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#E4C687', fontSize: '14px', margin: 0 }}>WhatsApp automático de la cita</h4>
                  <button type="button" onClick={loadAppointmentWhatsApp} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{appointmentWhatsAppLoading ? 'Cargando…' : 'Consultar estado'}</button>
                </div>
                {!validRecipientPhone(viewApptModal.phone) && <p style={{ color: '#E4C687', fontSize: '12px', lineHeight: 1.6, margin: '10px 0 0' }}>Esta reserva no tiene un teléfono válido: no se enviará ningún WhatsApp. Revisa el teléfono de la clienta.</p>}
                {appointmentWhatsAppError && <p style={{ color: '#C0392B', fontSize: '12px', margin: '10px 0 0' }}>{appointmentWhatsAppError}</p>}
                {appointmentWhatsApp.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {appointmentWhatsApp.map(row => (
                      <div key={row.id} style={{ fontSize: '12px', lineHeight: 1.6, color: '#FFF8EE', background: '#29231F', border: '1px solid #3A312A', borderRadius: '6px', padding: '10px' }}>
                        <strong>{emailKindLabel(row.kind)}</strong> · <span style={{ color: whatsappStatusColor(row.status) }}>{whatsappStatusLabel(row.status)}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px', whiteSpace: 'pre-line' }}>{row.body_text}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>Para: {row.to_phone} · Programado: {new Date(row.scheduled_at).toLocaleString('es-ES')}{row.sent_at ? ` · Enviado: ${new Date(row.sent_at).toLocaleString('es-ES')}` : ''}{row.delivered_at ? ` · Entregado: ${new Date(row.delivered_at).toLocaleString('es-ES')}` : ''}{row.attempts ? ` · Intentos: ${row.attempts}` : ''}</span>
                        {row.last_error && <span style={{ display: 'block', color: '#C0392B', marginTop: '4px' }}>{row.last_error}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {appointmentWhatsApp.length === 0 && !appointmentWhatsAppLoading && !appointmentWhatsAppError && validRecipientPhone(viewApptModal.phone) && <p style={{ color: '#D6CBB8', fontSize: '12px', margin: '10px 0 0' }}>Pulsa «Consultar estado» para ver los WhatsApp programados y enviados de esta cita.</p>}
                {appointmentWhatsApp.some(row => row.kind === 'confirmation' && (row.status === 'failed' || row.status === 'skipped') && (row.attempts ?? 0) < 5) && (
                  <button type="button" onClick={async () => {
                    const appointmentId = viewApptModal.serverId;
                    if (!appointmentId) { alert('Guarda la reserva primero para poder reintentar su confirmación.'); return; }
                    try {
                      const result = await studioApi.retryWhatsAppConfirmation(studioApi.currentToken()!, appointmentId);
                      alert(result.retried > 0 ? 'Confirmación reencolada y enviada de nuevo. Consulta el estado en unos segundos.' : 'No hay ninguna confirmación con error que se pueda reintentar.');
                      loadAppointmentWhatsApp();
                    } catch { alert('No se pudo reintentar la confirmación. Inténtalo de nuevo en unos segundos.'); }
                  }} style={{ marginTop: '10px', padding: '8px 12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Reintentar confirmación</button>
                )}
              </section>
            )}
{!viewApptModal.completedAt && currentScreen === 'adminPanel' && (
              <section style={{ padding: '14px', background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#E4C687', fontSize: '14px', margin: 0 }}>Notificaciones push de la cita</h4>
                  <button type="button" onClick={loadAppointmentPushes} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{appointmentPushesLoading ? 'Cargando…' : 'Consultar estado'}</button>
                </div>
                {appointmentPushesError && <p style={{ color: '#C0392B', fontSize: '12px', margin: '10px 0 0' }}>{appointmentPushesError}</p>}
                {appointmentPushes.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {appointmentPushes.map(row => (
                      <div key={row.id} style={{ fontSize: '12px', lineHeight: 1.6, color: '#FFF8EE', background: '#29231F', border: '1px solid #3A312A', borderRadius: '6px', padding: '10px' }}>
                        <strong>{pushKindLabel(row.kind)}</strong> · <span style={{ color: pushStatusColorAdmin(row.status) }}>{pushStatusLabelAdmin(row.status)}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>Dispositivo: {row.studio_push_subscriptions?.user_agent || '(sin datos)'} · Intentos: {row.attempts}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>Programado: {new Date(row.created_at).toLocaleString('es-ES')}{row.delivered_at ? ` · Entregado: ${new Date(row.delivered_at).toLocaleString('es-ES')}` : ''}</span>
                        {row.last_error && <span style={{ display: 'block', color: '#C0392B', marginTop: '4px' }}>{row.last_error}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {appointmentPushes.length === 0 && !appointmentPushesLoading && !appointmentPushesError && <p style={{ color: '#D6CBB8', fontSize: '12px', margin: '10px 0 0' }}>Pulsa «Consultar estado» para ver los envíos push de esta cita.</p>}
              </section>
            )}
<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px', borderTop: '1px solid rgba(212, 175, 55, 0.2)', paddingTop: '12px' }}>
              <span style={{ color: '#E4C687', fontSize: '13px', fontWeight: 'bold' }}>Abrir mensaje de WhatsApp o copiar texto:</span>              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <a href={`https://wa.me/34${viewApptModal.phone.replace(/\s+/g, "")}?text=${encodeURIComponent(generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time))}`} target="_blank" rel="noreferrer" style={{ backgroundColor: '#8FC98F', color: '#2C5538', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  WhatsApp
                </a>
                <button type="button" onClick={() => {
                  const textoEmail = generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time);
                  navigator.clipboard.writeText(textoEmail);
                  alert('¡Texto del recordatorio copiado al portapapeletas!');
                }} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textAlign: 'center', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  Copiar Mensaje
                </button>
              </div>
            </div></details></aside></div><footer className="lst-appt-footer">{viewApptModal.completedAt ? <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.6 }}>Visita registrada en el pasaporte. Puedes editar o borrar esa visita desde Clientes → Editar pasaporte e historial.</p> : <button type="button" onClick={() => markAppointmentCompleted(viewApptModal)} style={{ backgroundColor: '#8FC98F', border: '1px solid #3E6B47', color: '#2C5538', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', fontSize: '14px' }}>Finalizar servicio</button>}
<button type="button" onClick={() => { setRepeatAppointmentMode(false); setRescheduleModalAppt(viewApptModal); setNewRescheduleDate(viewApptModal.dateKey); setNewRescheduleTime(viewApptModal.time); setViewApptModal(null); }} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', fontSize: '14px' }}>Cambiar cita</button>
{!viewApptModal.completedAt && isActiveAppointment(viewApptModal) && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button type="button" onClick={() => changeAppointmentStatus(viewApptModal, 'cancelled')} style={{ padding: '10px', border: '1px solid #3A312A', color: '#C0392B', background: '#322A25', borderRadius: '6px', cursor: 'pointer' }}>{viewApptModal.lifecycleStatus === 'cancelled' ? 'Cita cancelada · WhatsApp' : 'Cancelar cita'}</button>

            </div>}
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', marginTop: '10px' }}>

              <details className="lst-appt-more"><summary>Más acciones</summary><div>{!viewApptModal.completedAt && isActiveAppointment(viewApptModal) && (<button type="button" onClick={() => changeAppointmentStatus(viewApptModal, 'no_show')} style={{ padding: '10px', border: '1px solid #C5A059', color: '#D6CBB8', background: '#322A25', borderRadius: '6px', cursor: 'pointer' }}>No presentada</button>)}<button disabled={deletingAppointmentId !== null} onClick={(e) => void handleDeleteAppointment(viewApptModal.id, e)} style={{ backgroundColor: '#F2DCD8', border: '1px solid #C0392B', color: '#8A2F23', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>{deletingAppointmentId === viewApptModal.id ? 'Eliminando…' : 'Eliminar cita'}</button></div></details>
              <button onClick={() => setViewApptModal(null)} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cerrar</button>
            </div></footer></div></>) : (<div style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '16px', padding: '25px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', maxWidth: '560px', width: '100%', boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ color: '#E4C687', fontSize: '13px', letterSpacing: '2px', margin: 0 }}>360studio · DETALLE DE LA CITA</p>
            {renderPromotionBadge(viewApptModal)}
            <h3 style={{ color: '#FFF8EE', fontSize: '26px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', margin: 0 }}>{viewApptModal.clientName}</h3>
            <div style={{ backgroundColor: adminAppointmentColor(viewApptModal).background, border: `1px solid ${adminAppointmentColor(viewApptModal).border}`, borderRadius: '10px', padding: '18px', color: adminAppointmentText(viewApptModal) }}>
              <strong style={{ fontSize: '14px', color: adminAppointmentText(viewApptModal) }}>{viewApptModal.lifecycleStatus === 'cancelled' ? 'Cancelada · Hueco liberado' : viewApptModal.lifecycleStatus === 'no_show' ? 'No presentada · Registro conservado' : viewApptModal.completedAt ? 'Realizada · Registrada en el pasaporte' : viewApptModal.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.advancePayment?.status === 'pending' ? 'Pendiente de Bizum' : 'Cita confirmada'}</strong>
              <p style={{ color: adminAppointmentText(viewApptModal), fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '21px', margin: '12px 0 8px' }}>{new Date(`${viewApptModal.dateKey}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {viewApptModal.time}</p>
              <span style={{ color: adminAppointmentText(viewApptModal), fontSize: '13px' }}>Duración total: {viewApptModal.durationMinutes || 45} min</span>
              {viewApptModal.professionalName && <span style={{ color: adminAppointmentText(viewApptModal), fontSize: '13px', display: 'block', marginTop: '4px' }}>Profesional: {viewApptModal.professionalName}</span>}
            </div>
            {currentScreen === 'adminPanel' && <button type="button" onClick={() => {
              const email = normalizeEmail(viewApptModal.email);
              const matches = email ? listaClientes.filter(client => normalizeEmail(client.email) === email) : [];
              if (matches.length !== 1) {
                alert(matches.length > 1 ? 'Hay varias fichas con este email. Revisa sus datos en Clientas.' :
                  'No hay una ficha vinculada al email de esta cita. Revisa o registra la clienta en Clientas.');
                return;
              }
              const client = matches[0];
              setReturnToAppointmentId(viewApptModal.id);
              setBusquedaCliente(client.registroId || client.email);
              setEditingClientId(null); setAgendaSidePanel(null); setViewApptModal(null);
              setAdminTab('clients'); setAgendaExpanded(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} style={{ padding: '12px', background: '#322A25', color: '#FFF8EE',
              border: '1px solid #C5A059', borderRadius: '8px', cursor: 'pointer' }}>Abrir ficha de la clienta · Diagnóstico y fórmulas</button>}
            {currentScreen === 'adminPanel' && <button type="button" onClick={() => {
              if (!viewApptModal.services?.length) { alert('Esta cita antigua no tiene servicios estructurados. Crea una nueva cita y selecciona sus servicios.'); return; }
              const services = viewApptModal.services.map(item => {
                const category = catalog.find(category => category.subservices.some(service => service.id === item.sub.id));
                const sub = category?.subservices.find(service => service.id === item.sub.id);
                const variant = item.variant ? sub?.variants?.find(variant => variant.id === item.variant!.id) : null;
                return sub && category && (!item.variant || variant) ? { categoryId: category.id, categoryName: category.title, sub, variant: variant || null } : null;
              });
              if (services.some(item => !item)) { alert('Algún servicio o variante ya no existe. Crea una nueva cita con el catálogo actual.'); return; }
              const currentServices = services.filter((item): item is NonNullable<typeof item> => item !== null);
              const error = getInactiveServiceError(currentServices) || getStylingError(currentServices) || getTonerError(currentServices);
              if (error) { alert(error); return; }
              setRepeatAppointmentMode(true);
              setRescheduleModalAppt({ ...viewApptModal, services: currentServices, durationMinutes: getModalDuration(currentServices) });
              const next = new Date(); next.setHours(12, 0, 0, 0); next.setDate(next.getDate() + 1);
              setNewRescheduleDate(formatDateKey(next)); setNewRescheduleTime('');
              setViewApptModal(null);
            }} style={{ padding: '12px', background: '#322A25', color: '#FFF8EE', border: '1px solid #C5A059',
              borderRadius: '8px', cursor: 'pointer' }}>Repetir cita · Elegir nueva fecha</button>}
            {!viewApptModal.completedAt && isActiveAppointment(viewApptModal) && <button type="button" onClick={() => {
              setEditingAppointment(viewApptModal);
              setTargetDateObj(new Date(viewApptModal.dateKey + 'T12:00:00'));
              setTargetDayName(viewApptModal.dayName); setTargetTime(viewApptModal.time);
              setModalClientName(viewApptModal.clientName); setModalPhone(viewApptModal.phone); setModalEmail(viewApptModal.email);
              setModalServices(viewApptModal.services || []);
              setModalCatIndex(0); setModalSubIndex(0); setModalSelectedVariant(catalog[0]?.subservices[0]?.variants?.[0] || null);
              setViewApptModal(null); setIsModalOpen(true);
            }} style={{ background: '#322A25', color: '#FFF8EE', border: '1px solid #C5A059',
              borderRadius: '8px', padding: '12px', cursor: 'pointer' }}>Editar servicios y duración</button>}
            <section>
              <h4 style={{ color: '#E4C687', fontSize: '14px', margin: '0 0 12px' }}>Servicios reservados</h4>
              {viewApptModal.services?.length ? viewApptModal.services.map((item, index) => <div key={index} style={{ backgroundColor: '#322A25', padding: '14px', border: '1px solid #3A312A', borderRadius: '8px', marginBottom: '8px', fontSize: '14px', lineHeight: 1.6, color: '#FFF8EE' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><strong>{bookingName(item.sub)}</strong>{viewApptModal.promotion?.serviceId === item.sub.id && renderPromotionBadge(viewApptModal)}</div>{item.variant && <span style={{ display: 'block', color: '#D6CBB8' }}>{item.variant.name}</span>}{renderBookedServicePrice(viewApptModal, item)}</div>) : <p style={{ color: '#E4C687', fontSize: '14px', lineHeight: 1.6, overflowWrap: 'anywhere' }}>{appointmentServiceNames(viewApptModal)}</p>}
            </section>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#D6CBB8', fontSize: '13px', overflowWrap: 'anywhere' }}>
              <a href={`tel:${viewApptModal.phone}`} style={{ color: '#E4C687', padding: '8px 0' }}>{viewApptModal.phone}</a>
              <span style={{ padding: '8px 0' }}>{viewApptModal.email}</span>
            </div>
            {viewApptModal.completedAt ? <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.6 }}>Visita registrada en el pasaporte. Puedes editar o borrar esa visita desde Clientes → Editar pasaporte e historial.</p> : <button type="button" onClick={() => markAppointmentCompleted(viewApptModal)} style={{ backgroundColor: '#8FC98F', border: '1px solid #3E6B47', color: '#2C5538', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', fontSize: '14px' }}>Marcar como realizada · Añadir al pasaporte</button>}
            <button type="button" onClick={() => { setRepeatAppointmentMode(false); setRescheduleModalAppt(viewApptModal); setNewRescheduleDate(viewApptModal.dateKey); setNewRescheduleTime(viewApptModal.time); setViewApptModal(null); }} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', fontSize: '14px' }}>Cambiar fecha u hora</button>
            {viewApptModal.saturdayApproval && ['pending', 'accepted', 'rejected'].includes(String(viewApptModal.saturdayApproval.status)) && isActiveAppointment(viewApptModal) && (
              <div style={{ border: '1px solid #C5A059', padding: '12px', borderRadius: '8px', color: '#FFF8EE' }}>
                <strong>{approvalTitle(viewApptModal.saturdayApproval.reason)}: {viewApptModal.saturdayApproval.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.saturdayApproval.status === 'accepted' ? 'Aceptado por Ana' : 'Rechazado'}</strong>
                <p>{viewApptModal.saturdayApproval.reference}</p>
                {approvalSaveError?.id === viewApptModal.id && <p role="alert" style={{ color: '#FFC4B5', fontSize: 13 }}>{approvalSaveError.message}</p>}
                {approvalSavingId === viewApptModal.id && <p role="status" style={{ color: '#E4C687', fontSize: 13 }}>Guardando la decisión en el Studio…</p>}
                {viewApptModal.saturdayApproval.status === 'pending' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" disabled={approvalSavingId !== null} onClick={() => void saveAppointmentApproval(viewApptModal, 'accepted')}
                      style={{ padding: '10px', minHeight: 44, background: '#C99E52', color: '#29231F', border: '1px solid #C99E52', borderRadius: 6, cursor: approvalSavingId ? 'wait' : 'pointer', opacity: approvalSavingId ? 0.65 : 1 }}>
                      {approvalSavingId === viewApptModal.id ? 'Guardando…' : 'Aceptar solicitud'}
                    </button>
                    <button type="button" disabled={approvalSavingId !== null} onClick={() => void saveAppointmentApproval(viewApptModal, 'rejected')}
                      style={{ padding: '10px', minHeight: 44, background: '#322A25', color: '#FFF8EE', border: '1px solid #C99E52', borderRadius: 6, cursor: approvalSavingId ? 'wait' : 'pointer', opacity: approvalSavingId ? 0.65 : 1 }}>
                      {approvalSavingId === viewApptModal.id ? 'Guardando…' : 'Rechazar solicitud'}
                    </button>
                  </div>
                )}
                {viewApptModal.saturdayApproval.status === 'accepted' && <a style={{ color: '#E4C687' }} target="_blank" rel="noreferrer" href={`https://wa.me/34${viewApptModal.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(viewApptModal.advancePayment?.status === 'pending' ? `Hola ${viewApptModal.clientName}. Ana ha aceptado tu solicitud para el ${viewApptModal.dateKey.split('-').reverse().join('/')} a las ${viewApptModal.time}. Para confirmar, realiza un Bizum de ${viewApptModal.advancePayment?.amount} € al ${bizConfig.bizumNumber}. Concepto: ${advancePaymentConcept(viewApptModal)}. Confirmaremos al comprobar el pago.` : generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time))}`}>Abrir WhatsApp para avisar a la clienta</a>}
              </div>
            )}
            {viewApptModal.promotionOrigin && !viewApptModal.promotion && <p style={{ color: '#E4C687', fontSize: 13 }}>Promoción: {viewApptModal.promotionOrigin.title}</p>}
{viewApptModal.promotion && <section style={{ border: '1px solid #C99E52', padding: 12, borderRadius: 8, color: '#E4C687', fontSize: 13 }}><strong>Promoción aplicada · {viewApptModal.promotion.title}</strong><p>{viewApptModal.promotion.serviceName} · {viewApptModal.promotion.variantName}</p><p>{viewApptModal.promotion.originalAmount.toFixed(2)} € → {viewApptModal.promotion.finalAmount.toFixed(2)} € (−{viewApptModal.promotion.percent} %)</p>{viewApptModal.promotion.totalAfter != null && <p>{viewApptModal.promotion.orientative ? 'Total orientativo' : 'Total acordado'}: {viewApptModal.promotion.totalAfter.toFixed(2)} €</p>}<small>Descuento solo en este servicio. Los demás mantienen su precio.</small></section>}
{viewApptModal.advancePayment && ['pending', 'confirmed', 'received', 'paid'].includes(String(viewApptModal.advancePayment.status)) && Number(viewApptModal.advancePayment.amount) > 0 && isActiveAppointment(viewApptModal) && (
              <div style={{ border: '1px solid #C5A059', borderRadius: '8px', padding: '12px', color: '#FFF8EE', fontSize: '14px' }}>
                <strong>Reserva anticipada: {viewApptModal.advancePayment.amount} € · {['confirmed', 'received', 'paid'].includes(String(viewApptModal.advancePayment.status)) ? 'Pago confirmado' : 'Pendiente de pago'}</strong>
                <p>Código: {viewApptModal.advancePayment.reference}</p>
                {bizumSaveError?.id === viewApptModal.id && <p role="alert" style={{ color: '#FFC4B5', fontSize: 13, lineHeight: 1.5 }}>{bizumSaveError.message}</p>}
                {bizumSavingId === viewApptModal.id && <p role="status" style={{ color: '#E4C687', fontSize: 13 }}>Comprobando y guardando el anticipo en el Studio…</p>}
                {viewApptModal.advancePayment.status === 'pending' && (
                  <button type="button" disabled={bizumSavingId !== null} onClick={() => void confirmBizumReceived(viewApptModal)}
                    style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', padding: '10px', border: 'none', borderRadius: '6px', cursor: bizumSavingId ? 'wait' : 'pointer', opacity: bizumSavingId ? 0.65 : 1 }}>
                    {bizumSavingId === viewApptModal.id ? 'Guardando confirmación…' : 'Confirmar Bizum recibido'}
                  </button>
                )}
              </div>
            )}
            <section style={{ padding: '14px', background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px' }}>
              <label htmlFor="appointment-internal-notes" style={{ color: '#E4C687', fontSize: '13px' }}>Notas internas · Solo 360studio</label>
              <textarea id="appointment-internal-notes" disabled={notesSaving} value={appointmentNoteDraft} onChange={event => setAppointmentNoteDraft(event.target.value)}
                rows={3} placeholder="Detalles para preparar o hacer seguimiento de esta cita"
                style={{ width: '100%', boxSizing: 'border-box', margin: '10px 0', padding: '10px', background: '#322A25',
                  color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }} />
              <button type="button" disabled={notesSaving} onClick={saveAppointmentNotes} style={{ padding: '10px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', cursor: 'pointer' }}>{notesSaving ? 'Guardando…' : 'Guardar notas'}</button>
              {notesFeedback && <p role="status" style={{ color: '#E4C687', fontSize: 12, lineHeight: 1.5 }}>{notesFeedback}</p>}
            </section>
            {!viewApptModal.completedAt && isActiveAppointment(viewApptModal) && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button type="button" onClick={() => changeAppointmentStatus(viewApptModal, 'cancelled')} style={{ padding: '10px', border: '1px solid #3A312A', color: '#C0392B', background: '#322A25', borderRadius: '6px', cursor: 'pointer' }}>{viewApptModal.lifecycleStatus === 'cancelled' ? 'Cita cancelada · WhatsApp' : 'Marcar cancelada'}</button>
              <button type="button" onClick={() => changeAppointmentStatus(viewApptModal, 'no_show')} style={{ padding: '10px', border: '1px solid #C5A059', color: '#D6CBB8', background: '#322A25', borderRadius: '6px', cursor: 'pointer' }}>No presentada</button>
            </div>}
            {!isActiveAppointment(viewApptModal) && <p style={{ color: '#D6CBB8', fontSize: '12px' }}>El registro se conserva en «Citas del día» y en el buscador. No ocupa un hueco ni se añade como visita realizada al pasaporte.</p>}
            {!viewApptModal.completedAt && currentScreen === 'adminPanel' && (
              <section style={{ padding: '14px', background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#E4C687', fontSize: '14px', margin: 0 }}>Emails automáticos de la cita</h4>
                  <button type="button" onClick={loadAppointmentEmails} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{appointmentEmailsLoading ? 'Cargando…' : 'Consultar estado'}</button>
                </div>
                {!validRecipientEmail(viewApptModal.email) && <p style={{ color: '#E4C687', fontSize: '12px', lineHeight: 1.6, margin: '10px 0 0' }}>Esta reserva no tiene una dirección de email válida: no se enviará ningún correo. Revisa el email de la clienta.</p>}
                {appointmentEmailsError && <p style={{ color: '#C0392B', fontSize: '12px', margin: '10px 0 0' }}>{appointmentEmailsError}</p>}
                {appointmentEmails.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {appointmentEmails.map(row => (
                      <div key={row.id} style={{ fontSize: '12px', lineHeight: 1.6, color: '#FFF8EE', background: '#29231F', border: '1px solid #3A312A', borderRadius: '6px', padding: '10px' }}>
                        <strong>{emailKindLabel(row.kind)}</strong> · <span style={{ color: emailStatusColor(row.status) }}>{emailStatusLabel(row.status)}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>{row.subject}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>Para: {row.to_email || '(sin email)'} · Programado: {new Date(row.scheduled_at).toLocaleString('es-ES')}{row.sent_at ? ` · Enviado: ${new Date(row.sent_at).toLocaleString('es-ES')} (${row.provider})` : ''}{row.attempts ? ` · Intentos: ${row.attempts}` : ''}</span>
                        {row.last_error && <span style={{ display: 'block', color: '#C0392B', marginTop: '4px' }}>{row.last_error}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {appointmentEmails.length === 0 && !appointmentEmailsLoading && !appointmentEmailsError && validRecipientEmail(viewApptModal.email) && <p style={{ color: '#D6CBB8', fontSize: '12px', margin: '10px 0 0' }}>Pulsa «Consultar estado» para ver los emails programados y enviados de esta cita.</p>}
              </section>
            )}
            {!viewApptModal.completedAt && currentScreen === 'adminPanel' && (
              <section style={{ padding: '14px', background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#E4C687', fontSize: '14px', margin: 0 }}>WhatsApp automático de la cita</h4>
                  <button type="button" onClick={loadAppointmentWhatsApp} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{appointmentWhatsAppLoading ? 'Cargando…' : 'Consultar estado'}</button>
                </div>
                {!validRecipientPhone(viewApptModal.phone) && <p style={{ color: '#E4C687', fontSize: '12px', lineHeight: 1.6, margin: '10px 0 0' }}>Esta reserva no tiene un teléfono válido: no se enviará ningún WhatsApp. Revisa el teléfono de la clienta.</p>}
                {appointmentWhatsAppError && <p style={{ color: '#C0392B', fontSize: '12px', margin: '10px 0 0' }}>{appointmentWhatsAppError}</p>}
                {appointmentWhatsApp.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {appointmentWhatsApp.map(row => (
                      <div key={row.id} style={{ fontSize: '12px', lineHeight: 1.6, color: '#FFF8EE', background: '#29231F', border: '1px solid #3A312A', borderRadius: '6px', padding: '10px' }}>
                        <strong>{emailKindLabel(row.kind)}</strong> · <span style={{ color: whatsappStatusColor(row.status) }}>{whatsappStatusLabel(row.status)}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px', whiteSpace: 'pre-line' }}>{row.body_text}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>Para: {row.to_phone} · Programado: {new Date(row.scheduled_at).toLocaleString('es-ES')}{row.sent_at ? ` · Enviado: ${new Date(row.sent_at).toLocaleString('es-ES')}` : ''}{row.delivered_at ? ` · Entregado: ${new Date(row.delivered_at).toLocaleString('es-ES')}` : ''}{row.attempts ? ` · Intentos: ${row.attempts}` : ''}</span>
                        {row.last_error && <span style={{ display: 'block', color: '#C0392B', marginTop: '4px' }}>{row.last_error}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {appointmentWhatsApp.length === 0 && !appointmentWhatsAppLoading && !appointmentWhatsAppError && validRecipientPhone(viewApptModal.phone) && <p style={{ color: '#D6CBB8', fontSize: '12px', margin: '10px 0 0' }}>Pulsa «Consultar estado» para ver los WhatsApp programados y enviados de esta cita.</p>}
                {appointmentWhatsApp.some(row => row.kind === 'confirmation' && (row.status === 'failed' || row.status === 'skipped') && (row.attempts ?? 0) < 5) && (
                  <button type="button" onClick={async () => {
                    const appointmentId = viewApptModal.serverId;
                    if (!appointmentId) { alert('Guarda la reserva primero para poder reintentar su confirmación.'); return; }
                    try {
                      const result = await studioApi.retryWhatsAppConfirmation(studioApi.currentToken()!, appointmentId);
                      alert(result.retried > 0 ? 'Confirmación reencolada y enviada de nuevo. Consulta el estado en unos segundos.' : 'No hay ninguna confirmación con error que se pueda reintentar.');
                      loadAppointmentWhatsApp();
                    } catch { alert('No se pudo reintentar la confirmación. Inténtalo de nuevo en unos segundos.'); }
                  }} style={{ marginTop: '10px', padding: '8px 12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Reintentar confirmación</button>
                )}
              </section>
            )}
            {!viewApptModal.completedAt && currentScreen === 'adminPanel' && (
              <section style={{ padding: '14px', background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#E4C687', fontSize: '14px', margin: 0 }}>Notificaciones push de la cita</h4>
                  <button type="button" onClick={loadAppointmentPushes} style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{appointmentPushesLoading ? 'Cargando…' : 'Consultar estado'}</button>
                </div>
                {appointmentPushesError && <p style={{ color: '#C0392B', fontSize: '12px', margin: '10px 0 0' }}>{appointmentPushesError}</p>}
                {appointmentPushes.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {appointmentPushes.map(row => (
                      <div key={row.id} style={{ fontSize: '12px', lineHeight: 1.6, color: '#FFF8EE', background: '#29231F', border: '1px solid #3A312A', borderRadius: '6px', padding: '10px' }}>
                        <strong>{pushKindLabel(row.kind)}</strong> · <span style={{ color: pushStatusColorAdmin(row.status) }}>{pushStatusLabelAdmin(row.status)}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>Dispositivo: {row.studio_push_subscriptions?.user_agent || '(sin datos)'} · Intentos: {row.attempts}</span>
                        <span style={{ display: 'block', color: '#D6CBB8', marginTop: '4px' }}>Programado: {new Date(row.created_at).toLocaleString('es-ES')}{row.delivered_at ? ` · Entregado: ${new Date(row.delivered_at).toLocaleString('es-ES')}` : ''}</span>
                        {row.last_error && <span style={{ display: 'block', color: '#C0392B', marginTop: '4px' }}>{row.last_error}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {appointmentPushes.length === 0 && !appointmentPushesLoading && !appointmentPushesError && <p style={{ color: '#D6CBB8', fontSize: '12px', margin: '10px 0 0' }}>Pulsa «Consultar estado» para ver los envíos push de esta cita.</p>}
              </section>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px', borderTop: '1px solid rgba(212, 175, 55, 0.2)', paddingTop: '12px' }}>
              <span style={{ color: '#E4C687', fontSize: '13px', fontWeight: 'bold' }}>Abrir mensaje de WhatsApp o copiar texto:</span>              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <a href={`https://wa.me/34${viewApptModal.phone.replace(/\s+/g, "")}?text=${encodeURIComponent(generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time))}`} target="_blank" rel="noreferrer" style={{ backgroundColor: '#8FC98F', color: '#2C5538', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  WhatsApp
                </a>
                <button type="button" onClick={() => {
                  const textoEmail = generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time);
                  navigator.clipboard.writeText(textoEmail);
                  alert('¡Texto del recordatorio copiado al portapapeletas!');
                }} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textAlign: 'center', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  Copiar Mensaje
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', marginTop: '10px' }}>
              <button disabled={deletingAppointmentId !== null} onClick={(e) => void handleDeleteAppointment(viewApptModal.id, e)} style={{ backgroundColor: '#F2DCD8', border: '1px solid #C0392B', color: '#8A2F23', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>{deletingAppointmentId === viewApptModal.id ? 'Eliminando…' : 'Eliminar cita'}</button>
              <button onClick={() => setViewApptModal(null)} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>)}
        </div>
      )}

      {/* MODAL MODIFICAR HORA DE CITA */}
      {rescheduleModalAppt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1100 }}>
          <div role="dialog" aria-modal="true" aria-label="Cambiar fecha u hora" style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '16px', padding: '25px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', maxWidth: '500px', width: '100%', boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ color: '#E4C687', fontSize: '24px', fontWeight: 'normal', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: 0 }}>{repeatAppointmentMode ? 'Repetir cita' : 'Cambiar fecha u hora'}</h3>
            <p style={{ color: '#D6CBB8', fontSize: '14px', margin: 0 }}>Clienta: <strong style={{ color: '#FFF8EE' }}>{rescheduleModalAppt.clientName}</strong></p>
            <div style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '9px', padding: '14px', color: '#D6CBB8', fontSize: '13px', lineHeight: 1.7 }}>
              {repeatAppointmentMode ? 'Cita de origen:' : 'Cita actual:'} {rescheduleModalAppt.dateKey.split('-').reverse().join('/')} · {rescheduleModalAppt.time}<br />
              Duración: {rescheduleModalAppt.durationMinutes || 45} min. {repeatAppointmentMode ? 'Se creará una nueva cita con estos servicios y variantes. La cita original se conserva.' : 'Los servicios se mantienen al cambiar la fecha.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#E4C687', fontSize: '14px', fontWeight: 'bold' }}>Nueva Fecha:</label>
              <input type="date" disabled={rescheduleSaving} value={newRescheduleDate} onChange={(e) => { setNewRescheduleDate(e.target.value); setNewRescheduleTime(''); setRescheduleError(''); }} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '16px', minHeight: 44 }} />
            </div>
            <section aria-label="Elegir nueva hora">
              <p style={{ color: '#E4C687', fontSize: 14, margin: '0 0 8px' }}>Elige un hueco para la duración completa</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, maxHeight: '32vh', overflowY: 'auto', padding: 3 }}>
                {Array.from({ length: Math.ceil(1440 / agendaStep) }, (_, index) => minuteTime(index * agendaStep))
                  .filter(time => /^\d{4}-\d{2}-\d{2}$/.test(newRescheduleDate) && (enableOutOfHours || isAgendaTimeWorking(new Date(newRescheduleDate + 'T12:00:00'), time, rescheduleModalAppt.durationMinutes || 45)))
                  .map(time => {
                    const unavailable = isDateBlockedByHoliday(newRescheduleDate) || timeBlockConflict(newRescheduleDate, time, rescheduleModalAppt.durationMinutes || 45) ||
                      (!!getRescheduleConflict(repeatAppointmentMode ? { ...rescheduleModalAppt, id: '' } : rescheduleModalAppt, newRescheduleDate, time) && !enableDoubleBooking);
                    const selected = newRescheduleTime === time;
                    return <button key={time} type="button" disabled={rescheduleSaving || unavailable} aria-pressed={selected} onClick={() => { setNewRescheduleTime(time); setRescheduleError(''); }}
                      style={{ minHeight: 52, borderRadius: 8, border: selected ? '2px solid #E4C687' : '1px solid #67543C', background: selected ? '#C49A58' : '#221D19', color: selected ? '#221D19' : '#FFF8EE', opacity: unavailable ? .4 : 1, cursor: unavailable ? 'not-allowed' : 'pointer' }}>
                      <strong>{time}</strong><small style={{ display: 'block', fontSize: 10, marginTop: 3 }}>{unavailable ? 'No disponible' : selected ? 'Seleccionada' : 'Libre'}</small>
                    </button>;
                  })}
              </div>
              <p style={{ color: '#D6CBB8', fontSize: 12 }}>Las horas atenuadas no admiten la duración completa. Se conservan los servicios de la cita.</p>
              {newRescheduleTime && <p style={{ color: '#E4C687', fontSize: 14 }}>Nueva cita: {newRescheduleDate.split('-').reverse().join('/')} · {newRescheduleTime}</p>}
              {rescheduleError && <p role="alert" style={{ color: '#FFB4A9', fontSize: 13 }}>{rescheduleError}</p>}
            </section>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" disabled={rescheduleSaving} onClick={() => setRescheduleModalAppt(null)} style={{ background: 'none', border: '1px solid #3A312A', color: '#D6CBB8', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" disabled={rescheduleSaving} onClick={async () => {
                if (rescheduleSavingRef.current) return;
                if (!repeatAppointmentMode && !isActiveAppointment(rescheduleModalAppt)) { alert('Esta cita está cancelada o no presentada. Crea una nueva reserva.'); return; }
                if (!/^\d{4}-\d{2}-\d{2}$/.test(newRescheduleDate) || !/^\d{2}:\d{2}$/.test(newRescheduleTime)) { alert('Elige una fecha y una hora válidas.'); return; }
                if (isDateBlockedByHoliday(newRescheduleDate)) { alert('Este día está bloqueado por vacaciones o festivo.'); return; }
                if (timeBlockConflict(newRescheduleDate, newRescheduleTime, rescheduleModalAppt.durationMinutes || 45)) { alert('La cita coincide con un periodo bloqueado.'); return; }
                const conflict = getRescheduleConflict(repeatAppointmentMode ? { ...rescheduleModalAppt, id: '' } : rescheduleModalAppt, newRescheduleDate, newRescheduleTime);
                if (conflict && !enableDoubleBooking) { alert('La duración completa de esta cita coincide con otra reserva. Elige otra hora.'); return; }
                const date = new Date(`${newRescheduleDate}T12:00:00`);
                if (!enableOutOfHours && !isAgendaTimeWorking(date, newRescheduleTime, rescheduleModalAppt.durationMinutes || 45)) {
                  alert('La duración completa de la cita debe caber en el horario laboral.'); return;
                }
                if (repeatAppointmentMode) {
                  if (new Date(newRescheduleDate + 'T' + newRescheduleTime + ':00').getTime() <= Date.now()) { alert('Elige una fecha y hora futuras para repetir la cita.'); return; }
                  const services = rescheduleModalAppt.services || [];
                  const error = getInactiveServiceError(services) || getStylingError(services) || getTonerError(services);
                  if (error) { alert(error); return; }
                  const repeated: Appointment = {
                    id: crypto.randomUUID(), dateKey: newRescheduleDate, time: newRescheduleTime,
                    dayName: date.toLocaleDateString('es-ES', { weekday: 'long' }),
                    clientName: rescheduleModalAppt.clientName, phone: rescheduleModalAppt.phone, email: rescheduleModalAppt.email,
                    durationMinutes: rescheduleModalAppt.durationMinutes, services,
                    selectedVariant: services[0]?.variant || null,
                    serviceCategory: Array.from(new Set(services.map(item => item.categoryName))).join(' + '),
                    serviceSubcategory: 'RESERVADO ' + services.map(item => bookingName(item.sub) + (item.variant ? ' (' + item.variant.name + ')' : '')).join(' + '),
                    remindersStatus: { email48h: false, whatsapp48h: false, whatsapp24h: false, whatsapp2h: false }
                  };
                  const reason = getApprovalReason(services, newRescheduleDate);
                  setRescheduleModalAppt(null); setRepeatAppointmentMode(false);
                  if (reason) {
                    repeated.saturdayApproval = { status: 'pending', reason, reference: 'REV-' + crypto.randomUUID().slice(0, 8).toUpperCase() };
                    repeated.serviceSubcategory = repeated.serviceSubcategory.replace(/^RESERVADO/, reason === 'saturday' ? 'PENDIENTE SÁBADO' : 'PENDIENTE VALORACIÓN');
                    setSaturdayRequestModal(repeated); return;
                  }
                  if (bizConfig.advancePaymentEnabled && (repeated.durationMinutes || 0) > bizConfig.advancePaymentThresholdMinutes) {
                    repeated.advancePayment = createAdvancePayment();
                    repeated.serviceSubcategory = repeated.serviceSubcategory.replace(/^RESERVADO/, 'PENDIENTE BIZUM');
                  }
                  setAppointments(previous => [...previous, repeated]); setFechaSeleccionada(date); setViewApptModal(repeated);
                  return;
                }
                rescheduleSavingRef.current = true; setRescheduleSaving(true); setRescheduleError('');
                try {
                  const token = studioApi.currentToken();
                  if (!studioApi.serverConfigured || !token) throw new Error('Necesitas conexión y una sesión válida para guardar el cambio.');
                  const source = rescheduleModalAppt;
                  const before = await studioApi.syncAll<{ appointments?: Record<string, any>[] }>(token, ['appointments']);
                  const row = before.appointments?.find(item => item.id === source.serverId || item.id === source.id || String(item.source_legacy_id || '') === source.id);
                  if (!row) throw new Error('No se ha encontrado la cita en el servidor. Actualiza la agenda antes de reintentar.');
                  const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
                  await studioApi.updateAppointmentOnServer(token, { id: row.id, dateKey: newRescheduleDate, time: newRescheduleTime, dayName, durationMinutes: source.durationMinutes || 45 });
                  let saved: Appointment = { ...source, serverId: row.id, dateKey: newRescheduleDate, time: newRescheduleTime, dayName };
                  try {
                    const after = await studioApi.syncAll<{ appointments?: Record<string, any>[] }>(token, ['appointments']);
                    const updatedRow = after.appointments?.find(item => item.id === row.id);
                    if (updatedRow) saved = mapServerAppointment(updatedRow);
                  } catch { /* The successful update already confirms persistence. */ }
                  setAppointments(previous => previous.map(item => item.id === source.id || item.serverId === row.id ? saved : item));
                  setFechaSeleccionada(date); setRescheduleModalAppt(null); setViewApptModal(saved);
                } catch (error) {
                  setRescheduleError(error instanceof Error ? error.message : 'No se ha podido guardar el cambio. Reintenta sin cerrar esta ventana.');
                } finally { rescheduleSavingRef.current = false; setRescheduleSaving(false); }

              }} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{rescheduleSaving ? 'Guardando…' : repeatAppointmentMode ? 'Crear nueva cita' : 'Guardar cambio'}</button>
            </div>
          </div>
        </div>
      )}
      {cancelApptModal && (
        <div role="dialog" aria-modal="true" aria-label="Cancelar cita" style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(28, 22, 18, 0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#221D19', border: '1px solid rgba(212, 175, 55, 0.45)', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#C99E52', fontSize: '24px', fontWeight: 'normal', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: 0 }}>Cancelar cita</h3>
            <div style={{ backgroundColor: 'rgba(255, 248, 238, 0.06)', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '9px', padding: '14px', color: '#FFF8EE', fontSize: '13px', lineHeight: 1.7 }}>
              {cancelApptModal.dateKey.split('-').reverse().join('/')} · {cancelApptModal.time}<br />
              <span style={{ color: '#D6CBB8' }}>{(cancelApptModal.services?.length ? cancelApptModal.services.map(item => bookingName(item.sub) + (item.variant ? ` (${item.variant.name})` : '')).join(' + ') : appointmentServiceNames(cancelApptModal))}</span>
            </div>
            {cancelApptModal.advancePayment?.status === 'pending' && (
              <p style={{ color: '#E4C687', fontSize: '12px', lineHeight: 1.6, margin: 0, background: 'rgba(201, 158, 82, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px', padding: '10px 12px' }}>
                Esta cita tiene un anticipo pendiente de {cancelApptModal.advancePayment.amount} € (ref. {cancelApptModal.advancePayment.reference}). Al cancelar, la reserva queda liberada; el tratamiento del anticipo se ajusta a la política de reservas del Studio y lo revisa Ana. No se aplica ningún reembolso automático.
              </p>
            )}
            <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>La cita pasará a “Cancelada” en tu historial y se liberará el hueco en la agenda del Studio. Los recordatorios programados quedan anulados.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '4px' }}>
              <button type="button" onClick={() => setCancelApptModal(null)} style={{ background: 'none', border: '1px solid rgba(212, 175, 55, 0.4)', color: '#FFF8EE', padding: '12px 16px', minHeight: '44px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Mantener mi cita</button>
              <button type="button" onClick={() => handleConfirmCancelAppointment(cancelApptModal)} style={{ background: '#9B3C2D', border: 'none', color: '#FFF8EE', padding: '12px 16px', minHeight: '44px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Confirmar cancelación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
