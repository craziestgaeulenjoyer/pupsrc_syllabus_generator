import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { LockKeyhole, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { route } from 'ziggy-js';
import { validateResetPassword } from '../Validation/CredentialValidation';
import Alert from '../Validation/Alert';

    const UpdatePassword = ({ email }: { email: string }) => {
        const [showPassword, setShowPassword] = useState(false);

    const [formError, setFormError] = useState('');
    
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        if (email) {
            setData('email', email);
        }
    }, [email]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const result = validateResetPassword(
            data.password,
            data.password_confirmation
        );

        if (!result.isValid || data.password.length < 6) {
            setFormError(result.message);
            return;
        }

        setFormError('');

        post(route('password.update'), {
            onError: (errors) => {
                setFormError(errors.password || "Failed to update password");
            },
            onFinish: () => {
                reset('password', 'password_confirmation');
            },
        });

        console.log("Updating password...");
    };

    const getPasswordStrength = (password: string) => {
        if (!password) return { label: '', color: '', width: '0%' };

        let score = 0;

        if (password.length >= 6) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        if (password.length > 8) score++;

        if (password.length < 6) {
            return { label: 'Too Short', color: 'bg-red-500', width: '20%' };
        }

        if (score <= 3) {
            return { label: 'Weak', color: 'bg-yellow-500', width: '40%' };
        }

        if (score <= 5) {
            return { label: 'Normal', color: 'bg-blue-500', width: '70%' };
        }

        return { label: 'Strong', color: 'bg-green-600', width: '100%' };
    };

    const alertMessage = formError || errors.password || errors.password_confirmation || null;

    const strength = getPasswordStrength(data.password);

    return (
        <div className="min-h-screen bg-[#F4F1E8] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-poppins">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                .font-poppins { font-family: 'Poppins', sans-serif; }
                .grain { background-image: url("https://www.transparenttextures.com/patterns/stardust.png"); }
            `}} />

            <Head title="Update Password - PUP SyllabiSys" />

            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.05] grain"></div>
                <div className="absolute top-[-10%] right-[-5%] w-64 h-64 md:w-96 md:h-96 bg-[#800000] blur-[80px] md:blur-[120px] rounded-full opacity-10" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FFFDF9]/90 backdrop-blur-xl px-6 py-8 sm:px-10 sm:py-12 md:px-12 md:py-14 rounded-4xl shadow-xl w-full max-w-110 border border-[#800000]/10 relative z-10"
            >
                <div className="mb-8 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <LockKeyhole className="text-[#800000]" size={32} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#800000] tracking-tighter mb-2 uppercase">
                        New Password
                    </h2>
                    <p className="text-slate-600 font-medium text-xs sm:text-sm leading-relaxed px-4">
                        Create a strong password to secure your faculty account.
                    </p>
                </div>

               {alertMessage && <Alert message={alertMessage} />}
                <form onSubmit={submit} className="space-y-6" noValidate>
                    {/* New Password */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] md:text-[10px] font-black text-[#800000]/60 uppercase tracking-widest ml-1">New Password</label>
                        <div className="relative group transition-all duration-300">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                className="w-full py-3.5 md:py-4 px-5 bg-white/50 border-b-2 border-transparent focus:border-[#800000] rounded-xl text-xs md:text-sm font-semibold text-slate-700 outline-none transition-all shadow-sm focus:shadow-md"
                                placeholder="••••••••"
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#800000] transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {/*{errors.password && <div className="text-red-500 text-[10px] font-bold ml-1">{errors.password}</div>}*/}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] md:text-[10px] font-black text-[#800000]/60 uppercase tracking-widest ml-1">Confirm Password</label>
                        <div className="relative group transition-all duration-300">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={data.password_confirmation}
                                onChange={e => setData('password_confirmation', e.target.value)}
                                className="w-full py-3.5 md:py-4 px-5 bg-white/50 border-b-2 border-transparent focus:border-[#800000] rounded-xl text-xs md:text-sm font-semibold text-slate-700 outline-none transition-all shadow-sm focus:shadow-md"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {/* Password Strength Bar */}
                        <div className="mt-2">
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${strength.color}`}
                                    style={{ width: strength.width }}
                                />
                            </div>
                            {data.password && (
                                <p className="text-[10px] mt-1 font-bold text-slate-500">
                                    Strength: <span className="text-[#800000]">{strength.label}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={processing || strength.label === 'Weak' || strength.label === 'Too Short'}
                        className="w-full bg-[#800000] text-[#F4F1E8] py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_6px_0_#5a0000] active:shadow-none active:translate-y-1 transition-all duration-150 group overflow-hidden relative"
                    >
                        <span className="relative z-10">{processing ? 'Updating...' : 'Update Password'}</span>
                        <div className="absolute inset-0 bg-[#C19A26] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                    </button>

                    <div className="text-center pt-2">
                        <Link 
                            href={route('login')} 
                            className="inline-flex items-center gap-2 text-[10px] font-bold text-[#800000]/60 hover:text-[#800000] transition-colors uppercase tracking-widest"
                        >
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default UpdatePassword;