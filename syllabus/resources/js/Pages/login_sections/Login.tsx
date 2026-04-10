import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react'; 
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, User, GraduationCap } from 'lucide-react';
import { route } from 'ziggy-js';

const Login: React.FC = () => {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [passwordVisible, setPasswordVisible] = useState(false);

    const safeRoute = (name: string) => {
        try {
            return route(name);
        } catch (e) {
            return "#"; 
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        
        router.get(safeRoute('dashboard'));
        
        console.log("Authorizing Access for:", data.email);
    };

    return (
        <div className="min-h-screen bg-[#F4F1E8] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-poppins">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                .font-poppins { font-family: 'Poppins', sans-serif; }
                .grain { background-image: url("https://www.transparenttextures.com/patterns/stardust.png"); }
                @keyframes slow-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-slow-spin { animation: slow-spin 20s linear infinite; }
            `}} />

            <Head title="Login - PUP SyllabiSys" />

            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.05] grain"></div>
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0], opacity: [0.1, 0.15, 0.1] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] left-[-5%] w-64 h-64 md:w-96 md:h-96 bg-[#800000] blur-[80px] md:blur-[120px] rounded-full" 
                />
                <motion.div 
                    animate={{ y: [0, 50, 0], x: [0, -30, 0], opacity: [0.08, 0.12, 0.08] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-5%] right-[-5%] w-80 h-80 md:w-150 md:h-150 bg-[#C19A26] blur-[100px] md:blur-[130px] rounded-full" 
                />
            </div>

            <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 xl:gap-24 relative z-10">
                
                {/* --- LOGIN CARD --- */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="bg-[#FFFDF9]/90 backdrop-blur-xl px-6 py-8 sm:px-10 sm:py-12 md:px-12 md:py-14 rounded-4xl md:rounded-[2.5rem] shadow-[20px_20px_60px_rgba(0,0,0,0.05)] w-full max-w-[320px] xs:max-w-[360px] sm:max-w-105 md:max-w-115 border border-[#800000]/10"
                >
                    <div className="flex lg:hidden justify-center mb-6">
                        <img src="/images/pup_logo_remove_bg.png" alt="PUP" className="h-16 w-auto opacity-80" />
                    </div>

                    <div className="mb-8 relative text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                            <GraduationCap className="text-[#800000]" size={20} />
                            <span className="text-[9px] md:text-[10px] font-bold text-[#C19A26] uppercase tracking-[0.2em] md:tracking-[0.3em]">Academic Portal</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#800000] tracking-tighter leading-none mb-3">
                            SIGN IN
                        </h2>
                        <div className="h-1 w-12 bg-[#C19A26] rounded-full mb-4 mx-auto lg:ml-0 lg:mr-auto"></div>
                        <p className="text-slate-600 font-medium text-xs sm:text-sm leading-relaxed">
                            Access the Syllabi Management System.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-4 md:space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[9px] md:text-[10px] font-black text-[#800000]/60 uppercase tracking-widest ml-1">Faculty Email</label>
                            <div className="relative group transition-all duration-300">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#800000] transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    className="w-full py-3.5 md:py-4 pl-11 pr-4 bg-white/50 border-b-2 border-transparent focus:border-[#800000] rounded-xl text-xs md:text-sm font-semibold text-slate-700 outline-none transition-all shadow-sm focus:shadow-md"
                                    placeholder="Enter email"
                                />
                            </div>
                            {errors.email && <div className="text-red-500 text-[10px] font-bold ml-1">{errors.email}</div>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] md:text-[10px] font-black text-[#800000]/60 uppercase tracking-widest ml-1">Security Key</label>
                            <div className="relative group transition-all duration-300">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#800000] transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={passwordVisible ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    className="w-full py-3.5 md:py-4 pl-11 pr-11 bg-white/50 border-b-2 border-transparent focus:border-[#800000] rounded-xl text-xs md:text-sm font-semibold text-slate-700 outline-none transition-all shadow-sm focus:shadow-md"
                                    placeholder="Enter password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setPasswordVisible(!passwordVisible)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#800000]"
                                >
                                    {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && <div className="text-red-500 text-[10px] font-bold ml-1">{errors.password}</div>}
                        </div>

                        <div className="flex justify-end">
                            <Link 
                                href={safeRoute('password.request')} 
                                className="text-[10px] font-bold text-[#800000] hover:text-[#C19A26] transition-colors uppercase"
                            >
                                Forgot Access?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full bg-[#800000] text-[#F4F1E8] py-3.5 md:py-4 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-[0_6px_0_#5a0000] active:shadow-none active:translate-y-1 transition-all duration-150 mt-2 group overflow-hidden relative"
                        >
                            <span className="relative z-10">{processing ? 'Verifying...' : 'Authorize Access'}</span>
                            <div className="absolute inset-0 bg-[#C19A26] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                        </button>
                    </form>

                    <div className="mt-8 md:mt-12 text-center border-t border-[#800000]/5 pt-6 md:pt-8">
                        <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                            PUP Santa Rosa Campus <br/>
                            <span className="text-[#C19A26]">Established 2003</span>
                        </p>
                    </div>
                </motion.div>

                {/* --- LOGO SECTION --- */}
                <div className="hidden lg:flex flex-1 justify-center items-center">
                    <div className="relative group">
                        <div className="absolute -inset-10 border-2 border-[#800000]/10 rounded-full animate-slow-spin" style={{ animationDuration: '40s' }}></div>
                        <div className="absolute -inset-5 border border-[#C19A26]/20 rounded-3xl rotate-12 group-hover:rotate-0 transition-all duration-1000"></div>
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1 }}
                            className="relative z-10"
                        >
                            <img 
                                src="/images/pup_logo_remove_bg.png" 
                                alt="PUP Logo" 
                                className="w-full max-w-80 xl:max-w-112.5 grayscale-[0.3] hover:grayscale-0 transition-all duration-700 drop-shadow-[0_35px_35px_rgba(128,0,0,0.15)]"
                            />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;