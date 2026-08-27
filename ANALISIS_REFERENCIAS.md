# Análisis de referencias funcionales

Inventario acumulativo de funciones observadas en otros sistemas y comparación con OdontoSpace.

> Las referencias se usan para identificar necesidades y patrones de operación. No se copiarán literalmente diseños, textos, marcas ni código de terceros.

## dt.dental — Página de inicio

Capturas revisadas: 18 de agosto de 2026, entre 18:55 y 18:58.

### Ya disponible en OdontoSpace

- Agenda y estados de citas.
- Pacientes y expedientes.
- Ingresos, gastos/pagos y balance general.
- Reportes administrativos básicos.
- Inventario con cantidad, stock mínimo, proveedor, costo y vencimiento.
- Alertas de inventario por stock bajo.
- Próximas citas disponibles desde el reporte del backend.
- Navegación por roles y configuración de integraciones.

### Disponible parcialmente

| Función observada | Estado actual en OdontoSpace | Brecha |
| --- | --- | --- |
| Resumen de la clínica | Dashboard con pacientes totales, citas de hoy y pendientes | Filtro por periodo y comparación de pacientes nuevos/citas canceladas |
| Indicadores de citas | Reporte agregado por estado | Serie histórica mensual, gráfica y acceso a indicadores detallados |
| Alertas de inventario | Stock bajo y fecha de vencimiento en inventario | Vista rápida en inicio, separación entre vencidos y próximos a vencer |
| Próximas citas | Backend devuelve cinco citas próximas | Tarjeta visible en inicio con paciente, profesional, horario y estado |
| Búsqueda | Búsquedas locales dentro de algunas pantallas | Buscador global de pacientes, citas y módulos |
| Financiación | Pagos, descuentos y cuentas por cobrar | Solicitudes de financiación, desembolsos, estados y seguimiento comercial |
| Configuración | Integraciones, equipo y catálogo | Centro unificado de configuración de clínica, sedes y preferencias |

### Aún no disponible

- Centro de noticias y novedades dentro del producto.
- Avisos promocionales o anuncios segmentados con acción directa.
- Gestión formal de financiación externa:
  - solicitudes en trámite;
  - desembolso pendiente;
  - desembolsado;
  - gestión comercial pendiente.
- Módulo independiente de bioseguridad.
- Manejo de múltiples sedes en inventario y reportes.
- Comparación temporal mediante rangos de fechas configurables.
- Indicadores anuales de citas distribuidos por mes.
- Conteo específico de pacientes nuevos por periodo.
- Panel unificado de inicio que combine operación, alertas y finanzas.

### Patrones de experiencia útiles

- Saludo personalizado con el nombre del usuario.
- Inicio operativo con información accionable, no solo métricas.
- Diseño de dos columnas en escritorio:
  - resumen e inventario a la izquierda;
  - próximas citas y financiación a la derecha.
- Enlaces “Ver todas” que conectan cada resumen con su módulo completo.
- Estados expresados con color y texto, no únicamente con color.
- Periodo analizado siempre visible junto al resumen.

### Prioridad sugerida

1. Mejorar el Dashboard con próximas citas, vencimientos y filtro mensual.
2. Incorporar búsqueda global.
3. Añadir indicadores históricos de citas y pacientes nuevos.
4. Modelar sedes para inventario, agenda y reportes.
5. Diseñar financiación como parte del motor inteligente de presupuestos.
6. Evaluar bioseguridad cuando se conozcan sus pantallas y flujo completo.

### Información pendiente de observar

- Qué resultados incluye la búsqueda global.
- Acciones disponibles al seleccionar una próxima cita.
- Definición exacta de “No atendida” y reglas de cada estado.
- Configuración de rangos y comparación de periodos.
- Flujo completo de financiación y relación con presupuestos/pacientes.
- Contenido y alcance del módulo de bioseguridad.
- Gestión de sedes y permisos entre sedes.

## dt.dental — Directorio de pacientes

Captura revisada: 18 de agosto de 2026, 18:59.

### Datos y funciones observados

- Módulo independiente de pacientes en la navegación principal.
- Listado tabular con:
  - avatar por iniciales;
  - nombre completo;
  - tipo y número de documento;
  - correo electrónico;
  - teléfono fijo;
  - celular;
  - menú de acciones por paciente.
- Búsqueda por nombre o documento.
- Acción principal “Nuevo paciente”.
- Acción adicional de filtrado.

### Comparación con OdontoSpace

| Función observada | Estado actual | Brecha |
| --- | --- | --- |
| Directorio general de pacientes | Parcial | Hay selectores de pacientes en Historia, Odontograma, Agenda y Personal, pero no un directorio administrativo único |
| Crear paciente | Parcial | Se puede crear durante el agendamiento; falta una alta directa desde el directorio |
| Buscar por nombre | Disponible parcialmente | Existe en accesos clínicos y Agenda, pero no como búsqueda general de pacientes |
| Buscar por documento | No disponible en el listado | El documento está asociado a la historia clínica y no al registro principal del paciente |
| Tipo de documento | No disponible | Falta modelarlo explícitamente |
| Teléfono fijo y celular separados | No disponible | Actualmente existe un único teléfono con código de país |
| Acciones por fila | No disponible como directorio | Las acciones están distribuidas entre diferentes pantallas clínicas |
| Filtros de pacientes | No disponible | Falta conocer los criterios ofrecidos por la referencia |

### Mejoras sugeridas

