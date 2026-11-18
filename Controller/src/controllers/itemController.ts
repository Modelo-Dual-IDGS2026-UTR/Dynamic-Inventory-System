import { Employee, Item, ItemStatus, Place, User, Category } from '@dis/model';
import { NotificationType } from '@dis/model/userNotificationModel.js';
import type { Response, Request } from 'express'
import { Op, type WhereOptions } from 'sequelize';
import { FilterOptions } from "../helpers/filterOptions.js";
import { createHistoryLog } from '../helpers/historyHelper.js';
import { createUserNotification } from '../helpers/notificationHelper.js';
import { mySequelize } from '@dis/db/dbConection.js';
import {
    buildCsvContent,
    parseCsvBuffer,
    validateCsvHeaders,
} from '../helpers/csvHelper.js';
import {
    buildItemTemplateWorkbookBuffer,
    parseXlsxBuffer,
} from '../helpers/excelHelper.js';
import { isXlsxFile } from '../middleware/csvUpload.js';
import {
    buildItemLookupCatalogs,
    ITEM_CSV_HEADERS,
    validateAndPrepareItemRows,
    type CategoryLookupRecord,
    type EmployeeLookupRecord,
    type PlaceLookupRecord,
    type ValidatedItemPayload,
} from '../helpers/itemCsvHelper.js';

const PUBLIC_ITEM_INCLUDES = [
    {
        model: Category,
        as: 'category',
        attributes: ['categoryId', 'categoryName']
    },
    {
        model: Employee,
        as: 'responsible_user',
        attributes: ['employeeId', 'firstName', 'lastName', 'email', 'area']
    },
    {
        model: Place,
        as: 'related_place',
        attributes: ['placeId', 'placeName', 'placeLocation']
    }
];

interface ItemWithRelations {
    cost?: number;
    codeBar?: string;
    responsible_user?: {
        employeeId: number;
        firstName: string;
        lastName: string;
        email?: string;
        area?: string;
    } | null;
    related_place?: {
        placeId: number;
        placeName: string;
        placeLocation?: string;
    } | null;
}

const PUBLIC_SORT_FIELDS = ['itemId', 'itemName', 'itemStatus', 'manufacter'] as const;

const formatPublicItem = (itemInstance: InstanceType<typeof Item>) => {
    const item = typeof itemInstance.toJSON === 'function' ? itemInstance.toJSON() : itemInstance;

    return {
        itemId: item.itemId,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        itemStatus: item.itemStatus,
        manufacter: item.manufacter,
        category: item.category
            ? {
                id: item.category.categoryId,
                name: item.category.categoryName
            }
            : null,
        fk_user_responsible: item.responsible_user
            ? {
                id: item.responsible_user.employeeId,
                employeeId: item.responsible_user.employeeId,
                firstName: item.responsible_user.firstName,
                lastName: item.responsible_user.lastName,
                email: item.responsible_user.email,
                area: item.responsible_user.area
            }
            : null,
        fk_place: item.related_place
            ? {
                placeId: item.related_place.placeId,
                placeName: item.related_place.placeName,
                placeLocation: item.related_place.placeLocation
            }
            : null,
    };
};

