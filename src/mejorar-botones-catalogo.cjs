// Reparación quirúrgica: mejora contraste de botones del editor de servicios.
// Se aplica sobre el archivo REAL de Bolt. No toca otros componentes ni datos.
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(process.cwd(), 'src', 'AdminPanelView.tsx');
if (!fs.existsSync(file)) { console.error('No existe src/AdminPanelView.tsx. Ejecuta desde la raíz del proyecto Bolt.'); process.exit(1); }
const original = fs.readFileSync(file, 'utf8');
const oldStyle = "style={{ background: catalogEditorTab === tab ? '#8F6D24' : '#3E342C', color: catalogEditorTab === tab ? '#2C2521' : '#8F6D24', padding: '10px', border: '1px solid #C5A059', borderRadius: '6px', cursor: 'pointer' }}";
const newStyle = "style={{ background: catalogEditorTab === tab ? '#D7AE69' : '#29231F', color: catalogEditorTab === tab ? '#211A15' : '#F1D7A5', padding: '11px 18px', minHeight: '46px', fontSize: '15px', fontWeight: 700, border: catalogEditorTab === tab ? '2px solid #F4D79A' : '2px solid #CBA765', borderRadius: '8px', boxShadow: catalogEditorTab === tab ? '0 2px 9px rgba(0,0,0,0.28)' : 'none', cursor: 'pointer', transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease' }}";
const anchor = "                .studio-editor-toolbar { position: sticky; top: -20px; z-index: 4; background: #322A25; border-bottom: 1px solid rgba(212, 175, 55, 0.35); padding: 15px 0; }";
const css = `
                /* Visibilidad de controles del editor de servicios */
                .studio-service-editor .studio-editor-toolbar nav[aria-label="Apartados del servicio"] button:hover { background: #55402A !important; color: #FFF4DD !important; border-color: #FFE0A0 !important; }
                .studio-service-editor .studio-editor-toolbar nav[aria-label="Apartados del servicio"] button[aria-pressed="true"]:hover { background: #E5BD79 !important; color: #211A15 !important; }
                .studio-service-editor .studio-editor-toolbar button:focus-visible { outline: 3px solid #FFE0A0; outline-offset: 3px; }
                .studio-service-editor .studio-editor-toolbar > div:nth-of-type(2) > button:not(.studio-catalog-save) { background: #29231F; color: #F2D8A7; border: 2px solid #CAA25E; padding: 10px 16px; min-height: 44px; border-radius: 8px; font-weight: 650; cursor: pointer; }
                .studio-service-editor .studio-editor-toolbar > div:nth-of-type(2) > button:not(.studio-catalog-save):hover { background: #4A3829; color: #FFF1D0; }
                .studio-service-editor .studio-editor-toolbar .studio-catalog-save { min-height: 44px; border-radius: 8px; padding: 10px 16px !important; font-size: 14px; font-weight: 700; }
                .studio-service-editor .studio-editor-toolbar .studio-catalog-save:disabled { background: #463C31 !important; color: #CCBC9E !important; border: 1px solid #726047 !important; opacity: 1 !important; cursor: not-allowed; }
`;
if (original.includes('Visibilidad de controles del editor de servicios')) { console.log('Mejora ya aplicada. No hay nada más que hacer.'); process.exit(0); }
if (!original.includes(oldStyle) || !original.includes(anchor)) { console.error('La estructura ha cambiado. No se ha modificado nada.'); process.exit(1); }
let updated=original.replace(oldStyle,newStyle).replace(anchor,anchor+css);
const backup=file+'.backup-botones';
fs.copyFileSync(file,backup);
fs.writeFileSync(file,updated);
console.log('LISTO: botones Datos, Opciones y Reserva más visibles. Guardada copia en '+backup);
