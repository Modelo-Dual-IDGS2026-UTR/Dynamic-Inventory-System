import ExcelJS from 'exceljs';
import {
    buildCsvContent,
    buildNormalizedRow,
    findMissingFields,
    isBlankCsvRow,
    parseCsvBuffer,
    validateCsvHeaders,
} from '../helpers/csvHelper.js';
import {
    buildEmployeeTemplateWorkbookBuffer,
    buildItemTemplateWorkbookBuffer,
    extractExcelCellValue,
    parseXlsxBuffer,
} from '../helpers/excelHelper.js';
import {
    buildItemLookupCatalogs,
    ITEM_CSV_HEADERS,
    parseItemStatus,
    validateAndPrepareItemRows,
} from '../helpers/itemCsvHelper.js';

describe('csvHelper', () => {
    it('normalizes headers ignoring accents, spaces, and BOM', () => {
        const result = validateCsvHeaders(
            ['\uFEFFNombre', 'Descripción', 'Estado ', 'Costo', 'Fabricante', 'Código de Barras', 'Categoría', 'Responsable', 'Lugar'],
            ITEM_CSV_HEADERS
        );

        expect(result.valid).toBe(true);
        expect(result.missingHeaders).toEqual([]);
        expect(result.extraHeaders).toEqual([]);
        expect(result.duplicateHeaders).toEqual([]);
    });

    it('reports missing, extra, and duplicate headers', () => {
        const result = validateCsvHeaders(
            ['Nombre', 'Nombre', 'Costo', 'ColumnaExtra'],
            ['Nombre', 'Costo', 'Lugar']
        );

        expect(result.valid).toBe(false);
        expect(result.missingHeaders).toEqual(['Lugar']);
        expect(result.duplicateHeaders).toEqual(['Nombre']);
        expect(result.extraHeaders).toEqual(['ColumnaExtra']);
    });

    it('identifies exact missing required fields in a row', () => {
        const normalized = buildNormalizedRow({
            Nombre: 'Laptop',
            Descripcion: '',
            Costo: '  ',
        });

        const missing = findMissingFields(normalized, {
            nombre: 'Nombre',
            descripcion: 'Descripcion',
            costo: 'Costo',
            lugar: 'Lugar',
        });

        expect(missing).toEqual(['Descripcion', 'Costo', 'Lugar']);
    });

    it('parses CSV buffers and skips blank rows', async () => {
        const csv = buildCsvContent(
            ['Nombre', 'Descripcion'],
            [
                ['Mouse, Logitech', 'Mouse "inalámbrico"'],
                ['', ''],
            ]
        );

        const parsed = await parseCsvBuffer(Buffer.from(csv, 'utf8'));
        expect(parsed.headers).toEqual(['Nombre', 'Descripcion']);
        expect(parsed.rows).toHaveLength(2);
        expect(isBlankCsvRow(parsed.rows[0]!)).toBe(false);
        expect(isBlankCsvRow(parsed.rows[1]!)).toBe(true);
    });
});

