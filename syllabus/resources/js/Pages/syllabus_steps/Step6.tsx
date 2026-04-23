import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Navbar from '../navbar_layouts/Navbar'; 
import { 
    ChevronLeft, ChevronRight, CheckCircle, FileText, 
    Download, FileJson, ShieldCheck, Info, Check,
    FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Step6 = ({ allSyllabusData }: { allSyllabusData: any }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [exportFormat, setExportFormat] = useState('pdf');
    const [fileName, setFileName] = useState('INTE_30063_Syllabus');
    const [showSuccess, setShowSuccess] = useState(false);
    const [showPreview, setShowPreview] = useState(false); 
    
    const checklistOptions = [
        "Institutional and course headers verified",
        "All learning outcomes properly mapped",
        "Instructional plan covers all 18 weeks",
        "Grading components total to 100%",
        "Signatories and faculty details encoded"
    ];
    const [checkedItems, setCheckedItems] = useState<number[]>([]);

    const progressPercentage = (checkedItems.length / checklistOptions.length) * 100;

    const toggleCheck = (index: number) => {
        if (checkedItems.includes(index)) {
            setCheckedItems(checkedItems.filter(i => i !== index));
        } else {
            setCheckedItems([...checkedItems, index]);
        }
    };

    const handleGenerateSyllabus = async () => {
        if (checkedItems.length < checklistOptions.length) {
            alert("Please verify all items in the checklist before generating.");
            return;
        }

        setIsGenerating(true);
        try {
            const response = await axios.post('/syllabus-generator/generate-pdf', {
                ...allSyllabusData,
                format: exportFormat,
                customName: fileName
            }, {
                responseType: 'blob',
            });

            const extension = exportFormat === 'pdf' ? 'pdf' : 'docx';
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${fileName}.${extension}`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 4000);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-[#800000] selection:text-white">
            <Navbar />
            <Head title="SyllabiSys: Review & Export" />


            <main className="grow pt-20 md:pt-28 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pb-32">
                
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[#800000] font-bold text-[10px] md:text-sm tracking-widest uppercase mb-1">Finalization</span>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 flex flex-wrap items-center gap-2">
                            Step 6 of 6: <span className="text-slate-600 font-bold text-lg sm:text-2xl md:text-3xl"> Review & Export</span>
                        </h1>
                    </div>     
                    <button
                        onClick={() => setShowPreview(true)}
                        className="w-full lg:w-auto bg-[#800000] hover:bg-[#600000] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <FileDown size={18}/> <span className="whitespace-nowrap">View Full Preview</span>
                    </button>    
                </div>
            
                <hr className="border-t-2 border-slate-200 mb-6" />
            
                {/* Instruction */}
                <div className="bg-white border-l-4 border-[#800000] p-4 rounded-r-xl shadow-sm mb-8 flex items-start gap-3">
                    <Info className="text-[#800000] mt-0.5 shrink-0" size={18} />
                    <p className="text-[10px] sm:text-xs md:text-sm text-slate-600 font-medium">
                        <span className="font-bold text-slate-900">Instructions:</span> Perform a final check of your data. Once all items are checked, you can generate your official document.
                    </p>
                </div>

                {/* Progress Stepper */}
                <div className="relative mb-12 mt-4 w-full max-w-3xl mx-auto px-4">
                    <div className="absolute top-1/2 left-0 w-full h-1.5 bg-slate-200 -translate-y-1/2 rounded-full"></div>
                    
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        className="absolute top-1/2 left-0 h-1.5 bg-[#4B6333] -translate-y-1/2 rounded-full z-10"
                    ></motion.div>
                    
                    <div className="relative flex justify-between">
                        {checklistOptions.map((_, index) => {
                            const isCompleted = checkedItems.includes(index);
                            return (
                                <div key={index} className="relative flex flex-col items-center">
                                    <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black z-20 transition-all border-2 sm:border-4
                                        ${isCompleted ? 'bg-[#4B6333] text-white border-white shadow-md' : 'bg-white text-slate-300 border-slate-100'}`}>
                                        {isCompleted ? <Check size={14} strokeWidth={3} /> : index + 1}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                    
                    {/* Left: Final Checklist */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-7 bg-white rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden h-fit"
                    >
                        <div className="bg-[#4B6333] p-5 md:p-6 flex items-center justify-between">
                            <h3 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
                                <ShieldCheck size={20} /> Final Verification
                            </h3>
                            <button 
                                onClick={() => setCheckedItems(checklistOptions.map((_, i) => i))}
                                className="text-[9px] md:text-[10px] bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest transition-colors"
                            >
                                Check All
                            </button>
                        </div>

                        <div className="p-4 md:p-8 space-y-3">
                            {checklistOptions.map((text, i) => (
                                <motion.div 
                                    whileTap={{ scale: 0.98 }}
                                    key={i} 
                                    onClick={() => toggleCheck(i)}
                                    className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all cursor-pointer select-none
                                        ${checkedItems.includes(i) 
                                            ? 'bg-green-50 border-green-200' 
                                            : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}
                                >
                                    <div className={`rounded-full p-1 shrink-0 ${checkedItems.includes(i) ? 'bg-[#4B6333]' : 'bg-white border border-slate-200'}`}>
                                        <CheckCircle 
                                            size={16} 
                                            className={checkedItems.includes(i) ? 'text-white' : 'text-slate-200'} 
                                            fill={checkedItems.includes(i) ? "currentColor" : "none"} 
                                        />
                                    </div>
                                    <span className={`text-xs md:text-sm font-bold leading-tight ${checkedItems.includes(i) ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {text}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right: Export Engine */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-5 flex flex-col gap-6"
                    >
                        <div className="bg-[#800000] rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl shadow-[#800000]/20 relative overflow-hidden group">
                            <FileText className="absolute -right-6 -bottom-6 text-white opacity-10" size={140} />
                            
                            <h3 className="text-white font-black text-lg md:text-xl mb-6 relative z-10">Export Options</h3>
                            
                            <div className="space-y-3 relative z-10">
                                {/* PDF Selection */}
                                <div 
                                    onClick={() => setExportFormat('pdf')}
                                    className={`cursor-pointer p-4 md:p-5 rounded-xl border-2 transition-all flex items-center justify-between
                                    ${exportFormat === 'pdf' ? 'bg-white border-white' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${exportFormat === 'pdf' ? 'bg-red-50 text-[#800000]' : 'bg-white/20 text-white'}`}>
                                            <FileText size={20} />
                                        </div>
                                        <span className={`font-black text-xs md:text-sm uppercase ${exportFormat === 'pdf' ? 'text-[#800000]' : 'text-white'}`}>PDF Document</span>
                                    </div>
                                    {exportFormat === 'pdf' && <CheckCircle size={18} className="text-[#800000]" fill="currentColor" />}
                                </div>

                                {/* DOCX Selection */}
                                <div 
                                    onClick={() => setExportFormat('docx')}
                                    className={`cursor-pointer p-4 md:p-5 rounded-xl border-2 transition-all flex items-center justify-between
                                    ${exportFormat === 'docx' ? 'bg-white border-white' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${exportFormat === 'docx' ? 'bg-blue-50 text-blue-600' : 'bg-white/20 text-white'}`}>
                                            <FileJson size={20} />
                                        </div>
                                        <span className={`font-black text-xs md:text-sm uppercase ${exportFormat === 'docx' ? 'text-blue-600' : 'text-white'}`}>Word (DOCX)</span>
                                    </div>
                                    {exportFormat === 'docx' && <CheckCircle size={18} className="text-blue-600" fill="currentColor" />}
                                </div>

                                {/* Filename Input */}
                                <div className="pt-4 space-y-2">
                                    <label className="text-white/70 font-black text-[9px] md:text-[10px] uppercase tracking-widest ml-1">Syllabus Filename</label>
                                    <input 
                                        type="text" 
                                        value={fileName}
                                        onChange={(e) => setFileName(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-xl p-3 md:p-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all font-bold text-xs md:text-sm"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerateSyllabus}
                                disabled={isGenerating || checkedItems.length < checklistOptions.length}
                                className="w-full mt-6 py-4 md:py-5 bg-white text-[#800000] rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <span className="animate-pulse">Processing...</span>
                                ) : (
                                    <><Download size={18} /> {checkedItems.length < checklistOptions.length ? 'Verify Checklist' : 'Generate'}</>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* STICKY FOOTER */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 sm:p-4 z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto flex justify-center sm:justify-end items-center">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                            href="/syllabus-generator/step-5"
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 text-xs md:text-sm border border-slate-200 transition-all active:scale-95"
                        >
                            <ChevronLeft size={16} /> <span>Back</span>
                        </Link>

                        <button
                            onClick={handleGenerateSyllabus}
                            disabled={checkedItems.length < checklistOptions.length}
                            className="flex-[2] sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-8 py-3 rounded-xl font-bold text-xs md:text-sm shadow-md bg-[#800000] text-white hover:bg-[#600000] transition-all active:scale-95 disabled:opacity-50"
                        >
                            Finish <span className="hidden sm:inline">& Complete</span> <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </footer>

            {/* Success Notification */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-20 right-4 left-4 sm:left-auto sm:right-8 z-[100] bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-2xl border-l-8 border-[#4B6333] flex items-center gap-4 max-w-sm"
                    >
                        <div className="bg-green-100 p-2 md:p-3 rounded-xl shrink-0">
                            <Download className="text-[#4B6333]" size={20} />
                        </div>
                        <div>
                            <h4 className="text-slate-900 font-black text-xs md:text-sm">Download Started</h4>
                            <p className="text-slate-500 text-[10px] md:text-xs font-bold truncate max-w-[200px]">Saved as {fileName}.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Step6;