1. Crear la ruta y opción de menú **Pacientes**.
2. Consolidar en ella búsqueda, alta, edición y apertura del expediente.
3. Mover `document_id` al perfil principal del paciente y añadir `document_type`.
4. Mantener celular como contacto principal y añadir teléfono alternativo opcional.
5. Añadir filtros útiles propios: profesional asignado, pacientes con cita próxima, tratamiento activo y saldo pendiente.
6. Incorporar acciones rápidas para expediente, nueva cita, mensaje y presupuesto.

### Información pendiente de observar

- Formulario completo de creación y edición.
- Contenido del menú de tres puntos.
- Opciones disponibles en “Filtrar”.
- Paginación, ordenamiento y exportación.
- Reglas para pacientes duplicados por documento, correo o teléfono.

## dt.dental — Agenda por consultorios

Captura revisada: 18 de agosto de 2026, 19:10.

### Funciones observadas

- Agenda diaria dividida en columnas por consultorio o unidad odontológica.
- Filtro independiente por profesional.
- Bloques visuales con paciente, profesional, motivo y horario.
- Tipos de cita diferenciados visualmente.

### Decisión para OdontoSpace

- El consultorio será un recurso independiente del profesional.
- Cada cita reservará simultáneamente:
  - paciente;
  - profesional, cuando aplique;
  - consultorio o unidad;
  - fecha, hora y duración.
- Se validarán cruces tanto del profesional como del consultorio.
- La vista diaria se organizará por consultorios; semana y mes conservarán su estructura temporal.

## dt.dental — Ingresos y gastos

Capturas revisadas: 18 de agosto de 2026, entre 19:13 y 19:16.

### Ingresos observados

- Listado de facturas o recibos emitidos.
- Búsqueda por número, cliente o NIT.
- Filtro por estado.
- Columnas: número, fecha, paciente, valor, forma de pago, sede, estado y acciones.
- Creación de un nuevo ingreso.
- Posible acción de anulación desde cada fila.

### Gastos observados

- Directorio de comprobantes de egreso y gastos operativos.
- Búsqueda por número, concepto, proveedor o sede.
- Filtros por tipo de gasto y estado activo/anulado.
- Formulario con:
  - fecha;
  - tipo de gasto;
  - proveedor;
  - sede;
  - banco;
  - medio de pago;
  - concepto;
  - valor.
- Catálogo de tipos de gasto, con ejemplos como arriendo, energía, internet y nómina.
- Catálogo reutilizable de proveedores.
- Medios de pago observados: cheque, datáfono, efectivo, tarjeta crédito, tarjeta débito y transferencia electrónica.

### Comparación con OdontoSpace

| Función | Estado actual | Brecha |
| --- | --- | --- |
| Registrar ingresos y gastos | Básico | Existe un único modelo de movimientos con tipo, concepto, valor y método |
| Numeración de comprobantes | No disponible | Falta consecutivo y tipo documental |
| Estado y anulación | No disponible | Falta anulación auditable; no debe eliminar movimientos financieros |
| Catálogo de tipos de gasto | No disponible | Falta clasificación contable/operativa |
| Proveedores | Parcial | Inventario guarda proveedor como texto; falta catálogo compartido |
| Bancos/cuentas | No disponible | Falta catálogo de cuentas financieras |
| Sedes | No disponible | Requiere el futuro modelo de sedes |
| Formas de pago detalladas | Parcial | Hay método de pago, pero debe normalizarse y ampliarse |
| Facturas/recibos | No disponible | Falta documento, consecutivo, estado y relación formal con paciente |

### Permisos acordados

- Ingresos, gastos, caja y reportes financieros serán visibles únicamente para:
  - administrador;
  - personal administrativo.
- Odontólogos y especialistas no accederán a listados financieros generales.
- La información clínica podrá mostrar el estado operativo del plan sin exponer caja o reportes globales.

### Prioridad sugerida

1. Separar las vistas de Ingresos y Gastos manteniendo un libro de movimientos común.
2. Añadir consecutivos, estados y anulación con auditoría.
3. Crear catálogos de tipos de gasto, proveedores y medios de pago.
4. Incorporar bancos/cuentas y conciliación en una etapa posterior.
5. Integrar sedes cuando exista el modelo multisedes.

## dt.dental — Centro de reportes

Capturas revisadas: 18 de agosto de 2026, entre 19:37 y 19:39.

### Catálogo de reportes observado

#### Financieros

- Ingresos.
- Gastos.
- Cuadre de caja.
- Cartera.
- Anulaciones.
- Presupuestos pendientes.

#### Operativos

- Citas.
- Archivo de gestión.
- Archivo histórico.
- Cumpleaños.
- Residuos.

#### Inventarios

- Inventarios.
- Movimientos de inventario.
- Inventario valorizado.

#### IPS y cumplimiento colombiano

- Actividades.
- Oportunidad de citas.
- COP por persona.
- Resolución 3280.
- Suficiencia UPC.
- FEV RIPS.

### Patrones comunes

- Selección explícita del informe desde un centro de reportes.
- Filtros persistentes por fecha inicial y final.
- Filtros opcionales por profesional, sede y forma de pago.
- Acciones separadas para visualizar y generar el reporte.
- Totales consolidados al final de las tablas.
- Navegación rápida entre informes de una misma categoría.

### Reporte de ingresos

Campos observados:

- fecha;
- número consecutivo;
- documento del paciente;
- paciente;
- profesional;
- sede;
- forma de pago;
- concepto;
- valor;
- estado activo/anulado.

Brechas frente a OdontoSpace:

- El reporte actual no filtra por fechas, profesional o sede.
- Los pagos no tienen número documental ni estado auditable.
- El concepto no está normalizado contra tratamiento, abono o factura.
- Falta distinguir fecha de emisión, fecha de pago y profesional responsable.

### Cuadre de caja

