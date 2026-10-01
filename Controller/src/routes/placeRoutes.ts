import {
    CreatePlace,
    AllPlaces,
    SearchPlacesById,
    EditPlace,
    DeletePlaceByID
} from '../controllers/placeController.js'
import  express  from "express";
export const placeRouter=express.Router();
import { VerifyJWT } from '../middleware/jwtUtils.js';

//Superadmin
placeRouter.post('/new-place', VerifyJWT(1), CreatePlace);

//Basic
placeRouter.get('/read-place/:placeId', VerifyJWT(), SearchPlacesById);

//Basic
placeRouter.get('/all-places', VerifyJWT(), AllPlaces);

//Superadmin
placeRouter.put('/edit-place/:placeId', VerifyJWT(1), EditPlace);

//Superadmin
placeRouter.delete('/delete-place/:placeId', VerifyJWT(1), DeletePlaceByID);

