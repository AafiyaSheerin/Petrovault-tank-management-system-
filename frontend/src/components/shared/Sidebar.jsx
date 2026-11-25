import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutGrid,
    Package,
    ArrowLeftRight,
    FileBarChart,
    History,
    Settings,
    Users,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';

const Sidebar = () => {
    const { isAdmin, permissions } = useAuthContext();

    const navItem = (to, icon, label) => (
        <NavLink
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-navy-light hover:text-white'
                }`
            }
        >
            {icon}
            {label}
        </NavLink>
    );

    const canViewReports = isAdmin || permissions?.can_view_reports;

    return (
        <aside className="w-60 bg-navy-dark min-h-screen flex flex-col py-6 px-3 gap-1 sticky top-0">
            <div className="px-4 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Main Menu
                </p>
            </div>

            {navItem('/', <LayoutGrid size={18} />, 'Dashboard')}
            {navItem('/products', <Package size={18} />, 'Products')}
            {(isAdmin || permissions?.can_convert_volume) &&
                navItem('/converter', <ArrowLeftRight size={18} />, 'Volume Converter')
            }

            {canViewReports && navItem('/reports', <FileBarChart size={18} />, 'Reports')}

            {(isAdmin || permissions?.can_view_logs) &&
                navItem('/activity-log', <History size={18} />, 'Activity Log')
            }

            {isAdmin && (
                <>
                    <div className="px-4 mt-6 mb-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Administration
                        </p>
                    </div>
                    {navItem('/employees', <Users size={18} />, 'Employees')}
                    {navItem('/admin', <Settings size={18} />, 'Alert Settings')}
                </>
            )}

            <div className="mt-auto px-4 pt-4">
                <p className="text-[11px] text-gray-500">
                    PetroVault &copy; {new Date().getFullYear()}
                </p>
            </div>
        </aside>
    );
};

export default Sidebar;