Comportamiento observado:

- Cruza ingresos y gastos activos dentro del periodo.
- Filtra por sede y forma de pago.
- Muestra fecha, persona, concepto, sede, forma de pago, banco, tipo y valor.
- Presenta total consolidado.

Requisitos para OdontoSpace:

- Apertura y cierre de caja por usuario/turno.
- Saldo inicial, ingresos, egresos, retiros y saldo esperado.
- Diferencia entre saldo esperado y contado.
- Desglose por efectivo, transferencia, tarjeta y otros medios.
- Registro inmutable de cierres y correcciones auditadas.

### Reporte de cartera

Comportamiento observado:

- Incluye tratamientos aprobados con saldo pendiente.
- Muestra fecha, paciente, documento, tratamiento, odontólogo, estado, total y saldo.
- Totaliza valor aprobado y saldo pendiente.

OdontoSpace ya calcula cuentas por cobrar de manera agregada, pero falta:

- detalle por tratamiento y paciente;
- fecha de aprobación del presupuesto;
- profesional responsable;
- vencimiento o antigüedad de cartera;
- abonos aplicados a tratamientos concretos;
- seguimiento y recordatorios de cobro;
- filtros por edad de deuda, profesional y estado.

### Reportes que requieren nuevos modelos

| Reporte | Dependencia necesaria |
| --- | --- |
| Anulaciones | Estado, motivo, usuario, fecha y registro inmutable de anulación |
| Presupuestos pendientes | Entidad formal de presupuesto, versión, aceptación y vigencia |
| Archivo de gestión/histórico | Definir primero qué eventos y documentos incluye cada archivo |
| Cumpleaños | Fecha de nacimiento en el perfil principal del paciente |
| Residuos | Módulo de bioseguridad y gestión de residuos |
| Movimientos de inventario | Kardex de entradas, salidas, ajustes, lotes y usuario responsable |
| Inventario valorizado | Costos por lote o método de valoración definido |
| Oportunidad de citas | Fecha de solicitud frente a fecha efectiva de atención |
| Reportes IPS | Modelos y reglas validados con requisitos regulatorios colombianos vigentes |

### Prioridad sugerida

1. Reportes financieros por rango: ingresos, gastos y cartera detallada.
2. Libro de caja y cuadre por medio de pago.
3. Presupuestos pendientes y antigüedad de cartera.
4. Kardex e inventario valorizado.
5. Reportes operativos de citas y cumpleaños.
6. Reportes IPS únicamente después de validar normativa, alcance y datos obligatorios.

### Información pendiente de observar

- Formato generado: pantalla, PDF, Excel o impresión.
- Permisos para generar, exportar y ver cada informe.
- Flujo de anulación y trazabilidad.
- Reporte de presupuestos pendientes.
- Definición de archivo de gestión e histórico.
- Detalle de reportes IPS, fuentes de datos y validaciones regulatorias.

## Diagnóstico odontológico — CIE-10

Material revisado: texto suministrado y dos capturas del 18 de agosto de 2026, 20:07.

El catálogo textual recibido de diagnósticos y procedimientos fue separado, normalizado y marcado para validación en [CATALOGO_ODONTOLOGICO_PROPUESTO.md](./CATALOGO_ODONTOLOGICO_PROPUESTO.md).

### Requisito general

En Colombia, el diagnóstico inicial odontológico debe poder registrarse mediante códigos de la Clasificación Internacional de Enfermedades, décima revisión (CIE-10). El Ministerio de Salud indica que los diagnósticos se registran con CIE-10 y contempla la transición futura a CIE-11; los procedimientos se codifican por separado mediante CUPS.

Referencias para validación:

- Ministerio de Salud de Colombia — Resumen Digital de Atención: https://minsalud.gov.co/ihce/rda/Paginas/inicio.aspx
- Ministerio de Salud de Colombia — RIPS: https://www.minsalud.gov.co/Proteccion-Social/Paginas/rips.aspx
- OMS — Aplicación de la CIE a odontología y estomatología: https://www.who.int/publications/i/item/9241544678

### Grupos observados en las capturas

- Códigos de consulta y examen odontológico.
- Prevención y alteraciones del desarrollo/erupción dentaria.
- Operatoria:
  - caries de esmalte, dentina y cemento;
  - caries detenida;
  - otras caries y caries no especificada;
  - atrición, abrasión y erosión dental.
- Endodoncia:
  - enfermedades de la pulpa;
  - pulpitis;
  - necrosis pulpar;
  - degeneración pulpar;
  - formación anormal de tejido duro;
  - periodontitis apical;
  - absceso periapical;
  - quiste radicular;
  - otras enfermedades pulpares y periapicales.
- Periodoncia:
  - gingivitis aguda y crónica;
  - periodontitis aguda y crónica;
  - periodontosis;
  - recesión gingival;
  - hiperplasia gingival;
  - lesiones de encía y reborde alveolar edéntulo.
- Cirugía y alteraciones dentomaxilares:
  - dientes incluidos e impactados;
  - anomalías de tamaño, forma, posición y relación dental;
  - maloclusiones;
  - trastornos de articulación temporomandibular;
  - quistes de la región oral;
  - enfermedades de los maxilares.

### Brecha en OdontoSpace

Actualmente el diagnóstico se captura como texto libre dentro de la historia clínica y las evoluciones. Falta:

- catálogo versionado de diagnósticos CIE-10;
- código y descripción normalizados;
- búsqueda por código, término y sinónimo;
- diagnóstico principal y diagnósticos relacionados;
- distinción entre diagnóstico inicial, confirmado y de egreso/final cuando corresponda;
- relación opcional con pieza dental, superficie y hallazgo del odontograma;
- profesional, fecha y contexto de atención;
- conservación del código y la descripción utilizados en el momento del registro;
- integración posterior con RIPS sin mezclar diagnóstico CIE con procedimiento CUPS.

