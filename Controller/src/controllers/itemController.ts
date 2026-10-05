import { Item, ItemStatus, Place, User, Category } from '@dis/model';
import type { Response, Request } from 'express'
import { type WhereOptions } from 'sequelize';
import { FilterOptions } from "../helpers/filterOptions.js";
import { createHistoryLog } from '../helpers/historyHelper.js';

const ITEM_INCLUDES = [
    {
        model: Category,
        as: 'category',
        attributes: ['categoryId', 'categoryName']
    },
    {
        model: Place,
        as: 'related_place',
        attributes: ['placeId', 'placeName']
    },
    {
        model: User,
        as: 'responsible_user',
        attributes: ['userId', 'firstName', 'lastName']
    }
];

const formatItems = (itemInstance: InstanceType<typeof Item>) => {
    const item = typeof itemInstance.toJSON === 'function' ? itemInstance.toJSON() : itemInstance;
    const { category, related_place, responsible_user, ...rest } = item;

    return {
        ...rest,
        fk_category: category
            ? { id: category.categoryId, name: category.categoryName }
            : null,
        fk_place: related_place
            ? { id: related_place.placeId, name: related_place.placeName }
            : null,
        fk_user_responsible: responsible_user
            ? {
                id: responsible_user.userId,
                firstName: responsible_user.firstName,
                lastName: responsible_user.lastName
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
            historyDescription: `Se creó el item "${newItem.itemName}" con código de barras: ${newItem.codeBar || 'N/A'}`,
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
        const body = req.body || {}
        const { itemId,
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
        const foundItems = await Item.findAll({
            where: searchOptions,
            include: ITEM_INCLUDES,
            order: [[sortBy, order.toUpperCase()]]
        })

        const formatedItems = foundItems.map(formatItems)
        return res.status(200).json(formatedItems)

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
            fk_responsible_user,
            fk_place
        } = body

        if (
            !itemName ||
            !itemDescription ||
            !cost ||
            !manufacter ||
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
        foundItem.set('itemStatus', itemStatus);
        await foundItem.save();

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
        const deletedRows = await Item.destroy({
            where: { itemId: convertedId }
        })
        if (deletedRows === 0) {
            return res.status(404).json({
                message: "Item not found or already deleted"
            });
        }
        res.status(200).json({
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
            include: [{
                model: Place,
                as: 'related_place',
                attributes: ['placeId', 'placeName']

            },
            {
                model: User,
                as: 'responsible_user',
                attributes: ['userId', 'firstName', 'lastName']
            }]
        })
        if (!foundItem) {
            return res.status(404).json({
                message: "Item not found"
            })
        }
        const item = foundItem.toJSON()
        const fullName =
            item.responsible_user.firstName +
            item.responsible_user.lastName

        item.fk_place = {
            placeId: item.related_place.placeId,
            placeName: item.related_place.placeName
        }

        item.fk_user_responsible = {
            userId: item.responsible_user.userId,

            userName: fullName
        }

        delete item.related_place
        delete item.responsible_user
        res.status(200).json(
            item
        )
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