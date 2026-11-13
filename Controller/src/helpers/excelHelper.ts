import ExcelJS from 'exceljs';
import { isBlankCsvRow, type ParsedCsvResult } from './csvHelper.js';
import { ITEM_CSV_HEADERS } from './itemCsvHelper.js';

const DEFAULT_MAX_DROPDOWN_ROWS = 500;

export interface ItemTemplateWorkbookOptions {
    statuses: readonly string[];
    categories: readonly string[];
    responsibles: readonly string[];
    places: readonly string[];
    exampleRow: ReadonlyArray<string | number>;
    maxDropdownRows?: number;
}

/**
 * Extrae el valor legible de una celda de ExcelJS (incluyendo hipervínculos de correo,
 * texto enriquecido y resultados de fórmulas).
 */
export const extractExcelCellValue = (value: ExcelJS.CellValue): unknown => {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'object') {
        if ('richText' in value && Array.isArray(value.richText)) {
            return value.richText.map((part) => part.text ?? '').join('');
        }

        if ('text' in value) {
            return String(value.text ?? '');
        }

        if ('result' in value) {
            return extractExcelCellValue((value as { result?: ExcelJS.CellValue }).result ?? '');
        }

        if ('error' in value) {
            return '';
        }
    }

    return String(value);
};

/**
 * Parsea un archivo .xlsx en memoria a encabezados y filas equivalentes al parser CSV.
 */
export const parseXlsxBuffer = async (
    buffer: Buffer,
    preferredSheetName?: string
): Promise<ParsedCsvResult> => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    const worksheet =
        (preferredSheetName ? workbook.getWorksheet(preferredSheetName) : undefined) ??
        workbook.worksheets.find((sheet) => sheet.state === 'visible') ??
        workbook.worksheets[0];

    if (!worksheet || worksheet.rowCount === 0) {
        return { headers: [], rows: [] };
    }

    const headerRow = worksheet.getRow(1);
    const totalCols = Math.max(headerRow.cellCount, worksheet.columnCount);

    const rawHeadersByCol = new Map<number, string>();
    let lastActiveCol = 0;

    for (let col = 1; col <= totalCols; col += 1) {
        const text = String(extractExcelCellValue(headerRow.getCell(col).value) ?? '')
            .replace(/^\uFEFF/, '')
            .trim();
        rawHeadersByCol.set(col, text);
        if (text !== '') {
            lastActiveCol = col;
        }
    }

    // Si alguna fila tiene datos en una columna más allá del último encabezado con texto,
    // la conservamos para que el validador reporte la columna sin nombre.
    for (let rowIdx = 2; rowIdx <= worksheet.rowCount; rowIdx += 1) {
        const row = worksheet.getRow(rowIdx);
        for (let col = lastActiveCol + 1; col <= totalCols; col += 1) {
            const cellText = String(extractExcelCellValue(row.getCell(col).value) ?? '').trim();
            if (cellText !== '') {
                lastActiveCol = col;
            }
        }
    }

    if (lastActiveCol === 0) {
        return { headers: [], rows: [] };
    }

    const headers: string[] = [];
    for (let col = 1; col <= lastActiveCol; col += 1) {
        headers.push(rawHeadersByCol.get(col) ?? '');
    }

    const rows: Record<string, unknown>[] = [];
    for (let rowIdx = 2; rowIdx <= worksheet.rowCount; rowIdx += 1) {
        const row = worksheet.getRow(rowIdx);
        const rowObject: Record<string, unknown> = {};

        for (let col = 1; col <= lastActiveCol; col += 1) {
            const headerName = headers[col - 1] ?? '';
            const rawVal = extractExcelCellValue(row.getCell(col).value);
            rowObject[headerName] = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
        }

        rows.push(rowObject);
    }

    while (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        if (!lastRow || !isBlankCsvRow(lastRow)) {
            break;
        }
        rows.pop();
    }

    return { headers, rows };
};

const applyDropdownValidation = (
    worksheet: ExcelJS.Worksheet,
    columnLetter: string,
    maxRows: number,
    formula: string,
    promptTitle: string,
    prompt: string,
    errorTitle: string,
    error: string
): void => {
    for (let row = 2; row <= maxRows; row += 1) {
        worksheet.getCell(`${columnLetter}${row}`).dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: [formula],
            showInputMessage: true,
            promptTitle,
            prompt,
            showErrorMessage: true,
            errorStyle: 'warning',
            errorTitle,
            error,
        };
    }
};

const applyInputHint = (
    worksheet: ExcelJS.Worksheet,
    columnLetter: string,
    maxRows: number,
    promptTitle: string,
    prompt: string
): void => {
    for (let row = 2; row <= maxRows; row += 1) {
        worksheet.getCell(`${columnLetter}${row}`).dataValidation = {
            type: 'custom',
            allowBlank: false,
            formulae: ['TRUE'],
            showInputMessage: true,
            promptTitle,
            prompt,
        };
    }
};

