import type { ItemStatus } from '@dis/model';
import { z } from 'zod';
import {
    buildNormalizedRow,
    findMissingFields,
    isBlankCsvRow,
    normalizeLookupKey,
    type CsvRowError,
} from './csvHelper.js';

const ITEM_STATUS_VALUES = ['In Use', 'In Stock', 'Damaged', 'Not Assigned'] as const;
const [STATUS_IN_USE, STATUS_IN_STOCK, STATUS_DAMAGED, STATUS_NA] = ITEM_STATUS_VALUES as unknown as [
    ItemStatus,
    ItemStatus,
    ItemStatus,
    ItemStatus,
];

export const ITEM_CSV_HEADERS = [
    'Nombre',
    'Descripcion',
    'Estado',
    'Costo',
    'Fabricante',
    'Codigo de Barras',
    'Categoria',
    'Responsable',
    'Lugar',
] as const;

export const ITEM_REQUIRED_FIELD_LABELS: Readonly<Record<string, string>> = {
    itemName: 'Nombre',
    itemDescription: 'Descripcion',
    itemStatus: 'Estado',
    cost: 'Costo',
    manufacter: 'Fabricante',
    codeBar: 'Codigo de Barras',
    categoryRef: 'Categoria',
    responsibleRef: 'Responsable',
    placeRef: 'Lugar',
};

export interface CategoryLookupRecord {
    categoryId: number;
    categoryName: string;
    folioNumber: string;
    categoryStatus: boolean;
}

export interface EmployeeLookupRecord {
    employeeId: number;
    email: string;
    status: boolean;
}

export interface PlaceLookupRecord {
    placeId: number;
    placeName: string;
}

export interface ItemLookupCatalogs {
    categoriesById: Map<number, CategoryLookupRecord>;
    categoriesByName: Map<string, CategoryLookupRecord[]>;
    categoriesByFolio: Map<string, CategoryLookupRecord[]>;
    employeesById: Map<number, EmployeeLookupRecord>;
    employeesByEmail: Map<string, EmployeeLookupRecord>;
    placesById: Map<number, PlaceLookupRecord>;
    placesByName: Map<string, PlaceLookupRecord>;
}

export interface ValidatedItemPayload {
    itemName: string;
    itemDescription: string;
    itemStatus: ItemStatus;
    cost: number;
    manufacter: string;
    codeBar: string;
    fk_category: number;
    fk_user_responsible: number;
    fk_place: number;
}

const ITEM_STATUS_ALIASES: Readonly<Record<string, ItemStatus>> = {
    'in use': STATUS_IN_USE,
    'en uso': STATUS_IN_USE,
    uso: STATUS_IN_USE,
    'in stock': STATUS_IN_STOCK,
    'en stock': STATUS_IN_STOCK,
    stock: STATUS_IN_STOCK,
    disponible: STATUS_IN_STOCK,
    almacen: STATUS_IN_STOCK,
    'en almacen': STATUS_IN_STOCK,
    damaged: STATUS_DAMAGED,
    danado: STATUS_DAMAGED,
    danada: STATUS_DAMAGED,
    averiado: STATUS_DAMAGED,
    averiada: STATUS_DAMAGED,
    roto: STATUS_DAMAGED,
    rota: STATUS_DAMAGED,
    'not assigned': STATUS_NA,
    'no asignado': STATUS_NA,
    'no asignada': STATUS_NA,
    'sin asignar': STATUS_NA,
    na: STATUS_NA,
};

/**
 * Convierte un valor de estado (en inglés o español) al enum `ItemStatus`.
 */
export const parseItemStatus = (rawValue: unknown): ItemStatus | null => {
    const key = normalizeLookupKey(rawValue);
    return ITEM_STATUS_ALIASES[key] ?? null;
};

const parsePositiveIntegerCost = (rawValue: unknown): number | null => {
    const cleaned = String(rawValue ?? '')
        .trim()
        .replace(/^\$/, '')
        .trim();

    if (!cleaned) {
        return null;
    }

    const withoutThousandsSeparators = /^\d{1,3}(,\d{3})+$/.test(cleaned)
        ? cleaned.replace(/,/g, '')
        : cleaned;

    if (!/^\d+$/.test(withoutThousandsSeparators)) {
        return null;
    }

    const parsed = Number(withoutThousandsSeparators);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
};