describe('itemCsvHelper', () => {
    const catalogs = buildItemLookupCatalogs(
        [
            { categoryId: 1, categoryName: 'Cómputo', folioNumber: 'CAT-01', categoryStatus: true },
            { categoryId: 2, categoryName: 'Obsoleta', folioNumber: 'CAT-99', categoryStatus: false },
        ],
        [
            { employeeId: 75511, email: 'emmanuel.macias@utr.edu.mx', status: true },
            { employeeId: 103, email: 'inactivo@utr.edu.mx', status: false },
        ],
        [
            { placeId: 10, placeName: 'Almacén Central' },
        ]
    );

    it('parses both English and Spanish ItemStatus values', () => {
        expect(parseItemStatus('In Use')).toBe('In Use');
        expect(parseItemStatus('en uso')).toBe('In Use');
        expect(parseItemStatus('Disponible')).toBe('In Stock');
        expect(parseItemStatus('Dañado')).toBe('Damaged');
        expect(parseItemStatus('sin asignar')).toBe('Not Assigned');
        expect(parseItemStatus('desconocido')).toBeNull();
    });

    it('resolves foreign keys by readable name/email and by numeric ID', () => {
        const { validItems, errors } = validateAndPrepareItemRows(
            [
                {
                    Nombre: 'Laptop Dell',
                    Descripcion: 'Equipo de soporte',
                    Estado: 'En Uso',
                    Costo: '$18,500',
                    Fabricante: 'Dell',
                    'Codigo de Barras': 'CB-001',
                    Categoria: 'Computo',
                    Responsable: 'EMMANUEL.MACIAS@UTR.EDU.MX',
                    Lugar: 'Almacen Central',
                },
                {
                    Nombre: 'Monitor HP',
                    Descripcion: 'Monitor 24 pulgadas',
                    Estado: 'In Stock',
                    Costo: '4200',
                    Fabricante: 'HP',
                    'Codigo de Barras': 'CB-002',
                    Categoria: '1',
                    Responsable: '75511',
                    Lugar: '10',
                },
            ],
            catalogs
        );

        expect(errors).toEqual([]);
        expect(validItems).toEqual([
            {
                itemName: 'Laptop Dell',
                itemDescription: 'Equipo de soporte',
                itemStatus: 'In Use',
                cost: 18500,
                manufacter: 'Dell',
                codeBar: 'CB-001',
                fk_category: 1,
                fk_user_responsible: 75511,
                fk_place: 10,
            },
            {
                itemName: 'Monitor HP',
                itemDescription: 'Monitor 24 pulgadas',
                itemStatus: 'In Stock',
                cost: 4200,
                manufacter: 'HP',
                codeBar: 'CB-002',
                fk_category: 1,
                fk_user_responsible: 75511,
                fk_place: 10,
            },
        ]);
    });

    it('rejects rows with any missing field and notifies exact missing fields', () => {
        const { validItems, errors } = validateAndPrepareItemRows(
            [
                {
                    Nombre: 'Laptop Dell',
                    Descripcion: '',
                    Estado: 'In Stock',
                    Costo: '1000',
                    Fabricante: 'Dell',
                    'Codigo de Barras': '',
                    Categoria: 'Computo',
                    Responsable: '75511',
                    Lugar: '',
                },
            ],
            catalogs
        );

        expect(validItems).toEqual([]);
        expect(errors).toHaveLength(1);
        expect(errors[0]?.fila).toBe(2);
        expect(errors[0]?.camposFaltantes).toEqual(['Descripcion', 'Codigo de Barras', 'Lugar']);
    });

    it('rejects inactive employees/categories, unknown places, and duplicate barcodes in the CSV', () => {
        const { validItems, errors } = validateAndPrepareItemRows(
            [
                {
                    Nombre: 'Teclado',
                    Descripcion: 'Teclado USB',
                    Estado: 'In Stock',
                    Costo: '500',
                    Fabricante: 'Logitech',
                    'Codigo de Barras': 'CB-DUP',
                    Categoria: 'Obsoleta',
                    Responsable: 'inactivo@utr.edu.mx',
                    Lugar: 'Lugar Inventado',
                },
                {
                    Nombre: 'Teclado 2',
                    Descripcion: 'Teclado USB 2',
                    Estado: 'In Stock',
                    Costo: '500',
                    Fabricante: 'Logitech',
                    'Codigo de Barras': 'CB-DUP',
                    Categoria: 'Computo',
                    Responsable: '75511',
                    Lugar: 'Almacen Central',
                },
            ],
            catalogs
        );

        expect(validItems).toEqual([]);
        expect(errors).toHaveLength(2);
        expect(errors[0]?.detalle).toContain('inactiva');
        expect(errors[0]?.detalle).toContain('inactivo');
        expect(errors[0]?.detalle).toContain('Lugar Inventado');
        expect(errors[1]?.detalle).toContain('repetido');
    });
});

