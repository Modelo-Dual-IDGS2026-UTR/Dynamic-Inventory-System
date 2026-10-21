import { Employee } from "@dis/model";
import type { Request, Response } from "express";
import { Readable } from 'stream';
import * as fastCsv from 'fast-csv';
import { z } from "zod";
import { mySequelize } from '@dis/db/dbConection.js';

const EmployeeValidation = z.object({
        employeeId: z.coerce.number().int().positive(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        employeeType: z.string().optional(),
        email: z.email(),
        area: z.string().optional(),
        status: z.preprocess(
            (value) => {
                if (value === 'true' || value === '1') return true;
                if (value === 'false' || value === '0') return false;
                return value;
            },
            z.boolean()
        ),
})

const importEmployees = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }
        
        const parsedRows: unknown[] = [];

        const stream = Readable.from(req.file.buffer);

        await new Promise((resolve, reject) => {
        stream
            .pipe(fastCsv.parse({ headers: true, trim: true }))
            .on('data', (row) => parsedRows.push(row))
            .on('end', resolve)
            .on('error', reject);
        });

        const validRows: z.infer<typeof EmployeeValidation>[] = [];
        const errors: Array<{ fila: number; detalle: string}> = [];

        

        parsedRows.forEach((row, index) => {
            const result = EmployeeValidation.safeParse(row);
            if (!result.success) {
                errors.push({
                    fila: index + 2,
                    detalle: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                });
            } else {
                validRows.push(result.data)
            }
        });

        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Se encontraron errores de validación en el archivo CSV',
                errors
            });
        }

        const t = await mySequelize.transaction();

        try {
            // `bulkCreate` realiza la inserción masiva en una sola consulta SQL
            await Employee.bulkCreate(validRows, {
            transaction: t,
            validate: true,
            updateOnDuplicate: [
                'firstName',
                'lastName',
                'employeeType',
                'email',
                'area',
                'status'
            ]
            });

            // Si todo salió bien, guardamos los cambios de forma definitiva
            await t.commit();

            return res.status(200).json({
            message: 'Importación y actualización completada con éxito'
     });
    } catch (error) {
        await t.rollback();
    console.error('Error en la transacción:', error);
    return res.status(500).json({ error: 'Error al escribir en la base de datos' });
    }
    } catch (error) {
        console.error('Error al importar empleados:', error);
        return res.status(500).json({ error: 'Error al procesar la importación' });
    }
};


export {
    importEmployees
}