### Diseño sugerido

Cada diagnóstico clínico debería almacenar como mínimo:

- `patient_id`;
- `appointment_id` o episodio de atención;
- `code_system` (`CIE-10` inicialmente);
- `catalog_version`;
- `code` con puntuación canónica;
- `description` como copia histórica;
- `diagnosis_type` (principal o relacionado);
- `diagnosis_stage` (inicial, confirmado o final, según el flujo aplicable);
- `tooth` y superficies opcionales;
- `clinical_note`;
- `professional_user_id`;
- fecha de registro;
- estado y trazabilidad de correcciones.

### Reglas clínicas y de seguridad

- Solo profesionales clínicos autorizados pueden registrar o corregir diagnósticos.
- El asistente de IA puede sugerir términos o preguntas, pero nunca confirmar ni guardar un diagnóstico automáticamente.
- Toda sugerencia debe mostrar código, descripción y fuente del catálogo para aprobación expresa del odontólogo.
- Los diagnósticos firmados no deben editarse destructivamente; las correcciones deben conservar trazabilidad.
- No se importarán códigos manualmente desde las capturas: se utilizará una fuente oficial y versionada para evitar errores de transcripción, pérdida de puntos decimales o códigos obsoletos.

### Consideración técnica

La OMS ubica las enfermedades de la cavidad oral, glándulas salivales y maxilares principalmente entre `K00` y `K14`; allí se incluyen caries (`K02`), enfermedades pulpares/periapicales (`K04`) y gingivitis/enfermedades periodontales (`K05`). El catálogo odontológico también puede requerir códigos ubicados fuera de ese rango, por lo que la búsqueda no debe limitarse rígidamente a `K00–K14`.

### Trabajo pendiente

1. Obtener y validar la tabla oficial de referencia que utilizará Colombia para el intercambio requerido.
2. Confirmar campos obligatorios de diagnóstico en RIPS/FEV-RIPS para el tipo de atención odontológica.
3. Diseñar la separación entre diagnóstico CIE-10 y procedimiento CUPS.
4. Implementar selector con búsqueda y asociación al odontograma.
5. Preparar transición de catálogo sin modificar registros clínicos históricos.

## Resolución 3280 de 2018 — Rutas integrales de atención

La Resolución 3280 de 2018 del Ministerio de Salud y Protección Social adopta los lineamientos técnicos y operativos de:

- la Ruta Integral de Atención para la Promoción y Mantenimiento de la Salud (RPMS);
- la Ruta Integral de Atención en Salud para la población materno-perinatal;
- las directrices para su operación, monitoreo y evaluación.

Fuente oficial: https://www.minsalud.gov.co/Normatividad_Nuevo/Resoluci%C3%B3n%20No.%203280%20de%2020183280.pdf

La norma fue modificada, entre otras, por la Resolución 276 de 2019. Antes de implementar reglas automáticas deben revisarse la versión aplicable, sus modificaciones y las tablas técnicas vigentes.

### Alcance para OdontoSpace

No se implementará únicamente como un botón de “Reporte 3280”. Debe existir información clínica estructurada que permita demostrar las intervenciones realizadas, pendientes, oportunas y aplicables a cada paciente según su curso de vida y condiciones particulares.

### Capacidades necesarias

#### Perfil del paciente

- Fecha de nacimiento y cálculo de edad/curso de vida.
- Sexo y variables demográficas requeridas.
- Pertenencia poblacional y enfoque diferencial cuando aplique.
- Asegurador, régimen y datos administrativos necesarios para reporte.
- Condiciones especiales, embarazo y otros contextos clínicos relevantes cuando correspondan.

#### Valoración y riesgos de salud bucal

- Valoración integral del estado de salud bucal.
- Registro estructurado de factores de riesgo y factores protectores.
- Hábitos de higiene, alimentación y exposición a tabaco/alcohol cuando aplique.
- Antecedentes y hallazgos clínicos asociados.
- Clasificación de riesgo con fecha, profesional y criterio utilizado.
- Canalización a otras atenciones cuando se identifiquen necesidades.

#### Promoción y protección específica

- Educación para la salud y recomendaciones entregadas.
- Control o remoción de placa bacteriana.
- Aplicación tópica de flúor/barniz cuando aplique.
- Aplicación de sellantes cuando aplique.
- Otras intervenciones preventivas definidas por la ruta y el curso de vida.
- Registro de realizado, no realizado, no aplicable, rechazado o pendiente, con motivo.

> Las edades, periodicidades, criterios de riesgo y códigos de procedimiento no se fijarán manualmente en el código fuente. Deben cargarse desde una matriz normativa versionada y validada.

#### Seguimiento

- Próxima intervención esperada.
- Alertas por intervención pendiente o vencida.
- Demanda inducida y recordatorios.
- Evidencia de canalización, aceptación, rechazo e inasistencia.
- Continuidad entre consulta, diagnóstico, procedimiento y seguimiento.

### Reporte de cumplimiento 3280

El reporte debería permitir filtros por:

- periodo;
- sede;
- profesional;
- asegurador;
- curso de vida;
- intervención;
- estado de cumplimiento;
- población o enfoque diferencial cuando corresponda.

Indicadores sugeridos:

- población elegible;
- pacientes valorados;
- intervenciones esperadas;
- realizadas dentro de oportunidad;
- pendientes y vencidas;
- no aplicables;
- rechazadas;
- cobertura y cumplimiento porcentual;
- pacientes canalizados y seguimiento de la canalización.

