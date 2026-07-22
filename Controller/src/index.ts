import express from 'express';
import type { Request, Response } from 'express';
import {TestConection } from '@dis/db/dbConection.js';
import {User,UserRole} from '@dis/model'
import { mySequelize } from '@dis/db/dbConection.js';
import {routes} from './routes/index.js'
const TestSequelize=async ()=>{
try {
    await mySequelize.authenticate();
    console.log("Conexion a DB exitosa\n");
    const usuarios = await User.findAll();
    console.log("consulta exitosa\nDATOS:\n");
    console.log(usuarios);

} catch (error) {
    console.error('❌ Error en la prueba:', error);



}
}

TestSequelize();



const app = express();
const PORT = 3000;

// Middleware para entender JSON
app.use(express.json());

app.use('/api/user',routes.userRouter)


// Endpoint GET de prueba
app.get('/', (req: Request, res: Response) => {
    res.json({ mensaje: '¡Hola, chiquillo! Tu API con TS funciona 🚀' });
});

// Endpoint POST recibiendo datos
app.post('/usuarios', (req: Request, res: Response) => {
    const { nombre, edad } = req.body;
    
    // Aquí puedes meterle lógica tipada
    res.status(201).json({
        id: 1,
        nombre,
        edad
    });
});

app.listen(PORT, () => {
    //This line down here, acts as a silencer for eslint, to ignore console lines warnings
    // eslint-disable-next-line no-console
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});



//----------------------NOT PRODUCTION CODE------------------------------------------
        /*
        import { GenerateJWT , VerifyJWT} from './middleware/jwtUtils.js'; 
        import type { jwtPayloadContent } from './middleware/jwtUtils.js';
        */
        
        /*
        const TestJWT=()=>{
            const userPayload:jwtPayloadContent = {
                userId:"6969",
                role: 1,
                career_area:"TICS",
                fullName:"Osmar Macias Curiel"
            }
        
            let jwt:string =GenerateJWT(userPayload,"2m");
        
            try{
                VerifyJWT(jwt);
                console.log(jwt + "\nToken Validaded")
            }catch{
                console.log("DUUUUUUDE YOU FUCKED UP")
            }
            
        }
        */