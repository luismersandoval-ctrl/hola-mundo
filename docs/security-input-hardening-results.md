# Informe de implementación: endurecimiento de entradas

Fecha: 19 de agosto de 2026  
Branch: `security/input-hardening`

## Alcance implementado

- Frontera Pydantic reutilizable con rechazo de campos desconocidos, bytes nulos, controles peligrosos, estructuras profundas y colecciones excesivas.
- Tipos compartidos para identidad, contacto, fechas, dinero, cantidades, estados, roles y textos clínicos.
- Validadores estructurales para odontograma, periodontograma, fórmulas, superficies, firmas y archivos diagnósticos.
- Identificadores SQL dinámicos de migración confinados a listas permitidas; consultas de negocio mediante ORM o parámetros.
- Límites de paginación, duración de citas en múltiplos de 15 minutos, numeración FDI y rangos de inventario/dinero.
- CORS configurable, métodos/cabeceras restringidos, cabeceras HTTP defensivas y límites de solicitudes.
- Verificación de extensión, MIME y firma binaria para JPG, PNG, WebP, PDF y DICOM.
- Límites y normalizadores compartidos en formularios frontend, con rechazo coherente de errores 422.
- Dependencias auditadas y actualizadas sin `--force` hasta obtener cero vulnerabilidades conocidas en `npm audit`.

## Pruebas y resultados

| Suite | Resultado |
| --- | --- |
| Pytest unitarias, integración y seguridad | 21 aprobadas, 0 fallidas |
| Cobertura backend | 62% global; esquemas 98%; modelos seguros 86% |
| Playwright E2E | 3 aprobadas, 0 fallidas |
| ESLint | Aprobado |
| Build Vite de producción | Aprobado |
| Auditoría npm | 0 vulnerabilidades |
| Regresión SQLite | Conteos antes/después idénticos; integridad `ok` |
| Revisión estática SQL | Aprobada; SQL interpolado limitado al módulo interno con allowlist |
| `git diff --check` | Aprobado |

Las pruebas se ejecutaron contra bases SQLite temporales. La regresión utilizó una copia desechable del respaldo y no modificó la base real.

## Respaldo

Los respaldos locales previos a la implementación permanecen fuera de Git en:

- `backups/security-input-hardening-20260819/backend-clinica.db`
- `backups/security-input-hardening-20260819/root-clinica.db`

## Riesgos residuales

- La cobertura global está condicionada por el tamaño monolítico de `backend/main.py`; los validadores y contratos nuevos tienen cobertura alta, pero quedan rutas de negocio antiguas sin automatización exhaustiva.
- El rate limiting de login debe implementarse preferentemente en el proxy/API gateway o mediante un almacenamiento compartido; un contador en memoria no protegería despliegues con múltiples procesos.
- Los estudios DICOM se validan por preámbulo estándar `DICM`; archivos DICOM válidos sin ese preámbulo se rechazarán de forma conservadora.
- Vite informa un bundle principal mayor de 500 kB; es rendimiento, no un fallo de seguridad.
- FastAPI y `datetime.utcnow()` emiten advertencias de deprecación bajo Python 3.14; no afectan el resultado actual y conviene resolverlas en una migración separada.

## Operación recomendada

- Definir explícitamente `SECRET_KEY`, `ADMIN_PASSWORD`, `CORS_ALLOWED_ORIGINS` y credenciales SMTP por entorno.
- Mantener límites equivalentes en el proxy inverso y almacenamiento externo para archivos en producción.
- Añadir el pipeline de pytest, Playwright, lint, build y auditoría de dependencias como controles obligatorios del PR.
