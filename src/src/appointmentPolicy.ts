export const CANCELLATION_HOURS = 24;
export const CANCELLATION_NOTICE = 'Para cambiar o cancelar tu cita con menos de 24 horas de antelación, contacta directamente con L’Studio Ana.';
// The existing database stores appointment wall-clock values as ISO UTC text.
export function appointmentPolicyInstant(wallIso: string): number {
  const target=Date.parse(wallIso.slice(0,19)+'Z');
  if(!Number.isFinite(target))return NaN;
  let guess=target;
  for(let i=0;i<4;i++){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess));
    const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    const represented=Date.parse(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`);
    const adjustment=target-represented;if(!adjustment)return guess;guess+=adjustment;
  }
  return NaN;
}
export function canChangePortalAppointment(appointment:{dateKey:string;time:string},now=Date.now()):boolean {
  const start=appointmentPolicyInstant(`${appointment.dateKey}T${appointment.time}:00`);
  return Number.isFinite(start)&&start-now>=CANCELLATION_HOURS*3600000;
}