describe('excelHelper', () => {
    it('generates an .xlsx template with hidden Catalogos sheet, dropdowns, and parses it back', async () => {
        const buffer = await buildItemTemplateWorkbookBuffer({
            statuses: ['In Use', 'In Stock', 'Damaged', 'Not Assigned'],
            categories: ['Cómputo', 'Mobiliario'],
            responsibles: ['emmanuel.macias@utr.edu.mx'],
            places: ['Almacén Central'],
            exampleRow: [
                'Laptop Dell Latitude',
                'Equipo portatil',
                'In Stock',
                18500,
                'Dell',
                'CB-DEMO-0001',
                'Cómputo',
                'emmanuel.macias@utr.edu.mx',
                'Almacén Central',
            ],
            maxDropdownRows: 10,
        });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

        const itemsSheet = workbook.getWorksheet('Items');
        const catalogsSheet = workbook.getWorksheet('Catalogos');

        expect(itemsSheet).toBeDefined();
        expect(catalogsSheet).toBeDefined();
        expect(catalogsSheet?.state).toBe('hidden');
        expect(itemsSheet?.getCell('C2').dataValidation?.type).toBe('list');
        expect(itemsSheet?.getCell('G2').dataValidation?.formulae).toEqual(['Catalogos!$A$2:$A$3']);
        expect(itemsSheet?.getCell('H2').dataValidation?.formulae).toEqual(['Catalogos!$B$2:$B$2']);
        expect(itemsSheet?.getCell('I2').dataValidation?.formulae).toEqual(['Catalogos!$C$2:$C$2']);

        const parsed = await parseXlsxBuffer(buffer, 'Items');
        expect(parsed.headers).toEqual([...ITEM_CSV_HEADERS]);
        expect(parsed.rows).toHaveLength(1);
        expect(parsed.rows[0]?.Responsable).toBe('emmanuel.macias@utr.edu.mx');
        expect(parsed.rows[0]?.Costo).toBe(18500);
    });

    it('extracts hyperlink emails, richText, and formula results cleanly', () => {
        expect(
            extractExcelCellValue({
                text: 'carlos.mendoza@empresa.com',
                hyperlink: 'mailto:carlos.mendoza@empresa.com',
            })
        ).toBe('carlos.mendoza@empresa.com');

        expect(
            extractExcelCellValue({
                richText: [{ text: 'Lab ' }, { text: 'Central' }],
            })
        ).toBe('Lab Central');

        expect(
            extractExcelCellValue({
                formula: '100+200',
                result: 300,
            })
        ).toBe(300);
    });

    it('generates an employee .xlsx template with dropdown only on Estado and parses it back', async () => {
        const headers = ['IDEmpleado', 'Nombre/s', 'Apellidos', 'Tipo de Empleado', 'Email', 'Area', 'Estado'];
        const buffer = await buildEmployeeTemplateWorkbookBuffer({
            headers,
            statuses: ['ACTIVO', 'INACTIVO'],
            exampleRow: [1001, 'Carlos', 'Mendoza', 'Tiempo Completo', 'carlos.mendoza@utr.edu.mx', 'Soporte TI', 'ACTIVO'],
            maxDropdownRows: 10,
        });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

        const employeesSheet = workbook.getWorksheet('Empleados');
        const catalogsSheet = workbook.getWorksheet('Catalogos');

        expect(employeesSheet).toBeDefined();
        expect(catalogsSheet).toBeUndefined();
        expect(employeesSheet?.getCell('D2').dataValidation?.type).toBe('custom');
        expect(employeesSheet?.getCell('F2').dataValidation?.type).toBe('custom');
        expect(employeesSheet?.getCell('G2').dataValidation?.type).toBe('list');

        const parsed = await parseXlsxBuffer(buffer, 'Empleados');
        expect(parsed.headers).toEqual(headers);
        expect(parsed.rows).toHaveLength(1);
        expect(parsed.rows[0]?.Email).toBe('carlos.mendoza@utr.edu.mx');
        expect(parsed.rows[0]?.Estado).toBe('ACTIVO');
    });
});