const CreateItem = async (req: Request, res: Response) => {
    try {
        const {
            itemName,
            itemDescription,
            codeBar,
            cost,
            manufacter,
            fk_category,
            fk_user_responsible,
            fk_place } = req.body
        if (!itemDescription || !itemName || !fk_user_responsible || !fk_category || !fk_place || !cost || !manufacter) {
            return res.status(400).json({
                message: "All parameters must be field please check documentation"
            })
        }
        const responsibleEmployee = await Employee.findOne({
            where: {
                employeeId: Number(fk_user_responsible),
                status: true
            }
        })
        if (!responsibleEmployee) {
            return res.status(400).json({
                message: "Responsible employee not found or inactive"
            })
        }

        const place = await Place.findByPk(Number(fk_place));
        if (!place) {
            return res.status(400).json({
                message: `Place ${fk_place} not found`
            });
        }

        const existingWhere: WhereOptions = {};

        if (codeBar) {
            // Si hay código de barras, esa es la regla principal de duplicado
            existingWhere.codeBar = codeBar;
        } else {
            // Si no hay código de barras, comprobamos si ya existe una coincidencia exacta
            existingWhere.itemName = itemName;
            existingWhere.itemDescription = itemDescription;
            existingWhere.fk_user_responsible = fk_user_responsible;
            existingWhere.codeBar = null;
            existingWhere.fk_place = fk_place;
            existingWhere.fk_category = fk_category;
            existingWhere.cost = cost;
            existingWhere.manufacter = manufacter

        }
        const doesItExist = await Item.findOne({ where: existingWhere })

        if (doesItExist) {
            return res.status(409).json({
                message: "Item already exist"
            })
        }
        const newItem = await Item.create({
            itemName,
            itemDescription,
            cost,
            manufacter,
            codeBar,
            fk_category,
            fk_user_responsible,
            fk_place
        })

        await createHistoryLog({
            historyDescription: `Se creó el item ${itemName} con código de barras: ${codeBar || 'N/A'}`,
            actionType: 'CREATE',
            userId: res.locals.jwtPayloadContent?.userId,
            itemId: newItem.getDataValue('itemId'),
            placeId: fk_place
        });

        const currentUserId = res.locals.jwtPayloadContent?.userId;
        const responsibleUser = await User.findOne({
            where: { employeeId: Number(fk_user_responsible) }
        })
        if (responsibleUser && Number(responsibleUser.getDataValue('userId')) !== Number(currentUserId)) {
            await createUserNotification({
                notificationType: NotificationType.ITEM,
                requestDescription: `Se te ha asignado la responsabilidad del nuevo item "${itemName}".`,
                fk_trigger: newItem.getDataValue('itemId'),
                fk_user_trigger: currentUserId || null,
                fk_notified: Number(responsibleUser.getDataValue('userId'))
            });
        }

        return res.status(200).json({
            message: "item succesfully created"
        })
    } catch (error) {
        throw error;

    }
}

const SearchItemById = async (req: Request, res: Response) => {
    try {
        const role = res.locals.jwtPayloadContent?.role
        const id = req.params.itemId
        if (!id) {
            return res.status(400).json({
                message: "No ID received"
            })
        }
        const convertedId = Number(id)
        if (isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0) {
            return res.status(400).json({
                message: "Invalid User ID"
            })
        }

        return await ShowItem(convertedId, role, res);
    } catch (error) {
        throw error;
    }
}

const SearchItems = async (req: Request, res: Response) => {
    try {
        const role = res.locals.jwtPayloadContent?.role
        const canViewSensitiveItemData = role === 1 || role === 2;
        const body = req.query || {}
        const {         itemId,
        itemName,
        itemDescription,
        manufacter,
        sortBy = 'itemId',
            order = 'ASC'
        } = body
        const page = Math.min(10000, Math.max(1, Number(body.page) || 1));
        const pageSize = Math.min(50, Math.max(1, Number(body.pageSize) || 20));
        const offset = (page - 1) * pageSize;
        const requestedSort = String(sortBy);
        const safeSortBy = PUBLIC_SORT_FIELDS.includes(
            requestedSort as typeof PUBLIC_SORT_FIELDS[number]
        ) ? requestedSort : 'itemId';
        const safeOrder = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        const searchOptions = await FilterOptions({
            itemId,
            itemName,
            itemDescription,
            manufacter,
        })

        const findAttributes = canViewSensitiveItemData
            ? ['itemId', 'itemName', 'itemDescription', 'itemStatus', 'cost', 'codeBar', 'manufacter']
            : ['itemId', 'itemName', 'itemDescription', 'itemStatus', 'manufacter'];

        const { rows: foundItems, count: totalItems } = await Item.findAndCountAll({
            where: searchOptions,
            attributes: findAttributes,
            include: PUBLIC_ITEM_INCLUDES,
            order: [[safeSortBy, safeOrder]],
            limit: pageSize,
            offset
        })

        const formatedItems = foundItems.map(item => {
            const rawItem = (typeof item.toJSON === 'function' ? item.toJSON() : item) as ItemWithRelations;
            const publicData = formatPublicItem(item);
            if (canViewSensitiveItemData) {
                return {
                    ...publicData,
                    cost: item.getDataValue('cost'),
                    codeBar: item.getDataValue('codeBar'),
                    responsibleUser: rawItem.responsible_user
                        ? {
                            id: rawItem.responsible_user.employeeId,
                            employeeId: rawItem.responsible_user.employeeId,
                            firstName: rawItem.responsible_user.firstName,
                            lastName: rawItem.responsible_user.lastName
                        } 
                        : null,
                    relatedPlace: rawItem.related_place
                    ? {
                        id: rawItem.related_place.placeId,
                        placeName: rawItem.related_place.placeName
                    }
                    : null,
                }
            }
            return publicData;
        });

        return res.status(200).json({
            data: formatedItems,
            pagination: {
                page,
                pageSize,
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize)
            }
        })

    } catch (error) {
        throw error;
    }
}