### Modelo sugerido

Una intervención regulatoria debe conservar:

- paciente;
- episodio/cita;
- ruta y versión normativa;
- curso de vida al momento de la atención;
- intervención y código CUPS cuando corresponda;
- fecha esperada y fecha realizada;
- estado;
- profesional y sede;
- diagnóstico CIE-10 relacionado cuando corresponda;
- observación o motivo de no realización;
- evidencia y trazabilidad de correcciones.

### Relación con otros módulos

- **Historia clínica:** origen de riesgos, valoración y antecedentes.
- **Agenda:** alertas de atenciones preventivas pendientes.
- **Odontograma/periodontograma:** hallazgos clínicos, sin sustituir el registro de la intervención.
- **CIE-10:** diagnósticos que motivan o resultan de la atención.
- **CUPS:** procedimientos efectivamente realizados.
- **RIPS/FEV-RIPS:** salida de información administrativa y clínica según reglas vigentes.
- **Portal del paciente:** recordatorios, educación y seguimiento de intervenciones.
- **Reportes:** cobertura, oportunidad y cumplimiento por población.

### Reglas de seguridad y cumplimiento

- Las reglas normativas deben estar versionadas y tener fecha de vigencia.
- Los registros históricos deben conservar la versión aplicada en su momento.
- Ninguna alerta automática equivale a una orden clínica.
- El profesional debe confirmar aplicabilidad y realización.
- Correcciones posteriores deben quedar auditadas.
- La implementación debe validarse con asesoría jurídica, clínica y de facturación/RIPS antes de uso productivo.

### Etapas propuestas

1. Completar datos demográficos y administrativos del paciente.
2. Crear matriz versionada de intervenciones por curso de vida.
3. Registrar valoración de riesgo e intervenciones preventivas.
4. Generar alertas de oportunidad y pendientes.
5. Construir el reporte de cumplimiento 3280.
6. Integrar CIE-10, CUPS y salida RIPS con validación oficial.

## dt.dental — Inventario clínico y sanitario

Capturas revisadas: 18 de agosto de 2026, entre 20:29 y 20:30.

### Formulario de recepción observado

#### Clasificación y recepción

- Tipo de producto, con ejemplos como medicamento e insumo médico.
- Fecha de llegada.
- Sede.
- Estado en que se recibe.

#### Identificación del producto

- Nombre comercial.
- Marca.
- Nombre genérico.
- Principio activo.
- Concentración.
- Forma farmacéutica.
- Clasificación de riesgo.
- Presentación o unidad de medida.
- Registro sanitario.

#### Conservación y control

- Temperatura en °C.
- Humedad relativa en porcentaje.
- Cantidad total.
- Stock de seguridad.
- Lote.
- Vencimiento INVIMA.
- Vencimiento del producto.

#### Compra y proveedor

- Número de factura.
- Precio unitario.
- Proveedor seleccionado desde catálogo.
- Creación rápida de proveedor.

#### Documentos

- Archivo INVIMA.
- Archivo de factura.
- Indicador o archivo de ficha técnica.

### Listado observado

- Búsqueda por producto.
- Filtros por sede y tipo de producto.
- Columnas:
  - nombre comercial;
  - tipo de producto;
  - marca;
  - fecha de llegada;
  - fecha de vencimiento;
  - stock de seguridad;
  - cantidad total;
  - acciones.
- Semáforo de vencimiento:
  - cero a tres meses;
  - tres a seis meses;
  - seis meses o más.
- Acciones visuales para aumentar existencias, editar, duplicar/clonar y disminuir o retirar.
- El mismo producto puede aparecer en varias filas con fechas y lotes diferentes.

### Comparación con OdontoSpace

OdontoSpace ya registra nombre, SKU, cantidad, mínimos/máximos, fecha de vencimiento, proveedor, costo y ajustes simples. Faltan:

- catálogo de tipos de producto;
- marca, nombre genérico y principio activo;
- concentración, forma farmacéutica y presentación;
- clasificación de riesgo y registro sanitario;
- condiciones de temperatura y humedad;
- fecha de llegada y estado de recepción;
- lotes independientes;
- vencimiento INVIMA separado del vencimiento del lote/producto;
- documentos sanitarios, factura y ficha técnica;
- catálogo formal de proveedores;
- sede y ubicación física;
- historial de movimientos y usuario responsable;
- clonación segura de productos/lotes;
- alertas por ventanas de vencimiento configurables.

### Decisión de modelo

No se debe ampliar una única tabla de inventario con todos estos campos. El diseño debe separar:

1. **Producto maestro:** nombre, tipo, marca, principio activo, presentación, unidad, clasificación y registro sanitario.
2. **Lote o recepción:** producto, sede, proveedor, lote, llegada, cantidad, costo, factura, vencimientos y condiciones de recepción.
3. **Movimiento:** entrada, salida, consumo clínico, ajuste, traslado, devolución, pérdida o vencimiento.
4. **Proveedor:** identificación, contacto, estado y documentos.
5. **Documento:** INVIMA, factura, ficha técnica y otros anexos con tipo, versión y fecha.
6. **Ubicación:** sede, depósito, gabinete o consultorio.

Esta separación permite que un producto tenga múltiples lotes, costos y vencimientos sin duplicar su ficha técnica.

### Reglas sugeridas

