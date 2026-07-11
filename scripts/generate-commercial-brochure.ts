#!/usr/bin/env npx tsx
/**
 * Genera PDF comercial con gráficos de ejemplo para prospectos.
 * Uso: npm run docs:brochure
 * Salida: docs/ScoreOps-Resumen-Comercial.pdf
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const OUT = join(process.cwd(), "docs", "ScoreOps-Resumen-Comercial.pdf");

const BRAND = {
  name: "Vertia ScoreOps",
  tagline: "Puntajes, tareas y premio a la productividad",
  primary: [91, 74, 224] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  slate: [100, 116, 139] as [number, number, number],
};

type RGB = [number, number, number];

function footer(doc: jsPDF) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.slate);
  doc.text(
    "Vertia ScoreOps — Material comercial · Datos ilustrativos · vertia.com.ar",
    14,
    h - 8
  );
  doc.text(
    `Pág. ${doc.getNumberOfPages()}`,
    doc.internal.pageSize.getWidth() - 28,
    h - 8
  );
}

function pageTitle(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 14, 26);
  }
  doc.setTextColor(0, 0, 0);
}

function drawBarChart(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    labels: string[];
    values: number[];
    colors?: RGB[];
    maxValue?: number;
    suffix?: string;
  }
) {
  const { x, y, w, h, title, labels, values, suffix = "%" } = opts;
  const colors = opts.colors ?? labels.map((_, i) => {
    const palette: RGB[] = [BRAND.primary, BRAND.emerald, BRAND.amber, [59, 130, 246], [168, 85, 247]];
    return palette[i % palette.length];
  });
  const max = opts.maxValue ?? Math.max(...values, 1) * 1.15;
  const barW = (w - 20) / values.length - 8;
  const chartBottom = y + h - 24;

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(title, x, y + 8);

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(x, chartBottom, x + w, chartBottom);

  for (let g = 0; g <= 4; g++) {
    const gy = chartBottom - (h - 40) * (g / 4);
    doc.setDrawColor(235, 235, 235);
    doc.line(x, gy, x + w, gy);
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.slate);
    doc.text(String(Math.round((max * g) / 4)), x - 2, gy + 2, { align: "right" });
  }

  labels.forEach((label, i) => {
    const barH = ((values[i] ?? 0) / max) * (h - 40);
    const bx = x + 16 + i * (barW + 8);
    const by = chartBottom - barH;
    doc.setFillColor(...colors[i]);
    doc.roundedRect(bx, by, barW, barH, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(`${values[i]}${suffix}`, bx + barW / 2, by - 3, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.slate);
    const short = label.length > 12 ? `${label.slice(0, 11)}…` : label;
    doc.text(short, bx + barW / 2, chartBottom + 8, { align: "center" });
  });
}

function drawHorizontalBars(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    w: number;
    title: string;
    rows: { label: string; value: number; color?: RGB }[];
    maxValue?: number;
    suffix?: string;
  }
) {
  const { x, y, w, title, rows, suffix = "%" } = opts;
  const max = opts.maxValue ?? Math.max(...rows.map((r) => r.value), 1);
  const rowH = 14;

  doc.setFontSize(11);
  doc.text(title, x, y);
  let cy = y + 10;

  rows.forEach((row) => {
    const barMaxW = w - 90;
    const barW = (row.value / max) * barMaxW;
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(row.label, x, cy + 8);
    doc.setFillColor(...(row.color ?? BRAND.primary));
    doc.roundedRect(x + 72, cy + 2, barW, 8, 1, 1, "F");
    doc.text(`${row.value}${suffix}`, x + 72 + barW + 4, cy + 8);
    cy += rowH;
  });
}

function drawDonut(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  segments: { label: string; value: number; color: RGB }[]
) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let angle = -Math.PI / 2;
  segments.forEach((seg) => {
    const sweep = (seg.value / total) * Math.PI * 2;
    doc.setFillColor(...seg.color);
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const a1 = angle + (sweep * i) / steps;
      const a2 = angle + (sweep * (i + 1)) / steps;
      doc.triangle(
        cx,
        cy,
        cx + r * Math.cos(a1),
        cy + r * Math.sin(a1),
        cx + r * Math.cos(a2),
        cy + r * Math.sin(a2),
        "F"
      );
    }
    angle += sweep;
  });
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, r * 0.55, "F");
}

function coverPage(doc: jsPDF) {
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(24, 48, 48, 48, 8, 8, "F");
  doc.setTextColor(...BRAND.primary);
  doc.setFontSize(22);
  doc.text("VS", 36, 78);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text(BRAND.name, 24, 120);
  doc.setFontSize(14);
  doc.text(BRAND.tagline, 24, 132);

  doc.setFontSize(11);
  doc.text("Resumen ejecutivo para cooperativas y equipos operativos", 24, 155);
  doc.setFontSize(9);
  doc.text("Material comercial · Gráficos con datos de ejemplo", 24, 168);
  doc.text(new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long" }), 24, 178);

  doc.setFillColor(255, 255, 255, 0.15);
  doc.roundedRect(24, 200, 162, 52, 4, 4, "F");
  doc.setFontSize(10);
  doc.text("Unifica tareas, KPIs, asistencia y premio semestral", 32, 218);
  doc.text("en una plataforma transparente y configurable.", 32, 228);
}

function summaryPage(doc: jsPDF) {
  doc.addPage();
  pageTitle(doc, "Resumen ejecutivo", "Qué resuelve ScoreOps para su organización");

  const bullets = [
    "Gestión operativa: tableros Kanban, prioridades, plazos y eficiencia temporal.",
    "Objetivos y KPIs con seguimiento en tiempo real por persona y por área.",
    "Asistencia y presentismo integrados al cálculo del premio semestral.",
    "Motor de reglas configurable: Art. 49 cooperativo, bono por KPI o solo métricas.",
    "Transparencia para el empleado: explicación del premio y comparación con el equipo.",
    "Vista gerencial y ejecutiva con alertas, simulador y exportación PDF/Excel.",
    "Multi-organización: cada cooperativa con marca propia y datos aislados.",
    "API e integración RRHH para sincronizar empleados con sistemas existentes.",
  ];

  doc.setFontSize(10);
  let y = 44;
  bullets.forEach((b) => {
    doc.setFillColor(...BRAND.emerald);
    doc.circle(18, y - 2.5, 1.5, "F");
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(b, 175);
    doc.text(lines, 24, y);
    y += lines.length * 5 + 6;
  });

  doc.setFontSize(9);
  doc.setTextColor(...BRAND.slate);
  doc.text(
    "Mensaje clave: el empleado participa de su evaluación; gerencia interviene con datos, no con planillas.",
    14,
    y + 8,
    { maxWidth: 180 }
  );

  footer(doc);
}

function chartsPage1(doc: jsPDF) {
  doc.addPage();
  pageTitle(doc, "Indicadores del equipo", "Ejemplo — KPI y premio por área");

  drawBarChart(doc, {
    x: 14,
    y: 38,
    w: 90,
    h: 95,
    title: "KPI promedio por área",
    labels: ["Técnica", "Comercial", "Admin.", "Atención"],
    values: [82, 76, 88, 71],
  });

  drawBarChart(doc, {
    x: 110,
    y: 38,
    w: 90,
    h: 95,
    title: "Premio semestral prom. (% sueldo)",
    labels: ["Técnica", "Comercial", "Admin.", "Atención"],
    values: [45, 38, 50, 32],
    colors: [
      [168, 85, 247],
      [59, 130, 246],
      BRAND.emerald,
      BRAND.amber,
    ],
  });

  drawHorizontalBars(doc, {
    x: 14,
    y: 148,
    w: 186,
    title: "Ranking premio semestral — Top 5 (Art. 49)",
    rows: [
      { label: "García M.", value: 50, color: BRAND.emerald },
      { label: "López A.", value: 45, color: BRAND.primary },
      { label: "Ruiz C.", value: 42, color: BRAND.primary },
      { label: "Díaz P.", value: 35, color: BRAND.amber },
      { label: "Méndez S.", value: 30, color: BRAND.slate },
    ],
  });

  footer(doc);
}

function chartsPage2(doc: jsPDF) {
  doc.addPage();
  pageTitle(doc, "Evolución y operaciones", "Ejemplo — comparación semestral y carga de trabajo");

  drawBarChart(doc, {
    x: 14,
    y: 38,
    w: 115,
    h: 88,
    title: "Comparación semestre anterior vs actual (KPI %)",
    labels: ["S1 ant.", "S1 act.", "S2 ant.", "S2 act."],
    values: [74, 81, 78, 85],
    maxValue: 100,
  });

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("Tareas por estado (equipo)", 138, 46);

  drawDonut(doc, 168, 78, 28, [
    { label: "Completadas", value: 142, color: BRAND.emerald },
    { label: "En proceso", value: 38, color: [59, 130, 246] },
    { label: "Pendientes", value: 24, color: BRAND.slate },
    { label: "En revisión", value: 8, color: BRAND.amber },
  ]);

  let ly = 108;
  [
    { label: "Completadas", color: BRAND.emerald, n: 142 },
    { label: "En proceso", color: [59, 130, 246] as RGB, n: 38 },
    { label: "Pendientes", color: BRAND.slate, n: 24 },
    { label: "En revisión", color: BRAND.amber, n: 8 },
  ].forEach((item) => {
    doc.setFillColor(...item.color);
    doc.rect(132, ly, 4, 4, "F");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(`${item.label}: ${item.n}`, 138, ly + 3.5);
    ly += 8;
  });

  doc.setFontSize(11);
  doc.text("Desglose premio Art. 49 — empleado ejemplo (50% máx.)", 14, 138);

  const tramos = [
    { id: "a) Base 30%", on: true, w: 30 },
    { id: "b) Asist. 5%", on: true, w: 5 },
    { id: "c) Repar. 5%", on: true, w: 5 },
    { id: "d) Pulsos 5%", on: true, w: 5 },
    { id: "e) Cobran. 5%", on: true, w: 5 },
  ];
  let tx = 14;
  const ty = 148;
  tramos.forEach((t, i) => {
    const colors: RGB[] = [BRAND.primary, BRAND.emerald, [59, 130, 246], BRAND.amber, [168, 85, 247]];
    const fill: RGB = t.on ? colors[i] : [220, 220, 220];
    doc.setFillColor(...fill);
    const bw = t.w * 4.2;
    doc.roundedRect(tx, ty, bw, 14, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(t.on ? 255 : 100, t.on ? 255 : 100, t.on ? 255 : 100);
    doc.text(t.id, tx + 2, ty + 9);
    tx += bw + 2;
  });
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.emerald);
  doc.text("Total acumulado: 50% del sueldo de referencia", 14, ty + 22);

  footer(doc);
}

function modulesPage(doc: jsPDF) {
  doc.addPage();
  pageTitle(doc, "Módulos principales", "Plataforma web · Roles: empleado, gerente, administración");

  autoTable(doc, {
    startY: 40,
    head: [["Módulo", "Beneficio para la cooperativa"]],
    body: [
      ["Tableros y tareas", "Visibilidad de carga, vencimientos y eficiencia temporal"],
      ["Objetivos / KPIs", "Metas medibles con avance y alertas de riesgo"],
      ["Mi asistencia", "Presentismo vinculado al premio y al Art. 49"],
      ["Premio y simulador", "Cálculo automático y escenarios «qué pasa si…»"],
      ["Aprobaciones", "Workflows de cierre de tareas y ajuste de KPIs"],
      ["Dashboard ejecutivo", "Salud operativa, PDF para directorio"],
      ["Benchmark interno", "Comparación persona vs área vs organización"],
      ["API / RRHH", "Integración con nómina y sistemas externos"],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND.primary },
    columnStyles: { 0: { cellWidth: 48, fontStyle: "bold" } },
  });

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  doc.setFillColor(245, 243, 255);
  doc.roundedRect(14, y, 182, 36, 4, 4, "F");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text("Próximo paso", 22, y + 12);
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(
    "Demo personalizada con datos de su cooperativa · Implementación on-premise o en su infraestructura",
    22,
    y + 22,
    { maxWidth: 168 }
  );
  doc.text("Contacto: Vertia — ScoreOps", 22, y + 32);

  footer(doc);
}

function main() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  coverPage(doc);
  summaryPage(doc);
  chartsPage1(doc);
  chartsPage2(doc);
  modulesPage(doc);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, Buffer.from(doc.output("arraybuffer")));
  console.log(`✓ PDF generado: ${OUT}`);
}

main();
