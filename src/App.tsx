import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Globe, ChevronDown, ChevronRight, Clock, Calendar, MapPin, Star, Heart,
  Instagram, Facebook, MessageCircle, Scissors, Lock, Check, X, Plus,
  Edit2, Trash2, Tag, CalendarDays, Ban, Inbox, TrendingDown, Send,
  AlertTriangle, Sparkles, User, Phone, Mail, ArrowLeft, ArrowRight,
  CheckCircle2, XCircle, Clock3, CreditCard, CalendarPlus, Search,
  Filter, Bell, Settings, LogOut, Menu, Zap, Gift, Eye, EyeOff,
  ChevronLeft, ChevronUp, Quote, ThumbsUp, ThumbsDown, Phone as PhoneIcon, Navigation,
  SlidersHorizontal, Store, Clock4, Euro, MessageSquare,
  Users, Smartphone, TrendingUp, Download,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Lang = 'ES' | 'EN' | 'FR' | 'DE' | 'PT' | 'UK' | 'PL' | 'SV' | 'NL' | 'NO' | 'DA';
type View = 'portal' | 'manage' | 'pin';
type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'invoiced' | 'cancelled';
type PriceType = 'fixed' | 'from' | 'approx' | 'consult';

interface Service {
  id: string;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  priceType: PriceType;
  price: number | null;
  duration: number; // minutes
  buffer: number; // cleaning buffer minutes
  isPrivate: boolean;
  category: string;
}

interface PromoCode {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
  description: string;
}

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  services: string[];
  date: string;
  time: string;
  notes: string;
  status: BookingStatus;
  isSaturday: boolean;
  promoCode?: string;
  createdAt: string;
}

interface Feedback {
  id: string;
  rating: 'good' | 'neutral' | 'bad';
  message: string;
  date: string;
  clientName: string;
}

interface LostDemand {
  id: string;
  date: string;
  time: string;
  reason: string;
  service: string;
  estimatedRevenue: number;
}

interface ClientRecord {
  clientId: string;
  pin: string;
  name: string;
  surname: string;
  phone: string;
  notes: string;
  createdAt: string;
  lastAccess: string | null;
  pwaInstalled: boolean;
  accessCount: number;
}

// ─── i18n ───────────────────────────────────────────────────────────────────

const translations: Record<string, Record<Lang, string>> = {
  portalTitle: { ES: 'Portal del Cliente', EN: 'Client Portal', FR: 'Portail Client', DE: 'Kundenportal', PT: 'Portal do Cliente', UK: 'Портал клієнта', PL: 'Portal Klienta', SV: 'Kundportal', NL: 'Klantenportaal', NO: 'Kundeportal', DA: 'Kundeportal' },
  manageTitle: { ES: 'Gestión 360studio', EN: '360studio Management', FR: 'Gestion 360studio', DE: '360studio Verwaltung', PT: 'Gestão 360studio', UK: 'Управління 360studio', PL: 'Zarządzanie 360studio', SV: '360studio Hantering', NL: '360studio Beheer', NO: '360studio Administrasjon', DA: '360studio Administration' },
  enterPin: { ES: 'Introduce el PIN', EN: 'Enter PIN', FR: 'Entrez le PIN', DE: 'PIN eingeben', PT: 'Introduza o PIN', UK: 'Введіть PIN', PL: 'Wprowadź PIN', SV: 'Ange PIN', NL: 'Voer PIN in', NO: 'Tast inn PIN', DA: 'Indtast PIN' },
  wrongPin: { ES: 'PIN incorrecto', EN: 'Wrong PIN', FR: 'PIN incorrect', DE: 'Falsche PIN', PT: 'PIN incorreto', UK: 'Невірний PIN', PL: 'Nieprawidłowy PIN', SV: 'Fel PIN', NL: 'Onjuiste PIN', NO: 'Feil PIN', DA: 'Forkert PIN' },
  clientPortal: { ES: 'Portal del Cliente', EN: 'Client Portal', FR: 'Portail Client', DE: 'Kundenportal', PT: 'Portal do Cliente', UK: 'Портал клієнта', PL: 'Portal Klienta', SV: 'Kundportal', NL: 'Klantenportaal', NO: 'Kundeportal', DA: 'Kundeportal' },
  management: { ES: 'Gestión', EN: 'Management', FR: 'Gestion', DE: 'Verwaltung', PT: 'Gestão', UK: 'Управління', PL: 'Zarządzanie', SV: 'Hantering', NL: 'Beheer', NO: 'Administrasjon', DA: 'Administration' },
  stylistProfile: { ES: 'Perfil de la Estilista', EN: 'Stylist Profile', FR: 'Profil de la Styliste', DE: 'Profil der Stylistin', PT: 'Perfil da Estilista', UK: 'Профіль стиліста', PL: 'Profil Stylistki', SV: 'Stylistprofil', NL: 'Stylistprofiel', NO: 'Stylistprofil', DA: 'Stylistprofil' },
  serviceCatalog: { ES: 'Catálogo de Servicios', EN: 'Service Catalog', FR: 'Catalogue de Services', DE: 'Servicekatalog', PT: 'Catálogo de Serviços', UK: 'Каталог послуг', PL: 'Katalog Usług', SV: 'Servicekatalog', NL: 'Servicecatalogus', NO: 'Servicekatalog', DA: 'Servicekatalog' },
  booking: { ES: 'Reservar Cita', EN: 'Book Appointment', FR: 'Prendre Rendez-vous', DE: 'Termin Buchen', PT: 'Agendar', UK: 'Записатися', PL: 'Rezerwacja', SV: 'Boka Tid', NL: 'Afspraak Maken', NO: 'Bestill Time', DA: 'Bestil Tid' },
  from: { ES: 'Desde', EN: 'From', FR: 'À partir de', DE: 'Ab', PT: 'Desde', UK: 'Від', PL: 'Od', SV: 'Från', NL: 'Vanaf', NO: 'Fra', DA: 'Fra' },
  approx: { ES: 'Aprox', EN: 'Approx', FR: 'Environ', DE: 'Ca.', PT: 'Aprox', UK: 'Прибл.', PL: 'Około', SV: 'Ca', NL: 'Ongeveer', NO: 'Ca.', DA: 'Ca.' },
  consult: { ES: 'Consultar', EN: 'Inquire', FR: 'Consulter', DE: 'Anfragen', PT: 'Consultar', UK: 'Запитати', PL: 'Zapytać', SV: 'Förfråga', NL: 'Raadpleeg', NO: 'Spør', DA: 'Forespørg' },
  promoPlaceholder: { ES: 'Código promocional', EN: 'Promo code', FR: 'Code promo', DE: 'Promo-Code', PT: 'Código promocional', UK: 'Промокод', PL: 'Kod promocyjny', SV: 'Kampanjkod', NL: 'Promocode', NO: 'Kampanjekode', DA: 'Kampagnekode' },
  applyPromo: { ES: 'Aplicar', EN: 'Apply', FR: 'Appliquer', DE: 'Anwenden', PT: 'Aplicar', UK: 'Застосувати', PL: 'Zastosuj', SV: 'Tillämpa', NL: 'Toepassen', NO: 'Bruk', DA: 'Anvend' },
  notes: { ES: 'Notas / Observaciones', EN: 'Notes / Observations', FR: 'Notes / Observations', DE: 'Notizen / Beobachtungen', PT: 'Notas / Observações', UK: 'Нотатки / Спостереження', PL: 'Notatki / Obserwacje', SV: 'Anteckningar', NL: 'Notities', NO: 'Notater', DA: 'Noter' },
  notesPlaceholder: { ES: 'Alergias, preferencias, detalles...', EN: 'Allergies, preferences, details...', FR: 'Allergies, préférences, détails...', DE: 'Allergien, Vorlieben, Details...', PT: 'Alergias, preferências, detalhes...', UK: 'Алергії, уподобання, деталі...', PL: 'Alergie, preferencje, szczegóły...', SV: 'Allergier, preferenser, detaljer...', NL: 'Allergieën, voorkeuren, details...', NO: 'Allergier, preferanser, detaljer...', DA: 'Allergier, præferencer, detaljer...' },
  selectServices: { ES: 'Selecciona servicios', EN: 'Select services', FR: 'Sélectionnez des services', DE: 'Services auswählen', PT: 'Selecione serviços', UK: 'Виберіть послуги', PL: 'Wybierz usługi', SV: 'Välj tjänster', NL: 'Selecteer services', NO: 'Velg tjenester', DA: 'Vælg ydelser' },
  selectDate: { ES: 'Selecciona fecha', EN: 'Select date', FR: 'Choisir la date', DE: 'Datum wählen', PT: 'Selecione a data', UK: 'Виберіть дату', PL: 'Wybierz datę', SV: 'Välj datum', NL: 'Selecteer datum', NO: 'Velg dato', DA: 'Vælg dato' },
  selectTime: { ES: 'Selecciona hora', EN: 'Select time', FR: 'Choisir l\'heure', DE: 'Uhrzeit wählen', PT: 'Selecione a hora', UK: 'Виберіть час', PL: 'Wybierz godzinę', SV: 'Välj tid', NL: 'Selecteer tijd', NO: 'Velg tid', DA: 'Vælg tid' },
  confirmBooking: { ES: 'Confirmar Reserva', EN: 'Confirm Booking', FR: 'Confirmer', DE: 'Bestätigen', PT: 'Confirmar', UK: 'Підтвердити', PL: 'Potwierdź', SV: 'Bekräfta', NL: 'Bevestig', NO: 'Bekreft', DA: 'Bekræft' },
  deposit: { ES: 'Reserva vía Bizum', EN: 'Deposit via Bizum', FR: 'Acompte via Bizum', DE: 'Anzahlung via Bizum', PT: 'Depósito via Bizum', UK: 'Депозит через Bizum', PL: 'Depozyt przez Bizum', SV: 'Deposition via Bizum', NL: 'Borg via Bizum', NO: 'Innskudd via Bizum', DA: 'Depositum via Bizum' },
  depositInfo: { ES: 'Para confirmar tu cita, realiza un Bizum de 20€ al 672163485', EN: 'To confirm your appointment, send a €20 Bizum to 672163485', FR: 'Pour confirmer, envoyez 20€ par Bizum au 672163485', DE: 'Zur Bestätigung 20€ Bizum an 672163485', PT: 'Para confirmar, envie 20€ Bizum para 672163485', UK: 'Для підтвердження надішліть 20€ Bizum на 672163485', PL: 'Aby potwierdzić, wyślij 20€ Bizum na 672163485', SV: 'För att bekräfta, skicka 20€ Bizum till 672163485', NL: 'Stuur 20€ Bizum naar 672163485', NO: 'Send 20€ Bizum til 672163485 for å bekrefte', DA: 'Send 20€ Bizum til 672163485 for at bekræfte' },
  saturdayNotice: { ES: 'SÁBADOS: Sujeto a aprobación manual de Ana', EN: 'SATURDAYS: Subject to Ana\'s manual approval', FR: 'SAMEDIS: Soumis à l\'approbation manuelle d\'Ana', DE: 'SAMSTAGE: Bedarf Annas manueller Freigabe', PT: 'SÁBADOS: Sujeito à aprovação manual de Ana', UK: 'СУБОТИ: Підлягають ручному схваленню Ани', PL: 'SOBOTY: Wymagają ręcznej aprobaty Any', SV: 'LÖRDAGAR: Kräver Annas manuella godkännande', NL: 'ZATERDAGEN: Onderworpen aan Ana\'s handmatige goedkeuring', NO: 'LØRDAGER: Krever Annas manuelle godkjenning', DA: 'LØRDAGE: Kræver Annas manuelle godkendelse' },
  reviewPrompt: { ES: '¿Cómo fue tu experiencia?', EN: 'How was your experience?', FR: 'Comment était votre expérience?', DE: 'Wie war Ihre Erfahrung?', PT: 'Como foi a sua experiência?', UK: 'Як був ваш досвід?', PL: 'Jak było Twoje doświadczenie?', SV: 'Hur var din upplevelse?', NL: 'Hoe was uw ervaring?', NO: 'Hvordan var opplevelsen?', DA: 'Hvordan var oplevelsen?' },
  reviewGood: { ES: '¡Nos alegra que hayas disfrutado! Nos encantaría tu reseña en Google', EN: 'We\'re glad you enjoyed! We\'d love your review on Google', FR: 'Nous sommes ravis! Nous adorerions votre avis sur Google', DE: 'Wir freuen uns! Wir würden uns über eine Google-Bewertung freuen', PT: 'Estamos felizes! Adoraríamos sua avaliação no Google', UK: 'Ми раді! Будемо вдячні за відгук у Google', PL: 'Cieszymy się! Bylibyśmy wdzięczni za opinię w Google', SV: 'Vi är glada! Vi skulle uppskatta din recension på Google', NL: 'We zijn blij! We waarderen je Google review', NO: 'Vi er glade! Vi setter pris på din Google-anmeldelse', DA: 'Vi er glade! Vi vil sætte pris på din Google-anmeldelse' },
  reviewNeutral: { ES: 'Lamentamos que no haya sido perfecto. Cuéntanos en privado', EN: 'Sorry it wasn\'t perfect. Tell us privately', FR: 'Désolé que ce ne soit pas parfait. Dites-nous en privé', DE: 'Schade, dass es nicht perfekt war. Sag uns privat', PT: 'Lamentamos que não foi perfeito. Diga-nos em privado', UK: 'Жаль, що не ідеально. Розкажіть нам приватно', PL: 'Przykro nam. Powiedz nam prywatnie', SV: 'Tråkigt att det inte var perfekt. Berätta privat', NL: 'Jammer dat het niet perfect was. Vertel ons privé', NO: 'Vi beklager. Fortell oss privat', DA: 'Vi beklager. Fortæl os privat' },
  location: { ES: 'Ubicación', EN: 'Location', FR: 'Emplacement', DE: 'Standort', PT: 'Localização', UK: 'Локація', PL: 'Lokalizacja', SV: 'Plats', NL: 'Locatie', NO: 'Plassering', DA: 'Lokation' },
  getDirections: { ES: 'Cómo llegar', EN: 'Get Directions', FR: 'Itinéraire', DE: 'Wegbeschreibung', PT: 'Como chegar', UK: 'Прокласти маршрут', PL: 'Wskazówki dojazdu', SV: 'Vägbeskrivning', NL: 'Routebeschrijving', NO: 'Veibeskrivelse', DA: 'Vejbeskrivelse' },
  followUs: { ES: 'Síguenos', EN: 'Follow Us', FR: 'Suivez-nous', DE: 'Folge uns', PT: 'Siga-nos', UK: 'Стежте за нами', PL: 'Śledź nas', SV: 'Följ oss', NL: 'Volg ons', NO: 'Følg oss', DA: 'Følg os' },
  viewInSpanish: { ES: 'Ver en Español', EN: 'View in Spanish', FR: 'Voir en Espagnol', DE: 'Auf Spanisch ansehen', PT: 'Ver em Espanhol', UK: 'Переглянути іспанською', PL: 'Zobacz po hiszpańsku', SV: 'Visa på spanska', NL: 'Bekijk in het Spaans', NO: 'Se på spansk', DA: 'Se på spansk' },
  pending: { ES: 'Pendiente', EN: 'Pending', FR: 'En attente', DE: 'Ausstehend', PT: 'Pendente', UK: 'Очікує', PL: 'Oczekujące', SV: 'Väntande', NL: 'In afwachting', NO: 'Venter', DA: 'Afventer' },
  confirmed: { ES: 'Confirmado', EN: 'Confirmed', FR: 'Confirmé', DE: 'Bestätigt', PT: 'Confirmado', UK: 'Підтверджено', PL: 'Potwierdzone', SV: 'Bekräftad', NL: 'Bevestigd', NO: 'Bekreftet', DA: 'Bekræftet' },
  completed: { ES: 'Completado', EN: 'Completed', FR: 'Terminé', DE: 'Abgeschlossen', PT: 'Concluído', UK: 'Завершено', PL: 'Ukończone', SV: 'Slutförd', NL: 'Voltooid', NO: 'Fullført', DA: 'Fuldført' },
  invoiced: { ES: 'Facturado', EN: 'Invoiced', FR: 'Facturé', DE: 'Fakturiert', PT: 'Faturado', UK: 'Виставлено', PL: 'Zafakturowane', SV: 'Fakturerad', NL: 'Gefactureerd', NO: 'Fakturert', DA: 'Faktureret' },
  cancelled: { ES: 'Cancelado', EN: 'Cancelled', FR: 'Annulé', DE: 'Storniert', PT: 'Cancelado', UK: 'Скасовано', PL: 'Anulowane', SV: 'Avbokad', NL: 'Geannuleerd', NO: 'Kansellert', DA: 'Annulleret' },
  approve: { ES: 'Aprobar', EN: 'Approve', FR: 'Approuver', DE: 'Genehmigen', PT: 'Aprovar', UK: 'Схвалити', PL: 'Zatwierdź', SV: 'Godkänn', NL: 'Goedkeuren', NO: 'Godkjenn', DA: 'Godkend' },
  reject: { ES: 'Rechazar', EN: 'Reject', FR: 'Rejeter', DE: 'Ablehnen', PT: 'Rejeitar', UK: 'Відхилити', PL: 'Odrzuć', SV: 'Avvisa', NL: 'Weigeren', NO: 'Avvis', DA: 'Afvis' },
  saturdayHub: { ES: 'Aprobación de Sábados', EN: 'Saturday Approval Hub', FR: 'Approbation Samedi', DE: 'Samstag-Freigabe', PT: 'Aprovação de Sábados', UK: 'Схвалення суботніх', PL: 'Aprobata sobót', SV: 'Lördagsgodkännande', NL: 'Zaterdag Goedkeuring', NO: 'Lørdagsgodkjenning', DA: 'Lørdagsgodkendelse' },
  catalogManager: { ES: 'Catálogo y Promociones', EN: 'Catalog & Promos', FR: 'Catalogue et Promos', DE: 'Katalog und Promos', PT: 'Catálogo e Promos', UK: 'Каталог та промо', PL: 'Katalog i promocje', SV: 'Katalog och kampanjer', NL: 'Catalogus en Promos', NO: 'Katalog og kampanjer', DA: 'Katalog og kampagner' },
  addService: { ES: 'Añadir Servicio', EN: 'Add Service', FR: 'Ajouter Service', DE: 'Service Hinzufügen', PT: 'Adicionar Serviço', UK: 'Додати послугу', PL: 'Dodaj usługę', SV: 'Lägg till tjänst', NL: 'Service toevoegen', NO: 'Legg til tjeneste', DA: 'Tilføj ydelse' },
  addPromo: { ES: 'Añadir Promo', EN: 'Add Promo', FR: 'Ajouter Promo', DE: 'Promo Hinzufügen', PT: 'Adicionar Promo', UK: 'Додати промо', PL: 'Dodaj promo', SV: 'Lägg till kampanj', NL: 'Promo toevoegen', NO: 'Legg til kampanje', DA: 'Tilføj kampagne' },
  private: { ES: 'Privado', EN: 'Private', FR: 'Privé', DE: 'Privat', PT: 'Privado', UK: 'Приватний', PL: 'Prywatny', SV: 'Privat', NL: 'Privé', NO: 'Privat', DA: 'Privat' },
  public: { ES: 'Público', EN: 'Public', FR: 'Public', DE: 'Öffentlich', PT: 'Público', UK: 'Публічний', PL: 'Publiczny', SV: 'Offentlig', NL: 'Openbaar', NO: 'Offentlig', DA: 'Offentlig' },
  duration: { ES: 'Duración', EN: 'Duration', FR: 'Durée', DE: 'Dauer', PT: 'Duração', UK: 'Тривалість', PL: 'Czas trwania', SV: 'Längd', NL: 'Duur', NO: 'Varighet', DA: 'Varighed' },
  buffer: { ES: 'Buffer de limpieza', EN: 'Cleaning buffer', FR: 'Buffer de nettoyage', DE: 'Reinigungspuffer', PT: 'Buffer de limpeza', UK: 'Буфер прибирання', PL: 'Bufor czyszczenia', SV: 'Städbuffer', NL: 'Schoonmaakbuffer', NO: 'Rengjøringsbuffer', DA: 'Rengøringsbuffer' },
  vacationBlocker: { ES: 'Bloqueo de Vacaciones', EN: 'Vacation Blocker', FR: 'Bloqueur de Vacances', DE: 'Urlaubssperre', PT: 'Bloqueador de Férias', UK: 'Блокувач відпусток', PL: 'Blokada urlopów', SV: 'Semesterblockering', NL: 'Vakantieblokkering', NO: 'Ferieblokkering', DA: 'Ferieblokering' },
  feedbackInbox: { ES: 'Bandeja de Feedback', EN: 'Feedback Inbox', FR: 'Boîte de Feedback', DE: 'Feedback-Posteingang', PT: 'Caixa de Feedback', UK: 'Вхідні відгуків', PL: 'Skrzynka opinii', SV: 'Feedbackinkorg', NL: 'Feedbackinbox', NO: 'Tilbakemeldingsinnboks', DA: 'Feedbackindbakke' },
  lostDemand: { ES: 'Demanda Perdida', EN: 'Lost Demand', FR: 'Demande Perdue', DE: 'Verlorene Nachfrage', PT: 'Demanda Perdida', UK: 'Втрачений попит', PL: 'Utracony popyt', SV: 'Förlorad efterfrågan', NL: 'Verloren vraag', NO: 'Tapt etterspørsel', DA: 'Tabt efterspørgsel' },
  whatsappTrigger: { ES: 'Trigger WhatsApp', EN: 'WhatsApp Trigger', FR: 'Déclencheur WhatsApp', DE: 'WhatsApp-Trigger', PT: 'Gatilho WhatsApp', UK: 'Тригер WhatsApp', PL: 'Wyzwalacz WhatsApp', SV: 'WhatsApp-utlösare', NL: 'WhatsApp-trigger', NO: 'WhatsApp-utløser', DA: 'WhatsApp-trigger' },
  calendar: { ES: 'Calendario', EN: 'Calendar', FR: 'Calendrier', DE: 'Kalender', PT: 'Calendário', UK: 'Календар', PL: 'Kalendarz', SV: 'Kalender', NL: 'Agenda', NO: 'Kalender', DA: 'Kalender' },
  back: { ES: 'Volver', EN: 'Back', FR: 'Retour', DE: 'Zurück', PT: 'Voltar', UK: 'Назад', PL: 'Wstecz', SV: 'Tillbaka', NL: 'Terug', NO: 'Tilbake', DA: 'Tilbage' },
  bookingConfirmed: { ES: '¡Reserva solicitada! Te contactaremos pronto.', EN: 'Booking requested! We\'ll contact you soon.', FR: 'Réservation demandée! Nous vous contacterons bientôt.', DE: 'Buchung angefragt! Wir melden uns bald.', PT: 'Reserva solicitada! Entraremos em contato em breve.', UK: 'Запит надіслано! Ми зв\'яжемося з вами скоро.', PL: 'Rezerwacja poproszona! Wkrótce się skontaktujemy.', SV: 'Bokning begärd! Vi hör av oss snart.', NL: 'Boeking aangevraagd! We nemen snel contact op.', NO: 'Bestilling forespurt! Vi kontakter deg snart.', DA: 'Bestilling anmodet! Vi kontakter dig snart.' },
  noBookings: { ES: 'No hay reservas', EN: 'No bookings', FR: 'Pas de réservations', DE: 'Keine Buchungen', PT: 'Sem reservas', UK: 'Немає бронювань', PL: 'Brak rezerwacji', SV: 'Inga bokningar', NL: 'Geen boekingen', NO: 'Ingen bestillinger', DA: 'Ingen bestillinger' },
  totalDuration: { ES: 'Duración total', EN: 'Total duration', FR: 'Durée totale', DE: 'Gesamtdauer', PT: 'Duração total', UK: 'Загальна тривалість', PL: 'Całkowity czas', SV: 'Total längd', NL: 'Totale duur', NO: 'Total varighet', DA: 'Total varighed' },
  includingBuffer: { ES: 'incluyendo limpieza', EN: 'including cleaning', FR: 'y compris nettoyage', DE: 'inkl. Reinigung', PT: 'incluindo limpeza', UK: 'вкл. прибирання', PL: 'w tym czyszczenie', SV: 'inkl. städning', NL: 'incl. schoonmaak', NO: 'inkl. rengjøring', DA: 'inkl. rengøring' },
  client: { ES: 'Cliente', EN: 'Client', FR: 'Client', DE: 'Kunde', PT: 'Cliente', UK: 'Клієнт', PL: 'Klient', SV: 'Kund', NL: 'Klant', NO: 'Kunde', DA: 'Kunde' },
  phone: { ES: 'Teléfono', EN: 'Phone', FR: 'Téléphone', DE: 'Telefon', PT: 'Telefone', UK: 'Телефон', PL: 'Telefon', SV: 'Telefon', NL: 'Telefoon', NO: 'Telefon', DA: 'Telefon' },
  date: { ES: 'Fecha', EN: 'Date', FR: 'Date', DE: 'Datum', PT: 'Data', UK: 'Дата', PL: 'Data', SV: 'Datum', NL: 'Datum', NO: 'Dato', DA: 'Dato' },
  time: { ES: 'Hora', EN: 'Time', FR: 'Heure', DE: 'Zeit', PT: 'Hora', UK: 'Час', PL: 'Czas', SV: 'Tid', NL: 'Tijd', NO: 'Tid', DA: 'Tid' },
  status: { ES: 'Estado', EN: 'Status', FR: 'Statut', DE: 'Status', PT: 'Estado', UK: 'Статус', PL: 'Status', SV: 'Status', NL: 'Status', NO: 'Status', DA: 'Status' },
  services: { ES: 'Servicios', EN: 'Services', FR: 'Services', DE: 'Services', PT: 'Serviços', UK: 'Послуги', PL: 'Usługi', SV: 'Tjänster', NL: 'Services', NO: 'Tjenester', DA: 'Ydelser' },
  save: { ES: 'Guardar', EN: 'Save', FR: 'Enregistrer', DE: 'Speichern', PT: 'Guardar', UK: 'Зберегти', PL: 'Zapisz', SV: 'Spara', NL: 'Opslaan', NO: 'Lagre', DA: 'Gem' },
  cancel: { ES: 'Cancelar', EN: 'Cancel', FR: 'Annuler', DE: 'Abbrechen', PT: 'Cancelar', UK: 'Скасувати', PL: 'Anuluj', SV: 'Avbryt', NL: 'Annuleren', NO: 'Avbryt', DA: 'Annuller' },
  name: { ES: 'Nombre', EN: 'Name', FR: 'Nom', DE: 'Name', PT: 'Nome', UK: 'Ім\'я', PL: 'Nazwa', SV: 'Namn', NL: 'Naam', NO: 'Navn', DA: 'Navn' },
  category: { ES: 'Categoría', EN: 'Category', FR: 'Catégorie', DE: 'Kategorie', PT: 'Categoria', UK: 'Категорія', PL: 'Kategoria', SV: 'Kategori', NL: 'Categorie', NO: 'Kategori', DA: 'Kategori' },
  price: { ES: 'Precio', EN: 'Price', FR: 'Prix', DE: 'Preis', PT: 'Preço', UK: 'Ціна', PL: 'Cena', SV: 'Pris', NL: 'Prijs', NO: 'Pris', DA: 'Pris' },
  code: { ES: 'Código', EN: 'Code', FR: 'Code', DE: 'Code', PT: 'Código', UK: 'Код', PL: 'Kod', SV: 'Kod', NL: 'Code', NO: 'Kode', DA: 'Kode' },
  discount: { ES: 'Descuento', EN: 'Discount', FR: 'Remise', DE: 'Rabatt', PT: 'Desconto', UK: 'Знижка', PL: 'Rabat', SV: 'Rabatt', NL: 'Korting', NO: 'Rabatt', DA: 'Rabat' },
  active: { ES: 'Activo', EN: 'Active', FR: 'Actif', DE: 'Aktiv', PT: 'Ativo', UK: 'Активний', PL: 'Aktywny', SV: 'Aktiv', NL: 'Actief', NO: 'Aktiv', DA: 'Aktiv' },
  inactive: { ES: 'Inactivo', EN: 'Inactive', FR: 'Inactif', DE: 'Inaktiv', PT: 'Inativo', UK: 'Неактивний', PL: 'Nieaktywny', SV: 'Inaktiv', NL: 'Inactief', NO: 'Inaktiv', DA: 'Inaktiv' },
  logout: { ES: 'Salir', EN: 'Logout', FR: 'Déconnexion', DE: 'Abmelden', PT: 'Sair', UK: 'Вийти', PL: 'Wyloguj', SV: 'Logga ut', NL: 'Uitloggen', NO: 'Logg ut', DA: 'Log ud' },
  tools: { ES: 'Herramientas', EN: 'Tools', FR: 'Outils', DE: 'Werkzeuge', PT: 'Ferramentas', UK: 'Інструменти', PL: 'Narzędzia', SV: 'Verktyg', NL: 'Tools', NO: 'Verktøy', DA: 'Værktøjer' },
  settings: { ES: 'Configuración', EN: 'Settings', FR: 'Configuration', DE: 'Einstellungen', PT: 'Configuração', UK: 'Налаштування', PL: 'Ustawienia', SV: 'Inställningar', NL: 'Instellingen', NO: 'Innstillinger', DA: 'Indstillinger' },
  allBookings: { ES: 'Todas las Reservas', EN: 'All Bookings', FR: 'Toutes les Réservations', DE: 'Alle Buchungen', PT: 'Todas as Reservas', UK: 'Усі бронювання', PL: 'Wszystkie rezerwacje', SV: 'Alla bokningar', NL: 'Alle boekingen', NO: 'Alle bestillinger', DA: 'Alle bestillinger' },
  reviewTitle: { ES: 'Tu opinión nos importa', EN: 'Your feedback matters', FR: 'Votre avis compte', DE: 'Ihre Meinung zählt', PT: 'Sua opinião importa', UK: 'Ваша думка важлива', PL: 'Twoja opinia ma znaczenie', SV: 'Din åsikt är viktig', NL: 'Jouw mening telt', NO: 'Din mening teller', DA: 'Din mening tæller' },
  sendReview: { ES: 'Enviar Reseña', EN: 'Send Review', FR: 'Envoyer l\'Avis', DE: 'Bewertung Senden', PT: 'Enviar Avaliação', UK: 'Надіслати відгук', PL: 'Wyślij opinię', SV: 'Skicka recension', NL: 'Stuur review', NO: 'Send anmeldelse', DA: 'Send anmeldelse' },
  thankYou: { ES: '¡Gracias por tu feedback!', EN: 'Thank you for your feedback!', FR: 'Merci pour votre avis!', DE: 'Danke für Ihre Bewertung!', PT: 'Obrigado pelo seu feedback!', UK: 'Дякуємо за ваш відгук!', PL: 'Dziękujemy za opinię!', SV: 'Tack för din feedback!', NL: 'Bedankt voor je feedback!', NO: 'Takk for din tilbakemelding!', DA: 'Tak for din feedback!' },
  leaveReviewGoogle: { ES: 'Dejar reseña en Google', EN: 'Leave Google Review', FR: 'Laisser un avis Google', DE: 'Google-Bewertung abgeben', PT: 'Deixar avaliação no Google', UK: 'Залишити відгук у Google', PL: 'Zostaw opinię w Google', SV: 'Lämna Google-recension', NL: 'Google review achterlaten', NO: 'Legg igjen Google-anmeldelse', DA: 'Efterlad Google-anmeldelse' },
  sendPrivate: { ES: 'Enviar mensaje privado', EN: 'Send private message', FR: 'Envoyer message privé', DE: 'Private Nachricht senden', PT: 'Enviar mensagem privada', UK: 'Надіслати приватне повідомлення', PL: 'Wyślij prywatną wiadomość', SV: 'Skicka privat meddelande', NL: 'Stuur privébericht', NO: 'Send privat melding', DA: 'Send privat besked' },
  bio: { ES: 'Con más de 25 años de experiencia en salud capilar y visagismo, Ana combina técnica y arte para realzar tu belleza natural. Especialista en tratamientos capilares personalizados, color de autor y cortes que se adaptan a tu rostro y estilo de vida.', EN: 'With over 25 years of experience in capillary health and visagism, Ana combines technique and art to enhance your natural beauty. Specialist in personalized capillary treatments, signature color, and cuts adapted to your face and lifestyle.', FR: 'Avec plus de 25 ans d\'expérience en santé capillaire et visagisme, Ana combine technique et art pour sublimer votre beauté naturelle. Spécialiste des traitements capillaires personnalisés, couleur signature et coupes adaptés à votre visage et votre style de vie.', DE: 'Mit über 25 Jahren Erfahrung in Haar- und Visagismus-Gesundheit kombiniert Ana Technik und Kunst, um Ihre natürliche Schönheit zu betonen. Spezialistin für personalisierte Haarbehandlungen, Signature-Farbe und Schnitte, die zu Ihrem Gesicht und Lebensstil passen.', PT: 'Com mais de 25 anos de experiência em saúde capilar e visagismo, Ana combina técnica e arte para realçar sua beleza natural. Especialista em tratamentos capilares personalizados, cor de autor e cortes adaptados ao seu rosto e estilo de vida.', UK: 'Маючи понад 25 років досвіду в здоров\'ї волосся та візажизмі, Анна поєднує техніку та мистецтво, щоб підкреслити вашу природну красу. Фахівець з персоналізованих процедур для волосся, авторського кольору та стрижок, адаптованих до вашого обличчя та способу життя.', PL: 'Z ponad 25-letnim doświadczeniem w zdrowiu włosów i wizażu, Ana łączy technikę i sztukę, aby podkreślić Twoje naturalne piękno. Specjalistka spersonalizowanych zabiegów włosów, autorskiego koloru i fryzur dopasowanych do Twojej twarzy i stylu życia.', SV: 'Med över 25 års erfarenhet av hårhälsa och visagism kombinerar Ana teknik och konst för att förstärka din naturliga skönhet. Specialist på personliga hårbehandlingar, signaturfärg och klippningar anpassade till ditt ansikte och livsstil.', NL: 'Met meer dan 25 jaar ervaring in haargezondheid en visagisme combineert Ana techniek en kunst om uw natuurlijke schoonheid te versterken. Specialist in gepersonaliseerde haarbehandelingen, handtekeningkleur en knipbeurten aangepast aan uw gezicht en levensstijl.', NO: 'Med over 25 års erfaring inom hårhelse og visagisme kombinerer Ana teknikk og kunst for å forsterke din naturlige skjønnhet. Spesialist i personlige hårbehandlinger, signaturfarge og klipp tilpasset ditt ansikt og din livsstil.', DA: 'Med over 25 års erfaring inden for hår sundhed og visagisme kombinerer Ana teknik og kunst for at fremhæve din naturlige skønhed. Specialist i personlige hårbehandlinger, signaturfarve og klip tilpasset dit ansigt og din livsstil.' },
};

