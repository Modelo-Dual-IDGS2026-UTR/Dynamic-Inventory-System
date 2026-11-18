import { Readable } from 'node:stream';
import * as fastCsv from 'fast-csv';

export interface ParsedCsvResult {
    headers: string[];
    rows: Record<string, unknown>[];
}

export interface CsvHeaderValidationResult {
    valid: boolean;
    missingHeaders: string[];
    extraHeaders: string[];
    duplicateHeaders: string[];
}

export interface CsvRowError {
    fila: number;
    camposFaltantes?: string[] | undefined;
    detalle: string;
}

/**
 * Normaliza un encabezado CSV removiendo BOM, acentos, espacios y símbolos.
 */
export const normalizeCsvHeader = (value: string): string =>
    String(value)
        .replace(/^\uFEFF/, '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();

/**
 * Normaliza un texto de búsqueda (nombres, correos, estados) para comparaciones tolerantes.
 */
export const normalizeLookupKey = (value: unknown): string =>
    String(value ?? '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase();

/**
 * Parsea un Buffer CSV a encabezados limpios y filas de objetos.
 */
export const parseCsvBuffer = async (buffer: Buffer): Promise<ParsedCsvResult> => {
    const rows: Record<string, unknown>[] = [];
    let headers: string[] = [];

    const stream = Readable.from(buffer);

    await new Promise<void>((resolve, reject) => {
        stream
            .pipe(
                fastCsv.parse({
                    headers: (rawHeaders) => {
                        headers = rawHeaders.map((header) =>
                            String(header ?? '')
                                .replace(/^\uFEFF/, '')
                                .trim()
                        );
                        return headers;
                    },
                    trim: true,
                })
            )
            .on('data', (row: Record<string, unknown>) => rows.push(row))
            .on('end', () => resolve())
            .on('error', reject);
    });

    return { headers, rows };
};

/**
 * Verifica que todos los encabezados esperados estén presentes (tolerando acentos, espacios y mayúsculas)
 * y reporta columnas faltantes, duplicadas o no reconocidas.
 */
export const validateCsvHeaders = (
    receivedHeaders: readonly string[],
    expectedHeaders: readonly string[]
): CsvHeaderValidationResult => {
    const expectedMap = new Map<string, string>();
    for (const expected of expectedHeaders) {
        expectedMap.set(normalizeCsvHeader(expected), expected);
    }

    const seenNormalized = new Set<string>();
    const duplicateHeaders: string[] = [];
    const extraHeaders: string[] = [];

    for (const rawHeader of receivedHeaders) {
        const normalized = normalizeCsvHeader(rawHeader);
        if (!normalized) {
            extraHeaders.push(rawHeader || '(columna vacía)');
            continue;
        }
        if (seenNormalized.has(normalized)) {
            duplicateHeaders.push(rawHeader);
            continue;
        }
        seenNormalized.add(normalized);

        if (!expectedMap.has(normalized)) {
            extraHeaders.push(rawHeader);
        }
    }

    const missingHeaders = expectedHeaders.filter(
        (expected) => !seenNormalized.has(normalizeCsvHeader(expected))
    );

    return {
        valid: missingHeaders.length === 0 && duplicateHeaders.length === 0 && extraHeaders.length === 0,
        missingHeaders,
        extraHeaders,
        duplicateHeaders,
    };
};

/**
 * Indica si todas las celdas de una fila CSV están vacías.
 */
export const isBlankCsvRow = (row: Record<string, unknown>): boolean =>
    Object.values(row).every((value) => String(value ?? '').trim() === '');

/**
 * Construye un objeto con claves normalizadas para acceder a las columnas sin depender de acentos o mayúsculas.
 */
export const buildNormalizedRow = (row: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeCsvHeader(key), value])
    );

/**
 * Devuelve las etiquetas legibles de los campos obligatorios que estén vacíos o indefinidos.
 */
export const findMissingFields = (
    mappedRow: Record<string, unknown>,
    requiredFieldLabels: Readonly<Record<string, string>>
): string[] => {
    const missing: string[] = [];

    for (const [fieldKey, label] of Object.entries(requiredFieldLabels)) {
        const rawValue = mappedRow[fieldKey];
        if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
            missing.push(label);
        }
    }

    return missing;
};

/**
 * Escapa una celda individual siguiendo RFC 4180 para exportación CSV.
 */
export const formatCsvCell = (value: string | number): string => {
    const text = String(value);
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

/**
 * Genera el contenido CSV completo con BOM UTF-8 para compatibilidad directa con Excel.
 */
export const buildCsvContent = (
    headers: readonly string[],
    rows: ReadonlyArray<ReadonlyArray<string | number>>
): string => {
    const lines = [
        headers.map(formatCsvCell).join(','),
        ...rows.map((row) => row.map(formatCsvCell).join(',')),
    ];
    return `\uFEFF${lines.join('\r\n')}\r\n`;
};

