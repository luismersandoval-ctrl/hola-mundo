const pdfEscape = (value) => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)')

const latin1 = (value) => new TextEncoder().encode(
  [...value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]
    .map((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) <= 126 ? character : '?')
    .join(''),
)

export function downloadMonthlyReportPdf({ clinicName, periodLabel, metrics, language = 'es' }) {
  const copy = language === 'en'
    ? { report: 'Monthly report', clinic: 'Clinic', generated: 'Generated on', filename: 'report' }
    : { report: 'Reporte mensual', clinic: 'Clínica', generated: 'Generado el', filename: 'reporte' }
  const commands = [
    '0.22 0.12 0.42 rg',
    'BT /F1 22 Tf 54 760 Td (OdontoSpace) Tj ET',
    '0.12 0.12 0.16 rg',
    `BT /F1 16 Tf 54 725 Td (${pdfEscape(`${copy.report} - ${periodLabel}`)}) Tj ET`,
    `BT /F1 10 Tf 54 705 Td (${pdfEscape(clinicName || copy.clinic)}) Tj ET`,
  ]
  metrics.forEach((metric, index) => {
    const y = 660 - index * 62
    commands.push('0.96 0.94 0.99 rg', `48 ${y - 18} 500 46 re f`, '0.22 0.12 0.42 rg')
    commands.push(`BT /F1 10 Tf 62 ${y + 8} Td (${pdfEscape(metric.label)}) Tj ET`)
    commands.push('0.08 0.08 0.12 rg', `BT /F1 16 Tf 62 ${y - 10} Td (${pdfEscape(metric.value)}) Tj ET`)
  })
  commands.push('0.35 0.35 0.4 rg', `BT /F1 8 Tf 54 68 Td (${pdfEscape(`${copy.generated} ${new Date().toLocaleString(language === 'en' ? 'en-US' : 'es-CO')}`)}) Tj ET`)

  const stream = commands.join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${latin1(stream).length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ]
  let pdfDocument = '%PDF-1.4\n%OdontoSpace\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(latin1(pdfDocument).length)
    pdfDocument += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = latin1(pdfDocument).length
  pdfDocument += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => { pdfDocument += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdfDocument += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const blob = new Blob([latin1(pdfDocument)], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${copy.filename}-odontospace-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`
  link.click()
  URL.revokeObjectURL(link.href)
}
