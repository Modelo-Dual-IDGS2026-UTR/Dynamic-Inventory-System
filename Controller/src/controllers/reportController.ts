import {Report, User, Item, Place} from '@dis/model';
import type { Response, Request} from 'express';
import {type WhereOptions} from 'sequelize';

const CreateReport = async (req:Request, res:Response) => {
    try {
        const {
            reportName,
            reportDescription,
            reportStatus,
            reportPriority,
            dueDate,
            fk_user,
            fk_item,
            fk_place,
        } = req.body;

        if(!reportName || !reportDescription || !reportStatus || !reportPriority || !dueDate
           || !fk_user || !fk_item || !fk_place
        ){
          return res.status(400).json({
            message: "All parameter must be field, please check documentation"
          })  
        }


        const newReport = await Report.create({
            reportName,
            reportDescription,
            reportStatus,
            reportPriority,
            dueDate,
            fk_user,
            fk_item,
            fk_place
        });
        

        return res.status(200).json({
            message:"item succesfully created"
        })
    } catch (error) {
         return res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error
        })
    }
}

const SearchReportById = (req:Request, res:Response) => {
    try {
        const id = req.params.reportId

        if(!id){
            return res.status(400).json({
                message: "No ID received"
            })
        }

        const convertedId = Number(id)

        if(isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0){
            return res.status(400).json({
                message:"Invalid User ID"
            })  
        }
            
        ShowReport(convertedId,res)
    } catch (error) {
        res.status(500).json({
            message: "Internal server error, not your fault :D",
            error:error
        })
    }
}

async function ShowReport(id:number,res:Response){
    try {
        const foundReport=await Report.findByPk(id,{
            include:[{
                model: Place,
                as: 'related_place',
                attributes:['placeId','placeName']

            },
            {
                model: User,
                as:'related_user',
                attributes:['userId','firstName', 'lastName']
            },
            {
                model: Item,
                as: 'related_item',
                attributes: ['itemId', 'itemName',]
            }
            ]
        })
        if(!foundReport){
            return res.status(404).json({
                message:"Item not foud"
            })
        }
        const report = foundReport.toJSON()
        const fullName=
        report.related_user.firstName+
        report.related_user.lastName
        
        report.fk_place={
            placeId: report.related_place.placeId,
            placeName:report.related_place.placeName
        }
        
        report.fk_user_responsible={
            userId:report.related_user.userId,
            
            userName:fullName
        }

        report.fk_item={
            itemId:report.related_item.itemId,
            itemName:report.related_item.itemName
        }

        delete report.related_place
        delete report.related_user
        delete report.related_item
        res.status(200).json(
            report
        )
    } catch (error){
        res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error
    })
}
}

export const reportController={
    CreateReport,
    SearchReportById
}