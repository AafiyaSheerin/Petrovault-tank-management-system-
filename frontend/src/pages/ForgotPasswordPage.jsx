import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/auth.api';
import Logo from '../components/shared/Logo';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();

    // Steps: 'email' → 'otp' → 'success'
    const [step, setStep] = useState('email');

    // Email step
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);

    // OTP + new password step
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);

    // ── Step 1: Request OTP ─────────────────────────────────────────────
    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setEmailError('');

        if (!email.trim()) {
            setEmailError('Please enter your email address');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setEmailError('Please enter a valid email address');
            return;
        }

        setEmailLoading(true);
        try {
            await authApi.forgotPassword(email.trim().toLowerCase());
            // Always advance — backend never reveals if email exists
            setStep('otp');
        } catch (err) {
            setEmailError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
        } finally {
            setEmailLoading(false);
        }
    };

    // ── Step 2: Verify OTP & Reset ──────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setOtpError('');

        if (!otp.trim()) {
            setOtpError('Please enter the OTP from your email');
            return;
        }
        if (otp.trim().length !== 6 || !/^\d+$/.test(otp.trim())) {
            setOtpError('OTP must be a 6-digit number');
            return;
        }
        if (!newPassword) {
            setOtpError('Please enter a new password');
            return;
        }
        if (newPassword.length < 6) {
            setOtpError('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setOtpError('Passwords do not match');
            return;
        }

        setOtpLoading(true);
        try {
            await authApi.resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
            setStep('success');
        } catch (err) {
            setOtpError(err.response?.data?.message || 'Failed to reset password. Please try again.');
        } finally {
            setOtpLoading(false);
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

                <div className="bg-white rounded-card shadow-card p-8">

                    {/* ── Success State ─────────────────────────────── */}
                    {step === 'success' && (
                        <div className="text-center">
                            <div className="flex justify-center mb-4">
                                <CheckCircle2 size={56} className="text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold text-navy-dark mb-2">Password Reset!</h2>
                            <p className="text-gray-500 text-sm mb-6">
                                Your password has been updated successfully. You can now log in with your new password.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition"
                            >
                                Go to Login
                            </button>
                        </div>
                    )}

                    {/* ── Step 1: Email Input ───────────────────────── */}
                    {step === 'email' && (
                        <>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Mail size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-navy-dark leading-tight">Forgot Password?</h2>
                                    <p className="text-gray-400 text-xs">Enter your email to receive an OTP</p>
                                </div>
                            </div>

                            {emailError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                                    {emailError}
                                </div>
                            )}

                            <form onSubmit={handleRequestOTP} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your registered email"
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                                            autoComplete="email"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={emailLoading}
                                    className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {emailLoading ? 'Sending OTP...' : 'Send OTP'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── Step 2: OTP + New Password ────────────────── */}
                    {step === 'otp' && (
                        <>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <KeyRound size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-navy-dark leading-tight">Enter OTP</h2>
                                    <p className="text-gray-400 text-xs">Check your email for the 6-digit code</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
                                <p className="text-blue-700 text-sm">
                                    OTP sent to <strong>{email}</strong>. Valid for 15 minutes.
                                </p>
                            </div>

                            {otpError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                                    {otpError}
                                </div>
                            )}

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                {/* OTP field */}
                                <div>
                                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                        6-Digit OTP
                                    </label>
                                    <div className="relative">
                                        <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="Enter OTP from email"
                                            maxLength={6}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark tracking-[0.25em] font-mono text-lg"
                                            autoFocus
                                            inputMode="numeric"
                                        />
                                    </div>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min. 6 characters"
                                            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-dark"
                                        >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat new password"
                                            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-dark"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={otpLoading}
                                    className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {otpLoading ? 'Resetting...' : 'Reset Password'}
                                </button>

                                {/* Resend OTP */}
                                <p className="text-center text-sm text-gray-400">
                                    Didn't get the code?{' '}
                                    <button
                                        type="button"
                                        onClick={() => setStep('email')}
                                        className="text-primary font-semibold hover:underline"
                                    >
                                        Resend OTP
                                    </button>
                                </p>
                            </form>
                        </>
                    )}

                    {/* Back to login link */}
                    {step !== 'success' && (
                        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-navy-dark transition"
                            >
                                <ArrowLeft size={15} />
                                Back to Login
                            </Link>
                        </div>
                    )}
                </div>

                <p className="text-center text-gray-400 text-xs mt-6">
                    PetroVault &copy; {new Date().getFullYear()} — Oil Tank Management System
                </p>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
