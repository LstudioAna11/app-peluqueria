import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, Home, Scissors, CalendarDays, User, LogOut, BookOpen, ArrowRight, ArrowLeft, UserRoundSearch, Sparkles, Info, ChevronLeft, ChevronRight, ChevronDown, ImagePlus, Trash2, Globe, MapPin, MessageCircle, Clock3, Instagram, Facebook, Music2 } from 'lucide-react';
import * as studioApi from './studioApi';
import OfficialHolidaysView from './OfficialHolidaysView';
import PromotionsView from './PromotionsView';
import type { StudioEmployee, BusinessConfig, ServiceVariant, Appointment, StylingPolicy, FinishKind, ServiceTranslation, SubService, CatalogCategory, ClientRecord, LostDemandRecord, FeedbackRecord, HolidayBlock } from './App';
const LazyOpportunitiesView=React.lazy(()=>import('./OpportunitiesView'));

const LazyCrmView=React.lazy(()=>import('./CrmView'));


interface Props {
 onLogout: () => void;
 onPromotionsSaved?: () => Promise<unknown>;
 bookingName: (sub: SubService) => string;
 appointmentServiceNames: (appointment: Appointment) => string;
 compactVisitText: (text: string) => string;
  agendaExpanded: boolean;
  adminTab: "agenda" | "clients" | "catalog" | "config" | "detractors" | "crm" | "demands" | "holidays";
  headerLogoSrc: string;
  bizConfig: BusinessConfig;
  fallbackHeaderLogo: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  t: (key: string) => string;
  setCurrentScreen: React.Dispatch<React.SetStateAction<"clientPin" | "clientRegistration" | "clientPortal" | "myAppointmentsPage" | "catalogBooking" | "categoryScreen" | "serviceDetail" | "visualAgenda" | "clientHistoryPage" | "adminLogin" | "adminPanel">>;
  setAdminTab: React.Dispatch<React.SetStateAction<"agenda" | "clients" | "catalog" | "config" | "detractors" | "crm" | "demands" | "holidays">>;
  renderAgendaLinks: () => JSX.Element;
  feedbackList: FeedbackRecord[];
  activeEmployees: StudioEmployee[];
  agendaLayoutRef: React.MutableRefObject<HTMLDivElement | null>;
  AGENDA_SWATCHES: readonly [{ readonly id: "champagne"; readonly label: "Champán"; readonly panel: "#322A25"; readonly soft: "#3E342C"; readonly border: "#3A312A"; }, { readonly id: "sage"; readonly label: "Salvia"; readonly panel: "#C2CDBD"; readonly soft: "#D6DECE"; readonly border: "#9DAD93"; }, { readonly id: "terracotta"; readonly label: "Terracota"; readonly panel: "#D9A98A"; readonly soft: "#E8C4A8"; readonly border: "#C08B65"; }, { readonly id: "blush"; readonly label: "Rosa tostado"; readonly panel: "#DCB4A4"; readonly soft: "#EBCFC3"; readonly border: "#C69785"; }, { readonly id: "stone"; readonly label: "Piedra"; readonly panel: "#CFC8BC"; readonly soft: "#E0DAD0"; readonly border: "#B0A899"; }];
  agendaSwatch: "champagne" | "sage" | "terracotta" | "blush" | "stone";
  setAgendaSwatch: React.Dispatch<React.SetStateAction<"champagne" | "sage" | "terracotta" | "blush" | "stone">>;
  setAgendaExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setFechaSeleccionada: React.Dispatch<React.SetStateAction<Date>>;
  agendaViewMode: "day" | "week";
  setAgendaViewMode: React.Dispatch<React.SetStateAction<"day" | "week">>;
  isDateBlockedByHoliday: (dateKey: string) => boolean;
  formatDateKey: (d: Date) => string;
  fechaSeleccionada: Date;
  hoursList: string[];
  isTimeSlotOccupied: (dateKey: string, timeStr: string) => boolean;
  handleCellClick: (targetDate: Date, dayName: string, time: string) => void;
  diaSeleccionadoObj: { name: string; dateObj: Date; dateFormatted: string; };
  appointments: Appointment[];
  isActiveAppointment: (appointment: Appointment) => boolean;
  setAgendaSidePanel: React.Dispatch<React.SetStateAction<"day" | "pending" | null>>;
  setPendingPanelFilter: React.Dispatch<React.SetStateAction<"all" | "approval" | "payment">>;
  appointmentSearch: string;
  setAppointmentSearch: React.Dispatch<React.SetStateAction<string>>;
  appointmentSearchQuery: string;
  appointmentSearchResults: Appointment[];
  setViewApptModal: React.Dispatch<React.SetStateAction<Appointment | null>>;
  setMesNavegacion: React.Dispatch<React.SetStateAction<Date>>;
  semanaActual: { name: string; dateObj: Date; dateFormatted: string; }[];
  renderDurationAgenda: (days: { name: string; dateObj: Date; dateFormatted: string; }[]) => JSX.Element;
  cambiarMesMiniCal: (delta: number) => void;
  nombresMeses: string[];
  mesMini: number;
  anioMini: number;
  diasRejillaMini: (Date | null)[];
  googleCalendarSyncActive: boolean;
  setGoogleCalendarSyncActive: React.Dispatch<React.SetStateAction<boolean>>;
  googleCalendarConnected: boolean;
  setGoogleCalendarConnected: React.Dispatch<React.SetStateAction<boolean>>;
  enableOutOfHours: boolean;
  setEnableOutOfHours: React.Dispatch<React.SetStateAction<boolean>>;
  enableDoubleBooking: boolean;
  setEnableDoubleBooking: React.Dispatch<React.SetStateAction<boolean>>;
  setConfigSubTab: React.Dispatch<React.SetStateAction<"marca" | "precios" | "empleados" | "schedule" | "reservas" | "avisos" | "backup" | "general" | "anticipada">>;
  configSubTab: "marca" | "precios" | "empleados" | "schedule" | "reservas" | "avisos" | "backup" | "general" | "anticipada";
  saveState: "idle" | "saving" | "saved" | "error";
  configHasPendingChanges: boolean;
  handleSaveSection: (sectionName: string) => Promise<void>;
  saveErrorMsg: string | null;
  savedMsg: string | null;
  tempConfig: BusinessConfig;
  setTempConfig: React.Dispatch<React.SetStateAction<BusinessConfig>>;
  employeePhotoBusy: string | null;
  uploadEmployeePhoto: (id: string, file?: File) => Promise<void>;
  updateEmployee: (id: string, patch: Partial<StudioEmployee>) => void;
  catalog: CatalogCategory[];
  emailConfigStatus: studioApi.EmailConfigStatus | null;
  whatsappConfigStatus: studioApi.WhatsAppConfigStatus | null;
  DEFAULT_BRAND_LOGO: "/studio-brand-default.webp";
  DEFAULT_HEADER_LOGO: "/studio-header-default.webp";
  logoUploadBusy: "brandLogoUrl" | "headerLogoUrl" | null;
  uploadStudioLogo: (key: "brandLogoUrl" | "headerLogoUrl", file: File) => Promise<void>;
  setLogoUploadMessage: React.Dispatch<React.SetStateAction<string>>;
  logoUploadMessage: string;
  setIsAddingCategory: React.Dispatch<React.SetStateAction<boolean>>;
  catalogHasChanges: boolean;
  handleSaveCatalogMaster: () => Promise<void>;
  adminCatalogSearch: string;
  setAdminCatalogSearch: React.Dispatch<React.SetStateAction<string>>;
  normalizeCatalogSearch: (value: string) => string;
  adminCatalogStatus: "active" | "inactive" | "all";
  setAdminCatalogStatus: React.Dispatch<React.SetStateAction<"active" | "inactive" | "all">>;
  catalogSavedMsg: string | null;
  isAddingCategory: boolean;
  handleAddCategorySubmit: (e: React.FormEvent) => void;
  newCatCode: string;
  setNewCatCode: React.Dispatch<React.SetStateAction<string>>;
  newCatTitle: string;
  setNewCatTitle: React.Dispatch<React.SetStateAction<string>>;
  expandedCategories: { [key: string]: boolean; };
  setExpandedCategories: React.Dispatch<React.SetStateAction<{ [key: string]: boolean; }>>;
  translationLanguagePicker: () => JSX.Element;
  catalogTranslationLang: string;
  setCatalog: React.Dispatch<React.SetStateAction<CatalogCategory[]>>;
  photoUploadBusy: boolean;
  handleCategoryPhotoSelect: (catId: string, file: File | undefined) => Promise<void>;
  handleCategoryPhotoDelete: (catId: string) => Promise<void>;
  handleUpdateCategoryCode: (catId: string, newCode: string) => void;
  handleUpdateCategoryTitle: (catId: string, newTitle: string) => void;
  handleMoveCategory: (index: number, direction: number) => void;
  handleDeleteCategory: (catId: string) => void;
  setPreviewServiceId: React.Dispatch<React.SetStateAction<string | null>>;
  setPreviewVariantId: React.Dispatch<React.SetStateAction<string>>;
  catalogEditorId: string | null;
  setCatalogEditorId: React.Dispatch<React.SetStateAction<string | null>>;
  setCatalogEditorTab: React.Dispatch<React.SetStateAction<"data" | "options" | "booking" | "languages">>;
  catalogEditorTab: "data" | "options" | "booking" | "languages";
  setCatalogTranslationLang: React.Dispatch<React.SetStateAction<string>>;
  TRANSLATIONS: Record<string, Record<string, string>>;
  updateServiceTranslation: (categoryId: string, serviceId: string, field: keyof ServiceTranslation, value: string) => void;
  setSelectedServicesToBook: React.Dispatch<React.SetStateAction<{ sub: SubService; variant: ServiceVariant | null; }[]>>;
  setModalServices: React.Dispatch<React.SetStateAction<{ categoryId: string; categoryName: string; sub: SubService; variant: ServiceVariant | null; }[]>>;
  handleToggleVariants: (catId: string, subId: string) => void;
  handleDeleteSubservice: (catId: string, subId: string) => void;
  handleDeleteVariant: (catId: string, subId: string, varId: string) => void;
  handleAddVariant: (catId: string, subId: string, e: React.FormEvent) => void;
  newVariantName: string;
  setNewVariantName: React.Dispatch<React.SetStateAction<string>>;
  newVariantPrice: string;
  setNewVariantPrice: React.Dispatch<React.SetStateAction<string>>;
  newVariantDuration: string;
  setNewVariantDuration: React.Dispatch<React.SetStateAction<string>>;
  FINISH_COPY: Record<StylingPolicy, string>;
  isFinish: (sub: SubService, kind: FinishKind) => boolean;
  handleServicePhotoSelect: (categoryId: string, subId: string, file: File | undefined) => Promise<void>;
  handleServicePhotoDelete: (categoryId: string, subId: string) => Promise<void>;
  updateSubserviceField: (categoryId: string, subId: string, patch: Partial<SubService>) => void;
  isAddingSub: string | null;
  handleAddSubserviceSubmit: (catId: string, e: React.FormEvent) => void;
  newSubName: string;
  setNewSubName: React.Dispatch<React.SetStateAction<string>>;
  newSubDesc: string;
  setNewSubDesc: React.Dispatch<React.SetStateAction<string>>;
  newSubDur: string;
  setNewSubDur: React.Dispatch<React.SetStateAction<string>>;
  newSubPriceType: "desde" | "aprox" | "fijo" | "consultar";
  setNewSubPriceType: React.Dispatch<React.SetStateAction<"desde" | "aprox" | "fijo" | "consultar">>;
  newSubPrice: string;
  setNewSubPrice: React.Dispatch<React.SetStateAction<string>>;
  newSubIncludes: string;
  setNewSubIncludes: React.Dispatch<React.SetStateAction<string>>;
  newSubAchieved: string;
  setNewSubAchieved: React.Dispatch<React.SetStateAction<string>>;
  newSubAlertBadge: boolean;
  setNewSubAlertBadge: React.Dispatch<React.SetStateAction<boolean>>;
  newSubAlertText: string;
  setNewSubAlertText: React.Dispatch<React.SetStateAction<string>>;
  setIsAddingSub: React.Dispatch<React.SetStateAction<string | null>>;
  returnToAppointmentId: string | null;
  setReturnToAppointmentId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsAddingClient: React.Dispatch<React.SetStateAction<boolean>>;
  isAddingClient: boolean;
  handleGuardarNuevoCliente: (e: React.FormEvent) => void;
  novoNombre: string;
  setNovoNombre: React.Dispatch<React.SetStateAction<string>>;
  novoApellidos: string;
  setNovoApellidos: React.Dispatch<React.SetStateAction<string>>;
  novoNacimiento: string;
  setNovoNacimiento: React.Dispatch<React.SetStateAction<string>>;
  novoTelefono: string;
  setNovoTelefono: React.Dispatch<React.SetStateAction<string>>;
  novoEmail: string;
  setNovoEmail: React.Dispatch<React.SetStateAction<string>>;
  novoPin: string;
  setNovoPin: React.Dispatch<React.SetStateAction<string>>;
  novoDiagnostico: string;
  setNovoDiagnostico: React.Dispatch<React.SetStateAction<string>>;
  busquedaCliente: string;
  setBusquedaCliente: React.Dispatch<React.SetStateAction<string>>;
  clientStatusFilter: "active" | "all" | "archived";
  setClientStatusFilter: React.Dispatch<React.SetStateAction<"active" | "all" | "archived">>;
  filteredClientRows: ClientRecord[];
  clientStatusError: string;
  visibleClientRows: ClientRecord[];
  editingClientId: number | null;
  expandedClientId: number | null;
  setExpandedClientId: React.Dispatch<React.SetStateAction<number | null>>;
  setEditingClientId: React.Dispatch<React.SetStateAction<number | null>>;
  setEditAdminUltimaVisita: React.Dispatch<React.SetStateAction<string>>;
  setEditAdminProxima: React.Dispatch<React.SetStateAction<string>>;
  setEditAdminFormulas: React.Dispatch<React.SetStateAction<string>>;
  setEditAdminDniCapilar: React.Dispatch<React.SetStateAction<string>>;
  setEditAdminPrescripcionCasa: React.Dispatch<React.SetStateAction<string>>;
  setClientDetailsDraft: React.Dispatch<React.SetStateAction<ClientRecord | null>>;
  openPassportEditor: (client: ClientRecord) => void;
  clientStatusBusy: number | null;
  handleClientStatus: (client: ClientRecord) => Promise<void>;
  editAdminUltimaVisita: string;
  editAdminProxima: string;
  editAdminDniCapilar: string;
  editAdminPrescripcionCasa: string;
  editAdminFormulas: string;
  handleGuardarEdicionAdminCliente: (idNum: number) => void;
  effectiveClientsPage: number;
  setClientsPage: React.Dispatch<React.SetStateAction<number>>;
  clientsPageCount: number;
  mailboxFilter: "pending" | "all" | "resolved";
  setMailboxFilter: React.Dispatch<React.SetStateAction<"pending" | "all" | "resolved">>;
  mailboxError: string;
  feedbackRatingFilter: "all" | "low" | "high";
  setFeedbackRatingFilter: React.Dispatch<React.SetStateAction<"all" | "low" | "high">>;
  detractorReplies: { [key: string]: string; };
  setDetractorReplies: React.Dispatch<React.SetStateAction<{ [key: string]: string; }>>;
  feedbackStatusBusy: string | null;
  handleFeedbackResolution: (fb: FeedbackRecord) => Promise<void>;
  dashboardStart: string;
  dashboardEnd: string;
  listaClientes: ClientRecord[];
  workingRanges: (date: Date) => { start: number; end: number; }[];
  timeBlocks: { id: string; dateKey: string; time: string; durationMinutes: number; reason: string; }[];
  lostDemandsList: LostDemandRecord[];
  setDashboardStart: React.Dispatch<React.SetStateAction<string>>;
  setDashboardEnd: React.Dispatch<React.SetStateAction<string>>;
  crmView: "resumen" | "clientas" | "servicios" | "informes";
  setCrmView: React.Dispatch<React.SetStateAction<"resumen" | "clientas" | "servicios" | "informes">>;
  trafficEvents: { id: string; type: string; visitor: string; session: string; at: string; source: string; }[];
  crmPeriod: "hoy" | "7d" | "30d" | "personalizado";
  demandStart: string;
  demandEnd: string;
  bookingAttempts: { id: string; email: string; name: string; services: string; date: string; time: string; step: string; updatedAt: string; registered?: boolean; contactedAt?: string; recoveredAt?: string; reachedDate?: boolean; reachedTime?: boolean; }[];
  attemptClock: number;
  normalizeEmail: (value: unknown) => string;
  opportunitySearch: string;
  opportunityStatus: "pending" | "all" | "contacted" | "recovered";
  demandFilter: "all" | "no_slots" | "unfinished" | "contacted" | "recovered";
  opportunityPage: number;
  setLostDemandsList: React.Dispatch<React.SetStateAction<LostDemandRecord[]>>;
  setBookingAttempts: React.Dispatch<React.SetStateAction<{ id: string; email: string; name: string; services: string; date: string; time: string; step: string; updatedAt: string; registered?: boolean; contactedAt?: string; recoveredAt?: string; reachedDate?: boolean; reachedTime?: boolean; }[]>>;
  setCrmPeriod: React.Dispatch<React.SetStateAction<"hoy" | "7d" | "30d" | "personalizado">>;
  setOpportunityPage: React.Dispatch<React.SetStateAction<number>>;
  setDemandStart: React.Dispatch<React.SetStateAction<string>>;
  setDemandEnd: React.Dispatch<React.SetStateAction<string>>;
  setOpportunityStatus: React.Dispatch<React.SetStateAction<"pending" | "all" | "contacted" | "recovered">>;
  setOpportunitySearch: React.Dispatch<React.SetStateAction<string>>;
  setDemandFilter: React.Dispatch<React.SetStateAction<"all" | "no_slots" | "unfinished" | "contacted" | "recovered">>;
  newHolidayStart: string;
  newHolidayEnd: string;
  holidaysList: HolidayBlock[];
  newHolidayReason: string;
  newHolidayType: "festivo" | "vacaciones";
  setHolidaysList: React.Dispatch<React.SetStateAction<HolidayBlock[]>>;
  setNewHolidayStart: React.Dispatch<React.SetStateAction<string>>;
  setNewHolidayEnd: React.Dispatch<React.SetStateAction<string>>;
  setNewHolidayReason: React.Dispatch<React.SetStateAction<string>>;
  setNewHolidayType: React.Dispatch<React.SetStateAction<"festivo" | "vacaciones">>;
}

