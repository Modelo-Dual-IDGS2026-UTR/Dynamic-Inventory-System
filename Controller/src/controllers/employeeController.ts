import { Employee } from "@dis/model";
import type { Request, Response } from "express";
import { Op } from "sequelize";
import { FilterOptions } from "../helpers/filterOptions.js";
import { mySequelize } from '@dis/db/dbConection.js';
import {
    buildCsvContent,
    parseCsvBuffer,
    validateCsvHeaders,
    type CsvRowError,
} from "../helpers/csvHelper.js";
import {
    EMPLOYEE_CSV_HEADERS,
    validateAndPrepareEmployeeRows,
} from "../helpers/employeeCsvHelper.js";
import {
    buildEmployeeTemplateWorkbookBuffer,
    parseXlsxBuffer,
} from "../helpers/excelHelper.js";
import { isXlsxFile } from "../middleware/csvUpload.js";

class EmployeeImportConflictError extends Error {
    readonly errors: CsvRowError[];

    constructor(errors: CsvRowError[]) {
        super('Se encontraron conflictos de correo electrónico con empleados existentes');
        this.errors = errors;
    }
}

const downloadEmployeeImportTemplate = async (req: Request, res: Response) => {
    try {
        const requestedFormat = String(req.query.format ?? 'xlsx').trim().toLowerCase();

        const exampleRow = [
            1001,
            'Carlos',
            'Mendoza',
            'Tiempo Completo',
            'carlos.mendoza@utr.edu.mx',
            'Soporte TI',
            'ACTIVO',
        ];

        if (requestedFormat === 'csv') {
            const csvContent = buildCsvContent(EMPLOYEE_CSV_HEADERS, [exampleRow]);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="plantilla_empleados.csv"');
            return res.status(200).send(csvContent);
        }

        const workbookBuffer = await buildEmployeeTemplateWorkbookBuffer({
            headers: EMPLOYEE_CSV_HEADERS,
            statuses: ['ACTIVO', 'INACTIVO'],
            exampleRow,
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', 'attachment; filename="plantilla_empleados.xlsx"');
        return res.status(200).send(workbookBuffer);
    } catch (error) {
        console.error('Error al generar plantilla de empleados:', error);
        return res.status(500).json({ message: 'Error al generar la plantilla de empleados' });
    }
};

const importEmployees = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }

        const { headers: fileHeaders, rows: parsedRows } = isXlsxFile(req.file)
            ? await parseXlsxBuffer(req.file.buffer, 'Empleados')
            : await parseCsvBuffer(req.file.buffer);
        const headerValidation = validateCsvHeaders(fileHeaders, EMPLOYEE_CSV_HEADERS);

        if (!headerValidation.valid) {
            return res.status(400).json({
                message: 'Los encabezados del archivo no son válidos',
                expectedHeaders: [...EMPLOYEE_CSV_HEADERS],
                receivedHeaders: fileHeaders,
                missingHeaders: headerValidation.missingHeaders,
                extraHeaders: headerValidation.extraHeaders,
                duplicateHeaders: headerValidation.duplicateHeaders,
            });
        }

        const { validRows, errors } = validateAndPrepareEmployeeRows(parsedRows);

        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Se encontraron errores de validación en el archivo CSV',
                errors,
            });
        }

        if (validRows.length === 0) {
            return res.status(400).json({
                message: 'El archivo CSV no contiene filas válidas para importar',
            });
        }

        await mySequelize.transaction(async (t) => {
            const existingByEmail = await Employee.findAll({
                where: {
                    email: {
                        [Op.in]: validRows.map((row) => row.data.email),
                    },
                },
                attributes: ['employeeId', 'email'],
                transaction: t,
            });

            const emailOwnerMap = new Map<string, number>();
            for (const existing of existingByEmail) {
                const emailKey = String(existing.getDataValue('email') ?? '').trim().toLowerCase();
                if (emailKey) {
                    emailOwnerMap.set(emailKey, Number(existing.getDataValue('employeeId')));
                }
            }

            const emailConflicts: CsvRowError[] = [];
            for (const { fila, data } of validRows) {
                const existingOwnerId = emailOwnerMap.get(data.email);
                if (existingOwnerId !== undefined && existingOwnerId !== data.employeeId) {
                    emailConflicts.push({
                        fila,
                        detalle: `El correo "${data.email}" ya pertenece a otro empleado registrado (ID ${existingOwnerId})`,
                    });
                }
            }

            if (emailConflicts.length > 0) {
                throw new EmployeeImportConflictError(emailConflicts);
            }

            await Employee.bulkCreate(
                validRows.map((row) => ({ ...row.data })),
                {
                    transaction: t,
                    validate: true,
                    updateOnDuplicate: [
                        'firstName',
                        'lastName',
                        'employeeType',
                        'email',
                        'area',
                        'status',
                    ],
                }
            );
        });

        return res.status(200).json({
            message: 'Importación y actualización completada con éxito',
        });
    } catch (error) {
        if (error instanceof EmployeeImportConflictError) {
            return res.status(400).json({
                message: 'Se encontraron conflictos con empleados existentes en la base de datos',
                errors: error.errors,
            });
        }
        console.error('Error al importar empleados:', error);
        return res.status(500).json({ error: 'Error al procesar la importación' });
    }
};