function t(key: string, lang: Lang): string {
  return translations[key]?.[lang] ?? translations[key]?.['ES'] ?? key;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'ES', label: 'Español', flag: '🇪🇸' },
  { code: 'EN', label: 'English', flag: '🇬🇧' },
  { code: 'FR', label: 'Français', flag: '🇫🇷' },
  { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'PT', label: 'Português', flag: '🇵🇹' },
  { code: 'UK', label: 'Українська', flag: '🇺🇦' },
  { code: 'PL', label: 'Polski', flag: '🇵🇱' },
  { code: 'SV', label: 'Svenska', flag: '🇸🇪' },
  { code: 'NL', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'NO', label: 'Norsk', flag: '🇳🇴' },
  { code: 'DA', label: 'Dansk', flag: '🇩🇰' },
];

const CLIENT_PIN = '7009';
const MANAGE_PIN = '0000';
const BIZUM_NUMBER = '672163485';
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=L%27Studio+Ana+Hair+Experience';
const MAPS_DIR_URL = 'https://www.google.com/maps/dir/?api=1&destination=L%27Studio+Ana+Hair+Experience';
const GOOGLE_REVIEW_URL = 'https://www.google.com/search?q=L%27Studio+Ana+Hair+Experience+reviews';
const SOCIAL_LINKS = {
  instagram: 'https://instagram.com',
  tiktok: 'https://tiktok.com',
  facebook: 'https://facebook.com',
  whatsapp: 'https://wa.me/34672163485',
};

const PASTEL_COLORS = [
  'bg-rose-200/80 text-rose-900',
  'bg-amber-200/80 text-amber-900',
  'bg-emerald-200/80 text-emerald-900',
  'bg-sky-200/80 text-sky-900',
  'bg-violet-200/80 text-violet-900',
  'bg-pink-200/80 text-pink-900',
  'bg-teal-200/80 text-teal-900',
  'bg-orange-200/80 text-orange-900',
];