const UpdateItem = async (req: Request, res: Response) => {
    try {

        const id = req.params.itemId
        if (!id) {
            return res.status(400).json({
                message: "No ID received"
            });
        }

        const convertedId = Number(id);
        if (isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0) {
            return res.status(400).json({
                message: "Invalid Item ID"
            });
        }
        const doesItExist = await Item.findOne({ where: { itemId: convertedId } })
        if (!doesItExist) {
            return res.status(404).json({
                message: `Item does not exist`
            })
        }
        const body = req.body || {}
        const {
            itemName,
            itemDescription,
            cost,
            manufacter,
            itemStatus,
            codeBar,
            category,
            fk_user_responsible,
            fk_place
        } = body

        if (
            !itemName ||
            !itemDescription ||
            !cost ||
            !itemStatus ||
            !manufacter ||
            !category ||
            !codeBar ||
            !fk_user_responsible ||
            !fk_place 
        ) {
            return res.status(400).json({ message: 'All parameters must be filled in,'
                + ' please check documentation' });
        }
        const responsibleEmployee = await Employee.findOne({
            where: {
                employeeId: Number(fk_user_responsible),
                status: true
            }
        })
        if (!responsibleEmployee) {
            return res.status(400).json({
                message: 'Responsible employee not found or inactive'
            })
        }

        const [modifiedRows] = await Item.update({
            itemName,
            itemDescription,
            cost,
            manufacter,
            itemStatus,
            codeBar,
            fk_user_responsible,
            fk_place
        },
            { where: { itemId: convertedId } }
        )
        await createHistoryLog({
            historyDescription: `Se actualizo la información el item ${itemName} con código de barras: ${codeBar || 'N/A'}`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId,
            itemId: doesItExist.getDataValue('itemId'),
            placeId: fk_place
        });



        if (modifiedRows == 0) {
            res.status(404).json({
                message: "Item not found or not changes where made"
            })
        } else {
            res.status(200).json({
                message: "Item succesfully updated"
            })
        }

    } catch (error) {
        throw error;
    }
}

const SetStatus = async (req: Request, res: Response) => {
    try {
        const parsedItemId = Number(req.params.itemId);
        const { itemStatus } = req.body || {};

        if (!Number.isInteger(parsedItemId) || parsedItemId <= 0 || !Object.values(ItemStatus).includes(itemStatus)) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const foundItem = await Item.findByPk(parsedItemId);
        if (!foundItem) {
            return res.status(404).json({ message: "Item Not Found" });
        }
        if (foundItem.getDataValue('itemStatus') === itemStatus) {
            return res.status(400).json({
                message: "The status could not change because is the same status"
            });
        }

        foundItem.set('itemStatus', itemStatus);
        await foundItem.save();

        await createHistoryLog({
            historyDescription: `Se actualizó el estado del item "${foundItem.getDataValue('itemName')}" (#${parsedItemId}) a ${itemStatus}.`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId,
            itemId: foundItem.getDataValue('itemId'),
            placeId: foundItem.getDataValue('fk_place')
        });

        const responsibleId = foundItem.getDataValue('fk_user_responsible');
        const currentUserId = res.locals.jwtPayloadContent?.userId;
        const responsibleUser = responsibleId
            ? await User.findOne({ where: { employeeId: Number(responsibleId) } })
            : null;
        if (responsibleUser && Number(responsibleUser.getDataValue('userId')) !== Number(currentUserId)) {
            await createUserNotification({
                notificationType: NotificationType.ITEM,
                requestDescription: `El item "${foundItem.getDataValue('itemName')}" a tu cargo cambió de estado a: ${itemStatus}.`,
                fk_trigger: parsedItemId,
                fk_user_trigger: currentUserId || null,
                fk_notified: Number(responsibleUser.getDataValue('userId'))
            });
        }

        return res.status(200).json({ message: 'Item status successfully updated' });
    } catch (error) {
        throw error;
    }
}

