# Margin Read

Idiomas: [English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Margin Read es una extension de navegador para traduccion bilingue de paginas web, disenada con privacidad como prioridad.

Margin mantiene el texto original en su lugar e inserta la traduccion debajo de los bloques de origen correspondientes, para que puedas comparar ambos sin perder el contexto de la pagina.

Repository: https://github.com/withmargin/margin-read

## Estado

Margin es un MVP temprano para Chrome y navegadores Chromium que usa Manifest V3.

La extension ya funciona en paginas de articulos normales, paginas antiguas con mucho texto y algunas paginas dinamicas, pero sigue en desarrollo activo. Puede haber asperezas en Web apps muy interactivas, paginas con sistemas de layout inusuales o sitios que reescriben agresivamente el DOM.

## Funciones

- Traduce la pagina actual desde el popup de la extension.
- Conserva el texto original e inserta traducciones debajo de los bloques correspondientes.
- Detecta bloques legibles como parrafos, encabezados, items de lista y citas.
- Maneja paginas antiguas con `table`, `font` y texto separado por `br`.
- Evita zonas no orientadas a lectura como navegacion, formularios, botones, bloques de codigo, texto oculto e interfaz de la pagina.
- Usa endpoints y API keys configurados por el usuario.
- Soporta adapters para OpenAI, Anthropic Claude y Google Gemini.
- Soporta runtimes locales OpenAI-compatible como LM Studio, Ollama y llama.cpp server.
- Obtiene listas de modelos del provider desde la pagina de opciones.
- Permite elegir estilos de traduccion integrados o resaltados.
- Opcionalmente muestra un boton flotante en la pagina que solo inicia la traduccion despues de un clic del usuario.
- Permite cache persistente, solo de sesion o desactivada.
- Muestra diagnosticos en el popup para deteccion de texto, estado de cola y errores del provider.
- Observa contenido insertado dinamicamente.
- Optimiza tarjetas de timeline y paginas longform article de X, apuntando al contenido legible y evitando nombres de perfil, conteos, medios y controles.

Margin no incluye traduccion de PDF, EPUB, subtitulos, OCR, traduccion de campos de entrada, sincronizacion en la nube, cuentas, funciones sociales, telemetry por defecto ni un sistema oficial de cuota de traduccion de pago.

## Instalar desde el codigo fuente

Margin todavia no esta empaquetado en una tienda de extensiones. Cargalo como unpacked extension:

```sh
corepack enable
pnpm install
pnpm build
```

Luego:

1. Abre `chrome://extensions`.
2. Activa Developer mode.
3. Selecciona Load unpacked.
4. Elige el directorio generado `apps/extension/dist/`.
5. Abre Margin options.
6. Configura provider, API key, model, idioma de destino y comportamiento de cache.
7. Abre una pagina web y haz clic en Translate this page desde el popup de Margin.

## Configuracion del provider

Margin no incluye ninguna API key. Debes proporcionar tu propia API key sin el prefijo `Bearer`.

Los providers integrados usan endpoints predeterminados:

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

El campo Endpoint solo se muestra para configuraciones OpenAI Compatible / Local LLM, donde se espera que el usuario elija o introduzca un endpoint local.

Fetch models lee los modelos disponibles del provider seleccionado:

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`

Los modelos obtenidos aparecen en el selector de modelos. Margin conserva el modelo configurado actualmente como opcion si el modelo predeterminado o guardado no aparece en la lista del provider.

## Privacidad

Margin solo envia segmentos de texto seleccionados al provider configurado. No envia el HTML completo por defecto, no requiere inicio de sesion, no usa sincronizacion en la nube y no incluye telemetry por defecto.

Las solicitudes al provider las hace el service worker de la extension con el endpoint y la API key configurados por el usuario. La privacidad del provider depende del endpoint y del modelo que elijas.

Las API keys se guardan en el extension storage del navegador. Trata el perfil del navegador como parte de tu entorno de confianza.

## Optimizacion para X

Margin incluye un detector especifico opcional para tarjetas de timeline y paginas longform article de X. Al activarlo, apunta al contenido `tweetText` dentro de los tweet articles y a bloques legibles dentro de X article view, en lugar de escanear todos los nodos de texto visibles.

Los quoted posts estan desactivados por defecto y pueden activarse desde options. Los posts que X ya marca como traducidos se omiten por defecto para evitar traducciones duplicadas.

## LLM locales

Margin soporta runtimes locales mediante el provider OpenAI Compatible. Este provider usa la API estilo OpenAI `/v1/chat/completions`, permite API key vacia y usa una concurrencia predeterminada mas baja para inferencia local.

Endpoints comunes:

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
```

Para usar un runtime local:

1. Inicia el servidor local del modelo.
2. Abre Margin options.
3. Selecciona OpenAI Compatible como provider.
4. Elige un preset de endpoint o introduce la URL mostrada por tu runtime.
5. Deja la API key vacia salvo que tu gateway local la requiera.
6. Haz clic en Fetch models y elige un modelo desde el selector.
7. Mantén Request JSON mode activado si esta soportado. Desactivalo si el runtime local rechaza el campo `response_format`.

## Desarrollo local

```sh
corepack enable
pnpm install
pnpm check
pnpm lint
pnpm check:extension
pnpm test
pnpm build
```

El build usa Rolldown y escribe la extension unpacked en `apps/extension/dist/`.

## Estructura del proyecto

```text
apps/extension/src/background/     Service worker, provider requests, settings y cache flow
apps/extension/src/content/        Deteccion de texto, cola e insercion de traducciones
apps/extension/src/options/        Pagina de opciones de la extension
apps/extension/src/popup/          Popup UI y diagnosticos
apps/extension/src/providers/      Provider adapters
apps/extension/src/shared/         Types, defaults, storage y messages compartidos
apps/extension/public/             UI estatica de extension y content CSS
apps/extension/scripts/            Build y extension validation scripts
docs/                              Product, roadmap, principles y threat model
```

## Solucion de problemas

Activa Debug mode en Margin options si una pagina parece habilitada pero no se insertan traducciones. El popup mostrara conteo de deteccion, cola, requests en ejecucion, pending translations, completed translations, conteo de errores, ultimo error y una muestra de texto detectado.

## Limitaciones conocidas

- Firefox todavia no es el objetivo principal.
- El manejo DOM especifico por sitio esta limitado a pocos casos de alto valor.
- Web apps muy dinamicas pueden mover o eliminar bloques de traduccion.
- Las paginas grandes se traducen por lotes, por lo que las traducciones pueden aparecer progresivamente.
- Rate limits, disponibilidad de modelos y calidad de salida dependen del provider configurado.

## Documentacion

- [Product Requirements](docs/PRD.md)
- [Project Principles](docs/PRINCIPLES.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
