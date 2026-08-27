# Plan de endurecimiento de entradas y prevención de SQL injection

## Estado

- Auditoría inicial: completada el 19 de agosto de 2026.
- Implementación: completada el 19 de agosto de 2026 en `security/input-hardening`.
- Validación: pytest, Playwright, lint, build, auditoría npm y regresión SQLite completados.

## Objetivo

Crear una frontera de entrada uniforme y verificable en OdontoSpace que reduzca riesgos de SQL injection, mass assignment, XSS almacenado, cargas malformadas, abuso de tamaño y corrupción de datos, sin alterar el significado de la información clínica.

## Diagnóstico inicial

- Las operaciones normales usan SQLAlchemy ORM y parámetros; no se encontró concatenación directa de datos del usuario en consultas de negocio.
- El SQL dinámico identificado pertenece a migraciones internas y utiliza nombres definidos por el código. Debe encapsularse para evitar que en el futuro acepte identificadores externos.
- La mayoría de los esquemas Pydantic no define longitud, formato o rangos.
- Los campos adicionales no se rechazan explícitamente de forma global.
- Existen validaciones dispersas dentro de los endpoints de `main.py`.
- Odontograma, periodontograma, medicamentos y superficies se reciben como JSON serializado, con validación parcial.
- La validación de imágenes depende principalmente de extensión y MIME declarado.
- CORS permite cualquier origen mientras habilita credenciales.
- En frontend son pocos los campos que tienen longitud, patrón y mensajes de error consistentes.
- React escapa actualmente el contenido renderizado y no se encontró `dangerouslySetInnerHTML`.
- No existe una suite automatizada de seguridad, integración, E2E y regresión.

No se bloquearán palabras SQL, comillas o apóstrofes. La defensa correcta será parametrización, esquemas estrictos, límites semánticos y listas permitidas. Los textos clínicos se conservarán sin sanitización destructiva.

## Fase 1: infraestructura de seguridad reutilizable

Crear `backend/security/` con responsabilidades separadas:

- `SecureInputModel`: herencia de Pydantic para entradas, espacios normalizados, `extra = "forbid"`, validación de asignación y rechazo de bytes nulos y caracteres de control peligrosos.
- `SecureORMModel`: base segura para respuestas ORM.
- Tipos reutilizables: nombres, clínica, usuario, correo, teléfono, documento, texto breve, texto clínico, dinero, cantidades, fechas, piezas dentales y firma digital.
- Enumeraciones centralizadas para roles, estados de citas y tratamientos, métodos de pago, género, tipos de estudio y demás catálogos cerrados.
- Utilidades puras para normalización Unicode, validación de fechas y listas permitidas.

## Fase 2: migración de esquemas por dominio

Migrar gradualmente:

1. Autenticación, registro y trabajadores.
2. Pacientes, responsables y asignaciones.
3. Agenda y consultorios.
4. Historia clínica.
5. Evoluciones, tratamientos y consentimientos.
6. Fórmulas y medicamentos.
7. Pagos e inventario.
8. Mensajes e imágenes diagnósticas.
9. Odontograma y periodontograma.

Reglas mínimas:

- IDs enteros positivos.
- Fechas válidas; nacimiento no futuro ni clínicamente imposible.
- Correos normalizados y validados.
- Teléfonos con caracteres y longitud permitidos.
- Nombres con longitud razonable y soporte para caracteres internacionales y apóstrofes.
- Textos con límites según contexto.
- Valores monetarios y cantidades finitos, dentro de rangos operativos y sin negativos cuando no correspondan.
- Estados y tipos restringidos mediante enumeraciones.
- Campos desconocidos rechazados con error claro.

## Fase 3: prevención específica de SQL injection

- Mantener consultas exclusivamente mediante ORM o SQL parametrizado.
- Encapsular las migraciones con identificadores provenientes de listas constantes permitidas.
- Prohibir `text(f"...{entrada_externa}...")`, concatenación SQL y ordenamientos basados directamente en cadenas del usuario.
- Crear listas permitidas para filtros, columnas de orden y direcciones de ordenamiento.
- Limitar `skip`, `limit` y otros parámetros de consulta.
- Añadir una comprobación estática que detecte `execute()` o `text()` con interpolación y concatenación sospechosa.

## Fase 4: datos clínicos estructurados

- Sustituir gradualmente strings JSON por modelos Pydantic tipados.
- Validar numeración FDI, superficies, estados y hallazgos del odontograma.
- Validar rangos y piezas del periodontograma.
- Validar medicamentos como una lista de objetos tipados.
- Validar las superficies relacionadas con tratamientos.
- Limitar profundidad, número de elementos y tamaño total de payloads.
- Mantener compatibilidad de lectura con registros JSON existentes y migrarlos de manera segura.

## Fase 5: archivos diagnósticos

- Validar extensión, MIME y firma binaria real.
- Definir límites para nombre, título y observaciones.
- Rechazar bytes nulos y caracteres de control en nombres.
- Mantener nombres internos aleatorios y rutas resueltas bajo el directorio autorizado.
- Validar JPG, PNG, WebP, PDF y DICOM mediante cabeceras reales.
- Aplicar límites durante la lectura, no solo después de cargar el archivo completo.
- Servir archivos con cabeceras seguras y sin interpretación HTML.

## Fase 6: validaciones frontend

Crear componentes o utilidades compartidas:

