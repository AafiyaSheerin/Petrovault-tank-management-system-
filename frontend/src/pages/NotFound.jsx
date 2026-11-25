import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/shared/Logo';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <Logo size={64} />
                </div>

                {/* 404 */}
                <h1 className="text-8xl font-black text-primary mb-2">404</h1>
                <h2 className="text-2xl font-bold text-navy-dark mb-3">Page Not Found</h2>
                <p className="text-gray-500 text-sm mb-8">
                    The page you are looking for does not exist or has been moved.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 border border-gray-200 text-navy-dark font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50 transition"
                    >
                        <ArrowLeft size={16} />
                        Go Back
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-dark transition"
                    >
                        Go to Dashboard
                    </button>
                </div>

                <p className="text-gray-400 text-xs mt-8">PetroVault — Oil Tank Management System</p>
            </div>
        </div>
    );
};

export default NotFound;