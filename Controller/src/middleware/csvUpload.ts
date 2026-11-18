import type { NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';

const MAX_SPREADSHEET_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const spreadsheetStorage = multer.memoryStorage();

const isCsvFile = (file: Express.Multer.File): boolean => {
    const normalizedName = file.originalname.toLowerCase();
    return (
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/csv' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        normalizedName.endsWith('.csv')
    );
};

const isXlsxFile = (file: Express.Multer.File): boolean => {
    const normalizedName = file.originalname.toLowerCase();
    return (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        normalizedName.endsWith('.xlsx')
    );
};

const createSingleFileUpload = (
    fieldName: string,
    acceptFile: (file: Express.Multer.File) => boolean,
    invalidTypeMessage: string
): RequestHandler => {
    const upload = multer({
        storage: spreadsheetStorage,
        limits: {
            fileSize: MAX_SPREADSHEET_FILE_SIZE_BYTES,
        },
        fileFilter: (_req, file, callback) => {
            if (acceptFile(file)) {
                callback(null, true);
            } else {
                callback(new Error(invalidTypeMessage));
            }
        },
    }).single(fieldName);

    return (req: Request, res: Response, next: NextFunction): void => {
        upload(req, res, (err: unknown) => {
            if (!err) {
                next();
                return;
            }

            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    res.status(400).json({
                        message: 'El archivo excede el tamaño máximo permitido (5 MB)',
                    });
                    return;
                }

                res.status(400).json({
                    message: `Error al recibir el archivo: ${err.message}`,
                });
                return;
            }

            const message = err instanceof Error ? err.message : 'Archivo inválido';
            res.status(400).json({ message });
        });
    };
};

/**
 * Middleware reutilizable para subir un único archivo CSV en memoria (máximo 5 MB).
 */
export const uploadCsvSingle = (fieldName = 'file'): RequestHandler =>
    createSingleFileUpload(fieldName, isCsvFile, 'Solo se permiten archivos CSV');

/**
 * Middleware reutilizable para subir un único archivo Excel (.xlsx) o CSV en memoria (máximo 5 MB).
 */
export const uploadSpreadsheetSingle = (fieldName = 'file'): RequestHandler =>
    createSingleFileUpload(
        fieldName,
        (file) => isCsvFile(file) || isXlsxFile(file),
        'Solo se permiten archivos Excel (.xlsx) o CSV (.csv)'
    );

export { isXlsxFile };
