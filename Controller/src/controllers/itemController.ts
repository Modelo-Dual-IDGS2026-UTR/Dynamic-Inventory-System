import { Item, ItemStatus, Place, User, Category } from '@dis/model';
import { NotificationType } from '@dis/model/userNotificationModel.js';
import type { Response, Request } from 'express'
import { type WhereOptions } from 'sequelize';
import { FilterOptions } from "../helpers/filterOptions.js";
import { createHistoryLog } from '../helpers/historyHelper.js';
import { createUserNotification } from '../helpers/notificationHelper.js';
import { mySequelize } from '@dis/db/dbConection.js';

const PUBLIC_ITEM_INCLUDES = [
    {
        model: Category,
        as: 'category',
        attributes: ['categoryId', 'categoryName']
    },
    {
        model: User,
        as: 'responsible_user',
        attributes: ['userId', 'firstName', 'lastName']
    },
    {
        model: Place,
        as: 'related_place',
        attributes: ['placeId', 'placeName']
    }
];

interface ItemWithRelations {
    cost?: number;
    codeBar?: string;
    responsible_user?: {
        userId: number;
        firstName: string;
        lastName: string;
    } | null;
    related_place?: {
        placeId: string;
        placeName: string;
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
            userId: res.locals.jwtPayloadContent?.userId || Number(fk_user_responsible),
            itemId: (newItem as any).itemId,
            placeId: fk_place
        });

        const currentUserId = res.locals.jwtPayloadContent?.userId;
        if (fk_user_responsible && Number(fk_user_responsible) !== Number(currentUserId)) {
            await createUserNotification({
                notificationType: NotificationType.ITEM,
                requestDescription: `Se te ha asignado la responsabilidad del nuevo item "${itemName}".`,
                fk_trigger: (newItem as any).itemId,
                fk_user_trigger: currentUserId || null,
                fk_notified: Number(fk_user_responsible)
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

        const findAttributes = role === 1
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
            if (role === 1) {
                return {
                    ...publicData,
                    cost: item.getDataValue('cost'),
                    codeBar: item.getDataValue('codeBar'),
                    responsibleUser: rawItem.responsible_user
                        ? {
                            id: rawItem.responsible_user.userId,
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
            res.status(404).json({
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
            fk_responsible_user,
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
            !fk_responsible_user ||
            !fk_place 
        ) {
            return res.status(400).json({ message: 'All parameters must be filled in,'
                + ' please check documentation' });
        }

        const [modifiedRows] = await Item.update({
            itemName,
            itemDescription,
            cost,
            manufacter,
            itemStatus,
            codeBar,
            fk_responsible_user,
            fk_place
        },
            { where: { itemId: convertedId } }
        )
        await createHistoryLog({
            historyDescription: `Se actualizo la información el item ${itemName} con código de barras: ${codeBar || 'N/A'}`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId || Number(fk_responsible_user),
            itemId: (doesItExist as any).itemId,
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
            itemId: (foundItem as any).itemId,
            placeId: foundItem.getDataValue('fk_place')
        });

        const responsibleId = foundItem.getDataValue('fk_user_responsible');
        const currentUserId = res.locals.jwtPayloadContent?.userId;
        if (responsibleId && Number(responsibleId) !== Number(currentUserId)) {
            await createUserNotification({
                notificationType: NotificationType.ITEM,
                requestDescription: `El item "${foundItem.getDataValue('itemName')}" a tu cargo cambió de estado a: ${itemStatus}.`,
                fk_trigger: parsedItemId,
                fk_user_trigger: currentUserId || null,
                fk_notified: Number(responsibleId)
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
        itemId: (foundItem as any).itemId,
        placeId: foundItem.getDataValue('fk_place')
    });

    const currentUserId = res.locals.jwtPayloadContent?.userId;
    if (Number(responsible_user) !== Number(currentUserId)) {
        await createUserNotification({
            notificationType: NotificationType.ITEM,
            requestDescription: `Se te ha asignado la responsabilidad del item "${foundItem.getDataValue('itemName')}".`,
            fk_trigger: parsedItemId,
            fk_user_trigger: currentUserId || null,
            fk_notified: Number(responsible_user)
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
            userId: res.locals.jwtPayloadContent?.userId || Number(foundItem.getDataValue('fk_user_responsible')),
            itemId: (foundItem as any).itemId,
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
                userId: res.locals.jwtPayloadContent?.userId || Number(foundItem.getDataValue('fk_user_responsible')),
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

        const findAttributes = role === 1
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

        if (role === 1) {
            return res.status(200).json({
                ...publicData,
                cost: foundItem.getDataValue('cost'),
                codeBar: foundItem.getDataValue('codeBar'),
                responsibleUser: rawItem.responsible_user
                    ? {
                        id: rawItem.responsible_user.userId,
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
            });
        }

        return res.status(200).json(publicData);
    } catch (error) {
        throw error;
    }
}



export {
    CreateItem,
    SearchItemById,
    SearchItems,
    UpdateItem,
    DeleteItemByID,
    SetStatus,
    SetCategory,
    ChangeResponsible
}