const ChangeResponsible = async(req: Request, res: Response) => {
    const parsedItemId = Number(req.params.itemId);
    const { responsible_user } = req.body || {};

    if (!Number.isInteger(parsedItemId) || parsedItemId <= 0 || !responsible_user) {
        return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
    }
    const responsibleEmployee = await Employee.findOne({
        where: {
            employeeId: Number(responsible_user),
            status: true
        }
    })
    if (!responsibleEmployee) {
        return res.status(400).json({ message: 'Responsible employee not found or inactive' });
    }

    const foundItem = await Item.findByPk(parsedItemId);
    if (!foundItem) {
        return res.status(404).json({ message: "Item Not Found" });
    }

    if (Number(responsible_user) === Number(foundItem.getDataValue('fk_user_responsible'))) {
        return res.status(400).json({
            message: "The responsible user could not change because is the same user"
        });
    }

    foundItem.set('fk_user_responsible', responsible_user);
    await foundItem.save();

    await createHistoryLog({
        historyDescription: `Se actualizó el usuario responsable del item "${foundItem.getDataValue('itemName')}" (#${parsedItemId}) a ${responsible_user}.`,
        actionType: 'UPDATE',
        userId: res.locals.jwtPayloadContent?.userId,
        itemId: foundItem.getDataValue('itemId'),
        placeId: foundItem.getDataValue('fk_place')
    });

    const currentUserId = res.locals.jwtPayloadContent?.userId;
    const responsibleUser = await User.findOne({
        where: { employeeId: Number(responsible_user) }
    })
    if (responsibleUser && Number(responsibleUser.getDataValue('userId')) !== Number(currentUserId)) {
        await createUserNotification({
            notificationType: NotificationType.ITEM,
            requestDescription: `Se te ha asignado la responsabilidad del item "${foundItem.getDataValue('itemName')}".`,
            fk_trigger: parsedItemId,
            fk_user_trigger: currentUserId || null,
            fk_notified: Number(responsibleUser.getDataValue('userId'))
        });
    }

    return res.status(200).json({ message: 'Item responsible successfully updated' });
}

const SetCategory = async (req: Request, res: Response) => {
    try {
        const parsedItemId = Number(req.params.itemId);
        const { category } = req.body || {};

        if (!Number.isInteger(parsedItemId) || parsedItemId <= 0 || !category) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const foundItem = await Item.findByPk(parsedItemId);
        if (!foundItem) {
            return res.status(404).json({ message: "Item Not Found" });
        }

        if (Number(category) === Number(foundItem.getDataValue('fk_category'))) {
            return res.status(400).json({
                message: "The category could not change because is the same category"
            });
        }

        foundItem.set('fk_category', category);
        await foundItem.save();

        await createHistoryLog({
            historyDescription: `Se actualizó la categoría del item "${foundItem.getDataValue('itemName')}" (#${parsedItemId}) a ${category}.`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId,
            itemId: foundItem.getDataValue('itemId'),
            placeId: foundItem.getDataValue('fk_place')
        });

        return res.status(200).json({ message: 'Item category successfully updated' });
    } catch (error) {
        throw error;
    }
}

const DeleteItemByID = async (req: Request, res: Response) => {
    try {
        const id = req.params.itemId
        if (!id) {
            return res.status(400).json({
                message: "No ID received"
            });
        }

        const convertedId = Number(id)
        const foundItem = await Item.findByPk(convertedId)
        if (!foundItem) {
            return res.status(404).json({
                message: "Item not found or already deleted"
            });
        }

        await mySequelize.transaction(async (transaction) => {
            await createHistoryLog({
                historyDescription: `Se eliminó el item ${convertedId}.`,
                actionType: 'DELETE',
                userId: res.locals.jwtPayloadContent?.userId,
                itemId: convertedId,
                placeId: foundItem.getDataValue('fk_place'),
                transaction
            });

            const deletedRows = await Item.destroy({
                where: { itemId: convertedId },
                transaction
            });

            if (deletedRows === 0) {
                throw new Error('Item could not be deleted');
            }
        });

        return res.status(200).json({
            message: `item ${convertedId} succesfully destroyed`
        })

    } catch (error) {
        throw error;
    }
}

