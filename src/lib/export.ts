import type { EmployeeProductivityExtended } from "./employee-stats";
import { BRAND } from "./brand";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type ReportEmployee = EmployeeProductivityExtended;

export function buildExcelReport(
  resumen: {
    totalEmpleados: number;
    kpiPromedioEquipo: number;
    eficienciaPromedioEquipo: number;
    tareasCompletadas: number;
    puntajePremioPromedio?: number;
  },
  empleados: ReportEmployee[]
): Buffer {
  const wb = XLSX.utils.book_new();

  const resumenData = [
    [`Informe de Productividad — ${BRAND.exportHeader}`],
    ["Fecha", new Date().toLocaleDateString("es-ES")],
    [],
    ["Resumen del equipo"],
    ["Empleados activos", resumen.totalEmpleados],
    ["Cumplimiento KPI promedio", `${resumen.kpiPromedioEquipo}%`],
    ["Eficiencia temporal promedio", `${resumen.eficienciaPromedioEquipo}%`],
    ["Tareas completadas", resumen.tareasCompletadas],
    ["Premio Art.49 promedio (% sueldo)", resumen.puntajePremioPromedio ?? "—"],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  const detalle = empleados.map((e) => {
    const a = e.productivityBonus.art49;
    const tramo = (id: "a" | "b" | "c" | "d" | "e") =>
      a?.tramos.find((t) => t.id === id)?.activo ? "Sí" : "No";
    return {
      Empleado: `${e.nombre} ${e.apellido}`,
      Área: e.area,
      "KPI %": e.kpiPromedio,
      "Eficiencia evaluable %": e.productivityBonus.eficienciaEvaluable,
      "Sueldo referencia": a?.sueldoReferencia ?? "—",
      "Tramo a (30%)": a ? tramo("a") : "—",
      "Tramo b (5%)": a ? tramo("b") : "—",
      "Tramo c (5%)": a ? tramo("c") : "—",
      "Tramo d (5%)": a ? tramo("d") : "—",
      "Tramo e (5%)": a ? tramo("e") : "—",
      "Premio % sueldo": e.productivityBonus.puntajePremio,
      "Premio $": a?.montoTotal ?? "—",
      "Impunt. leves": a?.impuntualidadesLeves ?? "—",
      "Faltas injust.": a?.inasistenciasInjustificadas ?? "—",
    };
  });
  const wsDetalle = XLSX.utils.json_to_sheet(detalle);
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Empleados");

  const kpiRows = empleados.flatMap((e) =>
    e.kpiCompliance.map((k) => ({
      Empleado: `${e.nombre} ${e.apellido}`,
      KPI: k.nombre,
      Actual: k.valorActual,
      Meta: k.valorMeta,
      Unidad: k.unidad,
      "Cumplimiento %": Math.round(k.cumplimiento),
    }))
  );
  if (kpiRows.length > 0) {
    const wsKpis = XLSX.utils.json_to_sheet(kpiRows);
    XLSX.utils.book_append_sheet(wb, wsKpis, "KPIs");
  }

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export function buildPdfReport(
  resumen: {
    totalEmpleados: number;
    kpiPromedioEquipo: number;
    eficienciaPromedioEquipo: number;
    tareasCompletadas: number;
    puntajePremioPromedio?: number;
  },
  empleados: ReportEmployee[]
): Buffer {
  const doc = new jsPDF({ orientation: "landscape" });
  const fecha = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  doc.setFontSize(18);
  doc.text("Informe de Productividad", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${BRAND.exportFooter} | ${fecha}`, 14, 28);

  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text("Resumen del equipo", 14, 40);
  doc.setFontSize(10);
  doc.text(`Empleados: ${resumen.totalEmpleados}`, 14, 48);
  doc.text(`KPI promedio: ${resumen.kpiPromedioEquipo}%`, 14, 54);
  doc.text(`Premio Art.49 promedio: ${resumen.puntajePremioPromedio ?? "—"}%`, 14, 60);

  autoTable(doc, {
    startY: 68,
    head: [
      [
        "Empleado",
        "Área",
        "KPI",
        "a",
        "b",
        "c",
        "d",
        "e",
        "Premio %",
        "Premio $",
      ],
    ],
    body: empleados.map((e) => {
      const a = e.productivityBonus.art49;
      const tr = (id: "a" | "b" | "c" | "d" | "e") =>
        a?.tramos.find((t) => t.id === id)?.activo ? "✓" : "—";
      return [
        `${e.nombre} ${e.apellido}`,
        e.area,
        `${e.kpiPromedio}%`,
        a ? tr("a") : "—",
        a ? tr("b") : "—",
        a ? tr("c") : "—",
        a ? tr("d") : "—",
        a ? tr("e") : "—",
        `${e.productivityBonus.puntajePremio}%`,
        a && a.montoTotal > 0 ? `$${a.montoTotal}` : "—",
      ];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [109, 40, 217] },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

export function buildExecutivePdfReport(report: import("./executive-stats").ExecutiveReport): Buffer {
  const doc = new jsPDF();
  const fecha = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  doc.setFontSize(18);
  doc.text("Informe ejecutivo semanal", 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(report.organizationName, 14, 28);
  doc.setFontSize(9);
  doc.text(`${report.periodo.label} · ${fecha} · ${BRAND.exportFooter}`, 14, 34);

  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(`Salud operativa: ${report.salud.score}/100 (${report.salud.etiqueta})`, 14, 46);
  doc.setFontSize(10);

  const r = report.resumen;
  const p = report.pipeline;
  const q = report.calidadTareas;
  const lines = [
    `Empleados activos: ${r.empleadosActivos} · Áreas: ${r.areas}`,
    `KPI promedio: ${r.kpiPromedioOrg}% · Eficiencia: ${r.eficienciaPromedioOrg}% · Premio: ${r.premioPromedioOrg}%`,
    `Pipeline: ${p.pendientes} pend. · ${p.enProceso} en proceso · ${p.enAprobacion} en revisión · ${p.completadas} hechas`,
    `Abiertas: ${p.abiertas} · Vencidas: ${p.vencidas} · Alta prioridad: ${p.altaPrioridadAbiertas}`,
    `Puntualidad: ${q.puntualidadPct}% · Eficiencia temporal: ${q.eficienciaTemporalPct}%`,
    `Objetivos activos: ${r.objetivosActivos} · En riesgo: ${r.objetivosEnRiesgo}`,
    `Plantilla premio: ${report.plantillaPremio.nombre}`,
  ];
  lines.forEach((line, i) => doc.text(line, 14, 54 + i * 6));

  let y = 54 + lines.length * 6 + 8;

  if (report.porArea.length > 0) {
    doc.setFontSize(12);
    doc.text("Equipos / áreas", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [
        [
          "Área",
          "Emp.",
          "KPI",
          "Efic.",
          "Abiertas",
          "Venc.",
          "Hechas",
          "Puntual.",
        ],
      ],
      body: report.porArea.map((a) => [
        a.nombre,
        String(a.empleados),
        `${a.kpiPromedio}%`,
        `${a.eficienciaPromedio}%`,
        String(a.tareasAbiertas),
        String(a.tareasVencidas),
        String(a.tareasCompletadas),
        `${a.puntualidadPct}%`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 118, 110] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text("Personas", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [
      [
        "Empleado",
        "Área",
        "KPI",
        "Abiertas",
        "Venc.",
        "Hechas",
        "Puntual.",
        "Alerta",
      ],
    ],
    body: report.porPersona.map((p) => [
      `${p.nombre} ${p.apellido}`,
      p.area,
      `${p.kpiPromedio}%`,
      String(p.tareasAbiertas),
      String(p.tareasVencidas),
      String(p.tareasCompletadas),
      `${p.puntualidadPct}%`,
      p.alerta ?? "—",
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const dc = report.distribucionCarga;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text("Distribución de carga", 14, y);
  doc.setFontSize(10);
  y += 8;
  doc.text(`Promedio: ${dc.promedio} tareas/empleado (máx ${dc.max}, mín ${dc.min})`, 14, y);
  y += 8;

  if (dc.sobrecargados.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Sobrecargados", "Área", "Tareas abiertas"]],
      body: dc.sobrecargados.map((person) => [
        `${person.nombre} ${person.apellido}`,
        person.area,
        String(person.tareasAbiertas),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [217, 119, 6] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  if (dc.conCapacidad.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    autoTable(doc, {
      startY: y,
      head: [["Con capacidad", "Área", "Tareas abiertas"]],
      body: dc.conCapacidad.map((person) => [
        `${person.nombre} ${person.apellido}`,
        person.area,
        String(person.tareasAbiertas),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [5, 150, 105] },
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "Generado por Vertia ScoreOps — uso interno / directorio",
    14,
    doc.internal.pageSize.getHeight() - 10
  );

  return Buffer.from(doc.output("arraybuffer"));
}
