import React, { useState, useRef } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react'; 
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, Timer } from 'lucide-react';
import { route } from 'ziggy-js';
import { validateOTP} from '../Validation/CredentialValidation';
import Alert from '../Validation/Alert';

    const VerifyOTP = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    const [formError, setFormError] = useState('');

    const safeRoute = (name: string) => {
        try {
            return route(name);
        } catch (e) {
            return "/"; 
        }
    };

    const handleChange = (element: HTMLInputElement, index: number) => {
        const value = element.value.replace(/\D/g, ''); // only numbers

        if (!value) return;

        const newOtp = [...otp];
        newOtp[index] = value[0]; // only 1 digit
        setOtp(newOtp);

        const fullCode = newOtp.join('');
        setData('code', fullCode);

        if (index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const result = validateOTP(data.code);

        if (!result.isValid) {
            setFormError(result.message);
            return;
        }

        setFormError('');

        router.get(safeRoute('password.reset'), {
            code: data.code,
        }, {
            onError: (errors) => {
                setFormError(errors.code || "Invalid verification code");
            }
        });

        console.log("OTP Verified. Redirecting to Update Password...");
    };

    return (
        <div className="min-h-screen bg-[#F4F1E8] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-poppins">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                .font-poppins { font-family: 'Poppins', sans-serif; }
                .grain { background-image: url("https://www.transparenttextures.com/patterns/stardust.png"); }
            `}} />

            <Head title="Verify Access - PUP SyllabiSys" />

            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.05] grain"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-64 h-64 md:w-96 md:h-96 bg-[#C19A26] blur-[80px] md:blur-[120px] rounded-full opacity-10" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#FFFDF9]/90 backdrop-blur-xl px-5 py-8 sm:px-10 sm:py-12 md:px-12 md:py-14 rounded-4xl shadow-xl w-full max-w-110 border border-[#800000]/10 relative z-10"
            >
                <div className="mb-8 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <ShieldCheck className="text-[#800000]" size={32} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#800000] tracking-tighter mb-3 uppercase">
                        Verify Identity
                    </h2>
                    <p className="text-slate-600 font-medium text-[11px] sm:text-sm leading-relaxed px-2">
                        We sent a 6-digit security code to your faculty email.
                    </p>
                </div>

                <Alert message={formError} />
                <form onSubmit={submit} className="space-y-8">
                    <div className="grid grid-cols-6 gap-2 sm:gap-3 w-full">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                type="text"
                                maxLength={1}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                value={digit}
                                onChange={(e) => handleChange(e.target, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                className="w-full aspect-square text-center text-lg sm:text-xl font-bold bg-white border-b-4 border-transparent focus:border-[#800000] rounded-xl shadow-sm outline-none transition-all text-[#800000] flex items-center justify-center"
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#800000] text-[#F4F1E8] py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_6px_0_#5a0000] active:shadow-none active:translate-y-1 transition-all duration-150 group overflow-hidden relative"
                    >
                        <span className="relative z-10">Verify Code</span>
                        <div className="absolute inset-0 bg-[#C19A26] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                    </button>

                    <div className="text-center space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                            <Timer size={14} /> Resend code in <span className="text-[#800000]">0:59</span>
                        </p>
                        
                        <Link 
                            href={safeRoute('password.request')} 
                            className="inline-flex items-center gap-2 text-[10px] font-bold text-[#800000]/60 hover:text-[#800000] transition-colors uppercase tracking-widest"
                        >
                            <ArrowLeft size={14} /> Use a different email
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default VerifyOTP;