const ItemCsvFieldsSchema = z.object({
    itemName: z
        .string()
        .trim()
        .min(1, 'Nombre es obligatorio')
        .max(30, 'Nombre no debe exceder 30 caracteres'),
    itemDescription: z
        .string()
        .trim()
        .min(1, 'Descripcion es obligatoria')
        .max(255, 'Descripcion no debe exceder 255 caracteres'),
    itemStatus: z.preprocess(
        (value) => parseItemStatus(value) ?? value,
        z.enum(
            [STATUS_IN_USE, STATUS_IN_STOCK, STATUS_DAMAGED, STATUS_NA],
            {
                message:
                    'Estado inválido. Valores permitidos: In Use (En uso), In Stock (En stock / Disponible), Damaged (Dañado), Not Assigned (No asignado)',
            }
        )
    ),
    cost: z.preprocess(
        (value) => parsePositiveIntegerCost(value) ?? value,
        z
            .number({ message: 'Costo debe ser un número entero mayor a 0' })
            .int('Costo debe ser un número entero mayor a 0')
            .positive('Costo debe ser un número entero mayor a 0')
    ),
    manufacter: z
        .string()
        .trim()
        .min(1, 'Fabricante es obligatorio')
        .max(25, 'Fabricante no debe exceder 25 caracteres'),
    codeBar: z
        .string()
        .trim()
        .min(1, 'Codigo de Barras es obligatorio')
        .max(25, 'Codigo de Barras no debe exceder 25 caracteres'),
});

const pushMapList = <T>(map: Map<string, T[]>, key: string, value: T): void => {
    if (!key) return;
    const existing = map.get(key);
    if (existing) {
        existing.push(value);
    } else {
        map.set(key, [value]);
    }
};

/**
 * Construye índices en memoria para resolver categorías, responsables y lugares por ID o por nombre/correo.
 */
export const buildItemLookupCatalogs = (
    categories: readonly CategoryLookupRecord[],
    employees: readonly EmployeeLookupRecord[],
    places: readonly PlaceLookupRecord[]
): ItemLookupCatalogs => {
    const categoriesById = new Map<number, CategoryLookupRecord>();
    const categoriesByName = new Map<string, CategoryLookupRecord[]>();
    const categoriesByFolio = new Map<string, CategoryLookupRecord[]>();

    for (const category of categories) {
        categoriesById.set(Number(category.categoryId), category);
        pushMapList(categoriesByName, normalizeLookupKey(category.categoryName), category);
        pushMapList(categoriesByFolio, normalizeLookupKey(category.folioNumber), category);
    }

    const employeesById = new Map<number, EmployeeLookupRecord>();
    const employeesByEmail = new Map<string, EmployeeLookupRecord>();

    for (const employee of employees) {
        employeesById.set(Number(employee.employeeId), employee);
        employeesByEmail.set(normalizeLookupKey(employee.email), employee);
    }

    const placesById = new Map<number, PlaceLookupRecord>();
    const placesByName = new Map<string, PlaceLookupRecord>();

    for (const place of places) {
        placesById.set(Number(place.placeId), place);
        placesByName.set(normalizeLookupKey(place.placeName), place);
    }

    return {
        categoriesById,
        categoriesByName,
        categoriesByFolio,
        employeesById,
        employeesByEmail,
        placesById,
        placesByName,
    };
};

const isPositiveIntegerText = (text: string): boolean => /^[1-9]\d*$/.test(text);

const resolveCategoryId = (
    rawCategory: unknown,
    catalogs: ItemLookupCatalogs
): { id?: number; error?: string } => {
    const rawText = String(rawCategory ?? '').trim();

    if (isPositiveIntegerText(rawText)) {
        const byId = catalogs.categoriesById.get(Number(rawText));
        if (!byId) {
            return { error: `Categoría con ID "${rawText}" no encontrada` };
        }
        if (byId.categoryStatus === false) {
            return { error: `La categoría "${byId.categoryName}" (ID ${rawText}) está inactiva` };
        }
        return { id: byId.categoryId };
    }

    const lookupKey = normalizeLookupKey(rawText);
    const byName = catalogs.categoriesByName.get(lookupKey) ?? [];
    const byFolio = byName.length === 0 ? (catalogs.categoriesByFolio.get(lookupKey) ?? []) : [];
    const matches = byName.length > 0 ? byName : byFolio;

    if (matches.length === 0) {
        return { error: `Categoría "${rawText}" no encontrada (usa el nombre, folio o ID de categoría)` };
    }

    const activeMatches = matches.filter((cat) => cat.categoryStatus !== false);
    if (activeMatches.length === 0) {
        return { error: `La categoría "${rawText}" está inactiva` };
    }

    if (activeMatches.length > 1) {
        return {
            error: `Existen múltiples categorías con "${rawText}"; especifica su ID o número de folio`,
        };
    }

    const matchedCategory = activeMatches[0];
    if (!matchedCategory) {
        return { error: `Categoría "${rawText}" no encontrada` };
    }

    return { id: matchedCategory.categoryId };
};

const resolveEmployeeId = (
    rawResponsible: unknown,
    catalogs: ItemLookupCatalogs
): { id?: number; error?: string } => {
    const rawText = String(rawResponsible ?? '').trim();

    const employee = isPositiveIntegerText(rawText)
        ? catalogs.employeesById.get(Number(rawText))
        : catalogs.employeesByEmail.get(normalizeLookupKey(rawText));

    if (!employee) {
        return {
            error: `Responsable "${rawText}" no encontrado (usa el correo electrónico o ID de empleado)`,
        };
    }

    if (!employee.status) {
        return { error: `El empleado responsable "${rawText}" está inactivo` };
    }

    return { id: employee.employeeId };
};