const STATUS_CONFIG: Record<BookingStatus, { color: string; bg: string; icon: typeof Clock3; labelKey: string }> = {
  pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', icon: Clock3, labelKey: 'pending' },
  confirmed: { color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30', icon: CheckCircle2, labelKey: 'confirmed' },
  completed: { color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', icon: CheckCircle2, labelKey: 'completed' },
  invoiced: { color: 'text-brand-gold', bg: 'bg-brand-gold/15 border-brand-gold/30', icon: CreditCard, labelKey: 'invoiced' },
  cancelled: { color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', icon: XCircle, labelKey: 'cancelled' },
};

// ─── Initial Data ────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES = [
  '1. Visagismo & Diagnóstico',
  '2. Color & Balayage',
  '3. Corte & Autor',
  '4. Tratamientos Capilares',
  '5. Alisado & Queratina',
  '6. Extensiones & Volumen',
  '7. Peinados & Recogidos',
  '8. Maquillaje & Visagismo Facial',
  '9. Servicios VIP',
  '10. Productos & Mantenimiento',
];

const initialServices: Service[] = [
  // 1. Visagismo & Diagnóstico
  { id: 's1', category: '1. Visagismo & Diagnóstico',
    name: { ES: 'Diagnóstico Capilar', EN: 'Capillary Diagnosis', FR: 'Diagnostic Capillaire', DE: 'Haardiagnose', PT: 'Diagnóstico Capilar', UK: 'Діагностика волосся', PL: 'Diagnoza włosów', SV: 'Hårdiagnos', NL: 'Haardiagnose', NO: 'Hårdiagnose', DA: 'Hårdiagnose' } as Record<Lang, string>,
    description: { ES: 'Análisis completo del cuero cabelludo y fibra capilar', EN: 'Complete scalp and hair fiber analysis', FR: 'Analyse complète du cuir chevelu', DE: 'Vollständige Kopfhautanalyse', PT: 'Análise completa do couro cabeludo', UK: 'Повний аналіз шкіри голови', PL: 'Pełna analiza skóry głowy', SV: 'Fullständig hårbottenanalys', NL: 'Volledige hoofdhuidanalyse', NO: 'Fullstendig hodebunnsanalyse', DA: 'Fuld hovedbundsanalyse' } as Record<Lang, string>,
    priceType: 'fixed', price: 15, duration: 30, buffer: 10, isPrivate: false },
  { id: 's2', category: '1. Visagismo & Diagnóstico',
    name: { ES: 'Test de Mechón', EN: 'Strand Test', FR: 'Test de Mèche', DE: 'Strähnentest', PT: 'Teste de Mecha', UK: 'Тест пасма', PL: 'Test pasemka', SV: 'Slingtest', NL: 'Loktest', NO: 'Lokktest', DA: 'Lokketest' } as Record<Lang, string>,
    description: { ES: 'Prueba de sensibilidad y color antes del servicio', EN: 'Sensitivity and color test before service', FR: 'Test de sensibilité et couleur', DE: 'Empfindlichkeits- und Farbtest', PT: 'Teste de sensibilidade e cor', UK: 'Тест чутливості та кольору', PL: 'Test wrażliwości i koloru', SV: 'Känslighets- och färgtest', NL: 'Gevoeligheids- en kleurtest', NO: 'Følsomhets- og fargetest', DA: 'Følsomheds- og farvetest' } as Record<Lang, string>,
    priceType: 'fixed', price: 10, duration: 15, buffer: 10, isPrivate: false },
  { id: 's3', category: '1. Visagismo & Diagnóstico',
    name: { ES: 'Visagismo Facial', EN: 'Facial Visagism', FR: 'Visagisme Facial', DE: 'Gesichts-Visagismus', PT: 'Visagismo Facial', UK: 'Візажизм обличчя', PL: 'Wizaż twarzy', SV: 'Ansiktsvisagism', NL: 'Gelaatsvisagisme', NO: 'Ansiktsvisagisme', DA: 'Ansigtsvisagisme' } as Record<Lang, string>,
    description: { ES: 'Estudio facial para corte y estilo personalizado', EN: 'Facial study for personalized cut and style', FR: 'Étude faciale pour coupe personnalisée', DE: 'Gesichtsstudie für individuellen Schnitt', PT: 'Estudo facial para corte personalizado', UK: 'Дослідження обличчя для індивідуального стилю', PL: 'Studium twarzy dla spersonalizowanego cięcia', SV: 'Ansiktsstudie för personlig klippning', NL: 'Gelaatsstudie voor persoonlijke knipbeurt', NO: 'Ansiktsstudie for personlig klipp', DA: 'Ansigtsstudie for personlig klip' } as Record<Lang, string>,
    priceType: 'fixed', price: 20, duration: 30, buffer: 10, isPrivate: false },
  // 2. Color & Balayage
  { id: 's4', category: '2. Color & Balayage',
    name: { ES: 'Coloración de Autor', EN: 'Signature Color', FR: 'Couleur Signature', DE: 'Signature-Farbe', PT: 'Cor de Autor', UK: 'Авторський колір', PL: 'Autorski kolor', SV: 'Signaturfärg', NL: 'Handtekeningkleur', NO: 'Signaturfarge', DA: 'Signaturfarve' } as Record<Lang, string>,
    description: { ES: 'Color personalizado con técnica de autor', EN: 'Custom color with signature technique', FR: 'Couleur personnalisée avec technique signature', DE: 'Individuelle Farbe mit Signature-Technik', PT: 'Cor personalizada com técnica de autor', UK: 'Кастомний колір з авторською технікою', PL: 'Kolor spersonalizowany techniką autorską', SV: 'Personlig färg med signaturteknik', NL: 'Aangepaste kleur met handtekeningtechniek', NO: 'Tilpasset farge med signaturteknikk', DA: 'Tilpasset farve med signaturteknik' } as Record<Lang, string>,
    priceType: 'from', price: 65, duration: 120, buffer: 15, isPrivate: false },
  { id: 's5', category: '2. Color & Balayage',
    name: { ES: 'Balayage / Mechas', EN: 'Balayage / Highlights', FR: 'Balayage / Mèches', DE: 'Balayage / Strähnen', PT: 'Balayage / Mechas', UK: 'Балаяж / Мелирування', PL: 'Balayage / Pasemka', SV: 'Balayage / Strykning', NL: 'Balayage / Highlights', NO: 'Balayage / Lyn', DA: 'Balayage / Højlys' } as Record<Lang, string>,
    description: { ES: 'Técnica de degradado natural', EN: 'Natural gradient technique', FR: 'Technique de dégradé naturel', DE: 'Natürliche Verlaufstechnik', PT: 'Técnica de degradado natural', UK: 'Техніка натурального градієнта', PL: 'Technika naturalnego gradientu', SV: 'Naturlig gradientteknik', NL: 'Natuurlijke gradiënt techniek', NO: 'Naturlig gradientteknikk', DA: 'Naturlig gradientteknik' } as Record<Lang, string>,
    priceType: 'consult', price: null, duration: 150, buffer: 15, isPrivate: false },
  { id: 's6', category: '2. Color & Balayage',
    name: { ES: 'Color Global', EN: 'Global Color', FR: 'Couleur Globale', DE: 'Globale Farbe', PT: 'Cor Global', UK: 'Глобальний колір', PL: 'Kolor globalny', SV: 'Global färg', NL: 'Globale kleur', NO: 'Global farge', DA: 'Global farve' } as Record<Lang, string>,
    description: { ES: 'Coloración uniforme en todo el cabello', EN: 'Uniform color application', FR: 'Coloration uniforme', DE: 'Uniforme Färbung', PT: 'Coloração uniforme', UK: 'Уніформне фарбування', PL: 'Jednolite farbowanie', SV: 'Uniform färgning', NL: 'Uniforme kleuring', NO: 'Uniform farging', DA: 'Uniform farvning' } as Record<Lang, string>,
    priceType: 'from', price: 55, duration: 90, buffer: 15, isPrivate: false },
  // 3. Corte & Autor
  { id: 's7', category: '3. Corte & Autor',
    name: { ES: 'Corte & Styling', EN: 'Cut & Styling', FR: 'Coupe & Styling', DE: 'Schnitt & Styling', PT: 'Corte & Styling', UK: 'Стрижка & Стиль', PL: 'Cięcie & Stylizacja', SV: 'Klippning & Styling', NL: 'Knippen & Styling', NO: 'Klipp & Styling', DA: 'Klip & Styling' } as Record<Lang, string>,
    description: { ES: 'Corte personalizado según visagismo y estilo de vida', EN: 'Personalized cut based on visagism and lifestyle', FR: 'Coupe personnalisée selon visagisme', DE: 'Personalisierter Schnitt nach Visagismus', PT: 'Corte personalizado conforme visagismo', UK: 'Персоналізована стрижка за візажизмом', PL: 'Spersonalizowane cięcie wg wizażu', SV: 'Personlig klippning efter visagism', NL: 'Gepersonaliseerde knipbeurt', NO: 'Personlig klipp etter visagisme', DA: 'Personlig klip efter visagisme' } as Record<Lang, string>,
    priceType: 'from', price: 35, duration: 60, buffer: 15, isPrivate: false },
  { id: 's8', category: '3. Corte & Autor',
    name: { ES: 'Corte de Autor', EN: 'Signature Cut', FR: 'Coupe Signature', DE: 'Signature-Schnitt', PT: 'Corte de Autor', UK: 'Авторська стрижка', PL: 'Autorskie cięcie', SV: 'Signaturklippning', NL: 'Handtekeningknipbeurt', NO: 'Signaturklipp', DA: 'Signaturklip' } as Record<Lang, string>,
    description: { ES: 'Corte exclusivo diseñado por Ana', EN: 'Exclusive cut designed by Ana', FR: 'Coupe exclusive par Ana', DE: 'Exklusiver Schnitt von Ana', PT: 'Corte exclusivo da Ana', UK: 'Ексклюзивна стрижка від Ани', PL: 'Ekskluzywne cięcie Any', SV: 'Exklusiv klippning av Ana', NL: 'Exclusieve knipbeurt door Ana', NO: 'Eksklusiv klipp av Ana', DA: 'Eksklusiv klip af Ana' } as Record<Lang, string>,
    priceType: 'from', price: 50, duration: 75, buffer: 15, isPrivate: false },
  // 4. Tratamientos Capilares
  { id: 's9', category: '4. Tratamientos Capilares',
    name: { ES: 'Tratamiento Capilar Profundo', EN: 'Deep Capillary Treatment', FR: 'Traitement Capillaire Profond', DE: 'Tiefe Haarbehandlung', PT: 'Tratamento Capilar Profundo', UK: 'Глибоке лікування волосся', PL: 'Głębokie leczenie włosów', SV: 'Djup hårbehandling', NL: 'Diepe haarbehandeling', NO: 'Dyp hårbehandling', DA: 'Dyb hårbehandling' } as Record<Lang, string>,
    description: { ES: 'Tratamiento de salud capilar con productos premium', EN: 'Capillary health treatment with premium products', FR: 'Traitement de santé capillaire avec produits premium', DE: 'Haar-Gesundheitsbehandlung mit Premium-Produkten', PT: 'Tratamento de saúde capilar com produtos premium', UK: 'Лікування волосся з преміум продуктами', PL: 'Zabieg na włosy z produktami premium', SV: 'Hårhälsobehandling med premiumprodukter', NL: 'Haarbehandeling met premiumproducten', NO: 'Hårbehandling med premiumprodukter', DA: 'Hårbehandling med premiumprodukter' } as Record<Lang, string>,
    priceType: 'approx', price: 55, duration: 90, buffer: 15, isPrivate: false },
  { id: 's10', category: '4. Tratamientos Capilares',
    name: { ES: 'Botox Capilar Premium', EN: 'Premium Hair Botox', FR: 'Botox Capillaire Premium', DE: 'Premium Haar-Botox', PT: 'Botox Capilar Premium', UK: 'Преміум ботокс для волосся', PL: 'Premium botox włosów', SV: 'Premium hår-botox', NL: 'Premium haar-botox', NO: 'Premium hår-botox', DA: 'Premium hår-botox' } as Record<Lang, string>,
    description: { ES: 'Tratamiento intensivo de reconstrucción', EN: 'Intensive reconstruction treatment', FR: 'Traitement intensif de reconstruction', DE: 'Intensive Aufbaubehandlung', PT: 'Tratamento intensivo de reconstrução', UK: 'Інтенсивне відновлення', PL: 'Intensywna rekonstrukcja', SV: 'Intensiv återuppbyggnad', NL: 'Intensieve reconstructie', NO: 'Intensiv gjenoppbygging', DA: 'Intensiv genopbygning' } as Record<Lang, string>,
    priceType: 'from', price: 80, duration: 120, buffer: 15, isPrivate: false },
  // 5. Alisado & Queratina
  { id: 's11', category: '5. Alisado & Queratina',
    name: { ES: 'Alisado de Queratina', EN: 'Keratin Smoothing', FR: 'Lissage à la Kératine', DE: 'Keratin-Glättung', PT: 'Alisamento de Queratina', UK: 'Кератинове випрямлення', PL: 'Keratynowe wygładzanie', SV: 'Keratinutslätning', NL: 'Keratine behandeling', NO: 'Keratinutjevning', DA: 'Keratinudjævning' } as Record<Lang, string>,
    description: { ES: 'Alisado temporal con queratina premium', EN: 'Temporary smoothing with premium keratin', FR: 'Lissage temporaire à la kératine', DE: 'Temporäre Glättung mit Premium-Keratin', PT: 'Alisamento temporário com queratina', UK: 'Тимчасове випрямлення з кератином', PL: 'Tymczasowe wygładzenie keratyną', SV: 'Tillfällig utslätning med keratin', NL: 'Tijdelijke keratine behandeling', NO: 'Midlertidig keratinutjevning', DA: 'Midlertidig keratinudjævning' } as Record<Lang, string>,
    priceType: 'from', price: 90, duration: 150, buffer: 20, isPrivate: false },
  // 6. Extensiones & Volumen
  { id: 's12', category: '6. Extensiones & Volumen',
    name: { ES: 'Extensiones de Pelo Natural', EN: 'Natural Hair Extensions', FR: 'Extensions Naturelles', DE: 'Echthaar-Verlängerung', PT: 'Extensões Naturais', UK: 'Натуральне нарощування', PL: 'Przedłużanie naturalne', SV: 'Naturliga extensions', NL: 'Natuurlijke extensions', NO: 'Naturlige extensions', DA: 'Naturlige extensions' } as Record<Lang, string>,
    description: { ES: 'Aumento de volumen y longitud', EN: 'Volume and length enhancement', FR: 'Volume et longueur', DE: 'Volumen und Länge', PT: 'Aumento de volume e comprimento', UK: 'Об\'єм та довжина', PL: 'Zwiększenie objętości i długości', SV: 'Volym och längd', NL: 'Volume en lengte', NO: 'Volum og lengde', DA: 'Volume og længde' } as Record<Lang, string>,
    priceType: 'consult', price: null, duration: 180, buffer: 30, isPrivate: false },
  // 7. Peinados & Recogidos
  { id: 's13', category: '7. Peinados & Recogidos',
    name: { ES: 'Peinado Evento', EN: 'Event Styling', FR: 'Coiffage Événement', DE: 'Event-Styling', PT: 'Penteado de Evento', UK: 'Святкова зачіска', PL: 'Stylizacja na wydarzenie', SV: 'Eventstyling', NL: 'Event styling', NO: 'Eventstyling', DA: 'Eventstyling' } as Record<Lang, string>,
    description: { ES: 'Peinado para eventos especiales', EN: 'Styling for special events', FR: 'Coiffage pour événements', DE: 'Styling für besondere Anlässe', PT: 'Penteado para eventos', UK: 'Зачіска для подій', PL: 'Stylizacja na specjalne okazje', SV: 'Styling för speciella tillfällen', NL: 'Styling voor speciale gelegenheden', NO: 'Styling for spesielle anledninger', DA: 'Styling til særlige lejligheder' } as Record<Lang, string>,
    priceType: 'from', price: 40, duration: 45, buffer: 10, isPrivate: false },
  // 8. Maquillaje & Visagismo Facial
  { id: 's14', category: '8. Maquillaje & Visagismo Facial',
    name: { ES: 'Maquillaje de Autor', EN: 'Signature Makeup', FR: 'Maquillage Signature', DE: 'Signature-Make-up', PT: 'Maquiagem de Autor', UK: 'Авторський макіяж', PL: 'Autorski makijaż', SV: 'Signaturmakeup', NL: 'Handtekening make-up', NO: 'Signatursminking', DA: 'Signaturmakeup' } as Record<Lang, string>,
    description: { ES: 'Maquillaje personalizado según visagismo', EN: 'Personalized makeup based on visagism', FR: 'Maquillage personnalisé selon visagisme', DE: 'Personalisiertes Make-up nach Visagismus', PT: 'Maquiagem personalizada conforme visagismo', UK: 'Персоналізований макіяж за візажизмом', PL: 'Spersonalizowany makijaż wg wizażu', SV: 'Personlig makeup efter visagism', NL: 'Gepersonaliseerde make-up', NO: 'Personlig sminke etter visagisme', DA: 'Personlig makeup efter visagisme' } as Record<Lang, string>,
    priceType: 'from', price: 45, duration: 60, buffer: 10, isPrivate: false },
  // 9. Servicios VIP
  { id: 's15', category: '9. Servicios VIP',
    name: { ES: 'Servicio VIP Privado', EN: 'Private VIP Service', FR: 'Service VIP Privé', DE: 'Privater VIP-Service', PT: 'Serviço VIP Privado', UK: 'Приватний VIP-сервіс', PL: 'Prywatna usługa VIP', SV: 'Privat VIP-tjänst', NL: 'Privé VIP-service', NO: 'Privat VIP-tjeneste', DA: 'Privat VIP-ydelse' } as Record<Lang, string>,
    description: { ES: 'Atención exclusiva fuera de horario', EN: 'Exclusive after-hours attention', FR: 'Attention exclusive hors horaires', DE: 'Exklusive Betreuung außerhalb der Öffnungszeiten', PT: 'Atenção exclusiva fora do horário', UK: 'Ексклюзивна увага поза графіком', PL: 'Ekskluzywna obsługa po godzinach', SV: 'Exklusiv service utanför öppettider', NL: 'Exclusieve service buiten kantooruren', NO: 'Eksklusiv service utenfor åpningstid', DA: 'Eksklusiv service uden for åbningstid' } as Record<Lang, string>,
    priceType: 'consult', price: null, duration: 180, buffer: 30, isPrivate: true },
  // 10. Productos & Mantenimiento
  { id: 's16', category: '10. Productos & Mantenimiento',
    name: { ES: 'Rutina de Mantenimiento en Casa', EN: 'Home Maintenance Routine', FR: 'Routine d\'Entretien à Domicile', DE: 'Heim-Pflegeroutine', PT: 'Rotina de Manutenção em Casa', UK: 'Домашній догляд', PL: 'Rutyna pielęgnacji w domu', SV: 'Hemskötselrutin', NL: 'Thuisverzorgingsroutine', NO: 'Hjemmevedlikeholdsrutine', DA: 'Hjemmeplejerutine' } as Record<Lang, string>,
    description: { ES: 'Asesoramiento de productos premium para casa', EN: 'Premium home product consultation', FR: 'Conseil produits premium à domicile', DE: 'Premium-Produktberatung zu Hause', PT: 'Consultoria de produtos premium para casa', UK: 'Консультація по преміум продуктам', PL: 'Doradztwo produktów premium do domu', SV: 'Premium produktkonsultation för hemmet', NL: 'Premium productadvies voor thuis', NO: 'Premium produktkonsultasjon for hjemmet', DA: 'Premium produktkonsultation til hjemmet' } as Record<Lang, string>,
    priceType: 'consult', price: null, duration: 30, buffer: 0, isPrivate: false },
];

const initialPromos: PromoCode[] = [
  { code: 'FIRST20', type: 'percent', value: 20, active: true, description: '20% off first visit' },
  { code: 'VIPANA', type: 'percent', value: 15, active: true, description: '15% off for VIP clients' },
];

const initialBookings: Booking[] = [
  { id: 'b1', clientName: 'María García', clientPhone: '612345678', services: ['s1', 's2'], date: '2026-09-26', time: '10:00', notes: 'Primera visita', status: 'pending', isSaturday: true, createdAt: '2026-09-22' },
  { id: 'b2', clientName: 'Laura Fernández', clientPhone: '698765432', services: ['s3'], date: '2026-09-24', time: '16:00', notes: '', status: 'confirmed', isSaturday: false, createdAt: '2026-09-20' },
  { id: 'b3', clientName: 'Carmen Ruiz', clientPhone: '655443322', services: ['s4', 's5'], date: '2026-09-20', time: '11:00', notes: 'Alérgica a amoníaco', status: 'completed', isSaturday: false, createdAt: '2026-09-15' },
];

const initialFeedback: Feedback[] = [
  { id: 'f1', rating: 'neutral', message: 'El resultado fue bueno pero el tiempo de espera fue un poco largo.', date: '2026-09-20', clientName: 'Carmen R.' },
];

const initialLostDemand: LostDemand[] = [
  { id: 'l1', date: '2026-09-18', time: '17:30', reason: 'No disponibilidad', service: 'Balayage', estimatedRevenue: 120 },
  { id: 'l2', date: '2026-09-19', time: '12:00', reason: 'Sábado completo', service: 'Corte & Color', estimatedRevenue: 100 },
  { id: 'l3', date: '2026-09-21', time: '10:00', reason: 'No disponibilidad', service: 'Botox Capilar', estimatedRevenue: 80 },
];

function generateClientId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CLI-${num}`;
}

interface DaySchedule {
  open: boolean;
  openTime: string;
  closeTime: string;
}

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

const defaultDaySchedules: DaySchedule[] = [
  { open: false, openTime: '09:00', closeTime: '20:00' }, // Sunday
  { open: true, openTime: '10:00', closeTime: '20:00' }, // Monday
  { open: true, openTime: '10:00', closeTime: '20:00' }, // Tuesday
  { open: true, openTime: '10:00', closeTime: '20:00' }, // Wednesday
  { open: true, openTime: '10:00', closeTime: '20:00' }, // Thursday
  { open: true, openTime: '10:00', closeTime: '20:00' }, // Friday
  { open: true, openTime: '10:00', closeTime: '14:00' }, // Saturday
];

const initialClients: ClientRecord[] = [
  { clientId: 'CLI-8492', pin: '7009', name: 'María', surname: 'García', phone: '612345678', notes: 'Alérgica a amoníaco. Prefiere tardes.', createdAt: '2026-08-15', lastAccess: '2026-09-22T10:30:00', pwaInstalled: true, accessCount: 14 },
  { clientId: 'CLI-3071', pin: '4821', name: 'Laura', surname: 'Fernández', phone: '698765432', notes: '', createdAt: '2026-08-20', lastAccess: '2026-09-21T16:00:00', pwaInstalled: false, accessCount: 6 },
  { clientId: 'CLI-5623', pin: '1593', name: 'Carmen', surname: 'Ruiz', phone: '655443322', notes: 'Cliente VIP. Color de autor cada 6 semanas.', createdAt: '2026-09-01', lastAccess: '2026-09-20T11:00:00', pwaInstalled: true, accessCount: 9 },
  { clientId: 'CLI-9184', pin: '2647', name: 'Isabel', surname: 'Torres', phone: '677888999', notes: '', createdAt: '2026-09-10', lastAccess: null, pwaInstalled: false, accessCount: 0 },
];

// ─── Helper Functions ───────────────────────────────────────────────────────

function generateTimeSlots(daySchedule?: DaySchedule): string[] {
  const slots: string[] = [];
  if (daySchedule && !daySchedule.open) return slots;
  const openStr = daySchedule?.openTime ?? '09:00';
  const closeStr = daySchedule?.closeTime ?? '20:00';
  const [oh, om] = openStr.split(':').map(Number);
  const [ch, cm] = closeStr.split(':').map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  for (let m = openMin; m < closeMin; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

function formatDate(dateStr: string, lang: Lang): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(lang === 'ES' ? 'es-ES' : lang === 'EN' ? 'en-US' : lang.toLowerCase(), 
    { weekday: 'short', day: 'numeric', month: 'short' });
}

function isBookingOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function checkBookingConflict(newBooking: Booking, existingBookings: Booking[], services: Service[]): boolean {
  const newStart = timeToMinutes(newBooking.time);
  const newDuration = getBookingDuration(newBooking, services);
  const newEnd = newStart + newDuration;
  return existingBookings.some(b =>
    b.date === newBooking.date &&
    b.status !== 'cancelled' &&
    b.id !== newBooking.id &&
    isBookingOverlap(newStart, newEnd, timeToMinutes(b.time), timeToMinutes(b.time) + getBookingDuration(b, services))
  );
}

function isSaturday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00').getDay() === 6;
}

function getMinDate(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getMaxDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().split('T')[0];
}

// ─── PIN Pad Component ──────────────────────────────────────────────────────

function PinPad({ onSubmit, error, onBack, pinTarget, setPinTarget, onGuest }: {
  onSubmit: (pin: string) => void;
  error: boolean;
  onBack: () => void;
  pinTarget: 'portal' | 'manage';
  setPinTarget: (t: 'portal' | 'manage') => void;
  onGuest: () => void;
}) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [showMaster, setShowMaster] = useState(false);
  const [logoPulse, setLogoPulse] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (error) {
      setShake(true);
      setPin('');
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    setPin('');
  }, [pinTarget]);

  useEffect(() => {
    if (showMaster) {
      setPinTarget('manage');
      setPin('');
    } else if (pinTarget === 'manage' && !showMaster) {
      setPinTarget('portal');
      setPin('');
    }
  }, [showMaster]);

  const handleDigit = (d: string) => {
    if (pin.length < 4) {
      const newPin = pin + d;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => onSubmit(newPin), 200);
      }
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  const triggerMaster = () => {
    setLogoPulse(true);
    setShowMaster(true);
    setTimeout(() => setLogoPulse(false), 600);
  };

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 2) {
      tapCountRef.current = 0;
      triggerMaster();
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 350);
  };

  const handleLogoPressStart = () => {
    pressTimerRef.current = setTimeout(() => {
      triggerMaster();
    }, 2000);
  };

  const handleLogoPressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleBackToPortal = () => {
    setShowMaster(false);
    setPin('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in" style={{ backgroundColor: '#121212' }}>
      <div className="text-center mb-6">
        <div
          onClick={handleLogoTap}
          onPointerDown={handleLogoPressStart}
          onPointerUp={handleLogoPressEnd}
          onPointerLeave={handleLogoPressEnd}
          className={`select-none cursor-pointer inline-block transition-transform duration-300 ${logoPulse ? 'scale-110' : ''} ${showMaster ? 'opacity-60' : ''}`}
        >
          <div className="font-serif text-2xl tracking-[0.3em] gold-text mb-2">L'A</div>
          <p className="text-[#E8E6DF]/40 text-xs tracking-[0.2em] uppercase">Hair Experience</p>
        </div>
      </div>

      {showMaster && (
        <div className="flex items-center gap-2 mb-4 animate-fade-in">
          <span className="px-3 py-1 rounded-full border text-xs flex items-center gap-1.5" style={{ backgroundColor: 'rgba(212,175,55,0.15)', borderColor: 'rgba(212,175,55,0.3)', color: '#D4AF37' }}>
            <Settings className="w-3 h-3" /> 360studio
          </span>
          <button onClick={handleBackToPortal} className="text-[#E8E6DF]/40 hover:text-[#E8E6DF] text-xs transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Volver
          </button>
        </div>
      )}

      <h2 className={`font-serif text-lg mb-6 ${shake ? 'animate-pulse' : ''}`} style={{ color: 'rgba(232,230,223,0.7)' }}>
        {showMaster ? 'Introduce el PIN maestro' : 'Introduce el PIN'}
      </h2>
      <div className={`flex gap-4 mb-8 ${shake ? 'animate-pulse' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${error ? 'border-red-500' : pin.length > i ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-[#E8E6DF]/30'}`} />
        ))}
      </div>
      {error && <p className="text-red-400 text-sm mb-4 animate-fade-in">PIN incorrecto</p>}
      <div className="grid grid-cols-3 gap-4 max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button key={d} onClick={() => handleDigit(d)}
            className="w-20 h-20 rounded-full border text-2xl font-light transition-all active:scale-95" style={{ backgroundColor: '#1E1E1E', borderColor: 'rgba(232,230,223,0.1)', color: '#E8E6DF' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232,230,223,0.1)'; e.currentTarget.style.backgroundColor = '#1E1E1E'; }}>
            {d}
          </button>
        ))}
        <button onClick={showMaster ? handleBackToPortal : onBack} className="w-20 h-20 rounded-full transition-colors flex items-center justify-center" style={{ color: 'rgba(232,230,223,0.4)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8E6DF'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(232,230,223,0.4)'; }}>
          <X className="w-6 h-6" />
        </button>
        <button onClick={() => handleDigit('0')}
          className="w-20 h-20 rounded-full border text-2xl font-light transition-all active:scale-95" style={{ backgroundColor: '#1E1E1E', borderColor: 'rgba(232,230,223,0.1)', color: '#E8E6DF' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232,230,223,0.1)'; e.currentTarget.style.backgroundColor = '#1E1E1E'; }}>
          0
        </button>
        <button onClick={handleDelete} className="w-20 h-20 rounded-full transition-colors flex items-center justify-center" style={{ color: 'rgba(232,230,223,0.4)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8E6DF'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(232,230,223,0.4)'; }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Guest access for client portal */}
      {!showMaster && (
        <button onClick={onGuest}
          className="mt-8 text-sm transition-colors flex items-center gap-2" style={{ color: 'rgba(232,230,223,0.4)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#D4AF37'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(232,230,223,0.4)'; }}>
          <Sparkles className="w-4 h-4" />
          Entrar como invitado
        </button>
      )}
    </div>
  );
}

// ─── Language Selector ──────────────────────────────────────────────────────

function LanguageSelector({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang)!;
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-charcoal/5 hover:bg-brand-charcoal/10 border border-brand-charcoal/15 transition-all text-sm">
        <Globe className="w-4 h-4 text-brand-gold" />
        <span className="text-lg leading-none">{current.flag}</span>
        <ChevronDown className={`w-3 h-3 text-brand-charcoal-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 bg-brand-card border border-brand-charcoal/15 rounded-xl shadow-2xl overflow-hidden z-50 animate-scale-in">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-charcoal/5 transition-colors text-sm ${lang === l.code ? 'text-brand-gold' : 'text-brand-charcoal-light'}`}>
                <span className="text-lg">{l.flag}</span>
                <span>{l.label}</span>
                {lang === l.code && <Check className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

function App() {
  const [view, setView] = useState<View>('pin');
  const [pinTarget, setPinTarget] = useState<'portal' | 'manage'>('portal');
  const [pinError, setPinError] = useState(false);
  const [lang, setLang] = useState<Lang>('ES');
  const [forceSpanish, setForceSpanish] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const effectiveLang: Lang = forceSpanish ? 'ES' : lang;

  // Portal state
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  const [bookingOverlapError, setBookingOverlapError] = useState('');
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState<'good' | 'neutral' | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');

  // Management state
  const [services, setServices] = useState<Service[]>(initialServices);
  const [promos, setPromos] = useState<PromoCode[]>(initialPromos);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [feedback, setFeedback] = useState<Feedback[]>(initialFeedback);
  const [lostDemand, setLostDemand] = useState<LostDemand[]>(initialLostDemand);
  const [manageTab, setManageTab] = useState<'bookings' | 'clients' | 'saturday' | 'catalog' | 'calendar' | 'tools' | 'settings'>('calendar');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [categories, setCategories] = useState<string[]>(SERVICE_CATEGORIES);
  const [presetCategory, setPresetCategory] = useState<string>('');
  const [vacationDates, setVacationDates] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<BookingStatus | 'all'>('all');
  const [quickBook, setQuickBook] = useState<{ date: string; time: string } | null>(null);
  const [qbName, setQbName] = useState('');
  const [qbPhone, setQbPhone] = useState('');
  const [qbServices, setQbServices] = useState<string[]>([]);
  const [qbDate, setQbDate] = useState('');
  const [qbTime, setQbTime] = useState('');

  // Client registry state
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  // PWA install state
  const [pwaInstallEvent, setPwaInstallEvent] = useState<any>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Hash routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === '/portal') {
        setView('portal');
        setPinTarget('portal');
        setPinError(false);
      } else if (hash === '/360studio') {
        setView('manage');
        setPinError(false);
      } else if (hash === '/pin' || !hash) {
        setView('pin');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
  };

  // PWA install detection
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPwaInstallEvent(e);
      setShowInstallBanner(true);
    };
    const installedHandler = () => {
      setPwaInstalled(true);
      setShowInstallBanner(false);
      if (activeClientId) {
        setClients(prev => prev.map(c => c.clientId === activeClientId ? { ...c, pwaInstalled: true } : c));
      }
    };
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) setPwaInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [activeClientId]);

  const handlePwaInstall = async () => {
    if (!pwaInstallEvent) return;
    pwaInstallEvent.prompt();
    await pwaInstallEvent.userChoice;
    setPwaInstallEvent(null);
    setShowInstallBanner(false);
  };

  // Settings state
  const [settingsTab, setSettingsTab] = useState<'business' | 'schedule' | 'rules' | 'notifications'>('business');
  const [bizName, setBizName] = useState('L\'A Hair Experience');
  const [bizPhone, setBizPhone] = useState(BIZUM_NUMBER);
  const [bizAddress, setBizAddress] = useState('');
  const [bizGps, setBizGps] = useState(MAPS_URL);
  const [openHour, setOpenHour] = useState('09:00');
  const [closeHour, setCloseHour] = useState('20:00');
  const [defaultBuffer, setDefaultBuffer] = useState('15');
  const [advanceLimit, setAdvanceLimit] = useState('3');
  const [satApproval, setSatApproval] = useState(true);
  const [depositRequired, setDepositRequired] = useState(true);
  const [depositAmount, setDepositAmount] = useState('20');
  const [waReminder, setWaReminder] = useState('Hola {cliente}! Te recordamos tu cita el {fecha} a las {hora}. ¡Te esperamos!');
  const [waConfirm, setWaConfirm] = useState('¡Gracias {cliente}! Tu cita ha sido confirmada para el {fecha} a las {hora}.');
  const [waReview, setWaReview] = useState('Hola {cliente}! ¿Cómo fue tu experiencia? Nos encantaría tu reseña en Google: {link}');

  // Per-day schedule state (index 0=Sunday ... 6=Saturday)
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>(defaultDaySchedules);

  // Bizum deposit popup state
  const [showBizumDeposit, setShowBizumDeposit] = useState(false);

  // Client database state
  const [clientSearch, setClientSearch] = useState('');
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [qbClientSearch, setQbClientSearch] = useState('');
  const [qbSearchResults, setQbSearchResults] = useState<ClientRecord[]>([]);

  // ─── PIN handling ─────────────────────────────────────────────────────────

  const handlePinSubmit = (pin: string) => {
    if (pinTarget === 'portal') {
      const client = clients.find(c => c.pin === pin);
      if (client) {
        setActiveClientId(client.clientId);
        setClients(prev => prev.map(c => c.clientId === client.clientId ? { ...c, lastAccess: new Date().toISOString(), accessCount: c.accessCount + 1 } : c));
        setView('portal');
        setPinError(false);
        navigate('/portal');
      } else if (pin === CLIENT_PIN) {
        setActiveClientId(null);
        setView('portal');
        setPinError(false);
        navigate('/portal');
      } else {
        setPinError(true);
      }
    } else if (pinTarget === 'manage' && pin === MANAGE_PIN) {
      setView('manage');
      setPinError(false);
      navigate('/360studio');
    } else {
      setPinError(true);
    }
  };

  const handlePinSelect = (target: 'portal' | 'manage') => {
    setPinTarget(target);
    setPinError(false);
  };

  // ─── Booking helpers ───────────────────────────────────────────────────────

  const publicServices = useMemo(() => services.filter(s => !s.isPrivate), [services]);

  const selectedServiceObjs = useMemo(() => 
    selectedServices.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[],
  [selectedServices, services]);

  const totalDuration = useMemo(() => {
    const serviceTime = selectedServiceObjs.reduce((sum, s) => sum + s.duration, 0);
    const bufferTime = selectedServiceObjs.reduce((sum, s) => sum + s.buffer, 0);
    return { service: serviceTime, buffer: bufferTime, total: serviceTime + bufferTime };
  }, [selectedServiceObjs]);

  const saturdayBooking = bookingDate ? isSaturday(bookingDate) : false;

  // Conditional Bizum deposit popup for services > 2 hours
  useEffect(() => {
    if (totalDuration.service > 120 && !showBizumDeposit) {
      setShowBizumDeposit(true);
    }
  }, [totalDuration.service]);

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    const promo = promos.find(p => p.code === code && p.active);
    if (promo) {
      setAppliedPromo(promo);
      setPromoError('');
    } else {
      setPromoError('Código no válido');
      setAppliedPromo(null);
    }
  };

  const handleConfirmBooking = () => {
    const newBooking: Booking = {
      id: `b${Date.now()}`,
      clientName: bookingName,
      clientPhone: bookingPhone,
      services: selectedServices,
      date: bookingDate,
      time: bookingTime,
      notes: bookingNotes,
      status: saturdayBooking ? 'pending' : 'confirmed',
      isSaturday: saturdayBooking,
      promoCode: appliedPromo?.code,
      createdAt: new Date().toISOString().split('T')[0],
    };
    if (checkBookingConflict(newBooking, bookings, services)) {
      setBookingOverlapError('Ese horario ya está ocupado. Por favor, elige otro horario.');
      return;
    }
    setBookings([...bookings, newBooking]);
    setBookingConfirmed(true);
  };

  const resetBooking = () => {
    setSelectedServices([]);
    setBookingDate('');
    setBookingTime('');
    setBookingNotes('');
    setBookingName('');
    setBookingPhone('');
    setPromoInput('');
    setAppliedPromo(null);
    setPromoError('');
    setBookingOverlapError('');
    setBookingStep(1);
    setBookingConfirmed(false);
  };

  const handleStatusChange = (bookingId: string, status: BookingStatus) => {
    setBookings(bookings.map(b => b.id === bookingId ? { ...b, status } : b));
  };

  const handleSaturdayApprove = (bookingId: string) => {
    setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b));
  };

  const handleSaturdayReject = (bookingId: string) => {
    setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
  };

  const handleDeleteService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleToggleServiceVisibility = (id: string) => {
    setServices(services.map(s => s.id === id ? { ...s, isPrivate: !s.isPrivate } : s));
  };

  const handleSaveService = (service: Service) => {
    if (services.find(s => s.id === service.id)) {
      setServices(services.map(s => s.id === service.id ? service : s));
    } else {
      setServices([...services, service]);
    }
    setEditingService(null);
    setShowServiceForm(false);
  };

  const handleSavePromo = (promo: PromoCode) => {
    if (promos.find(p => p.code === promo.code)) {
      setPromos(promos.map(p => p.code === promo.code ? promo : p));
    } else {
      setPromos([...promos, promo]);
    }
    setShowPromoForm(false);
  };

  const handleDeletePromo = (code: string) => {
    setPromos(promos.filter(p => p.code !== code));
  };

  const handleTogglePromo = (code: string) => {
    setPromos(promos.map(p => p.code === code ? { ...p, active: !p.active } : p));
  };

  const handleToggleVacation = (dateStr: string) => {
    const newDates = new Set(vacationDates);
    if (newDates.has(dateStr)) newDates.delete(dateStr);
    else newDates.add(dateStr);
    setVacationDates(newDates);
  };

  const handleSendWhatsAppReview = (booking: Booking) => {
    const msg = encodeURIComponent(`Hola ${booking.clientName}! Gracias por tu visita a L'Studio Ana. Nos encantaría conocer tu experiencia. ¿Podrías dejarnos tu opinión?`);
    window.open(`https://wa.me/${booking.clientPhone}?text=${msg}`, '_blank');
    handleStatusChange(booking.id, 'completed');
  };

  const openQuickBook = (date: string, time: string) => {
    setQbDate(date);
    setQbTime(time);
    setQbName('');
    setQbPhone('');
    setQbServices([]);
    setQuickBook({ date, time });
  };

  const closeQuickBook = () => {
    setQuickBook(null);
    setQbName('');
    setQbPhone('');
    setQbServices([]);
    setQbSearchResults([]);
    setQbClientSearch('');
  };

  const handleQuickBookSave = () => {
    if (!qbName || !qbPhone || qbServices.length === 0) return;
    const newBooking: Booking = {
      id: `b${Date.now()}`,
      clientName: qbName,
      clientPhone: qbPhone,
      services: qbServices,
      date: qbDate,
      time: qbTime,
      notes: '',
      status: isSaturday(qbDate) ? 'pending' : 'confirmed',
      isSaturday: isSaturday(qbDate),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setBookings([...bookings, newBooking]);
    closeQuickBook();
  };

  const timeSlots = useMemo(() => {
    if (bookingDate) {
      const dayOfWeek = new Date(bookingDate + 'T00:00:00').getDay();
      return generateTimeSlots(daySchedules[dayOfWeek]);
    }
    return generateTimeSlots();
  }, [bookingDate, daySchedules]);

  const saturdayBookings = useMemo(() => 
    bookings.filter(b => b.isSaturday && b.status === 'pending'),
  [bookings]);

  const filteredBookings = useMemo(() => {
    if (filterStatus === 'all') return bookings;
    return bookings.filter(b => b.status === filterStatus);
  }, [bookings, filterStatus]);

  // ─── PIN Screen ────────────────────────────────────────────────────────────

  if (view === 'pin') {
    return (
      <PinPad
        onSubmit={handlePinSubmit}
        error={pinError}
        onBack={() => setPinError(false)}
        pinTarget={pinTarget}
        setPinTarget={handlePinSelect}
        onGuest={() => { setView('portal'); setPinError(false); }}
      />
    );
  }

  // ─── Client Portal ─────────────────────────────────────────────────────────

  if (view === 'portal') {
    return (
      <div className="min-h-screen bg-brand-black">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-brand-black/95 backdrop-blur-md border-b border-brand-charcoal/10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
                <span className="font-serif text-lg gold-text">L'A</span>
              </div>
              <div className="hidden sm:block">
                <p className="font-serif text-sm tracking-[0.2em] text-brand-charcoal">L'A — HAIR EXPERIENCE</p>
                <p className="text-[10px] text-brand-charcoal-muted/60 tracking-widest uppercase">Portal del Cliente</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setForceSpanish(!forceSpanish)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${forceSpanish ? 'bg-brand-gold/20 border-brand-gold/40 text-brand-gold' : 'bg-brand-charcoal/5 border-brand-charcoal/15 text-brand-charcoal-muted hover:text-brand-charcoal'}`}>
                {forceSpanish ? '🇪🇸 ES' : t('viewInSpanish', effectiveLang)}
              </button>
              <LanguageSelector lang={lang} setLang={setLang} />
              <button onClick={() => { setView('pin'); setPinTarget('portal' as any); navigate('/pin'); setActiveClientId(null); }}
                className="p-2 rounded-full bg-brand-charcoal/5 hover:bg-brand-charcoal/10 border border-brand-charcoal/15 transition-all">
                <LogOut className="w-4 h-4 text-brand-charcoal-muted" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
          {/* PWA Install Banner */}
          {showInstallBanner && !pwaInstalled && (
            <div className="bg-brand-card border border-brand-gold/30 rounded-2xl p-4 flex items-center justify-between gap-3 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-brand-gold" />
                </div>
                <div>
                  <p className="text-brand-charcoal text-sm font-medium">Añadir L'Studio Ana a la pantalla de inicio</p>
                  <p className="text-brand-charcoal-muted text-xs">Acceso rápido como una app</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={handlePwaInstall}
                  className="px-4 py-2 rounded-lg bg-brand-gold text-black text-sm font-medium hover:bg-brand-gold-light transition-all flex items-center gap-1.5">
                  <Download className="w-4 h-4" /> Instalar
                </button>
                <button onClick={() => setShowInstallBanner(false)}
                  className="p-2 rounded-lg bg-brand-charcoal/5 hover:bg-brand-charcoal/10 transition-all">
                  <X className="w-4 h-4 text-brand-charcoal-muted" />
                </button>
              </div>
            </div>
          )}
          {/* Stylist Profile */}
          <section className="animate-slide-up">
            <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-64 h-64 md:h-auto bg-gradient-to-br from-brand-gold/20 via-brand-card to-brand-black flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, #D4AF37, transparent 60%)' }} />
                  <div className="relative w-32 h-32 rounded-full bg-brand-gold/20 border-2 border-brand-gold/40 flex items-center justify-center">
                    <Scissors className="w-12 h-12 text-brand-gold" />
                  </div>
                </div>
                <div className="flex-1 p-6">
                  <h2 className="font-serif text-2xl text-brand-charcoal mb-1">Ana</h2>
                  <p className="text-brand-gold text-sm tracking-wide mb-3">{t('stylistProfile', effectiveLang)}</p>
                  <p className="text-brand-charcoal-muted text-sm leading-relaxed">{t('bio', effectiveLang)}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {['Capillary Health', 'Visagism', 'Signature Color', '25+ years'].map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Service Catalog */}
          <section className="animate-slide-up">
            <h2 className="font-serif text-xl text-brand-charcoal mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-gold" />
              {t('serviceCatalog', effectiveLang)}
            </h2>
            <div className="space-y-2">
              {publicServices.map((service, idx) => {
                const expanded = expandedServices.has(service.id);
                const selected = selectedServices.includes(service.id);
                const pastel = PASTEL_COLORS[idx % PASTEL_COLORS.length];
                return (
                  <div key={service.id} className={`rounded-xl border overflow-hidden transition-all ${selected ? 'border-brand-gold/40 bg-brand-gold/5' : 'border-brand-charcoal/10 bg-brand-card'}`}>
                    <button onClick={() => {
                      const newSet = new Set(expandedServices);
                      if (expanded) newSet.delete(service.id);
                      else newSet.add(service.id);
                      setExpandedServices(newSet);
                    }} className="w-full flex items-center justify-between p-4 hover:bg-brand-charcoal/5 transition-colors">
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <span className={`w-2 h-12 rounded-full ${pastel.split(' ')[0]}`} />
                        <div>
                          <p className="text-brand-charcoal font-medium text-sm">{service.name[effectiveLang] || service.name.ES}</p>
                          <p className="text-brand-charcoal-muted/60 text-xs">{service.category} · {service.duration}min</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-brand-gold text-sm font-medium">
                          {service.priceType === 'fixed' && `€${service.price}`}
                          {service.priceType === 'from' && `${t('from', effectiveLang)} €${service.price}`}
                          {service.priceType === 'approx' && `${t('approx', effectiveLang)} €${service.price}`}
                          {service.priceType === 'consult' && t('consult', effectiveLang)}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-brand-charcoal-muted/60 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 animate-fade-in">
                        <p className="text-brand-charcoal-muted text-sm mb-3 pl-5">{service.description[effectiveLang] || service.description.ES}</p>
                        <button onClick={() => {
                          if (selected) setSelectedServices(selectedServices.filter(id => id !== service.id));
                          else setSelectedServices([...selectedServices, service.id]);
                        }} className={`ml-5 flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${selected ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30' : 'bg-brand-charcoal/5 text-brand-charcoal-muted border border-brand-charcoal/15 hover:bg-brand-charcoal/10'}`}>
                          {selected ? <><Check className="w-4 h-4" /> {t('services', effectiveLang)} ✓</> : <><Plus className="w-4 h-4" /> {t('selectServices', effectiveLang)}</>}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Booking Wizard */}
          <section className="animate-slide-up">
            <h2 className="font-serif text-xl text-brand-charcoal mb-4 flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-brand-gold" />
              {t('booking', effectiveLang)}
            </h2>
            {bookingConfirmed ? (
              <div className="bg-brand-card border border-brand-gold/30 rounded-2xl p-8 text-center animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-brand-gold/20 border-2 border-brand-gold/40 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-brand-gold" />
                </div>
                <p className="text-brand-charcoal font-serif text-lg mb-2">{t('bookingConfirmed', effectiveLang)}</p>
                {saturdayBooking && (
                  <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 justify-center text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {t('saturdayNotice', effectiveLang)}
                  </div>
                )}
                <div className="mt-4 p-3 rounded-lg bg-brand-gold/10 border border-brand-gold/20 text-center">
                  <p className="text-brand-gold text-sm mb-1">{t('deposit', effectiveLang)}</p>
                  <p className="text-brand-charcoal-muted text-xs">{t('depositInfo', effectiveLang)}</p>
                  <p className="text-brand-charcoal font-mono text-lg mt-2">{BIZUM_NUMBER}</p>
                </div>
                <button onClick={resetBooking} className="mt-6 px-6 py-2.5 rounded-lg bg-brand-charcoal/5 border border-brand-charcoal/15 text-brand-charcoal-light hover:bg-brand-charcoal/10 transition-all text-sm">
                  {t('back', effectiveLang)}
                </button>
              </div>
            ) : (
              <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6">
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-6">
                  {[1, 2, 3].map(step => (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${bookingStep >= step ? 'bg-brand-gold border-brand-gold text-black' : 'border-brand-charcoal/20 text-brand-charcoal-muted/60'}`}>
                        {bookingStep > step ? <Check className="w-4 h-4" /> : step}
                      </div>
                      {step < 3 && <div className={`flex-1 h-0.5 mx-2 ${bookingStep > step ? 'bg-brand-gold' : 'bg-brand-charcoal/10'}`} />}
                    </div>
                  ))}
                </div>

                {/* Step 1: Services & Promo */}
                {bookingStep === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="text-brand-charcoal-muted text-sm mb-2 block">{t('selectServices', effectiveLang)}</label>
                      {selectedServices.length === 0 ? (
                        <p className="text-brand-charcoal-muted/60 text-sm italic py-4">{t('selectServices', effectiveLang)}...</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedServiceObjs.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-brand-gold/5 border border-brand-gold/20">
                              <span className="text-brand-charcoal text-sm">{s.name[effectiveLang] || s.name.ES}</span>
                              <button onClick={() => setSelectedServices(selectedServices.filter(id => id !== s.id))}>
                                <X className="w-4 h-4 text-brand-charcoal-muted hover:text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Promo input */}
                    <div>
                      <label className="text-brand-charcoal-muted text-sm mb-2 block flex items-center gap-2">
                        <Tag className="w-4 h-4 text-brand-gold" /> {t('promoPlaceholder', effectiveLang)}
                      </label>
                      <div className="flex gap-2">
                        <input type="text" value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())}
                          placeholder="FIRST20, VIPANA..."
                          className="flex-1 px-4 py-2.5 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm placeholder:text-brand-charcoal-muted/40 focus:border-brand-gold/40 focus:outline-none transition-colors" />
                        <button onClick={handleApplyPromo}
                          className="px-4 py-2.5 rounded-lg bg-brand-gold/20 border border-brand-gold/30 text-brand-gold text-sm hover:bg-brand-gold/30 transition-all">
                          {t('applyPromo', effectiveLang)}
                        </button>
                      </div>
                      {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
                      {appliedPromo && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-400 animate-fade-in">
                          <Check className="w-4 h-4" /> {appliedPromo.code} — {appliedPromo.value}{appliedPromo.type === 'percent' ? '%' : '€'} {t('active', effectiveLang).toLowerCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button onClick={() => setBookingStep(2)} disabled={selectedServices.length === 0}
                        className="px-6 py-2.5 rounded-lg bg-brand-gold text-black font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-gold-light transition-all flex items-center gap-2">
                        {t('selectDate', effectiveLang)} <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Date & Time */}
                {bookingStep === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="text-brand-charcoal-muted text-sm mb-2 block">{t('selectDate', effectiveLang)}</label>
                      <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                        min={getMinDate()} max={getMaxDate()}
                        className="w-full px-4 py-2.5 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                      <p className="text-brand-charcoal-muted/60 text-xs mt-1">±3 {effectiveLang === 'ES' ? 'meses' : 'months'}</p>
                    </div>
                    {bookingDate && (
                      <>
                        {saturdayBooking && (
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-yellow-400 text-sm animate-fade-in">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {t('saturdayNotice', effectiveLang)}
                          </div>
                        )}
                        <div>
                          <label className="text-brand-charcoal-muted text-sm mb-2 block">{t('selectTime', effectiveLang)}</label>
                          <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto scrollbar-hide">
                            {timeSlots.map(slot => (
                              <button key={slot} onClick={() => setBookingTime(slot)}
                                className={`px-2 py-2 rounded-lg text-xs font-mono transition-all ${bookingTime === slot ? 'bg-brand-gold text-black' : 'bg-brand-charcoal/5 text-brand-charcoal-muted border border-brand-charcoal/15 hover:bg-brand-charcoal/10'}`}>
                                {slot}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <button onClick={() => setBookingStep(1)} className="px-4 py-2.5 rounded-lg bg-brand-charcoal/5 border border-brand-charcoal/15 text-brand-charcoal-muted text-sm hover:bg-brand-charcoal/10 transition-all">
                        {t('back', effectiveLang)}
                      </button>
                      <button onClick={() => setBookingStep(3)} disabled={!bookingDate || !bookingTime}
                        className="px-6 py-2.5 rounded-lg bg-brand-gold text-black font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-gold-light transition-all flex items-center gap-2">
                        {t('confirmBooking', effectiveLang)} <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Details & Confirm */}
                {bookingStep === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-brand-charcoal-muted text-sm mb-1 block">{t('name', effectiveLang)}</label>
                        <input type="text" value={bookingName} onChange={e => setBookingName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="text-brand-charcoal-muted text-sm mb-1 block">{t('phone', effectiveLang)}</label>
                        <input type="tel" value={bookingPhone} onChange={e => setBookingPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="text-brand-charcoal-muted text-sm mb-1 block">{t('notes', effectiveLang)}</label>
                      <textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)}
                        placeholder={t('notesPlaceholder', effectiveLang)} rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm placeholder:text-brand-charcoal-muted/40 focus:border-brand-gold/40 focus:outline-none transition-colors resize-none" />
                    </div>

                    {/* Summary */}
                    <div className="p-4 rounded-lg bg-brand-card-light border border-brand-charcoal/10 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-charcoal-muted">{t('services', effectiveLang)}</span>
                        <span className="text-brand-charcoal">{selectedServiceObjs.map(s => s.name[effectiveLang] || s.name.ES).join(', ')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-charcoal-muted">{t('date', effectiveLang)}</span>
                        <span className="text-brand-charcoal">{bookingDate} · {bookingTime}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-charcoal-muted">{t('totalDuration', effectiveLang)}</span>
                        <span className="text-brand-charcoal">{totalDuration.service}min + {totalDuration.buffer}min {t('includingBuffer', effectiveLang)}</span>
                      </div>
                      {appliedPromo && (
                        <div className="flex justify-between text-sm">
                          <span className="text-brand-charcoal-muted">{t('code', effectiveLang)}</span>
                          <span className="text-brand-gold">{appliedPromo.code} (-{appliedPromo.value}{appliedPromo.type === 'percent' ? '%' : '€'})</span>
                        </div>
                      )}
                    </div>

                    {/* Bizum deposit info */}
                    <div className="p-3 rounded-lg bg-brand-gold/10 border border-brand-gold/20">
                      <p className="text-brand-gold text-sm mb-1 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> {t('deposit', effectiveLang)}
                      </p>
                      <p className="text-brand-charcoal-muted text-xs">{t('depositInfo', effectiveLang)}</p>
                      <p className="text-brand-charcoal font-mono text-lg mt-1">{BIZUM_NUMBER}</p>
                    </div>

                    {saturdayBooking && (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-yellow-400 text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {t('saturdayNotice', effectiveLang)}
                      </div>
                    )}

                    {bookingOverlapError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm animate-fade-in">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {bookingOverlapError}
                      </div>
                    )}

                    <div className="flex justify-between">
                      <button onClick={() => { setBookingStep(2); setBookingOverlapError(''); }} className="px-4 py-2.5 rounded-lg bg-brand-charcoal/5 border border-brand-charcoal/15 text-brand-charcoal-muted text-sm hover:bg-brand-charcoal/10 transition-all">
                        {t('back', effectiveLang)}
                      </button>
                      <button onClick={handleConfirmBooking} disabled={!bookingName || !bookingPhone}
                        className="px-6 py-2.5 rounded-lg bg-brand-gold text-black font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-gold-light transition-all flex items-center gap-2">
                        <Check className="w-4 h-4" /> {t('confirmBooking', effectiveLang)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Social Hub & Location */}
          <section className="grid md:grid-cols-2 gap-4 animate-slide-up">
            {/* Social Hub */}
            <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6">
              <h3 className="font-serif text-lg text-brand-charcoal mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-brand-gold" /> {t('followUs', effectiveLang)}
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-brand-charcoal/5 border border-brand-charcoal/10 hover:bg-brand-gold/10 hover:border-brand-gold/30 transition-all group">
                  <Instagram className="w-6 h-6 text-brand-charcoal-muted group-hover:text-brand-gold transition-colors" />
                  <span className="text-xs text-brand-charcoal-muted">Instagram</span>
                </a>
                <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-brand-charcoal/5 border border-brand-charcoal/10 hover:bg-brand-gold/10 hover:border-brand-gold/30 transition-all group">
                  <span className="text-xl text-brand-charcoal-muted group-hover:text-brand-gold transition-colors">♪</span>
                  <span className="text-xs text-brand-charcoal-muted">TikTok</span>
                </a>
                <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-brand-charcoal/5 border border-brand-charcoal/10 hover:bg-brand-gold/10 hover:border-brand-gold/30 transition-all group">
                  <Facebook className="w-6 h-6 text-brand-charcoal-muted group-hover:text-brand-gold transition-colors" />
                  <span className="text-xs text-brand-charcoal-muted">Facebook</span>
                </a>
                <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-brand-charcoal/5 border border-brand-charcoal/10 hover:bg-brand-gold/10 hover:border-brand-gold/30 transition-all group">
                  <MessageCircle className="w-6 h-6 text-brand-charcoal-muted group-hover:text-brand-gold transition-colors" />
                  <span className="text-xs text-brand-charcoal-muted">WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Location */}
            <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6">
              <h3 className="font-serif text-lg text-brand-charcoal mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-gold" /> {t('location', effectiveLang)}
              </h3>
              <div className="rounded-xl overflow-hidden border border-brand-charcoal/10 mb-3">
                <div className="h-32 bg-gradient-to-br from-brand-gold/10 via-brand-card to-black flex items-center justify-center relative">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37, transparent 50%)' }} />
                  <MapPin className="w-10 h-10 text-brand-gold/60" />
                </div>
              </div>
              <a href={MAPS_DIR_URL} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-brand-gold/20 border border-brand-gold/30 text-brand-gold text-sm hover:bg-brand-gold/30 transition-all">
                <Navigation className="w-4 h-4" /> {t('getDirections', effectiveLang)}
              </a>
            </div>
          </section>

          {/* Post-service Review Modal trigger */}
          <section className="animate-slide-up">
            <button onClick={() => setShowReview(true)}
              className="w-full p-4 bg-brand-card border border-brand-charcoal/10 rounded-2xl hover:border-brand-gold/30 transition-all text-left">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-brand-gold" />
                <div>
                  <p className="text-brand-charcoal text-sm font-medium">{t('reviewTitle', effectiveLang)}</p>
                  <p className="text-brand-charcoal-muted text-xs">{t('reviewPrompt', effectiveLang)}</p>
                </div>
              </div>
            </button>
          </section>
        </main>

        {/* Review Modal */}
        {showReview && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowReview(false); setReviewRating(null); setReviewMessage(''); }}>
            <div className="bg-brand-card border border-brand-charcoal/15 rounded-2xl p-6 max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
              {!reviewRating ? (
                <>
                  <h3 className="font-serif text-xl text-brand-charcoal text-center mb-2">{t('reviewPrompt', effectiveLang)}</h3>
                  <p className="text-brand-charcoal-muted text-sm text-center mb-6">{t('reviewTitle', effectiveLang)}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setReviewRating('good')}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl bg-brand-charcoal/5 border border-brand-charcoal/15 hover:bg-brand-gold/10 hover:border-brand-gold/30 transition-all">
                      <span className="text-4xl">😍</span>
                      <span className="text-brand-charcoal-muted text-sm">Excelente</span>
                    </button>
                    <button onClick={() => setReviewRating('neutral')}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl bg-brand-charcoal/5 border border-brand-charcoal/15 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all">
                      <span className="text-4xl">😐</span>
                      <span className="text-brand-charcoal-muted text-sm">Mejorable</span>
                    </button>
                  </div>
                </>
              ) : reviewRating === 'good' ? (
                <div className="text-center animate-fade-in">
                  <div className="text-5xl mb-4">😍</div>
                  <p className="text-brand-charcoal mb-4">{t('reviewGood', effectiveLang)}</p>
                  <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-brand-gold text-black font-medium text-sm hover:bg-brand-gold-light transition-all mb-2">
                    <Star className="w-4 h-4" /> {t('leaveReviewGoogle', effectiveLang)}
                  </a>
                  <p className="text-brand-charcoal-muted text-xs mt-4">{t('thankYou', effectiveLang)}</p>
                  <button onClick={() => { setShowReview(false); setReviewRating(null); }}
                    className="mt-4 text-brand-charcoal-muted text-sm hover:text-brand-charcoal transition-colors">
                    {t('back', effectiveLang)}
                  </button>
                </div>
              ) : (
                <div className="text-center animate-fade-in">
                  <div className="text-5xl mb-4">😐</div>
                  <p className="text-brand-charcoal mb-4">{t('reviewNeutral', effectiveLang)}</p>
                  <textarea value={reviewMessage} onChange={e => setReviewMessage(e.target.value)}
                    placeholder={t('notesPlaceholder', effectiveLang)} rows={4}
                    className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm placeholder:text-brand-charcoal-muted/40 focus:border-brand-gold/40 focus:outline-none transition-colors resize-none mb-3" />
                  <button onClick={() => {
                    setFeedback([...feedback, { id: `f${Date.now()}`, rating: 'neutral', message: reviewMessage, date: new Date().toISOString().split('T')[0], clientName: 'Cliente' }]);
                    setShowReview(false);
                    setReviewRating(null);
                    setReviewMessage('');
                  }} className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 font-medium text-sm hover:bg-blue-500/30 transition-all">
                    <Send className="w-4 h-4" /> {t('sendPrivate', effectiveLang)}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bizum Deposit Popup for >2h services */}
        {showBizumDeposit && totalDuration.service > 120 && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowBizumDeposit(false)}>
            <div className="bg-brand-card border border-brand-gold/30 rounded-2xl p-6 max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-brand-gold" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-brand-charcoal">Reserva anticipada</h3>
                  <p className="text-brand-charcoal-muted text-xs">Servicio de más de 2 horas</p>
                </div>
              </div>
              <p className="text-brand-charcoal-muted text-sm mb-4">
                Para servicios de más de 2h se requiere un depósito por Bizum al <span className="text-brand-gold font-medium">{BIZUM_NUMBER}</span> para confirmar tu cita.
              </p>
              <div className="p-3 rounded-lg bg-brand-gold/10 border border-brand-gold/20 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-brand-charcoal-muted text-sm">Total del servicio</span>
                  <span className="text-brand-charcoal font-medium">{totalDuration.service} min ({Math.floor(totalDuration.service / 60)}h {totalDuration.service % 60}min)</span>
                </div>
              </div>
              <button onClick={() => setShowBizumDeposit(false)}
                className="w-full px-4 py-3 rounded-lg bg-brand-gold text-black font-medium text-sm hover:bg-brand-gold-light transition-all">
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-brand-charcoal/10 mt-8">
          <div className="max-w-5xl mx-auto px-4 py-6 text-center">
            <p className="font-serif text-sm gold-text tracking-[0.2em] mb-1">L'A — HAIR EXPERIENCE</p>
            <p className="text-brand-charcoal-muted/40 text-xs">© 2026 L'Studio Ana. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // ─── 360studio Management ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-brand-black/95 backdrop-blur-md border-b border-brand-charcoal/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <p className="font-serif text-sm tracking-[0.15em] text-brand-charcoal">360STUDIO</p>
              <p className="text-[10px] text-brand-charcoal-muted/60 tracking-widest uppercase">Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setView('pin'); setPinTarget('manage' as any); navigate('/pin'); }}
              className="p-2 rounded-full bg-brand-charcoal/5 hover:bg-brand-charcoal/10 border border-brand-charcoal/15 transition-all">
              <LogOut className="w-4 h-4 text-brand-charcoal-muted" />
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto scrollbar-hide">
          {([
            { key: 'bookings', label: 'allBookings', icon: Calendar },
            { key: 'clients', label: 'clientDatabase', icon: Users },
            { key: 'saturday', label: 'saturdayHub', icon: AlertTriangle },
            { key: 'catalog', label: 'catalogManager', icon: Scissors },
            { key: 'calendar', label: 'calendar', icon: CalendarDays },
            { key: 'tools', label: 'tools', icon: SlidersHorizontal },
            { key: 'settings', label: 'settings', icon: Store },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setManageTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${manageTab === tab.key ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30' : 'text-brand-charcoal-muted hover:text-brand-charcoal hover:bg-brand-charcoal/5 border border-transparent'}`}>
              <tab.icon className="w-4 h-4" />
              {t(tab.label, 'ES')}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* All Bookings */}
        {manageTab === 'bookings' && (
          <div className="space-y-4 animate-fade-in">
            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${filterStatus === 'all' ? 'bg-brand-charcoal/10 text-brand-charcoal border-brand-charcoal/20' : 'text-brand-charcoal-muted border-brand-charcoal/10 hover:text-brand-charcoal'}`}>
                Todas
              </button>
              {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map(status => {
                const cfg = STATUS_CONFIG[status];
                const Icon = cfg.icon;
                return (
                  <button key={status} onClick={() => setFilterStatus(status)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${filterStatus === status ? cfg.bg + ' ' + cfg.color : 'text-brand-charcoal-muted border-brand-charcoal/10 hover:text-brand-charcoal'}`}>
                    <Icon className="w-3 h-3" />
                    {t(cfg.labelKey, 'ES')}
                  </button>
                );
              })}
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-12 text-brand-charcoal-muted/60 text-sm">{t('noBookings', 'ES')}</div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map(booking => {
                  const cfg = STATUS_CONFIG[booking.status];
                  const StatusIcon = cfg.icon;
                  const bookingServices = booking.services.map(sid => services.find(s => s.id === sid)).filter(Boolean) as Service[];
                  return (
                    <div key={booking.id} className={`rounded-xl border p-4 ${cfg.bg}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-brand-charcoal font-medium">{booking.clientName}</p>
                            {booking.isSaturday && <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px]">SÁBADO</span>}
                          </div>
                          <p className="text-brand-charcoal-muted text-xs">{booking.clientPhone}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 ${cfg.color} text-sm`}>
                          <StatusIcon className="w-4 h-4" />
                          {t(cfg.labelKey, 'ES')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {bookingServices.map(s => (
                          <span key={s.id} className="px-2 py-0.5 rounded bg-brand-charcoal/5 text-brand-charcoal-muted text-xs">{s.name.ES}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-brand-charcoal-muted mb-3">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(booking.date, 'ES')}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {booking.time}</span>
                        {booking.promoCode && <span className="flex items-center gap-1 text-brand-gold"><Tag className="w-3 h-3" /> {booking.promoCode}</span>}
                      </div>
                      {booking.notes && <p className="text-brand-charcoal-muted/60 text-xs italic mb-3">"{booking.notes}"</p>}
                      
                      {/* Status selector */}
                      <div className="flex gap-1.5 flex-wrap">
                        {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map(status => {
                          const sCfg = STATUS_CONFIG[status];
                          const SIcon = sCfg.icon;
                          return (
                            <button key={status} onClick={() => handleStatusChange(booking.id, status)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${booking.status === status ? sCfg.bg + ' ' + sCfg.color + ' border-current' : 'bg-brand-charcoal/5 text-brand-charcoal-muted/60 border-brand-charcoal/10 hover:bg-brand-charcoal/10'}`}>
                              <SIcon className="w-3 h-3" />
                              {t(sCfg.labelKey, 'ES')}
                            </button>
                          );
                        })}
                        {booking.status === 'confirmed' && (
                          <button onClick={() => handleSendWhatsAppReview(booking)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 transition-all">
                            <MessageCircle className="w-3 h-3" /> WhatsApp Review
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Client Database */}
        {manageTab === 'clients' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-charcoal-muted/50" />
                <input type="text" value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Buscar cliente..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
              </div>
              <button onClick={() => { setEditingClient(null); setShowClientForm(true); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-gold/20 border border-brand-gold/30 text-brand-gold text-sm hover:bg-brand-gold/30 transition-all">
                <Plus className="w-4 h-4" /> Nuevo Cliente
              </button>
            </div>
            <div className="space-y-2">
              {clients.filter(c => {
                const q = clientSearch.toLowerCase().trim();
                if (!q) return true;
                return c.name.toLowerCase().includes(q) || c.surname.toLowerCase().includes(q) || c.phone.includes(q) || c.clientId.toLowerCase().includes(q);
              }).map(client => (
                <div key={client.clientId} className="bg-brand-card border border-brand-charcoal/10 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-gold/15 border border-brand-gold/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-gold font-medium">{client.name.charAt(0)}{client.surname.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-brand-charcoal font-medium">{client.name} {client.surname}</p>
                        <p className="text-brand-charcoal-muted text-xs">{client.phone}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded bg-brand-charcoal/5 text-brand-charcoal-muted text-[10px] font-mono">{client.clientId}</span>
                          <span className="px-2 py-0.5 rounded bg-brand-gold/10 text-brand-gold text-[10px]">PIN: {client.pin}</span>
                          {client.pwaInstalled && <Smartphone className="w-3 h-3 text-brand-gold" />}
                        </div>
                        {client.notes && <p className="text-brand-charcoal-muted/60 text-xs italic mt-1.5">"{client.notes}"</p>}
                      </div>
                    </div>
                    <button onClick={() => { setEditingClient(client); setShowClientForm(true); }}
                      className="p-2 rounded-lg bg-brand-charcoal/5 hover:bg-brand-charcoal/10 text-brand-charcoal-muted hover:text-brand-charcoal transition-all">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {clients.filter(c => {
                const q = clientSearch.toLowerCase().trim();
                if (!q) return true;
                return c.name.toLowerCase().includes(q) || c.surname.toLowerCase().includes(q) || c.phone.includes(q) || c.clientId.toLowerCase().includes(q);
              }).length === 0 && (
                <div className="text-center py-12 text-brand-charcoal-muted/60 text-sm">No se encontraron clientes</div>
              )}
            </div>

            {/* Client Form Modal */}
            {showClientForm && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowClientForm(false); setEditingClient(null); }}>
                <div className="bg-brand-card border border-brand-charcoal/20 rounded-2xl p-6 max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
                  <h3 className="font-serif text-lg text-brand-charcoal mb-4">{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-brand-charcoal-muted text-xs mb-1 block">Nombre</label>
                        <input type="text" defaultValue={editingClient?.name ?? ''} id="client-form-name"
                          className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="text-brand-charcoal-muted text-xs mb-1 block">Apellido</label>
                        <input type="text" defaultValue={editingClient?.surname ?? ''} id="client-form-surname"
                          className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="text-brand-charcoal-muted text-xs mb-1 block">Teléfono</label>
                      <input type="tel" defaultValue={editingClient?.phone ?? ''} id="client-form-phone"
                        className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-brand-charcoal-muted text-xs mb-1 block">PIN (4 dígitos)</label>
                      <input type="text" maxLength={4} defaultValue={editingClient?.pin ?? ''} id="client-form-pin"
                        className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-brand-charcoal-muted text-xs mb-1 block">Notas</label>
                      <textarea defaultValue={editingClient?.notes ?? ''} id="client-form-notes" rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors resize-none" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button onClick={() => { setShowClientForm(false); setEditingClient(null); }}
                      className="px-4 py-2 rounded-lg bg-brand-charcoal/5 border border-brand-charcoal/10 text-brand-charcoal-muted text-sm hover:bg-brand-charcoal/10 transition-all">Cancelar</button>
                    <button onClick={() => {
                      const name = (document.getElementById('client-form-name') as HTMLInputElement).value.trim();
                      const surname = (document.getElementById('client-form-surname') as HTMLInputElement).value.trim();
                      const phone = (document.getElementById('client-form-phone') as HTMLInputElement).value.trim();
                      const pin = (document.getElementById('client-form-pin') as HTMLInputElement).value.trim();
                      const notes = (document.getElementById('client-form-notes') as HTMLTextAreaElement).value.trim();
                      if (!name || !phone) return;
                      if (editingClient) {
                        setClients(clients.map(c => c.clientId === editingClient.clientId ? { ...c, name, surname, phone, pin: pin || c.pin, notes } : c));
                      } else {
                        const newClient: ClientRecord = {
                          clientId: generateClientId(), pin: pin || '0000', name, surname, phone, notes,
                          createdAt: new Date().toISOString().split('T')[0], lastAccess: null, pwaInstalled: false, accessCount: 0,
                        };
                        setClients([...clients, newClient]);
                      }
                      setShowClientForm(false);
                      setEditingClient(null);
                    }}
                      className="px-4 py-2 rounded-lg bg-brand-gold text-black font-medium text-sm hover:bg-brand-gold-light transition-all">Guardar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saturday Approval Hub */}
        {manageTab === 'saturday' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-yellow-400 font-medium text-sm">{t('saturdayHub', 'ES')}</p>
                <p className="text-brand-charcoal-muted text-xs">{saturdayBookings.length} {t('pending', 'ES').toLowerCase()}</p>
              </div>
            </div>
            {saturdayBookings.length === 0 ? (
              <div className="text-center py-12 text-brand-charcoal-muted/60 text-sm">No hay reservas de sábado pendientes</div>
            ) : (
              saturdayBookings.map(booking => {
                const bookingServices = booking.services.map(sid => services.find(s => s.id === sid)).filter(Boolean) as Service[];
                return (
                  <div key={booking.id} className="bg-brand-card border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-brand-charcoal font-medium">{booking.clientName}</p>
                        <p className="text-brand-charcoal-muted text-xs">{booking.clientPhone}</p>
                      </div>
                      <span className="text-yellow-400 text-xs flex items-center gap-1"><Clock3 className="w-3 h-3" /> {t('pending', 'ES')}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {bookingServices.map(s => <span key={s.id} className="px-2 py-0.5 rounded bg-brand-charcoal/5 text-brand-charcoal-muted text-xs">{s.name.ES}</span>)}
                    </div>
                    <p className="text-brand-charcoal-muted text-xs mb-3">{formatDate(booking.date, 'ES')} · {booking.time}</p>
                    {booking.notes && <p className="text-brand-charcoal-muted/60 text-xs italic mb-3">"{booking.notes}"</p>}
                    <div className="flex gap-2">
                      <button onClick={() => handleSaturdayApprove(booking.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm hover:bg-green-500/30 transition-all">
                        <Check className="w-4 h-4" /> {t('approve', 'ES')}
                      </button>
                      <button onClick={() => handleSaturdayReject(booking.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/30 transition-all">
                        <X className="w-4 h-4" /> {t('reject', 'ES')}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Catalog & Promos Manager */}
        {manageTab === 'catalog' && (
          <div className="space-y-6 animate-fade-in">
            {/* Services */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-brand-charcoal">{t('serviceCatalog', 'ES')}</h3>
                <button onClick={() => { setEditingService(null); setShowServiceForm(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-gold/20 border border-brand-gold/30 text-brand-gold text-sm hover:bg-brand-gold/30 transition-all">
                  <Plus className="w-4 h-4" /> {t('addService', 'ES')}
                </button>
              </div>
              <div className="space-y-2">
                <NestedCatalog services={services} categories={categories} onEdit={(s) => { setEditingService(s); setShowServiceForm(true); }} onDelete={handleDeleteService} onToggleVisibility={handleToggleServiceVisibility} onReorderCategory={(idx, dir) => {
                  setCategories(prev => {
                    const next = [...prev];
                    const target = dir === 'up' ? idx - 1 : idx + 1;
                    if (target < 0 || target >= next.length) return prev;
                    [next[idx], next[target]] = [next[target], next[idx]];
                    return next;
                  });
                }} onAddServiceInCategory={(cat) => {
                  setEditingService(null);
                  setPresetCategory(cat);
                  setShowServiceForm(true);
                }} />
              </div>
            </div>

            {/* Promos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-brand-charcoal flex items-center gap-2">
                  <Tag className="w-5 h-5 text-brand-gold" /> {t('catalogManager', 'ES')}
                </h3>
                <button onClick={() => setShowPromoForm(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-gold/20 border border-brand-gold/30 text-brand-gold text-sm hover:bg-brand-gold/30 transition-all">
                  <Plus className="w-4 h-4" /> {t('addPromo', 'ES')}
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {promos.map(promo => (
                  <div key={promo.code} className="bg-brand-card border border-brand-charcoal/10 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-mono text-brand-gold font-medium">{promo.code}</p>
                        <p className="text-brand-charcoal-muted text-xs">{promo.description}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${promo.active ? 'bg-green-500/15 text-green-400' : 'bg-brand-charcoal/5 text-brand-charcoal-muted/60'}`}>
                        {promo.active ? t('active', 'ES') : t('inactive', 'ES')}
                      </span>
                    </div>
                    <p className="text-brand-charcoal text-sm mb-3">{promo.type === 'percent' ? `${promo.value}% descuento` : `€${promo.value} descuento`}</p>
                    <div className="flex gap-1">
                      <button onClick={() => handleTogglePromo(promo.code)}
                        className="px-3 py-1.5 rounded-lg bg-brand-charcoal/5 hover:bg-brand-charcoal/10 text-brand-charcoal-muted text-xs transition-all">
                        {promo.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => handleDeletePromo(promo.code)}
                        className="px-3 py-1.5 rounded-lg bg-brand-charcoal/5 hover:bg-red-500/20 text-brand-charcoal-muted hover:text-red-400 text-xs transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Form Modal */}
            {showServiceForm && (
              <ServiceFormModal service={editingService} presetCategory={presetCategory} onSave={handleSaveService} onClose={() => { setShowServiceForm(false); setEditingService(null); setPresetCategory(''); }} />
            )}

            {/* Promo Form Modal */}
            {showPromoForm && (
              <PromoFormModal onSave={handleSavePromo} onClose={() => setShowPromoForm(false)} />
            )}
          </div>
        )}

        {/* Calendar View */}
        {manageTab === 'calendar' && (
          <>
          <PastelCalendar bookings={bookings} services={services} vacationDates={vacationDates} onToggleVacation={handleToggleVacation} onSlotClick={openQuickBook} />

          {/* Quick Booking Modal */}
          {quickBook && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={closeQuickBook}>
              <div className="bg-brand-card border border-brand-charcoal/20 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="font-serif text-lg text-brand-charcoal mb-4 flex items-center gap-2">
                  <CalendarPlus className="w-5 h-5 text-brand-gold" /> Cita Rápida
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-brand-charcoal-muted text-xs mb-1 block">Nombre y Apellidos</label>
                    <input type="text" value={qbName} onChange={e => {
                      setQbName(e.target.value);
                      setQbClientSearch(e.target.value);
                      const q = e.target.value.toLowerCase().trim();
                      if (q.length >= 2) {
                        setQbSearchResults(clients.filter(c => c.name.toLowerCase().includes(q) || c.surname.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 4));
                      } else {
                        setQbSearchResults([]);
                      }
                    }}
                      className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                    {qbSearchResults.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {qbSearchResults.map(c => (
                          <button key={c.clientId} onClick={() => {
                            setQbName(`${c.name} ${c.surname}`);
                            setQbPhone(c.phone);
                            setQbSearchResults([]);
                          }}
                            className="w-full text-left p-2 rounded-lg bg-brand-card-light border border-brand-gold/20 hover:border-brand-gold/40 transition-all">
                            <p className="text-brand-charcoal text-sm">{c.name} {c.surname}</p>
                            <p className="text-brand-charcoal-muted text-xs">{c.phone} · {c.clientId}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-brand-charcoal-muted text-xs mb-1 block">Teléfono</label>
                    <input type="tel" value={qbPhone} onChange={e => setQbPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-brand-charcoal-muted text-xs mb-1 block">Servicios</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-hide">
                      {services.map(s => (
                        <button key={s.id} onClick={() => {
                          if (qbServices.includes(s.id)) setQbServices(qbServices.filter(id => id !== s.id));
                          else setQbServices([...qbServices, s.id]);
                        }}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${qbServices.includes(s.id) ? 'bg-brand-gold/20 border-brand-gold/40 text-brand-gold' : 'bg-brand-charcoal/5 border-brand-charcoal/10 text-brand-charcoal-muted hover:bg-brand-charcoal/10'}`}>
                          {s.name.ES}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-brand-charcoal-muted text-xs mb-1 block">Fecha</label>
                      <input type="date" value={qbDate} onChange={e => setQbDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-brand-charcoal-muted text-xs mb-1 block">Hora</label>
                      <input type="time" value={qbTime} onChange={e => setQbTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-ivory text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={closeQuickBook} className="px-4 py-2 rounded-lg bg-brand-charcoal/5 border border-brand-charcoal/10 text-brand-charcoal-muted text-sm hover:bg-brand-charcoal/10 transition-all">Cancelar</button>
                  <button onClick={handleQuickBookSave} disabled={!qbName || !qbPhone || qbServices.length === 0}
                    className="px-4 py-2 rounded-lg bg-brand-gold text-black font-medium text-sm disabled:opacity-30 hover:bg-brand-gold-light transition-all">Guardar</button>
                </div>
              </div>
            </div>
          )}
          </>
        )}

        {/* Tools */}
        {manageTab === 'tools' && (
          <div className="space-y-6 animate-fade-in">
            {/* Client Stats Panel */}
            <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6">
              <h3 className="font-serif text-lg text-brand-charcoal mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-gold" /> Analítica de Clientes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-brand-card-light border border-brand-charcoal/10">
                  <p className="text-brand-charcoal-muted text-xs mb-1">Total Clientes</p>
                  <p className="font-serif text-2xl text-brand-charcoal">{clients.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-brand-card-light border border-brand-charcoal/10">
                  <p className="text-brand-charcoal-muted text-xs mb-1">Activos</p>
                  <p className="font-serif text-2xl text-green-500">{clients.filter(c => c.accessCount > 0).length}</p>
                </div>
                <div className="p-3 rounded-xl bg-brand-card-light border border-brand-charcoal/10">
                  <p className="text-brand-charcoal-muted text-xs mb-1">PWA Instalada</p>
                  <p className="font-serif text-2xl text-brand-gold flex items-center gap-1">{clients.filter(c => c.pwaInstalled).length} <Smartphone className="w-4 h-4" /></p>
                </div>
                <div className="p-3 rounded-xl bg-brand-card-light border border-brand-charcoal/10">
                  <p className="text-brand-charcoal-muted text-xs mb-1">Nuevos (30d)</p>
                  <p className="font-serif text-2xl text-blue-400">{clients.filter(c => { const d = new Date(c.createdAt); const diff = (Date.now() - d.getTime()) / 86400000; return diff <= 30; }).length}</p>
                </div>
              </div>
              <div>
                <p className="text-brand-charcoal-muted text-xs mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Accesos recientes</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                  {clients.filter(c => c.lastAccess).sort((a, b) => (b.lastAccess! > a.lastAccess! ? 1 : -1)).slice(0, 8).map(c => (
                    <div key={c.clientId} className="flex items-center justify-between p-2 rounded-lg bg-brand-card-light border border-brand-charcoal/5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-gold/15 border border-brand-gold/20 flex items-center justify-center">
                          <span className="text-brand-gold text-xs font-medium">{c.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-brand-charcoal text-sm">{c.name}</p>
                          <p className="text-brand-charcoal-muted/60 text-xs">{c.accessCount} accesos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.pwaInstalled && <Smartphone className="w-3.5 h-3.5 text-brand-gold" />}
                        <span className="text-brand-charcoal-muted text-xs">{new Date(c.lastAccess!).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feedback Inbox */}
            <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6">
              <h3 className="font-serif text-lg text-brand-charcoal mb-4 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-brand-gold" /> {t('feedbackInbox', 'ES')}
              </h3>
              {feedback.length === 0 ? (
                <p className="text-brand-charcoal-muted/60 text-sm">No hay feedback privado</p>
              ) : (
                <div className="space-y-3">
                  {feedback.map(fb => (
                    <div key={fb.id} className="p-3 rounded-lg bg-brand-card-light border border-brand-charcoal/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{fb.rating === 'good' ? '😍' : fb.rating === 'neutral' ? '😐' : '😞'}</span>
                        <span className="text-brand-charcoal-muted text-xs">{fb.clientName} · {fb.date}</span>
                      </div>
                      <p className="text-brand-charcoal-muted text-sm italic">"{fb.message}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lost Demand Tracker */}
            <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6">
              <h3 className="font-serif text-lg text-brand-charcoal mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-brand-gold" /> {t('lostDemand', 'ES')}
              </h3>
              <div className="space-y-2">
                {lostDemand.length === 0 ? (
                  <p className="text-brand-charcoal-muted/60 text-sm">Sin demanda perdida registrada</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10 mb-2">
                      <span className="text-brand-charcoal text-sm font-medium flex items-center gap-1.5"><Euro className="w-4 h-4 text-red-400" /> Ingresos estimados perdidos</span>
                      <span className="text-red-400 font-serif text-lg">€{lostDemand.reduce((sum, item) => sum + item.estimatedRevenue, 0)}</span>
                    </div>
                    {lostDemand.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-brand-card-light border border-brand-charcoal/10">
                        <div>
                          <p className="text-brand-charcoal-muted text-sm">{item.service}</p>
                          <p className="text-brand-charcoal-muted/60 text-xs">{item.date} · {item.time}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-400 text-xs font-medium">~€{item.estimatedRevenue}</span>
                          <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs">{item.reason}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* WhatsApp Trigger */}
            <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6">
              <h3 className="font-serif text-lg text-brand-charcoal mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-brand-gold" /> {t('whatsappTrigger', 'ES')}
              </h3>
              <p className="text-brand-charcoal-muted text-sm mb-4">Envía automáticamente una solicitud de reseña por WhatsApp a clientes con citas completadas.</p>
              <div className="space-y-2">
                {bookings.filter(b => b.status === 'completed').map(booking => (
                  <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-brand-card-light border border-brand-charcoal/10">
                    <div>
                      <p className="text-brand-charcoal-muted text-sm">{booking.clientName}</p>
                      <p className="text-brand-charcoal-muted/60 text-xs">{booking.clientPhone}</p>
                    </div>
                    <button onClick={() => handleSendWhatsAppReview(booking)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm hover:bg-green-500/30 transition-all">
                      <Send className="w-3.5 h-3.5" /> Enviar
                    </button>
                  </div>
                ))}
                {bookings.filter(b => b.status === 'completed').length === 0 && (
                  <p className="text-brand-charcoal-muted/60 text-sm">No hay citas completadas</p>
                )}
              </div>
            </div>

            {/* Vacation Blocker */}
            <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6">
              <h3 className="font-serif text-lg text-brand-charcoal mb-4 flex items-center gap-2">
                <Ban className="w-5 h-5 text-brand-gold" /> {t('vacationBlocker', 'ES')}
              </h3>
              <p className="text-brand-charcoal-muted text-sm mb-4">Selecciona fechas para bloquear disponibilidad.</p>
              <input type="date" min={getMinDate()} max={getMaxDate()} onChange={e => { if (e.target.value) handleToggleVacation(e.target.value); e.target.value = ''; }}
                className="px-4 py-2.5 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
              {vacationDates.size > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from(vacationDates).sort().map(d => (
                    <span key={d} className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/20 text-red-400 text-xs">
                      {d} <button onClick={() => handleToggleVacation(d)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Center */}
        {manageTab === 'settings' && (
          <div className="space-y-6 animate-fade-in">
            {/* Settings sub-tabs */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {([
                { key: 'business', label: 'Negocio', icon: Store },
                { key: 'schedule', label: 'Horario', icon: Clock4 },
                { key: 'rules', label: 'Reglas', icon: SlidersHorizontal },
                { key: 'notifications', label: 'Notificaciones', icon: MessageSquare },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setSettingsTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${settingsTab === tab.key ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30' : 'text-brand-charcoal-muted hover:text-brand-charcoal hover:bg-brand-charcoal/5 border border-transparent'}`}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Business & Brand */}
            {settingsTab === 'business' && (
              <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6 space-y-4 animate-fade-in">
                <h3 className="font-serif text-lg text-brand-charcoal flex items-center gap-2">
                  <Store className="w-5 h-5 text-brand-gold" /> Negocio y Marca
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-brand-charcoal-muted text-xs mb-1 block">Nombre del Salón</label>
                    <input type="text" value={bizName} onChange={e => setBizName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-brand-charcoal-muted text-xs mb-1 block">Teléfono Bizum</label>
                    <input type="tel" value={bizPhone} onChange={e => setBizPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-brand-charcoal-muted text-xs mb-1 block">Dirección</label>
                  <input type="text" value={bizAddress} onChange={e => setBizAddress(e.target.value)} placeholder="Calle, número, ciudad"
                    className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-brand-charcoal-muted text-xs mb-1 block">Enlace GPS / Google Maps</label>
                  <input type="url" value={bizGps} onChange={e => setBizGps(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                </div>
              </div>
            )}

            {/* Schedule & Holidays */}
            {settingsTab === 'schedule' && (
              <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6 space-y-4 animate-fade-in">
                <h3 className="font-serif text-lg text-brand-charcoal flex items-center gap-2">
                  <Clock4 className="w-5 h-5 text-brand-gold" /> Horario Semanal y Vacaciones
                </h3>
                <div className="space-y-2">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <div key={day} className="flex items-center gap-3 p-2 rounded-lg bg-brand-card-light border border-brand-charcoal/10">
                      <button onClick={() => setDaySchedules(prev => prev.map((d, i) => i === idx ? { ...d, open: !d.open } : d))}
                        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${daySchedules[idx].open ? 'bg-brand-gold' : 'bg-brand-charcoal/15'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${daySchedules[idx].open ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="text-brand-charcoal text-sm w-24 flex-shrink-0">{day}</span>
                      {daySchedules[idx].open ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={daySchedules[idx].openTime}
                            onChange={e => setDaySchedules(prev => prev.map((d, i) => i === idx ? { ...d, openTime: e.target.value } : d))}
                            className="px-2 py-1.5 rounded-lg bg-brand-card border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                          <span className="text-brand-charcoal-muted text-xs">—</span>
                          <input type="time" value={daySchedules[idx].closeTime}
                            onChange={e => setDaySchedules(prev => prev.map((d, i) => i === idx ? { ...d, closeTime: e.target.value } : d))}
                            className="px-2 py-1.5 rounded-lg bg-brand-card border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                        </div>
                      ) : (
                        <span className="text-brand-charcoal-muted/50 text-sm italic">Cerrado</span>
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-brand-charcoal-muted text-xs mb-1 block">Buffer por Defecto (min)</label>
                  <input type="number" value={defaultBuffer} onChange={e => setDefaultBuffer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                </div>
                <div className="pt-2 border-t border-brand-charcoal/10">
                  <p className="text-brand-charcoal-muted text-sm mb-3 flex items-center gap-2"><Ban className="w-4 h-4" /> Bloqueo de Vacaciones y Festivos</p>
                  <input type="date" min={getMinDate()} max={getMaxDate()} onChange={e => { if (e.target.value) handleToggleVacation(e.target.value); e.target.value = ''; }}
                    className="px-4 py-2.5 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                  {vacationDates.size > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Array.from(vacationDates).sort().map(d => (
                        <span key={d} className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/20 text-red-400 text-xs">
                          {d} <button onClick={() => handleToggleVacation(d)}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Booking Rules */}
            {settingsTab === 'rules' && (
              <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6 space-y-4 animate-fade-in">
                <h3 className="font-serif text-lg text-brand-charcoal flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-brand-gold" /> Reglas de Reserva
                </h3>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-brand-charcoal text-sm">Sábados requieren aprobación manual</p>
                    <p className="text-brand-charcoal-muted text-xs">Las citas de sábado quedan pendientes hasta aprobación</p>
                  </div>
                  <button onClick={() => setSatApproval(!satApproval)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${satApproval ? 'bg-brand-gold' : 'bg-brand-charcoal/15'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${satApproval ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </label>
                <div className="pt-2 border-t border-brand-charcoal/10">
                  <label className="text-brand-charcoal-muted text-xs mb-1 block">Límite de reserva anticipada (meses)</label>
                  <input type="number" value={advanceLimit} onChange={e => setAdvanceLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors" />
                </div>
                <div className="pt-2 border-t border-brand-charcoal/10">
                  <label className="flex items-center justify-between cursor-pointer mb-3">
                    <div>
                      <p className="text-brand-charcoal text-sm">Depósito requerido vía Bizum</p>
                      <p className="text-brand-charcoal-muted text-xs">Solicitar depósito para confirmar cita</p>
                    </div>
                    <button onClick={() => setDepositRequired(!depositRequired)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${depositRequired ? 'bg-brand-gold' : 'bg-brand-charcoal/15'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${depositRequired ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                  <div>
                    <label className="text-brand-charcoal-muted text-xs mb-1 block">Cantidad del Depósito (€)</label>
                    <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} disabled={!depositRequired}
                      className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none transition-colors disabled:opacity-30" />
                  </div>
                </div>
              </div>
            )}

            {/* Automated Notifications */}
            {settingsTab === 'notifications' && (
              <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6 space-y-4 animate-fade-in">
                <h3 className="font-serif text-lg text-brand-charcoal flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-brand-gold" /> Notificaciones Automatizadas
                </h3>
                <div>
                  <label className="text-brand-charcoal-muted text-xs mb-1 block flex items-center gap-1.5"><Bell className="w-3 h-3" /> Recordatorio WhatsApp</label>
                  <textarea value={waReminder} onChange={e => setWaReminder(e.target.value)} rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none resize-none transition-colors" />
                  <p className="text-brand-charcoal-muted/60 text-[10px] mt-1">Variables: {'{cliente}, {fecha}, {hora}'}</p>
                </div>
                <div>
                  <label className="text-brand-charcoal-muted text-xs mb-1 block flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Confirmación de Reserva</label>
                  <textarea value={waConfirm} onChange={e => setWaConfirm(e.target.value)} rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none resize-none transition-colors" />
                  <p className="text-brand-charcoal-muted/60 text-[10px] mt-1">Variables: {'{cliente}, {fecha}, {hora}'}</p>
                </div>
                <div>
                  <label className="text-brand-charcoal-muted text-xs mb-1 block flex items-center gap-1.5"><Star className="w-3 h-3" /> Reseña Post-Servicio (Google)</label>
                  <textarea value={waReview} onChange={e => setWaReview(e.target.value)} rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none resize-none transition-colors" />
                  <p className="text-brand-charcoal-muted/60 text-[10px] mt-1">Variables: {'{cliente}, {link}'}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Nested Catalog ──────────────────────────────────────────────────────────

function NestedCatalog({ services, categories, onEdit, onDelete, onToggleVisibility, onReorderCategory, onAddServiceInCategory }: {
  services: Service[];
  categories: string[];
  onEdit: (s: Service) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onReorderCategory: (idx: number, dir: 'up' | 'down') => void;
  onAddServiceInCategory: (category: string) => void;
}) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(categories.slice(0, 2)));

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <>
      {categories.map((cat, catIdx) => {
        const catServices = services.filter(s => s.category === cat);
        const isExpanded = expandedCats.has(cat);
        return (
          <div key={cat} className="bg-brand-card border border-brand-charcoal/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-3.5 hover:bg-brand-charcoal/5 transition-colors">
              <button onClick={() => toggleCat(cat)} className="flex items-center gap-2.5 flex-1 text-left">
                <span className={`w-2 h-8 rounded-full ${PASTEL_COLORS[catIdx % PASTEL_COLORS.length].split(' ')[0]}`} />
                <span className="font-serif text-sm text-brand-charcoal">{cat}</span>
                <span className="text-brand-charcoal-muted/60 text-xs">({catServices.length})</span>
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => onReorderCategory(catIdx, 'up')} disabled={catIdx === 0}
                  className="p-1 rounded-lg hover:bg-brand-charcoal/10 disabled:opacity-20 transition-all" title="Subir">
                  <ChevronUp className="w-3.5 h-3.5 text-brand-charcoal-muted" />
                </button>
                <button onClick={() => onReorderCategory(catIdx, 'down')} disabled={catIdx === categories.length - 1}
                  className="p-1 rounded-lg hover:bg-brand-charcoal/10 disabled:opacity-20 transition-all" title="Bajar">
                  <ChevronDown className="w-3.5 h-3.5 text-brand-charcoal-muted" />
                </button>
                <button onClick={() => toggleCat(cat)} className="p-1 rounded-lg hover:bg-brand-charcoal/10 transition-all">
                  <ChevronDown className={`w-4 h-4 text-brand-charcoal-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t border-brand-charcoal/10 divide-y divide-brand-charcoal/5 animate-fade-in">
                {catServices.length === 0 ? (
                  <p className="px-4 py-3 text-brand-charcoal-muted/60 text-xs italic">Sin servicios en esta categoría</p>
                ) : (
                  catServices.map((service, idx) => (
                    <div key={service.id} className="flex items-start justify-between p-3 pl-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-brand-charcoal font-medium text-sm">{service.name.ES}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${service.isPrivate ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                            {service.isPrivate ? 'Privado' : 'Público'}
                          </span>
                        </div>
                        <p className="text-brand-charcoal-muted text-xs mt-0.5">{service.duration}min + {service.buffer}min buffer</p>
                        <p className="text-brand-gold text-xs mt-0.5">
                          {service.priceType === 'fixed' && `€${service.price}`}
                          {service.priceType === 'from' && `Desde €${service.price}`}
                          {service.priceType === 'approx' && `Aprox €${service.price}`}
                          {service.priceType === 'consult' && 'Consultar'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onToggleVisibility(service.id)}
                          className="p-1.5 rounded-lg bg-brand-charcoal/5 hover:bg-brand-charcoal/10 transition-all" title={service.isPrivate ? 'Hacer público' : 'Hacer privado'}>
                          {service.isPrivate ? <EyeOff className="w-3.5 h-3.5 text-brand-charcoal-muted" /> : <Eye className="w-3.5 h-3.5 text-brand-charcoal-muted" />}
                        </button>
                        <button onClick={() => onEdit(service)}
                          className="p-1.5 rounded-lg bg-brand-charcoal/5 hover:bg-brand-charcoal/10 transition-all">
                          <Edit2 className="w-3.5 h-3.5 text-brand-charcoal-muted" />
                        </button>
                        <button onClick={() => onDelete(service.id)}
                          className="p-1.5 rounded-lg bg-brand-charcoal/5 hover:bg-red-500/20 transition-all">
                          <Trash2 className="w-3.5 h-3.5 text-brand-charcoal-muted hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button onClick={() => onAddServiceInCategory(cat)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-brand-gold text-xs hover:bg-brand-gold/5 transition-colors border-t border-brand-charcoal/5">
                  <Plus className="w-3.5 h-3.5" /> Añadir Servicio
                </button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ─── Service Form Modal ──────────────────────────────────────────────────────

function ServiceFormModal({ service, presetCategory, onSave, onClose }: { 
  service: Service | null; 
  presetCategory?: string;
  onSave: (s: Service) => void; 
  onClose: () => void;
}) {
  const [name, setName] = useState(service?.name.ES || '');
  const [description, setDescription] = useState(service?.description.ES || '');
  const [category, setCategory] = useState(service?.category || presetCategory || '');
  const [priceType, setPriceType] = useState<PriceType>(service?.priceType || 'from');
  const [price, setPrice] = useState(service?.price?.toString() || '');
  const [duration, setDuration] = useState(service?.duration?.toString() || '60');
  const [buffer, setBuffer] = useState(service?.buffer?.toString() || '15');
  const [isPrivate, setIsPrivate] = useState(service?.isPrivate ?? false);

  const handleSave = () => {
    const newService: Service = {
      id: service?.id || `s${Date.now()}`,
      name: { ES: name, EN: name, FR: name, DE: name, PT: name, UK: name, PL: name, SV: name, NL: name, NO: name, DA: name } as Record<Lang, string>,
      description: { ES: description, EN: description, FR: description, DE: description, PT: description, UK: description, PL: description, SV: description, NL: description, NO: description, DA: description } as Record<Lang, string>,
      category,
      priceType,
      price: price ? parseInt(price) : null,
      duration: parseInt(duration) || 60,
      buffer: parseInt(buffer) || 15,
      isPrivate,
    };
    onSave(newService);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-brand-card border border-brand-charcoal/15 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="font-serif text-lg text-brand-charcoal mb-4">{service ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-brand-charcoal-muted text-xs mb-1 block">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none" />
          </div>
          <div>
            <label className="text-brand-charcoal-muted text-xs mb-1 block">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-brand-charcoal-muted text-xs mb-1 block">Categoría</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none" />
            </div>
            <div>
              <label className="text-brand-charcoal-muted text-xs mb-1 block">Tipo de precio</label>
              <select value={priceType} onChange={e => setPriceType(e.target.value as PriceType)}
                className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none">
                <option value="fixed">Fijo</option>
                <option value="from">Desde</option>
                <option value="approx">Aprox</option>
                <option value="consult">Consultar</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-brand-charcoal-muted text-xs mb-1 block">Precio (€)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} disabled={priceType === 'consult'}
                className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none disabled:opacity-30" />
            </div>
            <div>
              <label className="text-brand-charcoal-muted text-xs mb-1 block">Duración (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none" />
            </div>
            <div>
              <label className="text-brand-charcoal-muted text-xs mb-1 block">Buffer (min)</label>
              <input type="number" value={buffer} onChange={e => setBuffer(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-gold" />
            <span className="text-brand-charcoal-muted text-sm">Servicio privado (oculto en el portal)</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-brand-charcoal/5 border border-brand-charcoal/15 text-brand-charcoal-muted text-sm hover:bg-brand-charcoal/10 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={!name}
            className="px-4 py-2 rounded-lg bg-brand-gold text-black font-medium text-sm disabled:opacity-30 hover:bg-brand-gold-light transition-all">Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Promo Form Modal ───────────────────────────────────────────────────────

function PromoFormModal({ onSave, onClose }: { onSave: (p: PromoCode) => void; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    onSave({ code: code.toUpperCase(), type, value: parseInt(value) || 0, active: true, description });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-brand-card border border-brand-charcoal/15 rounded-2xl p-6 max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="font-serif text-lg text-brand-charcoal mb-4">Nuevo Código Promo</h3>
        <div className="space-y-3">
          <div>
            <label className="text-brand-charcoal-muted text-xs mb-1 block">Código</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: SUMMER10"
              className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-brand-charcoal-muted text-xs mb-1 block">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as 'percent' | 'fixed')}
                className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none">
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Fijo (€)</option>
              </select>
            </div>
            <div>
              <label className="text-brand-charcoal-muted text-xs mb-1 block">Valor</label>
              <input type="number" value={value} onChange={e => setValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-brand-charcoal-muted text-xs mb-1 block">Descripción</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ej: 10% descuento de verano"
              className="w-full px-3 py-2 rounded-lg bg-brand-card-light border border-brand-charcoal/15 text-brand-charcoal text-sm focus:border-brand-gold/40 focus:outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-brand-charcoal/5 border border-brand-charcoal/15 text-brand-charcoal-muted text-sm hover:bg-brand-charcoal/10 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={!code || !value}
            className="px-4 py-2 rounded-lg bg-brand-gold text-black font-medium text-sm disabled:opacity-30 hover:bg-brand-gold-light transition-all">Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Pastel Calendar ─────────────────────────────────────────────────────────

const HOUR_HEIGHT = 56;
const SLOT_HEIGHT = HOUR_HEIGHT / 4; // 14px per 15-minute slot
const START_HOUR = 9;
const END_HOUR = 20;
const GRID_HOURS = END_HOUR - START_HOUR;
const GRID_SLOTS = GRID_HOURS * 4; // 15-minute slots

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getBookingDuration(booking: Booking, services: Service[]): number {
  const bookingServices = booking.services.map(sid => services.find(s => s.id === sid)).filter(Boolean) as Service[];
 const serviceTime = bookingServices.reduce((sum, s) => sum + s.duration, 0);
  const bufferTime = bookingServices.reduce((sum, s) => sum + s.buffer, 0);
  return serviceTime + bufferTime;
}

function AppointmentBlock({ booking, services }: { booking: Booking; services: Service[] }) {
  const cfg = STATUS_CONFIG[booking.status];
  const StatusIcon = cfg.icon;
  const duration = getBookingDuration(booking, services);
  const startMin = timeToMinutes(booking.time);
  const topOffset = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const heightPx = (duration / 60) * HOUR_HEIGHT;
  const bookingServices = booking.services.map(sid => services.find(s => s.id === sid)).filter(Boolean) as Service[];

  return (
    <div
      className={`absolute left-1 right-1 rounded-lg border ${cfg.bg} p-1.5 overflow-hidden z-10 transition-all hover:z-20 hover:scale-[1.02]`}
      style={{ top: `${topOffset}px`, height: `${Math.max(heightPx - 2, 20)}px` }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <StatusIcon className={`w-3 h-3 ${cfg.color} flex-shrink-0`} />
        <span className="text-brand-charcoal text-xs font-medium truncate">{booking.clientName}</span>
      </div>
      <p className="text-brand-charcoal-muted text-[10px] truncate">
        {bookingServices.map(s => s.name.ES).join(', ')}
      </p>
      <p className={`text-[9px] ${cfg.color} mt-0.5`}>
        {booking.time} · {duration}min
      </p>
    </div>
  );
}

function TimeGrid({ date, bookings, services, onSlotClick }: { date: string; bookings: Booking[]; services: Service[]; onSlotClick: (date: string, time: string) => void }) {
  const dayBookings = bookings.filter(b => b.date === date && b.status !== 'cancelled');
  const slots = Array.from({ length: GRID_SLOTS }, (_, i) => i);

  return (
    <div className="relative" style={{ height: `${GRID_SLOTS * SLOT_HEIGHT}px` }}>
      {slots.map(slotIdx => {
        const totalMin = START_HOUR * 60 + slotIdx * 15;
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const isHour = m === 0;
        const isHalf = m === 30;
        return (
          <div
            key={slotIdx}
            onClick={() => onSlotClick(date, timeStr)}
            className={`absolute left-0 right-0 hover:bg-brand-gold/5 cursor-pointer transition-colors group ${isHour ? 'border-t border-brand-charcoal/15' : 'border-t border-brand-charcoal/5'}`}
            style={{ top: `${slotIdx * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
          >
            {isHour && (
              <span className="text-brand-charcoal-muted/60 text-[10px] absolute -top-2 left-1 bg-brand-card px-1 group-hover:text-brand-gold transition-colors">{String(h).padStart(2, '0')}:00</span>
            )}
            {isHalf && (
              <span className="text-brand-charcoal-muted/30 text-[8px] absolute -top-1.5 left-1 bg-brand-card px-0.5 group-hover:text-brand-gold/60 transition-colors">{String(h).padStart(2, '0')}:30</span>
            )}
          </div>
        );
      })}
      <div className="absolute inset-0 pointer-events-none">
        {dayBookings.map(booking => (
          <AppointmentBlock key={booking.id} booking={booking} services={services} />
        ))}
      </div>
    </div>
  );
}

function PastelCalendar({ bookings, services, vacationDates, onToggleVacation, onSlotClick }: {
  bookings: Booking[];
  services: Service[];
  vacationDates: Set<string>;
  onToggleVacation: (d: string) => void;
  onSlotClick: (date: string, time: string) => void;
}) {
  const [calView, setCalView] = useState<'day' | 'week' | 'month'>('day');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectMode, setSelectMode] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedDateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

  const monthName = new Date(calYear, calMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const firstDay = new Date(calYear, calMonth, 1).getDay() || 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const weekDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const getWeekDates = (): string[] => {
    const baseDate = new Date(calYear, calMonth, selectedDay);
    const dayOfWeek = baseDate.getDay() || 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - dayOfWeek + 1);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const getBookingsForDate = (dateStr: string) => bookings.filter(b => b.date === dateStr);

  const isVacation = (dateStr: string) => vacationDates.has(dateStr);

  const handleDayClick = (day: number) => {
    if (selectMode) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      onToggleVacation(dateStr);
    } else {
      setSelectedDay(day);
      setCalView('day');
    }
  };

  const navigate = (dir: -1 | 1) => {
    if (calView === 'month') {
      if (dir === -1) {
        if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
        else setCalMonth(calMonth - 1);
      } else {
        if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
        else setCalMonth(calMonth + 1);
      }
    } else if (calView === 'day') {
      const d = new Date(calYear, calMonth, selectedDay);
      d.setDate(d.getDate() + dir);
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
      setSelectedDay(d.getDate());
    } else {
      const d = new Date(calYear, calMonth, selectedDay);
      d.setDate(d.getDate() + dir * 7);
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
      setSelectedDay(d.getDate());
    }
  };

  const headerLabel = calView === 'month' ? monthName
    : calView === 'day' ? new Date(calYear, calMonth, selectedDay).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    : `${weekDates[0].split('-').reverse().join('/')} - ${weekDates[6].split('-').reverse().join('/')}`;

  return (
    <div className="bg-brand-card border border-brand-charcoal/10 rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-serif text-lg text-brand-charcoal capitalize">{headerLabel}</h3>
        <div className="flex items-center gap-2">
          {/* View selector dropdown */}
          <div className="relative">
            <button onClick={() => setViewOpen(!viewOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-charcoal/5 hover:bg-brand-charcoal/10 border border-brand-charcoal/15 text-brand-charcoal-muted text-xs transition-all">
              {calView === 'day' ? 'Vista Diaria' : calView === 'week' ? 'Vista Semanal' : 'Vista Mensual'}
              <ChevronDown className={`w-3 h-3 transition-transform ${viewOpen ? 'rotate-180' : ''}`} />
            </button>
            {viewOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setViewOpen(false)} />
                <div className="absolute right-0 mt-1 w-40 bg-brand-card border border-brand-charcoal/15 rounded-xl shadow-2xl overflow-hidden z-50 animate-scale-in">
                  {([['day', 'Vista Diaria'], ['week', 'Vista Semanal'], ['month', 'Vista Mensual']] as const).map(([key, label]) => (
                    <button key={key} onClick={() => { setCalView(key); setViewOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-brand-charcoal/5 transition-colors ${calView === key ? 'text-brand-gold' : 'text-brand-charcoal-muted'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-brand-charcoal/5 hover:bg-brand-charcoal/10 transition-all">
            <ChevronLeft className="w-4 h-4 text-brand-charcoal-muted" />
          </button>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg bg-brand-charcoal/5 hover:bg-brand-charcoal/10 transition-all">
            <ChevronRight className="w-4 h-4 text-brand-charcoal-muted" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-3 text-xs flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.bg.split(' ')[0]}`} />
              <span className="text-brand-charcoal-muted">{t(cfg.labelKey, 'ES')}</span>
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <span className="text-brand-charcoal-muted">Vacaciones</span>
          </span>
        </div>
        <button onClick={() => setSelectMode(!selectMode)}
          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${selectMode ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-brand-charcoal/5 border-brand-charcoal/10 text-brand-charcoal-muted hover:text-brand-charcoal'}`}>
          <Ban className="w-3 h-3 inline mr-1" /> {selectMode ? 'Modo bloqueo ON' : 'Bloquear fechas'}
        </button>
      </div>

      {/* Month View */}
      {calView === 'month' && (
        <>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDayNames.map((day, i) => (
              <div key={day} className={`text-center text-xs py-2 ${i === 5 ? 'text-yellow-400' : 'text-brand-charcoal-muted/60'}`}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay - 1 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayBookings = getBookingsForDate(dateStr);
              const vacation = isVacation(dateStr);
              const dateObj = new Date(calYear, calMonth, day);
              const isSat = dateObj.getDay() === 6;
              const isToday = dateStr === todayStr;
              return (
                <button key={day} onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded-lg p-1 border text-xs transition-all relative ${vacation ? 'bg-red-500/20 border-red-500/30' : selectMode ? 'border-brand-charcoal/10 hover:border-red-500/30 cursor-pointer' : 'border-brand-charcoal/10 hover:border-brand-gold/30 cursor-pointer'} ${isSat && !vacation ? 'bg-yellow-500/5' : ''} ${isToday ? 'ring-1 ring-brand-gold/40' : ''}`}>
                  <span className={`${isSat ? 'text-yellow-400' : 'text-brand-charcoal-muted'} text-[10px]`}>{day}</span>
                  {dayBookings.length > 0 && !vacation && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {dayBookings.slice(0, 4).map((b) => (
                        <span key={b.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[b.status].bg.split(' ')[0]}`} />
                      ))}
                    </div>
                  )}
                  {dayBookings.length > 4 && <span className="text-[8px] text-brand-charcoal-muted/50">+{dayBookings.length - 4}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Day View */}
      {calView === 'day' && (
        <div className="relative">
          {isVacation(selectedDateStr) ? (
            <div className="py-12 text-center">
              <Ban className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 text-sm">Vacaciones</p>
            </div>
          ) : (
            <TimeGrid date={selectedDateStr} bookings={bookings} services={services} onSlotClick={onSlotClick} />
          )}
          <div className="mt-4 pt-4 border-t border-brand-charcoal/10">
            <p className="text-brand-charcoal-muted text-xs">
              {getBookingsForDate(selectedDateStr).length} reserva(s) · {getBookingsForDate(selectedDateStr).reduce((sum, b) => sum + getBookingDuration(b, services), 0)}min total
            </p>
          </div>
        </div>
      )}

      {/* Week View */}
      {calView === 'week' && (
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-[700px]">
            {weekDates.map((dateStr, dayIdx) => {
              const dayNum = parseInt(dateStr.split('-')[2]);
              const dayName = weekDayNames[dayIdx];
              const isSat = dayIdx === 5;
              const isSun = dayIdx === 6;
              const vacation = isVacation(dateStr);
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr} className="flex-1 min-w-[90px]">
                  <div className={`text-center text-xs py-2 mb-1 rounded-t-lg border-b border-brand-charcoal/10 ${isSat ? 'text-yellow-400' : isSun ? 'text-brand-charcoal-muted/60' : 'text-brand-charcoal-muted'} ${isToday ? 'bg-brand-gold/10' : ''}`}>
                    <span className="font-medium">{dayName}</span>
                    <span className="block text-[10px] text-brand-charcoal-muted/60">{dayNum}</span>
                  </div>
                  {vacation ? (
                    <div className="py-8 text-center">
                      <Ban className="w-4 h-4 text-red-400/50 mx-auto" />
                    </div>
                  ) : (
                    <div className="relative" style={{ height: `${GRID_SLOTS * SLOT_HEIGHT}px` }}>
                      {Array.from({ length: GRID_SLOTS }, (_, slotIdx) => {
                        const totalMin = START_HOUR * 60 + slotIdx * 15;
                        const h = Math.floor(totalMin / 60);
                        const m = totalMin % 60;
                        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        const isHour = m === 0;
                        const isHalf = m === 30;
                        return (
                          <div
                            key={slotIdx}
                            onClick={() => onSlotClick(dateStr, timeStr)}
                            className={`absolute left-0 right-0 hover:bg-brand-gold/5 cursor-pointer transition-colors group ${isHour ? 'border-t border-brand-charcoal/15' : 'border-t border-brand-charcoal/5'}`}
                            style={{ top: `${slotIdx * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
                          >
                            {isHour && (
                              <span className="text-brand-charcoal-muted/50 text-[9px] absolute -top-2 left-0.5 group-hover:text-brand-gold transition-colors">{String(h).padStart(2, '0')}:00</span>
                            )}
                          </div>
                        );
                      })}
                      <div className="absolute inset-0 pointer-events-none">
                        {bookings.filter(b => b.date === dateStr && b.status !== 'cancelled').map(booking => (
                          <AppointmentBlock key={booking.id} booking={booking} services={services} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-brand-charcoal/10">
        <p className="text-brand-charcoal-muted text-xs">
          {calView === 'month' ? `Reservas del mes: ${bookings.filter(b => {
            const bd = new Date(b.date + 'T00:00:00');
            return bd.getMonth() === calMonth && bd.getFullYear() === calYear;
          }).length}` : `${getBookingsForDate(selectedDateStr).length} reserva(s) para esta fecha`}
        </p>
      </div>
    </div>
  );
}

export default App;
