import React, { useState, useEffect } from 'react';
import { Check, X, CheckCheck } from 'lucide-react';
import { tankApi } from '../../api/tank.api';
import { employeeApi } from '../../api/employee.api';
import { useAlertContext } from '../../context/AlertContext';

const TankAccessManager = ({ employee, onUpdate }) => {
    const { showToast } = useAlertContext();
    const [allTanks, setAllTanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyTankId, setBusyTankId] = useState(null);
    const [grantingAll, setGrantingAll] = useState(false);

    const accessTankIds = new Set((employee.tank_access || []).map(a => a.tank_id));

    useEffect(() => {
        tankApi.getAll()
            .then(res => setAllTanks(res.data.data))
            .catch(() => setAllTanks([]))
            .finally(() => setLoading(false));
    }, []);

    const toggleAccess = async (tankId, hasAccess) => {
        setBusyTankId(tankId);
        try {
            if (hasAccess) {
                await employeeApi.revokeTankAccess(employee.id, tankId);
            } else {
                await employeeApi.grantTankAccess(employee.id, tankId);
            }
            onUpdate?.();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update tank access', 'error');
        } finally {
            setBusyTankId(null);
        }
    };

    const handleGrantAll = async () => {
        setGrantingAll(true);
        try {
            await employeeApi.grantAllTanks(employee.id);
            showToast(`All tanks access granted to ${employee.username}`, 'success');
            onUpdate?.();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to grant all tanks', 'error');
        } finally {
            setGrantingAll(false);
        }
    };

    if (loading) {
        return <p className="text-sm text-gray-400 py-4">Loading tanks...</p>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-navy-dark">Tank Access ({accessTankIds.size} / {allTanks.length})</p>
                <button
                    onClick={handleGrantAll}
                    disabled={grantingAll}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                >
                    <CheckCheck size={14} />
                    {grantingAll ? 'Granting...' : 'Grant All Tanks'}
                </button>
            </div>

            {allTanks.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No tanks available</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allTanks.map((tank) => {
                        const hasAccess = accessTankIds.has(tank.id);
                        const isBusy = busyTankId === tank.id;
                        return (
                            <button
                                key={tank.id}
                                onClick={() => toggleAccess(tank.id, hasAccess)}
                                disabled={isBusy}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition disabled:opacity-50 ${hasAccess
                                        ? 'bg-green-50 border-success/30 text-success'
                                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300'
                                    }`}
                            >
                                <span>{tank.name}</span>
                                {hasAccess ? <Check size={14} /> : <X size={14} />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TankAccessManager;