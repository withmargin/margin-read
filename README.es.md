# Margin Read

[![CI](https://github.com/withmargin/margin-read/actions/workflows/ci.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/ci.yml)
[![Release](https://github.com/withmargin/margin-read/actions/workflows/release.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/release.yml)
[![CodeQL](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml)
[![GitHub Release](https://img.shields.io/github/v/release/withmargin/margin-read)](https://github.com/withmargin/margin-read/releases)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/clgdnabgpfiffmfdboefecbhggbepjde?label=chrome%20web%20store)](https://chromewebstore.google.com/detail/clgdnabgpfiffmfdboefecbhggbepjde)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Idiomas: [English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Margin Read es una extensión de navegador centrada en la privacidad para la traducción bilingüe de páginas web.

Traducción web bilingüe centrada en la privacidad que mantiene el texto original en su sitio para que nunca pierdas el contexto.

Margin mantiene el texto original de la página web en su lugar e inserta el texto traducido debajo de los bloques de origen correspondientes, de modo que los lectores pueden comparar ambas versiones sin perder el contexto de la página.

Repositorio: https://github.com/withmargin/margin-read

## Estado

Margin es un MVP en fase inicial para navegadores Chrome y Chromium que utiliza Manifest V3.

La extensión es funcional para páginas de artículos normales, páginas heredadas con mucho texto y páginas dinámicas seleccionadas, pero todavía está en desarrollo activo. Espera algunas imperfecciones en aplicaciones web altamente interactivas, páginas con sistemas de maquetación inusuales y sitios que reescriben su DOM de forma agresiva.

## Características

- Traduce la página web actual desde el popup de la extensión.
- Conserva el texto original e inserta las traducciones debajo de los bloques de origen correspondientes.
- Detecta bloques de texto legibles como párrafos, encabezados, elementos de lista y citas.
- Maneja páginas heredadas basadas en `table`, `font` y separadas por `br`.
- Evita áreas habituales que no son de lectura, como navegación, formularios, botones, bloques de código, texto oculto y elementos de la interfaz de la página.
- Usa los endpoints de provider y las API keys configurados por el usuario.
- Admite OpenAI, Anthropic Claude, Google Gemini y adaptadores de provider compatibles.
- Admite entornos de ejecución locales compatibles con OpenAI, como LM Studio, Ollama, el servidor de llama.cpp y omlx (Apple Silicon), además de endpoints compatibles con la API de Anthropic Messages.
- Obtiene las listas de modelos del provider desde la página de options.
- Permite elegir entre estilos de visualización de traducción integrados o resaltados.
- Muestra un botón flotante en la página (activado de forma predeterminada) que inicia la traducción solo después de que el usuario hace clic en él. El botón se puede arrastrar verticalmente a lo largo del borde de la pantalla, recuerda su posición, adapta su apariencia al fondo claro u oscuro de la página y se puede desactivar desde su control de cierre (×) o desde la página de options.
- Usa de forma predeterminada un caché de traducción válido solo durante la sesión, con opciones de caché persistente o desactivado.
- Muestra diagnósticos en el popup sobre la detección de texto, el estado de la cola y los errores del provider.
- Observa el contenido insertado dinámicamente.
- Optimiza las tarjetas del timeline de X y las páginas de artículos largos, centrándose en el contenido legible y evitando nombres de perfil, recuentos de acciones, contenido multimedia y controles.

Margin no incluye traducción de PDF, traducción de EPUB, traducción de subtítulos, OCR, traducción de cuadros de entrada, sincronización en la nube, cuentas, funciones sociales, telemetry predeterminada ni un sistema oficial de cuotas de traducción de pago.

## Pruebas beta

Los probadores beta pueden instalar Margin desde la ficha beta de la Chrome Web Store
cuando reciban una invitación, desde un ZIP de una GitHub Release o desde una compilación
local del código fuente. Consulta la
[Guía de pruebas beta](docs/BETA_TESTING.md) para conocer el flujo completo de
configuración y envío de comentarios.

## Instalar desde el código fuente

Para el desarrollo local, carga Margin como una extensión sin empaquetar:

```sh
corepack enable
pnpm install
pnpm build
```

Luego:

1. Abre `chrome://extensions`.
2. Activa el modo de desarrollador.
3. Selecciona Cargar extensión sin empaquetar.
4. Elige el directorio `apps/extension/dist/` generado.
5. Abre las options de Margin.
6. Configura un provider, una API key, un modelo, un idioma de destino y el comportamiento del caché.
7. Abre una página web y haz clic en Traducir esta página desde el popup de Margin.

## Configuración del provider

Margin no incluye ninguna API key. Los usuarios proporcionan su propia API key sin procesar del provider, sin el prefijo `Bearer`.

Los providers integrados usan endpoints predeterminados:

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

El campo de endpoint solo se muestra para configuraciones compatibles / de LLM local, donde se espera que el usuario elija o introduzca un endpoint local.

La acción Obtener modelos lee los modelos disponibles del provider seleccionado:

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`
- OpenAI Compatible / Anthropic Compatible: `GET /v1/models`

Los modelos obtenidos aparecen en el selector de modelos. Margin mantiene el modelo configurado actualmente como una opción cuando la lista del provider no devuelve un modelo predeterminado del provider o uno guardado previamente.

## Privacidad

Margin envía únicamente los segmentos de texto seleccionados al provider configurado. No envía el HTML completo de la página de forma predeterminada, no requiere inicio de sesión, no usa sincronización en la nube y no incluye telemetry de forma predeterminada.

Las solicitudes al provider las realiza el service worker de la extensión usando el endpoint y la API key configurados por el usuario. La privacidad del provider depende del endpoint y del proveedor de modelos que elijas.

Las API keys se almacenan en el almacenamiento de la extensión del navegador. Trata el perfil del navegador como parte de tu entorno de confianza.

## Optimización para X

Margin incluye un detector opcional específico para X dirigido a las tarjetas del timeline y a las páginas de artículos largos. Cuando está activado, se centra en el contenido de `tweetText` dentro de los artículos de tweets y en los bloques legibles dentro de las vistas de artículos de X, en lugar de escanear cada nodo de texto visible.

Las publicaciones citadas están desactivadas de forma predeterminada y se pueden activar desde las options. Las publicaciones que X ya marca como traducidas se omiten de forma predeterminada para evitar traducciones duplicadas.

## LLM locales

Margin admite entornos de ejecución de LLM locales a través de providers compatibles:

- OpenAI Compatible usa la API de estilo OpenAI `/v1/chat/completions`.
- Anthropic Compatible usa la API de estilo Anthropic Messages `/v1/messages` con salida estructurada mediante la herramienta `input_schema`. Es una opción de protocolo de comunicación para endpoints locales o de gateway compatibles, no un servicio independiente alojado por Anthropic.

Ambos providers compatibles permiten una API key vacía y usan una concurrencia de traducción predeterminada más baja para la inferencia local. Si un gateway compatible con Anthropic requiere una key, Margin la envía como `Authorization: Bearer ...`.

Endpoints compatibles habituales:

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
omlx: http://localhost:8000/v1/chat/completions
Generic Anthropic-compatible: http://localhost:8000/v1/messages
Ollama Anthropic compatibility: http://localhost:11434/v1/messages
```

Para usar un entorno de ejecución local:

1. Inicia el servidor del modelo local.
2. Abre las options de Margin.
3. Selecciona OpenAI Compatible para `/v1/chat/completions`, o Anthropic Compatible para `/v1/messages`.
4. Selecciona un preset de endpoint compatible con OpenAI, o introduce la URL del endpoint que muestra tu entorno de ejecución.
5. Deja la API key vacía a menos que tu gateway local requiera una.
6. Haz clic en Obtener modelos y elige un modelo servido en el selector de modelos.
7. Para OpenAI Compatible, mantén activado el modo Request JSON cuando sea compatible. Desactívalo si el entorno de ejecución local rechaza el campo de solicitud `response_format`.

Notas sobre los entornos de ejecución:

- LM Studio normalmente sirve solicitudes compatibles con OpenAI en `http://localhost:1234/v1/chat/completions`.
- Ollama requiere que su API compatible con OpenAI esté disponible en `http://localhost:11434/v1/chat/completions`.
- Ollama también puede exponer solicitudes compatibles con Anthropic en `http://localhost:11434/v1/messages`. Margin envía herramientas para la salida estructurada, pero no fuerza `tool_choice` para los endpoints compatibles con Anthropic, porque algunos entornos de ejecución compatibles aceptan herramientas pero no admiten la selección forzada de herramientas.
- El servidor de llama.cpp debe iniciarse con un servidor HTTP compatible con OpenAI activado, normalmente en `http://localhost:8080/v1/chat/completions`.
- omlx es un servidor de inferencia MLX para Apple Silicon. Inícialo con `omlx serve` (sin configuración, con los modelos en `~/.omlx/models`) o `omlx serve --model-dir /path/to/models`; la API compatible con OpenAI queda disponible en `http://localhost:8000/v1/chat/completions`.
- Si Obtener modelos falla, comprueba que el servidor local esté en ejecución, que la URL del endpoint termine en `/v1/chat/completions` o `/v1/messages` y que el entorno de ejecución exponga un endpoint `/v1/models` compatible.

La calidad, la velocidad, la longitud de contexto y la fiabilidad del JSON del modelo local dependen del modelo y del entorno de ejecución. Para la traducción se recomiendan modelos de instrucción con una sólida capacidad multilingüe.

## Desarrollo local

Instala las dependencias:

```sh
corepack enable
pnpm install
```

Ejecuta el servidor de desarrollo con recarga en caliente (Vite + CRXJS). Carga `apps/extension/dist/`
como extensión sin empaquetar una vez; luego edita el código fuente y la extensión se recarga
automáticamente:

```sh
pnpm --filter @margin/extension dev
```

Ejecuta las comprobaciones de tipos:

```sh
pnpm check
```

Ejecuta el lint:

```sh
pnpm lint
```

Ejecuta las comprobaciones del manifest y de seguridad de la extensión:

```sh
pnpm check:extension
```

Ejecuta las pruebas con cobertura:

```sh
pnpm test
```

Compila la extensión:

```sh
pnpm build
```

La compilación usa Vite con el plugin CRXJS (Rolldown por debajo) y escribe la extensión sin empaquetar en `apps/extension/dist/`.

## Estructura del proyecto

```text
apps/extension/src/background/     Service worker, provider requests, settings, and cache flow
apps/extension/src/content/        Page text detection, queueing, and translation insertion
apps/extension/src/options/        Extension options page
apps/extension/src/popup/          Popup UI and diagnostics
apps/extension/src/background/providers/      Provider adapters
apps/extension/src/shared/         Shared types, defaults, storage, and messages
apps/extension/public/             Static assets (icons) copied verbatim into the build
apps/extension/*.html              Popup and options HTML entry points
apps/extension/scripts/            Build and extension validation scripts
docs/                              Product, roadmap, principles, and threat model
```

## Solución de problemas

Activa el modo Debug en las options de Margin cuando una página aparezca activada pero no se inserte ninguna traducción. El popup mostrará el recuento de detección de la página actual, los bloques en cola, las solicitudes en curso, las traducciones pendientes, las traducciones completadas, el recuento de errores, el último error y una muestra de un bloque de texto detectado.

Usa esos valores para distinguir los principales modos de fallo:

- `Detected blocks: 0` significa que el content script no encontró texto legible en la página.
- Un recuento de detección positivo sin solicitudes en curso suele indicar que la cola de traducción necesita atención.
- Bloques con error o un último error suelen apuntar a problemas de configuración del provider, autenticación, modelo, endpoint o formato de respuesta.

## Limitaciones conocidas

- Firefox aún no es el objetivo principal.
- El manejo del DOM específico de cada sitio se limita a unos pocos casos de alto valor.
- Las aplicaciones web muy dinámicas pueden mover o eliminar los bloques de traducción.
- Las páginas grandes se traducen por lotes, por lo que las traducciones pueden aparecer de forma progresiva.
- Los límites de tasa del provider, la disponibilidad de los modelos y la calidad de la salida dependen del provider configurado.

## Documentación

- [Requisitos del producto](docs/PRD.md)
- [Principios del proyecto](docs/PRINCIPLES.md)
- [Modelo de amenazas](docs/THREAT_MODEL.md)
- [Hoja de ruta](docs/ROADMAP.md)
- [Guía de pruebas beta](docs/BETA_TESTING.md)
- [Lista de verificación de lanzamiento](docs/RELEASE_CHECKLIST.md)

## Licencia

MIT
