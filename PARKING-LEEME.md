# Parking de cortesía · L’Studio Ana

## Instalar en Bolt
1. Sube `instalar-parking-studio.cjs` junto a `package.json`, fuera de `src`.
2. En la terminal ejecuta `node instalar-parking-studio.cjs`. Hace un respaldo antes de modificar dos puntos de la interfaz. No sustituye App.tsx completo ni cambia las reservas.
3. En Supabase > SQL Editor, abre una consulta nueva, pega todo `PARKING-01.sql` (creado por el instalador) y pulsa Run. Se puede repetir sin reiniciar las existencias.
4. En Supabase > Edge Functions crea **studio-parking**. Pega todo `supabase/functions/studio-parking/index.ts` y despliega. Desactiva **Verify JWT / Enforce JWT verification** para ESTA función: la app usa sus propios tokens; la función comprueba en `api_tokens` que la sesión no haya caducado y sea administradora. Mantén el resto de funciones como estaban.
5. Esta función necesita los secretos del proyecto `SUPABASE_URL` y `STUDIO_BACKEND_KEY`. Usa la misma clave de servidor que ya emplea studio-api. Nunca la pongas en src, variables VITE ni en el navegador.
6. Ejecuta `npm run build` y pulsa Publish / Update en Bolt.
7. En Agenda, pulsa **Parking · Configurar contador** e introduce cuántas tarjetas físicas tienes. Hasta entonces no permite registrar entregas.

## Uso
- La cortesía aparece en el detalle de citas de **90 minutos o más**, incluido 90. Se usa la duración total guardada en la agenda, incluidos los minutos de preparación si forman parte de esa duración.
- Entrega el papel y pulsa **Marcar tarjeta entregada**. Se descuenta una unidad y aparece «Entregada». Reservar, cambiar o cancelar la cita no descuenta ni repone unidades.
- Al quedar **10 o menos**, la agenda muestra el aviso de pedir más; a cero se bloquean entregas.
- Parking abre el contador, reposiciones, duración mínima y los últimos 20 movimientos. Cada entrega queda asociada a la cita en el servidor.
- «Corregir entrega» exige confirmar que recuperaste físicamente el papel y escribir el motivo. Solo entonces devuelve una unidad al contador.
- Si hay una operación pendiente por falta de conexión, usa **Comprobar / reintentar**: reutiliza su referencia para no duplicarla.

El papel concede 1 hora en Traspalacios · Grupo SABA. La clienta escanea el QR en la máquina del parking antes de pagar y abona el resto. Este módulo controla las tarjetas físicas; no genera QR ni comprueba su uso en SABA. No añade mensajes al portal de la clienta.

Si aparece «Revisa el SQL y la función studio-parking», comprueba los pasos 3–5. El instalador no despliega Supabase automáticamente.
