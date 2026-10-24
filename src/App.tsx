import React, { useState, useEffect, useRef } from 'react';
import { Home, Scissors, CalendarDays, User, LogOut, BookOpen, ArrowRight, ArrowLeft, UserRoundSearch, Sparkles, Info, ChevronLeft, ChevronRight, ChevronDown, ImagePlus, Trash2, Globe, MapPin, MessageCircle, Clock3, Instagram, Facebook, Music2 } from 'lucide-react';
import './catalog.css';
import * as studioApi from './studioApi';

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
type StudioEmployee = { id: string; name: string; role: string; photo: string; status: 'active' | 'future' | 'inactive' };

interface BusinessConfig {
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
Object.assign(TRANSLATIONS["es"], {"careIntro": "Tu espacio de cuidado capilar. Cada visita, pensada para ti.", "experienceStart": "Tu próxima experiencia empieza aquí.", "noUpcoming": "Aún no tienes una cita próxima. Descubre nuestros servicios y encuentra el cuidado que necesita tu cabello.", "passportIntro": "Aquí encontrarás tu diagnóstico, tus cuidados y la evolución de tu cabello.", "emptyDna": "En tu próxima visita, Ana podrá registrar aquí el diagnóstico de tu cabello.", "emptyCare": "Ana añadirá aquí los productos y las pautas de cuidado recomendados para ti.", "emptyVisits": "Tu historia en el Studio empieza aquí. Cuando registremos tu primera visita, aparecerá en este apartado.", "maintenanceNote": "Es una recomendación de mantenimiento. Para reservar, elige tus servicios y una hora disponible."});
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

interface ServiceVariant {
  description?: string;
  translations?: Record<string, { name?: string }>; 
  id: string;
  name: string;
  price: string;
  duration: string;
}

interface Appointment {
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

type StylingPolicy = 'included' | 'required' | 'optional' | 'not_applicable';
type FinishKind = 'styling' | 'toner';
const FINISH_COPY: Record<StylingPolicy, string> = {
  included: 'Forma parte del precio y del tiempo del servicio. No se cobra de nuevo.',
  required: 'La clienta debe elegir un complemento compatible. Se suman su precio y duración.',
  optional: 'La clienta puede añadirlo o continuar sin él. Si lo añade, se suman precio y duración.',
  not_applicable: 'Este servicio no necesita este complemento. No impide reservarlo con otros servicios.'
};

type ServiceTranslation = Partial<Pick<SubService, 'name' | 'slogan' | 'description' | 'includesText' | 'achievedText' | 'forWhomText' | 'alertText'>>;

interface SubService {
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
  priceType?: 'desde' | 'aprox' | 'fijo' | 'consultar';
  hasVariants?: boolean;
  variants?: ServiceVariant[];
  showAlertBadge?: boolean;
  alertText?: string;
}

interface CatalogCategory {
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

interface ClientRecord {
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

interface LostDemandRecord {
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

interface FeedbackRecord {
  id: string;
  date: string;
  clientName: string;
  rating: number;
  comment: string;
  type: 'detractor' | 'neutral' | 'promoter';
  serverStored?: boolean;
  resolvedAt?: string;
}

interface HolidayBlock {
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
    title: safeText(category.title), slogan: safeText(category.slogan),
    subservices: (Array.isArray(category.subservices) ? category.subservices : [])
      .filter((sub: any) => sub && typeof sub === 'object').map((sub: any) => ({
        ...sub, id: safeText(sub.id), name: safeText(sub.name),
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
    void statusWithTimeout(studioApi.fetchPublicCatalog<{ employees?: StudioEmployee[] }>())
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
    const submitted = structuredClone(catalog);
    setCatalogSavedMsg('Guardando catálogo…');
    try {
      const token = studioApi.currentToken();
      if (!studioApi.serverConfigured || !token || studioApi.storedRole() !== 'admin') {
        throw new Error('Necesitas una sesión de administración y conexión con el servidor para guardar el catálogo.');
      }
      await studioApi.pushCatalog(token, submitted);
      const verify = await studioApi.syncAll<{ catalog?: { category?: CatalogCategory }[] }>(token);
      const categories = verify?.catalog?.map(row => row.category).filter(Boolean) as CatalogCategory[] | undefined;
      if (!categories || submitted.some(category => {
        const stored = categories.find(item => item.id === category.id);
        const keys = ['imageUrl', 'imageIsAiPlaceholder', 'includesText', 'achievedText', 'forWhomText', 'slogan', 'tonerPolicy', 'stylingPolicy', 'tonerAllowedIds', 'stylingAllowedIds', 'tonerMessage', 'stylingMessage', 'allowCutGo', 'isCutGoService', 'isStylingService', 'isTonerService', 'requiresAssessment'] as const;
        return !stored || (stored.slogan || '') !== (category.slogan || '') || (stored.imageUrl || '') !== (category.imageUrl || '') || category.subservices.some(service => {
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
  const saveClientDetails = (event: React.FormEvent) => {
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
    setListaClientes(previous => previous.map(client => client.idNum === original.idNum ? updated : client));
    if (oldEmail) setAppointments(previous => previous.map(appointment => normalizeEmail(appointment.email) === oldEmail ? {
      ...appointment, email: updated.email, phone: updated.telefono, clientName: (updated.nombre + ' ' + updated.apellidos).trim()
    } : appointment));
    setBusquedaCliente(updated.registroId || updated.email); setClientDetailsDraft(null);
    alert('Datos guardados y citas vinculadas actualizadas.');
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
  const registerSaturdayRequest = () => {
    if (!saturdayRequestModal) return;
    setAppointments(previous => previous.some(item => item.id === saturdayRequestModal.id) ? previous : [...previous, saturdayRequestModal]);
    setBookingSuccessMsg(t('requestSaved'));
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
    setBookingSuccessMsg(tf('paymentSaved', {amount: advancePaymentModal.advancePayment?.amount, reference: advancePaymentModal.advancePayment?.reference}));
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

  const getSelectionTotal = (items: { sub: SubService; variant: ServiceVariant | null }[]) => {
    let total = 0;
    let orientative = false;
    for (const item of items) {
      const price = String(item.variant?.price || item.sub.price || '');
      const value = parseFloat(price.replace(/\./g, '').replace(',', '.').match(/\d+(\.\d+)?/)?.[0] || '');
      if (!Number.isFinite(value)) { orientative = true; continue; }
      if (/consultar|desde|aprox/i.test(price) || (item.sub.priceType && item.sub.priceType !== 'fijo')) orientative = true;
      total += value;
    }
    return { total, orientative };
  };

  const [viewApptModal, setViewApptModal] = useState<Appointment | null>(null);
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
  const [pushNeedsLogin, setPushNeedsLogin] = useState(false);
  const [pushLoginPin, setPushLoginPin] = useState('');
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushTestResult, setPushTestResult] = useState<string | null>(null);
  const refreshPushStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setPushStatus('unsupported'); return; }
    if (Notification.permission === 'denied') { setPushStatus('denied'); return; }
    try {
      const registration = await navigator.serviceWorker.ready;
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
      await navigator.serviceWorker.ready;
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
      dateKey: iso.slice(0, 10),
      dayName: snap.dayName || '',
      time: iso.slice(11, 16),
      durationMinutes: row.duration_minutes ?? 45,
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
    };
    if (row.lifecycle_status) appointment.lifecycleStatus = row.lifecycle_status as Appointment['lifecycleStatus'];
    if (row.approval_status) appointment.saturdayApproval = { status: row.approval_status, reason: row.approval_reason, reference: row.approval_reference || '' } as Appointment['saturdayApproval'];
    if (row.deposit_status) appointment.advancePayment = { status: row.deposit_status, amount: Number(row.deposit_amount) || 0, reference: row.deposit_reference || '' } as Appointment['advancePayment'];
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
      const before = await studioApi.syncAll<Record<string, any>>(token);
      if (!before?.settings || typeof before.settings !== 'object') throw new Error('No se pudo leer la configuración del servidor.');
      const toSave = { ...bizConfigRef.current, ...before.settings } as BusinessConfig;
      for (const key of changedKeys) (toSave as any)[key] = normalizedConfig[key];
      await studioApi.pushSettings(token, toSave);
      const verify = await studioApi.syncAll<Record<string, any>>(token);
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
  const finishPolicy = (sub: SubService, kind: FinishKind) => kind === 'styling' ? sub.stylingPolicy : sub.tonerPolicy;
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
      if (!candidates.length) return `Ana debe configurar las opciones de ${label} para «${item.sub.name}». Contacta con el estudio antes de reservar.`;
      if (!current.some(selected => candidates.some(c => c.id === selected.sub.id)))
        return `Completa «${item.sub.name}»: selecciona ${label === 'peinado' && item.sub.allowCutGo ? 'peinado o Cut & Go compatible' : 'un ' + label + ' compatible'} antes de elegir fecha y hora.`;
    }
    for (const item of current.filter(i => isFinish(i.sub, kind))) {
      const duration = item.variant?.duration || item.sub.duration;
      if (!/\d/.test(duration || '') || parseFloat(duration) <= 0) return `Ana debe configurar una duración válida para «${item.sub.name}» antes de reservar.`;
      if (item.sub.hasVariants && item.sub.variants?.length && (!item.variant || !item.sub.variants.some(v => v.id === item.variant?.id)))
        return `Selecciona el largo o variante de «${item.sub.name}».`;
      if (item.sub.isCutGoService && !current.some(parent => !parent.sub.isStylingService && parent.sub.allowCutGo && finishCandidates(parent.sub, 'styling').some(c => c.id === item.sub.id)))
        return 'Cut & Go debe acompañar a un servicio que permita esta modalidad.';
      const owners = current.filter(i => !isFinish(i.sub, kind));
      const relevant = owners.filter(i => finishPolicy(i.sub, kind) === 'required' || finishPolicy(i.sub, kind) === 'optional');
      if (relevant.length && !relevant.some(owner => finishCandidates(owner.sub, kind).some(c => c.id === item.sub.id)))
        return `«${item.sub.name}» no es un complemento compatible con los servicios elegidos.`;
      if (owners.length && !relevant.length && owners.every(i => finishPolicy(i.sub, kind) === 'included'))
        return `El ${label} ya está incluido en los servicios elegidos. Retira el complemento adicional para evitar duplicarlo.`;
    }
    return null;
  };
  const getStylingError = (items: { sub: SubService; variant: ServiceVariant | null }[]) => getFinishError(items, 'styling');
  const previewService = catalog.flatMap(category => category.subservices).find(sub => sub.id === previewServiceId);
  const getInactiveServiceError = (items: { sub: SubService }[]) => {
    const unavailable = items.filter(item => {
      const current = catalog.flatMap(category => category.subservices).find(sub => sub.id === item.sub.id);
      return !current || current.active === false;
    });
    return unavailable.length ? `Estos servicios ya no están disponibles para nuevas reservas: ${unavailable.map(item => item.sub.name).join(', ')}. Retíralos y selecciona otra opción.` : null;
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
  const renderFinishChoices = (items: { sub: SubService; variant: ServiceVariant | null }[]) => <>
    {items.map(item => latestSub(item.sub)).map(owner => (['styling', 'toner'] as const).map(kind => {
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
              const selected = items.some(i => i.sub.id === sub.id && (i.variant?.id || '') === (variant?.id || ''));
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
  const categoryText = (category: CatalogCategory) => {
    const custom = category.translations?.[currentLang]?.title?.trim();
    if (custom) return custom;
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
  const portalSearchQuery = portalSearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  const [portalSearchExpanded, setPortalSearchExpanded] = useState<Record<string, boolean>>({});
  const portalServiceMatches = (category: CatalogCategory, service: SubService) => {
    if (service.active === false) return false;
    if (!portalSearchQuery) return true;
    const text = [categoryText(category), category.title, serviceText(service, 'name'), service.name, serviceText(service, 'description'), service.description, ...(service.variants || []).map(variant => variantText(variant, service))].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    return text.includes(portalSearchQuery);
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
    const selection = selectedServicesToBook.find(item => item.sub.id === sub.id);
    const isSelected = !!selection;
    const isCompactService = !!sub.isTonerService || !!sub.isStylingService;
    if (isCompactService) {
      return (
        <article key={sub.id} id={`portal-service-${sub.id}`} className="studio-service-card studio-service-card-compact">
          <div className="studio-service-card-body">
            <div className="studio-service-card-head">
              <h3 className="studio-service-card-title">{serviceText(sub, 'name') || sub.name}</h3>
              <p className="studio-service-card-meta"><span>{sub.duration}</span>{portalShowsPrices && <strong>{sub.price}</strong>}</p>
            </div>
            <div className="studio-service-card-actions">
              <button type="button" aria-pressed={isSelected} onClick={() => {
                setSelectedServicesToBook(previous => isSelected ? previous.filter(item => item.sub.id !== sub.id) : [...previous, { sub, variant: null }]);
              }} className={isSelected ? 'studio-btn-gold studio-btn-gold-active' : 'studio-btn-gold'}>{isSelected ? t('selectedRemove') : t('addAppointment')}</button>
              <button type="button" onClick={() => { setViewServiceDetail({ cat, sub }); setCurrentScreen('serviceDetail'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="studio-btn-ghost">{t('viewService')}</button>
            </div>
          </div>
        </article>
      );
    }
    return (
      <article key={sub.id} id={`portal-service-${sub.id}`} className="lst-card" style={{ boxShadow: '0 6px 18px rgba(60, 50, 40, 0.05)' }}>
        {(serviceImage
          ? <button type="button" style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }} onClick={() => setLightboxImage(serviceImage)} aria-label="Ampliar imagen"><img className="lst-card-media" style={{ objectPosition: `${sub.imagePosition?.x ?? 50}% ${sub.imagePosition?.y ?? 50}%` }} src={serviceImage} alt={serviceText(sub, 'name') || sub.name} loading="lazy" />{sub.imageIsAiPlaceholder && <span className="lst-ai-tag">Imagen ilustrativa</span>}</button>
          : <div className="studio-service-media studio-service-media-empty" aria-hidden="true"><span>LS</span><small>{bizConfig.name}</small></div>)}
        <div className="lst-card-footer">
          <div style={{ minWidth: 0 }}>
            <strong>{serviceText(sub, 'name') || sub.name}</strong>
            {!!serviceText(sub, 'slogan').trim() && <span>{serviceText(sub, 'slogan')}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => { setViewServiceDetail({ cat, sub }); setCurrentScreen('serviceDetail'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="lst-btn-ver">
              {t('viewService')} <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            </button>
            <button type="button" aria-pressed={isSelected} aria-label={isSelected ? t('selectedRemove') : t('addAppointment')} onClick={() => {
              setSelectedServicesToBook(previous => isSelected ? previous.filter(item => item.sub.id !== sub.id) : [...previous, { sub, variant: null }]);
            }} style={{ width: 38, height: 38, minWidth: 38, borderRadius: '50%', border: isSelected ? 'none' : '1px solid #C99E52', background: isSelected ? 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)' : 'transparent', color: isSelected ? '#29231F' : '#8F6D24', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
              {isSelected ? '✓' : '+'}
            </button>
          </div>
        </div>
      </article>
    );
  };

  const handleSaveModalAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClientName.trim()) return;
    if (quickClientMode) { alert('Crea primero la ficha con «Crear ficha y continuar» o cancela el alta.'); return; }
    if (editingAppointment && !modalServices.length) { alert('Añade al menos un servicio a la cita.'); return; }
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
            return studioApi.syncAll<Record<string, any>>(studioApi.currentToken()!).then(data => {
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
    setAppointments([...appointments, newApp]);
    setIsModalOpen(false);
    if (studioApi.serverConfigured && studioApi.storedRole() === 'admin') {
      studioApi.createAppointmentOnServer(studioApi.currentToken()!, {
        id: newApp.id,
        dateKey: newApp.dateKey,
        time: newApp.time,
        dayName: newApp.dayName,
        durationMinutes: newApp.durationMinutes,
        bookingChannel: 'admin',
        services: newApp.services,
        clientName: newApp.clientName,
        phone: newApp.phone,
        email: newApp.email,
        serviceCategory: newApp.serviceCategory,
        serviceSubcategory: newApp.serviceSubcategory,
        selectedVariant: newApp.selectedVariant,
        remindersStatus: newApp.remindersStatus,
        professionalId: newApp.professionalId ?? null,
        professionalName: newApp.professionalName ?? null,
      }).then(serverResult => {
        const synced: Appointment = { ...newApp, serverId: serverResult.id };
        setAppointments(previous => previous.map(item => item.id === synced.id ? synced : item));
        if (viewApptModal?.id === synced.id) setViewApptModal(synced);
      }).catch(() => undefined);
    }
    const cleanPhone = (modalPhone || '600000000').replace(/\s+/g, "");
    const customMsg = generateWhatsAppMessage(modalClientName, dateFormattedStr, targetTime);


  };

  const handleConfirmarCitaVisual = () => {
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
    if (!selectedVisualTime || !portalAvailableTimes(bookingDate).includes(selectedVisualTime)) { alert(t('fullTimeRequired')); return; }
    const inactiveError = getInactiveServiceError(selectedServicesToBook);
    if (inactiveError) { alert(inactiveError); setCurrentScreen('catalogBooking'); return; }
    const stylingError = getStylingError(selectedServicesToBook);
    if (stylingError) { alert(stylingError); setCurrentScreen('catalogBooking'); return; }
    const tonerError = getTonerError(selectedServicesToBook);
    if (tonerError) { alert(tonerError); setCurrentScreen('catalogBooking'); return; }
    const dateKeyStr = formatDateKey(bookingDate);
    if (isDateBlockedByHoliday(dateKeyStr)) {
      alert(t('salonClosed'));
      return;
    }
    for (const item of selectedServicesToBook) {
      if (item.sub.hasVariants && item.sub.variants && item.sub.variants.length > 0 && !item.variant) {
        alert(tf('requiredVariant', {service: item.sub.name}));
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
      bookingChannel: 'portal',
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
    setAppointments([...appointments, newApp]);
    setBookingSuccessMsg(tf('bookingConfirmed', {date: bookingDate.toLocaleDateString(portalLocale), time: selectedVisualTime}));
    if (studioApi.serverConfigured) {
      const clientPinRow = listaClientes.find(c => String(c.pinAcceso).trim() === pin);
      studioApi.createAppointmentOnServer(studioApi.currentToken()!, {
        id: newApp.id,
        clientId: currentClientRecord?.serverId || studioApi.storedClientId() || null,
        dateKey: newApp.dateKey,
        time: newApp.time,
        dayName: newApp.dayName,
        durationMinutes: newApp.durationMinutes,
        bookingChannel: 'portal',
        approval: newApp.saturdayApproval ? { status: newApp.saturdayApproval.status, reason: newApp.saturdayApproval.reason, reference: newApp.saturdayApproval.reference } : null,
        advancePayment: newApp.advancePayment ? { status: newApp.advancePayment.status, amount: newApp.advancePayment.amount, reference: newApp.advancePayment.reference } : null,
        services: newApp.services,
        clientName: newApp.clientName,
        phone: newApp.phone,
        email: newApp.email,
        serviceCategory: newApp.serviceCategory,
        serviceSubcategory: newApp.serviceSubcategory,
        selectedVariant: newApp.selectedVariant,
        remindersStatus: newApp.remindersStatus,
        professionalId: newApp.professionalId,
        professionalName: newApp.professionalName,
      }).then(serverResult => {
        const synced: Appointment = { ...newApp, serverId: serverResult.id };
        setAppointments(previous => previous.map(item => item.id === synced.id ? synced : item));
      }).catch(() => {
        setBookingSuccessMsg('Cita registrada en este dispositivo, pero no se pudo confirmar en el servidor. Contacta con el estudio si no la ves reflejada.');
      });
    }
    setSelectedServicesToBook([]);
    setCurrentScreen('catalogBooking');
    const cleanPhone = clientPhoneStr.replace(/\s+/g, "");
    const customMsg = generateWhatsAppMessage(clientNameStr, dateFormattedStr, selectedVisualTime);

    setTimeout(() => setBookingSuccessMsg(null), 5000);
  };

  const handleDeleteAppointment = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('¿Deseas cancelar esta cita de la agenda?')) {
      const target = appointments.find(a => a.id === id);
      setAppointments(appointments.filter(a => a.id !== id));
      if (viewApptModal?.id === id) setViewApptModal(null);
      if (studioApi.serverConfigured && (target?.serverId || studioApi.storedRole() === 'admin')) {
        studioApi.deleteAppointmentOnServer(studioApi.currentToken()!, target?.serverId || id).catch(() => undefined);
      }
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
    setReservationPolicyOpen(false);
    setReservationPolicyChecked(false);
    setSelectedVisualTime('');
    setCurrentScreen('catalogBooking');
  };

  const portalWeekStart = new Date(bookingDate);
  portalWeekStart.setDate(bookingDate.getDate() - ((bookingDate.getDay() + 6) % 7));
  const portalWeekDays = Array.from({ length: 7 }, (_, index) => { const day = new Date(portalWeekStart); day.setDate(day.getDate() + index); return day; });
  const portalTimes = portalAvailableTimes(bookingDate);
  useEffect(() => {
    if (!['catalogBooking', 'visualAgenda'].includes(currentScreen) || !currentClientRecord || !selectedServicesToBook.length) return;
    const email = currentClientRecord.email.trim().toLowerCase();
    const services = selectedServicesToBook.map(item => item.sub.name + (item.variant ? ` (${item.variant.name})` : '')).join(' + ');
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
    const serviceName = selectedServicesToBook.map(item => item.sub.name + (item.variant ? ` (${item.variant.name})` : '')).join(' + ');
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
    const service = appointment.services?.length ? appointment.services.map(item => item.sub.name + (item.variant ? ` (${item.variant.name})` : '')).join(' + ') : appointment.serviceSubcategory.replace(/^RESERVADO\s*/, '');
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
  const adminAppointmentColor = (appointment: Appointment) => appointment.completedAt ? { background: '#322A25', border: '#B8972E' } : appointment.saturdayApproval?.status === 'pending'
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
            ? item.services.map(service => service.sub.name).join(' + ')
            : item.serviceSubcategory.replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, '');
          return <button type="button" className="studio-agenda-appointment" key={item.id} draggable onDragStart={event => handleDragStart(event, item.id)}
            onClick={() => setViewApptModal(item)} onDragOver={handleDragOver}
            onDrop={event => { event.stopPropagation(); handleDrop(event, day.dateObj, day.name, item.time); }}
            title={item.clientName + ' · ' + item.time + '–' + minuteTime(end) + ' · ' + serviceLabel}
            style={{ gridRow: (row + 2) + ' / span ' + span, gridColumn: column + 2, zIndex: 2,
              marginLeft: (lane * 100 / lanes) + '%', width: (100 / lanes) + '%', boxSizing: 'border-box',
              alignSelf: 'stretch', minWidth: 0, textAlign: 'left', padding: '7px 8px',
              background: adminAppointmentColor(item).background, border: '1px solid #3A312A', borderLeft: '3px solid ' + adminAppointmentColor(item).border,
              color: '#FFF8EE', borderRadius: '5px', cursor: 'pointer', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '3px' }}>
            <strong style={{ fontSize: '10px', letterSpacing: '0.3px', color: '#D6CBB8' }}>{item.time}–{minuteTime(end)}</strong>
            <strong style={{ color: '#FFF8EE', fontSize: '13px', lineHeight: 1.25, overflowWrap: 'anywhere' }}>{item.clientName}</strong>
            <span style={{ fontSize: '11px', lineHeight: 1.3, color: '#EFE5D4', overflowWrap: 'anywhere' }}>{serviceLabel}</span>
          </button>;
        });
      })}
    </div>;
  };

  return (
    <div lang={currentScreen === 'adminPanel' || currentScreen === 'adminLogin' ? 'es' : currentLang} dir={currentLang === 'ar' && currentScreen !== 'adminPanel' && currentScreen !== 'adminLogin' ? 'rtl' : 'ltr'} style={{ backgroundColor: '#29231F', color: '#FFF8EE', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: "'Garet', 'Poppins', sans-serif", margin: 0, padding: '20px 20px 96px', position: 'relative' }}>
      
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
        .lst-bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: #221D19; border-top: 1px solid rgba(255, 248, 238, 0.08); display: flex; justify-content: space-around; padding: 6px 8px calc(10px + env(safe-area-inset-bottom)); max-width: 640px; margin: 0 auto; }
        .lst-bottom-nav button { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; color: #C9BCA9; font-size: 11px; cursor: pointer; padding: 6px 0; }
        .lst-bottom-nav button.lst-bottom-active { color: #C49A58; }
        .lst-bottom-nav button:hover { color: #E4C687; }
        .lst-detail-eyebrow { color: #D8C29A; font-size: 11px; letter-spacing: 1.5px; }
        .lst-detail-title { font-family: 'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif; letter-spacing: 0.02em; font-size: 30px; font-weight: 400; color: #FFF8EE; margin: 6px 0 0; }
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
        .lst-c-meta { color: #E4C687; font-size: 13px; font-weight: 600; margin: 0; }
        .lst-c-cta { margin-top: auto; justify-content: center; }
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
          <button type="button" className="lst-app-header-btn" onClick={() => { setPin(""); setLangMenuOpen(false); setCurrentScreen('clientPin'); }} aria-label={t('logout')} style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, background: '#221D19', border: '1px solid rgba(212, 175, 55, 0.4)', color: '#E4C687' }}>
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
        <nav className="lst-bottom-nav" aria-label="Navegación principal">
          <button type="button" className={currentScreen === 'clientPortal' ? 'lst-bottom-active' : ''} onClick={() => { setViewServiceDetail(null); setCurrentScreen('clientPortal'); }}>
            <Home size={20} strokeWidth={1.7} aria-hidden="true" /><span>Inicio</span>
          </button>
          <button type="button" className={currentScreen === 'catalogBooking' || currentScreen === 'categoryScreen' || currentScreen === 'serviceDetail' ? 'lst-bottom-active' : ''} onClick={() => { setViewServiceDetail(null); setCurrentScreen('catalogBooking'); }}>
            <Scissors size={20} strokeWidth={1.7} aria-hidden="true" /><span>Servicios</span>
          </button>
          <button type="button" className={currentScreen === 'myAppointmentsPage' ? 'lst-bottom-active' : ''} onClick={() => { setViewServiceDetail(null); setCurrentScreen('myAppointmentsPage'); }}>
            <CalendarDays size={20} strokeWidth={1.7} aria-hidden="true" /><span>Mis citas</span>
          </button>
          <button type="button" className={currentScreen === 'clientHistoryPage' ? 'lst-bottom-active' : ''} onClick={() => setCurrentScreen('clientHistoryPage')}>
            <User size={20} strokeWidth={1.7} aria-hidden="true" /><span>Perfil</span>
          </button>
        </nav>
      )}

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
            <img src={brandLogoSrc} onError={fallbackBrandLogo} decoding="async" alt="L’A · Hair Experience" draggable={false} style={{ width: '210px', height: 'auto', objectFit: 'contain', display: 'block', mixBlendMode: 'screen' }} />
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
          <img src={brandLogoSrc} onError={fallbackBrandLogo} decoding="async" alt="L’A · Hair Experience" style={{ width: '150px', height: 'auto', mixBlendMode: 'screen', display: 'block', margin: '0 auto 12px' }} />
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
            <button type="submit" style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '14px', minHeight: '48px', borderRadius: '3px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' }}>
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
            <button className="lst-app-header-btn" onClick={() => { setPin(""); setCurrentScreen('clientPin'); }} aria-label={t('logout')}>
              <LogOut size={20} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
          {bizConfig.homeHeroImage && (
            <figure style={{ margin: 0, borderRadius: '18px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)', lineHeight: 0 }}>
              <img
                src={bizConfig.homeHeroImage}
                alt="Interior de L’Studio Ana"
                style={{ width: '100%', height: 'min(58vw, 340px)', objectFit: 'cover', objectPosition: `${bizConfig.homeHeroImagePosition?.x ?? 50}% ${bizConfig.homeHeroImagePosition?.y ?? 62}%`, display: 'block' }}
              />
            </figure>
          )}
          <div style={{ padding: '6px 0 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ color: '#FFF8EE', fontSize: '30px', lineHeight: 1.2, fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.04em', margin: 0 }}>Tu cabello, tu esencia</p>
            <p style={{ color: '#D6CBB8', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{t('hello')}, {currentClientRecord?.nombre || t('welcome')}. {t('careIntro')}</p>
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
            ¿No sabes qué servicio elegir? <a href={`https://wa.me/34${(bizConfig.studioWhatsapp || bizConfig.phone).replace(/\s+/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#FFF8EE' }}>{t('guidance')}</a>
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
          <section aria-label="Detalle de tus citas" style={{ background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: '#E4C687', fontSize: '11px', letterSpacing: '1px' }}>TU PRÓXIMA CITA</span>
              <span style={{ backgroundColor: 'rgba(255, 248, 238, 0.08)', color: '#D6CBB8', fontSize: '10px', padding: '3px 9px', borderRadius: '20px' }}>{clientAppointmentStatus}</span>
            </div>
            {clientNextAppointment ? <>
              <div style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontSize: '19px', lineHeight: 1.35 }}>
                {new Date(`${clientNextAppointment.dateKey}T12:00:00`).toLocaleDateString(portalLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
                <span style={{ color: '#E4C687' }}> · {clientNextAppointment.time}</span>
              </div>
              <p style={{ color: '#D6CBB8', margin: 0, lineHeight: 1.5, fontSize: '13px', overflowWrap: 'anywhere' }}>{clientNextAppointment.serviceSubcategory.replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, '')}</p>
              <p style={{ color: '#D6CBB8', margin: 0, fontSize: '12px' }}>Estilista: Ana · L’Studio Ana — Hair Experience</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingTop: '2px' }}>
                <button type="button" onClick={() => { setRepeatAppointmentMode(false); setRescheduleModalAppt(clientNextAppointment); setNewRescheduleTime(clientNextAppointment.time); setNewRescheduleDate(clientNextAppointment.dateKey); }} style={{ background: 'transparent', border: '1px solid rgba(255, 248, 238, 0.16)', color: '#E4C687', minHeight: '44px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>{t('changeDate')}</button>
                <button type="button" onClick={() => setCancelApptModal(clientNextAppointment)} style={{ background: 'transparent', border: '1px solid rgba(155, 60, 45, 0.45)', color: '#9B3C2D', minHeight: '44px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Cancelar cita</button>
                <a href={`https://wa.me/34${(bizConfig.studioWhatsapp || bizConfig.phone).replace(/\s+/g, '')}?text=${encodeURIComponent(`Hola Ana, quiero consultar mi cita del ${clientNextAppointment.dateKey.split('-').reverse().join('/')} a las ${clientNextAppointment.time}.`)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', color: '#E4C687', padding: '10px 0', minHeight: '44px', fontSize: '12px' }}>{t('askAppointment')}</a>
              </div>
            </> : <>
              <p style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontSize: '17px', margin: 0 }}>{t('experienceStart')}</p>
              <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>{t('noUpcoming')}</p>
            </>}
          </section>
          {clientUpcomingAppointments.length > 1 && (
            <section aria-label="Otras citas próximas" style={{ background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ color: '#E4C687', fontSize: '11px', letterSpacing: '1px' }}>OTRAS CITAS PRÓXIMAS ({clientUpcomingAppointments.length - 1})</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {clientUpcomingAppointments.slice(1).map(appointment => <article key={appointment.id} style={{ background: 'rgba(255, 255, 255, 0.55)', border: '1px solid rgba(255, 248, 238, 0.14)', borderRadius: '8px', padding: '10px' }}>
                  <strong style={{ fontSize: '12px' }}>{new Date(`${appointment.dateKey}T12:00:00`).toLocaleDateString(portalLocale, { weekday: 'long', day: 'numeric', month: 'long' })} · {appointment.time}</strong>
                  <p style={{ color: '#D6CBB8', fontSize: '11px', margin: '4px 0 8px', overflowWrap: 'anywhere' }}>{appointment.serviceSubcategory.replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, '')}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button type="button" onClick={() => { setRepeatAppointmentMode(false); setRescheduleModalAppt(appointment); setNewRescheduleTime(appointment.time); setNewRescheduleDate(appointment.dateKey); }} style={{ background: 'transparent', border: '1px solid rgba(255, 248, 238, 0.16)', color: '#E4C687', minHeight: '40px', padding: '6px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '11px' }}>{t('changeDate')}</button>
                    <button type="button" onClick={() => setCancelApptModal(appointment)} style={{ background: 'transparent', border: '1px solid rgba(155, 60, 45, 0.45)', color: '#9B3C2D', minHeight: '40px', padding: '6px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Cancelar cita</button>
                  </div>
                </article>)}
              </div>
            </section>
          )}
          <section aria-label="Reservar otra cita" style={{ background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.03em', fontSize: '17px', fontWeight: 'normal', margin: 0 }}>Reserva tu cita</h3>
            <p style={{ color: '#D6CBB8', fontSize: '12px', margin: '2px 0 0', lineHeight: 1.5 }}>Elige tus servicios y tu momento en el Studio.</p>
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
          <details style={{ background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: 12, padding: '8px 12px' }}>
            <summary style={{ cursor: 'pointer', color: '#FFF8EE', fontSize: '14px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              {t('advisorTitle')}
              <ChevronDown size={16} strokeWidth={1.7} aria-hidden="true" style={{ flexShrink: 0, color: '#E4C687' }} />
            </summary>
            <p style={{ color: '#D6CBB8', fontSize: '11px', lineHeight: 1.4, margin: '8px 0' }}>{t('advisorIntro')}</p>
            <form onSubmit={handleRunAiRecommendation} style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <textarea aria-label={t('advisorTitle')} value={clientWishText} onChange={event => { setClientWishText(event.target.value); setAiRecommendation(null); }} placeholder={t('advisorPlaceholder')} rows={1} style={{ flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box', background: '#3E342C', border: '1px solid rgba(255, 248, 238, 0.18)', color: '#FFF8EE', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', lineHeight: 1.5, minHeight: '36px', resize: 'none' }} />
              <button type="submit" disabled={!clientWishText.trim()} style={{ minHeight: '36px', padding: '8px 14px', background: '#C49A58', color: '#29231F', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', opacity: clientWishText.trim() ? 1 : 0.5 }}>{t('advisorButton')}</button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontSize: '20px', fontWeight: 400, margin: '4px 0 2px' }}>Elige una categoría</h2>
            {catalog.map(cat => {
                const count = cat.subservices.filter(sub => sub.active !== false).length;
                const firstService = cat.subservices.find(sub => sub.active !== false);
                return (
                  <button key={cat.id} type="button" className="lst-cat-card" onClick={() => { setActiveCatalogTab(cat.id); setViewServiceDetail(null); setCurrentScreen('categoryScreen'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <span className="lst-cat-thumb" aria-hidden="true">
                      {(cat.imageUrl || firstService?.imageUrl)
                        ? <img src={(cat.imageUrl || firstService!.imageUrl)} alt="" loading="lazy" decoding="async" style={{ objectPosition: `${(cat.imageUrl ? cat.imagePosition?.x : firstService!.imagePosition?.x) ?? 50}% ${(cat.imageUrl ? cat.imagePosition?.y : firstService!.imagePosition?.y) ?? 50}%` }} />
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

          {selectedServicesToBook.length > 0 && <section aria-label="Resumen de tu selección" style={{ backgroundColor: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', padding: '20px', borderRadius: 12 }}>
            <h2 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.02em', fontSize: '20px', margin: '0 0 14px', fontWeight: 400 }}>Tu selección</h2>
            {selectedServicesToBook.map(item => <div key={item.sub.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #E4DCCF' }}>
              <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#E4C687' }}>{serviceText(catalog.flatMap(category => category.subservices).find(service => service.id === item.sub.id) || item.sub, 'name')}{item.variant && <span> · {variantText(item.variant, item.sub)}</span>}<span style={{ display: 'block', color: '#E4C687' }}>{item.sub.hasVariants && !item.variant ? t('chooseOption') : (portalShowsPrices ? (item.variant?.price || item.sub.price) + ' · ' : '') + (item.variant?.duration || item.sub.duration)}</span></div>
              <button type="button" aria-label={'Quitar ' + serviceText(catalog.flatMap(category => category.subservices).find(service => service.id === item.sub.id) || item.sub, 'name')} onClick={() => setSelectedServicesToBook(previous => previous.filter(selected => selected.sub.id !== item.sub.id))} style={{ background: 'none', border: 'none', color: '#D6CBB8', cursor: 'pointer', padding: '10px', minHeight: '44px', minWidth: '44px', fontSize: '12px' }}>{t('remove')}</button>
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
              if (missing) { alert(tf('requiredVariant', { service: missing.sub.name })); return; }
              const conditionError = getInactiveServiceError(selectedServicesToBook) || getStylingError(selectedServicesToBook) || getTonerError(selectedServicesToBook);
              if (conditionError) { alert(conditionError); return; }
              const finishError = getInactiveServiceError(selectedServicesToBook) || getStylingError(selectedServicesToBook) || getTonerError(selectedServicesToBook); if (finishError) { alert(finishError); setCurrentScreen('catalogBooking'); return; } setCurrentScreen('visualAgenda');
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
                  const carouselSelected = selectedServicesToBook.some(item => item.sub.id === sub.id);
                  return (
                    <article key={sub.id} id={"portal-service-" + sub.id} className="lst-c-card">
                      <button type="button" className="lst-c-media" onClick={() => openDetail(sub)} aria-label={name + ' · ' + t('viewService')}>
                        {sub.imageUrl
                          ? <>
                            <img src={sub.imageUrl} alt={name} loading="lazy" decoding="async" style={{ objectPosition: `${sub.imagePosition?.x ?? 50}% ${sub.imagePosition?.y ?? 50}%` }} />
                            {sub.imageIsAiPlaceholder && <span className="lst-ai-tag">Imagen ilustrativa</span>}
                          </>
                          : <span className="lst-c-media-fallback"><strong>LS</strong><small>{bizConfig.name}</small></span>}
                      </button>
                      <div className="lst-c-body">
                        <button type="button" className="lst-c-name" onClick={() => openDetail(sub)}>{name}</button>
                        {!!serviceText(sub, 'slogan').trim() && <p className="lst-c-desc" style={{ color: '#E5D7BF', lineHeight: 1.5 }}>{serviceText(sub, 'slogan')}</p>}
                        <p className="lst-c-meta">{portalShowsPrices ? sub.price : ''}{sub.duration ? (portalShowsPrices ? ' · ' : '') + sub.duration : ''}</p>
                        <div className="lst-c-cta">
                          <button type="button" className="lst-btn-ver" onClick={() => openDetail(sub)}>{t('viewService')} <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /></button>
                          <button type="button" className="lst-btn-ver" aria-pressed={carouselSelected} aria-label={carouselSelected ? t('selectedRemove') : t('addShort') + ' · ' + name} onClick={() => setSelectedServicesToBook(previous => previous.some(item => item.sub.id === sub.id) ? previous.filter(item => item.sub.id !== sub.id) : [...previous, { sub, variant: null }])} style={carouselSelected ? { background: '#C99E52', borderColor: '#C99E52', color: '#29231F' } : undefined}>{carouselSelected ? '✓ ' + t('addShort') : t('addShort')}</button>
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
                if (missing) { alert(tf('requiredVariant', { service: missing.sub.name })); return; }
                const finishError = getInactiveServiceError(selectedServicesToBook) || getStylingError(selectedServicesToBook) || getTonerError(selectedServicesToBook); if (finishError) { alert(finishError); setCurrentScreen('catalogBooking'); return; } setCurrentScreen('visualAgenda');
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
        const detailSub = catalog.flatMap(category => category.subservices).find(service => service.id === viewServiceDetail.sub.id) || viewServiceDetail.sub;
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
            ? <button type="button" style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', position: 'relative' }} onClick={() => setLightboxImage(detailImage)} aria-label="Ampliar imagen"><img className="lst-card-media" style={{ height: 280, borderRadius: 14, objectPosition: `${viewServiceDetail.sub.imagePosition?.x ?? 50}% ${viewServiceDetail.sub.imagePosition?.y ?? 50}%` }} src={detailImage} alt={serviceText(detailSub, 'name') || detailSub.name} />{viewServiceDetail.sub.imageIsAiPlaceholder && <span className="lst-ai-tag">Imagen ilustrativa</span>}</button>
            : <div className="studio-service-media studio-service-media-empty" style={{ height: 280, borderRadius: 14 }} aria-hidden="true"><span>LS</span><small>{bizConfig.name}</small></div>}
          <header style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="lst-detail-eyebrow">{categoryText(viewServiceDetail.cat)}</span>
            <h1 className="lst-detail-title">{serviceText(detailSub, 'name') || detailSub.name}</h1>
            {!!serviceText(detailSub, 'description') && <p className="lst-detail-desc">{serviceText(detailSub, 'description')}</p>}
            {detailSub.imageCredit && <p style={{ fontSize: 10, color: '#D6CBB8', lineHeight: 1.5 }}>{detailSub.imageCredit}</p>}
          </header>
          {([
            { field: 'includesText', title: '¿Qué incluye?', icon: Scissors },
            { field: 'achievedText', title: '¿Qué te llevas?', icon: Sparkles },
            { field: 'forWhomText', title: '¿Es para ti?', icon: UserRoundSearch },
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
                <button type="button" onClick={() => { const missing = selectedServicesToBook.find(item => item.sub.hasVariants && !!item.sub.variants?.length && !item.variant); if (missing) { alert(tf('requiredVariant', { service: missing.sub.name })); return; } const finishError = getInactiveServiceError(selectedServicesToBook) || getStylingError(selectedServicesToBook) || getTonerError(selectedServicesToBook); if (finishError) { alert(finishError); setCurrentScreen('catalogBooking'); return; } setCurrentScreen('visualAgenda'); }} className="lst-cta-full" style={{ flex: 1 }}>{t('chooseDateTime')} <ArrowRight size={18} strokeWidth={2} aria-hidden="true" /></button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { if (detailSub.hasVariants && !!detailSub.variants?.length) { alert(tf('requiredVariant', { service: detailSub.name })); return; } setSelectedServicesToBook(previous => previous.some(item => item.sub.id === detailSub.id) ? previous : [...previous, { sub: detailSub, variant: null }]); }} className="lst-cta-full">{t('chooseAndBook')} <ArrowRight size={18} strokeWidth={2} aria-hidden="true" /></button>
          )}
        </div>
        );
      })()}

      {lightboxImage && (
        <div role="dialog" aria-modal="true" aria-label="Imagen ampliada del servicio" onClick={() => setLightboxImage(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(28, 22, 18, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', cursor: 'zoom-out' }}>
          <img src={lightboxImage} alt="Imagen ampliada del servicio" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}

      {/* AGENDA CLIENTAS · SEMANA Y HORAS DISPONIBLES */}
      {currentScreen === 'visualAgenda' && (
        <div style={{ maxWidth: '520px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '16px', padding: '0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
                  {emp.photo ? <img src={emp.photo} alt={emp.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> : <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#3E342C', display: 'grid', placeItems: 'center', fontSize: 14, color: '#E4C687' }}>{emp.name.charAt(0).toUpperCase()}</span>}
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
          <label style={{ color: '#C9BCA9', fontSize: '13px' }}>{t('otherDate')}<input type="date" value={formatDateKey(bookingDate)} onChange={e => { if (e.target.value) choosePortalDate(new Date(`${e.target.value}T12:00:00`)); }} style={{ display: 'block', marginTop: '8px', padding: '12px', backgroundColor: '#3E342C', color: '#FFF8EE', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '8px', boxSizing: 'border-box', width: '100%' }} /></label>
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
            <section style={{ padding: '12px', background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '8px' }}>
              <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, margin: '0 0 10px' }}>Notificaciones push: <strong style={{ color: pushStatus === 'subscribed' ? '#8FC98F' : '#E4C687' }}>{pushStatusLabel()}</strong></p>
              {pushNeedsLogin && <div style={{ marginBottom: '12px', color: '#FFF8EE' }}>
                <label htmlFor="push-login-pin">Confirma tu PIN para activar los avisos</label>
                <input id="push-login-pin" type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={pushLoginPin} onChange={event => setPushLoginPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} style={{ display: 'block', margin: '8px 0', padding: '10px', color: '#2C2521', background: '#EADCC7' }} />
                <button type="button" onClick={handlePushLogin} disabled={pushBusy || pushLoginPin.length !== 4}>Recuperar sesión sin perder mi reserva</button>
              </div>}
              {pushStatus === 'default' && !pushNeedsLogin && <button type="button" onClick={handleEnablePush} disabled={pushBusy} style={{ width: '100%', minHeight: '46px', padding: '12px', background: 'transparent', color: '#E4C687', border: '1px solid #C49A58', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: pushBusy ? 'wait' : 'pointer' }}>{pushBusy ? 'Activando…' : 'Activar notificaciones de mi cita'}</button>}
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
            </section>
            <button type="button" onClick={handleConfirmarCitaVisual} disabled={!portalTimes.includes(selectedVisualTime)} style={{ width: '100%', minHeight: '54px', padding: '14px', backgroundColor: portalTimes.includes(selectedVisualTime) ? '#C49A58' : '#322A25', color: portalTimes.includes(selectedVisualTime) ? '#29231F' : '#C9BCA9', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>{!selectedVisualTime ? t('chooseHour') : getApprovalReason(selectedServicesToBook, formatDateKey(bookingDate)) ? t('requestAppointment') : t('continueBooking')}</button>
          </div>
        </div>
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
                <h4 style={{ color: '#FFF8EE', fontSize: '13px', lineHeight: 1.5, margin: '0 0 8px' }}>{visit.service}</h4>
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
          <img className="studio-admin-access-logo" src={brandLogoSrc} onError={fallbackBrandLogo} decoding="async" alt="L’A · Hair Experience" style={{ width: '190px', height: 'auto', display: 'block', margin: '0 auto 22px', mixBlendMode: 'screen' }} />
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
      {currentScreen === 'adminPanel' && (
        <div className={`studio-admin-shell ${agendaExpanded && adminTab === 'agenda' ? 'studio-agenda-expanded' : ''}`} style={{ maxWidth: '1680px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '16px', padding: '25px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <style>{`
            .studio-desktop-nav { display: none; }
            
            .studio-agenda-expanded .studio-desktop-nav,
            .studio-agenda-expanded .studio-mobile-nav,
            .studio-agenda-expanded .studio-calendar-tools { display: none !important; }
            .studio-agenda-expanded { grid-template-columns: minmax(0, 1fr) !important; max-width: 100% !important; }
            .studio-agenda-expanded .studio-agenda-layout { grid-template-columns: minmax(0, 1fr) !important; }
            .studio-agenda-day-heading.studio-agenda-today { background: #C49A58 !important; color: #29231F !important; border-bottom: 2px solid #B98A3E !important; }
            .studio-agenda-slot.studio-agenda-today { background: rgba(201, 158, 82, 0.16) !important; }
            .studio-mini-day { border-radius: 50% !important; width: 25px; height: 25px; padding: 0 !important; justify-self: center; }

            @media (max-width: 700px) {
              .studio-admin-shell { padding: 12px !important; border-radius: 10px !important; }
              .studio-admin-header h2 { font-size: 24px !important; }
              .studio-admin-header button { min-height: 44px; }
              .studio-mobile-nav button { min-height: 44px !important; font-size: 13px !important; }
              .studio-agenda-toolbar { gap: 8px; }
              .studio-agenda-toolbar > div { flex-wrap: wrap !important; gap: 8px !important; }
              .studio-agenda-toolbar button, .studio-agenda-toolbar input { min-height: 44px; box-sizing: border-box; }
              .studio-agenda-stat { min-height: 44px !important; padding-right: 10px !important; }
              .studio-calendar-main input { font-size: 16px !important; }
              .studio-agenda-day-heading { position: sticky; top: 0; z-index: 6; }
              .studio-agenda-appointment { padding: 9px !important; }
              .studio-agenda-appointment strong { font-size: 14px !important; }
              .studio-agenda-appointment span { font-size: 12px !important; }
              .studio-calendar-tools { position: static !important; }
              .studio-mini-day { width: 32px !important; height: 32px !important; }
              .studio-agenda-scroll { padding: 6px !important; max-height: 65vh; overflow: auto !important; overscroll-behavior: contain; }
            }
.studio-admin-shell { background: transparent !important; border-color: #3A312A !important; color: #FFF8EE; font-family: 'Garet', 'Poppins', sans-serif; }
            .studio-admin-header { border-color: #3A312A !important; }
            .studio-admin-header h2 { color: #E4C687 !important; font-weight: normal; }
            .studio-desktop-nav { background: #322A25 !important; border-color: rgba(255, 248, 238, 0.08) !important; border-radius: 10px !important; }
            .studio-desktop-nav button { transition: background .18s, color .18s; }
            .studio-desktop-nav button:hover { background: rgba(201, 158, 82, 0.08) !important; }
            .studio-desktop-nav button[aria-current=page] { background: #C49A58 !important; border-color: #C49A58 !important; color: #29231F !important; }
            .studio-calendar-main { gap: 11px !important; }
            .studio-agenda-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
            .studio-agenda-toolbar > div { margin: 0 !important; }
            .studio-agenda-toolbar > div:first-child { display: contents !important; }
            .studio-agenda-toolbar h2 { display: none; }
            .studio-agenda-toolbar button { min-height: 38px; border-color: rgba(234, 220, 199, 0.35) !important; font-size: 12px !important; color: #E4C687 !important; background: #322A25 !important; }
            .studio-agenda-toolbar button[aria-pressed=true] { background: rgba(201, 158, 82, 0.12) !important; color: #7A5C1E !important; border-color: #E4C687 !important; }
            .studio-agenda-toolbar .studio-new-appointment { background: linear-gradient(135deg, #C99E52 0%, #B3823B 100%) !important; border-color: #B8972E !important; color: #29231F !important; font-weight: 600; }
            .studio-agenda-stat { border: none !important; background: transparent !important; padding: 4px 12px 4px 0 !important; gap: 6px !important; }
            .studio-agenda-stat span { font-size: 11px !important; color: #D6CBB8 !important; }
            .studio-agenda-stat strong { font-size: 13px !important; }
            .studio-calendar-tools { background: #322A25 !important; border-color: rgba(255, 248, 238, 0.08) !important; border-radius: 10px !important; }
            .studio-calendar-tools hr { border-color: #3A312A !important; }
            .studio-calendar-tools summary { color: #D6CBB8 !important; }
            .studio-calendar-tools > summary { list-style: none; font-size: 12px !important; letter-spacing: .3px; }
            .studio-calendar-tools .studio-calendar-settings { padding: 12px 0 4px; border-top: 1px solid #3A312A; margin-top: 12px; }
            .studio-calendar-settings summary { cursor: pointer; font-size: 11px; margin-bottom: 10px; }
            .studio-agenda-grid { background: rgba(41, 35, 31, 0.5); gap: 1px !important; }
            .studio-agenda-day-heading { background: #322A25 !important; color: #FFF8EE !important; padding: 10px 5px !important; }
            .studio-agenda-slot { transition: background .15s; border: none !important; }
            .studio-agenda-slot:not(:disabled):hover { background: #322A25 !important; }
            .studio-agenda-slot:not(:disabled):hover::after { content: '+'; color: #E4C687; font-size: 15px; }
            .studio-agenda-slot:focus-visible, .studio-agenda-appointment:focus-visible { outline: 2px solid #B98A3E; outline-offset: -2px; }
            .studio-agenda-appointment { padding: 7px 8px !important; border-radius: 4px !important; transition: filter .15s; }
            .studio-agenda-appointment:hover { filter: brightness(1.17); }

            .studio-admin-shell { padding: 16px !important; gap: 14px !important; }
            .studio-admin-header { padding-bottom: 10px !important; }
            .studio-admin-header h2 { font-size: 23px !important; margin-bottom: 2px !important; }
            .studio-admin-header p { font-size: 11px !important; }
            .studio-desktop-nav > p { font-size: 9px !important; letter-spacing: 1px !important; padding: 0 7px !important; margin-bottom: 7px !important; }
            .studio-desktop-nav > button { min-height: 42px !important; padding: 10px 8px !important; font-size: 12px !important; }
            .studio-agenda-layout { gap: 12px !important; }
            @media (min-width: 1100px) {
              .studio-agenda-layout { display: grid !important; grid-template-columns: minmax(0, 1fr) 205px; align-items: start !important; }
              .studio-agenda-layout > .studio-calendar-main { grid-column: 1; grid-row: 1; }
              .studio-agenda-layout > .studio-agenda-secondary { grid-column: 1; grid-row: 2; }
              .studio-agenda-layout > .studio-calendar-tools { grid-column: 2; grid-row: 1 / 3; position: sticky; top: 16px; min-width: 0; padding: 10px !important; }
              .studio-calendar-tools button, .studio-calendar-tools span { font-size: 11px !important; }
              .studio-calendar-tools > summary { font-size: 12px !important; line-height: 1.5; }
            }
            .studio-calendar-tools { flex-basis: 100% !important; width: 100% !important; }
            .studio-calendar-tools > summary { color: #E4C687; font-size: 13px; cursor: pointer; padding: 4px; }
            .studio-calendar-tools:not([open]) { display: block !important; padding: 10px 14px !important; }
            .studio-calendar-tools[open] > summary { margin-bottom: 14px; }
            .studio-calendar-main { width: 100% !important; flex-basis: 100% !important; }

            .studio-admin-content { min-width: 0; background: #322A25; border: 1px solid rgba(255, 248, 238, 0.08); border-radius: 16px; padding: 18px 14px; color: #FFF8EE; }
            @media (min-width: 1100px) {
              .studio-admin-shell { display: grid !important; grid-template-columns: 155px minmax(0, 1fr); column-gap: 16px !important; align-items: start; }
              .studio-admin-header { grid-column: 1 / -1; }
              .studio-mobile-nav { display: none !important; }
              .studio-desktop-nav { display: flex; flex-direction: column; gap: 5px; position: sticky; top: 20px; padding: 12px 7px; border: 1px solid rgba(255, 248, 238, 0.08); border-radius: 14px; background: #322A25; }
              .studio-calendar-tools { width: 100% !important; flex-shrink: 0; }
              .studio-calendar-main { flex-basis: 100% !important; }
            }
            @media (max-width: 1099px) {
              .studio-calendar-tools { width: 100% !important; }
              .studio-calendar-main { flex-basis: 100% !important; }
            }
          `}</style>
          <div className="studio-admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '15px' }}>
            <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}><img src={headerLogoSrc} alt={bizConfig.name} decoding="async" style={{width:160,height:48,objectFit:'contain',mixBlendMode:'screen'}} onError={fallbackHeaderLogo}/><div>
              <h2 style={{ color: '#E4C687', fontSize: '28px', margin: '0 0 3px 0', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em' }}>{t('adminMasterTitle')}</h2>
              <p style={{ color: '#C9BCA9', fontSize: '12px', letterSpacing: '1px', margin: 0 }}>{bizConfig.name} - {t('adminSubtitle')}</p>
            </div>
            </div>
            <button onClick={() => setCurrentScreen('clientPin')} style={{ background: 'none', border: '1px solid rgba(234, 220, 199, 0.4)', color: '#E4C687', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              {t('logout')}
            </button>
          </div>
          <nav className="studio-mobile-nav" aria-label="Navegación de 360studio" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
              {([['agenda', 'Agenda'], ['clients', 'Clientes'], ['catalog', 'Catálogo']] as const).map(([tab, label]) => <button type="button" key={tab} aria-current={adminTab === tab ? 'page' : undefined} onClick={() => setAdminTab(tab)} style={{ minHeight: '48px', padding: '12px 6px', backgroundColor: adminTab === tab ? '#C49A58' : '#3E342C', color: adminTab === tab ? '#29231F' : '#FFF8EE', border: '1px solid rgba(228, 198, 135, 0.45)', borderRadius: '9px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>{label}</button>)}
            </div>
            {adminTab === 'agenda' && renderAgendaLinks()}
            <details style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '9px', padding: '14px' }}>
              <summary style={{ color: '#E4C687', cursor: 'pointer', fontSize: '14px' }}>Más opciones{!['agenda', 'clients', 'catalog'].includes(adminTab) ? ' · ' + ({ config: 'Configuración', detractors: 'Buzón', crm: 'CRM e informes', demands: 'Oportunidades de cita', holidays: 'Vacaciones y festivos' } as Record<string, string>)[adminTab] : ''}</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginTop: '14px' }}>
                {([['config', 'Configuración'], ['detractors', `Buzón (${feedbackList.filter(f => !f.resolvedAt).length})`], ['crm', 'CRM e informes'], ['demands', 'Oportunidades de cita'], ['holidays', 'Vacaciones y festivos']] as const).map(([tab, label]) => <button type="button" key={tab} aria-current={adminTab === tab ? 'page' : undefined} onClick={() => setAdminTab(tab)} style={{ minHeight: '44px', padding: '10px 12px', textAlign: 'left', backgroundColor: adminTab === tab ? '#322A25' : 'transparent', border: '1px solid #C5A059', color: adminTab === tab ? '#F3D994' : '#FFF8EE', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>{label}</button>)}
              </div>
            </details>
          </nav>

          <nav className="studio-desktop-nav" aria-label="Menú lateral de 360studio">
            <p style={{ color: '#C9BCA9', fontSize: '11px', letterSpacing: '2px', padding: '0 12px', margin: '0 0 12px' }}>GESTIÓN DEL STUDIO</p>
            {([['agenda', 'Agenda Maestra'], ['clients', 'Clientes'], ['catalog', 'Catálogo'], ['config', 'Configuración'], ['detractors', `Buzón (${feedbackList.filter(f => !f.resolvedAt).length})`], ['crm', 'CRM e informes'], ['demands', 'Oportunidades de cita'], ['holidays', 'Vacaciones y festivos']] as const).map(([tab, label]) => <React.Fragment key={tab}><button type="button" key={tab} aria-current={adminTab === tab ? 'page' : undefined} onClick={() => setAdminTab(tab)} style={{ width: '100%', textAlign: 'left', minHeight: '48px', padding: '14px', backgroundColor: adminTab === tab ? 'rgba(201, 158, 82, 0.16)' : 'transparent', color: adminTab === tab ? '#F3D994' : '#FFF8EE', border: adminTab === tab ? '1px solid rgba(228, 198, 135, 0.45)' : '1px solid transparent', borderRadius: '9px', fontSize: '14px', cursor: 'pointer' }}>{label}</button>{tab === 'agenda' && renderAgendaLinks()}</React.Fragment>)}
          </nav>
          <main className="studio-admin-content">
          {activeEmployees.length === 0 && (
            <div style={{ padding: '12px 16px', backgroundColor: '#F2DCD8', border: '1px solid #C0392B', borderRadius: '8px', color: '#8A2F23', fontSize: '13px', lineHeight: 1.6, marginBottom: '4px' }}>
              No hay profesionales configurados. Ve a Configuración → Empleados y añade al menos una persona en activo para que las clientas puedan elegir profesional al reservar.
            </div>
          )}
          {/* TAB 1: AGENDA MAESTRA */}
          {adminTab === 'agenda' && (
            <div ref={agendaLayoutRef} className="studio-agenda-layout" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div className="studio-calendar-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', minWidth: 0, overflowX: 'auto' }}>

<div className="studio-agenda-toolbar">
<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <span style={{ color: '#D6CBB8', fontSize: '12px' }}>Muestra de color (temporal):</span>
                  {AGENDA_SWATCHES.map(swatch => (
                    <button key={swatch.id} type="button" aria-pressed={agendaSwatch === swatch.id}
                      onClick={() => setAgendaSwatch(swatch.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 12px', borderRadius: '999px', cursor: 'pointer', fontSize: '12px',
                        background: agendaSwatch === swatch.id ? swatch.panel : 'transparent',
                        border: agendaSwatch === swatch.id ? '2px solid #8F6D24' : '1px solid #5C5248', color: '#FFF8EE' }}>
                      <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: '50%', background: swatch.panel, border: '1px solid #5C5248', display: 'inline-block' }} />
                      {swatch.label}
                    </button>
                  ))}
                </div>

<button type="button" aria-pressed={agendaExpanded} onClick={() => setAgendaExpanded(previous => !previous)}
style={{ padding: '9px 14px', background: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '7px', cursor: 'pointer' }}>
{agendaExpanded ? 'Volver a vista normal' : 'Ampliar agenda'}</button>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px', marginBottom: '0' }}>
                  <div><h2 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '22px', fontWeight: 'normal', margin: 0 }}>Agenda Maestra</h2></div>
                  <button type="button" onClick={() => setFechaSeleccionada(new Date())} style={{ padding: '9px 14px', background: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '8px', cursor: 'pointer' }}>Ir a hoy</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '0' }}>
                  {(['day', 'week'] as const).map(view => <button type="button" key={view} aria-pressed={agendaViewMode === view} onClick={() => setAgendaViewMode(view)} style={{ backgroundColor: agendaViewMode === view ? '#C49A58' : '#3E342C', color: agendaViewMode === view ? '#29231F' : '#2C2521', border: '1px solid rgba(228, 198, 135, 0.45)', padding: '9px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>{view === 'day' ? 'Día' : 'Semana'}</button>)}
                  <button className="studio-new-appointment" type="button" onClick={() => {
                    if (isDateBlockedByHoliday(formatDateKey(fechaSeleccionada))) { alert('El día seleccionado está bloqueado. Elige otra fecha.'); return; }
                    const freeTime = hoursList.find(time => !isTimeSlotOccupied(formatDateKey(fechaSeleccionada), time));
                    if (!freeTime) { alert('No hay huecos libres en el día seleccionado.'); return; }
                    handleCellClick(fechaSeleccionada, diaSeleccionadoObj.name, freeTime);
                  }} style={{ backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #C5A059', padding: '9px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>+ Nueva cita</button>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#D6CBB8', fontSize: '12px' }}>Ir a fecha
<input aria-label="Elegir fecha de la agenda" type="date" value={formatDateKey(fechaSeleccionada)}
onChange={event => { if (event.target.value) setFechaSeleccionada(new Date(event.target.value + 'T12:00:00')); }}
style={{ padding: '8px', background: '#322A25', color: '#FFF8EE', border: '1px solid #C5A059', borderRadius: '6px' }} /></label></div>


</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { label: 'Citas del día', value: appointments.filter(item => item.dateKey === formatDateKey(fechaSeleccionada)).length, color: '#FFF8EE' },
                    { label: 'Solicitudes por revisar', value: appointments.filter(item => isActiveAppointment(item) && item.saturdayApproval?.status === 'pending').length, color: '#E4C687' },
                    { label: 'Bizum por confirmar', value: appointments.filter(item => isActiveAppointment(item) && item.advancePayment?.status === 'pending').length, color: '#33517E' }
                  ].map(item => <button type="button" className="studio-agenda-stat" aria-label={'Abrir ' + item.label}
                    onClick={() => {
                      if (item.label === 'Citas del día') setAgendaSidePanel('day');
                      else { setPendingPanelFilter(item.label === 'Solicitudes por revisar' ? 'approval' : 'payment'); setAgendaSidePanel('pending'); }
                    }} key={item.label} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '7px' }}><span style={{ display: 'block', color: '#D6CBB8', fontSize: '13px' }}>{item.label}</span><strong style={{ color: item.color, fontSize: '15px' }}>{item.value}</strong></button>)}
                </div>
                <section aria-label="Buscar citas" style={{ padding: '10px', border: '1px solid #3A312A', borderRadius: '8px', background: '#322A25' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor="agenda-search" style={{ color: '#E4C687', fontSize: '12px', flexShrink: 0 }}>Buscar cita</label>
                    <input id="agenda-search" type="search" value={appointmentSearch} onChange={event => setAppointmentSearch(event.target.value)}
                      placeholder="Nombre o teléfono de la clienta" style={{ flex: 1, minWidth: 0, padding: '9px', border: '1px solid #3A312A',
                        background: '#322A25', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                    {!!appointmentSearch && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setAppointmentSearch('')}
                      style={{ padding: '8px', background: 'none', border: 0, color: '#E4C687', cursor: 'pointer' }}>×</button>}
                  </div>
                  {!!appointmentSearchQuery && <div style={{ marginTop: '10px' }}>
                    <p role="status" aria-live="polite" style={{ color: '#D6CBB8', fontSize: '12px', margin: '6px 0' }}>{appointmentSearchResults.length} citas encontradas · Todas las fechas</p>
                    <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {appointmentSearchResults.map(appointment => <article key={appointment.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
                        padding: '10px', border: '1px solid #3A312A', borderRadius: '6px', background: 'rgba(234,220,199,0.55)' }}>
                        <div style={{ flex: '1 1 170px', fontSize: '12px', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                          <strong style={{ color: '#FFF8EE' }}>{appointment.clientName}</strong>
                          {appointment.lifecycleStatus && <span style={{ marginLeft: '8px', color: '#D6CBB8' }}>{appointment.lifecycleStatus === 'cancelled' ? 'Cancelada' : 'No presentada'}</span>}
                          <div style={{ color: '#E4C687' }}>{appointment.dateKey.split('-').reverse().join('/')} · {appointment.time} · {appointment.phone}</div>
                          <div style={{ color: '#D6CBB8' }}>{appointment.serviceSubcategory.replace(/^RESERVADO\s*/, '')}</div>
                        </div>
                        <button type="button" onClick={() => setViewApptModal(appointment)} style={{ padding: '9px', color: '#FFF8EE', background: '#322A25', border: '1px solid #C5A059', borderRadius: '5px', cursor: 'pointer' }}>Ver cita</button>
                        <button type="button" onClick={() => {
                          const date = new Date(appointment.dateKey + 'T12:00:00');
                          setFechaSeleccionada(date); setMesNavegacion(new Date(date.getFullYear(), date.getMonth(), 1));
                          setAppointmentSearch(''); setAgendaViewMode('day');
                        }} style={{ padding: '9px', color: '#FFF8EE', background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', border: 0, borderRadius: '5px', cursor: 'pointer' }}>Ir al día</button>
                      </article>)}
                    </div>
                    {!appointmentSearchResults.length && <p style={{ color: '#D6CBB8', fontSize: '12px' }}>Prueba otro nombre o los últimos dígitos del teléfono.</p>}
                  </div>}
                </section>

<p style={{ color: '#D6CBB8', fontSize: '12px', margin: 0 }}>Pulsa un hueco libre para agendar · Pulsa una cita para editarla.</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ color: '#E4C687', fontSize: '15px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: 0 }}>
                    {agendaViewMode === 'week' ? 'Tu semana' : 'Tu día'}
                  </h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => { const d = new Date(fechaSeleccionada); d.setDate(d.getDate() - (agendaViewMode === 'week' ? 7 : 1)); setFechaSeleccionada(d); }} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>◀ Anterior</button>
                    <span style={{ color: '#E4C687', fontSize: '12px', fontWeight: 'bold' }}>
                      {agendaViewMode === 'week' ? `Semana del ${semanaActual[0].dateFormatted}` : `${diaSeleccionadoObj.name} ${diaSeleccionadoObj.dateFormatted}`}
                    </span>
                    <button onClick={() => { const d = new Date(fechaSeleccionada); d.setDate(d.getDate() + (agendaViewMode === 'week' ? 7 : 1)); setFechaSeleccionada(d); }} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Siguiente ►</button>
                  </div>
                </div>

                {/* VISTA DINÁMICA DE LA TABLA (SEMANAL vs DIARIA) */}
                <div className="studio-agenda-scroll" style={{ overflowX: 'auto', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '10px', padding: '15px' }}>
                  {renderDurationAgenda(agendaViewMode === 'week' ? semanaActual : [diaSeleccionadoObj])}
                </div>
              </div>
              <details open className="studio-calendar-tools" style={{ width: '280px', backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '12px', padding: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <summary>Calendario y ajustes</summary>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <button onClick={() => cambiarMesMiniCal(-1)} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>◀</button>
                    <span style={{ color: '#E4C687', fontSize: '12px', fontWeight: 'bold', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em' }}>{nombresMeses[mesMini]} {anioMini}</span>
                    <button onClick={() => cambiarMesMiniCal(1)} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>▶</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '6px' }}>
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                      <div key={i} style={{ color: '#D6CBB8', fontSize: '12px', fontWeight: 'bold' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                    {diasRejillaMini.map((dateObj, i) => {
                      if (!dateObj) return <div key={i} />;
                      const dKey = formatDateKey(dateObj);
                      const isBlocked = isDateBlockedByHoliday(dKey);
                      const isSelected = dKey === formatDateKey(fechaSeleccionada);
                      return (
                        <button className="studio-mini-day" key={i} onClick={() => setFechaSeleccionada(dateObj)} style={{ backgroundColor: isBlocked ? '#F2DCD8' : (isSelected ? '#C49A58' : '#3E342C'), color: isBlocked ? '#8A2F23' : (isSelected ? '#29231F' : '#5C5248'), border: isBlocked ? '1px solid #C0392B' : '1px solid rgba(255, 248, 238, 0.18)', borderRadius: '4px', padding: '5px 0', fontSize: '13px', cursor: 'pointer', fontWeight: isSelected ? 'bold' : 'normal' }}>
                          {dateObj.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <hr style={{ borderColor: 'rgba(212, 175, 55, 0.2)', margin: 0 }} />
<details className="studio-calendar-settings"><summary>Calendarios</summary>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#322A25', padding: '8px 10px', borderRadius: '6px', border: '1px solid #3A312A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8F6D24' }} />
                      <span style={{ color: '#FFF8EE', fontSize: '13px', fontWeight: 'bold' }}>L'Studio Ana</span>
                    </div>
                    <span style={{ color: '#D6CBB8', fontSize: '13px' }}>Principal</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#322A25', padding: '8px 10px', borderRadius: '6px', border: '1px solid #B98A3E' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" checked={googleCalendarSyncActive} onChange={() => setGoogleCalendarSyncActive(!googleCalendarSyncActive)} style={{ accentColor: '#8F6D24', cursor: 'pointer' }} />
                      <span style={{ color: '#FFF8EE', fontSize: '13px' }}>Agenda Citas L'Studio</span>
                    </div>
                    <span style={{ color: googleCalendarConnected ? '#2E7D32' : '#C0392B', fontSize: '13px', fontWeight: 'bold' }}>{googleCalendarConnected ? 'Google Sync 🔗' : 'Desconectado'}</span>
                  </div>
                  <button onClick={() => {
                    setGoogleCalendarConnected(!googleCalendarConnected);
                    alert(googleCalendarConnected ? 'Google Calendar desconectado.' : '¡Google Calendar conectado y sincronizado con éxito con la Intranet!');
                  }} style={{ background: 'transparent', border: '1px dashed #C5A059', color: '#E4C687', padding: '6px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' }}>
                    {googleCalendarConnected ? '+ Vincular otro calendario' : 'Conectar con Google Calendar'}
                  </button>
                </details>
                <hr style={{ borderColor: 'rgba(212, 175, 55, 0.2)', margin: 0 }} />
<details className="studio-calendar-settings"><summary>Opciones de reserva</summary>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#D6CBB8' }}>
                    <span>Habilitar reserva fuera de horario</span>
                    <input type="checkbox" checked={enableOutOfHours} onChange={() => setEnableOutOfHours(!enableOutOfHours)} style={{ accentColor: '#8F6D24', width: '16px', height: '16px', cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#D6CBB8' }}>
                    <span>Activar doble reserva (solapes)</span>
                    <input type="checkbox" checked={enableDoubleBooking} onChange={() => setEnableDoubleBooking(!enableDoubleBooking)} style={{ accentColor: '#8F6D24', width: '16px', height: '16px', cursor: 'pointer' }} />
                  </div>

                  {/* BOTÓN REORGANIZADO: CAMBIAR LAS HORAS DE TRABAJO (DIRIGE A CONFIGURACIÓN > HORARIOS) */}
                  <button 
                    onClick={() => {
                      setAdminTab('config');
                      setConfigSubTab('schedule');
                    }} 
                    style={{ background: '#322A25', border: '1px solid #B98A3E', color: '#E4C687', padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    🕒 Cambiar las horas de trabajo
                  </button>

                  <button onClick={() => window.print()} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#D6CBB8', padding: '6px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}>
                    🖨️ Imprimir calendario (CTRL + P)
                  </button>
                </details>
              </details>


            </div>
          )}

          {/* TAB 2: CONFIGURACIÓN */}
          {adminTab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <style>{`
                .studio-settings-layout { display: grid; grid-template-columns: 170px minmax(0,1fr); gap: 20px; align-items: start; }
                .studio-settings-nav { display: flex; flex-direction: column; gap: 5px; position: sticky; top: 16px; }
                .studio-settings-nav button { text-align: left; padding: 12px; min-height: 44px; border: 1px solid transparent; border-radius: 8px; color: #FFF8EE; background: transparent; font-size: 13px; font-weight: 500; cursor: pointer; }
                .studio-settings-nav button[aria-current=page] { background: #322A25; border-color: #E4C687; color: #E4C687; }
                .studio-settings-content { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
                .studio-settings-savebar { position: sticky; top: 0; z-index: 8; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; background: #322A25; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 9px; font-size: 12px; color: #D6CBB8; }
                .studio-settings-savebar button { padding: 10px 15px; min-height: 40px; border: 0; border-radius: 7px; background: linear-gradient(135deg, #8F6D24 0%, #B3823B 100%); color: #2B2521; cursor: pointer; }
                .studio-settings-savebar button:disabled { opacity: .45; cursor: default; }
                .studio-security-pin { background: #322A25; border: 1px solid #C5A059; border-radius: 12px; padding: 20px; color: #2B2521; }
                .studio-security-pin h3 { font-size: 16px; color: #E4C687; margin-top: 0; }
                @media(max-width: 750px) { .studio-settings-layout { grid-template-columns: minmax(0,1fr); gap: 12px; } .studio-settings-nav { position: static; flex-direction: row; overflow-x: auto; } .studio-settings-nav button { flex-shrink: 0; white-space: nowrap; } }
              `}</style>
              <header><p style={{ color: '#E4C687', fontSize: '14px', letterSpacing: '2px', margin: '0 0 8px' }}>360studio · AJUSTES DEL STUDIO</p><h2 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '28px', fontWeight: 'normal', margin: '0 0 10px' }}>Configuración</h2><p style={{ color: '#FFF8EE', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>Elige un apartado, revisa sus opciones y guarda los cambios.</p></header>
              <div className="studio-settings-layout">
              <nav className="studio-settings-nav" aria-label="Apartados de configuración">
                {([['marca', 'Datos del Studio'], ['precios', 'Precios'], ['empleados', 'Empleados'], ['schedule', 'Horarios'], ['reservas', 'Reservas'], ['avisos', 'Avisos'], ['backup', 'Acceso y seguridad']] as const).map(([tab, label]) => <button type="button" key={tab} aria-current={configSubTab === tab ? 'page' : undefined} onClick={() => setConfigSubTab(tab)}>{label}</button>)}
              </nav>
              <div className="studio-settings-content"><style>{`
.studio-settings-content :is(.studio-security-pin,.studio-security-compact) { padding:14px 16px !important; max-width:860px; box-sizing:border-box; font-size:13px; line-height:1.5; gap:12px !important; }
.studio-settings-content :is(.studio-security-pin,.studio-security-compact) h3 { font-size:16px !important; margin:0 0 10px; }
.studio-settings-content :is(.studio-security-pin,.studio-security-compact) label { font-size:13px !important; }
.studio-settings-content :is(.studio-security-pin,.studio-security-compact) p { font-size:12px !important; line-height:1.5 !important; margin:6px 0; }
.studio-settings-content .studio-security-pin input { width:180px; max-width:100%; height:42px; box-sizing:border-box; padding:8px 10px !important; }
.studio-settings-content .studio-security-compact button { align-self:flex-start; width:auto; max-width:100%; min-height:44px; padding:8px 14px !important; font-size:13px; }
@media(max-width:640px) { .studio-settings-content .studio-security-pin input { font-size:16px !important; min-height:44px; } }

:is(.studio-reservas-compact,.studio-avisos-compact) { display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px 20px !important; max-width:860px; font-size:13px; }
:is(.studio-reservas-compact,.studio-avisos-compact) > h3,:is(.studio-reservas-compact,.studio-avisos-compact) > p { grid-column:1/-1; margin:0; }
:is(.studio-reservas-compact,.studio-avisos-compact) > h3 { font-size:16px; }
:is(.studio-reservas-compact,.studio-avisos-compact) > label { font-size:13px; line-height:1.45; min-width:0; }
:is(.studio-reservas-compact,.studio-avisos-compact) input:not([type="checkbox"]) { height:42px; padding:8px 10px !important; font-size:14px; }
:is(.studio-reservas-compact,.studio-avisos-compact) p { font-size:12px; line-height:1.5; }
@media(max-width:640px) { :is(.studio-reservas-compact,.studio-avisos-compact) { grid-template-columns:minmax(0,1fr); padding:14px !important; } :is(.studio-reservas-compact,.studio-avisos-compact) input:not([type="checkbox"]) { font-size:16px; min-height:44px; } }
`}</style>
                <div className="studio-settings-savebar">
                  <span role="status">{saveState === 'saving' ? 'Guardando…' : saveState === 'saved' && !configHasPendingChanges ? 'Cambios guardados' : saveState === 'error' ? 'No se pudo guardar. Reintenta.' : configHasPendingChanges ? 'Cambios pendientes' : 'Todo guardado'}</span>
                  <button type="button" disabled={(!configHasPendingChanges && saveState !== 'error') || saveState === 'saving'} onClick={() => handleSaveSection('Ajustes del Studio')}>Guardar cambios</button>
                </div>
                {saveState === 'error' && saveErrorMsg && (
                  <div style={{ padding: '10px', backgroundColor: '#F2DCD8', border: '1px solid #C0392B', color: '#8A2F23', borderRadius: '6px', fontSize: '12px', textAlign: 'center' }}>
                    Error al guardar: {saveErrorMsg}
                  </div>
                )}
              {savedMsg && (
                <div style={{ padding: '10px', backgroundColor: '#8FC98F', border: '1px solid #44bb44', color: '#2E7D32', borderRadius: '6px', fontSize: '12px', textAlign: 'center' }}>
                  {savedMsg}
                </div>
              )}
{configSubTab === 'precios' && <section style={{ background: '#322A25', padding: 20, borderRadius: 12, color: '#FFF8EE' }}>
  <h3 style={{ color: '#E4C687', marginTop: 0 }}>Visibilidad de precios</h3>
  <label style={{ display: 'flex', gap: 12, alignItems: 'center', minHeight: 48 }}><input type="checkbox" checked={tempConfig.showPrices !== false} onChange={e => setTempConfig(previous => ({ ...previous, showPrices: e.target.checked }))} style={{ width: 22, height: 22, accentColor: '#C5A059' }} />Mostrar precios en el portal de clientas</label>
  <p style={{ color: '#E5D7BF', fontSize: 13, lineHeight: 1.6 }}>Controla los precios de servicios, opciones, complementos y totales de la reserva. Los precios siguen disponibles en administración. Los anticipos necesarios para confirmar una cita se siguen mostrando.</p>
  <p style={{ fontSize: 13 }}>Pulsa «Guardar cambios» para aplicar la selección.</p>
</section>}
{configSubTab === 'empleados' && <section style={{ background: '#322A25', padding: 20, borderRadius: 12, color: '#FFF8EE' }}>
  <h3 style={{ color: '#E4C687', marginTop: 0 }}>Empleados</h3>
  <p style={{ color: '#E5D7BF', fontSize: 13 }}>Guarda las fichas de tu equipo actual y de futuras incorporaciones. Estas fichas se gestionan en administración; todavía no asignan citas ni crean cuentas de acceso.</p>
  <button type="button" className="studio-btn-ghost" disabled={!!employeePhotoBusy} onClick={() => setTempConfig(previous => ({ ...previous, employees: [...(previous.employees || []), { id: crypto.randomUUID(), name: '', role: '', photo: '', status: 'future' }] }))}>+ Añadir empleado</button>
  <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
    {(tempConfig.employees || []).map(employee => <article key={employee.id} style={{ border: '1px solid #655039', borderRadius: 12, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <div style={{ width: 100 }}>
        {employee.photo ? <img src={employee.photo} alt={employee.name || 'Foto del empleado'} style={{ width: 92, height: 92, objectFit: 'cover', borderRadius: 12 }} /> : <div style={{ width: 92, height: 92, border: '1px dashed #C5A059', borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 13 }}>Sin foto</div>}
        <label style={{ display: 'block', cursor: 'pointer', color: '#E4C687', padding: '12px 0', fontSize: 12 }}>{employeePhotoBusy === employee.id ? 'Subiendo…' : 'Subir foto'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!employeePhotoBusy} onChange={e => { void uploadEmployeePhoto(employee.id, e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} /></label>
        {employee.photo && <button type="button" disabled={!!employeePhotoBusy} onClick={() => updateEmployee(employee.id, { photo: '' })} style={{ background: 'none', border: 0, color: '#F1C4BD', cursor: 'pointer' }}>Quitar foto</button>}
      </div>
      <div style={{ flex: '1 1 200px', display: 'grid', gap: 12 }}>
        <label>Nombre<input style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 6, background: '#29231F', color: '#FFF8EE', border: '1px solid #C5A059', borderRadius: 7, fontSize: 14 }} maxLength={100} value={employee.name} onChange={e => updateEmployee(employee.id, { name: e.target.value })} /></label>
        <label>Puesto o especialidad<input style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 6, background: '#29231F', color: '#FFF8EE', border: '1px solid #C5A059', borderRadius: 7, fontSize: 14 }} maxLength={160} value={employee.role} onChange={e => updateEmployee(employee.id, { role: e.target.value })} placeholder="Estilista · Colorista…" /></label>
        <label>Estado<select style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 6, background: '#29231F', color: '#FFF8EE', border: '1px solid #C5A059', borderRadius: 7, fontSize: 14 }} value={employee.status} onChange={e => updateEmployee(employee.id, { status: e.target.value as StudioEmployee['status'] })}><option value="active">En activo</option><option value="future">Futura incorporación</option><option value="inactive">Inactivo</option></select></label>
        <button type="button" className="studio-btn-ghost" disabled={!!employeePhotoBusy} onClick={() => { if (confirm('¿Eliminar esta ficha de empleado?')) setTempConfig(previous => ({ ...previous, employees: (previous.employees || []).filter(item => item.id !== employee.id) })); }}>Eliminar ficha</button>
      </div>
    </article>)}
  </div>
  {!tempConfig.employees?.length && <p style={{ color: '#E5D7BF' }}>Aún no hay empleados añadidos.</p>}
  <p style={{ color: '#E5D7BF', fontSize: 12 }}>Pulsa «Guardar cambios» para conservar las fichas y las fotos.</p>
</section>}
{configSubTab === 'reservas' && <div className="studio-reservas-compact" style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', display: 'flex', flexDirection: 'column', gap: '16px', color: '#FFF8EE' }}><h3 style={{ color: '#E4C687', margin: 0 }}>Reservas y cancelaciones</h3><label>Antelación mínima (días)<input type="number" min="0" value={tempConfig.minAdvanceDays} onChange={(e) => setTempConfig(previous => ({ ...previous, minAdvanceDays: Number(e.target.value) }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', marginTop: '6px' }} /></label><label>Hasta cuántos meses se puede reservar<input type="number" min="0" value={tempConfig.maxBookingMonths} onChange={(e) => setTempConfig(previous => ({ ...previous, maxBookingMonths: Number(e.target.value) }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', marginTop: '6px' }} /></label><label>Intervalo entre horas disponibles (minutos)<input type="number" min="0" value={tempConfig.slotIntervalMinutes} onChange={(e) => setTempConfig(previous => ({ ...previous, slotIntervalMinutes: Number(e.target.value) }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', marginTop: '6px' }} /></label><label>Antelación para solicitar cambios o cancelaciones (horas)<input type="number" min="0" value={tempConfig.cancellationHours} onChange={(e) => setTempConfig(previous => ({ ...previous, cancellationHours: Number(e.target.value) }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', marginTop: '6px' }} /></label><p>La antelación para cancelar es una preferencia guardada. Su aplicación automática queda pendiente. El intervalo organiza las horas disponibles; no añade tiempo de preparación entre citas.</p></div>}{configSubTab === 'reservas' && <div className="studio-reservas-compact" style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', display: 'flex', flexDirection: 'column', gap: '16px', color: '#FFF8EE' }}><h3 style={{ color: '#E4C687', margin: 0 }}>Reserva anticipada y sábados</h3><label><input type="checkbox" checked={tempConfig.advancePaymentEnabled} onChange={(e) => setTempConfig(previous => ({ ...previous, advancePaymentEnabled: e.target.checked }))} /> Solicitar reserva anticipada</label><label>Importe de la reserva anticipada (€)<input type="text"  value={tempConfig.depositAmount} onChange={(e) => setTempConfig(previous => ({ ...previous, depositAmount: e.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', marginTop: '6px' }} /></label><label>Solicitarla cuando la cita supere estos minutos<input type="number" min="0" value={tempConfig.advancePaymentThresholdMinutes} onChange={(e) => setTempConfig(previous => ({ ...previous, advancePaymentThresholdMinutes: Number(e.target.value) }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', marginTop: '6px' }} /></label><label>Número de Bizum<input type="tel"  value={tempConfig.bizumNumber} onChange={(e) => setTempConfig(previous => ({ ...previous, bizumNumber: e.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', marginTop: '6px' }} /></label><p>Las citas de los sábados requieren siempre la confirmación de Ana.</p><p>Los sábados se aprueban antes de solicitar el pago. El plazo de pago se acuerda con la clienta; no hay caducidad automática.</p></div>}{configSubTab === 'avisos' && <div className="studio-avisos-compact" style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', display: 'flex', flexDirection: 'column', gap: '16px', color: '#FFF8EE' }}><h3 style={{ color: '#E4C687', margin: 0 }}>Avisos y recordatorios</h3><label>WhatsApp del Studio<input type="tel"  value={tempConfig.studioWhatsapp} onChange={(e) => setTempConfig(previous => ({ ...previous, studioWhatsapp: e.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', marginTop: '6px' }} /></label><label>Correo del Studio<input type="email"  value={tempConfig.studioEmail} onChange={(e) => setTempConfig(previous => ({ ...previous, studioEmail: e.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', marginTop: '6px' }} /></label><label>Recordatorio antes de la cita (horas)<input type="number" min="0" value={tempConfig.reminderHours} onChange={(e) => setTempConfig(previous => ({ ...previous, reminderHours: Number(e.target.value) }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', marginTop: '6px' }} /></label><p style={{ color: '#E4C687' }}>Envío automático pendiente de configurar.</p><p>Estos datos guardan tus preferencias. No envían mensajes ni programan recordatorios hasta conectar un servicio de envío. El registro de entregas y errores estará disponible con esa conexión.</p></div>}{configSubTab === 'backup' && <section className="studio-security-pin"><h3>PIN de administración</h3>                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#E4C687', fontSize: '14px', fontWeight: 'bold' }}>PIN Maestro de Administración (4 dígitos):</label>
                    <input type="password" maxLength={4} value={tempConfig.masterPin} onChange={(e) => setTempConfig(previous => ({ ...previous, masterPin: e.target.value }))} onFocus={(e) => e.target.select()} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px', textAlign: 'center', letterSpacing: '4px' }} />
                  </div></section>}{configSubTab === 'backup' && <div className="studio-security-compact" style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', display: 'flex', flexDirection: 'column', gap: '16px', color: '#FFF8EE' }}><h3 style={{ color: '#E4C687', margin: 0 }}>Copia de seguridad</h3><p>Descarga el catálogo, las citas, la configuración y los registros locales. Guarda el archivo en un lugar privado: puede contener datos personales y PIN.</p><button type="button" onClick={() => {
const data: Record<string, string | null> = {}; for (let index = 0; index < localStorage.length; index++) { const key = localStorage.key(index); if (key?.startsWith('lst_')) data[key] = localStorage.getItem(key); }
data.lst_master_catalog = JSON.stringify(catalog); data.lst_business_config = JSON.stringify(bizConfig);
const blob = new Blob([JSON.stringify({ format: 'lstudio-backup', version: 1, createdAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `LStudio_copia_${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}} style={{ padding: '12px', cursor: 'pointer' }}>Descargar copia de seguridad</button><p>La restauración no está incluida: la descarga no cambia ni elimina tus datos.</p>
<div style={{ marginTop: '14px', padding: '14px', background: '#29231F', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px' }}>
  <strong style={{ color: '#E4C687', fontSize: '13px' }}>Emails automáticos de citas</strong>
  {emailConfigStatus === null && <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, margin: '8px 0 0' }}>No se pudo consultar el estado de la configuración de email en este momento.</p>}
  {emailConfigStatus && !emailConfigStatus.providerConfigured && <p style={{ color: '#E4C687', fontSize: '12px', lineHeight: 1.7, margin: '8px 0 0' }}>Estado: pendiente de configurar. Los emails se programan y quedan registrados, pero no se envían hasta completar: una cuenta en Resend (proveedor de email), su API key guardada como secreto del proyecto y un remitente verificado en Resend (dominio propio o dirección verificada). No se muestra ningún envío como realizado sin confirmación del proveedor.</p>}
  {emailConfigStatus && emailConfigStatus.providerConfigured && <p style={{ color: '#8FC98F', fontSize: '12px', lineHeight: 1.7, margin: '8px 0 0' }}>Estado: configurado. Remitente: {emailConfigStatus.fromEmail} · Proveedor: {emailConfigStatus.provider || 'resend'}.</p>}
  {emailConfigStatus && <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, margin: '8px 0 0' }}>El estado de los emails de cada cita se consulta en el detalle de la cita, en «Emails automáticos de la cita».</p>}
</div>
<div style={{ marginTop: '14px', padding: '14px', background: '#29231F', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px' }}>
  <strong style={{ color: '#E4C687', fontSize: '13px' }}>WhatsApp automático de citas</strong>
  {whatsappConfigStatus === null && <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, margin: '8px 0 0' }}>No se pudo consultar el estado de la configuración de WhatsApp en este momento.</p>}
  {whatsappConfigStatus && !whatsappConfigStatus.providerConfigured && (
    <div style={{ margin: '8px 0 0' }}>
      <p style={{ color: '#E4C687', fontSize: '12px', lineHeight: 1.7, margin: 0 }}>Estado: pendiente de configurar. Los mensajes se programan y quedan registrados, pero no se envían hasta completar:</p>
      <ul style={{ color: '#E4C687', fontSize: '12px', lineHeight: 1.7, margin: '6px 0 0', paddingLeft: '18px' }}>
        {whatsappConfigStatus.missing.map(item => <li key={item}>{item}</li>)}
      </ul>
      <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, margin: '6px 0 0' }}>Paso a paso: crear una cuenta de WhatsApp Business Platform en Meta Business, verificar el número del Studio, crear y enviar a aprobación la plantilla de confirmación, y guardar el identificador del número, el token permanente y el nombre de la plantilla aprobada como secretos del proyecto. Las reservas no se bloquean mientras falte algo y no se muestra ningún envío como realizado sin confirmación del proveedor.</p>
    </div>
  )}
  {whatsappConfigStatus && whatsappConfigStatus.providerConfigured && <p style={{ color: '#8FC98F', fontSize: '12px', lineHeight: 1.7, margin: '8px 0 0' }}>Estado: configurado. Número del Studio: {whatsappConfigStatus.studioPhone} · Plantilla: {whatsappConfigStatus.templateName}.</p>}
  {whatsappConfigStatus && <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, margin: '8px 0 0' }}>El estado de los WhatsApp de cada cita se consulta en el detalle de la cita, en «WhatsApp automático de la cita». Los emails siguen funcionando de forma independiente.</p>}
</div></div>}
              {configSubTab === 'marca' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ color: '#E4C687', fontSize: '16px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: 0 }}>Gestor de Marca, Dirección y Plantilla WhatsApp</h3>
                  <div style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ color: '#E4C687', fontSize: '13px', fontWeight: 'bold' }}>💬 Plantilla Personalizada de WhatsApp</span>
                    <p style={{ color: '#D6CBB8', fontSize: '14px', margin: 0 }}>Puedes editar la plantilla para los mensajes manuales de WhatsApp. El envío automático al agendar usa la plantilla aprobada en WhatsApp Business Platform y se configura en «Acceso y seguridad».</p>
                    <textarea 
                      value={tempConfig.whatsappTemplate} 
                      onChange={(e) => setTempConfig(previous => ({ ...previous, whatsappTemplate: e.target.value }))}
                      rows={3} 
                      style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px', resize: 'vertical' }} 
                    />
                  </div>
                  <section style={{background:'#29231F',border:'1px solid #806340',borderRadius:12,padding:18,display:'flex',flexDirection:'column',gap:14}}>
                    <h3 style={{margin:0,color:'#E4C687',fontSize:19}}>Imagen del Studio · Logos</h3>
                    <p style={{margin:0,color:'#D6CBB8',fontSize:13,lineHeight:1.6}}>Sube tu logo y revisa la vista previa. La app lo optimiza y guarda como archivo; la configuración conserva solo su enlace. Pulsa Guardar cambios para aplicarlo al portal y la intranet.</p>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
                      {([{key:'brandLogoUrl',title:'Logo principal',help:'Pantalla de inicio y accesos al portal y la intranet.',fallback:DEFAULT_BRAND_LOGO},{key:'headerLogoUrl',title:'Logo de cabecera',help:'Formato horizontal para la cabecera de la intranet.',fallback:DEFAULT_HEADER_LOGO}] as const).map(item=><article key={item.key} style={{display:'flex',flexDirection:'column',gap:12,border:'1px solid #655039',borderRadius:10,padding:16,background:'#221D19'}}>
                        <strong style={{color:'#FFF8EE',fontSize:14}}>{item.title}</strong><p style={{color:'#D6CBB8',fontSize:12,margin:0}}>{item.help}</p>
                        <div style={{height:130,display:'flex',alignItems:'center',justifyContent:'center',background:'#221D19',borderRadius:8,padding:12}}><img src={tempConfig[item.key] || item.fallback} alt={`Vista previa: ${item.title}`} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',mixBlendMode:'screen'}} onError={e=>{if(!e.currentTarget.src.endsWith(item.fallback))e.currentTarget.src=item.fallback;}} /></div>
                        <label style={{padding:'11px 14px',border:'1px solid #C5A059',borderRadius:8,color:'#E4C687',textAlign:'center',cursor:logoUploadBusy ? 'wait' : 'pointer',fontSize:13}}>{logoUploadBusy===item.key ? 'Subiendo…' : 'Subir / cambiar logo'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={logoUploadBusy !== null || saveState === 'saving'} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void uploadStudioLogo(item.key,file);}} style={{display:'block',width:'100%',marginTop:9,fontSize:12}} /></label>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" disabled={logoUploadBusy !== null || !tempConfig[item.key]} onClick={()=>{setTempConfig(previous=>({...previous,[item.key]:undefined}));setLogoUploadMessage('Logo original seleccionado. Pulsa Guardar cambios para aplicarlo.');}} style={{background:'transparent',border:'1px solid #655039',color:'#D6CBB8',borderRadius:7,padding:'8px 10px',cursor:'pointer',fontSize:12}}>Restaurar original</button><button type="button" disabled={logoUploadBusy !== null || !tempConfig[item.key]} onClick={()=>{const url=tempConfig[item.key];setTempConfig(previous=>({...previous,brandLogoUrl:url,headerLogoUrl:url}));setLogoUploadMessage('El mismo logo se usará en ambos sitios. Pulsa Guardar cambios.');}} style={{background:'transparent',border:'1px solid #655039',color:'#D6CBB8',borderRadius:7,padding:'8px 10px',cursor:'pointer',fontSize:12}}>Usar en ambos</button></div>
                      </article>)}
                    </div>
                    {logoUploadMessage && <p role="status" style={{margin:0,color:'#E4C687',fontSize:13,lineHeight:1.6}}>{logoUploadMessage}</p>}
                    <p style={{margin:0,color:'#D6CBB8',fontSize:12}}>PNG, JPG o WebP. Recomendado: fondo transparente o negro y letras doradas. El icono instalado en el móvil se configura aparte.</p>
                  </section>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)' }}>
                    <span style={{ color: '#E4C687', fontSize: '13px', fontWeight: 'bold' }}>Detalles de Ubicación y Contacto</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Nombre oficial</label>
                        <input type="text" value={tempConfig.name} onChange={(e) => setTempConfig(previous => ({ ...previous, name: e.target.value }))} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Teléfono del Salón</label>
                        <input type="text" value={tempConfig.phone} onChange={(e) => setTempConfig(previous => ({ ...previous, phone: e.target.value }))} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Dirección del Studio</label>
                      <input type="text" value={tempConfig.location} onChange={(e) => setTempConfig(previous => ({ ...previous, location: e.target.value }))} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Descripción Corporativa</label>
                      <textarea value={tempConfig.description} onChange={(e) => setTempConfig(previous => ({ ...previous, description: e.target.value }))} rows={3} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px', resize: 'vertical' }} />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ color: '#E4C687', fontSize: '13px', fontWeight: 'bold' }}>Fotos del inicio</span>
                    <p style={{ color: '#D6CBB8', fontSize: '12px', margin: 0, lineHeight: 1.6 }}>Imagen protagonista del portal de clientas, bajo el logotipo. Sube una foto vertical u horizontal del salón; ajusta el encuadre con los deslizadores (el valor Y bajo centra la vista en las butacas recortando techo y suelo).</p>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ width: '150px', height: '200px', borderRadius: '10px', overflow: 'hidden', background: '#3E342C', flexShrink: 0, border: '1px solid #3A312A' }}>
                        {tempConfig.homeHeroImage
                          ? <img src={tempConfig.homeHeroImage} alt="Vista previa del inicio" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${tempConfig.homeHeroImagePosition?.x ?? 50}% ${tempConfig.homeHeroImagePosition?.y ?? 62}%` }} />
                          : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#E4C687', fontSize: '12px' }}>Sin foto</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '44px', padding: '10px 14px', background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                          {tempConfig.homeHeroImage ? 'Sustituir fotografía' : 'Subir fotografía'}
                          <input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file || !file.type.startsWith('image/')) { if (file) alert('Elige un archivo de imagen.'); return; }
                            if (file.size > 8 * 1024 * 1024) { alert('La imagen supera 8 MB. Elige una más ligera.'); return; }
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const dataUrl = String(reader.result);
                              try {
                                if (!studioApi.serverConfigured || studioApi.storedRole() !== 'admin' || !studioApi.currentToken()) {
                                  alert('Entra en 360studio con el PIN maestro para subir la fotografía.'); return;
                                }
                                const uploaded = await studioApi.uploadServiceImage(studioApi.currentToken()!, dataUrl);
                                setTempConfig(previous => ({ ...previous, homeHeroImage: uploaded.url }));
                                alert('Foto subida. Pulsa «Guardar cambios» para publicarla en el portal.');
                              } catch { alert('No se pudo subir la foto. Inténtalo de nuevo.'); }
                            };
                            reader.readAsDataURL(file);
                          }} style={{ display: 'none' }} />
                        </label>
                        <label style={{ color: '#D6CBB8', fontSize: '12px' }}>Encuadre horizontal
                          <input type="range" min={0} max={100} value={tempConfig.homeHeroImagePosition?.x ?? 50} onChange={(e) => setTempConfig(previous => ({ ...previous, homeHeroImagePosition: { x: Number(e.target.value), y: tempConfig.homeHeroImagePosition?.y ?? 62 } }))} style={{ width: '100%', accentColor: '#C49A58' }} />
                        </label>
                        <label style={{ color: '#D6CBB8', fontSize: '12px' }}>Encuadre vertical (menos = más butacas, recorta techo)
                          <input type="range" min={0} max={100} value={tempConfig.homeHeroImagePosition?.y ?? 62} onChange={(e) => setTempConfig(previous => ({ ...previous, homeHeroImagePosition: { x: tempConfig.homeHeroImagePosition?.x ?? 50, y: Number(e.target.value) } }))} style={{ width: '100%', accentColor: '#C49A58' }} />
                        </label>
                        {tempConfig.homeHeroImage && tempConfig.homeHeroImage !== `/Salon_elegante_con_luz_calida.png` && !tempConfig.homeHeroImage.startsWith('/') && (
                          <button type="button" onClick={async () => {
                            if (!window.confirm('¿Restablecer la fotografía original del salón?')) return;
                            const match = /^https:\/\/.+\/storage\/v1\/object\/public\/service-images\/(.+)$/.exec(tempConfig.homeHeroImage || '');
                            try {
                              if (match && studioApi.serverConfigured && studioApi.currentToken()) await studioApi.deleteServiceImage(studioApi.currentToken()!, match[1]);
                            } catch { /* si falla el borrado, se restablece igualmente la vista previa */ }
                            setTempConfig(previous => ({ ...previous, homeHeroImage: '/Salon_elegante_con_luz_calida.png', homeHeroImagePosition: { x: 50, y: 62 } }));
                          }} style={{ background: '#322A25', color: '#C0392B', border: '1px solid #dfaaa3', borderRadius: '6px', padding: '10px 14px', minHeight: '44px', fontSize: '12px', cursor: 'pointer' }}>Restablecer foto original</button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}
              {configSubTab === 'marca' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '10px', padding: '15px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ color: '#E4C687', fontSize: '13px', margin: 0, fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em' }}>Redes Sociales del Salón</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Instagram URL:</label>
                      <input type="text" value={tempConfig.instagramUrl} onChange={(e) => setTempConfig(previous => ({ ...previous, instagramUrl: e.target.value }))} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Facebook URL:</label>
                      <input type="text" value={tempConfig.facebookUrl} onChange={(e) => setTempConfig(previous => ({ ...previous, facebookUrl: e.target.value }))} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Tik Tok URL:</label>
                      <input type="text" value={tempConfig.tiktokUrl} onChange={(e) => setTempConfig(previous => ({ ...previous, tiktokUrl: e.target.value }))} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Enlace Google Maps:</label>
                    <input type="text" value={tempConfig.googleMapsUrl} onChange={(e) => setTempConfig(previous => ({ ...previous, googleMapsUrl: e.target.value }))} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Enlace Reseñas Google My Business:</label>
                    <input type="text" value={tempConfig.googleReviewUrl} onChange={(e) => setTempConfig(previous => ({ ...previous, googleReviewUrl: e.target.value }))} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  
                </div>
              )}
              {configSubTab === 'schedule' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Horario Lunes:</label>
                    <input type="text" value={tempConfig.scheduleMonday} onChange={(e) => setTempConfig(previous => ({ ...previous, scheduleMonday: e.target.value }))} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Horario Martes y Miércoles:</label>
                    <input type="text" value={tempConfig.scheduleTueWed} onChange={(e) => setTempConfig(previous => ({ ...previous, scheduleTueWed: e.target.value }))} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Horario Jueves y Viernes:</label>
                    <input type="text" value={tempConfig.scheduleThuFri} onChange={(e) => setTempConfig(previous => ({ ...previous, scheduleThuFri: e.target.value }))} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  <section style={{ border: '1px solid #C5A059', borderRadius: 10, padding: 16 }}>
                    <h4 style={{ color: '#E4C687', marginTop: 0 }}>Política de reservas de los sábados</h4>
                    <label style={{ display: 'block', color: '#FFF8EE', fontSize: 13 }}><input type="checkbox" checked={tempConfig.saturdayPolicyEnabled !== false} onChange={e => setTempConfig(previous => ({ ...previous, saturdayPolicyEnabled: e.target.checked }))} /> Mostrar aviso y solicitar aceptación al reservar un sábado</label>
                    <label style={{ display: 'block', fontSize: 13, color: '#D6CBB8', marginTop: 12 }}>Texto para la clienta
                      <textarea rows={6} value={tempConfig.saturdayNoticeMessage} onChange={e => setTempConfig(previous => ({ ...previous, saturdayNoticeMessage: e.target.value }))} style={{ display: 'block', boxSizing: 'border-box', width: '100%', padding: 12, marginTop: 6, background: '#29231F', color: '#FFF8EE', border: '1px solid #C5A059', borderRadius: 8 }} />
                    </label>
                    <p style={{ fontSize: 12, color: '#D6CBB8' }}>Guarda los cambios de Configuración para publicar el texto. Desactivar el aviso no elimina la aprobación previa de las solicitudes del sábado.</p>
                  </section>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#D6CBB8', fontSize: '14px' }}>Horario Sábados:</label>
                    <input type="text" value={tempConfig.scheduleSaturday} onChange={(e) => setTempConfig(previous => ({ ...previous, scheduleSaturday: e.target.value }))} style={{ padding: '10px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '12px' }} />
                  </div>
                  
                </div>
              )}
              </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATÁLOGO UNIFICADO INTRANET / PORTAL */}
          {adminTab === 'catalog' && (
            <div className="studio-catalog-compact" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <style>{`
                
                
                .studio-service-editor[open] { position: fixed !important; inset: 0 0 0 auto; width: min(670px, 96vw); max-height: 100vh; overflow-y: auto; z-index: 1800; box-sizing: border-box; border: 1px solid #B98A3E !important; border-radius: 0 !important; box-shadow: -20px 0 60px rgba(60, 50, 40, 0.12); padding: 20px !important; background: #322A25 !important; }
                .studio-service-editor[open] > summary { display: none; }
                .studio-editor-toolbar { position: sticky; top: -20px; z-index: 4; background: #322A25; border-bottom: 1px solid rgba(212, 175, 55, 0.35); padding: 15px 0; }
                .studio-service-editor[data-editor-tab=data] .studio-editor-options,
                .studio-service-editor[data-editor-tab=data] .studio-editor-booking,
                .studio-service-editor[data-editor-tab=data] .studio-editor-languages,
                .studio-service-editor[data-editor-tab=options] .studio-editor-data,
                .studio-service-editor[data-editor-tab=options] .studio-editor-booking,
                .studio-service-editor[data-editor-tab=options] .studio-editor-languages,
                .studio-service-editor[data-editor-tab=booking] .studio-editor-data,
                .studio-service-editor[data-editor-tab=booking] .studio-editor-options,
                .studio-service-editor[data-editor-tab=booking] .studio-editor-languages,
                .studio-service-editor[data-editor-tab=languages] .studio-editor-data,
                .studio-service-editor[data-editor-tab=languages] .studio-editor-options,
                .studio-service-editor[data-editor-tab=languages] .studio-editor-booking { display: none !important; }
.studio-catalog-savebar { position: sticky; top: 0; z-index: 20; background: #322A25; border-bottom: 1px solid rgba(212, 175, 55, 0.35); padding: 12px 0; }
                .studio-catalog-savebar h3 { font-size: 24px !important; }
                .studio-catalog-category { padding: 10px 12px !important; gap: 7px !important; background: #322A25 !important; border-color: #5A5248 !important; }
                .studio-catalog-category > div:first-child { padding: 4px !important; gap: 10px !important; }
                .studio-catalog-category h3 { font-size: 20px !important; margin: 4px 0 !important; }
                .studio-catalog-category > details:not([open]) { padding: 8px 10px !important; background: transparent !important; border: none !important; }
                .studio-catalog-category > details > summary { font-size: 11px !important; }
                .studio-catalog-service-row { display: grid !important; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 7px !important; padding: 8px 10px !important; background: #322A25 !important; border: 1px solid #C5A059 !important; border-radius: 6px !important; }
                .studio-catalog-service-heading { padding: 0 !important; gap: 10px !important; }
                .studio-catalog-service-heading > div:first-child { flex: 1 1 180px !important; }
                .studio-catalog-service-heading h4 { font-family: 'Garet', 'Poppins', sans-serif !important; font-size: 14px !important; margin: 0 0 4px !important; }
                .studio-catalog-service-heading span { font-size: 12px !important; }
                .studio-catalog-service-heading button { min-height: 38px !important; padding: 8px 10px !important; font-size: 12px !important; }
                .studio-catalog-service-row > .studio-service-editor:not([open]) { padding: 0 !important; border: none !important; background: transparent !important; }
                .studio-catalog-service-row > .studio-service-editor > summary { list-style: none; padding: 10px 12px !important; background: #322A25; border: 1px solid #C5A059; border-radius: 6px; font-size: 12px !important; color: #E4C687 !important; cursor: pointer; }
                .studio-catalog-service-row > .studio-service-editor[open] { grid-column: 1 / -1; }
                @media (max-width: 700px) {
                  .studio-catalog-service-row { grid-template-columns: 1fr !important; }
                  .studio-catalog-service-heading { flex-wrap: wrap !important; }
                  .studio-catalog-service-row button, .studio-catalog-service-row summary { min-height: 44px !important; box-sizing: border-box; }
                  .studio-catalog-savebar h3 { font-size: 21px !important; }
                }

                
                .studio-editor-booking > label { display: block; margin: 0 0 14px; font-size: 13px !important; }
                .studio-editor-booking select { margin-top: 6px; min-height: 42px !important; padding: 10px !important; font-size: 13px !important; }
                .studio-editor-booking > label:has(input[type=checkbox]) { display: flex; align-items: center; gap: 9px; padding: 9px 0; color: #D6CBB8; }
                .studio-editor-booking input[type=checkbox] { width: 16px; height: 16px; margin: 0; accent-color: #E4C687; flex-shrink: 0; }
                .studio-booking-help { border-top: 1px solid #5A5248; padding-top: 12px; margin-top: 6px; color: #D6CBB8; font-size: 12px; line-height: 1.6; }
                .studio-booking-help summary { cursor: pointer; color: #E4C687; }
                .studio-booking-help p { margin: 10px 0; }
                
                .studio-booking-buttons fieldset { border: 0; padding: 0; margin: 0 0 20px; min-width: 0; }
                .studio-booking-buttons legend { color: #D6CBB8; font-size: 12px; padding: 0; margin-bottom: 9px; }
                .studio-condition-choices { display: flex; gap: 7px; flex-wrap: wrap; }
                .studio-condition-choices button { flex: 1 1 110px; padding: 10px 12px; min-height: 42px; border: 1px solid #5A5248; border-radius: 8px; background: #322A25; color: #D6CBB8; font-size: 12px; cursor: pointer; }
                .studio-condition-choices button[aria-pressed=true] { border-color: #B8972E; background: rgba(212, 175, 55, 0.12); color: #B8972E; }
                .studio-condition-choices button:focus-visible { outline: 2px solid #B98A3E; outline-offset: 3px; }
                .studio-condition-finishes { border-top: 1px solid #5A5248; padding-top: 16px; }
                .studio-condition-unset { display: block; font-size: 11px; color: #D6CBB8; margin-top: 8px; }
                .studio-condition-reset { margin-top: 7px; background: none; border: 0; color: #D6CBB8; font-size: 11px; cursor: pointer; text-decoration: underline; padding: 4px 0; }
                .studio-new-form { padding: 18px !important; border: 1px solid #C5A059 !important; border-radius: 10px !important; gap: 14px !important; }
                .studio-new-field { display: flex; flex-direction: column; gap: 7px; flex: 1 1 160px; min-width: 0; color: #D6CBB8; font-size: 12px; }
                .studio-new-field input { width: 100% !important; box-sizing: border-box; padding: 11px !important; min-height: 42px; border-radius: 7px !important; }
                .studio-new-form button { min-height: 42px; padding: 10px 14px !important; }
                .studio-service-editor { background: #322A25; border: 1px solid #C5A059; color: #2B2521; border-radius: 12px; padding: 18px !important; }
                .studio-service-editor input:not([type=checkbox]), .studio-service-editor select, .studio-service-editor textarea { box-sizing: border-box; min-height: 44px; font-size: 14px !important; padding: 12px !important; border: 1px solid rgba(212, 175, 55, 0.22) !important; border-radius: 8px !important; background: #322A25 !important; color: #FFF8EE !important; max-width: 100%; }
                .studio-service-editor textarea { min-height: 90px; resize: vertical !important; }
                .studio-service-editor label { color: #D6CBB8 !important; font-size: 13px !important; line-height: 1.6; }
                .studio-base-field { display: flex; flex-direction: column; gap: 6px; flex: 1 1 150px; min-width: 0; }
                .studio-base-field input { width: 100% !important; }
                .studio-variant-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; flex: 1 1 350px; min-width: 0; }
                .studio-variant-fields label { display: flex; flex-direction: column; gap: 6px; }
                .studio-variant-fields input { width: 100%; }
                @media (max-width: 650px) { .studio-variant-fields { grid-template-columns: 1fr; } }
              `}</style>

              <div className="studio-catalog-savebar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ color: '#E4C687', fontSize: '28px', fontWeight: 'normal', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Catálogo · Servicios y experiencias</h3>
                  <p style={{ color: '#D6CBB8', fontSize: '14px', margin: 0 }}>Gestiona servicios, precios y packs. Guarda los cambios para conservarlos en el catálogo de este navegador.</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                  <button onClick={() => setIsAddingCategory(true)} style={{ backgroundColor: 'transparent', border: '1px solid #B98A3E', color: '#E4C687', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>+ Nueva Categoría</button>
                  <span role="status" aria-live="polite" style={{ fontSize: '12px', color: catalogHasChanges ? '#B3823B' : '#2E7D32' }}>{catalogHasChanges ? 'Cambios pendientes' : 'Catálogo guardado'}</span>
                  <button onClick={handleSaveCatalogMaster} style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '10px 18px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', boxShadow: 'none' }}>Guardar catálogo</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '10px', padding: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)' }}>
                <input type="search" aria-label="Buscar categoría o servicio" placeholder="Buscar categoría o servicio…" value={adminCatalogSearch} onChange={e => setAdminCatalogSearch(e.target.value)} style={{ flex: '1 1 200px', minWidth: 0, padding: '12px', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '7px', fontSize: '14px' }} />
                <span style={{ color: '#D6CBB8', fontSize: '13px' }}>{catalog.flatMap(cat => cat.subservices).filter(sub => sub.active !== false).length} activos · {catalog.flatMap(cat => cat.subservices).filter(sub => sub.active === false).length} desactivados</span>
              </div>
              {adminCatalogSearch.trim() && !catalog.some(cat => normalizeCatalogSearch(cat.title).includes(normalizeCatalogSearch(adminCatalogSearch)) || cat.subservices.some(sub => normalizeCatalogSearch(sub.name).includes(normalizeCatalogSearch(adminCatalogSearch)))) && <p style={{ color: '#D6CBB8', fontSize: '14px' }}>No hay servicios que coincidan con esta búsqueda.</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {([['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Desactivados']] as const).map(([status, label]) => <button type="button" key={status} aria-pressed={adminCatalogStatus === status} onClick={() => setAdminCatalogStatus(status)} style={{ padding: '10px 16px', minHeight: '44px', backgroundColor: adminCatalogStatus === status ? '#8F6D24' : '#3E342C', color: adminCatalogStatus === status ? '#2C2521' : '#2C2521', border: '1px solid #3A312A', borderRadius: '8px', cursor: 'pointer' }}>{label}</button>)}
              </div>
              {catalogSavedMsg && (
                <div style={{ padding: '12px', backgroundColor: '#8FC98F', border: '1px solid #44bb44', color: '#2E7D32', borderRadius: '8px', fontSize: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                  {catalogSavedMsg}
                </div>
              )}
              {isAddingCategory && (
                <form onSubmit={handleAddCategorySubmit} style={{ backgroundColor: '#322A25', border: '1px solid #B98A3E', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: '#E4C687', fontSize: '13px', margin: 0 }}>Añadir Categoría Principal</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Código (ej. 0.10)" value={newCatCode} onChange={(e) => setNewCatCode(e.target.value)} onFocus={(e) => e.target.select()} style={{ width: '120px', padding: '8px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="text" placeholder="Título de la Categoría" value={newCatTitle} onChange={(e) => setNewCatTitle(e.target.value)} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: '8px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setIsAddingCategory(false)} style={{ background: 'none', border: '1px solid #3A312A', color: '#D6CBB8', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Guardar Categoría</button>
                  </div>
                </form>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {catalog.map((cat, catIdx) => {
                  const query = normalizeCatalogSearch(adminCatalogSearch);
                  const categoryMatches = normalizeCatalogSearch(cat.title).includes(query);
                  const matchesStatus = (sub: SubService) => adminCatalogStatus === 'all' || (adminCatalogStatus === 'active' ? sub.active !== false : sub.active === false);
                  if (cat.subservices.length > 0 && !cat.subservices.some(sub => matchesStatus(sub) && (!query || categoryMatches || normalizeCatalogSearch(sub.name).includes(query)))) return null;
                  if (query && !categoryMatches && !cat.subservices.some(sub => normalizeCatalogSearch(sub.name).includes(query))) return null;
                  const isCategoryExpandedAdmin = !!query || (expandedCategories[`admin_cat_${cat.id}`] ?? false);
                  return (
                    <div className="studio-catalog-category" key={cat.id} style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '10px', padding: '15px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '8px' }}>
                        <div style={{ flex: '1 1 240px' }}>
                          <span style={{ color: '#E4C687', fontSize: '11px', letterSpacing: '1px' }}>{cat.code} · CATEGORÍA</span>
                          <h3 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '24px', fontWeight: 'normal', lineHeight: 1.4, margin: '8px 0' }}>{cat.title}</h3>
                          <span style={{ color: '#D6CBB8', fontSize: '13px' }}>{cat.subservices.length} servicios · {cat.subservices.filter(sub => sub.active !== false).length} activos</span>
                        </div>
                        <button type="button" aria-expanded={isCategoryExpandedAdmin} onClick={() => setExpandedCategories({ ...expandedCategories, [`admin_cat_${cat.id}`]: !isCategoryExpandedAdmin })} style={{ background: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '12px 16px', minHeight: '44px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>{isCategoryExpandedAdmin ? 'Ocultar servicios −' : 'Ver servicios +'}</button>
                      </div>
                      <details style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '9px', padding: '14px' }}>
                        <summary style={{ color: '#E4C687', cursor: 'pointer', fontSize: '13px' }}>Editar categoría y ordenar</summary>
                        <details style={{ border: '1px solid #C5A059', padding: '14px', borderRadius: '8px', marginTop: '14px' }}>
                          <summary style={{ color: '#E4C687', cursor: 'pointer' }}>Idiomas · Nombre de la categoría</summary>
                          {translationLanguagePicker()}
                          <p style={{ color: '#D6CBB8', fontSize: '12px' }}>Original: {cat.title}. Un campo vacío muestra el original en español.</p>
                          <input aria-label="Nombre traducido de la categoría" dir={catalogTranslationLang === 'ar' ? 'rtl' : 'ltr'} lang={catalogTranslationLang} value={cat.translations?.[catalogTranslationLang]?.title || ''} onChange={event => { const title = event.target.value; setCatalog(previous => previous.map(category => category.id !== cat.id ? category : { ...category, translations: { ...category.translations, [catalogTranslationLang]: { title } } })); }} style={{ width: '100%', boxSizing: 'border-box', padding: '12px', background: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '7px' }} />
                        </details>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', marginTop: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '8px', padding: '12px' }}>
                            <label style={{ color: '#E4C687', fontSize: '12px', fontWeight: 'bold' }}>Fotografía de la categoría</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              <div style={{ width: '140px', height: '105px', borderRadius: '8px', overflow: 'hidden', background: '#3E342C', flexShrink: 0, border: '1px solid #3A312A' }}>
                                {(() => { const first = cat.subservices.find(s => s.active !== false); const shown = cat.imageUrl || first?.imageUrl; return shown
                                  ? <img src={shown} alt={'Foto de ' + cat.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${(cat.imageUrl ? cat.imagePosition?.x : first?.imagePosition?.x) ?? 50}% ${(cat.imageUrl ? cat.imagePosition?.y : first?.imagePosition?.y) ?? 50}%` }} />
                                  : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#E4C687', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '26px', letterSpacing: '3px' }}>LS</span>; })()}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '180px' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '44px', padding: '10px 14px', background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: photoUploadBusy ? 'wait' : 'pointer' }}>
                                  <ImagePlus size={16} strokeWidth={1.8} aria-hidden="true" />
                                  {photoUploadBusy ? 'Subiendo…' : (cat.imageUrl ? 'Sustituir foto de la categoría' : 'Subir foto de la categoría')}
                                  <input type="file" accept="image/png,image/jpeg,image/webp" disabled={photoUploadBusy} onChange={(e) => { handleCategoryPhotoSelect(cat.id, e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} />
                                </label>
                                {cat.imageUrl && <button type="button" disabled={photoUploadBusy} onClick={() => handleCategoryPhotoDelete(cat.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px', padding: '10px 14px', background: '#322A25', color: '#C0392B', border: '1px solid #dfaaa3', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                  <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" /> Eliminar foto
                                </button>}
                                {cat.imageUrl && <p style={{ color: '#D6CBB8', fontSize: '11px', margin: 0 }}>La miniatura del listado de categorías del portal usa esta foto.</p>}
                                {!cat.imageUrl && <p style={{ color: '#D6CBB8', fontSize: '11px', margin: 0 }}>Si no subes una foto propia, la categoría muestra la foto de su primer servicio.</p>}
                              </div>
                            </div>
                          </div>
                          <label style={{ color: '#D6CBB8', fontSize: '13px' }}>Código<input type="text" value={cat.code} onChange={e => handleUpdateCategoryCode(cat.id, e.target.value)} style={{ display: 'block', width: '90px', padding: '12px', boxSizing: 'border-box', marginTop: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '7px' }} /></label>
                          <label style={{ flex: '1 1 220px', color: '#D6CBB8', fontSize: '13px' }}>Nombre de la categoría<input type="text" value={cat.title} onChange={e => handleUpdateCategoryTitle(cat.id, e.target.value)} style={{ display: 'block', width: '100%', padding: '12px', boxSizing: 'border-box', marginTop: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '7px', fontSize: '14px' }} /></label>
                          <label style={{ flex: '1 1 100%', color: '#E5D7BF', fontSize: 13 }}>Eslogan de la categoría · texto corto<input type="text" maxLength={140} value={cat.slogan || ''} placeholder="Conocemos tu cabello. Diseñamos tu camino." onChange={e => { const value = e.target.value; setCatalog(previous => previous.map(category => category.id === cat.id ? { ...category, slogan: value } : category)); }} style={{ display: 'block', width: '100%', padding: 12, boxSizing: 'border-box', marginTop: 6, backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: 7 }} /><small>Se muestra debajo del título. Máximo 140 caracteres.</small></label>
                          <button type="button" disabled={catIdx === 0} onClick={() => handleMoveCategory(catIdx, -1)} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '12px', borderRadius: '7px', cursor: 'pointer' }}>Subir ↑</button>
                          <button type="button" disabled={catIdx === catalog.length - 1} onClick={() => handleMoveCategory(catIdx, 1)} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '12px', borderRadius: '7px', cursor: 'pointer' }}>Bajar ↓</button>
                          <button type="button" onClick={() => handleDeleteCategory(cat.id)} style={{ background: '#322A25', border: '1px solid #74433e', color: '#C0392B', padding: '12px', borderRadius: '7px', cursor: 'pointer' }}>Eliminar categoría</button>
                        </div>
                        <p style={{ color: '#D6CBB8', fontSize: '12px', marginBottom: 0 }}>Después de modificar el nombre, código u orden, pulsa «Guardar catálogo».</p>
                      </details>
                      {isCategoryExpandedAdmin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '15px', borderLeft: '2px solid rgba(212, 175, 55, 0.2)', marginTop: '8px' }}>
                          {cat.subservices.filter(sub => matchesStatus(sub) && (!query || categoryMatches || normalizeCatalogSearch(sub.name).includes(query))).map((sub) => {
                            const isExpandedAdmin = true;
                            return (
                              <div className="studio-catalog-service-row" key={sub.id} style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div className="studio-catalog-service-heading" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '8px' }}>
                                  <div style={{ flex: '1 1 220px' }}><h4 style={{ color: '#FFF8EE', fontSize: '18px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', lineHeight: 1.4, margin: '0 0 8px' }}>{sub.name}</h4><span style={{ color: '#E4C687', fontSize: '14px' }}>{sub.price}</span><span style={{ color: '#D6CBB8', fontSize: '13px', marginLeft: '14px' }}>{sub.duration}</span></div>
                                  <span style={{ color: sub.active === false ? '#5C5248' : '#2E7D32', border: '1px solid #3A312A', borderRadius: '20px', padding: '6px 12px', fontSize: '12px' }}>{sub.active === false ? 'Desactivado' : 'Activo'}</span>
                                  <button type="button" onClick={() => { setPreviewServiceId(sub.id); setPreviewVariantId(sub.hasVariants ? sub.variants?.[0]?.id || '' : ''); }} style={{ background: 'none', color: '#E4C687', border: '1px solid #C5A059', borderRadius: '7px', padding: '10px 14px', minHeight: '44px', cursor: 'pointer' }}>Vista previa</button>
                                </div>
                                <details open={catalogEditorId === sub.id} onToggle={event => {
                                  if (event.currentTarget.open) { if (catalogEditorId !== sub.id) { setCatalogEditorId(sub.id); setCatalogEditorTab('data'); } }
                                  else if (catalogEditorId === sub.id) setCatalogEditorId(null);
                                }} data-editor-tab={catalogEditorTab} className="studio-service-editor"  style={{ borderTop: '1px solid #3A312A', padding: '12px 8px 4px' }}>
                                  <summary style={{ color: '#E4C687', fontSize: '14px', cursor: 'pointer', padding: '8px 0' }}>Editar</summary>
                                  <div className="studio-editor-toolbar">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                      <h3 style={{ color: '#FFF8EE', fontSize: '22px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: 0 }}>{sub.name}</h3>
                                      <button type="button" onClick={() => setCatalogEditorId(null)}>Cerrar</button>
                                    </div>
                                    <nav aria-label="Apartados del servicio" style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', margin: '15px 0' }}>
                                      {([['data', 'Datos'], ['options', 'Opciones'], ['booking', 'Reserva'], ['languages', 'Idiomas']] as const).map(([tab, label]) =>
                                        <button type="button" key={tab} aria-pressed={catalogEditorTab === tab} onClick={() => setCatalogEditorTab(tab)}
                                          style={{ background: catalogEditorTab === tab ? '#8F6D24' : '#3E342C', color: catalogEditorTab === tab ? '#2C2521' : '#8F6D24', padding: '10px', border: '1px solid #C5A059', borderRadius: '6px', cursor: 'pointer' }}>{label}</button>)}
                                    </nav>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                      <button type="button" onClick={handleSaveCatalogMaster} style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', padding: '10px', border: 0, cursor: 'pointer' }}>Guardar cambios</button>
                                      <button type="button" onClick={() => { setPreviewServiceId(sub.id); setPreviewVariantId(sub.hasVariants ? sub.variants?.[0]?.id || '' : ''); }}>Vista previa</button>
                                      <span style={{ color: '#D6CBB8', fontSize: '12px' }}>{catalogHasChanges ? 'Cambios pendientes' : 'Catálogo guardado'}</span>
                                    </div>
                                    <p style={{ color: '#D6CBB8', fontSize: '11px', marginBottom: 0 }}>Guardar conserva todos los cambios pendientes del catálogo.</p>
                                    {catalogSavedMsg && <p role="status" style={{ color: '#2E7D32', fontSize: '12px' }}>{catalogSavedMsg}</p>}
                                  </div>

                                  <details open className="studio-editor-languages" style={{ padding: '16px', marginTop: '16px', border: '1px solid #C5A059', borderRadius: '10px' }}>
                                    <summary style={{ color: '#E4C687', cursor: 'pointer' }}>Idiomas · Traducciones del servicio</summary>
                                    <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.6 }}>Escribe la traducción de cada campo. Si queda vacío, el portal mostrará el contenido original en español. Los precios y la duración se mantienen comunes.</p>
                                    <label>Idioma de la traducción<select value={catalogTranslationLang} onChange={event => setCatalogTranslationLang(event.target.value)} style={{ display: 'block', width: '100%', margin: '8px 0 16px' }}>
                                      {Object.keys(TRANSLATIONS).filter(language => language !== 'es').map(language => <option key={language} value={language}>{({ en: 'English', fr: 'Français', it: 'Italiano', pt: 'Português', de: 'Deutsch', nl: 'Nederlands', pl: 'Polski', cs: 'Čeština', nb: 'Norsk', sv: 'Svenska', ar: 'العربية' } as Record<string, string>)[language]}</option>)}
                                    </select></label>
                                    {([{ field: 'name', label: 'Nombre del servicio' }, { field: 'slogan', label: 'Eslogan corto' }, { field: 'description', label: 'Descripción' }, { field: 'includesText', label: 'Qué incluye' }, { field: 'achievedText', label: '¿Qué te llevas?' }, { field: 'forWhomText', label: '¿Es para ti?' }, { field: 'alertText', label: 'Aviso del servicio' }] as { field: keyof ServiceTranslation; label: string }[]).map(({field, label}) => <label key={field} style={{ display: 'block', marginBottom: '14px' }}>{label}<span style={{ display: 'block', color: '#D6CBB8', fontSize: '12px', margin: '6px 0', whiteSpace: 'pre-wrap' }}>Original: {sub[field] || 'Sin contenido'}</span><textarea dir={catalogTranslationLang === 'ar' ? 'rtl' : 'ltr'} lang={catalogTranslationLang} value={sub.translations?.[catalogTranslationLang]?.[field] || ''} onChange={event => updateServiceTranslation(cat.id, sub.id, field, event.target.value)} placeholder="Añade aquí la traducción" style={{ width: '100%' }} /></label>)}

                                    {!!sub.variants?.length && <section style={{ borderTop: '1px solid #3A312A', paddingTop: '14px' }}>
                                      <h4 style={{ color: '#E4C687', margin: '0 0 12px' }}>Nombres de variantes · {catalogTranslationLang.toUpperCase()}</h4>
                                      <p style={{ color: '#D6CBB8', fontSize: '12px' }}>Deja el campo vacío para mostrar el nombre original. Precio y duración son comunes a todos los idiomas.</p>
                                      {sub.variants.map(variant => <label key={variant.id} style={{ display: 'block', marginBottom: '14px' }}>Original: {variant.name}<input dir={catalogTranslationLang === 'ar' ? 'rtl' : 'ltr'} lang={catalogTranslationLang} value={variant.translations?.[catalogTranslationLang]?.name || ''} onChange={event => { const name = event.target.value; setCatalog(previous => previous.map(category => category.id !== cat.id ? category : { ...category, subservices: category.subservices.map(service => service.id !== sub.id ? service : { ...service, variants: service.variants?.map(item => item.id !== variant.id ? item : { ...item, translations: { ...item.translations, [catalogTranslationLang]: { name } } }) }) })); }} style={{ display: 'block', width: '100%', marginTop: '6px' }} /></label>)}
                                    </section>}
                                    <button type="button" onClick={() => { if (window.confirm('¿Borrar todos los textos traducidos de este servicio en el idioma seleccionado? Se mostrará el original en español.')) setCatalog(previous => previous.map(category => category.id !== cat.id ? category : { ...category, subservices: category.subservices.map(service => { if (service.id !== sub.id) return service; const translations = { ...service.translations }; delete translations[catalogTranslationLang]; return { ...service, translations, variants: service.variants?.map(variant => { const variantTranslations = { ...variant.translations }; delete variantTranslations[catalogTranslationLang]; return { ...variant, translations: variantTranslations }; }) }; }) })); }} style={{ background: 'none', border: '1px solid #3A312A', color: '#C0392B', padding: '12px', borderRadius: '7px', cursor: 'pointer' }}>Borrar traducción de este idioma</button>
                                  </details>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '16px' }}>

                                <button type="button" onClick={() => { setPreviewServiceId(sub.id); setPreviewVariantId(sub.hasVariants ? sub.variants?.[0]?.id || '' : ''); }} style={{ alignSelf: 'flex-start', background: 'none', color: '#E4C687', border: '1px solid #B98A3E', borderRadius: '5px', padding: '7px 12px', cursor: 'pointer' }}>Vista previa · Clienta</button>
                                <label style={{ color: sub.active === false ? '#5C5248' : '#8F6D24', fontSize: '12px' }}>
                                  <input type="checkbox" checked={sub.active !== false} onChange={e => {
                                    const active = e.target.checked;
                                    setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(item => item.id === sub.id ? { ...item, active } : item) } : c));
                                    if (!active) {
                                      setSelectedServicesToBook(previous => previous.filter(item => item.sub.id !== sub.id));
                                      setModalServices(previous => previous.filter(item => item.sub.id !== sub.id));
                                    }
                                  }} /> {sub.active === false ? 'Desactivado · Oculto para nuevas reservas' : 'Activo · Disponible para reservar'}
                                </label>

                                <div className="studio-editor-data" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <label className="studio-base-field">Nombre del servicio<input type="text" value={sub.name} onChange={(e) => {
                                      const updatedName = e.target.value;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, name: updatedName } : s) } : c));
                                    }} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', flex: 1 }} /></label>
                                    <label className="studio-base-field">Precio base<input type="text" value={sub.price} onChange={(e) => {
                                      const updatedPrice = e.target.value;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, price: updatedPrice } : s) } : c));
                                    }} style={{ backgroundColor: '#322A25', border: '1px solid #B98A3E', color: '#FFF8EE', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', width: '100px' }} /></label>
                                    <label className="studio-base-field">Duración base<input type="text" value={sub.duration} onChange={(e) => {
                                      const updatedDur = e.target.value;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, duration: updatedDur } : s) } : c));
                                    }} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#D6CBB8', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', width: '80px' }} /></label>
                                  </div>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <label style={{ color: '#E4C687', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                      <input type="checkbox" checked={!!sub.hasVariants} onChange={() => handleToggleVariants(cat.id, sub.id)} style={{ accentColor: '#8F6D24' }} />
                                      Opciones de largo o pack
                                    </label>
                                    <button onClick={() => handleDeleteSubservice(cat.id, sub.id)} style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', fontSize: '14px' }}>X</button>
                                  </div>
                                </div>
                                <div className="studio-editor-booking" style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="checkbox" checked={!!sub.showAlertBadge} onChange={(e) => {
                                      const val = e.target.checked;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, showAlertBadge: val } : s) } : c));
                                    }} style={{ accentColor: '#8F6D24', width: '16px', height: '16px', cursor: 'pointer' }} />
                                    <span style={{ color: '#E4C687', fontSize: '14px', fontWeight: 'bold' }}>💡 Activar aviso/advertencia en este servicio</span>
                                  </div>
                                  {sub.showAlertBadge && (
                                    <input type="text" value={sub.alertText || ''} onChange={(e) => {
                                      const val = e.target.value;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, alertText: val } : s) } : c));
                                    }} placeholder="Texto del aviso (ej. ⚠️ Recuerda añadir tu peinado)" style={{ width: '100%', padding: '6px', backgroundColor: '#322A25', border: '1px solid #B98A3E', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }} />
                                  )}
                                </div>
                                {sub.hasVariants && (
                                  <div className="studio-editor-options" style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                    <span style={{ color: '#E4C687', fontSize: '14px', fontWeight: 'bold' }}>Opciones del servicio</span>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                                      {sub.variants?.map((v) => (
                                        <div key={v.id} style={{ backgroundColor: '#322A25', border: '1px solid #B98A3E', borderRadius: '4px', padding: '6px 10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#FFF8EE', width: '100%', boxSizing: 'border-box' }}>
                                          <div className="studio-variant-fields">
                                            {(['name', 'description', 'price', 'duration'] as const).map(field => <label key={field}>{({ name: 'Nombre de la opción', description: 'Descripción · Largo o qué incluye', price: 'Precio', duration: 'Duración' })[field]}<input aria-label={`${field} de ${v.name}`} type="text" value={v[field] || ''} onChange={e => {
                                              const value = e.target.value;
                                              setCatalog(previous => previous.map(category => category.id === cat.id ? { ...category, subservices: category.subservices.map(service => service.id === sub.id ? { ...service, variants: service.variants?.map(variant => variant.id === v.id ? { ...variant, [field]: value } : variant) } : service) } : category));
                                            }} /></label>)}
                                          </div>
                                          {[-1, 1].map(direction => <button type="button" key={direction} aria-label={direction < 0 ? 'Subir opción' : 'Bajar opción'}
                                            disabled={direction < 0 ? sub.variants?.[0]?.id === v.id : sub.variants?.[sub.variants.length - 1]?.id === v.id}
                                            onClick={() => setCatalog(previous => previous.map(category => category.id !== cat.id ? category : {
                                              ...category, subservices: category.subservices.map(service => {
                                                if (service.id !== sub.id) return service;
                                                const variants = [...(service.variants || [])], index = variants.findIndex(item => item.id === v.id), target = index + direction;
                                                if (target < 0 || target >= variants.length) return service;
                                                [variants[index], variants[target]] = [variants[target], variants[index]];
                                                return { ...service, variants };
                                              })
                                            }))} style={{ padding: '8px', background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', cursor: 'pointer' }}>{direction < 0 ? '↑' : '↓'}</button>)}
                                          <button onClick={() => handleDeleteVariant(cat.id, sub.id, v.id)} style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', fontSize: '14px' }}>x</button>
                                        </div>
                                      ))}
                                    </div>
                                    <form className="studio-new-form" onSubmit={(e) => handleAddVariant(cat.id, sub.id, e)} style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      <label className="studio-new-field">Nombre de la opción *<input required type="text" placeholder="Nombre (ej. M)" value={newVariantName} onChange={(e) => setNewVariantName(e.target.value)} style={{ width: '80px', padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} /></label>
                                      <label className="studio-new-field">Precio *<input required type="text" placeholder="Precio (ej. 320,00 €)" value={newVariantPrice} onChange={(e) => setNewVariantPrice(e.target.value)} style={{ width: '120px', padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} /></label>
                                      <label className="studio-new-field">Duración *<input required type="text" placeholder="Duración (ej. 240 min)" value={newVariantDuration} onChange={(e) => setNewVariantDuration(e.target.value)} style={{ width: '110px', padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} /></label>
                                      <p style={{ width: '100%', fontSize: '12px', color: '#D6CBB8', margin: 0 }}>Se añadirá a la lista. Pulsa Guardar catálogo para conservarla.</p>
                                      <button type="button" onClick={() => { setNewVariantName(''); setNewVariantPrice(''); setNewVariantDuration(''); }} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid #3A312A', color: '#D6CBB8', borderRadius: '7px', cursor: 'pointer' }}>Cancelar</button>
                                      <button type="submit" style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>+ Añadir opción</button>
                                    </form>
                                  </div>
                                )}
                                {isExpandedAdmin && (
                                  <div style={{ backgroundColor: '#322A25', padding: '10px', borderRadius: '6px', fontSize: '14px', color: '#D6CBB8', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid #B98A3E', marginTop: '4px' }}>
                                    <div className="studio-editor-data" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <h4 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', fontSize: '20px', margin: '8px 0 12px' }}>Contenido para la clienta</h4>
                                      <label style={{ color: '#E4C687', fontSize: 12 }}>Eslogan del servicio · texto corto<input type="text" maxLength={140} value={sub.slogan || ''} placeholder="Deja de adivinar qué necesita tu pelo." onChange={e => { const value = e.target.value; setCatalog(previous => previous.map(category => category.id === cat.id ? { ...category, subservices: category.subservices.map(service => service.id === sub.id ? { ...service, slogan: value } : service) } : category)); }} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, marginBottom: 8, padding: 10, backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: 5 }} /><span>Visible en la tarjeta. La descripción completa aparece al pulsar «Ver servicio».</span></label>
                                      <label style={{ color: '#E4C687', fontSize: '12px' }}>Descripción:</label>
                                      <textarea value={sub.description} onChange={(e) => {
                                        const val = e.target.value;
                                        setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, description: val } : s) } : c));
                                      }} rows={2} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '6px', borderRadius: '4px', fontSize: '14px' }} />
                                    </div>
<section className="studio-editor-booking studio-booking-buttons" style={{ padding: '16px', border: '1px solid #3A312A', borderRadius: '10px', background: '#322A25' }}>
                                      <h4 style={{ color: '#FFF8EE', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', fontSize: '17px', margin: '0 0 18px' }}>Condiciones de reserva</h4>
                                      <fieldset>
                                        <legend>Reserva</legend>
                                        <div className="studio-condition-choices">
                                          {([{ value: false, label: 'Directa' }, { value: true, label: 'Aprobación de Ana' }]).map(option => <button type="button" key={option.label} aria-pressed={!!sub.requiresAssessment === option.value} onClick={() => setCatalog(previous => previous.map(category => category.id !== cat.id ? category : { ...category, subservices: category.subservices.map(service => service.id !== sub.id ? service : { ...service, requiresAssessment: option.value }) }))}>{option.label}</button>)}
                                        </div>
                                      </fieldset>
                                      <fieldset>
                                        <legend>¿Cómo se puede reservar este servicio?</legend>
                                        <div className="studio-condition-choices">
                                          {([{ value: 'main', label: 'Principal' }, { value: 'toner', label: 'Complemento de matiz' }, { value: 'styling', label: 'Complemento de peinado' }] as const).map(option => <button type="button" key={option.value} aria-pressed={option.value === 'main' ? !sub.isTonerService && !sub.isStylingService : option.value === 'toner' ? !!sub.isTonerService : !!sub.isStylingService} onClick={() => setCatalog(previous => previous.map(category => category.id !== cat.id ? category : { ...category, subservices: category.subservices.map(service => service.id !== sub.id ? service : { ...service, isTonerService: option.value === 'toner', isStylingService: option.value === 'styling', tonerPolicy: option.value === 'toner' ? undefined : service.tonerPolicy, stylingPolicy: option.value === 'styling' ? undefined : service.stylingPolicy }) }))}>{option.label}</button>)}
                                        </div>
                                      </fieldset>
                                      {(!sub.isTonerService || !sub.isStylingService) && <div className="studio-condition-finishes">
                                        <h5 style={{ fontSize: '13px', color: '#E4C687', margin: '0 0 12px', fontWeight: 'normal' }}>Acabados del servicio</h5>
                                        {([{ field: 'tonerPolicy', label: 'Matiz', hidden: !!sub.isTonerService }, { field: 'stylingPolicy', label: 'Peinado', hidden: !!sub.isStylingService }] as const).filter(row => !row.hidden).map(row => <fieldset key={row.field}>
                                          <legend>{row.label}</legend>
                                          <div className="studio-condition-choices">
                                            {([{ value: 'included', label: 'Incluido' }, { value: 'required', label: 'Obligatorio · Aparte' }, { value: 'optional', label: 'Opcional · Aparte' }, { value: 'not_applicable', label: 'No necesario' }] as const).map(option => <button type="button" key={option.value} aria-pressed={sub[row.field] === option.value} onClick={() => setCatalog(previous => previous.map(category => category.id !== cat.id ? category : { ...category, subservices: category.subservices.map(service => service.id !== sub.id ? service : { ...service, [row.field]: option.value }) }))}>{option.label}</button>)}
                                          </div>
                                          {sub[row.field] && <p style={{ fontSize: 12, color: '#E4C687', lineHeight: 1.5 }}>{FINISH_COPY[sub[row.field]!]}</p>}
                                          {(sub[row.field] === 'required' || sub[row.field] === 'optional') && (() => {
                                            const kind: FinishKind = row.field === 'stylingPolicy' ? 'styling' : 'toner';
                                            const idsField = kind === 'styling' ? 'stylingAllowedIds' : 'tonerAllowedIds';
                                            const messageField = kind === 'styling' ? 'stylingMessage' : 'tonerMessage';
                                            const options = catalog.flatMap(c => c.subservices).filter(s => s.id !== sub.id && isFinish(s, kind) && s.active !== false && (!s.isCutGoService || sub.allowCutGo));
                                            const patch = (changes: Partial<SubService>) => setCatalog(previous => previous.map(c => c.id !== cat.id ? c : { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, ...changes } : s) }));
                                            return <div style={{ padding: 12, border: '1px solid #5A5248', borderRadius: 8, marginTop: 10 }}>
                                              {kind === 'styling' && <label style={{ display: 'block', fontSize: 13, marginBottom: 12 }}><input type="checkbox" checked={!!sub.allowCutGo} onChange={e => patch({ allowCutGo: e.target.checked })} /> Permitir Cut & Go como alternativa sin secado</label>}
                                              <strong style={{ fontSize: 12 }}>Complementos permitidos</strong>
                                              <p style={{ fontSize: 12, color: '#D6CBB8' }}>Selecciona los servicios compatibles. Cada uno conserva su precio y duración del catálogo.</p>
                                              <label style={{ display: 'block', fontSize: 12, marginBottom: 8 }}><input type="checkbox" checked={sub[idsField] === undefined} onChange={e => patch({ [idsField]: e.target.checked ? undefined : options.map(o => o.id) })} /> Todos los complementos compatibles, incluidos los futuros</label>
                                              {options.map(option => <label key={option.id} style={{ display: 'block', fontSize: 13, padding: '6px 0' }}><input type="checkbox" checked={sub[idsField] === undefined || sub[idsField]!.includes(option.id)} onChange={e => {
                                                const ids = sub[idsField] ?? options.map(o => o.id);
                                                patch({ [idsField]: e.target.checked ? Array.from(new Set([...ids, option.id])) : ids.filter(id => id !== option.id) });
                                              }} /> {option.name} · {option.price} · {option.duration}</label>)}
                                              {!options.length && <p role="alert" style={{ fontSize: 12 }}>Configura primero un servicio del catálogo como complemento de {row.label.toLowerCase()}.</p>}
                                              <label style={{ display: 'block', fontSize: 12, marginTop: 12 }}>Mensaje para la clienta
                                                <textarea rows={3} value={sub[messageField] || ''} placeholder="Selecciona el acabado para completar tu servicio. Consulta aquí sus opciones, precios y duración." onChange={e => patch({ [messageField]: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', background: '#29231F', color: '#FFF8EE', padding: 10, marginTop: 6, borderRadius: 8 }} />
                                              </label>
                                            </div>;
                                          })()}
                                          {!sub[row.field] && <span className="studio-condition-unset">Sin configurar · Conserva la reserva actual</span>}
                                          {!!sub[row.field] && <button type="button" className="studio-condition-reset" onClick={() => setCatalog(previous => previous.map(category => category.id !== cat.id ? category : { ...category, subservices: category.subservices.map(service => service.id !== sub.id ? service : { ...service, [row.field]: undefined }) }))}>Restablecer</button>}
                                        </fieldset>)}
                                      </div>}
                                      {sub.isStylingService && <div style={{ padding: 12, border: '1px solid #5A5248', borderRadius: 8 }}>
                                        <label style={{ fontSize: 13 }}><input type="checkbox" checked={!!sub.isCutGoService} onChange={e => {
                                          const checked = e.target.checked;
                                          setCatalog(previous => previous.map(c => c.id !== cat.id ? c : { ...c, subservices: c.subservices.map(s => s.id !== sub.id ? s : { ...s, isCutGoService: checked, price: checked ? '3 €' : s.price }) }));
                                        }} /> Este complemento es Cut & Go · Sin secado</label>
                                        <p style={{ fontSize: 12, color: '#E4C687' }}>Al activarlo se propone 3 € de producto. Revisa su nombre, precio, duración y variantes en Datos y Opciones. Se cobra como alternativa al peinado y solo puede acompañar servicios que lo permitan. No incluye secado.</p>
                                      </div>}
                                      <details className="studio-booking-help">
                                        <summary>Ayuda</summary>
                                        <p>Aprobación de Ana deja la solicitud pendiente. El Bizum se pide después de aceptar.</p>
                                        <p>Configura cada servicio según su protocolo real. Incluido no suma cargos ni tiempo extra. Obligatorio impide continuar sin un complemento compatible. Opcional permite omitirlo. No necesario solo afecta a este servicio. Los ajustes anteriores de Añadir se conservan como obligatorios: revísalos antes de publicar.</p>
                                      </details>
                                    </section>
                                    <div className="studio-editor-data" style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '8px', padding: '12px' }}>
                                      <label style={{ color: '#E4C687', fontSize: '12px', fontWeight: 'bold' }}>Fotografía del servicio</label>
                                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                        <div style={{ width: '140px', height: '105px', borderRadius: '8px', overflow: 'hidden', background: '#3E342C', flexShrink: 0, border: '1px solid #3A312A' }}>
                                          {sub.imageUrl
                                            ? <img src={sub.imageUrl} alt={'Foto actual de ' + sub.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${sub.imagePosition?.x ?? 50}% ${sub.imagePosition?.y ?? 50}%` }} />
                                            : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#E4C687', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '26px', letterSpacing: '3px' }}>LS</span>}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '180px' }}>
                                          <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '44px', padding: '10px 14px', background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: photoUploadBusy ? 'wait' : 'pointer' }}>
                                            <ImagePlus size={16} strokeWidth={1.8} aria-hidden="true" />
                                            {photoUploadBusy ? 'Subiendo…' : (sub.imageUrl ? 'Sustituir por otra foto' : 'Subir foto desde el dispositivo')}
                                            <input type="file" accept="image/*" disabled={photoUploadBusy} onChange={(e) => { handleServicePhotoSelect(cat.id, sub.id, e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} />
                                          </label>
                                          {sub.imageUrl && <button type="button" disabled={photoUploadBusy} onClick={() => handleServicePhotoDelete(cat.id, sub.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px', padding: '10px 14px', background: '#322A25', color: '#C0392B', border: '1px solid #dfaaa3', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                            <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" /> Eliminar foto
                                          </button>}
                                          {sub.imageUrl && <>
                                            <label style={{ color: '#D6CBB8', fontSize: '12px' }}>Encuadre horizontal: {sub.imagePosition?.x ?? 50}%</label>
                                            <input type="range" min={0} max={100} value={sub.imagePosition?.x ?? 50} onChange={(e) => updateSubserviceField(cat.id, sub.id, { imagePosition: { x: Number(e.target.value), y: sub.imagePosition?.y ?? 50 } })} style={{ accentColor: '#8F6D24' }} />
                                            <label style={{ color: '#D6CBB8', fontSize: '12px' }}>Encuadre vertical: {sub.imagePosition?.y ?? 50}%</label>
                                            <input type="range" min={0} max={100} value={sub.imagePosition?.y ?? 50} onChange={(e) => updateSubserviceField(cat.id, sub.id, { imagePosition: { x: sub.imagePosition?.x ?? 50, y: Number(e.target.value) } })} style={{ accentColor: '#8F6D24' }} />
                                          </>}
                                          {sub.imageIsAiPlaceholder && <p style={{ color: '#D6CBB8', fontSize: '11px', margin: 0 }}>Esta es una imagen ilustrativa generada. Al subir tu propia foto se retirará la etiqueta del portal.</p>}
                                        </div>
                                      </div>
                                      <input type="url" value={sub.imageUrl || ''} onChange={(e) => updateSubserviceField(cat.id, sub.id, { imageUrl: e.target.value, imageIsAiPlaceholder: e.target.value ? false : sub.imageIsAiPlaceholder })} placeholder="O pega la URL de una foto (https://...)" style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '6px', borderRadius: '4px', fontSize: '13px' }} />
                                    </div>
                                    <div className="studio-editor-data" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <label style={{ color: '#E4C687', fontSize: '12px' }}>¿Qué incluye?</label>
                                      <input type="text" value={sub.includesText || ''} onChange={(e) => {
                                        const val = e.target.value;
                                        setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, includesText: val } : s) } : c));
                                      }} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '6px', borderRadius: '4px', fontSize: '14px' }} />
                                    </div>
                                    <div className="studio-editor-data" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <label style={{ color: '#E4C687', fontSize: '12px' }}>¿Qué te llevas?:</label>
                                      <input type="text" value={sub.achievedText || ''} onChange={(e) => {
                                        const val = e.target.value;
                                        setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, achievedText: val } : s) } : c));
                                      }} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '6px', borderRadius: '4px', fontSize: '14px' }} />
                                    </div>
                                    <div className="studio-editor-data" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      <label style={{ color: '#E4C687', fontSize: 12 }}>¿Es para ti?
                                        <textarea value={sub.forWhomText || ''} onChange={e => { const value = e.target.value; setCatalog(previous => previous.map(category => category.id === cat.id ? { ...category, subservices: category.subservices.map(service => service.id === sub.id ? { ...service, forWhomText: value } : service) } : category)); }} rows={3} placeholder="Si notas cambios en tu cabello o quieres saber cómo cuidarlo…" style={{ display: 'block', width: '100%', boxSizing: 'border-box', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: 10, borderRadius: 5, marginTop: 6 }} />
                                      </label>
                                    </div>
                                  </div>
                                )}
                                  </div>
                                </details>
                              </div>
                            );
                          })}
                          {isAddingSub === cat.id ? (
                            <form className="studio-new-form" onSubmit={(e) => handleAddSubserviceSubmit(cat.id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#322A25', padding: '12px', borderRadius: '6px', border: '1px solid #3A312A', marginTop: '5px' }}>
                              <h5 style={{ color: '#E4C687', fontSize: '12px', margin: 0 }}>Nuevo servicio</h5>
                              <label className="studio-new-field">Nombre del servicio *<input type="text" placeholder="Nombre del servicio" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} /></label>
                              <label className="studio-new-field">Descripción para la clienta<input type="text" placeholder="Descripción breve" value={newSubDesc} onChange={(e) => setNewSubDesc(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} /></label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <label className="studio-new-field">Duración *<input required type="text" placeholder="Duración (ej. 45 min)" value={newSubDur} onChange={(e) => setNewSubDur(e.target.value)} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} /></label>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select aria-label="Tipo de precio" value={newSubPriceType} onChange={(e) => setNewSubPriceType(e.target.value as any)} style={{ padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }}>
                                  <option value="desde">Desde</option>
                                  <option value="aprox">Aprox.</option>
                                  <option value="fijo">Fijo</option>
                                  <option value="consultar">Consultar</option>
                                </select>
                                <label className="studio-new-field">Precio<input type="text" placeholder="Precio (ej. 45 €)" value={newSubPrice} onChange={(e) => setNewSubPrice(e.target.value)} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} /></label>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ color: '#E4C687', fontSize: '12px' }}>¿Qué incluye?</label>
                                <input type="text" placeholder="Ej. Lavado sensorial y protector térmico" value={newSubIncludes} onChange={(e) => setNewSubIncludes(e.target.value)} style={{ padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ color: '#E4C687', fontSize: '12px' }}>¿Qué te llevas?:</label>
                                <input type="text" placeholder="Ej. Brillo extremo y duración prolongada" value={newSubAchieved} onChange={(e) => setNewSubAchieved(e.target.value)} style={{ padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} />
                              </div>
                              <div style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', padding: '8px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input type="checkbox" checked={newSubAlertBadge} onChange={(e) => setNewSubAlertBadge(e.target.checked)} style={{ accentColor: '#8F6D24' }} />
                                  <span style={{ color: '#E4C687', fontSize: '14px', fontWeight: 'bold' }}>Activar aviso en este servicio</span>
                                </div>
                                {newSubAlertBadge && (
                                  <input type="text" placeholder="Texto del aviso..." value={newSubAlertText} onChange={(e) => setNewSubAlertText(e.target.value)} style={{ padding: '6px', backgroundColor: '#322A25', border: '1px solid #B98A3E', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} />
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button type="button" onClick={() => setIsAddingSub(null)} style={{ background: 'none', border: 'none', color: '#D6CBB8', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Añadir Subservicio</button>
                              </div>
                            </form>
                          ) : (
                            <button onClick={() => setIsAddingSub(cat.id)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#E4C687', fontSize: '14px', cursor: 'pointer', padding: '2px 0' }}>+ Añadir servicio a esta categoría</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button onClick={handleSaveCatalogMaster} style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: 'none' }}>Guardar catálogo</button>
              </div>
            </div>
          )}

          {/* TAB 4: CLIENTES & ADN CAPILAR */}
          {adminTab === 'clients' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {returnToAppointmentId && <button type="button" onClick={() => {
                const appointment = appointments.find(item => item.id === returnToAppointmentId);
                setAdminTab('agenda'); setReturnToAppointmentId(null);
                if (appointment) {
                  const date = new Date(appointment.dateKey + 'T12:00:00');
                  setFechaSeleccionada(date); setMesNavegacion(new Date(date.getFullYear(), date.getMonth(), 1));
                  setViewApptModal(appointment);
                } else alert('Esta cita ya no existe. Puedes buscar otra en la agenda.');
              }} style={{ alignSelf: 'flex-start', padding: '10px 14px', background: '#322A25', color: '#FFF8EE',
                border: '1px solid #C5A059', borderRadius: '7px', cursor: 'pointer' }}>← Volver a la cita</button>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ color: '#E4C687', fontSize: '28px', fontWeight: 'normal', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Clientas · Cuidado y seguimiento</h3>
                  <p style={{ color: '#D6CBB8', fontSize: '14px', margin: 0 }}>Consulta sus datos, cuida su evolución y actualiza su pasaporte. Las bajas conservan la ficha y el historial; no cancelan citas ni bloquean el acceso al portal.</p>
                </div>
                <button onClick={() => setIsAddingClient(!isAddingClient)} style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  {isAddingClient ? 'Cancelar' : '+ Dar de Alta Clienta'}
                </button>
              </div>
              {isAddingClient && (
                <form onSubmit={handleGuardarNuevoCliente} style={{ backgroundColor: '#322A25', border: '1px solid #B98A3E', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: '#E4C687', fontSize: '13px', margin: 0 }}>Nueva Ficha de Clienta</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <input type="text" placeholder="Nombre *" value={novoNombre} onChange={(e) => setNovoNombre(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="text" placeholder="Apellidos" value={novoApellidos} onChange={(e) => setNovoApellidos(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="text" placeholder="Fecha Nacimiento" value={novoNacimiento} onChange={(e) => setNovoNacimiento(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="text" placeholder="Teléfono" value={novoTelefono} onChange={(e) => setNovoTelefono(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="email" placeholder="Email (Identificador) *" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} onFocus={(e) => e.target.select()} required style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                    <input type="text" placeholder="PIN acceso (4 digs)" maxLength={4} value={novoPin} onChange={(e) => setNovoPin(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                  </div>
                  <input type="text" placeholder="Diagnóstico capilar o notas" value={novoDiagnostico} onChange={(e) => setNovoDiagnostico(e.target.value)} onFocus={(e) => e.target.select()} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Guardar Clienta</button>
                  </div>
                </form>
              )}
              <div>
                <input type="text" placeholder="Buscar por Nombre, Email, Teléfono o ID..." value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)} onFocus={(e) => e.target.select()} style={{ width: '100%', maxWidth: '560px', boxSizing: 'border-box', padding: '12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {([{ value: 'active', label: 'Activas' }, { value: 'archived', label: 'De baja' }, { value: 'all', label: 'Todas' }] as const).map(option => <button key={option.value} type="button" aria-pressed={clientStatusFilter === option.value} onClick={() => setClientStatusFilter(option.value)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #655039', background: clientStatusFilter === option.value ? '#C49A58' : '#322A25', color: clientStatusFilter === option.value ? '#29231F' : '#FFF8EE', cursor: 'pointer', fontSize: 13 }}>{option.label}</button>)}
                <span style={{ color: '#D6CBB8', fontSize: 12, marginLeft: 'auto' }}>{filteredClientRows.length} clientas</span>
              </div>
              {clientStatusError && <p role="alert" style={{ color: '#F5C7B8', margin: 0 }}>{clientStatusError}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {visibleClientRows
                  .map((c) => {
                    const isEditing = editingClientId === c.idNum;
                    return (
                      <article key={c.idNum} style={{background:'#322A25',border:'1px solid #655039',borderRadius:9,overflow:'hidden'}}>
<button type="button" aria-expanded={expandedClientId === c.idNum} aria-controls={`client-details-${c.idNum}`} onClick={() => { setExpandedClientId(previous => previous === c.idNum ? null : c.idNum); setEditingClientId(null); }} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'11px 14px',border:0,background:'transparent',color:'#FFF8EE',cursor:'pointer',textAlign:'left',flexWrap:'wrap'}}>
<strong style={{fontSize:14,flex:'1 1 220px'}}>{c.nombre} {c.apellidos}</strong><span style={{fontSize:12,color:'#D6CBB8'}}>{c.telefono || 'Sin teléfono'}</span><span style={{fontSize:11,color:c.archivedAt ? '#F5C7B8' : '#BDE1B8'}}>{c.archivedAt ? 'De baja' : 'Activa'}</span><span style={{fontSize:11,color:'#D6CBB8'}}>#{c.idNum}</span><span aria-hidden="true" style={{color:'#E4C687'}}>{expandedClientId === c.idNum ? '▴' : '▾'}</span>
</button>
{expandedClientId === c.idNum && <div id={`client-details-${c.idNum}`} style={{display:'flex',flexDirection:'column',gap:10,padding:14,borderTop:'1px solid #655039'}}>
{c.archivedAt && <p style={{margin:0,fontSize:12,color:'#F5C7B8'}}>De baja desde {new Date(c.archivedAt).toLocaleDateString('es-ES')}. Su historial se conserva.</p>}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ backgroundColor: '#322A25', color: '#FFF8EE', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                              ID #{c.idNum} ({c.registroId})
                            </span>
                            <span style={{ color: '#FFF8EE', fontSize: '14px', fontWeight: 'bold' }}>{c.nombre} {c.apellidos}</span>
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
                            }} style={{ background: 'transparent', border: '1px solid #B98A3E', color: '#E4C687', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                              {isEditing ? 'Cerrar Edición' : 'Editar ficha y fórmulas'}
                            </button>
                            <button type="button" onClick={() => setClientDetailsDraft({ ...c })} style={{ background: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}>Editar datos y acceso</button>
                            <button type="button" onClick={() => openPassportEditor(c)} style={{ background: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}>Editar pasaporte e historial</button>
                            <button type="button" disabled={clientStatusBusy !== null} onClick={() => void handleClientStatus(c)} style={{ background: 'transparent', border: '1px solid #8C6A4B', borderRadius: 6, padding: '8px 12px', color: c.archivedAt ? '#BDE1B8' : '#F5C7B8', fontSize: 12, cursor: 'pointer' }}>{clientStatusBusy === c.idNum ? 'Guardando…' : c.archivedAt ? 'Reactivar clienta' : 'Dar de baja'}</button>
                          </div>
                        </div>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px', color: '#D6CBB8', backgroundColor: '#322A25', padding: '10px', borderRadius: '6px' }}>
                          <div><strong>Email:</strong> {c.email}</div>
                          <div><strong>Teléfono:</strong> {c.telefono}</div>
                          <div><strong>PIN Acceso:</strong> <span style={{ color: '#E4C687', fontWeight: 'bold' }}>{c.pinAcceso}</span></div>
                          <div><strong>F. Nacimiento:</strong> {c.fechaNacimiento}</div>
                        </div>
{isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#322A25', padding: '14px', borderRadius: '8px', border: '1px solid #B98A3E' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ color: '#E4C687', fontSize: '12px', display: 'block', marginBottom: '2px' }}>Última Visita:</label>
                                <input type="text" value={editAdminUltimaVisita} onChange={(e) => setEditAdminUltimaVisita(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} />
                              </div>
                              <div>
                                <label style={{ color: '#E4C687', fontSize: '12px', display: 'block', marginBottom: '2px' }}>Próxima Visita Sugerida:</label>
                                <input type="text" value={editAdminProxima} onChange={(e) => setEditAdminProxima(e.target.value)} style={{ width: '100%', padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} />
                              </div>
                            </div>
                            <div>
                              <label style={{ color: '#E4C687', fontSize: '12px', display: 'block', marginBottom: '2px' }}>DNI Capilar Activo (Visible en Pasaporte de la clienta):</label>
                              <input type="text" value={editAdminDniCapilar} onChange={(e) => setEditAdminDniCapilar(e.target.value)} placeholder="Ej. Porosidad: Media | Hidratación: Necesaria" style={{ width: '100%', padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} />
                            </div>
                            <div>
                              <label style={{ color: '#E4C687', fontSize: '12px', display: 'block', marginBottom: '2px' }}>Mantenimiento en Casa (Visible en Pasaporte de la clienta):</label>
                              <input type="text" value={editAdminPrescripcionCasa} onChange={(e) => setEditAdminPrescripcionCasa(e.target.value)} placeholder="Ej. Champú Hidratante | Sérum Nutritivo" style={{ width: '100%', padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px' }} />
                            </div>
                            <div>
                              <label style={{ color: '#E4C687', fontSize: '12px', display: 'block', marginBottom: '2px' }}>Fórmulas y Notas (Uso Exclusivo Intranet):</label>
                              <textarea value={editAdminFormulas} onChange={(e) => setEditAdminFormulas(e.target.value)} rows={2} style={{ width: '100%', padding: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '4px', fontSize: '14px', resize: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                              <button onClick={() => setEditingClientId(null)} style={{ background: 'none', border: 'none', color: '#D6CBB8', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
                              <button onClick={() => handleGuardarEdicionAdminCliente(c.idNum)} style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Guardar y Sincronizar Pasaporte</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <section style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '10px', padding: '18px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', color: '#D6CBB8', fontSize: '14px', lineHeight: 1.7 }}>
                              <h4 style={{ color: '#E4C687', fontSize: '14px', margin: '0 0 10px' }}>Pasaporte capilar</h4>
                              <strong style={{ color: '#FFF8EE' }}>Diagnóstico</strong><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '6px 0 14px' }}>{c.dniCapilar || 'Sin diagnóstico registrado'}</p>
                              <strong style={{ color: '#FFF8EE' }}>Cuidados en casa</strong><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '6px 0' }}>{c.prescripcionCasa || 'Sin recomendaciones registradas'}</p>
                              <button type="button" onClick={() => openPassportEditor(c)} style={{ background: 'none', border: '1px solid #C5A059', color: '#E4C687', padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', marginTop: '12px' }}>Editar pasaporte</button>
                            </section>
                            <section style={{ backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '10px', padding: '18px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', color: '#D6CBB8', fontSize: '14px', lineHeight: 1.7 }}>
                              <h4 style={{ color: '#E4C687', fontSize: '14px', margin: '0 0 10px' }}>Seguimiento</h4>
                              <p>Última visita: <span style={{ color: '#FFF8EE' }}>{c.ultimaVisita || 'Sin registrar'}</span></p>
                              <p>Próxima recomendada: <span style={{ color: '#FFF8EE' }}>{c.proximaVisitaSugerida || 'Sin indicar'}</span></p>
                              <p>{c.pastVisits?.length || 0} visitas en el historial</p>
                              <button type="button" onClick={() => openPassportEditor(c)} style={{ background: 'none', border: '1px solid #C5A059', color: '#E4C687', padding: '10px 12px', borderRadius: '6px', cursor: 'pointer' }}>Ver y editar historial</button>
                            </section>
                            <details style={{ gridColumn: '1 / -1', backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '10px', padding: '18px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', color: '#D6CBB8', fontSize: '14px' }}>
                              <summary style={{ cursor: 'pointer', color: '#E4C687' }}>Fórmulas y notas de la intranet</summary>
                              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.7 }}>{c.formulasAplicadas || 'Sin fórmulas registradas'}</p>
                            </details>
                          </div>
                        )}
</div>}
</article>
                    );
                  })}
                {!visibleClientRows.length && <p style={{ color: '#D6CBB8', padding: 16 }}>No hay clientas con estos filtros.</p>}
              </div>
              <nav aria-label="Páginas de clientas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="studio-btn-ghost" disabled={effectiveClientsPage <= 1} onClick={() => { setClientsPage(effectiveClientsPage - 1); setExpandedClientId(null); }}>Anterior</button>
                <span style={{ color: '#D6CBB8', fontSize: 12 }}>Página {effectiveClientsPage} de {clientsPageCount} · 15 por página</span>
                <button type="button" className="studio-btn-ghost" disabled={effectiveClientsPage >= clientsPageCount} onClick={() => { setClientsPage(effectiveClientsPage + 1); setExpandedClientId(null); }}>Siguiente</button>
              </nav>
            </div>
          )}

          {/* TAB 5: BUZÓN DE DETRACTORES & RESPUESTAS CON IA */}
          {adminTab === 'detractors' && (
            <div className="studio-mailbox-premium" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              <style>{`

                .studio-review-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,330px),1fr)); gap: 16px; align-items: start; }
                .studio-review-card { padding: 22px !important; border: 1px solid rgba(212, 175, 55, 0.22) !important; border-radius: 14px !important; background: linear-gradient(145deg,#24251f,#181914) !important; box-shadow: 0 8px 24px #0002; gap: 17px !important; }
                .studio-review-card > div:first-child { align-items: baseline !important; flex-wrap: wrap; gap: 8px; }
                .studio-review-card > div:first-child > span:first-child { font-size: 14px !important; font-weight: normal !important; color: #B8972E !important; }
                .studio-review-card > p { background: transparent !important; border: 0 !important; padding: 0 !important; color: #FFF8EE !important; font-style: normal !important; font-size: 13px !important; line-height: 1.8 !important; }
                .studio-mailbox-premium .studio-review-response { border: 0 !important; border-top: 1px solid rgba(212, 175, 55, 0.22) !important; border-radius: 0 !important; background: transparent !important; padding: 12px 0 0 !important; }
                .studio-review-response summary { display: flex; justify-content: space-between; color: #E4C687; list-style: none; font-size: 12px; }
                .studio-review-response summary::-webkit-details-marker { display: none; }
                .studio-review-response[open] summary { margin-bottom: 18px; }
                .studio-review-response textarea { margin: 12px 0; }
                .studio-review-response a { background: #DFE9DF !important; color: #2E7D32 !important; padding: 10px 12px !important; }
                .studio-review-card > div:last-child { justify-content: flex-start !important; margin: 0 !important; }
                .studio-review-card > div:last-child button { border: 0 !important; background: transparent !important; padding: 4px 0 !important; min-height: 32px; color: #D6CBB8 !important; }
                .studio-mailbox-premium { color: #2B2521; }
                .studio-mailbox-premium > div { border-color: #3A312A !important; }
                .studio-mailbox-premium button, .studio-mailbox-premium a { font-size: 12px !important; font-weight: normal !important; letter-spacing: .2px; }
                .studio-mailbox-premium button { min-height: 38px; border-radius: 7px !important; }
                .studio-mailbox-premium button[aria-pressed] { padding: 10px 16px !important; border-color: #3A312A !important; background: #322A25 !important; color: #D6CBB8 !important; }
                .studio-mailbox-premium button[aria-pressed=true] { background: #322A25 !important; border-color: #B8972E !important; color: #B8972E !important; }
                .studio-mailbox-premium details { background: #322A25; border-color: #3A312A !important; }
                .studio-mailbox-premium summary { font-size: 13px; padding: 2px; }
                .studio-mailbox-premium textarea { box-sizing: border-box; width: 100%; min-height: 88px; padding: 13px !important; font-size: 13px !important; line-height: 1.6; background: #322A25 !important; border-color: #3A312A !important; border-radius: 8px !important; }
                .studio-mailbox-premium textarea:focus { outline: 1px solid #a68f59; }
                .studio-mailbox-premium p { line-height: 1.7; }
              `}</style>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ color: '#E4C687', fontSize: '23px', fontWeight: 'normal', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Opiniones del Studio</h3>
                  <p style={{ color: '#D6CBB8', fontSize: '11px', margin: 0 }}>Opiniones recibidas en el servidor y seguimiento de cada experiencia.</p>
                </div>
                <a href={bizConfig.googleReviewUrl} target="_blank" rel="noreferrer" style={{ backgroundColor: '#322A25', border: '1px solid #B98A3E', color: '#FFF8EE', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Abrir enlace para reseñar ↗
                </a>
              </div>
              <div style={{ border: '1px solid #3A312A', padding: '14px', borderRadius: '9px', color: '#D6CBB8', fontSize: '13px' }}>Google · Conexión pendiente</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {([['pending', 'Pendientes'], ['all', 'Todas'], ['resolved', 'Resueltas']] as const).map(([filter, label]) => <button type="button" key={filter} aria-pressed={mailboxFilter === filter} onClick={() => setMailboxFilter(filter)} style={{ background: mailboxFilter === filter ? '#322A25' : '#322A25', color: '#E4C687', border: '1px solid #3A312A', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>{label} · {feedbackList.filter(item => filter === 'all' || (filter === 'resolved' ? !!item.resolvedAt : !item.resolvedAt)).length}</button>)}
              </div>
              <details style={{ border: '1px solid #3A312A', padding: '16px', borderRadius: '10px', color: '#D6CBB8' }}>
                <summary style={{ cursor: 'pointer', color: '#E4C687' }}>Pedir reseña · Visitas realizadas</summary>
                <p style={{ fontSize: '12px' }}>Abre el mensaje y envíalo desde WhatsApp. Abrirlo no confirma que se haya enviado.</p>
                {appointments.filter(item => !!item.completedAt && item.lifecycleStatus !== 'cancelled' && item.lifecycleStatus !== 'no_show').map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '12px 0', borderTop: '1px solid #3A312A', fontSize: '13px' }}><span>{item.clientName} · {item.dateKey}</span>{item.phone ? <a target="_blank" rel="noreferrer" href={`https://wa.me/${item.phone.replace(/\D/g, '').length === 9 ? '34' : ''}${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${item.clientName.split(' ')[0]}, gracias por tu visita a ${bizConfig.name}. Si te apetece, puedes compartir tu experiencia en Google: ${bizConfig.googleReviewUrl}. ¡Gracias por tu tiempo! Ana.`)}`} style={{ color: '#E4C687' }}>Pedir reseña por WhatsApp ↗</a> : <span>Sin teléfono registrado</span>}</div>)}
                {!appointments.some(item => !!item.completedAt) && <p style={{ fontSize: '13px' }}>Marca una cita como realizada para verla aquí.</p>}
              </details>
              {mailboxError && <p role="alert" style={{ color: '#F5C7B8', fontSize: 13 }}>{mailboxError}</p>}
              <p style={{ color: '#D6CBB8', fontSize: 12 }}>El buzón se actualiza al abrirlo. Las opiniones de Google se gestionan en Google; aquí aparecen las enviadas desde el portal.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{([{ id: 'low', label: 'Necesitan atención · 1–3 ★' }, { id: 'high', label: 'Positivas · 4–5 ★' }, { id: 'all', label: 'Todas las valoraciones' }] as const).map(tab => <button type="button" key={tab.id} aria-pressed={feedbackRatingFilter === tab.id} onClick={() => setFeedbackRatingFilter(tab.id)} style={{ padding: '10px 14px', border: '1px solid #C5A059', borderRadius: 8, background: feedbackRatingFilter === tab.id ? '#C49A58' : '#322A25', color: feedbackRatingFilter === tab.id ? '#221D19' : '#FFF8EE', cursor: 'pointer', fontSize: 12 }}>{tab.label}</button>)}</div>
              <div className="studio-review-grid">
                {feedbackList.filter(f => (feedbackRatingFilter === 'all' || (feedbackRatingFilter === 'low' ? f.rating <= 3 : f.rating >= 4)) && (mailboxFilter === 'all' || (mailboxFilter === 'resolved' ? !!f.resolvedAt : !f.resolvedAt))).length === 0 ? (
                  <div style={{ backgroundColor: '#322A25', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#D6CBB8', fontSize: '12px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    No hay opiniones en esta vista.
                  </div>
                ) : (
                  feedbackList.filter(f => (feedbackRatingFilter === 'all' || (feedbackRatingFilter === 'low' ? f.rating <= 3 : f.rating >= 4)) && (mailboxFilter === 'all' || (mailboxFilter === 'resolved' ? !!f.resolvedAt : !f.resolvedAt))).map((fb) => {
                    const currentReply = detractorReplies[fb.id] || "";
                    return (
                      <div className="studio-review-card" key={fb.id} style={{ backgroundColor: '#322A25', border: '1px solid #463B32', borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#E4C687', fontWeight: 'bold', fontSize: '12px' }}>★ {fb.rating}/5 · {fb.clientName.replace(/\s*\(PIN\s+[^)]*\)/gi, '')}</span>
                          <span style={{ color: '#D6CBB8', fontSize: '10px' }}>{fb.date}</span>
                        </div>
                        <small style={{ color: '#D6CBB8', fontSize: 11 }}>{fb.serverStored ? 'Guardada en el servidor' : 'Histórico local · solo en este navegador'}</small>
                        <p style={{ color: '#FFF8EE', fontSize: '12px', margin: 0, fontStyle: 'italic', backgroundColor: '#322A25', padding: '10px', borderRadius: '6px', borderLeft: '2px solid #a68f59' }}>
                          "{fb.comment}"
                        </p>
                        <details className="studio-review-response" style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '8px', padding: '12px', display: 'block' }}>
                          <summary>Responder a la clienta <span>＋</span></summary><p style={{ color: '#D6CBB8', fontSize: 11 }}>Plantilla editable. No hay IA conectada. Revisa la respuesta antes de enviarla.</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#FFF8EE', fontSize: '11px', fontWeight: 'bold' }}>Respuesta para la clienta</span>
                            <button type="button" onClick={() => {
                              const generated = `Hola ${fb.clientName.split(" ")[0]}, gracias por compartir tu experiencia en ${bizConfig.name}. Hemos leído tu comentario y nos gustaría hablar contigo para dar seguimiento a tu visita. Ana.`;
                              setDetractorReplies(prev => ({ ...prev, [fb.id]: generated }));
                            }} style={{ backgroundColor: 'transparent', border: '1px solid #B98A3E', color: '#E4C687', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                              Preparar plantilla
                            </button>
                          </div>
                          <textarea value={currentReply} onChange={(e) => setDetractorReplies(prev => ({ ...prev, [fb.id]: e.target.value }))} rows={3} placeholder="Escribe tu respuesta personalizada..." style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', padding: '8px', fontSize: '11px', resize: 'vertical' }} />
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <a href={`https://wa.me/?text=${encodeURIComponent(currentReply)}`} target="_blank" rel="noreferrer" style={{ backgroundColor: '#25D366', color: '#FFF8EE', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Abrir WhatsApp
                            </a>
                            <button type="button" onClick={() => {
                              navigator.clipboard.writeText(currentReply);
                              alert('¡Respuesta copiada al portapapeles!');
                            }} style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                              Copiar Respuesta
                            </button>
                          </div>
                        </details>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '5px' }}>
                          <button type="button" disabled={feedbackStatusBusy !== null} onClick={() => void handleFeedbackResolution(fb)} style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#D6CBB8', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                            {feedbackStatusBusy === fb.id ? 'Guardando…' : fb.resolvedAt ? 'Reabrir opinión' : 'Marcar como resuelta'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {adminTab === 'crm' && (() => {
            const valid = /^\d{4}-\d{2}-\d{2}$/.test(dashboardStart) && /^\d{4}-\d{2}-\d{2}$/.test(dashboardEnd) && dashboardStart <= dashboardEnd && (Date.parse(dashboardEnd) - Date.parse(dashboardStart)) / 86400000 <= 366;
            const inPeriod = appointments.filter(item => valid && item.dateKey >= dashboardStart && item.dateKey <= dashboardEnd);
            const booked = inPeriod.filter(item => item.lifecycleStatus !== 'cancelled' && item.lifecycleStatus !== 'no_show' && item.saturdayApproval?.status !== 'pending' && item.saturdayApproval?.status !== 'rejected' && item.advancePayment?.status !== 'pending');
            const serviceCounts = new Map<string, { name: string; count: number }>();
            booked.forEach(appointment => {
              if (!appointment.services?.length) return;
              const seen = new Set<string>();
              appointment.services.forEach(item => {
                const key = item.sub.id || item.sub.name;
                if (seen.has(key)) return; seen.add(key);
                const current = serviceCounts.get(key) || { name: item.sub.name, count: 0 };
                serviceCounts.set(key, { ...current, count: current.count + 1 });
              });
            });
            const channelRows = [
              { name: 'Portal de clientas', count: inPeriod.filter(item => item.bookingChannel === 'portal').length },
              { name: 'Agenda de Ana', count: inPeriod.filter(item => item.bookingChannel === 'admin').length },
              { name: 'Sin canal registrado', count: inPeriod.filter(item => !item.bookingChannel).length }
            ];
            const completedInPeriod = booked.filter(item => !!item.completedAt && !!item.email.trim());
            const attendedEmails = new Set(completedInPeriod.map(item => item.email.trim().toLowerCase()));
            let returning = 0;
            attendedEmails.forEach(email => {
              const first = completedInPeriod.filter(item => item.email.trim().toLowerCase() === email).sort((a,b) => (a.dateKey + a.time).localeCompare(b.dateKey + b.time))[0];
              if (appointments.some(item => item.completedAt && isActiveAppointment(item) && item.email.trim().toLowerCase() === email && item.id !== first.id && (item.dateKey + item.time) < (first.dateKey + first.time))) returning++;
            });
            const monthlyClients = new Map<string,number>();
            listaClientes.forEach(client => {
              if (!client.createdAt || !Number.isFinite(Date.parse(client.createdAt))) return;
              const month = formatDateKey(new Date(client.createdAt)).slice(0,7);
              monthlyClients.set(month, (monthlyClients.get(month) || 0) + 1);
            });
            const newClientsInPeriod = listaClientes.filter(client => client.createdAt && valid && formatDateKey(new Date(client.createdAt)) >= dashboardStart && formatDateKey(new Date(client.createdAt)) <= dashboardEnd).length;
            const monthlyClientsRows = Array.from(monthlyClients.entries()).sort((a,b) => b[0].localeCompare(a[0])).slice(0,12);
            const ranking = Array.from(serviceCounts.values()).sort((a,b) => b.count - a.count);
            const minutes = (time: string) => { const [h,m] = time.split(':').map(Number); return h * 60 + m; };
            const days: { date: string; available: number; occupied: number }[] = [];
            if (valid) for (const day = new Date(dashboardStart + 'T12:00:00'); formatDateKey(day) <= dashboardEnd; day.setDate(day.getDate() + 1)) {
              const key = formatDateKey(day); const available = new Set<number>(); const occupied = new Set<number>();
              if (!isDateBlockedByHoliday(key)) workingRanges(day).forEach(range => { for (let m = range.start; m < range.end; m++) available.add(m); });
              timeBlocks.filter(block => block.dateKey === key).forEach(block => { const start = minutes(block.time); for (let m = start; m < start + block.durationMinutes; m++) available.delete(m); });
              booked.filter(item => item.dateKey === key).forEach(item => { const start = minutes(item.time); for (let m = start; m < start + (item.durationMinutes || 45); m++) if (available.has(m)) occupied.add(m); });
              days.push({ date: key, available: available.size, occupied: occupied.size });
            }
            const demandInPeriod = valid ? lostDemandsList.filter(item => {
              const key = item.observedAt ? formatDateKey(new Date(item.observedAt)) : /^\d{2}\/\d{2}\/\d{4}$/.test(item.date) ? item.date.split('/').reverse().join('-') : item.date.slice(0,10);
              return key >= dashboardStart && key <= dashboardEnd && item.reason === 'sin_disponibilidad';
            }) : [];
            const capacity = days.reduce((sum,day) => sum + day.available,0);
            const occupied = days.reduce((sum,day) => sum + day.occupied,0);
            const spanDays = valid ? Math.round((Date.parse(dashboardEnd) - Date.parse(dashboardStart)) / 86400000) + 1 : 0;
            const previousEndDate = new Date(dashboardStart + 'T12:00:00'); previousEndDate.setDate(previousEndDate.getDate() - 1);
            const previousStartDate = new Date(previousEndDate); previousStartDate.setDate(previousStartDate.getDate() - spanDays + 1);
            const previousFrom = valid ? formatDateKey(previousStartDate) : '';
            const previousTo = valid ? formatDateKey(previousEndDate) : '';
            const previousBooked = appointments.filter(item => valid && item.dateKey >= previousFrom && item.dateKey <= previousTo && item.lifecycleStatus !== 'cancelled' && item.lifecycleStatus !== 'no_show' && item.saturdayApproval?.status !== 'pending' && item.saturdayApproval?.status !== 'rejected' && item.advancePayment?.status !== 'pending');
            let previousCapacity = 0; let previousOccupied = 0;
            if (valid) for (const day = new Date(previousStartDate); day <= previousEndDate; day.setDate(day.getDate() + 1)) {
              const key = formatDateKey(day); const available = new Set<number>(); const taken = new Set<number>();
              if (!isDateBlockedByHoliday(key)) workingRanges(day).forEach(range => { for (let m = range.start; m < range.end; m++) available.add(m); });
              timeBlocks.filter(block => block.dateKey === key).forEach(block => { const start = minutes(block.time); for (let m = start; m < start + block.durationMinutes; m++) available.delete(m); });
              previousBooked.filter(item => item.dateKey === key).forEach(item => { const start = minutes(item.time); for (let m = start; m < start + (item.durationMinutes || 45); m++) if (available.has(m)) taken.add(m); });
              previousCapacity += available.size; previousOccupied += taken.size;
            }
            const previousDemand = lostDemandsList.filter(item => { const key = item.observedAt ? formatDateKey(new Date(item.observedAt)) : /^\d{2}\/\d{2}\/\d{4}$/.test(item.date) ? item.date.split('/').reverse().join('-') : item.date.slice(0,10); return valid && key >= previousFrom && key <= previousTo && item.reason === 'sin_disponibilidad'; }).length;
            const comparison = [
              { label: 'Citas confirmadas y realizadas', current: booked.length, previous: previousBooked.length, unit: 'citas' },
              { label: 'Ocupación', current: capacity ? Math.round(occupied / capacity * 100) : null, previous: previousCapacity ? Math.round(previousOccupied / previousCapacity * 100) : null, unit: 'puntos porcentuales' },
              { label: 'Búsquedas sin hueco', current: demandInPeriod.length, previous: previousDemand, unit: 'intentos' }
            ];
            const completedCount = booked.filter(item => !!item.completedAt).length;
            const cancelledCount = inPeriod.filter(item => item.lifecycleStatus === 'cancelled').length;
            const noShowCount = inPeriod.filter(item => item.lifecycleStatus === 'no_show').length;
            const pendingCount = inPeriod.filter(item => isActiveAppointment(item) && !item.completedAt && (item.saturdayApproval?.status === 'pending' || item.advancePayment?.status === 'pending')).length;
            const periodLabel = valid ? `${dashboardStart.split('-').reverse().join('/')} – ${dashboardEnd.split('-').reverse().join('/')}` : 'Selecciona un periodo válido';
            const occupancy = capacity ? Math.round(occupied / capacity * 100) : null;
            const top = Math.max(1, ...ranking.map(item => item.count));
            const metricCard = (label: string, value: string | number, help: string, accent = '#E4C687') => <article className="crm-card crm-metric" key={label}><span className="crm-label">{label}</span><strong style={{color: accent}}>{value}</strong><small>{help}</small></article>;
            const compareCards = <div className="crm-grid crm-three">{comparison.map(metric => <article className="crm-card" key={metric.label}><span className="crm-label">{metric.label}</span><div className="crm-comparison"><strong>{metric.current ?? '—'}{metric.unit === 'puntos porcentuales' && metric.current !== null ? '%' : ''}</strong><span>antes {metric.previous ?? '—'}{metric.unit === 'puntos porcentuales' && metric.previous !== null ? '%' : ''}</span></div><div className="crm-bars">{[{label:'Ahora',value:metric.current,color:'#E4C687'},{label:'Antes',value:metric.previous,color:'#AFA394'}].map(bar => <div key={bar.label} className="crm-bar-row"><span>{bar.label}</span><div className="crm-track"><div style={{background:bar.color,width:`${bar.value === null ? 0 : Math.min(100,bar.value / (metric.unit === 'puntos porcentuales' ? 100 : Math.max(metric.current || 0,metric.previous || 0,1))*100)}%`}} /></div></div>)}</div><small>{metric.current === null || metric.previous === null ? 'No hay horario suficiente para comparar' : `${metric.current - metric.previous > 0 ? '+' : ''}${metric.current - metric.previous} ${metric.unit === 'puntos porcentuales' ? 'puntos de ocupación' : metric.unit} frente al periodo anterior`}</small></article>)}</div>;
            return <section className="studio-crm-report crm-visual">
              <style>{`
                .crm-visual {color:#FFF8EE;display:flex;flex-direction:column;gap:18px;font-size:14px}
                .crm-visual h2,.crm-visual h3,.crm-visual h4,.crm-visual p{margin:0}
                .crm-visual h2{color:#E4C687;font-size:29px;font-weight:400;letter-spacing:.02em}
                .crm-visual h3{color:#FFF8EE;font-size:18px;font-weight:500;letter-spacing:.01em}
                .crm-visual h4{color:#E4C687;font-size:15px;font-weight:500}
                .crm-visual small{display:block;color:#D6CBB8;font-size:12px;line-height:1.6}
                .crm-visual button,.crm-visual a{font-family:inherit}
                .crm-heading,.crm-section-title{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
                .crm-heading p{color:#D6CBB8;margin-top:7px;line-height:1.6}
                .crm-period-badge{padding:9px 13px;background:#3E342C;border:1px solid #655039;border-radius:30px;color:#E4C687;font-size:12px}
                .crm-toolbar{padding:14px;background:#322A25;border:1px solid #655039;border-radius:13px;display:flex;flex-wrap:wrap;gap:12px;align-items:end}
                .crm-shortcuts{display:flex;gap:6px;flex-wrap:wrap;margin-right:auto}
                .crm-visual .crm-button{min-height:40px;padding:9px 14px;border:1px solid #806340;border-radius:8px;color:#FFF8EE;background:#29231F;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:13px}
                .crm-visual .crm-button:hover{background:#4A3C2F;border-color:#E4C687}
                .crm-visual .crm-gold{background:#C49A58;color:#221D19;font-weight:600}
                .crm-toolbar label{color:#D6CBB8;font-size:11px;display:flex;flex-direction:column;gap:5px}
                .crm-toolbar input{color-scheme:dark;min-height:40px;box-sizing:border-box;background:#221D19;border:1px solid #655039;border-radius:7px;padding:7px 10px;color:#FFF8EE;font-size:13px}
                .crm-tabs{display:flex;gap:6px;padding:5px;background:#221D19;border:1px solid #655039;border-radius:12px;flex-wrap:wrap}
                .crm-tabs button{flex:1;min-width:110px;min-height:43px;border:1px solid transparent;border-radius:8px;background:transparent;color:#D6CBB8;font-size:13px;cursor:pointer;display:flex;gap:7px;align-items:center;justify-content:center}
                .crm-tabs button[aria-selected=true]{background:#C49A58;color:#221D19;font-weight:600}
                .crm-tabs button:focus-visible,.crm-button:focus-visible{outline:2px solid #FFF8EE;outline-offset:3px}
                .crm-grid{display:grid;gap:12px}.crm-four{grid-template-columns:repeat(4,minmax(0,1fr))}.crm-three{grid-template-columns:repeat(3,minmax(0,1fr))}.crm-two{grid-template-columns:repeat(2,minmax(0,1fr))}
                .crm-card{border:1px solid #655039;border-radius:13px;background:linear-gradient(140deg,#382F28,#2D2621);padding:18px;min-width:0;box-sizing:border-box}
                .crm-label{color:#E5D8C4;font-size:12px;line-height:1.5;display:block}
                .crm-metric strong{display:block;font-size:35px;font-weight:500;line-height:1.2;margin:10px 0 7px}
                .crm-track{height:9px;border-radius:20px;background:#181512;overflow:hidden}.crm-track>div{height:100%;border-radius:20px}
                .crm-ranking{display:flex;flex-direction:column;gap:16px;margin-top:18px}.crm-ranking-row{display:grid;grid-template-columns:25px minmax(0,1fr) 35px;align-items:start;gap:10px}.crm-ranking-row>span{color:#CBB79B;font-size:12px}.crm-ranking-row strong{font-size:13px;color:#E4C687;text-align:right}.crm-ranking-row p{font-size:13px;margin-bottom:8px;line-height:1.5}
                .crm-actions{display:flex;flex-direction:column;gap:9px;margin-top:16px}.crm-actions button{width:100%;justify-content:space-between!important;text-align:left}
                .crm-status{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.crm-status span{padding:7px 10px;border-radius:7px;background:#221D19;border:1px solid #655039;color:#D6CBB8;font-size:12px}
                .crm-comparison{display:flex;align-items:baseline;gap:12px;margin:13px 0}.crm-comparison strong{color:#E4C687;font-size:28px}.crm-comparison span{font-size:12px;color:#D6CBB8}.crm-bars{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}.crm-bar-row{display:grid;grid-template-columns:40px 1fr;gap:9px;align-items:center;font-size:11px;color:#D6CBB8}
                .crm-empty{padding:25px 10px;text-align:center;color:#D6CBB8;font-size:13px}.crm-note{font-size:12px;color:#D6CBB8;line-height:1.7}.crm-notes{border:1px dashed #655039;border-radius:10px;padding:13px;color:#D6CBB8;font-size:12px;line-height:1.7}.crm-notes summary{cursor:pointer;color:#E4C687}.crm-notes p{margin-top:10px}.crm-table{width:100%;border-collapse:collapse;font-size:12px}.crm-table td,.crm-table th{padding:11px 8px;border-bottom:1px solid #554535;text-align:left}.crm-table th{color:#E4C687;font-weight:500}.crm-table td{color:#E5D8C4}
                @media(max-width:1000px){.crm-four{grid-template-columns:repeat(2,minmax(0,1fr))}.crm-three{grid-template-columns:1fr}}
                @media(max-width:620px){.crm-two{grid-template-columns:1fr}.crm-card{padding:14px}.crm-metric strong{font-size:28px}.crm-toolbar label{flex:1}.crm-toolbar input{width:100%}}
                @media print{body *{visibility:hidden!important}.studio-crm-report,.studio-crm-report *{visibility:visible!important}.studio-crm-report{position:absolute!important;left:0;top:0;width:100%!important;background:white!important;padding:16px;box-sizing:border-box}.crm-visual *{color:#221D19!important;background:transparent!important;box-shadow:none!important}.crm-visual button,.crm-toolbar,.crm-tabs,.studio-crm-export{display:none!important}.crm-card{break-inside:avoid}.crm-track{border:1px solid #999}}
              `}</style>
              <header className="crm-heading"><div><small>L’STUDIO ANA · SEGUIMIENTO DEL STUDIO</small><h2>Tu Studio, de un vistazo</h2><p>Qué está pasando y dónde poner tu atención.</p></div><span className="crm-period-badge">{periodLabel}</span></header>
              <div className="crm-toolbar"><div className="crm-shortcuts">{[{label:'Últimos 7 días',days:7},{label:'Últimos 30 días',days:30},{label:'Este mes',days:0}].map(item => <button key={item.label} type="button" className="crm-button" onClick={() => {const end=new Date();const start=new Date(end);if(item.days)start.setDate(start.getDate()-item.days+1);else start.setDate(1);setDashboardStart(formatDateKey(start));setDashboardEnd(formatDateKey(end));}}>{item.label}</button>)}</div><label>Desde<input type="date" value={dashboardStart} max={dashboardEnd || undefined} onChange={e=>setDashboardStart(e.target.value)} /></label><label>Hasta<input type="date" value={dashboardEnd} min={dashboardStart || undefined} onChange={e=>setDashboardEnd(e.target.value)} /></label></div>
              {!valid && <p role="alert" className="crm-note">Elige fechas válidas, con un máximo de un año.</p>}
              <nav className="crm-tabs" role="tablist" aria-label="Secciones del CRM">{([{id:'resumen',label:'Resumen',icon:CalendarDays},{id:'clientas',label:'Clientas',icon:User},{id:'servicios',label:'Servicios',icon:Scissors},{id:'informes',label:'Informes',icon:BookOpen}] as const).map(tab=><button type="button" role="tab" id={`crm-tab-${tab.id}`} aria-selected={crmView === tab.id} aria-controls="crm-content" onClick={()=>setCrmView(tab.id)} key={tab.id}><tab.icon size={16}/>{tab.label}</button>)}</nav>
              <div id="crm-content" role="tabpanel" aria-labelledby={`crm-tab-${crmView}`} style={{display:'flex',flexDirection:'column',gap:16}}>
              {crmView === 'resumen' && <>
                <div className="crm-grid crm-four">{metricCard('Citas confirmadas y realizadas',valid ? booked.length : '—','Según la fecha de la cita')}{metricCard('Servicios finalizados',valid ? completedCount : '—','Citas marcadas como realizadas','#BDE1B8')}{metricCard('Agenda ocupada',occupancy === null ? '—' : occupancy+'%',capacity ? `${(occupied/60).toFixed(1)} de ${(capacity/60).toFixed(1)} horas del horario` : 'Sin horario para calcular')}{metricCard('Fichas nuevas',valid ? newClientsInPeriod : '—','Altas registradas en estas fechas')}</div>
                <div className="crm-grid crm-two"><section className="crm-card"><div className="crm-section-title"><h3>¿Qué necesita tu atención?</h3><Clock3 size={18} color="#E4C687"/></div><div className="crm-actions"><button className="crm-button" type="button" onClick={()=>{setAdminTab('agenda');setPendingPanelFilter('all');setAgendaSidePanel('pending');}}>Revisar solicitudes y pagos <span>→</span></button><button className="crm-button" type="button" onClick={()=>setAdminTab('demands')}>Ver oportunidades de reserva <span>→</span></button><button className="crm-button" type="button" onClick={()=>setAdminTab('detractors')}>Leer opiniones de clientas <span>→</span></button></div><div className="crm-status"><span>{valid ? pendingCount : '—'} pendientes en el periodo</span><span>{valid ? demandInPeriod.length : '—'} búsquedas sin hueco</span><span>{valid ? cancelledCount : '—'} canceladas</span><span>{valid ? noShowCount : '—'} ausencias</span></div><small style={{marginTop:10}}>Los accesos abren sus apartados completos; las cifras corresponden al periodo seleccionado.</small></section>
                <section className="crm-card"><div className="crm-section-title"><h3>Los servicios que más se reservan</h3><Scissors size={18} color="#E4C687"/></div><div className="crm-ranking">{ranking.slice(0,4).map((item,i)=><div className="crm-ranking-row" key={item.name}><span>{String(i+1).padStart(2,'0')}</span><div><p>{item.name}</p><div className="crm-track"><div style={{width:`${item.count/top*100}%`,background:'#C49A58'}}/></div></div><strong>{item.count}</strong></div>)}</div>{!ranking.length && <p className="crm-empty">Todavía no hay servicios desglosados en este periodo.</p>}<button className="crm-button" type="button" style={{marginTop:16}} onClick={()=>setCrmView('servicios')}>Ver todos los servicios →</button></section></div>
                <div className="crm-section-title"><h3>Frente al periodo anterior</h3><small>{valid ? `${previousFrom.split('-').reverse().join('/')} – ${previousTo.split('-').reverse().join('/')}` : 'Sin comparación disponible'}</small></div>{compareCards}
              </>}
              {crmView === 'clientas' && <>
                <div className="crm-grid crm-three">{metricCard('Clientas atendidas',valid ? attendedEmails.size : '—','Personas con visita realizada y email')}{metricCard('Clientas que repiten',valid ? returning : '—','Ya tenían una visita realizada anterior','#BDE1B8')}{metricCard('Fichas nuevas',valid ? newClientsInPeriod : '—','Altas en el periodo; no primeras visitas')}</div>
                <div className="crm-grid crm-two"><section className="crm-card"><h3>Tu comunidad</h3><div className="crm-status"><span>{listaClientes.filter(c=>!c.archivedAt).length} activas</span><span>{listaClientes.filter(c=>!!c.archivedAt).length} de baja</span></div><small style={{margin:'12px 0'}}>Total de fichas actuales, independiente de las fechas del informe.</small><button className="crm-button crm-gold" type="button" onClick={()=>{setAdminTab('clients');setClientStatusFilter('active');}}>Abrir fichas de clientes →</button></section><section className="crm-card"><h3>Nuevas fichas por mes</h3><small style={{marginTop:7}}>Últimos 12 meses con altas registradas. Histórico completo.</small><div className="crm-ranking">{monthlyClientsRows.map(([month,count])=><div key={month}><div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:7,fontSize:12}}><span>{new Date(month+'-01T12:00:00').toLocaleDateString('es-ES',{month:'short',year:'numeric'})}</span><strong style={{color:'#E4C687'}}>{count}</strong></div><div className="crm-track"><div style={{width:`${count/Math.max(1,...monthlyClientsRows.map(row=>row[1]))*100}%`,background:'#C49A58'}}/></div></div>)}</div>{!monthlyClientsRows.length && <p className="crm-empty">Sin fechas de alta registradas.</p>}</section></div>
                <p className="crm-note">Las visitas y repeticiones se identifican por email. Las citas sin email no cuentan como personas únicas; no se infieren visitas que no estén registradas.</p>
              </>}
              {crmView === 'servicios' && <div className="crm-grid crm-two"><section className="crm-card"><h3>Ranking de servicios</h3><small style={{marginTop:7}}>Un servicio cuenta una vez por cita, agrupando variantes.</small><div className="crm-ranking">{ranking.map((item,i)=><div className="crm-ranking-row" key={item.name}><span>{i+1}</span><div><p>{item.name}</p><div className="crm-track"><div style={{width:`${item.count/top*100}%`,background:'#C49A58'}}/></div></div><strong>{item.count}</strong></div>)}</div>{!ranking.length && <p className="crm-empty">No hay servicios desglosados en estas fechas.</p>}{booked.some(item=>!item.services?.length) && <small style={{marginTop:15}}>Las citas antiguas sin desglose no entran en este ranking.</small>}</section><section className="crm-card"><h3>¿De dónde llegan las reservas?</h3><small style={{marginTop:7}}>Incluye todas las citas del periodo, también pendientes y canceladas.</small><div className="crm-ranking">{channelRows.map(row=><div key={row.name}><div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:8}}><span>{row.name}</span><strong style={{color:'#E4C687'}}>{row.count}</strong></div><div className="crm-track"><div style={{width:`${row.count/Math.max(1,inPeriod.length)*100}%`,background:row.name === 'Sin canal registrado' ? '#AFA394' : '#C49A58'}}/></div></div>)}</div>{!inPeriod.length && <p className="crm-empty">No hay citas en este periodo.</p>}</section></div>}
              {crmView === 'informes' && <>
                <section className="crm-card"><div className="crm-section-title"><h3>Exporta tu resumen</h3><BookOpen size={18} color="#E4C687"/></div><small style={{margin:'8px 0 14px'}}>El CSV incluye comparación, servicios y ocupación diaria del periodo. El PDF imprime la vista que tienes abierta.</small>
                            <div className="studio-crm-export" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button type="button" disabled={!valid} onClick={() => {
                const rows: (string | number)[][] = [
                  ['Informe CRM', bizConfig.name], ['Desde', dashboardStart], ['Hasta', dashboardEnd], ['Periodo anterior', previousFrom, previousTo],
                  ['Métrica', 'Actual', 'Anterior', 'Unidad'], ...comparison.map(item => [item.label, item.current ?? 'Sin datos', item.previous ?? 'Sin datos', item.unit]),
                  ['Horas reservadas', (occupied / 60).toFixed(2)], ['Horas disponibles', (capacity / 60).toFixed(2)],
                  ['Servicios', 'Citas'], ...ranking.map(item => [item.name, item.count]),
                  ['Ocupación diaria', 'Minutos reservados', 'Minutos disponibles', 'Porcentaje'], ...days.map(day => [day.date, day.occupied, day.available, day.available ? (day.occupied / day.available * 100).toFixed(1) : 'Sin horario']),
                  ['Nota', 'Datos locales; ocupación histórica calculada con el horario actual. Actividad web acumulada excluida de este informe por fechas.']
                ];
                const cell = (value: string | number) => { let text = String(value); if (/^[=+@-]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
                const csv = '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
                const link = document.createElement('a'); link.href = url; link.download = `CRM-${dashboardStart}-${dashboardEnd}.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }} style={{ padding: '10px 16px', background: '#322A25', color: '#FFF8EE', border: '1px solid #C5A059', borderRadius: '8px', cursor: 'pointer' }}>Descargar CSV</button>
              <button type="button" disabled={!valid} onClick={() => window.print()} style={{ padding: '10px 16px', background: '#322A25', color: '#FFF8EE', border: '1px solid #C5A059', borderRadius: '8px', cursor: 'pointer' }}>Imprimir esta vista / PDF</button>
            </div>

                </section>
                <div className="crm-section-title"><h3>Ocupación día a día</h3><span className="crm-period-badge">{occupancy === null ? 'Sin horario' : occupancy+'% de ocupación'}</span></div>
                <div className="crm-card" style={{overflowX:'auto'}}><table className="crm-table"><thead><tr><th>Fecha</th><th>Reservadas</th><th>Horario disponible</th><th>Ocupación</th></tr></thead><tbody>{days.map(day=><tr key={day.date}><td>{day.date.split('-').reverse().join('/')}</td><td>{(day.occupied/60).toFixed(1)} h</td><td>{(day.available/60).toFixed(1)} h</td><td style={{minWidth:150}}><div style={{display:'flex',alignItems:'center',gap:10}}><div className="crm-track" style={{flex:1}}><div style={{width:`${day.available ? day.occupied/day.available*100 : 0}%`,background:'#C49A58'}}/></div><span>{day.available ? Math.round(day.occupied/day.available*100)+'%' : '—'}</span></div></td></tr>)}</tbody></table>{!days.length && <p className="crm-empty">Selecciona un periodo válido.</p>}</div>
                <details className="crm-notes"><summary>Actividad de este navegador</summary><p>Estos datos son locales e incluyen tus pruebas. No representan todas las visitas a la web ni se filtran por las fechas del informe.</p><div className="crm-status"><span>{trafficEvents.filter(item=>item.type === 'visit').length} visitas locales</span><span>{trafficEvents.filter(item=>item.type === 'login').length} accesos locales</span><span>{trafficEvents.filter(item=>item.type === 'booking').length} reservas locales</span></div></details>
              </>}
              </div>
              <details className="crm-notes"><summary>Cómo leer estos datos</summary><p>Periodo: fecha de la cita, excepto altas, que usan la fecha de creación de la ficha. Las citas confirmadas incluyen las realizadas; las finalizadas muestran cuántas has marcado como realizadas. La ocupación usa el horario actual, descuenta cierres y bloqueos y cuenta los solapamientos una sola vez; no mide capacidad por profesional. Son registros disponibles en esta app, no facturación ni estadísticas completas de la web.</p></details>
            </section>;
          })()}

          {adminTab === 'demands' && (() => {
            const today = formatDateKey(new Date());
            const start = new Date(); start.setDate(start.getDate() - (crmPeriod === '30d' ? 29 : crmPeriod === '7d' ? 6 : 0));
            const from = crmPeriod === 'personalizado' ? demandStart : formatDateKey(start);
            const to = crmPeriod === 'personalizado' ? demandEnd : today;
            const dateKey = (item: LostDemandRecord) => item.observedAt ? formatDateKey(new Date(item.observedAt)) : /^\d{2}\/\d{2}\/\d{4}$/.test(item.date) ? item.date.split('/').reverse().join('-') : item.date.slice(0,10);
            const valid = !!from && !!to && from <= to;
            const periodDemands = valid ? lostDemandsList.filter(item => dateKey(item) >= from && dateKey(item) <= to) : [];
            const periodAttempts = valid ? bookingAttempts.filter(item => formatDateKey(new Date(item.updatedAt)) >= from && formatDateKey(new Date(item.updatedAt)) <= to) : [];
            const demandInPeriod = periodDemands.filter(item => item.reason === 'sin_disponibilidad');
            const missingServices = new Map<string,number>();
            const desiredDays = new Map<number,number>();
            demandInPeriod.forEach(item => {
              if (item.serviceName?.trim()) missingServices.set(item.serviceName, (missingServices.get(item.serviceName) || 0) + 1);
              if (item.desiredDate && /^\d{4}-\d{2}-\d{2}$/.test(item.desiredDate)) { const weekday = new Date(item.desiredDate + 'T12:00:00').getDay(); if (Number.isFinite(weekday)) desiredDays.set(weekday, (desiredDays.get(weekday) || 0) + 1); }
            });
            const demandServicesRanking = Array.from(missingServices.entries()).sort((a,b) => b[1] - a[1]);
            const demandDaysRanking = Array.from(desiredDays.entries()).sort((a,b) => b[1] - a[1]);
            const phoneDigits = (value: string) => { let phone=String(value || '').replace(/\D/g,'');if(phone.startsWith('00'))phone=phone.slice(2);if(phone.length===9)phone='34'+phone;return /^[1-9]\d{8,14}$/.test(phone) ? phone : ''; };
            const cases = [
              ...periodDemands.map(item => ({ key:'demand:'+item.id, id:item.id, source:'demand' as const, registered:false, name:item.clientName || 'Sin nombre', email:item.clientEmail || '', phone:phoneDigits(item.phone || ''), service:item.serviceName || 'Servicio sin registrar', desiredDate:item.desiredDate || '', time:'', note:item.clientNote || '', reason:item.reason === 'sin_disponibilidad' ? 'no_slots' : 'other', contacted:!!item.contactedAt, recovered:!!item.recoveredAt, updatedAt:item.observedAt || dateKey(item)+'T12:00:00', step:'' })),
              ...periodAttempts.filter(item => !item.registered && attemptClock-Date.parse(item.updatedAt)>=30*60000 || !!item.contactedAt || !!item.recoveredAt).map(item => ({ key:'attempt:'+item.id, id:item.id, source:'attempt' as const, registered:!!item.registered, name:item.name || 'Sin nombre', email:item.email || '', phone:phoneDigits(listaClientes.find(client=>normalizeEmail(client.email)===normalizeEmail(item.email))?.telefono || ''), service:item.services || 'Servicio sin registrar', desiredDate:item.date || '', time:item.time || '', note:'', reason:'unfinished', contacted:!!item.contactedAt, recovered:!!item.recoveredAt || !!item.registered, updatedAt:item.updatedAt, step:item.step || '' }))
            ].sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0));
            const pendingCases=cases.filter(item=>!item.contacted && !item.recovered);
            const contactedCases=cases.filter(item=>item.contacted && !item.recovered);
            const recoveredCases=cases.filter(item=>item.recovered);
            const query=opportunitySearch.trim().toLocaleLowerCase('es');
            const filteredCases=cases.filter(item => (opportunityStatus==='all' || opportunityStatus==='pending' && !item.contacted && !item.recovered || opportunityStatus==='contacted' && item.contacted && !item.recovered || opportunityStatus==='recovered' && item.recovered) && (demandFilter==='all' || demandFilter==='no_slots' && item.reason==='no_slots' || demandFilter==='unfinished' && item.reason==='unfinished') && (!query || [item.name,item.email,item.phone,item.service].some(value=>value.toLocaleLowerCase('es').includes(query))));
            const pageCount=Math.max(1,Math.ceil(filteredCases.length/10));
            const currentPage=Math.min(opportunityPage,pageCount);
            const visibleCases=filteredCases.slice((currentPage-1)*10,currentPage*10);
            const updateCase=(item:typeof cases[number],field:'contactedAt'|'recoveredAt',active:boolean) => {
              const value=active ? new Date().toISOString() : undefined;
              if(item.source==='demand')setLostDemandsList(previous=>previous.map(record=>record.id===item.id ? {...record,[field]:value} : record));
              else setBookingAttempts(previous=>previous.map(record=>record.id===item.id ? {...record,[field]:value} : record));
            };
            const formatShort=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value || 'Sin fecha elegida';
            const uniqueClients=(items:typeof periodAttempts)=>new Set(items.map(item=>normalizeEmail(item.email)).filter(Boolean)).size;
            const journey=[{label:'Servicios elegidos',count:uniqueClients(periodAttempts)},{label:'Fecha buscada',count:uniqueClients(periodAttempts.filter(item=>item.reachedDate || !!item.date))},{label:'Hora elegida',count:uniqueClients(periodAttempts.filter(item=>item.reachedTime || !!item.time))},{label:'Cita registrada',count:uniqueClients(periodAttempts.filter(item=>item.registered))}];
            return <section className="opp-visual">
              <style>{`
                .opp-visual{display:flex;flex-direction:column;gap:16px;color:#FFF8EE;font-size:14px}.opp-visual h2,.opp-visual h3,.opp-visual p{margin:0}.opp-visual h2{color:#E4C687;font-size:28px;font-weight:400}.opp-visual h3{font-size:17px;color:#FFF8EE;font-weight:500;letter-spacing:.01em}.opp-muted{color:#D6CBB8;font-size:12px;line-height:1.6}.opp-visual small{color:#D6CBB8;font-size:11px;line-height:1.6}.opp-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.opp-heading p{margin-top:8px;color:#D6CBB8;line-height:1.6}.opp-toolbar{padding:14px;background:#322A25;border:1px solid #655039;border-radius:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.opp-visual .opp-button{border:1px solid #806340;border-radius:8px;background:#29231F;color:#FFF8EE;font-family:inherit;font-size:12px;min-height:39px;padding:9px 13px;cursor:pointer;text-decoration:none;display:inline-flex;gap:6px;align-items:center;justify-content:center}.opp-visual .opp-button:hover{border-color:#E4C687;background:#493B2D}.opp-visual .opp-button[aria-pressed=true],.opp-visual .opp-primary{background:#C49A58;color:#221D19;font-weight:600}.opp-visual button:focus-visible,.opp-visual a:focus-visible{outline:2px solid #FFF8EE;outline-offset:3px}.opp-visual input,.opp-visual select{color-scheme:dark;background:#221D19;border:1px solid #655039;border-radius:8px;color:#FFF8EE;padding:10px;min-height:40px;box-sizing:border-box;font-family:inherit}.opp-search{flex:1;min-width:180px}.opp-grid{display:grid;gap:12px;grid-template-columns:repeat(4,minmax(0,1fr))}.opp-stat{padding:16px;background:linear-gradient(140deg,#382F28,#2D2621);border:1px solid #655039;border-radius:12px;text-align:left;color:#FFF8EE;cursor:pointer}.opp-stat[aria-pressed=true]{border-color:#E4C687;box-shadow:inset 0 0 0 1px #C49A58}.opp-stat span{display:block;color:#E5D8C4;font-size:12px}.opp-stat strong{display:block;font-size:31px;font-weight:500;color:#E4C687;margin:9px 0 5px}.opp-list{display:flex;flex-direction:column;gap:9px}.opp-case{background:#322A25;border:1px solid #655039;border-radius:12px;padding:15px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px}.opp-case strong{font-size:15px;color:#FFF8EE}.opp-service{color:#E4C687;font-size:13px;margin-top:8px!important;line-height:1.6}.opp-pills{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}.opp-pill{font-size:11px;border:1px solid #806340;border-radius:20px;padding:4px 9px;background:#29231F;color:#E4C687}.opp-status{border-radius:20px;font-size:11px;padding:5px 10px;display:inline-block;background:#29231F;color:#D6CBB8}.opp-actions{display:flex;flex-direction:column;gap:7px;align-items:stretch;justify-content:center;min-width:170px}.opp-case details{margin-top:10px;color:#D6CBB8;font-size:12px;line-height:1.7}.opp-case summary{cursor:pointer;color:#D8C29A}.opp-case details p{margin-top:7px}.opp-empty{padding:32px;text-align:center;background:#322A25;border:1px dashed #806340;border-radius:12px;color:#D6CBB8;line-height:1.8}.opp-analytics{border:1px solid #655039;padding:15px;border-radius:12px;color:#D6CBB8;font-size:12px;line-height:1.7}.opp-analytics>summary{cursor:pointer;color:#E4C687;font-size:14px}.opp-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:20px}.opp-track{height:8px;background:#181512;border-radius:8px;overflow:hidden;margin-top:6px}.opp-track div{height:100%;background:#C49A58;border-radius:8px}.opp-note{color:#D6CBB8;font-size:12px;line-height:1.7;padding:12px 14px;border:1px dashed #655039;border-radius:10px}.opp-note summary{cursor:pointer;color:#E4C687}.opp-note p{margin-top:8px}.opp-pagination{display:flex;justify-content:center;gap:12px;align-items:center;color:#D6CBB8;font-size:12px}
                @media(max-width:950px){.opp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.opp-case{grid-template-columns:1fr}.opp-actions{flex-direction:row;flex-wrap:wrap;justify-content:flex-start}.opp-two{grid-template-columns:1fr}.opp-stat{padding:12px}.opp-stat strong{font-size:26px}}
              `}</style>
              <header className="opp-heading"><div><small>L’STUDIO ANA · SEGUIMIENTO DE RESERVAS</small><h2>Oportunidades de cita</h2><p>Encuentra a quién ayudar a terminar su reserva.</p></div><span className="opp-pill">{valid ? `${formatShort(from)} – ${formatShort(to)}` : 'Fechas no válidas'}</span></header>
              <div className="opp-toolbar">{(['hoy','7d','30d','personalizado'] as const).map(period=><button type="button" className="opp-button" aria-pressed={crmPeriod===period} key={period} onClick={()=>{setCrmPeriod(period);setOpportunityPage(1);}}>{({hoy:'Hoy','7d':'Últimos 7 días','30d':'Últimos 30 días',personalizado:'Elegir fechas'})[period]}</button>)}{crmPeriod==='personalizado' && <><label className="opp-muted">Desde <input aria-label="Oportunidades desde" type="date" value={demandStart} max={demandEnd || undefined} onChange={e=>setDemandStart(e.target.value)}/></label><label className="opp-muted">Hasta <input aria-label="Oportunidades hasta" type="date" value={demandEnd} min={demandStart || undefined} onChange={e=>setDemandEnd(e.target.value)}/></label></>}</div>
              {!valid && <p role="alert" className="opp-muted">Revisa las fechas: la inicial debe ser anterior o igual a la final.</p>}
              <div className="opp-grid">{([{id:'pending',label:'Por contactar',value:pendingCases.length,help:'Todavía sin seguimiento'},{id:'contacted',label:'Contactadas',value:contactedCases.length,help:'A la espera de respuesta o reserva'},{id:'recovered',label:'Resueltas',value:recoveredCases.length,help:'Recuperadas o con cita registrada'},{id:'all',label:'Todas',value:cases.length,help:'Registros del periodo'}] as const).map(item=><button type="button" key={item.id} className="opp-stat" aria-pressed={opportunityStatus===item.id} onClick={()=>{setOpportunityStatus(item.id);setOpportunityPage(1);}}><span>{item.label}</span><strong>{valid ? item.value : '—'}</strong><small>{item.help}</small></button>)}</div>
              <div className="opp-heading"><h3>{({pending:'A quién contactar',contacted:'Seguimiento pendiente',recovered:'Oportunidades resueltas',all:'Todas las oportunidades'})[opportunityStatus]}</h3><span className="opp-muted">{filteredCases.length} registros</span></div>
              <div className="opp-toolbar"><input className="opp-search" type="search" aria-label="Buscar oportunidades" placeholder="Buscar nombre, servicio, email o teléfono…" value={opportunitySearch} onChange={e=>setOpportunitySearch(e.target.value)}/><select aria-label="Motivo de la oportunidad" value={['all','no_slots','unfinished'].includes(demandFilter) ? demandFilter : 'all'} onChange={e=>setDemandFilter(e.target.value as 'all'|'no_slots'|'unfinished')}><option value="all">Todos los motivos</option><option value="no_slots">No encontró hueco</option><option value="unfinished">No terminó de reservar</option></select></div>
              <div className="opp-list">{visibleCases.map(item=><article className="opp-case" key={item.key}><div><div className="opp-heading"><strong>{item.name}</strong><span className="opp-status" style={{color:item.recovered ? '#BDE1B8' : item.contacted ? '#E4C687' : '#F5C7B8'}}>{item.recovered ? 'Resuelta' : item.contacted ? 'Contactada' : 'Por contactar'}</span></div><p className="opp-service">{item.service}</p><div className="opp-pills"><span className="opp-pill">{item.reason==='no_slots' ? 'Sin hueco' : item.reason==='unfinished' ? 'Reserva sin terminar' : 'Consulta registrada'}</span><span className="opp-pill">{formatShort(item.desiredDate)}{item.time ? ' · '+item.time : ''}</span></div><p className="opp-muted">{item.recovered ? 'Seguimiento resuelto en el registro.' : item.contacted ? 'Ya has marcado que contactaste; revisa su respuesta.' : item.reason==='no_slots' ? 'Puedes ofrecerle otra fecha o un hueco que haya quedado libre.' : item.reason==='unfinished' ? 'Puedes preguntarle si necesita ayuda. No sabemos por qué no terminó.' : 'Revisa su consulta antes de escribirle.'}</p><details><summary>Ver detalles</summary><p>{item.email || 'Sin email registrado'}{item.phone ? ' · +'+item.phone : ''}</p><p>Último registro: {Number.isFinite(Date.parse(item.updatedAt)) ? new Date(item.updatedAt).toLocaleString('es-ES') : 'Sin fecha registrada'}</p>{item.step && <p>Último paso: {item.step}</p>}{item.note && <p>{item.note}</p>}{item.email && <button className="opp-button" type="button" onClick={()=>{setBusquedaCliente(item.email);setClientStatusFilter('all');setAdminTab('clients');}}>Abrir ficha de la clienta</button>}</details></div><div className="opp-actions">{item.phone ? <a className="opp-button opp-primary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${item.phone}?text=${encodeURIComponent(`Hola ${item.name.split(' ')[0]}, soy Ana de ${bizConfig.name}. ${item.reason==='no_slots' ? 'Si sigues buscando cita, podemos revisar alternativas de fecha para tus servicios.' : 'Si necesitas ayuda para terminar tu reserva, podemos revisar fechas y servicios juntas.'}`)}`}><MessageCircle size={15}/>Abrir WhatsApp</a> : <small>Sin teléfono válido para WhatsApp</small>}{!item.recovered && <button type="button" className="opp-button" onClick={()=>updateCase(item,'contactedAt',!item.contacted)}>{item.contacted ? 'Deshacer contacto' : 'Marcar contactada'}</button>}{item.registered ? <small>Cita registrada</small> : <button type="button" className="opp-button" onClick={()=>updateCase(item,'recoveredAt',!item.recovered)}>{item.recovered ? 'Deshacer resolución' : 'Marcar resuelta'}</button>}</div></article>)}</div>
              {!filteredCases.length && <div className="opp-empty"><Sparkles size={25} color="#E4C687" style={{marginBottom:10}}/><p>{cases.length ? 'No hay registros con estos filtros.' : 'No hay oportunidades registradas en estas fechas.'}</p><small>Prueba otro periodo o consulta Todas.</small></div>}
              {pageCount>1 && <div className="opp-pagination"><button className="opp-button" type="button" disabled={currentPage<=1} onClick={()=>setOpportunityPage(currentPage-1)}>Anterior</button><span>{currentPage} de {pageCount}</span><button className="opp-button" type="button" disabled={currentPage>=pageCount} onClick={()=>setOpportunityPage(currentPage+1)}>Siguiente</button></div>}
              <p className="opp-muted">WhatsApp abre el mensaje para que lo revises y envíes. Después marca Contactada. Marcar Resuelta solo organiza este seguimiento: no crea una cita.</p>
              <details className="opp-analytics"><summary>Ver qué se busca y dónde se interrumpe la reserva</summary><div className="opp-two"><section><h3>Días sin hueco</h3>{demandDaysRanking.map(([day,count])=><div key={day} style={{marginTop:12,display:'flex',justifyContent:'space-between',gap:12}}><span>{['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][day]}</span><strong>{count}</strong></div>)}{!demandDaysRanking.length && <p style={{marginTop:10}}>No hay fechas deseadas registradas.</p>}</section><section><h3>Servicios sin hueco</h3>{demandServicesRanking.slice(0,8).map(([name,count])=><div key={name} style={{marginTop:12}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><span>{name}</span><strong>{count}</strong></div><div className="opp-track"><div style={{width:`${count/Math.max(1,...demandServicesRanking.map(row=>row[1]))*100}%`}}/></div></div>)}{!demandServicesRanking.length && <p style={{marginTop:10}}>No hay servicios registrados.</p>}</section></div><section style={{marginTop:24}}><h3>Pasos de reserva observados</h3>{journey.map(stage=><div key={stage.label} style={{marginTop:13}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><span>{stage.label}</span><strong>{stage.count}</strong></div><div className="opp-track"><div style={{width:`${journey[0].count ? Math.min(100,stage.count/journey[0].count*100) : 0}%`}}/></div></div>)}<p className="opp-muted" style={{marginTop:12}}>Personas identificadas por email. Son pasos observados, no todas las entradas a la web.</p></section></details>
              <details className="opp-note"><summary>Qué significa esta información</summary><p>Son registros guardados en este navegador y pueden incluir pruebas antiguas. Una búsqueda sin hueco no confirma que se haya perdido una clienta. Una reserva sin terminar lleva al menos 30 minutos sin cambios; no conocemos su motivo. Una misma persona puede aparecer en varios registros. Las fechas filtran cuándo se registró el intento, no la fecha que quería reservar.</p></details>
            </section>;
          })()}

          {/* TAB 7: VACACIONES Y FESTIVOS */}

          {adminTab === 'holidays' && (
            <div className="studio-holidays-premium" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <style>{`
                .studio-holidays-premium form { background: #322A25 !important; border-color: #3A312A !important; border-radius: 14px !important; padding: 22px !important; gap: 18px !important; }
                .studio-holidays-premium input, .studio-holidays-premium select { min-height: 44px; box-sizing: border-box; font-size: 13px !important; padding: 11px !important; color-scheme: dark; border-radius: 8px !important; background: #322A25 !important; border-color: #3A312A !important; }
                .studio-holidays-premium label { font-size: 12px !important; color: #D6CBB8 !important; margin-bottom: 5px; }
                .studio-holidays-premium button { font-size: 12px !important; min-height: 40px; font-weight: normal !important; border-radius: 8px !important; }
                .studio-holidays-premium form button[type=submit] { padding: 12px 20px !important; }
                .studio-holidays-premium > div:last-child > div { background: #322A25 !important; border-color: #3A312A !important; border-radius: 12px !important; padding: 18px !important; }
                .studio-holidays-premium > div:last-child button { background: transparent !important; color: #D6CBB8 !important; border-color: #3A312A !important; }
              `}</style>
              <div>
                <h3 style={{ color: '#E4C687', fontSize: '24px', fontWeight: 'normal', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Vacaciones y festivos</h3>
                <p style={{ color: '#D6CBB8', fontSize: '11px', margin: 0 }}>Planifica cierres de días completos. Se aplican a la agenda de Ana y a las horas disponibles del portal en este navegador.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: '#322A25', border: '1px solid #454634', borderRadius: '10px', padding: '14px', color: '#D6CBB8', fontSize: '12px' }}><span>Agenda de Ana + Portal de clientas · Bloqueo compartido local</span><button type="button" onClick={() => setAdminTab('agenda')} style={{ marginLeft: 'auto', cursor: 'pointer', color: '#E4C687', background: 'none', border: '1px solid #C5A059', borderRadius: '7px', padding: '9px 12px' }}>Ver agenda →</button></div>
              {newHolidayStart && newHolidayEnd && newHolidayEnd >= newHolidayStart && appointments.some(item => isActiveAppointment(item) && item.dateKey >= newHolidayStart && item.dateKey <= newHolidayEnd) && <div style={{ color: '#E4C687', fontSize: '13px', padding: '14px', borderLeft: '2px solid #b69b60' }}>Hay {appointments.filter(item => isActiveAppointment(item) && item.dateKey >= newHolidayStart && item.dateKey <= newHolidayEnd).length} citas en estas fechas. Guardar el cierre no las cancela.</div>}
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newHolidayStart || !newHolidayEnd) {
                  alert('Por favor, indica fecha de inicio y fin.');
                  return;
                }
                if (newHolidayEnd < newHolidayStart) { alert('La fecha final debe ser igual o posterior a la inicial.'); return; }
                if (holidaysList.some(block => newHolidayStart <= block.endDate && newHolidayEnd >= block.startDate)) { alert('Ya existe un cierre en estas fechas. Revisa los periodos guardados.'); return; }
                const affected = appointments.filter(item => isActiveAppointment(item) && item.dateKey >= newHolidayStart && item.dateKey <= newHolidayEnd);
                if (affected.length && !window.confirm(`Hay ${affected.length} citas en este periodo. Se conservarán y tendrás que revisarlas. ¿Guardar el cierre?`)) return;
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
              }} style={{ backgroundColor: '#322A25', border: '1px solid #B98A3E', borderRadius: '10px', padding: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ color: '#E4C687', fontSize: '13px', margin: 0 }}>Nuevo cierre</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#FFF8EE', fontSize: '11px' }}>Tipo:</label>
                    <select value={newHolidayType} onChange={(e) => setNewHolidayType(e.target.value as any)} style={{ padding: '8px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '11px' }}>
                      <option value="vacaciones">Vacaciones</option>
                      <option value="festivo">Festivo</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#FFF8EE', fontSize: '11px' }}>Desde el día:</label>
                    <input type="date" value={newHolidayStart} onChange={(e) => setNewHolidayStart(e.target.value)} required style={{ padding: '8px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '11px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#FFF8EE', fontSize: '11px' }}>Hasta el día:</label>
                    <input type="date" min={newHolidayStart || undefined} value={newHolidayEnd} onChange={(e) => setNewHolidayEnd(e.target.value)} required style={{ padding: '8px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '11px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: '#FFF8EE', fontSize: '11px' }}>Motivo o descripción:</label>
                  <input type="text" placeholder="Ej. Vacaciones de verano o Festivo local de Elche" value={newHolidayReason} onChange={(e) => setNewHolidayReason(e.target.value)} style={{ padding: '8px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '6px', fontSize: '11px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '10px 18px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                    Guardar cierre
                  </button>
                </div>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ color: '#E4C687', fontSize: '13px', margin: '5px 0 0 0' }}>Cierres programados</h4>
                {holidaysList.length === 0 ? (
                  <div style={{ backgroundColor: '#322A25', padding: '15px', borderRadius: '8px', color: '#D6CBB8', fontSize: '11px', textAlign: 'center' }}>
                    No hay vacaciones ni festivos bloqueados actualmente.
                  </div>
                ) : (
                  [...holidaysList].sort((a,b) => a.startDate.localeCompare(b.startDate)).map((h) => (
                    <div key={h.id} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '8px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ backgroundColor: h.type === 'vacaciones' ? '#3E342C' : '#F2DCD8', color: h.type === 'vacaciones' ? '#8F6D24' : '#C0392B', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                            {h.type === 'vacaciones' ? 'VACACIONES' : 'FESTIVO'}
                          </span>
                          <span style={{ color: '#FFF8EE', fontSize: '12px', fontWeight: 'bold' }}>{h.reason}</span>
                        </div>
                        <span style={{ color: '#D6CBB8', fontSize: '11px' }}>Desde el <strong>{h.startDate.split('-').reverse().join('/')}</strong> hasta el <strong>{h.endDate.split('-').reverse().join('/')}</strong></span>
                      </div>
                      <button onClick={() => {
                        if (window.confirm('¿Eliminar este bloqueo y permitir reservas en estas fechas?')) {
                          setHolidaysList(holidaysList.filter(item => item.id !== h.id));
                        }
                      }} style={{ backgroundColor: '#F2DCD8', border: '1px solid #8A2F23', color: '#C0392B', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Quitar cierre
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

      {catalogEditorId && currentScreen === 'adminPanel' && adminTab === 'catalog' && <div onClick={() => setCatalogEditorId(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1700 }} />}
      {registeredAppointment && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'grid', placeItems: 'center', padding: '16px', zIndex: 3000 }}>
        <div role="dialog" aria-modal="true" aria-labelledby="appointment-registered-title" style={{ width: '100%', maxWidth: '440px', boxSizing: 'border-box',
          background: '#322A25', border: '1px solid rgba(228, 198, 135, 0.45)', borderRadius: '14px', padding: '26px', color: '#FFF8EE' }}>
          <h3 id="appointment-registered-title" style={{ margin: '0 0 14px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '26px', fontWeight: 'normal', color: '#E4C687' }}>Cita registrada</h3>
          <p style={{ lineHeight: 1.7 }}>{registeredAppointment.clientName}<br />
            {registeredAppointment.dateKey.split('-').reverse().join('/')} · {registeredAppointment.time}</p>
          <p style={{ color: '#D6CBB8', lineHeight: 1.6, fontSize: '13px' }}>{registeredAppointment.serviceSubcategory.replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, '')}</p>
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
              {([{ title: '¿Qué incluye?', text: previewService.includesText }, { title: '¿Qué te llevas?', text: previewService.achievedText }, { title: '¿Es para ti?', text: previewService.forWhomText }]
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
        <p style={{ fontSize: 11, letterSpacing: 2, color: '#E4C687' }}>L’STUDIO ANA · POLÍTICAS DE RESERVA</p>
        <h2 id="reservation-policy-title" style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 400 }}>Los sábados, con reserva anticipada</h2>
        <p style={{ whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.7 }}>{saturdayPolicyText}</p>
        <p style={{ background: '#3A312A', padding: 12, borderRadius: 8, fontSize: 14, lineHeight: 1.6 }}><strong>Solicitar una cita no garantiza su confirmación.</strong> Te avisaremos cuando Ana la haya aceptado. Si corresponde un anticipo, se solicitará después de la aprobación.</p>
        {saturdayNeedsAcceptance && <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 0', fontSize: 14, lineHeight: 1.5 }}><input autoFocus type="checkbox" checked={reservationPolicyChecked} onChange={e => setReservationPolicyChecked(e.target.checked)} style={{ width: 22, height: 22, flexShrink: 0 }} /> He leído y entiendo las condiciones de reserva de los sábados.</label>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" onClick={leaveReservationPolicy} style={{ flex: 1, minHeight: 48, padding: 12, border: '1px solid #C5A059', borderRadius: 8, background: 'transparent', color: '#FFF8EE', cursor: 'pointer' }}>Elegir otro día</button>
          <button type="button" disabled={saturdayNeedsAcceptance && !reservationPolicyChecked} onClick={() => { if (saturdayNeedsAcceptance) setAcceptedSaturdayPolicy(saturdayPolicyKey); setReservationPolicyOpen(false); }} style={{ flex: 1, minHeight: 48, padding: 12, border: 'none', borderRadius: 8, background: '#C5A059', color: '#121212', opacity: saturdayNeedsAcceptance && !reservationPolicyChecked ? .45 : 1, cursor: 'pointer' }}>{saturdayNeedsAcceptance ? 'Continuar con la solicitud' : 'Entendido'}</button>
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
            <p>{saturdayRequestModal.serviceSubcategory.replace(/^PENDIENTE (?:SÁBADO|VALORACIÓN) /, '')}</p>
            {bizConfig.advancePaymentEnabled && (saturdayRequestModal.durationMinutes || 0) > bizConfig.advancePaymentThresholdMinutes && <p>{tf('reviewDeposit', {amount: bizConfig.depositAmount})}</p>}
            <p style={{ color: '#D6CBB8', fontSize: '12px' }}>{t('localRequestNotice')}</p>
            <button type="button" onClick={() => setSaturdayRequestModal(null)} style={{ padding: '10px', marginRight: '10px' }}>{t('backAction')}</button>
            <button type="button" onClick={registerSaturdayRequest} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{t('registerRequest')}</button>
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
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setAdvancePaymentModal(null)} style={{ padding: '10px', cursor: 'pointer' }}>{t('backAction')}</button>
              <button type="button" onClick={savePendingAdvanceAppointment} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{t('registerPayment')}</button>
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
                      <div style={{ flex: '1 1 180px', fontSize: '14px', lineHeight: 1.6, overflowWrap: 'anywhere' }}><strong>{item.clientName}</strong><span style={{ display: 'block', color: '#D6CBB8' }}>{item.serviceSubcategory.replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, '')}</span><span style={{ display: 'block', fontSize: '12px', color: '#D6CBB8', marginTop: '8px' }}>{item.lifecycleStatus === 'cancelled' ? 'Cancelada' : item.lifecycleStatus === 'no_show' ? 'No presentada' : item.completedAt ? 'Realizada' : item.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : item.advancePayment?.status === 'pending' ? 'Pendiente de Bizum' : 'Confirmada'} · Ver detalles</span></div>
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
                {catalog[modalCatIndex]?.subservices.map((sub, idx) => (<option key={sub.id} value={idx} disabled={sub.active === false}>{sub.name}{sub.active === false ? " · Desactivado" : ""}</option>))}
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
                      <span>{item.sub.name}{item.variant ? ` (${item.variant.name})` : ''} · {item.variant?.duration || item.sub.duration}</span>
                      <button type="button" aria-label={`Quitar ${item.sub.name}`} onClick={() => setModalServices(previous => previous.filter(entry => entry.sub.id !== item.sub.id))} style={{ background: 'none', border: '1px solid #3A312A', color: '#D6CBB8', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>Quitar</button>
                    </div>
                  ))}
                  <p style={{ color: '#E4C687', marginBottom: 0 }}>Duración total: {getModalDuration(modalServices)} min</p>
                </div>
              )}
              <small style={{ color: '#D6CBB8' }}>Selecciona cada servicio y pulsa «Añadir servicio». Si repites uno, se actualiza su variante. Se guardarán los servicios de la lista; sin lista, se guardará el servicio seleccionado.</small>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: '1px solid #3A312A', color: '#D6CBB8', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{editingAppointment ? 'Guardar cambios' : 'Guardar Cita'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE CITA */}
      {viewApptModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          {Boolean(currentScreen === 'adminPanel') ? (<><style>{`
.lst-appt-dialog {width:min(1100px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;background:#322A25;border:1px solid #C5A059;border-radius:16px;box-shadow:0 24px 80px #0008;overflow:hidden;color:#FFF8EE;}
.lst-appt-head {display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 22px;border-bottom:1px solid #655039;flex-shrink:0;}
.lst-appt-head h3 {font-size:25px!important;margin-top:6px!important;}
.lst-appt-body {display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:20px;padding:20px 22px;overflow-y:auto;min-height:0;overscroll-behavior:contain;}
.lst-appt-column {display:flex;flex-direction:column;gap:12px;min-width:0;}
.lst-appt-footer {display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 22px;border-top:1px solid #655039;background:#29231F;flex-shrink:0;}
.lst-appt-footer>div {display:contents!important;}
.lst-appt-footer button {font-size:12px!important;min-height:40px;padding:9px 12px!important;}
.lst-appt-column>button {text-align:left;font-size:13px;}
.lst-appt-notices {border:1px solid #655039;border-radius:10px;padding:12px;}
.lst-appt-notices summary {cursor:pointer;color:#E4C687;font-size:13px;min-height:30px;}
.lst-appt-notices[open] {display:flex;flex-direction:column;gap:12px;}
@media(max-width:760px){.lst-appt-body{grid-template-columns:1fr;padding:14px;gap:14px}.lst-appt-head{padding:14px}.lst-appt-footer{padding:10px 14px}.lst-appt-dialog{max-height:calc(100dvh - 24px)}}
`}</style><div className="lst-appt-dialog" role="dialog" aria-modal="true" aria-label="Detalle de la cita"><header className="lst-appt-head"><div><p style={{ color: '#E4C687', fontSize: '13px', letterSpacing: '2px', margin: 0 }}>360studio · DETALLE DE LA CITA</p>
<h3 style={{ color: '#FFF8EE', fontSize: '26px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', margin: 0 }}>{viewApptModal.clientName}</h3></div><button type="button" autoFocus onClick={() => setViewApptModal(null)} aria-label="Cerrar detalle de la cita" style={{background:'transparent',border:'1px solid #655039',borderRadius:8,color:'#FFF8EE',minWidth:40,minHeight:40,cursor:'pointer'}}>✕</button></header><div className="lst-appt-body"><div className="lst-appt-column">

{!viewApptModal.completedAt && isActiveAppointment(viewApptModal) && (() => {
  const url = delayWhatsAppUrl(viewApptModal.phone);
  return <section style={{ padding: '12px', border: '1px solid #C5A059', borderRadius: '10px', background: '#29231F' }}>
    <p style={{ margin: '0 0 8px', color: '#E4C687', fontSize: '13px', fontWeight: 600 }}>¿La clienta lleva 10 minutos de retraso?</p>
    {url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', minHeight: '44px', boxSizing: 'border-box', background: '#8FC98F', color: '#193923', borderRadius: '8px', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}><MessageCircle size={17} />WhatsApp · Clienta con retraso</a> : <p style={{ color: '#E4C687', fontSize: '12px', margin: 0 }}>Añade un teléfono válido a la cita para preparar el aviso.</p>}
    <p style={{ margin: '8px 0 0', color: '#D6CBB8', fontSize: '12px' }}>Envía este aviso solo si han pasado 10 minutos y la clienta no ha llegado. Revísalo y pulsa Enviar en WhatsApp.</p>
  </section>;
})()}
<section>
              <h4 style={{ color: '#E4C687', fontSize: '14px', margin: '0 0 12px' }}>Servicios reservados</h4>
              {viewApptModal.services?.length ? viewApptModal.services.map((item, index) => <div key={index} style={{ backgroundColor: '#322A25', padding: '14px', border: '1px solid #3A312A', borderRadius: '8px', marginBottom: '8px', fontSize: '14px', lineHeight: 1.6, color: '#FFF8EE' }}><strong>{item.sub.name}</strong>{item.variant && <span style={{ display: 'block', color: '#D6CBB8' }}>{item.variant.name}</span>}<span style={{ display: 'block', color: '#E4C687', fontSize: '13px' }}>{item.variant?.price || item.sub.price} · {item.variant?.duration || item.sub.duration}</span></div>) : <p style={{ color: '#E4C687', fontSize: '14px', lineHeight: 1.6, overflowWrap: 'anywhere' }}>{viewApptModal.serviceSubcategory}</p>}
            </section>
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#D6CBB8', fontSize: '13px', overflowWrap: 'anywhere' }}>
              <a href={`tel:${viewApptModal.phone}`} style={{ color: '#E4C687', padding: '8px 0' }}>{viewApptModal.phone}</a>
              <span style={{ padding: '8px 0' }}>{viewApptModal.email}</span>
            </div>
<section style={{ padding: '14px', background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px' }}>
              <label htmlFor="appointment-internal-notes" style={{ color: '#E4C687', fontSize: '13px' }}>Notas internas · Solo 360studio</label>
              <textarea id="appointment-internal-notes" value={appointmentNoteDraft} onChange={event => setAppointmentNoteDraft(event.target.value)}
                rows={3} placeholder="Detalles para preparar o hacer seguimiento de esta cita"
                style={{ width: '100%', boxSizing: 'border-box', margin: '10px 0', padding: '10px', background: '#322A25',
                  color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }} />
              <button type="button" onClick={() => {
                const updated = { ...viewApptModal, internalNotes: appointmentNoteDraft };
                setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
                setViewApptModal(updated); alert('Notas internas guardadas.');
              }} style={{ padding: '10px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', cursor: 'pointer' }}>Guardar notas</button>
            </section>
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
              borderRadius: '8px', padding: '12px', cursor: 'pointer' }}>Editar servicios y duración</button>}</div><aside className="lst-appt-column"><div style={{ backgroundColor: adminAppointmentColor(viewApptModal).background, border: `1px solid ${adminAppointmentColor(viewApptModal).border}`, borderRadius: '10px', padding: '18px', color: '#FFF8EE' }}>
              <strong style={{ fontSize: '14px' }}>{viewApptModal.lifecycleStatus === 'cancelled' ? 'Cancelada · Hueco liberado' : viewApptModal.lifecycleStatus === 'no_show' ? 'No presentada · Registro conservado' : viewApptModal.completedAt ? 'Realizada · Registrada en el pasaporte' : viewApptModal.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.advancePayment?.status === 'pending' ? 'Pendiente de Bizum' : 'Cita confirmada'}</strong>
              <p style={{ fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '21px', margin: '12px 0 8px' }}>{new Date(`${viewApptModal.dateKey}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {viewApptModal.time}</p>
              <span style={{ color: '#D6CBB8', fontSize: '13px' }}>Duración total: {viewApptModal.durationMinutes || 45} min</span>
              {viewApptModal.professionalName && <span style={{ color: '#D6CBB8', fontSize: '13px', display: 'block', marginTop: '4px' }}>Profesional: {viewApptModal.professionalName}</span>}
            </div>
{viewApptModal.saturdayApproval && isActiveAppointment(viewApptModal) && (
              <div style={{ border: '1px solid #C5A059', padding: '12px', borderRadius: '8px', color: '#FFF8EE' }}>
                <strong>{approvalTitle(viewApptModal.saturdayApproval.reason)}: {viewApptModal.saturdayApproval.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.saturdayApproval.status === 'accepted' ? 'Aceptado por Ana' : 'Rechazado'}</strong>
                <p>{viewApptModal.saturdayApproval.reference}</p>
                {viewApptModal.saturdayApproval.status === 'pending' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" onClick={() => {
                      const payment = bizConfig.advancePaymentEnabled && (viewApptModal.durationMinutes || 0) > bizConfig.advancePaymentThresholdMinutes ? createAdvancePayment() : undefined;
                      const updated: Appointment = { ...viewApptModal, saturdayApproval: { ...viewApptModal.saturdayApproval!, status: 'accepted' }, advancePayment: payment, serviceSubcategory: viewApptModal.serviceSubcategory.replace(/^PENDIENTE (?:SÁBADO|VALORACIÓN)/, payment ? 'PENDIENTE BIZUM' : 'RESERVADO') };
                      setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
                      setViewApptModal(updated);
                    }} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', padding: '10px', border: 'none', cursor: 'pointer' }}>Aceptar solicitud</button>
                    <button type="button" onClick={() => {
                      if (!window.confirm('¿Rechazar esta solicitud pendiente de revisión?')) return;
                      setAppointments(previous => previous.filter(item => item.id !== viewApptModal.id));
                      setViewApptModal(null);
                    }} style={{ padding: '10px', cursor: 'pointer' }}>Rechazar solicitud</button>
                  </div>
                )}
                {viewApptModal.saturdayApproval.status === 'accepted' && <a style={{ color: '#E4C687' }} target="_blank" rel="noreferrer" href={`https://wa.me/34${viewApptModal.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(viewApptModal.advancePayment?.status === 'pending' ? `Hola ${viewApptModal.clientName}. Ana ha aceptado tu solicitud para el ${viewApptModal.dateKey.split('-').reverse().join('/')} a las ${viewApptModal.time}. Para confirmar, realiza un Bizum de ${viewApptModal.advancePayment?.amount} € al ${bizConfig.bizumNumber}. Concepto: ${advancePaymentConcept(viewApptModal)}. Confirmaremos al comprobar el pago.` : generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time))}`}>Abrir WhatsApp para avisar a la clienta</a>}
              </div>
            )}
{viewApptModal.advancePayment && isActiveAppointment(viewApptModal) && (
              <div style={{ border: '1px solid #C5A059', borderRadius: '8px', padding: '12px', color: '#FFF8EE', fontSize: '14px' }}>
                <strong>Reserva anticipada: {viewApptModal.advancePayment.amount} € · {viewApptModal.advancePayment.status === 'confirmed' ? 'Pago confirmado' : 'Pendiente de pago'}</strong>
                <p>Código: {viewApptModal.advancePayment.reference}</p>
                {viewApptModal.advancePayment.status === 'pending' && (
                  <button type="button" onClick={() => {
                    if (!window.confirm(`¿Has comprobado la recepción del Bizum de ${viewApptModal.advancePayment?.amount} € con este código?`)) return;
                    const updated: Appointment = { ...viewApptModal, advancePayment: { ...viewApptModal.advancePayment!, status: 'confirmed' }, serviceSubcategory: viewApptModal.serviceSubcategory.replace(/^PENDIENTE BIZUM/, 'RESERVADO'), remindersStatus: { email48h: true, whatsapp48h: true, whatsapp24h: true, whatsapp2h: true } };
                    setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
                    setViewApptModal(updated);
                  }} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Confirmar Bizum recibido</button>
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
            </div></details></aside></div><footer className="lst-appt-footer">{viewApptModal.completedAt ? <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.6 }}>Visita registrada en el pasaporte. Puedes editar o borrar esa visita desde Clientes → Editar pasaporte e historial.</p> : <button type="button" onClick={() => markAppointmentCompleted(viewApptModal)} style={{ backgroundColor: '#8FC98F', border: '1px solid #3E6B47', color: '#2C5538', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', fontSize: '14px' }}>Marcar como realizada · Añadir al pasaporte</button>}
<button type="button" onClick={() => { setRepeatAppointmentMode(false); setRescheduleModalAppt(viewApptModal); setNewRescheduleDate(viewApptModal.dateKey); setNewRescheduleTime(viewApptModal.time); setViewApptModal(null); }} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', fontSize: '14px' }}>Cambiar fecha u hora</button>
{!viewApptModal.completedAt && isActiveAppointment(viewApptModal) && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button type="button" onClick={() => changeAppointmentStatus(viewApptModal, 'cancelled')} style={{ padding: '10px', border: '1px solid #3A312A', color: '#C0392B', background: '#322A25', borderRadius: '6px', cursor: 'pointer' }}>{viewApptModal.lifecycleStatus === 'cancelled' ? 'Cita cancelada · WhatsApp' : 'Marcar cancelada'}</button>
              <button type="button" onClick={() => changeAppointmentStatus(viewApptModal, 'no_show')} style={{ padding: '10px', border: '1px solid #C5A059', color: '#D6CBB8', background: '#322A25', borderRadius: '6px', cursor: 'pointer' }}>No presentada</button>
            </div>}
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', marginTop: '10px' }}>
              <button onClick={(e) => handleDeleteAppointment(viewApptModal.id, e)} style={{ backgroundColor: '#F2DCD8', border: '1px solid #C0392B', color: '#8A2F23', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar Cita</button>
              <button onClick={() => setViewApptModal(null)} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cerrar</button>
            </div></footer></div></>) : (<div style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '16px', padding: '25px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', maxWidth: '560px', width: '100%', boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ color: '#E4C687', fontSize: '13px', letterSpacing: '2px', margin: 0 }}>360studio · DETALLE DE LA CITA</p>
            <h3 style={{ color: '#FFF8EE', fontSize: '26px', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontWeight: 'normal', margin: 0 }}>{viewApptModal.clientName}</h3>
            <div style={{ backgroundColor: adminAppointmentColor(viewApptModal).background, border: `1px solid ${adminAppointmentColor(viewApptModal).border}`, borderRadius: '10px', padding: '18px', color: '#FFF8EE' }}>
              <strong style={{ fontSize: '14px' }}>{viewApptModal.lifecycleStatus === 'cancelled' ? 'Cancelada · Hueco liberado' : viewApptModal.lifecycleStatus === 'no_show' ? 'No presentada · Registro conservado' : viewApptModal.completedAt ? 'Realizada · Registrada en el pasaporte' : viewApptModal.saturdayApproval?.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.advancePayment?.status === 'pending' ? 'Pendiente de Bizum' : 'Cita confirmada'}</strong>
              <p style={{ fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', fontSize: '21px', margin: '12px 0 8px' }}>{new Date(`${viewApptModal.dateKey}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {viewApptModal.time}</p>
              <span style={{ color: '#D6CBB8', fontSize: '13px' }}>Duración total: {viewApptModal.durationMinutes || 45} min</span>
              {viewApptModal.professionalName && <span style={{ color: '#D6CBB8', fontSize: '13px', display: 'block', marginTop: '4px' }}>Profesional: {viewApptModal.professionalName}</span>}
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
              {viewApptModal.services?.length ? viewApptModal.services.map((item, index) => <div key={index} style={{ backgroundColor: '#322A25', padding: '14px', border: '1px solid #3A312A', borderRadius: '8px', marginBottom: '8px', fontSize: '14px', lineHeight: 1.6, color: '#FFF8EE' }}><strong>{item.sub.name}</strong>{item.variant && <span style={{ display: 'block', color: '#D6CBB8' }}>{item.variant.name}</span>}<span style={{ display: 'block', color: '#E4C687', fontSize: '13px' }}>{item.variant?.price || item.sub.price} · {item.variant?.duration || item.sub.duration}</span></div>) : <p style={{ color: '#E4C687', fontSize: '14px', lineHeight: 1.6, overflowWrap: 'anywhere' }}>{viewApptModal.serviceSubcategory}</p>}
            </section>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#D6CBB8', fontSize: '13px', overflowWrap: 'anywhere' }}>
              <a href={`tel:${viewApptModal.phone}`} style={{ color: '#E4C687', padding: '8px 0' }}>{viewApptModal.phone}</a>
              <span style={{ padding: '8px 0' }}>{viewApptModal.email}</span>
            </div>
            {viewApptModal.completedAt ? <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.6 }}>Visita registrada en el pasaporte. Puedes editar o borrar esa visita desde Clientes → Editar pasaporte e historial.</p> : <button type="button" onClick={() => markAppointmentCompleted(viewApptModal)} style={{ backgroundColor: '#8FC98F', border: '1px solid #3E6B47', color: '#2C5538', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', fontSize: '14px' }}>Marcar como realizada · Añadir al pasaporte</button>}
            <button type="button" onClick={() => { setRepeatAppointmentMode(false); setRescheduleModalAppt(viewApptModal); setNewRescheduleDate(viewApptModal.dateKey); setNewRescheduleTime(viewApptModal.time); setViewApptModal(null); }} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', fontSize: '14px' }}>Cambiar fecha u hora</button>
            {viewApptModal.saturdayApproval && isActiveAppointment(viewApptModal) && (
              <div style={{ border: '1px solid #C5A059', padding: '12px', borderRadius: '8px', color: '#FFF8EE' }}>
                <strong>{approvalTitle(viewApptModal.saturdayApproval.reason)}: {viewApptModal.saturdayApproval.status === 'pending' ? 'Pendiente de aprobación' : viewApptModal.saturdayApproval.status === 'accepted' ? 'Aceptado por Ana' : 'Rechazado'}</strong>
                <p>{viewApptModal.saturdayApproval.reference}</p>
                {viewApptModal.saturdayApproval.status === 'pending' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" onClick={() => {
                      const payment = bizConfig.advancePaymentEnabled && (viewApptModal.durationMinutes || 0) > bizConfig.advancePaymentThresholdMinutes ? createAdvancePayment() : undefined;
                      const updated: Appointment = { ...viewApptModal, saturdayApproval: { ...viewApptModal.saturdayApproval!, status: 'accepted' }, advancePayment: payment, serviceSubcategory: viewApptModal.serviceSubcategory.replace(/^PENDIENTE (?:SÁBADO|VALORACIÓN)/, payment ? 'PENDIENTE BIZUM' : 'RESERVADO') };
                      setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
                      setViewApptModal(updated);
                    }} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', padding: '10px', border: 'none', cursor: 'pointer' }}>Aceptar solicitud</button>
                    <button type="button" onClick={() => {
                      if (!window.confirm('¿Rechazar esta solicitud pendiente de revisión?')) return;
                      setAppointments(previous => previous.filter(item => item.id !== viewApptModal.id));
                      setViewApptModal(null);
                    }} style={{ padding: '10px', cursor: 'pointer' }}>Rechazar solicitud</button>
                  </div>
                )}
                {viewApptModal.saturdayApproval.status === 'accepted' && <a style={{ color: '#E4C687' }} target="_blank" rel="noreferrer" href={`https://wa.me/34${viewApptModal.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(viewApptModal.advancePayment?.status === 'pending' ? `Hola ${viewApptModal.clientName}. Ana ha aceptado tu solicitud para el ${viewApptModal.dateKey.split('-').reverse().join('/')} a las ${viewApptModal.time}. Para confirmar, realiza un Bizum de ${viewApptModal.advancePayment?.amount} € al ${bizConfig.bizumNumber}. Concepto: ${advancePaymentConcept(viewApptModal)}. Confirmaremos al comprobar el pago.` : generateWhatsAppMessage(viewApptModal.clientName, viewApptModal.dateKey.split('-').reverse().join('/'), viewApptModal.time))}`}>Abrir WhatsApp para avisar a la clienta</a>}
              </div>
            )}
            {viewApptModal.advancePayment && isActiveAppointment(viewApptModal) && (
              <div style={{ border: '1px solid #C5A059', borderRadius: '8px', padding: '12px', color: '#FFF8EE', fontSize: '14px' }}>
                <strong>Reserva anticipada: {viewApptModal.advancePayment.amount} € · {viewApptModal.advancePayment.status === 'confirmed' ? 'Pago confirmado' : 'Pendiente de pago'}</strong>
                <p>Código: {viewApptModal.advancePayment.reference}</p>
                {viewApptModal.advancePayment.status === 'pending' && (
                  <button type="button" onClick={() => {
                    if (!window.confirm(`¿Has comprobado la recepción del Bizum de ${viewApptModal.advancePayment?.amount} € con este código?`)) return;
                    const updated: Appointment = { ...viewApptModal, advancePayment: { ...viewApptModal.advancePayment!, status: 'confirmed' }, serviceSubcategory: viewApptModal.serviceSubcategory.replace(/^PENDIENTE BIZUM/, 'RESERVADO'), remindersStatus: { email48h: true, whatsapp48h: true, whatsapp24h: true, whatsapp2h: true } };
                    setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
                    setViewApptModal(updated);
                  }} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Confirmar Bizum recibido</button>
                )}
              </div>
            )}
            <section style={{ padding: '14px', background: '#322A25', border: '1px solid #3A312A', borderRadius: '8px' }}>
              <label htmlFor="appointment-internal-notes" style={{ color: '#E4C687', fontSize: '13px' }}>Notas internas · Solo 360studio</label>
              <textarea id="appointment-internal-notes" value={appointmentNoteDraft} onChange={event => setAppointmentNoteDraft(event.target.value)}
                rows={3} placeholder="Detalles para preparar o hacer seguimiento de esta cita"
                style={{ width: '100%', boxSizing: 'border-box', margin: '10px 0', padding: '10px', background: '#322A25',
                  color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }} />
              <button type="button" onClick={() => {
                const updated = { ...viewApptModal, internalNotes: appointmentNoteDraft };
                setAppointments(previous => previous.map(item => item.id === updated.id ? updated : item));
                setViewApptModal(updated); alert('Notas internas guardadas.');
              }} style={{ padding: '10px', background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 0, borderRadius: '6px', cursor: 'pointer' }}>Guardar notas</button>
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
              <button onClick={(e) => handleDeleteAppointment(viewApptModal.id, e)} style={{ backgroundColor: '#F2DCD8', border: '1px solid #C0392B', color: '#8A2F23', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar Cita</button>
              <button onClick={() => setViewApptModal(null)} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>)}
        </div>
      )}

      {/* MODAL MODIFICAR HORA DE CITA */}
      {rescheduleModalAppt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1100 }}>
          <div style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', borderRadius: '16px', padding: '25px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', maxWidth: '500px', width: '100%', boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ color: '#E4C687', fontSize: '24px', fontWeight: 'normal', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em', margin: 0 }}>{repeatAppointmentMode ? 'Repetir cita' : 'Cambiar fecha u hora'}</h3>
            <p style={{ color: '#D6CBB8', fontSize: '14px', margin: 0 }}>Clienta: <strong style={{ color: '#FFF8EE' }}>{rescheduleModalAppt.clientName}</strong></p>
            <div style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '9px', padding: '14px', color: '#D6CBB8', fontSize: '13px', lineHeight: 1.7 }}>
              {repeatAppointmentMode ? 'Cita de origen:' : 'Cita actual:'} {rescheduleModalAppt.dateKey.split('-').reverse().join('/')} · {rescheduleModalAppt.time}<br />
              Duración: {rescheduleModalAppt.durationMinutes || 45} min. {repeatAppointmentMode ? 'Se creará una nueva cita con estos servicios y variantes. La cita original se conserva.' : 'Los servicios se mantienen al cambiar la fecha.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#E4C687', fontSize: '14px', fontWeight: 'bold' }}>Nueva Fecha:</label>
              <input type="date" value={newRescheduleDate} onChange={(e) => setNewRescheduleDate(e.target.value)} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#E4C687', fontSize: '14px', fontWeight: 'bold' }}>Nueva Hora:</label>
              <select value={newRescheduleTime} onChange={(e) => setNewRescheduleTime(e.target.value)} style={{ padding: '12px', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', color: '#FFF8EE', borderRadius: '6px', fontSize: '14px' }}>
                <option value="" disabled>Selecciona una hora</option>
                {Array.from({ length: Math.ceil(1440 / agendaStep) }, (_, index) => minuteTime(index * agendaStep))
                  .filter(time => enableOutOfHours || isAgendaTimeWorking(new Date(newRescheduleDate + 'T12:00:00'), time, rescheduleModalAppt.durationMinutes || 45))
                  .map(h => (<option key={h} value={h}>{h}h</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setRescheduleModalAppt(null)} style={{ background: 'none', border: '1px solid #3A312A', color: '#D6CBB8', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={() => {
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
                    serviceSubcategory: 'RESERVADO ' + services.map(item => item.sub.name + (item.variant ? ' (' + item.variant.name + ')' : '')).join(' + '),
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
                setAppointments(previous => previous.map(a => a.id === rescheduleModalAppt.id ? { ...a, dateKey: newRescheduleDate, time: newRescheduleTime, dayName: date.toLocaleDateString('es-ES', { weekday: 'long' }) } : a));
                setRescheduleModalAppt(null);
                alert('¡Cita modificada con éxito!');
              }} style={{ background: 'linear-gradient(135deg, #C99E52 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{repeatAppointmentMode ? 'Crear nueva cita' : 'Guardar Cambios'}</button>
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
              <span style={{ color: '#D6CBB8' }}>{(cancelApptModal.services?.length ? cancelApptModal.services.map(item => item.sub.name + (item.variant ? ` (${item.variant.name})` : '')).join(' + ') : cancelApptModal.serviceSubcategory.replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, ''))}</span>
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
