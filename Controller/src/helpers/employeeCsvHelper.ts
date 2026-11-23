  import { z } from 'zod';
import {
    buildNormalizedRow,
    findMissingFields,
    isBlankCsvRow,
    type CsvRowError,
} from './csvHelper.js';

export const EMPLOYEE_CSV_HEADERS = [
    'IDEmpleado',
    'Nombre/s',
    'Apellidos',
    'Tipo de Empleado',
    'Email',
    'Area',
    'Estado',
] as const;

export const EMPLOYEE_REQUIRED_FIELD_LABELS: Readonly<Record<string, string>> = {
    employeeId: 'IDEmpleado',
    firstName: 'Nombre/s',
    lastName: 'Apellidos',
    email: 'Email',
    status: 'Estado',
};

const normalizeOptionalText = (value: unknown): string | null => {
    const trimmed = String(value ?? '').trim();
    return trimmed.length > 0 ? trimmed : null;
};

const EmployeeValidation = z.object({
    employeeId: z.coerce.number().int().positive(),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    employeeType: z.preprocess(normalizeOptionalText, z.string().nullable()),
    email: z.string().trim().toLowerCase().pipe(z.email()),
    area: z.preprocess(normalizeOptionalText, z.string().nullable()),
    status: z.preprocess((value) => {
        if (typeof value === 'string') {
            const normalized = value.trim().toUpperCase();

            if (normalized === 'ACTIVO' || normalized === '1' || normalized === 'TRUE') return true;
            if (normalized === 'INACTIVO' || normalized === '0' || normalized === 'FALSE') return false;
        }

        if (value === true || value === 1) return true;
        if (value === false || value === 0) return false;

        return value;
    }, z.boolean()),
});

export type ValidatedEmployeeRow = z.infer<typeof EmployeeValidation>;

export interface PreparedEmployeeRow {
    fila: number;
    data: ValidatedEmployeeRow;
}

export const mapExcelRowToEmployee = (row: Record<string, unknown>) => {
    const normalizedRow = buildNormalizedRow(row);

    return {
        employeeId: normalizedRow.idempleado,
        firstName: normalizedRow.nombres,
        lastName: normalizedRow.apellidos,
        employeeType: normalizedRow.tipodeempleado,
        email: normalizedRow.email,
        area: normalizedRow.area,
        status: normalizedRow.estado,
    };
};

/**
 * Valida filas de empleados, normaliza campos opcionales vacíos a `null` y detecta
 * duplicados de `employeeId` o `email` dentro del mismo archivo.
 */
export const validateAndPrepareEmployeeRows = (
    parsedRows: readonly Record<string, unknown>[]
): { validRows: PreparedEmployeeRow[]; errors: CsvRowError[] } => {
    const validRows: PreparedEmployeeRow[] = [];
    const errors: CsvRowError[] = [];
    const seenEmployeeIds = new Map<number, number>();
    const seenEmails = new Map<string, number>();

    parsedRows.forEach((row, index) => {
        if (isBlankCsvRow(row)) {
            return;
        }

        const fila = index + 2;
        const mappedRow = mapExcelRowToEmployee(row);
        const missingFields = findMissingFields(mappedRow, EMPLOYEE_REQUIRED_FIELD_LABELS);

        if (missingFields.length > 0) {
            errors.push({
                fila,
                camposFaltantes: missingFields,
                detalle: `Faltan campos obligatorios: ${missingFields.join(', ')}`,
            });
            return;
        }

        const result = EmployeeValidation.safeParse(mappedRow);

        if (!result.success) {
            errors.push({
                fila,
                detalle: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
            });
            return;
        }

        const duplicateIssues: string[] = [];
        const firstIdRow = seenEmployeeIds.get(result.data.employeeId);
        if (firstIdRow !== undefined) {
            duplicateIssues.push(
                `El ID de empleado "${result.data.employeeId}" está repetido en el archivo (ya aparece en la fila ${firstIdRow})`
            );
        } else {
            seenEmployeeIds.set(result.data.employeeId, fila);
        }

        const firstEmailRow = seenEmails.get(result.data.email);
        if (firstEmailRow !== undefined) {
            duplicateIssues.push(
                `El correo "${result.data.email}" está repetido en el archivo (ya aparece en la fila ${firstEmailRow})`
            );
        } else {
            seenEmails.set(result.data.email, fila);
        }

        if (duplicateIssues.length > 0) {
            errors.push({
                fila,
                detalle: duplicateIssues.join(' | '),
            });
            return;
        }

        validRows.push({
            fila,
            data: result.data,
        });
    });

    return { validRows, errors };
};
