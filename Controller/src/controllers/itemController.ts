import {Item} from '@dis/model/itemModel.js'
import type { Response,Request } from 'express'

const CreateItem=(req:Request,res:Response)=>{
    const {
        itemName,
        itemDescription,
        codeBar,
        fk_user_responsible}=req.body
    if(!itemDescription||!itemName||!fk_user_responsible){
        return res.status(400).json({
            message:"All parameters must be field please check documentation"
        })
    }
    try {
        const newItem=Item.create({
            itemName,
            itemDescription,
            codeBar,
            fk_user_responsible
        })
        return res.status(200).json({
            message:"item succesfully created"
        })
    } catch (error) {
        res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error
        })
        
}
}
const SearchItemById=async (req:Request,res:Response)=>{
        const id=req.params.itemId
        if(!id){
            return res.status(400).json({
                message:"No ID recived"
            })
        }
         const convertedId=Number(id)
        if(isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0){
          return res.status(400).json({
            message:"Invalid User ID"
        })  
        }
        try {
            
            ShowItem(convertedId,res)
        } catch (error) {
            res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error
    })
    }    
}


async function ShowItem(id:number,res:Response){
    try {
        const foundItem=await Item.findByPk(id)
        if(!foundItem){
            return res.status(404).json({
                message:"Item not foud"
            })
        }
        res.status(200).json(
            foundItem.toJSON()
        )
    } catch (error){
        res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error
    })
}
}