- Descontar existencias por lote siguiendo FEFO (vence primero, sale primero), con confirmación del usuario.
- No eliminar movimientos; corregirlos mediante movimientos compensatorios auditados.
- Alertar por stock de seguridad, vencimiento cercano, lote vencido y documentación sanitaria vencida.
- Bloquear o advertir el consumo de lotes vencidos, retirados o en cuarentena.
- Guardar quién recibió, ajustó, trasladó o consumió cada unidad.
- Asociar consumo clínico a paciente/procedimiento solo cuando sea necesario y permitido.
- Mantener unidades coherentes: unidad comprada, unidad almacenada y unidad consumida.

### Prioridad sugerida

1. Producto maestro, lotes y kardex de movimientos.
2. Proveedores, compras/recepciones y costos.
3. Alertas de stock y vencimiento por lote.
4. Documentos sanitarios y condiciones de conservación.
5. Traslados entre sedes/ubicaciones.
6. Inventario valorizado y trazabilidad hacia procedimientos.

### Información pendiente de observar

- Catálogo completo de tipos de producto.
- Flujo y campos de edición/clonación.
- Significado exacto de cada acción del listado.
- Manejo de devoluciones, cuarentena, pérdidas y vencidos.
- Movimientos entre sedes y consultorios.
- Reportes de temperatura/humedad y cadena de frío.
- Permisos para recepción, ajuste, consumo y anulación.

## dt.dental — Bioseguridad

Capturas revisadas: 18 de agosto de 2026, entre 20:44 y 20:45.

El módulo observado contiene al menos dos áreas: control ambiental y gestión de residuos. La esterilización aparece en el menú, pero su flujo aún no fue revisado.

### Control de temperatura y humedad

Funciones observadas:

- Control mensual por sede.
- Selección del termohigrómetro o punto de medición.
- Selección de año y mes.
- Registro diario de temperatura en °C.
- Registro diario de humedad relativa en porcentaje.
- Varias mediciones por día.
- Identificación del responsable.
- Observaciones del periodo.
- Gráfica de temperatura.
- Gráfica de humedad.
- Generación de reporte.

Requisitos sugeridos:

- Catálogo de equipos de medición con código, ubicación, estado y calibración.
- Frecuencia configurable de mediciones.
- Rangos permitidos según ubicación o tipo de almacenamiento.
- Alertas ante valores fuera de rango o mediciones omitidas.
- Justificación y acción correctiva para desviaciones.
- Firma o confirmación del responsable administrativo.
- Histórico inmutable y exportación del reporte mensual.
- Relación futura con lotes o productos que requieran condiciones especiales.

### Gestión de residuos

Campos observados:

- Fecha y hora.
- Sede.
- Responsable.
- Tipo de residuo:
  - peligroso;
  - no peligroso.
- Clasificación.
- Residuo específico.
- Color de bolsa seleccionable:
  - blanca;
  - verde;
  - roja;
  - negra.
- Peso en kilogramos.
- Empresa de disposición.
- Disposición final:
  - tratamiento térmico con combustión/incineración;
  - tratamiento térmico sin combustión;
  - tratamiento químico;
  - aprovechamiento;
  - relleno sanitario;
  - celda o relleno de seguridad;
  - otros sistemas de tratamiento o disposición final.
- Observaciones.

### Modelo sugerido para residuos

- Catálogo versionado de tipos, clasificaciones y residuos.
- Catálogo de colores de bolsa, sin reglas rígidas hasta validar la normativa aplicable.
- Registro de generación con fecha, sede, área/consultorio, peso y responsable.
- Empresa gestora y datos de autorización.
- Recolección, entrega, transporte, tratamiento y disposición final.
- Manifiesto, certificado o soporte documental.
- Estado del registro y trazabilidad de correcciones.
- Consolidación mensual por tipo, clasificación, sede y peso.

### Permisos acordados

Los responsables y usuarios con capacidad de gestionar estos registros serán exclusivamente:

- administrador;
- personal administrativo.

Odontólogos y especialistas no podrán crear, editar, corregir ni eliminar registros de bioseguridad. Si posteriormente necesitan reportar una novedad desde el consultorio, se implementará como aviso dirigido al área administrativa, no como modificación directa del registro oficial.

Permisos propuestos:

| Acción | Administrador | Administrativo | Clínico |
| --- | --- | --- | --- |
| Consultar panel de bioseguridad | Sí | Sí | No |
| Registrar temperatura/humedad | Sí | Sí | No |
| Registrar residuos | Sí | Sí | No |
| Añadir observaciones/acciones correctivas | Sí | Sí | No |
| Generar reportes | Sí | Sí | No |
| Configurar equipos y catálogos | Sí | Según permiso delegado | No |
| Corregir registros cerrados | Solo mediante corrección auditada | Solo mediante corrección auditada | No |

### Comparación con OdontoSpace

Este módulo todavía no existe. El inventario actual almacena una temperatura y humedad asociadas al producto solo en el análisis futuro, pero no dispone de:

- controles ambientales periódicos;
- equipos de medición;
- gráficas;
- rangos y alertas;
- acciones correctivas;
- gestión de residuos;
- empresas gestoras;
- manifiestos o certificados;
- reportes de bioseguridad.

### Prioridad sugerida

1. Roles y permisos administrativos del módulo.
2. Catálogo de sedes, ubicaciones y equipos de medición.
3. Registro mensual de temperatura/humedad con alertas.
4. Catálogos y registro de residuos por peso.
5. Empresas gestoras, soportes y disposición final.
6. Reportes consolidados y trazabilidad de acciones correctivas.
7. Revisar el flujo de esterilización antes de diseñar ese submódulo.

### Información pendiente de observar y validar

- Flujo completo de esterilización.
- Número y horario exacto de mediciones diarias.
- Rangos aceptables y reglas por tipo de ambiente/producto.
- Catálogos completos de clasificación y residuos.
- Datos de empresas gestoras y soportes requeridos.
- Reglas regulatorias vigentes para separación por color.
- Contenido y formato de los reportes generados.

