import React from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, GraduationCap } from 'lucide-react';
import { route } from 'ziggy-js';
import { validateForgotPassword } from '../Validation/CredentialValidation';
import Alert from '../Validation/Alert';
import { useState } from 'react';

    const ForgotPassword = () => {
        const { data, setData, post, processing, errors } = useForm({
            email: '',
        });
    const [formError, setFormError] = useState('');

    const safeRoute = (name: string) => {
        try {
            return route(name);
        } catch (e) {
            return "/"; 
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const result = validateForgotPassword(data.email);

        if (!result.isValid) {
            setFormError(result.message);
            return;
        }

        setFormError('');

        post(route('password.email'), {
            onError: (errors) => {
                setFormError(errors.email || "Something went wrong");
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#F4F1E8] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-poppins">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                .font-poppins { font-family: 'Poppins', sans-serif; }
                .grain { background-image: url("https://www.transparenttextures.com/patterns/stardust.png"); }
            `}} />

            <Head title="Forgot Password - PUP SyllabiSys" />

            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.05] grain"></div>
                <div className="absolute top-[-10%] left-[-5%] w-64 h-64 md:w-96 md:h-96 bg-[#800000] blur-[80px] md:blur-[120px] rounded-full opacity-10" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-[#FFFDF9]/90 backdrop-blur-xl px-6 py-8 sm:px-10 sm:py-12 md:px-12 md:py-14 rounded-4xl shadow-[20px_20px_60px_rgba(0,0,0,0.05)] w-full max-w-105 border border-[#800000]/10 relative z-10"
            >
                <div className="mb-8 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <GraduationCap className="text-[#800000]" size={24} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#800000] tracking-tighter mb-3 uppercase">
                        Reset Access
                    </h2>
                    <p className="text-slate-600 font-medium text-xs sm:text-sm leading-relaxed">
                        Enter your faculty email to receive a password reset link.
                    </p>
                </div>
                <Alert message={formError || errors.email || ''} />
                <form onSubmit={submit} noValidate className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[9px] md:text-[10px] font-black text-[#800000]/60 uppercase tracking-widest ml-1">Faculty Email</label>
                        <div className="relative group transition-all duration-300">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#800000] transition-colors">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                className="w-full py-3.5 md:py-4 pl-11 pr-4 bg-white/50 border-b-2 border-transparent focus:border-[#800000] rounded-xl text-xs md:text-sm font-semibold text-slate-700 outline-none transition-all shadow-sm focus:shadow-md"
                                placeholder="name@pup.edu.ph"
                                required
                            />
                        </div>
                        {/*{errors.email && <div className="text-red-500 text-[10px] font-bold ml-1">{errors.email}</div>}*/}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-[#800000] text-[#F4F1E8] py-3.5 md:py-4 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-[0_6px_0_#5a0000] active:shadow-none active:translate-y-1 transition-all duration-150 group overflow-hidden relative"
                    >
                        <span className="relative z-10">{processing ? 'Sending...' : 'Send Reset Link'}</span>
                        <div className="absolute inset-0 bg-[#C19A26] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                    </button>

                    <div className="flex justify-center pt-2">
                        <Link 
                            href={safeRoute('login')} 
                            className="flex items-center gap-2 text-[10px] font-bold text-[#800000]/60 hover:text-[#800000] transition-colors uppercase tracking-widest"
                        >
                            <ArrowLeft size={14} />
                            Back to Login
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;