import { Employee } from "@dis/model";
import type { Request, Response } from "express";
import { Readable } from 'stream';
import * as fastCsv from 'fast-csv';
import { z } from "zod";
import { FilterOptions } from "../helpers/filterOptions.js";
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
                if (typeof value === 'string') {
                    const normalized = value.trim().toUpperCase();

                    if (normalized === 'ACTIVO' || normalized === '1' || normalized === 'TRUE') return true;
                    if (normalized === 'INACTIVO' || normalized === '0' || normalized === 'FALSE') return false;
                }

                if (value === true || value === 1) return true;
                if (value === false || value === 0) return false;

                return value;
            },
            z.boolean()
        ),
})

const normalizeHeader = (value: string) =>
    String(value)
        .replace(/^\uFEFF/, '')
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();

const expectedCsvHeaders = [
    'IDEmpleado',
    'Nombre/s',
    'Apellidos',
    'Tipo de Empleado',
    'Email',
    'Area',
    'Estado'
];

const mapExcelRowToEmployee = (row: Record<string, unknown>) => {
    const normalizedRow = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
    );

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

const importEmployees = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }
        
        const parsedRows: unknown[] = [];
        let csvHeaders: string[] = [];

        const stream = Readable.from(req.file.buffer);

        await new Promise((resolve, reject) => {
        stream
            .pipe(fastCsv.parse({
                headers: (headers) => {
                    csvHeaders = headers.map((header) =>
                        String(header).replace(/^\uFEFF/, '').trim()
                    );
                    return headers;
                },
                trim: true
            }))
            .on('data', (row) => parsedRows.push(row))
            .on('end', resolve)
            .on('error', reject);
        });

        const hasExpectedHeaders =
            csvHeaders.length === expectedCsvHeaders.length &&
            csvHeaders.every((header, index) => header === expectedCsvHeaders[index]);

        if (!hasExpectedHeaders) {
            return res.status(400).json({
                message: 'Los encabezados del CSV no son válidos',
                expectedHeaders: [
                    'IDEmpleado',
                    'Nombre/s',
                    'Apellidos',
                    'Tipo de Empleado',
                    'Email',
                    'Area',
                    'Estado'
                ],
                receivedHeaders: csvHeaders
            });
        }

        const validRows: z.infer<typeof EmployeeValidation>[] = [];
        const errors: Array<{ fila: number; detalle: string}> = [];

        parsedRows.forEach((row, index) => {
            const rawValues = Object.values(row as Record<string, unknown> ?? {});
            const hasContent = rawValues.some((value) => String(value ?? '').trim() !== '');

            if (!hasContent) {
                return;
            }

            const mappedRow = mapExcelRowToEmployee(row as Record<string, unknown>);
            const result = EmployeeValidation.safeParse(mappedRow);

            if (!result.success) {
                errors.push({
                    fila: index + 2,
                    detalle: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                });
                return;
            }

            validRows.push(result.data)
        });

        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Se encontraron errores de validación en el archivo CSV',
                errors
            });
        }

        if (validRows.length === 0) {
            return res.status(400).json({
                message: 'El archivo CSV no contiene filas válidas para importar'
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
        const newEmployee= await Employee.create({
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
    importEmployees,
    ShowAllEmployees,
    CreateEmployee,
    SearchEmployeeById,
    UpdateEmployee,
    changeEmployeeStatus,
    deleteEmployee
}
