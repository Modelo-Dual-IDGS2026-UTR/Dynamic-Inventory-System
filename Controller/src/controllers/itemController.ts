import { Item, ItemStatus, Place, User, Category } from '@dis/model';
import type { Response, Request } from 'express'
import { type WhereOptions } from 'sequelize';
import { FilterOptions } from "../helpers/filterOptions.js";
import { createHistoryLog } from '../helpers/historyHelper.js';

const PUBLIC_ITEM_INCLUDES = [
    {
        model: Category,
        as: 'category',
        attributes: ['categoryId', 'categoryName']
    }
];

const PUBLIC_SORT_FIELDS = ['itemId', 'itemName', 'itemStatus', 'manufacter'] as const;

const formatPublicItem = (itemInstance: InstanceType<typeof Item>) => {
    const item = typeof itemInstance.toJSON === 'function' ? itemInstance.toJSON() : itemInstance;
    const { category, related_place, responsible_user, ...rest } = item;

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
            : null
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

        return res.status(200).json({
            message: "item succesfully created"
        })
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error, not your fault :D",
            error: error
        })

    }
}

const SearchItemById = async (req: Request, res: Response) => {
    try {
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

        ShowItem(convertedId, res)
    } catch (error) {
        res.status(500).json({
            message: "Internal server error, not your fault :D",
            error: error
        })
    }
}

const SearchItems = async (req: Request, res: Response) => {
    try {
        const body = req.query || {}
        const {         itemId,
            itemName,
            itemDescription,
            cost,
            manufacter,
            codeBar,
            fk_user_responsible,
            fk_place,
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
            cost,
            manufacter,
            codeBar,
            fk_user_responsible,
            fk_place
        })
        const { rows: foundItems, count: totalItems } = await Item.findAndCountAll({
            where: searchOptions,
            attributes: ['itemId', 'itemName', 'itemDescription', 'itemStatus', 'manufacter'],
            include: PUBLIC_ITEM_INCLUDES,
            order: [[safeSortBy, safeOrder]],
            limit: pageSize,
            offset
        })

        const formatedItems = foundItems.map(formatPublicItem)
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
        res.status(500).json({
            message: "Internal server error, not your fault :D",
            error: error
        })
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
                message: `item  do not exist`
            })
        }
        const body = req.body || {}
        const {
            itemName,
            itemDescription,
            cost,
            manufacter,
            codeBar,
            category,
            fk_responsible_user,
            fk_place
        } = body

        if (
            !itemName ||
            !itemDescription ||
            !cost ||
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
                message: "item succesfully updated"
            })
        }

    } catch (error) {
        res.status(500).json({
            message: "Internal server error, not your fault :D",
            error: error
        })
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
              res.status(404).json({
                message: "Not changes where made"
            })
        }

        foundItem.set('itemStatus', itemStatus);
        await foundItem.save();

        await createHistoryLog({
            historyDescription: `Se actualizó el estado del item a ${foundItem.getDataValue('itemStatus')}.`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId,
            itemId: (foundItem as any).itemId,
            placeId: foundItem.getDataValue('fk_place')
        });


        return res.status(200).json({ message: 'Item status successfully updated' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
    }
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
        foundItem.set('category', category);
        await foundItem.save();

        await createHistoryLog({
            historyDescription: `Se actualizó la categoría del item ${foundItem.getDataValue('itemName')}.`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId || Number(foundItem.getDataValue('fk_user_responsible')),
            itemId: (foundItem as any).itemId,
            placeId: foundItem.getDataValue('fk_place')
        });

        return res.status(200).json({ message: 'Item category successfully updated' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
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
        const deletedRows = await Item.destroy({
            where: { itemId: convertedId }
        })
        if (deletedRows === 0) {
            return res.status(404).json({
                message: "Item not found or already deleted"
            });
        }
        await createHistoryLog({
            historyDescription: `Se eliminó el item ${convertedId}.`,
            actionType: 'DELETE',
            userId: res.locals.jwtPayloadContent?.userId || Number(foundItem?.getDataValue('fk_user_responsible')),
            itemId: convertedId
        });

        return res.status(200).json({
            message: `item ${convertedId} succesfully destroyed`
        })

    } catch (error) {
        res.status(500).json({
            message: "Internal server error, not your fault :D",
            error: error
        })
    }
}

async function ShowItem(id: number, res: Response) {
    try {
        const foundItem = await Item.findByPk(id, {
            attributes: ['itemId', 'itemName', 'itemDescription', 'itemStatus', 'manufacter'],
            include: PUBLIC_ITEM_INCLUDES
        })
        if (!foundItem) {
            return res.status(404).json({
                message: "Item not found"
            })
        }
        return res.status(200).json(formatPublicItem(foundItem))
    } catch (error) {
        res.status(500).json({
            message: "Internal server error, not your fault :D",
            error: error
        })
    }
}



export {
    CreateItem,
    SearchItemById,
    SearchItems,
    UpdateItem,
    DeleteItemByID,
    SetStatus,
    SetCategory
}