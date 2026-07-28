import { Item,Place, User} from '@dis/model';
import type { Response,Request } from 'express'
import { createHash } from 'node:crypto';
import { where, type WhereOptions } from 'sequelize';

const CreateItem=async (req:Request,res:Response)=>{
    try {
    const {
        itemName,
        itemDescription,
        codeBar,
        category,
        fk_user_responsible,
        fk_place}=req.body
    if(!itemDescription||!itemName||!fk_user_responsible||!category||!fk_place){
        return res.status(400).json({
            message:"All parameters must be field please check documentation"
        })
    }

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
            existingWhere.category=category;
            
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
            category,
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
    try {
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
            
            ShowItem(convertedId,res)
        } catch (error) {
            res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error
    })
    }    
}


const SearchItems=async (req:Request,res:Response)=>{
    try {
        const body=req.body||{}
        const {itemId,
            itemName,
            itemDescription,
            codeBar,
            fk_user_responsible,
            fk_place,
            sortBy='itemId',
            order='ASC'
            }=body
        const searchOptions=await FilterOptions({
            itemId,
            itemName,
            itemDescription,
            codeBar,
            fk_user_responsible,
            fk_place
        })
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

const UpdateItem=async (req:Request,res:Response)=>{
    try {
       
       const id=req.params.itemId
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
       const doesItExist=await Item.findOne({where:{itemId:convertedId}})
       if(!doesItExist){
           res.status(404).json({
           message:`item  do not exist`
       })    
       }
       const body=req.body||{}
       const {
        itemName,
        itemDescription,
        codeBar,
        fk_responsible_user,
        fk_place
       }=body
       const [modifiedRows]=await Item.update({
        itemName,
        itemDescription,
        codeBar,
        fk_responsible_user,
        fk_place},
        {where:{itemId:convertedId}}
       )
       if(modifiedRows==0){
        res.status(404).json({
            message:"Item not found or not changes where made"
        })
       }else{
        res.status(200).json({
            message:"item succesfully updated"
        })
       }

    } catch (error) {
         res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error})
    }
}





const DeleteItemByID=async (req:Request,res:Response)=>{
   try {
       const id=req.params.itemId
       if (!id) {
           return res.status(400).json({
               message: "No ID received"
           });
       }

       const convertedId = Number(id)
       const deletedRows=await Item.destroy({
           where:{itemId:convertedId}
       })
       if (deletedRows === 0) {
           return res.status(404).json({
               message: "Item not found or already deleted"
           });
       }
       res.status(200).json({
           message:`item ${convertedId} succesfully destroyed`
       })
       
   } catch (error) {
        res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error})
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
        const foundItem=await Item.findByPk(id,{
            include:[{
                model: Place,
                as: 'related_place',
                attributes:['placeId','placeName']

            },
        {
            model: User,
            as:'responsible_user',
            attributes:['userId','firstName', 'lastName']
        }]
        })
        if(!foundItem){
            return res.status(404).json({
                message:"Item not foud"
            })
        }
        const item = foundItem.toJSON()
        const fullName=
        item.responsible_user.firstName+
        item.responsible_user.lastName
        
        item.fk_place={
            placeId: item.related_place.placeId,
            placeName:item.related_place.placeName
        }
        
        item.fk_user_responsible={
            userId:item.responsible_user.userId,
            
            userName:fullName
        }

        delete item.related_place
        delete item.responsible_user
        res.status(200).json(
            item
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
    SearchItems,
    UpdateItem,
    DeleteItemByID
}