export default function AdminPanelView(props: Props) {
 const { onLogout, onPromotionsSaved, bookingName, appointmentServiceNames, compactVisitText, AGENDA_SWATCHES, DEFAULT_BRAND_LOGO, DEFAULT_HEADER_LOGO, FINISH_COPY, TRANSLATIONS, activeEmployees, adminCatalogSearch, adminCatalogStatus, adminTab, agendaExpanded, agendaLayoutRef, agendaSwatch, agendaViewMode, anioMini, appointmentSearch, appointmentSearchQuery, appointmentSearchResults, appointments, attemptClock, bizConfig, bookingAttempts, busquedaCliente, cambiarMesMiniCal, catalog, catalogEditorId, catalogEditorTab, catalogHasChanges, catalogSavedMsg, catalogTranslationLang, clientStatusBusy, clientStatusError, clientStatusFilter, clientsPageCount, configHasPendingChanges, configSubTab, crmPeriod, crmView, dashboardEnd, dashboardStart, demandEnd, demandFilter, demandStart, detractorReplies, diaSeleccionadoObj, diasRejillaMini, editAdminDniCapilar, editAdminFormulas, editAdminPrescripcionCasa, editAdminProxima, editAdminUltimaVisita, editingClientId, effectiveClientsPage, emailConfigStatus, employeePhotoBusy, enableDoubleBooking, enableOutOfHours, expandedCategories, expandedClientId, fallbackHeaderLogo, fechaSeleccionada, feedbackList, feedbackRatingFilter, feedbackStatusBusy, filteredClientRows, formatDateKey, googleCalendarConnected, googleCalendarSyncActive, handleAddCategorySubmit, handleAddSubserviceSubmit, handleAddVariant, handleCategoryPhotoDelete, handleCategoryPhotoSelect, handleCellClick, handleClientStatus, handleDeleteCategory, handleDeleteSubservice, handleDeleteVariant, handleFeedbackResolution, handleGuardarEdicionAdminCliente, handleGuardarNuevoCliente, handleMoveCategory, handleSaveCatalogMaster, handleSaveSection, handleServicePhotoDelete, handleServicePhotoSelect, handleToggleVariants, handleUpdateCategoryCode, handleUpdateCategoryTitle, headerLogoSrc, holidaysList, hoursList, isActiveAppointment, isAddingCategory, isAddingClient, isAddingSub, isDateBlockedByHoliday, isFinish, isTimeSlotOccupied, listaClientes, logoUploadBusy, logoUploadMessage, lostDemandsList, mailboxError, mailboxFilter, mesMini, newCatCode, newCatTitle, newHolidayEnd, newHolidayReason, newHolidayStart, newHolidayType, newSubAchieved, newSubAlertBadge, newSubAlertText, newSubDesc, newSubDur, newSubIncludes, newSubName, newSubPrice, newSubPriceType, newVariantDuration, newVariantName, newVariantPrice, nombresMeses, normalizeCatalogSearch, normalizeEmail, novoApellidos, novoDiagnostico, novoEmail, novoNacimiento, novoNombre, novoPin, novoTelefono, openPassportEditor, opportunityPage, opportunitySearch, opportunityStatus, photoUploadBusy, renderAgendaLinks, renderDurationAgenda, returnToAppointmentId, saveErrorMsg, saveState, savedMsg, semanaActual, setAdminCatalogSearch, setAdminCatalogStatus, setAdminTab, setAgendaExpanded, setAgendaSidePanel, setAgendaSwatch, setAgendaViewMode, setAppointmentSearch, setBookingAttempts, setBusquedaCliente, setCatalog, setCatalogEditorId, setCatalogEditorTab, setCatalogTranslationLang, setClientDetailsDraft, setClientStatusFilter, setClientsPage, setConfigSubTab, setCrmPeriod, setCrmView, setCurrentScreen, setDashboardEnd, setDashboardStart, setDemandEnd, setDemandFilter, setDemandStart, setDetractorReplies, setEditAdminDniCapilar, setEditAdminFormulas, setEditAdminPrescripcionCasa, setEditAdminProxima, setEditAdminUltimaVisita, setEditingClientId, setEnableDoubleBooking, setEnableOutOfHours, setExpandedCategories, setExpandedClientId, setFechaSeleccionada, setFeedbackRatingFilter, setGoogleCalendarConnected, setGoogleCalendarSyncActive, setHolidaysList, setIsAddingCategory, setIsAddingClient, setIsAddingSub, setLogoUploadMessage, setLostDemandsList, setMailboxFilter, setMesNavegacion, setModalServices, setNewCatCode, setNewCatTitle, setNewHolidayEnd, setNewHolidayReason, setNewHolidayStart, setNewHolidayType, setNewSubAchieved, setNewSubAlertBadge, setNewSubAlertText, setNewSubDesc, setNewSubDur, setNewSubIncludes, setNewSubName, setNewSubPrice, setNewSubPriceType, setNewVariantDuration, setNewVariantName, setNewVariantPrice, setNovoApellidos, setNovoDiagnostico, setNovoEmail, setNovoNacimiento, setNovoNombre, setNovoPin, setNovoTelefono, setOpportunityPage, setOpportunitySearch, setOpportunityStatus, setPendingPanelFilter, setPreviewServiceId, setPreviewVariantId, setReturnToAppointmentId, setSelectedServicesToBook, setTempConfig, setViewApptModal, t, tempConfig, timeBlocks, trafficEvents, translationLanguagePicker, updateEmployee, updateServiceTranslation, updateSubserviceField, uploadEmployeePhoto, uploadStudioLogo, visibleClientRows, whatsappConfigStatus, workingRanges } = props;
 const [summaryNow, setSummaryNow] = useState(() => new Date());
 useEffect(() => { const timer = window.setInterval(() => setSummaryNow(new Date()), 30000); return () => window.clearInterval(timer); }, []);
 const madridParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(summaryNow);
 const part = (type: string) => madridParts.find(item => item.type === type)?.value || '';
 const todaySummaryKey = `${part('year')}-${part('month')}-${part('day')}`;
 const nowSummaryMinute = Number(part('hour')) * 60 + Number(part('minute'));
 const appointmentMinute = (item: Appointment) => { const [h, m] = item.time.split(':').map(Number); return h * 60 + m; };
 const validSummaryAppointments = appointments.filter(item => isActiveAppointment(item) && item.saturdayApproval?.status !== 'rejected');
 const todaySummary = validSummaryAppointments.filter(item => item.dateKey === todaySummaryKey).slice().sort((a, b) => a.time.localeCompare(b.time));
 const confirmedTodaySummary = todaySummary.filter(item => !item.completedAt && item.saturdayApproval?.status !== 'pending' && item.advancePayment?.status !== 'pending');
 const ongoingSummary = confirmedTodaySummary.find(item => appointmentMinute(item) <= nowSummaryMinute && appointmentMinute(item) + (item.durationMinutes || 45) > nowSummaryMinute);
 const nextSummary = ongoingSummary || confirmedTodaySummary.find(item => appointmentMinute(item) > nowSummaryMinute);
 const approvalSummaryCount = validSummaryAppointments.filter(item => !item.completedAt && item.saturdayApproval?.status === 'pending').length;
 const paymentSummaryCount = validSummaryAppointments.filter(item => !item.completedAt && item.advancePayment?.status === 'pending').length;
 const selectedDayKey = formatDateKey(fechaSeleccionada);
 const mobileDayAppointments = appointments.filter(item => item.dateKey === selectedDayKey)
   .slice().sort((a, b) => a.time.localeCompare(b.time));
 const openMobileBooking = () => {
   if (isDateBlockedByHoliday(selectedDayKey)) { alert('El día seleccionado está bloqueado. Elige otra fecha.'); return; }
   const freeTime = hoursList.find(time => !isTimeSlotOccupied(selectedDayKey, time));
   if (!freeTime) { alert('No hay huecos libres en el día seleccionado.'); return; }
   handleCellClick(fechaSeleccionada, diaSeleccionadoObj.name, freeTime);
 };
 const mobileAppointmentStatus = (item: Appointment) => {
   if (item.lifecycleStatus === 'cancelled') return 'Cancelada';
   if (item.lifecycleStatus === 'no_show') return 'No presentada';
   if (item.saturdayApproval?.status === 'rejected') return 'Solicitud rechazada';
   if (item.completedAt) return 'Realizada';
   if (item.saturdayApproval?.status === 'pending') return 'Pendiente de aprobación';
   if (item.advancePayment?.status === 'pending') return 'Anticipo pendiente';
   return 'Confirmada';
 };
 const renderCompactDaySummary = () => (<section aria-label="Resumen de hoy">
            <p style={{ color: '#E4C687', fontSize: 11, margin: '0 0 7px' }}>Hoy · {summaryNow.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <div className="studio-day-summary">
              <button type="button" onClick={() => { setFechaSeleccionada(new Date(todaySummaryKey + 'T12:00:00')); setAgendaViewMode('day'); setAgendaSidePanel('day'); }}>
                <small>Citas de hoy</small><strong>{todaySummary.length}</strong><small>{todaySummary.filter(item => !!item.completedAt).length} realizadas · Incluye solicitudes pendientes</small>
              </button>
              <button type="button" disabled={!nextSummary} onClick={() => { if (nextSummary) setViewApptModal(nextSummary); }}>
                <small>{ongoingSummary ? 'En horario de cita' : 'Próxima cita confirmada'}</small><strong>{nextSummary?.time || '—'}</strong>
                <small>{nextSummary ? nextSummary.clientName : 'Sin más citas confirmadas hoy'}</small>
                {nextSummary && <small>{appointmentServiceNames(nextSummary)}</small>}
              </button>
              <button type="button" onClick={() => { setPendingPanelFilter('approval'); setAgendaSidePanel('pending'); }}>
                <small>Solicitudes por aceptar</small><strong>{approvalSummaryCount}</strong><small>Todas las fechas · Toca para revisar</small>
              </button>
              <button type="button" onClick={() => { setPendingPanelFilter('payment'); setAgendaSidePanel('pending'); }}>
                <small>Anticipos por comprobar</small><strong>{paymentSummaryCount}</strong><small>Todas las fechas · Toca para revisar</small>
              </button>
            </div>
          </section>);
 const [promotionsOpen, setPromotionsOpen] = useState(false);
 const holidayWriteRef = useRef(false);
 const [holidayWriteBusy, setHolidayWriteBusy] = useState(false);
 return (<div className={`studio-admin-shell ${!promotionsOpen && agendaExpanded && adminTab === 'agenda' ? 'studio-agenda-expanded' : ''}`} style={{ maxWidth: '1680px', width: '100%', backgroundColor: 'transparent', border: 'none', borderRadius: '16px', padding: '25px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            .studio-agenda-toolbar > .studio-agenda-view-switch { display: flex !important; }
            .studio-agenda-toolbar h2 { display: none; }
            .studio-agenda-toolbar button { min-height: 38px; border-color: rgba(234, 220, 199, 0.35) !important; font-size: 12px !important; color: #E4C687 !important; background: #322A25 !important; }
            .studio-agenda-toolbar button[aria-pressed=true] { background: rgba(201, 158, 82, 0.12) !important; color: #FFF8EE !important; border-color: #E4C687 !important; }
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

            .studio-mobile-daily-agenda, .studio-mobile-booking-bar { display: none; }
            @media (max-width: 700px) {
              .studio-agenda-toolbar > .studio-agenda-view-switch,
              .studio-agenda-toolbar > .studio-new-appointment,
              .studio-agenda-toolbar > button[aria-pressed],
              .studio-desktop-agenda-heading, .studio-agenda-scroll,
              .studio-agenda-layout > .studio-calendar-tools { display: none !important; }
              .studio-agenda-layout { padding-bottom: 90px; }
              .studio-mobile-daily-agenda { display: flex; flex-direction: column; gap: 10px; }
              .studio-mobile-hours { border: 1px solid #67543C; border-radius: 10px; overflow: hidden; padding: 5px; background: #221D19; }
              .studio-mobile-hours .studio-agenda-grid { min-width: 0 !important; grid-template-columns: 44px minmax(0, 1fr) !important; }
              .studio-mobile-hours .studio-agenda-slot:not(:disabled) { border: 1px dashed rgba(228,198,135,.2) !important; }
              .studio-mobile-hours .studio-agenda-slot:not(:disabled)::after { content: "+"; color: #E4C687; font-size: 15px; }
              .studio-mobile-day-navigation { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
              .studio-mobile-day-navigation button { min-height: 44px; min-width: 44px; border: 1px solid #67543C; border-radius: 8px; background: #221D19; color: #E4C687; }
              .studio-mobile-appointment { display: flex; width: 100%; gap: 12px; text-align: left; padding: 14px; box-sizing: border-box; border: 1px solid #67543C; border-radius: 12px; background: #221D19; color: #FFF8EE; cursor: pointer; }
              .studio-mobile-appointment:focus-visible { outline: 2px solid #E4C687; outline-offset: 2px; }
              .studio-mobile-appointment small { display: block; color: #D6CBB8; line-height: 1.5; margin-top: 4px; }
              .studio-mobile-booking-bar { display: flex; position: fixed; z-index: 80; left: 0; right: 0; bottom: 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: #221D19; border-top: 1px solid #67543C; }
              .studio-mobile-booking-bar button { width: 100%; min-height: 48px; border: 0; border-radius: 10px; background: linear-gradient(135deg,#E4C687,#B3823B); color: #221D19; font-size: 16px; font-weight: 700; }
            }


            .studio-day-summary { display: grid; grid-template-columns: minmax(0,1fr); gap: 5px; margin-bottom: 12px; }
            .studio-day-summary button { text-align: left; padding: 8px 10px; min-height: 48px; min-width: 0; border: 1px solid #67543C; border-radius: 7px; background: #221D19; color: #FFF8EE; cursor: pointer; overflow-wrap: anywhere; display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; column-gap: 7px; }
            .studio-day-summary button:disabled { opacity: 1; cursor: default; }
            .studio-day-summary button:focus-visible { outline: 2px solid #E4C687; outline-offset: 2px; }
            .studio-day-summary small { display: block; color: #D6CBB8; font-size: 11px; line-height: 1.4; }
            .studio-day-summary strong { color: #E4C687; font-size: 17px; margin: 0; grid-column: 2; grid-row: 1; }
            .studio-day-summary button small:nth-of-type(n+2) { grid-column: 1 / -1; font-size: 10px; }
            .studio-day-summary button:first-child small:nth-of-type(2), .studio-day-summary button:nth-child(n+3) small:nth-of-type(2) { display: none; }
            .studio-mobile-summary { display: none; }
            @media(max-width:700px) {
              .studio-mobile-summary { display: block; padding: 9px 10px; border: 1px solid #67543C; border-radius: 8px; }
              .studio-mobile-summary > summary { color: #E4C687; font-size: 12px; cursor: pointer; min-height: 32px; align-content: center; }
              .studio-mobile-summary[open] > summary { margin-bottom: 10px; }
              .studio-mobile-summary .studio-day-summary { grid-template-columns: repeat(2,minmax(0,1fr)); margin-bottom: 0; }
            }
          `}</style>
          <div className="studio-admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '15px' }}>
            <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}><img src={headerLogoSrc} alt={bizConfig.name} decoding="async" style={{width:160,height:48,objectFit:'contain',mixBlendMode:'screen'}} onError={fallbackHeaderLogo}/><div>
              <h2 style={{ color: '#E4C687', fontSize: '28px', margin: '0 0 3px 0', fontFamily: "'Royal Hefana', 'Cormorant Garamond', 'Playfair Display', Georgia, serif", letterSpacing: '0.05em' }}>{t('adminMasterTitle')}</h2>
              <p style={{ color: '#C9BCA9', fontSize: '12px', letterSpacing: '1px', margin: 0 }}>{bizConfig.name} - {t('adminSubtitle')}</p>
            </div>
            </div>
            <button onClick={onLogout} style={{ background: 'none', border: '1px solid rgba(234, 220, 199, 0.4)', color: '#E4C687', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer' }}>
              {t('logout')}
            </button>
          </div>
          <nav className="studio-mobile-nav" aria-label="Navegación de 360studio" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
              {([['agenda', 'Agenda'], ['clients', 'Clientes'], ['catalog', 'Catálogo']] as const).map(([tab, label]) => <button type="button" key={tab} aria-current={!promotionsOpen && adminTab === tab ? 'page' : undefined} onClick={() => { setPromotionsOpen(false); setAdminTab(tab); }} style={{ minHeight: '48px', padding: '12px 6px', backgroundColor: !promotionsOpen && adminTab === tab ? '#C49A58' : '#3E342C', color: !promotionsOpen && adminTab === tab ? '#29231F' : '#FFF8EE', border: '1px solid rgba(228, 198, 135, 0.45)', borderRadius: '9px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>{label}</button>)}
            </div>
            <button type="button" aria-current={promotionsOpen ? "page" : undefined} onClick={() => { setAgendaExpanded(false); setPromotionsOpen(true); }} style={{minHeight:48,padding:14,borderRadius:9,border:"1px solid #C5A059",background:promotionsOpen ? "#C49A58" : "#322A25",color:promotionsOpen ? "#221D19" : "#FFF8EE",cursor:"pointer"}}>Promociones</button>
            <details style={{ backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '9px', padding: '14px' }}>
              <summary style={{ color: '#E4C687', cursor: 'pointer', fontSize: '14px' }}>Más opciones{!['agenda', 'clients', 'catalog'].includes(adminTab) ? ' · ' + ({ config: 'Configuración', detractors: 'Buzón', crm: 'CRM e informes', demands: 'Oportunidades de cita', holidays: 'Vacaciones y festivos' } as Record<string, string>)[adminTab] : ''}</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginTop: '14px' }}>
                {([['config', 'Configuración'], ['detractors', `Buzón (${feedbackList.filter(f => !f.resolvedAt).length})`], ['crm', 'CRM e informes'], ['demands', 'Oportunidades de cita'], ['holidays', 'Vacaciones y festivos']] as const).map(([tab, label]) => <button type="button" key={tab} aria-current={!promotionsOpen && adminTab === tab ? 'page' : undefined} onClick={() => { setPromotionsOpen(false); setAdminTab(tab); }} style={{ minHeight: '44px', padding: '10px 12px', textAlign: 'left', backgroundColor: !promotionsOpen && adminTab === tab ? '#322A25' : 'transparent', border: '1px solid #C5A059', color: !promotionsOpen && adminTab === tab ? '#F3D994' : '#FFF8EE', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>{label}</button>)}
              </div>
            </details>
          </nav>

          <nav className="studio-desktop-nav" aria-label="Menú lateral de 360studio">
            <p style={{ color: '#C9BCA9', fontSize: '11px', letterSpacing: '2px', padding: '0 12px', margin: '0 0 12px' }}>GESTIÓN DEL STUDIO</p>
            {([['agenda', 'Agenda Maestra'], ['clients', 'Clientes'], ['catalog', 'Catálogo'], ['config', 'Configuración'], ['detractors', `Buzón (${feedbackList.filter(f => !f.resolvedAt).length})`], ['crm', 'CRM e informes'], ['demands', 'Oportunidades de cita'], ['holidays', 'Vacaciones y festivos']] as const).map(([tab, label]) => <React.Fragment key={tab}><button type="button" key={tab} aria-current={!promotionsOpen && adminTab === tab ? 'page' : undefined} onClick={() => { setPromotionsOpen(false); setAdminTab(tab); }} style={{ width: '100%', textAlign: 'left', minHeight: '48px', padding: '14px', backgroundColor: !promotionsOpen && adminTab === tab ? 'rgba(201, 158, 82, 0.16)' : 'transparent', color: !promotionsOpen && adminTab === tab ? '#F3D994' : '#FFF8EE', border: !promotionsOpen && adminTab === tab ? '1px solid rgba(228, 198, 135, 0.45)' : '1px solid transparent', borderRadius: '9px', fontSize: '14px', cursor: 'pointer' }}>{label}</button></React.Fragment>)}
          <button type="button" aria-current={promotionsOpen ? "page" : undefined} onClick={() => { setAgendaExpanded(false); setPromotionsOpen(true); }} style={{minHeight:48,padding:14,borderRadius:9,border:"1px solid #C5A059",background:promotionsOpen ? "#C49A58" : "#322A25",color:promotionsOpen ? "#221D19" : "#FFF8EE",cursor:"pointer"}}>Promociones</button>
          </nav>
          <main className="studio-admin-content">
          {promotionsOpen ? <PromotionsView onSaved={onPromotionsSaved} serviceOptions={catalog.flatMap(cat => cat.subservices.filter(sub => sub.active !== false).map(sub => ({ id: sub.id, label: cat.title + " · " + bookingName(sub) })))} /> : <>
          {activeEmployees.length === 0 && (
            <div style={{ padding: '12px 16px', backgroundColor: '#F2DCD8', border: '1px solid #C0392B', borderRadius: '8px', color: '#8A2F23', fontSize: '13px', lineHeight: 1.6, marginBottom: '4px' }}>
              No hay profesionales configurados. Ve a Configuración → Empleados y añade al menos una persona en activo para que las clientas puedan elegir profesional al reservar.
            </div>
          )}
          {/* TAB 1: AGENDA MAESTRA */}
          {adminTab === 'agenda' && (
            <div ref={agendaLayoutRef} className="studio-agenda-layout" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div className="studio-calendar-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', minWidth: 0, overflowX: 'auto' }}>

                <details className="studio-mobile-summary"><summary>Resumen de hoy · {todaySummary.length} citas · {approvalSummaryCount + paymentSummaryCount} gestiones pendientes</summary>{renderCompactDaySummary()}</details>
                <div className="studio-agenda-toolbar" role="group" aria-label="Controles de agenda">
                  <button type="button" onClick={() => setFechaSeleccionada(new Date())} style={{ padding: '9px 14px', border: '1px solid #C5A059', borderRadius: 8, cursor: 'pointer' }}>Hoy</button>
                  <div className="studio-agenda-view-switch" role="group" aria-label="Vista de agenda" style={{ display: 'flex', gap: 4 }}>
                    {(['day', 'week'] as const).map(view => <button type="button" key={view} aria-pressed={agendaViewMode === view} onClick={() => setAgendaViewMode(view)} style={{ padding: '9px 14px', border: '1px solid rgba(228,198,135,.35)', borderRadius: 8, cursor: 'pointer' }}>{view === 'day' ? 'Día' : 'Semana'}</button>)}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D6CBB8', fontSize: 12 }}>Fecha
                    <input aria-label="Elegir fecha de la agenda" type="date" value={formatDateKey(fechaSeleccionada)} onChange={event => { if (event.target.value) setFechaSeleccionada(new Date(event.target.value + 'T12:00:00')); }} style={{ padding: 8, background: '#221D19', color: '#FFF8EE', border: '1px solid rgba(196,154,88,.4)', borderRadius: 8, minWidth: 140 }} />
                  </label>
                  <button className="studio-new-appointment" type="button" onClick={() => {
                    if (isDateBlockedByHoliday(formatDateKey(fechaSeleccionada))) { alert('El día seleccionado está bloqueado. Elige otra fecha.'); return; }
                    const freeTime = hoursList.find(time => !isTimeSlotOccupied(formatDateKey(fechaSeleccionada), time));
                    if (!freeTime) { alert('No hay huecos libres en el día seleccionado.'); return; }
                    handleCellClick(fechaSeleccionada, diaSeleccionadoObj.name, freeTime);
                  }} style={{ padding: '9px 16px', border: '1px solid #C5A059', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Nueva cita</button>
                  <button type="button" aria-pressed={agendaExpanded} aria-label={agendaExpanded ? 'Volver a vista normal' : 'Ampliar agenda'} title={agendaExpanded ? 'Volver a vista normal' : 'Ampliar agenda'} onClick={() => setAgendaExpanded(previous => !previous)} style={{ display: 'grid', placeItems: 'center', marginInlineStart: 'auto', padding: 9, minWidth: 40, border: '1px solid rgba(196,154,88,.3)', borderRadius: 8, cursor: 'pointer' }}>{agendaExpanded ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}</button>
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
                          <div style={{ color: '#D6CBB8' }}>{appointmentServiceNames(appointment)}</div>
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

<p className="studio-desktop-agenda-heading" style={{ color: '#D6CBB8', fontSize: '12px', margin: 0 }}>Pulsa un hueco libre para agendar · Pulsa una cita para editarla.</p>
                <div className="studio-desktop-agenda-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
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

                <section className="studio-mobile-daily-agenda" aria-label="Agenda diaria móvil">
                  <div className="studio-mobile-day-navigation">
                    <button type="button" aria-label="Día anterior" onClick={() => { const day = new Date(fechaSeleccionada); day.setDate(day.getDate() - 1); setFechaSeleccionada(day); }}>◀</button>
                    <div style={{ textAlign: 'center', minWidth: 0 }}>
                      <strong style={{ color: '#E4C687', textTransform: 'capitalize' }}>{fechaSeleccionada.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
                      <small style={{ display: 'block', color: '#D6CBB8', marginTop: 4 }}>{mobileDayAppointments.length} citas · Horario completo del día</small>
                    </div>
                    <button type="button" aria-label="Día siguiente" onClick={() => { const day = new Date(fechaSeleccionada); day.setDate(day.getDate() + 1); setFechaSeleccionada(day); }}>▶</button>
                  </div>
                  {isDateBlockedByHoliday(selectedDayKey) && <p style={{ color: '#E4C687', fontSize: 13 }}>Día bloqueado para nuevas citas. Puedes consultar las citas registradas.</p>}
                  {!mobileDayAppointments.length && <p style={{ textAlign: 'center', color: '#D6CBB8', padding: '24px 8px' }}>No hay citas en este día. Usa «Agendar cita» para añadir una.</p>}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#D6CBB8', fontSize: 12 }}>
                    <span>□ Hueco libre: toca para agendar</span><span>▣ Cita reservada: toca para abrir</span>
                  </div>
                  <div className="studio-mobile-hours" aria-label="Horas reservadas y disponibles del día">
                    {renderDurationAgenda([diaSeleccionadoObj])}
                  </div>
                  <details><summary style={{ color: '#E4C687', cursor: 'pointer', padding: '12px 0' }}>Ver también el listado de citas ({mobileDayAppointments.length})</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mobileDayAppointments.map(appointment => <button type="button" key={appointment.id} className="studio-mobile-appointment" onClick={() => setViewApptModal(appointment)}>
                    <div style={{ flexShrink: 0, color: '#E4C687', fontSize: 18, fontWeight: 700 }}>{appointment.time}
                      {!!appointment.durationMinutes && <small style={{ fontSize: 11, fontWeight: 400 }}>{appointment.durationMinutes} min</small>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
                      <strong>{appointment.clientName || 'Sin nombre'}</strong>
                      <small>{appointmentServiceNames(appointment) || 'Sin servicio indicado'}</small>
                      {appointment.professionalName && <small>{appointment.professionalName}</small>}
                      <small style={{ color: '#E4C687' }}>{mobileAppointmentStatus(appointment)}</small>
                    </div>
                    <span aria-hidden="true" style={{ alignSelf: 'center', color: '#E4C687' }}>›</span>
                  </button>)}
                  </div></details>
                </section>
                <div className="studio-mobile-booking-bar"><button type="button" onClick={openMobileBooking}>+ Agendar cita</button></div>
                {/* VISTA DINÁMICA DE LA TABLA (SEMANAL vs DIARIA) */}
                <div className="studio-agenda-scroll" style={{ overflowX: 'auto', backgroundColor: '#322A25', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '10px', padding: '15px' }}>
                  {renderDurationAgenda(agendaViewMode === 'week' ? semanaActual : [diaSeleccionadoObj])}
                </div>
              </div>
              <details open className="studio-calendar-tools" style={{ width: '280px', backgroundColor: '#322A25', border: '1px solid #3A312A', borderRadius: '12px', padding: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.22)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <summary>Resumen, calendario y ajustes</summary>
                {renderCompactDaySummary()}
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
                
                
                .studio-service-editor[open] { position: fixed !important; inset: 0 0 0 auto; width: min(920px, 98vw); max-height: 100vh; overflow-y: auto; z-index: 1800; box-sizing: border-box; border: 1px solid #B98A3E !important; border-radius: 0 !important; box-shadow: -20px 0 60px rgba(60, 50, 40, 0.12); padding: 20px !important; background: #322A25 !important; }
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
                .studio-service-names-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 18px; align-items: start; }
                .studio-service-names-grid .studio-base-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: none; margin: 0; }
                .studio-service-names-grid input { min-width: 0 !important; width: 100% !important; flex: none !important; font-weight: 400 !important; }
                .studio-service-basics > div + div { margin-top: 20px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; }
                @media (max-width: 600px) { .studio-service-names-grid { grid-template-columns: 1fr; gap: 16px; } .studio-service-editor[open] { width: 100vw; padding: 16px !important; } }

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
              {adminCatalogSearch.trim() && !catalog.some(cat => normalizeCatalogSearch(cat.title + ' ' + (cat.portalTitle || '')).includes(normalizeCatalogSearch(adminCatalogSearch)) || cat.subservices.some(sub => normalizeCatalogSearch(sub.name + ' ' + bookingName(sub)).includes(normalizeCatalogSearch(adminCatalogSearch)))) && <p style={{ color: '#D6CBB8', fontSize: '14px' }}>No hay servicios que coincidan con esta búsqueda.</p>}
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
                  const categoryMatches = normalizeCatalogSearch(cat.title + ' ' + (cat.portalTitle || '')).includes(query);
                  const matchesStatus = (sub: SubService) => adminCatalogStatus === 'all' || (adminCatalogStatus === 'active' ? sub.active !== false : sub.active === false);
                  if (cat.subservices.length > 0 && !cat.subservices.some(sub => matchesStatus(sub) && (!query || categoryMatches || normalizeCatalogSearch(sub.name + ' ' + bookingName(sub)).includes(query)))) return null;
                  if (query && !categoryMatches && !cat.subservices.some(sub => normalizeCatalogSearch(sub.name + ' ' + bookingName(sub)).includes(query))) return null;
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
                          <label style={{ flex: '1 1 220px', color: '#D6CBB8', fontSize: '13px' }}>Nombre corto de categoría · gestión y citas<input type="text" value={cat.title} onChange={e => handleUpdateCategoryTitle(cat.id, e.target.value)} style={{ display: 'block', width: '100%', padding: '12px', boxSizing: 'border-box', marginTop: '6px', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: '7px', fontSize: '14px' }} /></label>
                          <label style={{ flex: '1 1 100%', color: '#E5D7BF', fontSize: 13 }}>Nombre de categoría para el portal
                            <input type="text" maxLength={160} value={cat.portalTitle ?? ''} placeholder={cat.title}
                              onChange={e => { const value = e.target.value; setCatalog(previous => previous.map(category => category.id === cat.id ? { ...category, portalTitle: value } : category)); }}
                              style={{ display: 'block', width: '100%', padding: 12, boxSizing: 'border-box', marginTop: 6, backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: 7 }} />
                            <small>Texto que ven las clientas. Si lo dejas vacío se usa el nombre corto. Las traducciones configuradas tienen prioridad.</small>
                          </label>
                          <label style={{ flex: '1 1 100%', color: '#E5D7BF', fontSize: 13 }}>Eslogan de la categoría · texto corto<input type="text" maxLength={140} value={cat.slogan || ''} placeholder="Conocemos tu cabello. Diseñamos tu camino." onChange={e => { const value = e.target.value; setCatalog(previous => previous.map(category => category.id === cat.id ? { ...category, slogan: value } : category)); }} style={{ display: 'block', width: '100%', padding: 12, boxSizing: 'border-box', marginTop: 6, backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', borderRadius: 7 }} /><small>Se muestra debajo del título. Máximo 140 caracteres.</small></label>
                          <button type="button" disabled={catIdx === 0} onClick={() => handleMoveCategory(catIdx, -1)} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '12px', borderRadius: '7px', cursor: 'pointer' }}>Subir ↑</button>
                          <button type="button" disabled={catIdx === catalog.length - 1} onClick={() => handleMoveCategory(catIdx, 1)} style={{ background: '#322A25', border: '1px solid #3A312A', color: '#FFF8EE', padding: '12px', borderRadius: '7px', cursor: 'pointer' }}>Bajar ↓</button>
                          <button type="button" onClick={() => handleDeleteCategory(cat.id)} style={{ background: '#322A25', border: '1px solid #74433e', color: '#C0392B', padding: '12px', borderRadius: '7px', cursor: 'pointer' }}>Eliminar categoría</button>
                        </div>
                        <p style={{ color: '#D6CBB8', fontSize: '12px', marginBottom: 0 }}>Después de modificar el nombre, código u orden, pulsa «Guardar catálogo».</p>
                      </details>
                      {isCategoryExpandedAdmin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '15px', borderLeft: '2px solid rgba(212, 175, 55, 0.2)', marginTop: '8px' }}>
                          {cat.subservices.filter(sub => matchesStatus(sub) && (!query || categoryMatches || normalizeCatalogSearch(sub.name + ' ' + bookingName(sub)).includes(query))).map((sub) => {
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
                                    {([{ field: 'name', label: 'Nombre del servicio' }, { field: 'slogan', label: 'Eslogan corto' }, { field: 'description', label: 'Descripción' }, { field: 'includesText', label: 'Qué incluye' }, { field: 'achievedText', label: '¿Qué te llevas?' }, { field: 'forWhomText', label: '¿Es para ti?' }, { field: 'conditionsText', label: 'Condiciones del servicio' }, { field: 'alertText', label: 'Aviso del servicio' }] as { field: keyof ServiceTranslation; label: string }[]).map(({field, label}) => <label key={field} style={{ display: 'block', marginBottom: '14px' }}>{label}<span style={{ display: 'block', color: '#D6CBB8', fontSize: '12px', margin: '6px 0', whiteSpace: 'pre-wrap' }}>Original: {sub[field] || 'Sin contenido'}</span><textarea dir={catalogTranslationLang === 'ar' ? 'rtl' : 'ltr'} lang={catalogTranslationLang} value={sub.translations?.[catalogTranslationLang]?.[field] || ''} onChange={event => updateServiceTranslation(cat.id, sub.id, field, event.target.value)} placeholder="Añade aquí la traducción" style={{ width: '100%' }} /></label>)}

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

                                <div className="studio-editor-data studio-service-basics" style={{ display: 'block' }}>
                                  <div className="studio-service-names-grid">
                                    <label className="studio-base-field">Título creativo del portal<input type="text" value={sub.name} onChange={(e) => {
                                      const updatedName = e.target.value;
                                      setCatalog(catalog.map(c => c.id === cat.id ? { ...c, subservices: c.subservices.map(s => s.id === sub.id ? { ...s, name: updatedName } : s) } : c));
                                    }} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', flex: 1 }} /></label>
                                    <label className="studio-base-field">Nombre corto en citas<input type="text" maxLength={100} value={sub.bookingName ?? bookingName(sub)} placeholder="Styling & Peinados" onChange={event => updateSubserviceField(cat.id, sub.id, { bookingName: event.target.value })} style={{ backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: '4px 8px', borderRadius: 4, fontSize: 12, minWidth: 160 }} /><small style={{display:'block',color:'#D6CBB8',fontSize:11,marginTop:5}}>Se usa en las citas, agenda, resumen de reserva y cita rápida. El título creativo se conserva en el catálogo del portal.</small></label>
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
                                    <div className="studio-editor-data" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      <label style={{ color: '#E4C687', fontSize: 12 }}>Condiciones del servicio
                                        <textarea value={sub.conditionsText || ''} onChange={e => { const value = e.target.value; setCatalog(previous => previous.map(category => category.id === cat.id ? { ...category, subservices: category.subservices.map(service => service.id === sub.id ? { ...service, conditionsText: value } : service) } : category)); }} rows={3} placeholder="Ej. Incluye lavado profesional. El peinado se reserva aparte." style={{ display: 'block', width: '100%', boxSizing: 'border-box', backgroundColor: '#322A25', border: '1px solid #C5A059', color: '#FFF8EE', padding: 10, borderRadius: 5, marginTop: 6 }} />
                                      </label>
                                    </div>
                                    <div style={{marginTop:14}}>
                                      <strong style={{color:'#E4C687',fontSize:13}}>Cortes para añadir desde esta ficha</strong>
                                      <p style={{fontSize:12}}>Marca los servicios de corte compatibles. Peinado y matiz utilizan sus opciones compatibles ya configuradas.</p>
                                      <div style={{maxHeight:180,overflowY:'auto'}}>
                                        {catalog.flatMap(category=>category.subservices).filter(candidate=>candidate.id!==sub.id&&candidate.active!==false).map(candidate=><label key={candidate.id} style={{display:'block',padding:6,fontSize:13}}>
                                          <input type="checkbox" checked={(sub.cutAllowedIds||[]).includes(candidate.id)} onChange={event=>{const checked=event.target.checked;setCatalog(previous=>previous.map(category=>category.id!==cat.id?category:{...category,subservices:category.subservices.map(service=>service.id!==sub.id?service:{...service,cutAllowedIds:checked?Array.from(new Set([...(service.cutAllowedIds||[]),candidate.id])):(service.cutAllowedIds||[]).filter(id=>id!==candidate.id)})}));}} /> {candidate.bookingName||candidate.name}
                                        </label>)}
                                      </div>
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

          {adminTab === 'crm' && <React.Suspense fallback={<p role="status" style={{padding:24,color:'#E4C687'}}>Cargando el CRM…</p>}><LazyCrmView appointments={appointments} bizConfig={bizConfig} crmView={crmView} dashboardEnd={dashboardEnd} dashboardStart={dashboardStart} formatDateKey={formatDateKey} isActiveAppointment={isActiveAppointment} isDateBlockedByHoliday={isDateBlockedByHoliday} listaClientes={listaClientes} lostDemandsList={lostDemandsList} setAdminTab={setAdminTab} setAgendaSidePanel={setAgendaSidePanel} setClientStatusFilter={setClientStatusFilter} setCrmView={setCrmView} setDashboardEnd={setDashboardEnd} setDashboardStart={setDashboardStart} setPendingPanelFilter={setPendingPanelFilter} timeBlocks={timeBlocks} trafficEvents={trafficEvents} workingRanges={workingRanges} /></React.Suspense>}

          {adminTab === 'demands' && <React.Suspense fallback={<p role="status" style={{padding:24,color:'#E4C687'}}>Cargando las oportunidades…</p>}><LazyOpportunitiesView attemptClock={attemptClock} bizConfig={bizConfig} bookingAttempts={bookingAttempts} crmPeriod={crmPeriod} demandEnd={demandEnd} demandFilter={demandFilter} demandStart={demandStart} formatDateKey={formatDateKey} listaClientes={listaClientes} lostDemandsList={lostDemandsList} normalizeEmail={normalizeEmail} opportunityPage={opportunityPage} opportunitySearch={opportunitySearch} opportunityStatus={opportunityStatus} setAdminTab={setAdminTab} setBookingAttempts={setBookingAttempts} setBusquedaCliente={setBusquedaCliente} setClientStatusFilter={setClientStatusFilter} setCrmPeriod={setCrmPeriod} setDemandEnd={setDemandEnd} setDemandFilter={setDemandFilter} setDemandStart={setDemandStart} setLostDemandsList={setLostDemandsList} setOpportunityPage={setOpportunityPage} setOpportunitySearch={setOpportunitySearch} setOpportunityStatus={setOpportunityStatus} /></React.Suspense>}

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
                <p style={{ color: '#D6CBB8', fontSize: '11px', margin: 0 }}>Festivos oficiales y cierres guardados en el servidor. Las reservas existentes se conservan.</p>
              </div>
              <OfficialHolidaysView onChanged={onPromotionsSaved} appointments={appointments} />
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: '#322A25', border: '1px solid #454634', borderRadius: '10px', padding: '14px', color: '#D6CBB8', fontSize: '12px' }}><span>Agenda y portal · Cierres compartidos en Supabase</span><button type="button" onClick={() => setAdminTab('agenda')} style={{ marginLeft: 'auto', cursor: 'pointer', color: '#E4C687', background: 'none', border: '1px solid #C5A059', borderRadius: '7px', padding: '9px 12px' }}>Ver agenda →</button></div>
              {newHolidayStart && newHolidayEnd && newHolidayEnd >= newHolidayStart && appointments.some(item => isActiveAppointment(item) && item.dateKey >= newHolidayStart && item.dateKey <= newHolidayEnd) && <div style={{ color: '#E4C687', fontSize: '13px', padding: '14px', borderLeft: '2px solid #b69b60' }}>Hay {appointments.filter(item => isActiveAppointment(item) && item.dateKey >= newHolidayStart && item.dateKey <= newHolidayEnd).length} citas en estas fechas. Guardar el cierre no las cancela.</div>}
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (holidayWriteRef.current) return;
                if (!newHolidayStart || !newHolidayEnd) {
                  alert('Por favor, indica fecha de inicio y fin.');
                  return;
                }
                if (newHolidayEnd < newHolidayStart) { alert('La fecha final debe ser igual o posterior a la inicial.'); return; }
                if (holidaysList.some(block => !block.id.startsWith('auto-') && newHolidayStart <= block.endDate && newHolidayEnd >= block.startDate)) { alert('Ya existe un cierre en estas fechas. Revisa los periodos guardados.'); return; }
                const affected = appointments.filter(item => isActiveAppointment(item) && item.dateKey >= newHolidayStart && item.dateKey <= newHolidayEnd);
                if (affected.length && !window.confirm(`Hay ${affected.length} citas en este periodo. Se conservarán y tendrás que revisarlas. ¿Guardar el cierre?`)) return;
                const newBlock: HolidayBlock = {
                  id: Date.now().toString(),
                  startDate: newHolidayStart,
                  endDate: newHolidayEnd,
                  reason: newHolidayReason.trim() || (newHolidayType === 'vacaciones' ? 'Vacaciones' : 'Festivo'),
                  type: newHolidayType
                };
                holidayWriteRef.current = true; setHolidayWriteBusy(true);
                try {
                  const token = studioApi.currentToken();
                  if (!token || studioApi.storedRole() !== 'admin') throw new Error('Vuelve a iniciar sesión en la intranet.');
                  const result = await studioApi.createClosure(token, { ...newBlock });
                  if (!result.ok || !result.id) throw new Error('No se ha confirmado el guardado del cierre.');
                  setHolidaysList(previous => [...previous, { ...newBlock, id: result.id }]);
                setNewHolidayStart("");
                setNewHolidayEnd("");
                setNewHolidayReason("");
                alert('¡Periodo bloqueado correctamente y sincronizado con la agenda!');
                } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo guardar el cierre.'); }
                finally { holidayWriteRef.current = false; setHolidayWriteBusy(false); }
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
                  <button type="submit" disabled={holidayWriteBusy} style={{ background: 'linear-gradient(135deg, #8F6D24 0%, #B3823B 100%)', color: '#29231F', border: 'none', padding: '10px 18px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
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
                  holidaysList.filter(item => !item.id.startsWith('auto-')).sort((a,b) => a.startDate.localeCompare(b.startDate)).map((h) => (
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
                      <button disabled={holidayWriteBusy} onClick={async () => {
                        if (holidayWriteRef.current || !window.confirm('¿Eliminar este cierre manual? Otros festivos o cierres seguirán aplicándose.')) return;
                        holidayWriteRef.current = true; setHolidayWriteBusy(true);
                        try {
                          const token = studioApi.currentToken();
                          if (!token || studioApi.storedRole() !== 'admin') throw new Error('Vuelve a iniciar sesión.');
                          await studioApi.deleteClosure(token, h.id);
                          setHolidaysList(previous => previous.filter(item => item.id !== h.id));
                        } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo eliminar.'); }
                        finally { holidayWriteRef.current = false; setHolidayWriteBusy(false); }
                      }} style={{ backgroundColor: '#F2DCD8', border: '1px solid #8A2F23', color: '#C0392B', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Quitar cierre
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          </>}
          </main>
        </div>);
}
