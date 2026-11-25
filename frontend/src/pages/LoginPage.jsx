import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import Logo from '../components/shared/Logo';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuthContext();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password');
            return;
        }

        setLoading(true);
        try {
            await login(username.trim().toLowerCase(), password.trim());
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / Branding */}
                <div className="flex flex-col items-center mb-8">
                    <Logo size={64} />
                    <h1 className="text-3xl font-bold text-navy-dark mt-3">PetroVault</h1>
                    <p className="text-gray-500 text-sm mt-1">Oil Tank Management System</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-card shadow-card p-8">
                    <h2 className="text-xl font-bold text-navy-dark mb-1">Welcome back</h2>
                    <p className="text-gray-500 text-sm mb-6">Sign in to access your dashboard</p>

                    {error && (
                        <div className="bg-red-50 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                Username
                            </label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-dark"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="flex items-center justify-end mt-1.5">
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-primary font-semibold hover:underline whitespace-nowrap"
                                >
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-400 text-xs mt-6">
                    PetroVault &copy; {new Date().getFullYear()} — Oil Tank Management System
                </p>
            </div>
        </div>
    );
};

export default LoginPage;