- `ValidatedInput`
- `ValidatedTextarea`
- `ValidatedNumberInput`
- `FormFieldError`
- Normalizadores para teléfono, documento, nombre, dinero y fecha.

Aplicar `required`, `minLength`, `maxLength`, `min`, `max`, `step`, `pattern`, conteos de caracteres, errores por campo y prevención de envíos duplicados. El frontend será una ayuda de experiencia; el backend seguirá siendo la autoridad.

## Fase 7: configuración HTTP y protección operativa

- Sustituir CORS abierto por orígenes configurables mediante entorno.
- Restringir métodos, cabeceras y credenciales a lo necesario.
- Agregar cabeceras de seguridad compatibles con la aplicación.
- Limitar tamaño general de solicitudes.
- Evitar que logs incluyan contraseñas, tokens, historias clínicas, firmas o imágenes.
- Normalizar respuestas de error sin filtrar detalles internos.
- Evaluar límites de frecuencia para login, OTP, carga de archivos y endpoints costosos.

## Fase 8: pruebas automatizadas de seguridad e integración

Crear una suite backend que cubra:

- `' OR 1=1 --`, `UNION SELECT`, comentarios SQL y consultas apiladas.
- Apóstrofes legítimos, tildes y Unicode en nombres y textos clínicos.
- Bytes nulos y caracteres invisibles.
- Campos desconocidos y mass assignment de `clinic_id`, `role`, `paid_amount`, IDs y propietarios.
- Strings y JSON excesivos o profundamente anidados.
- JSON clínico inválido.
- `NaN`, infinito, negativos y cantidades extremas.
- Fechas futuras, imposibles y límites de edad.
- MIME manipulado, extensiones falsas y archivos sobredimensionados.
- Acceso cruzado entre clínicas y profesionales.
- Paginación y filtros fuera de rango.

Los payloads SQL maliciosos deben rechazarse por formato cuando corresponda o almacenarse literalmente; nunca deben cambiar la consulta, autenticar al atacante ni exponer otros registros.

## Fase 9: pruebas end-to-end obligatorias

Después de implementar, ejecutar flujos completos en un entorno aislado con base de datos de prueba:

1. Registro de clínica, OTP y login válido/inválido.
2. Creación y edición de personal con roles y permisos.
3. Registro rápido y completo de pacientes.
4. Agenda diaria, semanal y mensual; creación, edición, solapamientos y duración por bloques.
5. Historia clínica y reglas de habilitación.
6. Odontograma permanente, temporal y mixto; guardado y recarga.
7. Periodontograma; rangos y persistencia.
8. Imágenes diagnósticas válidas e inválidas.
9. Plan de tratamiento, consentimiento firmado, cambio de estado y evolución.
10. Fórmulas, pagos, inventario y reportes.
11. Restricciones por administrador, administrativo, odontólogo y especialista.
12. Aislamiento entre dos clínicas.

La automatización preferida será Playwright para navegador y pytest/FastAPI TestClient para API. Si el entorno no tiene estas dependencias, se documentará y solicitará autorización antes de instalarlas.

## Fase 10: pruebas de regresión

- Ejecutar lint y build del frontend.
- Compilar/importar el backend y ejecutar toda su suite.
- Verificar compatibilidad con la base SQLite existente mediante una copia, nunca sobre el único archivo de datos.
- Confirmar que historias clínicas y textos existentes siguen cargando sin pérdida.
- Confirmar que los JSON históricos del odontograma, periodontograma y recetas continúan leyéndose.
- Verificar que los roles mantienen sus accesos actuales.
- Comparar respuestas principales antes y después del endurecimiento.
- Repetir manualmente los flujos críticos cuando no exista cobertura automatizable.
- Registrar resultados, fallos, correcciones y pruebas repetidas en un informe final.

## Estrategia de ejecución segura

- Crear una copia de seguridad de la base antes de cualquier migración de datos.
- Trabajar en cambios pequeños y verificables.
- Ejecutar pruebas después de cada dominio migrado.
- No cambiar simultáneamente contratos frontend y backend sin compatibilidad temporal.
- No borrar ni reescribir datos clínicos existentes.
- No ejecutar pruebas destructivas contra el entorno con datos reales.
- Detenerse y pedir autorización si se requieren dependencias, cambios de infraestructura o decisiones clínicas no especificadas.

## Criterios de aceptación

- Todos los modelos de entrada heredan de la infraestructura segura correspondiente.
- Todos los campos tienen restricciones acordes con su dominio.
- No existen consultas construidas con datos externos sin parametrización.
- Los intentos de mass assignment son rechazados.
- Los errores indican el campo inválido sin revelar información interna.
- Los archivos se verifican por contenido y tamaño.
- Los formularios frontend reflejan las reglas principales del backend.
- Las pruebas unitarias, de integración, seguridad, E2E y regresión terminan correctamente.
- Los flujos clínicos y administrativos existentes continúan funcionando.
- Se entrega un informe con cobertura, resultados, riesgos residuales y recomendaciones.

## Entregables finales

- Clases reutilizables de seguridad backend.
- Esquemas migrados y endpoints ajustados.
- Componentes y reglas frontend.
- Pruebas de seguridad e integración.
- Suite E2E.
- Suite/informe de regresión.
- Documentación de límites, formatos y errores.
- Informe final de cambios, resultados y riesgos residuales.