async function ShowItem(id: number, role: number, res: Response) {
    try {
        const canViewSensitiveItemData = role === 1 || role === 2;

        const findAttributes = canViewSensitiveItemData
        ? ['itemId', 'itemName', 'itemDescription', 'itemStatus', 'cost', 'codeBar', 'manufacter']
        : ['itemId', 'itemName', 'itemDescription', 'itemStatus', 'manufacter'];

        const foundItem = await Item.findByPk(id, {
            attributes: findAttributes,
            include: PUBLIC_ITEM_INCLUDES
        })
        if (!foundItem) {
            return res.status(404).json({
                message: "Item not found"
            })
        }

        const rawItem = (typeof foundItem.toJSON === 'function' ? foundItem.toJSON() : foundItem) as ItemWithRelations;
        const publicData = formatPublicItem(foundItem);

        if (canViewSensitiveItemData) {
            return res.status(200).json({
                ...publicData,
                cost: foundItem.getDataValue('cost'),
                codeBar: foundItem.getDataValue('codeBar'),
                responsibleUser: rawItem.responsible_user
                    ? {
                        id: rawItem.responsible_user.employeeId,
                        employeeId: rawItem.responsible_user.employeeId,
                        firstName: rawItem.responsible_user.firstName,
                        lastName: rawItem.responsible_user.lastName
                    } 
                    : null,
                relatedPlace: rawItem.related_place
                ? {
                    id: rawItem.related_place.placeId,
                    placeName: rawItem.related_place.placeName,
                    placeLocation: rawItem.related_place.placeLocation
                }
                : null,
            });
        }

        return res.status(200).json(publicData);
    } catch (error) {
        throw error;
    }
}