## dt.dental — Centro de configuración

Capturas revisadas: 18 de agosto de 2026, entre 21:21 y 21:22, más dos capturas adjuntas del mismo flujo.

> Los valores reales visibles en las capturas —identificación, dirección, correos y credenciales— no se transcriben en este documento. Solo se registran los nombres de los campos y requisitos funcionales.

### Áreas de configuración observadas

#### Empresa

- Datos generales de la empresa/consultorio.
- Sedes.

#### Agenda

- Agendas.
- Termohigrómetros.

#### Personal

- Especialización del empleado.
- Usuarios.
- Roles y permisos.

#### Clínico

- Tratamientos.
- Procedimientos.
- Consentimientos informados.
- Plantillas de evolución.
- Remisión a profesionales.
- Convenciones del odontograma.

#### Administrativo

- Empresas gestoras de residuos.
- Formas de pago.
- Tipos de egreso.
- Proveedores.
- Fuentes de captación (“cómo se enteró”).
- Formularios.
- Bancos.
- Convenios.
- Referidos.
- Integraciones contables.

#### Historia clínica

- Categorías de documentos.

### Configuración de empresa observada

#### Datos básicos

- Nombre.
- Dirección.
- Teléfono.
- Correo electrónico.
- Modalidad de generación de RIPS/FEV-RIPS.
- Indicador de funcionamiento como IPS.

#### Datos de facturación

- Razón social.
- NIT o documento.
- Personería o naturaleza jurídica.
- Tipo de ingreso/documento predeterminado, por ejemplo factura.

#### Datos SISPRO

- Tipo de usuario.
- Tipo y número de documento.
- NIT sin dígito de verificación.
- Credencial de acceso.

#### Impresión y notas

- Formato de impresión.
- Inclusión de detalles en recibo.
- Nota institucional al pie de los presupuestos.

#### Correo saliente

- Dirección remitente.
- Credencial o mecanismo de autenticación.
- Proveedor de correo.

#### IHCE

- Estado de configuración.
- Flujo para configurar credenciales de Interoperabilidad de la Historia Clínica Electrónica.

#### Identidad visual

- Logo del consultorio.
- Carga de PNG, JPG o SVG.
- Restricción de tamaño y recomendación de dimensiones.

### Comparación con OdontoSpace

OdontoSpace ya dispone parcialmente de:

- clínica y propietario;
- equipo, roles predefinidos y asignación de pacientes;
- catálogo de tratamientos;
- estado de integraciones de correo, WhatsApp, DIAN, RIPS e IA;
- variables de entorno para credenciales técnicas.

Faltan:

- centro unificado de configuración;
- perfil fiscal y administrativo de la organización;
- sedes;
- permisos granulares configurables;
- especialidades del personal;
- catálogos clínicos y administrativos reutilizables;
- plantillas y consentimientos versionados;
- configuración de impresión, recibos y presupuestos;
- identidad visual por clínica;
- configuración asistida y pruebas de conexión para SISPRO/IHCE/RIPS;
- auditoría de cambios de configuración.

### Arquitectura sugerida

Separar la configuración en cuatro niveles:

1. **Organización:** razón social, identificación, marca, contactos y políticas generales.
2. **Sede:** dirección, REPS/códigos aplicables, consultorios, agendas, equipos y responsables.
3. **Usuario:** rol, permisos, especialidad, sede y preferencias individuales.
4. **Integración:** proveedor, ambiente, identificadores, secretos, estado y última prueba.

Los catálogos deben pertenecer a la organización, con posibilidad de activación o alcance por sede.

### Seguridad de credenciales

- No guardar contraseñas SISPRO, correo o IHCE en texto plano.
- No devolver secretos completos al frontend después de guardarlos.
- Mostrar únicamente estado configurado, identificador no sensible y fecha de última actualización.
- Cifrar secretos con una clave externa al registro y prever rotación.
- Separar ambientes de pruebas y producción.
- Registrar quién creó, reemplazó, probó o desactivó una credencial.
- Incorporar botón de prueba de conexión sin revelar el secreto.
- Preferir OAuth, tokens o credenciales específicas de aplicación cuando el proveedor lo permita.
- Limitar configuración de secretos al propietario o administrador expresamente autorizado.
- Nunca incluir credenciales en logs, archivos HAR, reportes o respaldos sin cifrado.

### IHCE y RDA

IHCE significa Interoperabilidad de la Historia Clínica Electrónica. El Ministerio de Salud la enmarca actualmente en la Ley 2015 de 2020, la Resolución 866 de 2021 y la Resolución 1888 de 2025. El mecanismo intercambia Resúmenes Digitales de Atención (RDA) y utiliza estándares de interoperabilidad como HL7 FHIR.

Fuentes oficiales:

- https://www.minsalud.gov.co/ihce/Paginas/Normatividad.aspx
- https://minsalud.gov.co/ihce/Paginas/default.aspx
- https://www.minsalud.gov.co/ihce/rda/Paginas/inicio.aspx

Requisitos futuros para OdontoSpace:

- generar RDA con estructura y terminologías vigentes;
- validar datos obligatorios antes del envío;
- firmar/autenticar solicitudes según el mecanismo oficial;
- registrar envío, respuesta, identificador, estado y errores;
- soportar reintentos idempotentes;
- conservar auditoría de consulta e intercambio;
- aplicar controles de confidencialidad, integridad y acceso;
- evitar que la pantalla de credenciales se convierta en la integración completa: la interoperabilidad requiere un servicio técnico, validación y monitoreo.

