import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AutoLogin from '../features/auth/AutoLogin'; // O el nombre de tu componente de Auth
import SelectArea from '../pages/SelectArea/SelectArea';

export const AppRouter = () => {
    return (
        <BrowserRouter>
            <Route path="/login" element={<AutoLogin />} />
            <Route path="/select-area" element={<SelectArea />} />
        </BrowserRouter>
    );
};