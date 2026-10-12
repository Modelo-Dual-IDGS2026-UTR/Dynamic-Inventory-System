import { Place} from '@dis/model'
import { FilterOptions } from "../helpers/filterOptions.js";
import type { Response, Request } from 'express';
import { UniqueConstraintError } from 'sequelize';
import { createHistoryLog } from '../helpers/historyHelper.js';

const CreatePlace = async (req: Request, res: Response) => {
    try {
        const {
            placeName,
            placeDescription,
            placeClass,
            placeLocation
        } = req.body;

        if (
            !placeName ||
            !placeDescription ||
            !placeClass ||
            !placeLocation
        ) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const normalizedName = String(placeName).trim();

        const existingPlace = await Place.findOne({
            where: { placeName: normalizedName }
        });

        if (existingPlace) {
            return res.status(409).json({
                message: 'A place with this name already exists'
            });
}
    const newPlace = await Place.create({
        placeName,
        placeDescription,
        placeClass,
        placeLocation
});

const userId = res.locals.jwtPayloadContent?.userId;
if (userId) {
    await createHistoryLog({
        historyDescription: `Se creó el lugar ${placeName}.`,
        actionType: 'CREATE',
        userId,
        placeId: (newPlace as any).placeId,
    });
}

return res.status(200).json({ message: 'Place successfully created' });
    } catch (error: unknown) {
        if (error instanceof UniqueConstraintError) {
        return res.status(409).json({
            message: 'A place with this name already exists'
        });
        }

        throw error;
}
};

const SearchPlacesById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.placeId);
        if (!id || isNaN(id) || !Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'Invalid Place ID' });
        }

        const foundCategory = await Place.findByPk(id);
        if (!foundCategory) {
            return res.status(404).json({ message: 'Place not found' });
        }

        return res.status(200).json(foundCategory);
    } catch (error) {
        throw error;
    }
};


const AllPlaces = async (req: Request, res: Response) => {
    try {
        const {
            placeName,
            placeDescription,
            placeClass,
            placeLocation,
            sortBy = 'placeId',
            order = 'ASC'
        } = req.body || {};

        const searchOptions = FilterOptions({
            placeName,
            placeDescription,
            placeClass,
            placeLocation,
        });

        const foundCategories = await Place.findAll({
            where: searchOptions,
            order: [[sortBy, String(order).toUpperCase()]]
        });

        return res.status(200).json(foundCategories);
    } catch (error) {
        throw error;
    }
};

const EditPlace = async (req: Request, res: Response) => {
    try {

        const id = req.params.placeId
        if (!id) {
            return res.status(400).json({
                message: "No ID received"
            });
        }

        const convertedId = Number(id);
        if (isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0) {
            return res.status(400).json({
                message: "Invalid Place ID"
            });
        }
        const doesItExist = await Place.findOne({ where: { placeId: convertedId } })
        if (!doesItExist) {
            return res.status(404).json({
                message: `Place does not exist`
            })
        }
        const body = req.body || {}
        const {
            placeName,
            placeDescription,
            placeClass,
            placeLocation,
        } = body

        if (
            !placeName ||
            !placeDescription ||
            !placeClass ||
            !placeLocation
        ) {
            return res.status(400).json({ message: 'All parameters must be filled in,'
                + ' please check documentation' });
        }
        
        const normalizedName = String(placeName).trim();

        const existingPlace = await Place.findOne({
            where: { placeName: normalizedName }
        });

        if (existingPlace && existingPlace.getDataValue('placeId') !== convertedId) {
            return res.status(409).json({
                message: 'A place with this name already exists'
            });
        }

        const [modifiedRows] = await Place.update({
            placeName,
            placeDescription,
            placeClass,
            placeLocation,
        },
            { where: { placeId: convertedId } }
        )
        if (modifiedRows == 0) {
            return res.status(404).json({
                message: "Place not found or not changes where made"
            })
        } else {
            const userId = res.locals.jwtPayloadContent?.userId;
            if (userId) {
                await createHistoryLog({
                    historyDescription: `Se actualizó el lugar ${placeName}.`,
                    actionType: 'UPDATE',
                    userId,
                    placeId: convertedId,
                });
            }
            return res.status(200).json({
                message: "Place succesfully updated"
            })
        }

    } catch (error: unknown) {
        if (error instanceof UniqueConstraintError) {
            return res.status(409).json({
                message: 'A place with this name already exists'
            });
        }

        throw error;
    }
}

const DeletePlaceByID = async (req: Request, res: Response) => {
    try {
        const id = req.params.placeId
        if (!id) {
            return res.status(400).json({
                message: "No ID received"
            });
        }

        const convertedId = Number(id)
        const deletedRows = await Place.destroy({
            where: { placeId: convertedId }
        })
        if (deletedRows === 0) {
            return res.status(404).json({
                message: "Place not found or already deleted"
            });
        }
        const userId = res.locals.jwtPayloadContent?.userId;
        if (userId) {
            await createHistoryLog({
                historyDescription: `Se eliminó el lugar ${convertedId}.`,
                actionType: 'DELETE',
                userId,
                placeId: convertedId,
            });
        }
        return res.status(200).json({
            message: `Place ${convertedId} succesfully destroyed`
        })

    } catch (error) {
        throw error;
    }
}


export {
    CreatePlace,
    AllPlaces,
    SearchPlacesById,
    EditPlace,
    DeletePlaceByID
}