const resolvePlaceId = (
    rawPlace: unknown,
    catalogs: ItemLookupCatalogs
): { id?: number; error?: string } => {
    const rawText = String(rawPlace ?? '').trim();

    const place = isPositiveIntegerText(rawText)
        ? catalogs.placesById.get(Number(rawText))
        : catalogs.placesByName.get(normalizeLookupKey(rawText));

    if (!place) {
        return { error: `Lugar "${rawText}" no encontrado (usa el nombre exacto o ID del lugar)` };
    }

    return { id: place.placeId };
};

export const mapCsvRowToItemInput = (row: Record<string, unknown>) => {
    const normalizedRow = buildNormalizedRow(row);

    return {
        itemName: normalizedRow.nombre,
        itemDescription: normalizedRow.descripcion,
        itemStatus: normalizedRow.estado,
        cost: normalizedRow.costo,
        manufacter: normalizedRow.fabricante,
        codeBar: normalizedRow.codigodebarras,
        categoryRef: normalizedRow.categoria,
        responsibleRef: normalizedRow.responsable,
        placeRef: normalizedRow.lugar,
    };
};

/**
 * Valida todas las filas del CSV de items: exige todos los campos, valida longitudes/tipos,
 * resuelve llaves foráneas y detecta códigos de barras duplicados dentro del archivo.
 */
export const validateAndPrepareItemRows = (
    parsedRows: readonly Record<string, unknown>[],
    catalogs: ItemLookupCatalogs
): { validItems: ValidatedItemPayload[]; errors: CsvRowError[] } => {
    const validItems: ValidatedItemPayload[] = [];
    const errors: CsvRowError[] = [];
    const seenCodeBars = new Map<string, number>();

    parsedRows.forEach((row, index) => {
        if (isBlankCsvRow(row)) {
            return;
        }

        const fila = index + 2;
        const mappedRow = mapCsvRowToItemInput(row);
        const missingFields = findMissingFields(mappedRow, ITEM_REQUIRED_FIELD_LABELS);

        if (missingFields.length > 0) {
            errors.push({
                fila,
                camposFaltantes: missingFields,
                detalle: `Faltan campos obligatorios: ${missingFields.join(', ')}`,
            });
            return;
        }

        const rowIssues: string[] = [];

        const fieldResult = ItemCsvFieldsSchema.safeParse({
            itemName: mappedRow.itemName,
            itemDescription: mappedRow.itemDescription,
            itemStatus: mappedRow.itemStatus,
            cost: mappedRow.cost,
            manufacter: mappedRow.manufacter,
            codeBar: mappedRow.codeBar,
        });

        if (!fieldResult.success) {
            for (const issue of fieldResult.error.issues) {
                rowIssues.push(issue.message);
            }
        }

        const categoryResolution = resolveCategoryId(mappedRow.categoryRef, catalogs);
        if (categoryResolution.error) {
            rowIssues.push(categoryResolution.error);
        }

        const employeeResolution = resolveEmployeeId(mappedRow.responsibleRef, catalogs);
        if (employeeResolution.error) {
            rowIssues.push(employeeResolution.error);
        }

        const placeResolution = resolvePlaceId(mappedRow.placeRef, catalogs);
        if (placeResolution.error) {
            rowIssues.push(placeResolution.error);
        }

        if (fieldResult.success) {
            const codeBarKey = fieldResult.data.codeBar.trim().toLowerCase();
            const firstRow = seenCodeBars.get(codeBarKey);
            if (firstRow !== undefined) {
                rowIssues.push(
                    `El código de barras "${fieldResult.data.codeBar}" está repetido en el archivo (ya aparece en la fila ${firstRow})`
                );
            } else {
                seenCodeBars.set(codeBarKey, fila);
            }
        }

        if (
            rowIssues.length > 0 ||
            !fieldResult.success ||
            categoryResolution.id === undefined ||
            employeeResolution.id === undefined ||
            placeResolution.id === undefined
        ) {
            errors.push({
                fila,
                detalle: rowIssues.join(' | '),
            });
            return;
        }

        validItems.push({
            itemName: fieldResult.data.itemName,
            itemDescription: fieldResult.data.itemDescription,
            itemStatus: fieldResult.data.itemStatus,
            cost: fieldResult.data.cost,
            manufacter: fieldResult.data.manufacter,
            codeBar: fieldResult.data.codeBar,
            fk_category: categoryResolution.id,
            fk_user_responsible: employeeResolution.id,
            fk_place: placeResolution.id,
        });
    });

    return { validItems, errors };
};
