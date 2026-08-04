import {Routes, Route } from 'react-router-dom';
import AutoLogin from '../features/auth/AutoLogin'; // O el nombre de tu componente de Auth
import SelectArea from '../pages/SelectArea/SelectArea';
import  Inventory  from '../pages/Inventory/inventory';
import  MainLayout  from '../components/layout/MainLayout/MainLayout';
export const AppRouter = () => {
    return (
        <Routes>
            <Route path="/" element={<AutoLogin />} />
            <Route path="/login" element={<AutoLogin />} />
            <Route path="/select-area" element={<SelectArea />} />

            {/* Layout Principal con Outlet para páginas dinámicas */}
            <Route path="/dashboard" element={<MainLayout />}>
                <Route index element={<Inventory />} />
                
            </Route>

        </Routes>
    );
};

export default AppRouter;