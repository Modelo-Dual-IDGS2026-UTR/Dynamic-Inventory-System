import { Routes, Route } from 'react-router-dom';
import AutoLogin from '../features/auth/AutoLogin'; // O el nombre de tu componente de Auth
import SelectArea from '../pages/SelectArea/SelectArea';
import { ProtectedRoute } from './ProtectedRoute';
import ItemTable from '../pages/Inventory/ItemTable';
import  Inventory  from '../pages/Inventory/inventory';
import  MainLayout  from '../components/layout/MainLayout/MainLayout';
import Reports from '../pages/Reports/Reports';
import Requests from '../pages/Requests/Requests';
export const AppRouter = () => {
    return (
        <Routes>
            <Route path="/" element={<AutoLogin />} />
            <Route path="/login" element={<AutoLogin />} />
            <Route element={<ProtectedRoute />}>
                <Route path="/select-area" element={<SelectArea />} />
                <Route path="/Dashboard" element={<MainLayout />}>
                    <Route index element={<Inventory />} />
                    <Route path="reportes" element={<Reports />} />
                    <Route path="solicitudes" element={<Requests />} />
                </Route>
            </Route>
        </Routes>
    );
};

export default AppRouter;