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
      a.tramos.find((t) => t.id === id)?.activo ? "Sí" : "No";
    return {
      Empleado: `${e.nombre} ${e.apellido}`,
      Área: e.area,
      "KPI %": e.kpiPromedio,
      "Eficiencia evaluable %": e.productivityBonus.eficienciaEvaluable,
      "Sueldo referencia": a.sueldoReferencia,
      "Tramo a (30%)": tramo("a"),
      "Tramo b (5%)": tramo("b"),
      "Tramo c (5%)": tramo("c"),
      "Tramo d (5%)": tramo("d"),
      "Tramo e (5%)": tramo("e"),
      "Premio % sueldo": a.porcentajeTotal,
      "Premio $": a.montoTotal,
      "Impunt. leves": a.impuntualidadesLeves,
      "Faltas injust.": a.inasistenciasInjustificadas,
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
        a.tramos.find((t) => t.id === id)?.activo ? "✓" : "—";
      return [
        `${e.nombre} ${e.apellido}`,
        e.area,
        `${e.kpiPromedio}%`,
        tr("a"),
        tr("b"),
        tr("c"),
        tr("d"),
        tr("e"),
        `${a.porcentajeTotal}%`,
        a.montoTotal > 0 ? `$${a.montoTotal}` : "—",
      ];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [109, 40, 217] },
  });

  return Buffer.from(doc.output("arraybuffer"));
}
