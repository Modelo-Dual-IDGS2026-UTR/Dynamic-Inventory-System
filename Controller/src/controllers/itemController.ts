import {Item} from '@dis/model/itemModel.js'
import type { Response,Request } from 'express'
import { where, type WhereOptions } from 'sequelize';


interface OptionsToSearch {
    itemId?: number;
    itemName?: string;
    codeBar?: string;
    fk_user_responsible?: number;

    // 2. Búsqueda de texto libre (para buscar palabras dentro de itemName o itemDescription)
    search?: string; 

    // 3. Paginación
    page?: number;     // Número de página (ej. 1, 2, 3)
    limit?: number;    // Cantidad de registros por página (ej. 10, 20)
    offset?: number;   // Registro desde el cual empezar (alternativa a 'page' para ORMs)

    // 4. Ordenamiento
    sortBy?: 'itemId' | 'itemName' | 'codeBar' | 'fk_user_responsible' | 'createdAt';
    order?: 'ASC' | 'DESC' | 'asc' | 'desc';
}


const CreateItem=async (req:Request,res:Response)=>{
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
        const newItem= await Item.create({
            itemName,
            itemDescription,
            codeBar,
            fk_user_responsible
        })
        const newId=newItem.getDataValue('itemId')

        if(newId>0){
            return res.status(409).json({
                message:"User already exist"
            })
        }

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
            sortBy,
            order}=req.body   
        
        try {
            const foundItems= await Item.findAll({
                where:{
                    itemName,
                    itemDescription,
                    codeBar,
                    fk_user_responsible

                },
                order:[
                    sortBy,
                    order
                ]
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