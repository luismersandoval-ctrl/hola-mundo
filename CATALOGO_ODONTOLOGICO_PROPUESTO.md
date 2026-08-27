# Catálogo odontológico propuesto

Transcripción normalizada del catálogo suministrado el 18 de agosto de 2026.

> Estado: **pendiente de validación oficial y versionado**. Este documento sirve para diseño y revisión; no debe utilizarse todavía para facturación, RIPS ni decisiones clínicas automatizadas.

## Diagnósticos CIE-10

Se conserva el código usado habitualmente en intercambios colombianos sin punto y se añade su presentación canónica para interfaz.

| Código recibido | Presentación | Descripción recibida normalizada |
| --- | --- | --- |
| K020 | K02.0 | Caries limitada al esmalte |
| K021 | K02.1 | Caries de la dentina |
| K022 | K02.2 | Caries del cemento |
| K023 | K02.3 | Caries dentaria detenida |
| K024 | K02.4 | Odontoclasia |
| K028 | K02.8 | Otras caries dentales |
| K029 | K02.9 | Caries dental, no especificada |
| K040 | K04.0 | Pulpitis |
| K041 | K04.1 | Necrosis de la pulpa |
| K043 | K04.3 | Periodontitis apical aguda originada en la pulpa |
| K044 | K04.4 | Periodontitis apical crónica |
| K045 | K04.5 | Absceso periapical con fístula |
| K046 | K04.6 | Absceso periapical sin fístula |
| K050 | K05.0 | Gingivitis aguda |
| K051 | K05.1 | Gingivitis crónica |
| K052 | K05.2 | Periodontitis aguda |
| K053 | K05.3 | Periodontitis crónica |
| K054 | K05.4 | Periodontitis crónica **[descripción por verificar]** |
| K055 | K05.5 | Otras enfermedades periodontales |
| K056 | K05.6 | Enfermedad del periodonto, no especificada |
| K060 | K06.0 | Retracción gingival |
| K061 | K06.1 | Hiperplasia gingival |
| K073 | K07.3 | Anomalías de la posición del diente |
| K074 | K07.4 | Maloclusión de tipo no especificado |
| K075 | K07.5 | Anomalías dentofaciales funcionales |
| K076 | K07.6 | Trastornos de la articulación temporomaxilar |
| K081 | K08.1 | Pérdida de dientes por accidente, extracción o enfermedad periodontal |
| K103 | K10.3 | Alveolitis del maxilar |
| R196 | R19.6 | Halitosis |

## Procedimientos CUPS — Consultas odontológicas

Estos códigos venían incluidos bajo el encabezado CIE, pero corresponden a procedimientos CUPS.

| Código | Descripción |
| --- | --- |
| 890203 | Consulta de primera vez por odontología general |
| 890303 | Consulta de control o seguimiento por odontología general |
| 890403 | Interconsulta por odontología general |
| 890703 | Consulta de urgencias por odontología general |

## Procedimientos CUPS — Endodoncia

| Código | Descripción |
| --- | --- |
| 237100 | Pulpotomía SOD |
| 237102 | Pulpotomía con pulpectomía |
| 237300 | Terapia de conducto radicular SOD |
| 237503 | Recubrimiento pulpar directo |
| 237504 | Recubrimiento pulpar indirecto |

## Procedimientos CUPS — Operatoria

| Código | Descripción |
| --- | --- |
| 232101 | Obturación dental por superficie con amalgama |
| 232102 | Obturación dental por superficie con resina de fotocurado |
| 232103 | Obturación dental por superficie con ionómero de vidrio |
| 232200 | Obturación temporal por diente |
| 232401 | Reconstrucción de ángulo incisal con resina de fotocurado |
| 232402 | Reconstrucción de tercio incisal con resina de fotocurado |

## Procedimientos CUPS — Promoción y prevención

| Código recibido | Descripción |
| --- | --- |
| 990203 | Educación individual en salud por odontología |
| 990212 | Educación individual en salud por higiene oral |
| 997102 | Aplicación de sellantes de fotocurado |
| 997103 | Topicación de flúor en gel |
| 997105 | Aplicación de resina preventiva |
| 997300 | Detartraje supragingival **[código por verificar; fuente oficial consultable muestra 997301]** |
| 997310 | Control de placa dental NCOC |
| 997500 | Profilaxis dental |

## Procedimientos CUPS — Odontopediatría

| Código | Descripción |
| --- | --- |
| 230200 | Exodoncia de dientes temporales SOD |
| 230201 | Exodoncia de dientes temporales unirradiculares |
| 230202 | Exodoncia de dientes temporales multirradiculares |

## Procedimientos CUPS — Periodoncia y cirugía oral

| Código | Descripción |
| --- | --- |
| 230100 | Exodoncia de dientes permanentes SOD |
| 230101 | Exodoncia de dientes permanentes unirradiculares |
| 230102 | Exodoncia de dientes permanentes multirradiculares |
| 231100 | Exodoncia quirúrgica unirradicular |
| 231200 | Exodoncia quirúrgica multirradicular |
| 240600 | Drenaje de abscesos periodontales |
| 247401 | Ferulización rígida (superior y/o inferior) |
| 247402 | Ferulización semirrígida (superior y/o inferior) |

## Observaciones de calidad

1. `K054` repite “periodontitis crónica”, ya asignada a `K053`; debe cotejarse con la tabla CIE-10 adoptada para el intercambio colombiano.
2. El detartraje recibido como `997300` debe verificarse: POS Pópuli del Ministerio muestra `997301` para detartraje supragingival.
3. Las expresiones `SOD` y `NCOC` se conservan porque hacen parte de la denominación recibida; deben mantenerse como calificadores del catálogo, no como texto libre.
4. CIE-10 representa diagnósticos; CUPS representa consultas y procedimientos. No deben almacenarse en una sola columna o tabla sin identificar el sistema de codificación.
5. El catálogo CUPS es dinámico. Cada importación debe conservar resolución, versión, vigencia desde/hasta y estado activo/inactivo.

## Fuentes oficiales para validación

- POS Pópuli — búsqueda de procedimientos CUPS: https://pospopuli.minsalud.gov.co/pospopuliweb/paginas/HomeProcedimientos.aspx
- Ministerio de Salud — actualizaciones de CUPS y beneficios: https://www.minsalud.gov.co/salud/POS/Paginas/resultados-pos.aspx
- Ministerio de Salud — Resolución 3280 de 2018: https://www.minsalud.gov.co/Normatividad_Nuevo/Resoluci%C3%B3n%20No.%203280%20de%2020183280.pdf

