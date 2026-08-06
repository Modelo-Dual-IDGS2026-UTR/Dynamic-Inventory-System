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


        await Report.create({
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
        const id = req.params.id

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
        
        report.fk_place={
            placeId: report.related_place.placeId,
            placeName:report.related_place.placeName
        }
        
        report.fk_user_responsible={
            userId:report.related_user.userId,
            firstname:report.related_user.firstName,
            userName:report.related_user.lastName
        }

        report.fk_item={
            reportId:report.related_item.itemId,
            reportName:report.related_item.itemName
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

const SearchReports = async (req:Request,res:Response)=>{
    try {
        const body=req.body||{}
        const {reportId,
            reportName,
            reportDescription,
            reportStatus,
            reportPriority,
            dueDate,
            fk_user,
            fk_item,
            fk_place,
            sortBy='reportId',
            order='ASC'
            }=body
        const searchOptions=await FilterOptions({
            reportId,
            reportName,
            reportDescription,
            reportStatus,
            reportPriority,
            dueDate,
            fk_user,
            fk_item,
            fk_place
        })
            const foundReports= await Report.findAll({
                    where:searchOptions,
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
                    ],
                    order:[[sortBy,order.toUpperCase()]]
            })

            const formatedReports=foundReports.map((reportInstance)=>{
                const report=reportInstance.toJSON()
                const formated={
                    ...report,
                    fk_place:report.related_place?
                            {
                                id:report.related_place.placeId,
                                name:report.related_place.placeName
                            }:report.related_place.placeId,
                    fk_user:report.related_user?
                            {
                                id:report.related_user.userId,
                                firstName:report.related_user.firstName,
                                lastName:report.related_user.lastName
                            }:report.related_user.userId,
                    fk_item:report.related_item?
                            {
                                id:report.related_item.itemId,
                                itemName:report.related_item.itemName
                            }:report.related_item.itemId,
                    
                    
                    
                }
                delete formated.related_place
                delete formated.related_user
                delete formated.related_item

                return formated


            })
            return res.status(200).json(formatedReports)
            
        } catch (error) {
            res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error
    })
    }    
}

const SearchReportsCreatedUser = async (req:Request,res:Response)=>{
    try {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        const convertedUserId = Number(userId);

        if (isNaN(convertedUserId) || !Number.isInteger(convertedUserId) || convertedUserId <= 0) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        const body=req.body||{}

        const {
            reportId,
            reportName,
            reportDescription,
            reportStatus,
            reportPriority,
            dueDate,
            fk_item,
            fk_place,
            sortBy='reportId',
            order='ASC'
        }=body

        const searchOptions=await FilterOptions({
            reportId,
            reportName,
            reportDescription,
            reportStatus,
            reportPriority,
            dueDate,
            fk_user: convertedUserId,
            fk_item,
            fk_place
        })
            
        const foundReports= await Report.findAll({
                where:searchOptions,
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
                ],
                order:[[sortBy,order.toUpperCase()]]
        })

        const formatedReports=foundReports.map((reportInstance)=>{
            const report=reportInstance.toJSON()
            const formated={
                ...report,
                fk_place:report.related_place?
                        {
                            id:report.related_place.placeId,
                            name:report.related_place.placeName
                        }:report.related_place.placeId,
                fk_user:report.related_user?
                        {
                            id:report.related_user.userId,
                            firstName:report.related_user.firstName,
                            lastName:report.related_user.lastName
                        }:report.related_user.userId,
                fk_item:report.related_item?
                        {
                            id:report.related_item.itemId,
                            itemName:report.related_item.itemName
                        }:report.related_item.itemId,
                
                
                
            }
            delete formated.related_place
            delete formated.related_user
            delete formated.related_item

            return formated
        })

        
        return res.status(200).json(formatedReports);
    } catch (error) {
        res.status(500).json({
        message:"Internal server error, not your fault :D",
        error:error
    })
}}


function FilterOptions<T extends object=Record<string,unknown>>(
    filter:Record<string,unknown>
):WhereOptions<T>{
    const whereClause:WhereOptions<T>={}

    Object.entries(filter).forEach(([key,value])=>{
        if(value!==undefined&&value!==null&&value!==""){
            (whereClause as Record<string, unknown>)[key] = value;
        }
    })
    return whereClause     
}





export const reportController={
    CreateReport,
    SearchReportById,
    SearchReports,
    SearchReportsCreatedUser
}