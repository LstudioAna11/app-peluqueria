# Reseñas de Google en L’Studio Ana

El botón «Escribir mi reseña en Google» usa el enlace existente de Configuración. No envía opiniones por la clienta ni confirma que haya publicado una reseña. La opinión privada sigue llegando al buzón del Studio.

Sin conexión configurada, la tarjeta permite escribir o leer en Google. No muestra notas ni testimonios inventados.

## Para leer los textos dentro del portal

1. En Google Cloud, crear o seleccionar un proyecto con facturación y habilitar Maps JavaScript API y Places API (New).
2. Crear una clave de navegador restringida por sitios web (HTTP referrers) a tus dominios publicados y solo a esas APIs. No usar claves de servidor ni claves sin restricciones. No enviar la clave por el chat. La clave de navegador será visible en la web, por lo que las restricciones son necesarias.
3. Obtener y comprobar el Place ID exacto de L’Studio Ana con el buscador de Place IDs oficial. No utilizar el enlace g.page ni una dirección como Place ID.
4. En las variables del proyecto Bolt, añadir:

   VITE_GOOGLE_MAPS_BROWSER_KEY=tu_clave_de_navegador_restringida
   VITE_GOOGLE_PLACE_ID=el_place_id_del_studio

5. Establecer cuotas y revisar los precios de Google antes de activar. Las consultas de reseñas pueden tener coste; no se activa ninguna cuenta ni facturación desde este instalador.
6. Actualizar los textos de privacidad y condiciones públicos del portal para contemplar la conexión con Google Maps y sus políticas. Revisar las condiciones aplicables al EEE.
7. Ejecutar npm run build y publicar de nuevo.

La conexión solo consulta Google al pulsar «Leer reseñas aquí». La respuesta se mantiene mientras el bloque está montado; no se exporta a Supabase, no se almacena en localStorage y no se vincula con fichas privadas de clientas. Google devuelve una selección de hasta cinco reseñas por relevancia, no el historial completo. La tarjeta mantiene los autores y el origen Google Maps, sin filtrar puntuaciones. «Ver todas en Google» abre la ficha existente.

Si falla la conexión, la clienta puede seguir leyendo y opinando en Google. El botón de opinión está disponible para todas las clientas, independientemente de su puntuación privada. No se otorgan puntos ni regalos por reseñar.

Fuentes oficiales:
https://developers.google.com/maps/documentation/javascript/place-reviews
https://developers.google.com/maps/documentation/javascript/load-maps-js-api
https://developers.google.com/maps/documentation/javascript/policies
https://developers.google.com/maps/documentation/javascript/get-api-key
https://developers.google.com/maps/documentation/places/web-service/place-id
