import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SelectArea.css';


export default function SelectArea() {
    const [area, setArea] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    
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
                    'Authorization': 'Bearer {appToken}'
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

    return (
        <div className='select-area-container'>
            <h2>¡Casi listo!</h2>
            <p>Selecciona tu área o departamento para personalizar tu experiencia.</p>

            {error && <p className='error-message'>{error}</p>}

            <form onSubmit={handleSubmit} className='area-form'>
                <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    disabled={loading}
                    className='area-select'
                >
                    <option value="">-- Selecciona un Área --</option>
                    <option value="Sistemas">TICS</option>
                    <option value="Recursos Humanos">Recursos Humanos</option>
                    <option value="Ventas">Mercadotecnia</option>
                    <option value="Finanzas">Mecatronica</option>
                    <option value="Operaciones">Lengua Inglesa</option>
                </select>

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