const downloadItemImportTemplate = async (req: Request, res: Response) => {
    try {
        const requestedFormat = String(req.query.format ?? 'xlsx').trim().toLowerCase();

        const [categories, employees, places] = await Promise.all([
            Category.findAll({
                where: { categoryStatus: true },
                attributes: ['categoryName'],
                order: [['categoryName', 'ASC']],
            }),
            Employee.findAll({
                where: { status: true },
                attributes: ['email'],
                order: [['email', 'ASC']],
            }),
            Place.findAll({
                attributes: ['placeName'],
                order: [['placeName', 'ASC']],
            }),
        ]);

        const categoryNames = Array.from(
            new Set(
                categories
                    .map((c) => String(c.getDataValue('categoryName') ?? '').trim())
                    .filter(Boolean)
            )
        );
        const employeeEmails = Array.from(
            new Set(
                employees
                    .map((e) => String(e.getDataValue('email') ?? '').trim())
                    .filter(Boolean)
            )
        );
        const placeNames = Array.from(
            new Set(
                places
                    .map((p) => String(p.getDataValue('placeName') ?? '').trim())
                    .filter(Boolean)
            )
        );

        const exampleRow = [
            'Laptop Dell Latitude',
            'Equipo portatil asignado para desarrollo y soporte',
            ItemStatus.IN_STOCK,
            18500,
            'Dell',
            'CB-DEMO-0001',
            categoryNames[0] ?? 'Computo',
            employeeEmails[0] ?? 'responsable@utr.edu.mx',
            placeNames[0] ?? 'Almacen Central',
        ];

        if (requestedFormat === 'csv') {
            const csvContent = buildCsvContent(ITEM_CSV_HEADERS, [exampleRow]);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="plantilla_items.csv"');
            return res.status(200).send(csvContent);
        }

        const workbookBuffer = await buildItemTemplateWorkbookBuffer({
            statuses: Object.values(ItemStatus),
            categories: categoryNames,
            responsibles: employeeEmails,
            places: placeNames,
            exampleRow,
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', 'attachment; filename="plantilla_items.xlsx"');
        return res.status(200).send(workbookBuffer);
    } catch (error) {
        console.error('Error al generar plantilla de items:', error);
        return res.status(500).json({ message: 'Error al generar la plantilla de items' });
    }
};

const importItems = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha subido ningún archivo' });
        }

        const { headers: fileHeaders, rows: parsedRows } = isXlsxFile(req.file)
            ? await parseXlsxBuffer(req.file.buffer, 'Items')
            : await parseCsvBuffer(req.file.buffer);

        const headerValidation = validateCsvHeaders(fileHeaders, ITEM_CSV_HEADERS);

        if (!headerValidation.valid) {
            return res.status(400).json({
                message: 'Los encabezados del archivo no son válidos',
                expectedHeaders: [...ITEM_CSV_HEADERS],
                receivedHeaders: fileHeaders,
                missingHeaders: headerValidation.missingHeaders,
                extraHeaders: headerValidation.extraHeaders,
                duplicateHeaders: headerValidation.duplicateHeaders,
            });
        }

        const [rawCategories, rawEmployees, rawPlaces] = await Promise.all([
            Category.findAll({
                attributes: ['categoryId', 'categoryName', 'folioNumber', 'categoryStatus'],
            }),
            Employee.findAll({
                attributes: ['employeeId', 'email', 'status'],
            }),
            Place.findAll({
                attributes: ['placeId', 'placeName'],
            }),
        ]);

        const catalogs = buildItemLookupCatalogs(
            rawCategories.map((c) => c.toJSON() as CategoryLookupRecord),
            rawEmployees.map((e) => e.toJSON() as EmployeeLookupRecord),
            rawPlaces.map((p) => p.toJSON() as PlaceLookupRecord)
        );

        const { validItems, errors } = validateAndPrepareItemRows(parsedRows, catalogs);

        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Se encontraron errores de validación en el archivo CSV. No se creó ni modificó ningún item.',
                errors,
            });
        }

        if (validItems.length === 0) {
            return res.status(400).json({
                message: 'El archivo CSV no contiene filas válidas para importar',
            });
        }

        const t = await mySequelize.transaction();

        try {
            const existingItems = await Item.findAll({
                where: {
                    codeBar: {
                        [Op.in]: validItems.map((item) => item.codeBar),
                    },
                },
                transaction: t,
            });

            const existingByCodeBar = new Map<string, InstanceType<typeof Item>[]>();
            for (const existingItem of existingItems) {
                const key = String(existingItem.getDataValue('codeBar') ?? '').trim().toLowerCase();
                if (!key) continue;
                const list = existingByCodeBar.get(key);
                if (list) {
                    list.push(existingItem);
                } else {
                    existingByCodeBar.set(key, [existingItem]);
                }
            }

            const ambiguousCodeBars: string[] = [];
            const itemsToCreate: ValidatedItemPayload[] = [];
            const itemsToUpdate: Array<{
                instance: InstanceType<typeof Item>;
                payload: ValidatedItemPayload;
            }> = [];

            for (const itemPayload of validItems) {
                const key = itemPayload.codeBar.trim().toLowerCase();
                const matches = existingByCodeBar.get(key) ?? [];

                if (matches.length > 1) {
                    ambiguousCodeBars.push(itemPayload.codeBar);
                    continue;
                }

                const existingMatch = matches[0];
                if (existingMatch) {
                    itemsToUpdate.push({ instance: existingMatch, payload: itemPayload });
                } else {
                    itemsToCreate.push(itemPayload);
                }
            }

            if (ambiguousCodeBars.length > 0) {
                await t.rollback();
                return res.status(409).json({
                    message:
                        'Existen múltiples items en la base de datos con el mismo código de barras; no se puede determinar cuál actualizar',
                    duplicatedCodeBars: ambiguousCodeBars,
                });
            }

            if (itemsToCreate.length > 0) {
                await Item.bulkCreate(
                    itemsToCreate.map((item) => ({ ...item })),
                    {
                        transaction: t,
                        validate: true,
                    }
                );
            }

            for (const { instance, payload } of itemsToUpdate) {
                await instance.update({ ...payload }, { transaction: t });
            }

            await t.commit();

            return res.status(200).json({
                message: 'Importación y actualización de items completada con éxito',
                totalProcesados: validItems.length,
                creados: itemsToCreate.length,
                actualizados: itemsToUpdate.length,
            });
        } catch (error) {
            await t.rollback();
            console.error('Error en la transacción de importación de items:', error);
            return res.status(500).json({ message: 'Error al escribir los items en la base de datos' });
        }
    } catch (error) {
        console.error('Error al importar items:', error);
        return res.status(500).json({ message: 'Error al procesar la importación de items' });
    }
};

export {
    CreateItem,
    SearchItemById,
    SearchItems,
    UpdateItem,
    DeleteItemByID,
    SetStatus,
    SetCategory,
    ChangeResponsible,
    importItems,
    downloadItemImportTemplate
}