import { Category } from '@dis/model'
import { FilterOptions } from "../helpers/filterOptions.js";
import type { Response, Request } from 'express';

const CreateCategory = async (req: Request, res: Response) => {
    try {
        const {
            categoryName,
            categoryDescription,
            folioNumber
        } = req.body;

        if (
            !categoryName ||
            !categoryDescription ||
            !folioNumber
        ) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

await Category.create({
    categoryName,
    categoryDescription,
    folioNumber
});

return res.status(200).json({ message: 'Category successfully created' });
    } catch (error) {
    return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
}
};

const SearchCategoryById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.categoryId);
        if (!id || isNaN(id) || !Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'Invalid Category ID' });
        }

        const foundCategory = await Category.findByPk(id);
        if (!foundCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        return res.status(200).json(foundCategory);
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
    }
};

const AllCategories = async (req: Request, res: Response) => {
    try {
        const {
            categoryId,
            categoryName,
            categoryDescription,
            sortBy = 'categoryId',
            order = 'ASC'
        } = req.body || {};

        const searchOptions = FilterOptions({
            categoryId,
            categoryName,
            categoryDescription
        });

        const foundCategories = await Category.findAll({
            where: searchOptions,
            order: [[sortBy, String(order).toUpperCase()]]
        });

        return res.status(200).json(foundCategories);
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
    }
};

const UpdateCategory = async (req: Request, res: Response) => {
    try {

        const id = req.params.categoryId
        if (!id) {
            return res.status(400).json({
                message: "No ID received"
            });
        }

        const convertedId = Number(id);
        if (isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0) {
            return res.status(400).json({
                message: "Invalid Category ID"
            });
        }
        const doesItExist = await Category.findOne({ where: { categoryId: convertedId } })
        if (!doesItExist) {
            res.status(404).json({
                message: `Category does not exist`
            })
        }
        const body = req.body || {}
        const {
            categoryName,
            categoryDescription,
            folioNumber,
        } = body

        if (
            !categoryName ||
            !categoryDescription ||
            !folioNumber
        ) {
            return res.status(400).json({ message: 'All parameters must be filled in,'
                + ' please check documentation' });
        }
        
        const [modifiedRows] = await Category.update({
            categoryName,
            categoryDescription,
            folioNumber
        },
            { where: { categoryId: convertedId } }
        )
        if (modifiedRows == 0) {
            res.status(404).json({
                message: "Category not found or not changes where made"
            })
        } else {
            res.status(200).json({
                message: "Category succesfully updated"
            })
        }

    } catch (error) {
        res.status(500).json({
            message: "Internal server error, not your fault :D",
            error: error
        })
    }
}

const DeleteCategoryByID = async (req: Request, res: Response) => {
    try {
        const id = req.params.categoryId
        if (!id) {
            return res.status(400).json({
                message: "No ID received"
            });
        }

        const convertedId = Number(id)
        const deletedRows = await Category.destroy({
            where: { categoryId: convertedId }
        })
        if (deletedRows === 0) {
            return res.status(404).json({
                message: "Category not found or already deleted"
            });
        }
        res.status(200).json({
            message: `Category ${convertedId} succesfully destroyed`
        })

    } catch (error) {
        res.status(500).json({
            message: "Internal server error, not your fault :D",
            error: error
        })
    }
}

export {
    AllCategories,
    SearchCategoryById,
    CreateCategory,
    UpdateCategory,
    DeleteCategoryByID
};