import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx/xlsx.mjs';

/**
 * Agrupa los turnos por usuario y fecha para facilitar la representación tabular.
 */
const groupShiftsByUserAndDate = (shifts, dates) => {
    const userMap = {};

    shifts.forEach(shift => {
        const userId = shift.userId;
        const userName = shift.user.name;
        const dateStr = new Date(shift.startDate).toDateString();

        if (!userMap[userId]) {
            userMap[userId] = {
                name: userName,
                days: {}
            };
        }

        if (!userMap[userId].days[dateStr]) {
            userMap[userId].days[dateStr] = [];
        }

        userMap[userId].days[dateStr].push(shift);
    });

    // Ordenar usuarios por nombre
    return Object.values(userMap).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Formatea un turno para mostrarlo en una celda del cuadrante.
 */
const formatShiftCell = (shifts) => {
    if (!shifts || shifts.length === 0) return '';

    return shifts.map(s => {
        if (s.type !== 'WORK') {
            const labels = { 'VACATION': 'VAC', 'MEDICAL': 'MED', 'SICK_LEAVE': 'BAJA', 'OFF': 'LIBRE' };
            return labels[s.type] || s.type;
        }

        const start = new Date(s.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const end = new Date(s.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const zone = s.zone.name;
        const sub = s.subZone ? ` (${s.subZone})` : '';
        const extra = s.isOvertime ? ' [E]' : '';

        return `${start}-${end}\n${zone}${sub}${extra}`;
    }).join('\n---\n');
};

/**
 * Exporta el cuadrante a PDF.
 */
export const exportSchedulePDF = (shifts, visibleDates, filters) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const groupedData = groupShiftsByUserAndDate(shifts, visibleDates);
    const dateRangeStr = `${visibleDates[0].toLocaleDateString()} - ${visibleDates[visibleDates.length - 1].toLocaleDateString()}`;

    // Título y Metadatos
    doc.setFontSize(18);
    doc.setTextColor(0, 86, 179); // companyBlue
    doc.text('CUADRANTE DE TURNOS - AUTEIDE', 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${dateRangeStr}`, 14, 22);
    doc.text(`Sucursal: ${filters.branchName || 'Todas'} | Zona: ${filters.zoneName || 'Todas'}`, 14, 27);

    // Configurar tabla
    const head = [
        ['Empleado', ...visibleDates.map(d => {
            const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
            const dayNum = d.getDate();
            return `${dayName} ${dayNum}`;
        })]
    ];

    const body = groupedData.map(user => {
        return [
            user.name,
            ...visibleDates.map(date => {
                const dayShifts = user.days[date.toDateString()];
                return formatShiftCell(dayShifts);
            })
        ];
    });

    autoTable(doc, {
        head: head,
        body: body,
        startY: 32,
        styles: {
            fontSize: 7,
            cellPadding: 2,
            valign: 'middle',
            halign: 'center',
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [0, 86, 179],
            textColor: 255,
            fontSize: 8,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', minCellWidth: 30 }
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250]
        },
        margin: { top: 30 }
    });

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Generado el ${new Date().toLocaleString()} | Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 14,
            doc.internal.pageSize.height - 10,
            { align: 'right' }
        );
    }

    const filename = `Cuadrante_${filters.branchName || 'Auteide'}_${dateRangeStr.replace(/\//g, '-')}.pdf`;
    doc.save(filename);
};

/**
 * Exporta el cuadrante a Excel.
 */
export const exportScheduleExcel = (shifts, visibleDates, filters) => {
    const groupedData = groupShiftsByUserAndDate(shifts, visibleDates);
    const dateRangeStr = `${visibleDates[0].toLocaleDateString()} - ${visibleDates[visibleDates.length - 1].toLocaleDateString()}`;

    // Preparar datos para SheetJS
    const wsData = [
        ['CUADRANTE DE TURNOS - AUTEIDE'],
        [`Periodo: ${dateRangeStr}`],
        [`Sucursal: ${filters.branchName || 'Todas'}`, `Zona: ${filters.zoneName || 'Todas'}`],
        [], // Fila vacía
        ['Empleado', ...visibleDates.map(d => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }))]
    ];

    groupedData.forEach(user => {
        const row = [
            user.name,
            ...visibleDates.map(date => {
                const dayShifts = user.days[date.toDateString()];
                return formatShiftCell(dayShifts).replace(/\n/g, ' | ');
            })
        ];
        wsData.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ajustar anchos de columna básicos
    const wscols = [
        { wch: 25 }, // Empleado
        ...visibleDates.map(() => ({ wch: 20 }))
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Cuadrante');

    const filename = `Cuadrante_${filters.branchName || 'Auteide'}_${dateRangeStr.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
};
