import {Routes, Route, Navigate } from 'react-router-dom';
import AutoLogin from '../features/auth/AutoLogin'; // O el nombre de tu componente de Auth
import SelectArea from '../pages/SelectArea/SelectArea';
import { ProtectedRoute } from './ProtectedRoute';
import Table from '../pages/Inventory/testTable';
export const AppRouter = () => {
    return (
        <Routes>
            <Route path="/" element={<AutoLogin />} />
            <Route path="/login" element={<AutoLogin />} />
            <Route path='/tabla' element={Table}/>
            <Route element={<ProtectedRoute />}>
                <Route path="/select-area" element={<SelectArea />} />
            </Route>
            
        </Routes>
    );
};