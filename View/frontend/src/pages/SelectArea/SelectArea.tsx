import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import utrPNG from '../../assets/images/utr_png.png';
import './SelectArea.css';


export default function SelectArea() {
    const [area, setArea] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [isStudent, setIsStudent] = useState<boolean | null>(null);
    const [nombre, setNombre] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    
    useEffect(() => {
        const checkUserType = async () => {
            setLoading(true);
            const studentStatus = await itIsStudent();
            setIsStudent(studentStatus ?? false);
            setLoading(false);
        };

        checkUserType();
    }, []);

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();

        if (!area) {
            setError('Por favor, selecciona un área')
            return;
        }

        setLoading(true);
        setError(null);

        const appToken = localStorage.getItem('appToken');

        try {
            const response = await fetch('http://localhost:3000/api/user/area', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${appToken}`
                },
                body: JSON.stringify({ area }),
            });

            if (response.ok) {
                navigate('/dashboard')
            } else {
                const data = await response.json();
                setError(data.message || 'Error al guardar el área');
            }
        } catch (err) {
            console.error(err);
            setError('Error de conexión con el servidor')
        } finally {
            setLoading(false);
        }      
    };

    const itIsStudent = async (): Promise<boolean> => {
        const appToken = localStorage.getItem('appToken');

        try {
            const response = await fetch('http://localhost:3000/api/user/area', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${appToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.email && data.email.toLowerCase().startsWith('st')) {
                    return true;
                } 
                return false;
            } 
            
            return false;    
        } catch (err) {
            console.error(err);
            setError('Error de conexión con el servidor');
            //Cambiar esto de false a true para ver que onda
            return false;
        }
    }

    return (
        <div className='select-area-container'>
            <img src={utrPNG} alt="UTR Logo" className='utr-logo' />

            <h2>¡Casi listo!</h2>
            <p>
                {isStudent
                    ? 'Selecciona tu carrera para personalizar tu experiencia.'
                    : 'Selecciona tu departamento o área administrativa.'}
            </p>

            {error && <p className='error-message'>{error}</p>}

            <form onSubmit={handleSubmit} className='area-form'>
                <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    disabled={loading}
                    className='area-select'
                >
                    <option value="">
                        {isStudent === null ? 'Cargando opciones...' : '-- Selecciona una opción --'}
                    </option>

                    {isStudent && (
                        <>
                            <option value="TICS">TICS</option>
                            <option value="Mecatrónica">Mecatrónica</option>
                            <option value="Mercadotecnia">Mercadotecnia</option>
                            <option value="Lengua Inglesa">Lengua Inglesa</option>
                        </>
                    )}

                    {isStudent === false && (
                        <>
                            <option value="Jurídico">Jurídico</option>
                            <option value="Recursos Humanos">Recursos Humanos</option>
                            <option value="Finanzas">Finanzas</option>
                            <option value="Servicios Escolares">Servicios Escolares</option>
                            <option value="Sistemas">Sistemas / TI</option>
                        </>
                    )}
                </select>

                {isStudent === false && (
                        <div className='workid-container'>
                            <label htmlFor="input-nombre">Tu Nombre:</label>

                            <input
                            type="text"
                            id="input-nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Escribe algo..."
                            className="submit-input"
                            />

                            <p>{nombre}</p>
                        </div>
                    )}
                    
                <button
                    type="submit"
                    disabled={loading || !area}
                    className='submit-btn'
                > 
                    {loading ? 'Guardando...': 'Completar Registro'}
                </button>
            </form>
        </div>   
    )
}