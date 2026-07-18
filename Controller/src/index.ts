import express from 'express';
import type { Request, Response } from 'express';
import {TestConection, mySequelize } from '@dis/db/dbConection.js';

TestConection();


const app = express();
const PORT = 3000;

// Middleware para entender JSON
app.use(express.json());

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