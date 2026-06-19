export type PdfLine = {
  label?: string
  value: string | null | undefined
}

function toUtf16Hex(text: string) {
  const bytes: string[] = []
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    bytes.push(code.toString(16).padStart(4, '0'))
  }
  return bytes.join('').toUpperCase()
}

function safeText(value: string | null | undefined) {
  return String(value || '-').replace(/\r/g, '').split('\n').join(' / ')
}

function pdfTextLine(x: number, y: number, text: string, size = 11) {
  return `BT /F1 ${size} Tf ${x} ${y} Td <${toUtf16Hex(text)}> Tj ET`
}

export function createContractPdfBuffer(title: string, lines: PdfLine[]) {
  const pageLines = [
    pdfTextLine(54, 780, title, 18),
    pdfTextLine(54, 754, `作成日: ${new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}`, 10),
    pdfTextLine(54, 734, 'このPDFはAI秘書で作成した送付準備用の契約書ドラフトです。自動送信はしていません。', 9),
    ...lines.slice(0, 34).map((line, index) => {
      const label = line.label ? `${line.label}: ` : ''
      return pdfTextLine(54, 704 - index * 18, `${label}${safeText(line.value)}`, 10)
    }),
  ]

  const stream = pageLines.join('\n')
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UCS2-H /DescendantFonts [6 0 R] >>\nendobj',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'binary')} >>\nstream\n${stream}\nendstream\nendobj`,
    '6 0 obj\n<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 5 >> /FontDescriptor 7 0 R >>\nendobj',
    '7 0 obj\n<< /Type /FontDescriptor /FontName /HeiseiKakuGo-W5 /Flags 4 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>\nendobj',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'binary'))
    pdf += `${object}\n`
  }
  const xrefOffset = Buffer.byteLength(pdf, 'binary')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf, 'binary')
}