/**
 * Genera una plantilla Excel (.xlsx) para Items con hoja oculta de catálogos,
 * dropdowns en Estado/Categoria/Responsable/Lugar y una fila de ejemplo.
 */
export const buildItemTemplateWorkbookBuffer = async (
    options: ItemTemplateWorkbookOptions
): Promise<Buffer> => {
    const maxRows = options.maxDropdownRows ?? DEFAULT_MAX_DROPDOWN_ROWS;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dynamic Inventory System';
    workbook.created = new Date();

    const itemsSheet = workbook.addWorksheet('Items', {
        views: [{ state: 'frozen', ySplit: 1 }],
    });

    itemsSheet.columns = [
        { header: ITEM_CSV_HEADERS[0], key: 'nombre', width: 26 },
        { header: ITEM_CSV_HEADERS[1], key: 'descripcion', width: 40 },
        { header: ITEM_CSV_HEADERS[2], key: 'estado', width: 18 },
        { header: ITEM_CSV_HEADERS[3], key: 'costo', width: 14 },
        { header: ITEM_CSV_HEADERS[4], key: 'fabricante', width: 20 },
        { header: ITEM_CSV_HEADERS[5], key: 'codigoBarras', width: 24 },
        { header: ITEM_CSV_HEADERS[6], key: 'categoria', width: 24 },
        { header: ITEM_CSV_HEADERS[7], key: 'responsable', width: 32 },
        { header: ITEM_CSV_HEADERS[8], key: 'lugar', width: 24 },
    ];

    const headerRow = itemsSheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E3A5F' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D7DE' } },
            left: { style: 'thin', color: { argb: 'FFD0D7DE' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } },
            right: { style: 'thin', color: { argb: 'FFD0D7DE' } },
        };
    });

    itemsSheet.addRow([...options.exampleRow]);

    const catalogsSheet = workbook.addWorksheet('Catalogos', {
        state: 'hidden',
    });

    catalogsSheet.columns = [
        { header: 'Categorias', key: 'categorias', width: 28 },
        { header: 'Responsables', key: 'responsables', width: 36 },
        { header: 'Lugares', key: 'lugares', width: 28 },
    ];

    const maxCatalogLength = Math.max(
        options.categories.length,
        options.responsibles.length,
        options.places.length
    );

    for (let i = 0; i < maxCatalogLength; i += 1) {
        catalogsSheet.addRow([
            options.categories[i] ?? '',
            options.responsibles[i] ?? '',
            options.places[i] ?? '',
        ]);
    }

    // Hints en columnas de texto/número
    applyInputHint(itemsSheet, 'A', maxRows, 'Nombre', 'Obligatorio (máximo 30 caracteres).');
    applyInputHint(itemsSheet, 'B', maxRows, 'Descripción', 'Obligatorio (máximo 255 caracteres).');
    applyInputHint(itemsSheet, 'D', maxRows, 'Costo', 'Número entero mayor a 0 (ej. 18500).');
    applyInputHint(itemsSheet, 'E', maxRows, 'Fabricante', 'Obligatorio (máximo 25 caracteres).');
    applyInputHint(
        itemsSheet,
        'F',
        maxRows,
        'Código de Barras',
        'Obligatorio y único por item (máximo 25 caracteres). Si ya existe en BD, se actualizará.'
    );

    // Dropdown para Estado (lista inline)
    applyDropdownValidation(
        itemsSheet,
        'C',
        maxRows,
        `"${options.statuses.join(',')}"`,
        'Estado del item',
        'Selecciona un estado válido de la lista.',
        'Estado no está en la lista',
        'Se recomienda elegir una opción de la lista desplegable.'
    );

    if (options.categories.length > 0) {
        applyDropdownValidation(
            itemsSheet,
            'G',
            maxRows,
            `Catalogos!$A$2:$A$${options.categories.length + 1}`,
            'Categoría',
            'Selecciona una categoría activa de la lista.',
            'Categoría no encontrada en la lista',
            'Elige una categoría válida del catálogo o ingresa su ID.'
        );
    }

    if (options.responsibles.length > 0) {
        applyDropdownValidation(
            itemsSheet,
            'H',
            maxRows,
            `Catalogos!$B$2:$B$${options.responsibles.length + 1}`,
            'Empleado responsable',
            'Selecciona el correo de un empleado activo.',
            'Responsable no encontrado en la lista',
            'Elige un correo de la lista o ingresa el ID del empleado.'
        );
    }

    if (options.places.length > 0) {
        applyDropdownValidation(
            itemsSheet,
            'I',
            maxRows,
            `Catalogos!$C$2:$C$${options.places.length + 1}`,
            'Lugar',
            'Selecciona un lugar registrado en el sistema.',
            'Lugar no encontrado en la lista',
            'Elige un lugar de la lista o ingresa su ID.'
        );
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
};
