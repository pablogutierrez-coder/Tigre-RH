# Auditoria visual inicial - Tigre RH

## 1. Problemas visuales encontrados

- La interfaz mezcla una estetica "glassmorphism" con fondos, gradientes, sombras y transparencias en muchas superficies. El resultado puede verse moderno, pero en pantallas operativas densas genera saturacion visual y baja consistencia corporativa.
- Los radios y sombras varian entre componentes: hay `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `shadow-xs`, `shadow-md`, `shadow-xl` y `shadow-2xl` usados sin una jerarquia clara.
- El color primario fucsia/indigo aparece con mucha intensidad en botones, menu, banners y graficos. Conviene conservar la identidad, pero usarla como acento y no como dominante en toda la pantalla.
- Hay diferencias entre formularios: algunos usan `glass-input`, otros usan inputs con `bg-slate-50 border`, y los estados `focus` no son consistentes.
- Las tablas tienen estilos similares, pero no siempre comparten densidad, separacion, borde inferior o hover. Esto afecta la lectura en vistas operativas como asistencia, usuarios, auditoria y altas.
- Las cards de dashboard tienen buena base, pero las sombras, barras laterales y colores pueden refinarse para una apariencia mas sobria y SaaS.
- Los modales usan radios y sombras muy grandes en varios lugares. La jerarquia visual es clara, pero puede sentirse pesada.
- El login ya tiene una composicion fuerte por el video de fondo; el card necesita mantenerse sobrio para no competir con el fondo.
- En responsive, la app tiene muchas grillas y tablas anchas. La estructura existe, pero se debe cuidar que los contenedores mantengan padding y scroll horizontal limpio.

## 2. Pantallas y componentes que necesitan optimizacion

- `App.tsx`: layout general, sidebar, header, login card, navegacion y contenedor principal.
- `Dashboard.tsx`: filtros ejecutivos, KPI cards, paneles de graficos y jerarquia de metricas.
- `Capacitaciones.tsx`: cards de capacitaciones, filtros, formularios, modales y tablas de previsualizacion.
- `AttendanceControl.tsx`: tabla operativa, banners de estado, controles masivos, filtros y modales.
- `AltaConfirmation.tsx`, `Usuarios.tsx`, `Encuestas.tsx`, `Reportes.tsx`, `Auditoria.tsx`, `Reaperturas.tsx`: tablas, formularios, modales y estados.
- `PublicSurveyForm.tsx`: tarjeta publica y consistencia de marca.
- `index.css`: sistema visual global, superficies, inputs, focus, scrollbars, tablas y responsive base.

## 3. Tipo de mejora a aplicar

- Reducir la sensacion de transparencia excesiva en cards y headers.
- Estandarizar sombras, bordes y fondos hacia superficies blancas limpias.
- Mantener fucsia/indigo como acento, pero bajar saturacion general.
- Mejorar estados hover/focus/active sin alterar acciones.
- Normalizar inputs, selects, textareas y tablas usando reglas globales seguras.
- Ajustar el dashboard para que KPIs y graficos se vean mas corporativos y menos decorativos.
- Mejorar espaciado interno y jerarquia visual sin mover ni eliminar informacion.
- Mantener el login simple, con el logo dentro del card y el video como fondo.

## 4. Archivos probablemente modificados

- `src/index.css`
- `src/App.tsx`
- `src/components/Dashboard.tsx`
- Posibles ajustes puntuales en componentes con tablas o modales si el CSS global no alcanza.

## 5. Criterios para mantener el diseno limpio, moderno y profesional

- Priorizar legibilidad, contraste y jerarquia sobre decoracion.
- Usar blanco, slate y acentos fucsia/indigo de forma controlada.
- Mantener radios moderados y sombras suaves.
- No cambiar datos, permisos, rutas, validaciones ni flujo funcional.
- No eliminar cards, graficos, filtros, tablas, campos, botones ni modales existentes.
- Aplicar cambios progresivos y reversibles, preferentemente desde CSS global y clases visuales.
- Verificar build y TypeScript al final.
