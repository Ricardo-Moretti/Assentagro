import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import logoUrl from '@/assets/logo.png';

const AMARELO = rgb(0.96, 0.75, 0.1);
const PRETO = rgb(0, 0, 0);
const BRANCO = rgb(1, 1, 1);
const CINZA_CLARO = rgb(0.95, 0.95, 0.95);

interface TermoAsset {
  service_tag?: string;
  equipment_type?: string;
  model?: string;
  branch_name?: string;
}

interface TermoPdfData {
  colaborador_nome: string;
  colaborador_email?: string;
  tipo: string;
  responsavel: string;
  observacoes?: string;
  data_geracao: string;
  ativos: TermoAsset[];
}

export async function gerarPdfTermo(data: TermoPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const contentWidth = 595 - margin * 2;
  let y = 802;

  // --- Helper functions ---
  const drawText = (text: string, x: number, yPos: number, size: number, opts?: { bold?: boolean; color?: typeof PRETO }) => {
    page.drawText(text, {
      x,
      y: yPos,
      size,
      font: opts?.bold ? fontBold : font,
      color: opts?.color ?? PRETO,
    });
  };

  const drawRect = (x: number, yPos: number, w: number, h: number, fill: typeof PRETO, border?: typeof PRETO) => {
    page.drawRectangle({ x, y: yPos, width: w, height: h, color: fill });
    if (border) {
      page.drawRectangle({ x, y: yPos, width: w, height: h, borderColor: border, borderWidth: 0.5 });
    }
  };

  const drawCell = (x: number, yPos: number, w: number, h: number, text: string, opts?: {
    bold?: boolean; fontSize?: number; bg?: typeof PRETO; textColor?: typeof PRETO; align?: 'center' | 'left';
  }) => {
    const bg = opts?.bg ?? BRANCO;
    const textColor = opts?.textColor ?? PRETO;
    const fontSize = opts?.fontSize ?? 8;
    const f = opts?.bold ? fontBold : font;
    drawRect(x, yPos, w, h, bg, PRETO);
    const textWidth = f.widthOfTextAtSize(text, fontSize);
    const tx = opts?.align === 'center' ? x + (w - textWidth) / 2 : x + 4;
    drawText(text, tx, yPos + (h - fontSize) / 2, fontSize, { bold: opts?.bold, color: textColor });
  };

  // --- Load logo ---
  try {
    const logoBytes = await fetch(logoUrl).then((r) => r.arrayBuffer());
    const logoImage = await pdf.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.3);
    page.drawImage(logoImage, {
      x: margin,
      y: y - logoDims.height + 10,
      width: Math.min(logoDims.width, 180),
      height: Math.min(logoDims.height, 50),
    });
  } catch {
    // Logo not found, skip
  }

  // --- Header ---
  drawText('TERMO DE USO DE DISPOSITIVOS', margin + 200, y, 14, { bold: true });
  drawText('Equipamentos de Tecnologia da Informacao', margin + 200, y - 18, 10);
  y -= 55;

  // Yellow separator
  drawRect(margin, y, contentWidth, 3, AMARELO);
  y -= 15;

  // --- Info bar ---
  const infoCols = [
    { label: 'AREA', value: 'TI' },
    { label: 'CODIGO', value: 'TI-001' },
    { label: 'REVISAO', value: '01' },
    { label: 'CLASSIFICACAO', value: 'INTERNO' },
    { label: 'DISTRIBUICAO', value: 'DIGITAL' },
    { label: 'FOLHA', value: '1/1' },
  ];
  const colW = contentWidth / infoCols.length;
  infoCols.forEach((col, i) => {
    drawCell(margin + i * colW, y, colW, 20, `${col.label}: ${col.value}`, {
      fontSize: 6, bg: AMARELO, bold: true, align: 'center',
    });
  });
  y -= 30;

  // --- Dados do Colaborador ---
  drawCell(margin, y, contentWidth, 22, '  DADOS DO COLABORADOR', {
    bold: true, fontSize: 10, bg: PRETO, textColor: BRANCO,
  });
  y -= 22;

  drawCell(margin, y, 100, 20, ' Nome:', { bold: true, bg: CINZA_CLARO, fontSize: 8 });
  drawCell(margin + 100, y, contentWidth - 100, 20, ` ${data.colaborador_nome}`, { fontSize: 9 });
  y -= 20;

  drawCell(margin, y, 100, 20, ' Email:', { bold: true, bg: CINZA_CLARO, fontSize: 8 });
  drawCell(margin + 100, y, contentWidth - 100, 20, ` ${data.colaborador_email ?? '-'}`, { fontSize: 9 });
  y -= 20;

  drawCell(margin, y, 100, 20, ' Tipo Termo:', { bold: true, bg: CINZA_CLARO, fontSize: 8 });
  const tipoLabel = data.tipo === 'ENTREGA' ? 'Entrega de Equipamento' : data.tipo === 'DEVOLUCAO' ? 'Devolucao de Equipamento' : 'Troca de Equipamento';
  drawCell(margin + 100, y, contentWidth - 100, 20, ` ${tipoLabel}`, { fontSize: 9 });
  y -= 20;

  drawCell(margin, y, 100, 20, ' Responsavel:', { bold: true, bg: CINZA_CLARO, fontSize: 8 });
  drawCell(margin + 100, y, contentWidth - 100, 20, ` ${data.responsavel}`, { fontSize: 9 });
  y -= 30;

  // --- Equipamentos ---
  drawCell(margin, y, contentWidth, 22, '  ESPECIFICACAO DOS EQUIPAMENTOS', {
    bold: true, fontSize: 10, bg: PRETO, textColor: BRANCO,
  });
  y -= 22;

  // Table header
  const cols = [
    { label: 'Tipo', width: contentWidth * 0.2 },
    { label: 'Service Tag', width: contentWidth * 0.25 },
    { label: 'Modelo', width: contentWidth * 0.25 },
    { label: 'Filial', width: contentWidth * 0.3 },
  ];
  let cx = margin;
  cols.forEach((col) => {
    drawCell(cx, y, col.width, 18, ` ${col.label}`, { bold: true, bg: AMARELO, fontSize: 7, align: 'center' });
    cx += col.width;
  });
  y -= 18;

  // Table rows
  data.ativos.forEach((a) => {
    if (y < 120) return; // safety
    cx = margin;
    const vals = [
      a.equipment_type ?? '-',
      a.service_tag ?? '-',
      a.model ?? '-',
      a.branch_name ?? '-',
    ];
    vals.forEach((v, i) => {
      drawCell(cx, y, cols[i].width, 18, ` ${v}`, { fontSize: 7 });
      cx += cols[i].width;
    });
    y -= 18;
  });
  y -= 15;

  // --- Termo de responsabilidade ---
  drawCell(margin, y, contentWidth, 22, '  TERMO DE RESPONSABILIDADE', {
    bold: true, fontSize: 10, bg: PRETO, textColor: BRANCO,
  });
  y -= 28;

  const clausulas = [
    'O colaborador se responsabiliza pela guarda e conservacao do equipamento recebido.',
    'O equipamento devera ser utilizado exclusivamente para atividades da empresa.',
    'E proibido o emprestimo, aluguel ou cessao do equipamento a terceiros.',
    'E proibida a copia ou reproducao de documentos confidenciais.',
    'E proibida a instalacao de softwares sem autorizacao do departamento de TI.',
    'E proibido o uso do equipamento para fins pessoais.',
    'Qualquer defeito ou problema deve ser comunicado ao departamento de TI.',
    'Em caso de roubo, furto ou perda, o colaborador devera registrar BO em ate 24h.',
    'O colaborador esta ciente de que o equipamento pode ser monitorado.',
    'Em caso de dano por uso inadequado, o colaborador sera responsavel pelos custos.',
    'Ao encerrar o vinculo com a empresa, o equipamento devera ser devolvido imediatamente.',
  ];

  clausulas.forEach((c, i) => {
    if (y < 100) return;
    drawText(`${i + 1}. ${c}`, margin + 5, y, 7);
    y -= 12;
  });
  y -= 20;

  // --- Assinaturas ---
  const dataStr = new Date(data.data_geracao).toLocaleDateString('pt-BR');
  drawText(`Data de entrega: ${dataStr}`, margin, y, 9);
  y -= 40;

  // Signature lines
  const lineWidth = 200;
  const leftX = margin + 30;
  const rightX = margin + contentWidth - lineWidth - 30;

  page.drawLine({ start: { x: leftX, y }, end: { x: leftX + lineWidth, y }, thickness: 0.5, color: PRETO });
  page.drawLine({ start: { x: rightX, y }, end: { x: rightX + lineWidth, y }, thickness: 0.5, color: PRETO });

  drawText('Assinatura do Colaborador', leftX + 30, y - 14, 8);
  drawText('Responsavel TI', rightX + 55, y - 14, 8);
  y -= 35;

  // --- Footer ---
  const now = new Date().toLocaleString('pt-BR');
  drawText(`Documento gerado em ${now}`, margin, 20, 7, { color: rgb(0.5, 0.5, 0.5) });

  return pdf.save();
}
