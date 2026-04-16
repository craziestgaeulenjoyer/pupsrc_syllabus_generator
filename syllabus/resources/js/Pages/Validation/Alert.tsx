import { XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertProps {
    message?: string | null;
    type?: 'error' | 'success';
}

export default function Alert({ message, type = 'error' }: AlertProps) {
    const isError = type === 'error';

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 mb-4 rounded-md
                        ${isError 
                            ? "bg-red-100 text-red-700" 
                            : "bg-green-100 text-green-700"
                        }`}
                >
                    <img 
                        src={isError
                            ? "https://img.icons8.com/?size=100&id=fYgQxDaH069W&format=png&color=000000"
                            : "https://img.icons8.com/?size=100&id=AefXIkx4A693&format=png&color=000000"
                        } 
                        alt="status" 
                        className="w-5 h-5" 
                    />
                    <span className="text-xs font-medium">{message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
