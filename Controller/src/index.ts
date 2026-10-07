//Native module for http web server
import http from 'node:http';
import express from 'express';
import type { Request, Response } from 'express';
//import {TestConection } from '@dis/db/dbConection.js';
import {User} from '@dis/model'
import { mySequelize } from '@dis/db/dbConection.js';
import {
    userRouter,
    itemRouter,
    reportRouter,
    categoryRouter,
    placeRouter,
    historyRouter,
    notificationRouter
} from './routes/index.js'
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
//Initialize WebSockets configuration
import { initSocketServer } from './services/socketService.js';

const TestSequelize=async ()=>{
try {
    await mySequelize.authenticate();
    console.log("Conexion a DB exitosa\n");
    const usuarios = await User.findAll();
    console.log("consulta exitosa\nDATOS:\n");
    console.log(usuarios);

} catch (error) {
    console.error('Error en la prueba:', error);



}
}

TestSequelize();

const app = express();
// We create the HTTP Express Server Inside
const server = http.createServer(app);

// Initialize Socket.IO 
initSocketServer(server);

const PORT = 3000;

const corsOptions: cors.CorsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
};

// Middleware para entender JSON
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(cors(corsOptions));

app.use('/api/user',userRouter);
app.use('/api/item',itemRouter);
app.use('/api/report', reportRouter);
app.use('/api/category', categoryRouter);
app.use('/api/places', placeRouter);
app.use('/api/history', historyRouter);
app.use('/api/notification', notificationRouter);
// Endpoint GET de prueba
app.get('/', (req: Request, res: Response) => {
    res.json({ mensaje: '¡Hola, chiquillo! Tu API con TS funciona' });
});

app.use(errorHandler);

server.listen(PORT, () => {

});



