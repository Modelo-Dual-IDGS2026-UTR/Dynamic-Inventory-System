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

export interface EmployeeTemplateWorkbookOptions {
    headers: readonly string[];
    statuses: readonly string[];
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

interface DropdownValidationConfig {
    columnLetter: string;
    maxRows: number;
    formula: string;
    promptTitle: string;
    prompt: string;
    errorTitle: string;
    error: string;
    allowBlank?: boolean;
    errorStyle?: 'stop' | 'warning' | 'information';
}

const applyDropdownValidation = (
    worksheet: ExcelJS.Worksheet,
    config: DropdownValidationConfig
): void => {
    for (let row = 2; row <= config.maxRows; row += 1) {
        worksheet.getCell(`${config.columnLetter}${row}`).dataValidation = {
            type: 'list',
            allowBlank: config.allowBlank ?? false,
            formulae: [config.formula],
            showInputMessage: true,
            promptTitle: config.promptTitle,
            prompt: config.prompt,
            showErrorMessage: true,
            errorStyle: config.errorStyle ?? 'warning',
            errorTitle: config.errorTitle,
            error: config.error,
        };
    }
};

const applyInputHint = (
    worksheet: ExcelJS.Worksheet,
    columnLetter: string,
    maxRows: number,
    promptTitle: string,
    prompt: string,
    allowBlank = false
): void => {
    for (let row = 2; row <= maxRows; row += 1) {
        worksheet.getCell(`${columnLetter}${row}`).dataValidation = {
            type: 'custom',
            allowBlank,
            formulae: ['TRUE'],
            showInputMessage: true,
            promptTitle,
            prompt,
        };
    }
};

const createStyledMainSheet = (
    workbook: ExcelJS.Workbook,
    sheetName: string,
    columns: Array<{ header: string; key: string; width: number }>,
    exampleRow: ReadonlyArray<string | number>
): ExcelJS.Worksheet => {
    const sheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = columns;

    const headerRow = sheet.getRow(1);
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

    sheet.addRow([...exampleRow]);
    return sheet;
};

const populateHiddenCatalogsSheet = (
    workbook: ExcelJS.Workbook,
    columns: Array<{ header: string; key: string; width: number; values: readonly string[] }>
): void => {
    const catalogsSheet = workbook.addWorksheet('Catalogos', {
        state: 'hidden',
    });

    catalogsSheet.columns = columns.map(({ header, key, width }) => ({ header, key, width }));

    const maxLength = columns.reduce((max, col) => Math.max(max, col.values.length), 0);
    for (let i = 0; i < maxLength; i += 1) {
        catalogsSheet.addRow(columns.map((col) => col.values[i] ?? ''));
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

    const itemsSheet = createStyledMainSheet(
        workbook,
        'Items',
        [
            { header: ITEM_CSV_HEADERS[0], key: 'nombre', width: 26 },
            { header: ITEM_CSV_HEADERS[1], key: 'descripcion', width: 40 },
            { header: ITEM_CSV_HEADERS[2], key: 'estado', width: 18 },
            { header: ITEM_CSV_HEADERS[3], key: 'costo', width: 14 },
            { header: ITEM_CSV_HEADERS[4], key: 'fabricante', width: 20 },
            { header: ITEM_CSV_HEADERS[5], key: 'codigoBarras', width: 24 },
            { header: ITEM_CSV_HEADERS[6], key: 'categoria', width: 24 },
            { header: ITEM_CSV_HEADERS[7], key: 'responsable', width: 32 },
            { header: ITEM_CSV_HEADERS[8], key: 'lugar', width: 24 },
        ],
        options.exampleRow
    );

    populateHiddenCatalogsSheet(workbook, [
        { header: 'Categorias', key: 'categorias', width: 28, values: options.categories },
        { header: 'Responsables', key: 'responsables', width: 36, values: options.responsibles },
        { header: 'Lugares', key: 'lugares', width: 28, values: options.places },
    ]);

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

    applyDropdownValidation(itemsSheet, {
        columnLetter: 'C',
        maxRows,
        formula: `"${options.statuses.join(',')}"`,
        promptTitle: 'Estado del item',
        prompt: 'Selecciona un estado válido de la lista.',
        errorTitle: 'Estado no está en la lista',
        error: 'Se recomienda elegir una opción de la lista desplegable.',
    });

    if (options.categories.length > 0) {
        applyDropdownValidation(itemsSheet, {
            columnLetter: 'G',
            maxRows,
            formula: `Catalogos!$A$2:$A$${options.categories.length + 1}`,
            promptTitle: 'Categoría',
            prompt: 'Selecciona una categoría activa de la lista.',
            errorTitle: 'Categoría no encontrada en la lista',
            error: 'Elige una categoría válida del catálogo o ingresa su ID.',
        });
    }

    if (options.responsibles.length > 0) {
        applyDropdownValidation(itemsSheet, {
            columnLetter: 'H',
            maxRows,
            formula: `Catalogos!$B$2:$B$${options.responsibles.length + 1}`,
            promptTitle: 'Empleado responsable',
            prompt: 'Selecciona el correo de un empleado activo.',
            errorTitle: 'Responsable no encontrado en la lista',
            error: 'Elige un correo de la lista o ingresa el ID del empleado.',
        });
    }

    if (options.places.length > 0) {
        applyDropdownValidation(itemsSheet, {
            columnLetter: 'I',
            maxRows,
            formula: `Catalogos!$C$2:$C$${options.places.length + 1}`,
            promptTitle: 'Lugar',
            prompt: 'Selecciona un lugar registrado en el sistema.',
            errorTitle: 'Lugar no encontrado en la lista',
            error: 'Elige un lugar de la lista o ingresa su ID.',
        });
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
};

/**
 * Genera una plantilla Excel (.xlsx) para Empleados con dropdown en Estado,
 * campos personalizados libres para Tipo de Empleado y Area, y una fila de ejemplo.
 */
export const buildEmployeeTemplateWorkbookBuffer = async (
    options: EmployeeTemplateWorkbookOptions
): Promise<Buffer> => {
    const maxRows = options.maxDropdownRows ?? DEFAULT_MAX_DROPDOWN_ROWS;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dynamic Inventory System';
    workbook.created = new Date();

    const employeesSheet = createStyledMainSheet(
        workbook,
        'Empleados',
        [
            { header: options.headers[0] ?? 'IDEmpleado', key: 'idEmpleado', width: 16 },
            { header: options.headers[1] ?? 'Nombre/s', key: 'nombres', width: 22 },
            { header: options.headers[2] ?? 'Apellidos', key: 'apellidos', width: 24 },
            { header: options.headers[3] ?? 'Tipo de Empleado', key: 'tipo', width: 22 },
            { header: options.headers[4] ?? 'Email', key: 'email', width: 32 },
            { header: options.headers[5] ?? 'Area', key: 'area', width: 22 },
            { header: options.headers[6] ?? 'Estado', key: 'estado', width: 16 },
        ],
        options.exampleRow
    );

    applyInputHint(
        employeesSheet,
        'A',
        maxRows,
        'IDEmpleado',
        'Obligatorio. Número de empleado entero positivo (si ya existe, se actualizará).'
    );
    applyInputHint(employeesSheet, 'B', maxRows, 'Nombre/s', 'Obligatorio. Nombre(s) del empleado.');
    applyInputHint(employeesSheet, 'C', maxRows, 'Apellidos', 'Obligatorio. Apellidos del empleado.');
    applyInputHint(
        employeesSheet,
        'D',
        maxRows,
        'Tipo de Empleado',
        'Opcional. Texto libre (ej. Tiempo Completo, Medio Tiempo, Contratista).',
        true
    );
    applyInputHint(
        employeesSheet,
        'E',
        maxRows,
        'Email',
        'Obligatorio y único. Correo electrónico válido (ej. nombre@utr.edu.mx).'
    );
    applyInputHint(
        employeesSheet,
        'F',
        maxRows,
        'Área',
        'Opcional. Texto libre (ej. Soporte TI, Desarrollo, Sistemas).',
        true
    );

    applyDropdownValidation(employeesSheet, {
        columnLetter: 'G',
        maxRows,
        formula: `"${options.statuses.join(',')}"`,
        promptTitle: 'Estado del empleado',
        prompt: 'Obligatorio. Selecciona ACTIVO o INACTIVO.',
        errorTitle: 'Estado inválido',
        error: 'Elige ACTIVO o INACTIVO de la lista desplegable.',
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
};
