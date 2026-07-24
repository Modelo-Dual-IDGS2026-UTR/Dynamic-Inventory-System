import { Item } from '@dis/model';
import type { Response,Request } from 'express'
import { createHash } from 'node:crypto';
import { where, type WhereOptions } from 'sequelize';

const CreateItem=async (req:Request,res:Response)=>{
    const {
        itemName,
        itemDescription,
        codeBar,
        fk_user_responsible,
        fk_place}=req.body
    if(!itemDescription||!itemName||!fk_user_responsible||!fk_place){
        return res.status(400).json({
            message:"All parameters must be field please check documentation"
        })
    }
    try {

        const existingWhere: any = {};

        if (codeBar) {
            // Si hay código de barras, esa es la regla principal de duplicado
            existingWhere.codeBar = codeBar;
        } else {
            // Si no hay código de barras, comprobamos si ya existe una coincidencia exacta
            existingWhere.itemName = itemName;
            existingWhere.itemDescription = itemDescription;
            existingWhere.fk_user_responsible = fk_user_responsible;
            existingWhere.codeBar = null;
            existingWhere.fk_place=fk_place;
        }
        const doesItExist=await Item.findOne({where:existingWhere})

        if(doesItExist){
            res.status(409).json({
                message: "User already exist"
            })
        }
        await Item.create({
            itemName,
            itemDescription,
            codeBar,
            fk_user_responsible,
            fk_place
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


const SearchItems=async (req:Request,res:Response)=>{
        const {itemId,
            itemName,
            itemDescription,
            codeBar,
            fk_user_responsible,
            fk_place,
            sortBy='itemId',
            order='ASC'
            }=req.body
        const searchOptions=await FilterOptions({
            itemId,
            itemName,
            itemDescription,
            codeBar,
            fk_user_responsible,
            fk_place
        })
        try {
            const foundItems= await Item.findAll({
                where:searchOptions,
                order:[[sortBy,order.toUpperCase()]]
            })
            return res.status(200).json(foundItems)
            
        } catch (error) {
            res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error
    })
    }    
}


async function FilterOptions(filter:Record<string,any>){
    const whereClause:WhereOptions={}

    Object.entries(filter).forEach(([key,value])=>{
        if(value!==undefined&&value!==null&&value!==""){
            whereClause[key]=value
        }
    })
    return whereClause
     
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

export const itemController={
    CreateItem,
    SearchItemById,
    SearchItems
}