const ShowAllEmployees = async (req: Request, res: Response) => {
    try {
        const {
            employeeId,
            firstName,
            lastName,
            employeeType,
            email,
            area,
            status,
            sortBy = 'employeeId',
            order = 'ASC'
        } = req.body || {};

        const searchOptions = FilterOptions({
            employeeId,
            firstName,
            lastName,
            employeeType,
            email,
            area,
            status,
        })

        const foundEmployees = await Employee.findAll({
            where: searchOptions,
            order: [[sortBy, String(order).toUpperCase()]],
        });

        return res.status(200).json(foundEmployees);
    } catch (error) {
        throw error;
    }
}

const SearchEmployeeById=async (req:Request,res:Response)=>{
    const id=req.params.employeeId
    if(!id){
        return res.status(400).json({
            message:"No User ID given"
        })
    }
    try {
        const convertedId=Number(id)
        if(isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0){
          return res.status(400).json({
            message:"Invalid User ID"
        })  
        }
        ShowEmployee(convertedId,res); 
        
    } catch (error) {
         throw error;
    }
}

async function ShowEmployee(id:number,res:Response){
    
    const foundUser=await Employee.findByPk(id)
        
        if(!foundUser){
            return res.status(404).json({
                message:"User not found or does not exist"
            })
        };
       
        return res.status(200).json(foundUser)

} 


const CreateEmployee= async (req:Request,res:Response,)=>{
    
    try {
        const {
            employeeId,
            firstName,
            lastName,
            employeeType,
            email,
            area,
            status,
        }=req.body
        if(!firstName||!lastName||!employeeId||!email||!area || !employeeType || !status ){
            return res.status(400).json({
                message: "All fields (firstName,lastName,email,area) are required"
            });
        }
        const normalizedEmail = String(email).trim().toLowerCase()
        const employee = await Employee.findOne({
            where: {
                email: normalizedEmail,
                status: true
            }
        })
        if (employee) {
            return res.status(400).json({
                message: 'This employee already exists:', normalizedEmail
            })
        }
        await Employee.create({
            employeeId,
            firstName,
            lastName,
            employeeType,
            email,
            area,
            status
        })

        return res.status(200).json({
            message: "User created"
        })
        
    } catch (error) {
        throw error;
    }
};

const UpdateEmployee=async (req:Request,res:Response)=>{
    try {
        const id=req.params.employeeId
        const body=req.body||{}
        const {
            firstName,
            lastName,
            employeeType,
            email,
            area,
            status,
        }=body
        if(!id){
            return res.status(400).json({
            message:"No Employee ID given"
        })
        }

        if (
            !firstName ||
            !lastName ||
            !employeeType ||
            !email ||
            !area ||
            !status
        ) {
            return res.status(400).json({ message: 'All parameters must be filled in,'
                + ' please check documentation' });
        }

        const convertedId=Number(id)
        if(isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0){
          return res.status(400).json({
            message:"Invalid Employee ID"
        })  
        }
        const foundUser = await Employee.findByPk(convertedId)
        if (!foundUser) {
            return res.status(404).json({
                message: 'Employee not found'
            })
        }
        const normalizedEmail = email ? String(email).trim().toLowerCase() : foundUser.getDataValue('email')
        const employee = await Employee.findOne({
            where: {
                email: normalizedEmail,
                status: true
            }
        })

        if (foundUser.getDataValue('employeeId') && !employee) {
            return res.status(403).json({
                message: 'The employee email must belong to an active employee'
            })
        }

    const [editedRows]=await Employee.update({
        firstName,
        lastName,
        employeeType,
        email,
        area,
        status,
    },{where:{employeeId:convertedId}})

    if(editedRows==0){
        return res.status(204).json({
            message:"User not found or no changes were made"
        })
    }
    return res.status(200).json({
        message:"User succefully edited"
    })

    }catch (error) {
           throw error;
    }
}

const changeEmployeeStatus = async (req: Request, res: Response) => {
    try {
        const employeeId = Number(req.params.employeeId);
        const requestedStatus = req.body?.employeeStatus ?? req.body?.status;

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({ message: 'Invalid Employee ID' });
        }

        if (typeof requestedStatus !== 'boolean') {
            return res.status(400).json({ message: 'A boolean employee status is required' });
        }

        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        if (requestedStatus === employee.getDataValue('status')) {
            return res.status(400).json({
                message: 'The status could not change because it is already set to that value'
            });
        }

        employee.set('status', requestedStatus);
        await employee.save();

        return res.status(200).json({ message: 'Employee status successfully updated' });
    } catch (error) {
        throw error;
    }
};

const deleteEmployee = async (req: Request, res: Response) => {
    try {
        const employeeId = Number(req.params.employeeId);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({ message: 'Invalid Employee ID' });
        }

        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        await employee.destroy();

        return res.status(200).json({ message: 'Employee successfully deleted' });
    } catch (error) {
        throw error;
    }
};

export {
    downloadEmployeeImportTemplate,
    importEmployees,
    ShowAllEmployees,
    CreateEmployee,
    SearchEmployeeById,
    UpdateEmployee,
    changeEmployeeStatus,
    deleteEmployee
}