### Permisos sugeridos

| Configuración | Propietario | Administrador delegado | Administrativo | Clínico |
| --- | --- | --- | --- | --- |
| Empresa, sedes e identidad | Sí | Sí | Consulta limitada | No |
| Usuarios, roles y permisos | Sí | Según delegación | No | No |
| Credenciales SISPRO/IHCE/RIPS | Sí | Según delegación expresa | No | No |
| Catálogos financieros | Sí | Sí | Sí | No |
| Catálogos clínicos | Sí | Sí | No | Consulta |
| Plantillas y consentimientos | Sí | Sí | No | Uso y propuesta, sin publicar cambios |
| Correo e integraciones | Sí | Sí | No | No |

### Prioridad sugerida

1. Organización, sedes e identidad visual.
2. Roles y permisos granulares.
3. Catálogos administrativos y clínicos.
4. Plantillas, consentimientos y categorías documentales.
5. Configuración segura de correo e integraciones.
6. Preparación técnica de RIPS/FEV-RIPS.
7. IHCE/RDA con pruebas, validación y acompañamiento especializado.

## dt.dental — Especialidades y empleados

Capturas revisadas: 18 de agosto de 2026, entre 21:25 y 21:26.

> Los nombres, documentos, teléfonos y correos visibles en las capturas no se transcriben ni se utilizan como datos de prueba.

### Catálogo de especialidades

Funciones observadas:

- Listado con código y nombre de la especialidad.
- Creación de nuevas especialidades.
- Consulta, edición y eliminación/desactivación.
- Asignación posterior al empleado.

Brecha en OdontoSpace:

- Actualmente solo se diferencia entre odontología general y especialista mediante el rol.
- Falta un catálogo de especialidades independiente del permiso de acceso.
- Falta soportar código, estado, vigencia y relación con uno o varios profesionales.

Decisión sugerida:

- **Rol** define lo que el usuario puede hacer.
- **Especialidad** describe su capacidad o formación profesional.
- **Cargo** describe su función laboral dentro de la clínica.
- No deben mezclarse estos tres conceptos en una sola lista.

### Directorio de empleados

Datos y funciones observados:

- Límite de usuarios asociado al plan contratado.
- Búsqueda por nombre o correo.
- Listado con:
  - iniciales/avatar;
  - nombre;
  - documento;
  - correo;
  - teléfono;
  - especialidad;
  - acciones de consulta, edición y desactivación.
- Creación de un nuevo empleado.

OdontoSpace ya dispone de equipo, roles básicos, activación/desactivación y límite implícito por propietario, pero falta:

- documento y tipo de documento del empleado;
- teléfono;
- especialidad formal;
- sede principal y sedes autorizadas;
- estado de invitación/activación;
- límites de plan y consumo de licencias;
- historial de cambios de acceso.

### Datos profesionales observados

- Correo electrónico.
- Especialización.
- Sede.
- Código del prestador de 12 caracteres para RIPS/SISPRO.
- Código de sede del prestador de 12 caracteres.
- Indicador de IPS.
- Rol asignado.
- Restricción visible de un rol funcional por usuario.

### Credenciales y firma

- Contraseña y confirmación.
- Carga de una imagen de firma del profesional.

Requisitos para OdontoSpace:

- Las contraseñas deben almacenarse únicamente mediante hash robusto; nunca cifradas de forma reversible ni visibles para administradores.
- Preferir invitación con enlace de un solo uso para que cada empleado cree su contraseña.
- Exigir cambio o activación segura al primer acceso.
- Incorporar recuperación, revocación de sesiones y, posteriormente, segundo factor.
- La imagen de una firma manuscrita debe almacenarse cifrada, con acceso restringido y registro de uso.
- Una imagen de firma no equivale automáticamente a una firma electrónica o digital con validez jurídica.
- Nunca insertar la firma en un documento sin acción/autorización verificable del profesional.
- Cada uso debe registrar documento, versión, usuario, fecha y contexto.
- Para documentos clínicos, la firma debe vincularse al contenido firmado para detectar modificaciones posteriores.

### Modelo sugerido

#### Empleado/usuario

- Identidad y contacto.
- Rol funcional principal.
- Permisos adicionales explícitos cuando sean necesarios.
- Cargo.
- Estado de acceso.
- Sede principal y sedes habilitadas.
- Profesional clínico sí/no.
- Códigos de prestador y sede cuando apliquen.
- Fecha de ingreso y retiro.

#### Especialidad

- Código interno/oficial cuando aplique.
- Nombre.
- Estado y vigencia.
- Fuente del catálogo.

#### Relación profesional-especialidad

- Profesional.
- Especialidad.
- Principal/secundaria.
- Registro, licencia o soporte cuando aplique.
- Fecha de vigencia.

### Reglas de permisos sugeridas

- Solo el propietario o administrador autorizado puede crear usuarios y modificar roles.
- El personal administrativo puede consultar el directorio operativo, pero no elevar sus propios permisos.
- Ningún usuario puede desactivar al último propietario/administrador activo.
- Los cambios de rol, sede, códigos y estado deben auditarse.
- Desactivar un usuario debe revocar sesiones activas sin borrar sus registros clínicos históricos.
- El profesional conserva autoría histórica aunque ya no pertenezca a la clínica.

### Información pendiente de observar

- Campos personales superiores del formulario de creación.
- Formulario de roles y permisos.
- Flujo de invitación o entrega de credenciales.
- Reglas exactas del límite de usuarios del plan.
- Formato y uso real de la firma cargada.
- Validación de códigos de prestador y sede.
- Manejo de profesionales que trabajan en varias sedes o tienen varias especialidades.
