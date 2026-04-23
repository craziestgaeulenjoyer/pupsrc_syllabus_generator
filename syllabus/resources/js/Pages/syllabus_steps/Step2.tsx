import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Navbar from '../navbar_layouts/Navbar';
import { 
    ChevronLeft, ChevronRight, X, FileText, 
    Info, AlertTriangle, CheckCircle2, FileDown, Plus, Trash2, Check,
    BookOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateStep2 } from '../Validation/SyllabusValidation';
import Alert from '../Validation/Alert';
import DeleteModal from '../modals_section/DeleteConfirmation';

const Step2 = () => {
    const [showPreview, setShowPreview] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [iloMapping, setIloMapping] = useState<Record<string, boolean>>({});
    const [ploMapping, setPloMapping] = useState<Record<string, string | null>>({});
    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
    const [showErrors, setShowErrors] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedDelete, setSelectedDelete] = useState<{ type: "plo" | "clo"; id: number | null; } | null>(null);
    

    // Dynamic columns count
    const iloCount = 9;

    const [plos, setPlos] = useState([
        { id: 1, label: 'Apply knowledge of computing, science, and mathematics' },
        { id: 2, label: 'Analyze problems and identify computing requirements' },
        { id: 3, label: 'Design, implement, and evaluate IT-based solutions' },
        { id: 4, label: 'Use modern computing tools and techniques' },
        { id: 5, label: 'Function effectively in teams' },
        { id: 6, label: 'Understand professional, ethical, and social responsibilities' },
        { id: 7, label: 'Communicate effectively' },
        { id: 8, label: 'Engage in lifelong learning' },
        { id: 9, label: 'Understand the impact of IT on society' },
        { id: 10, label: 'Manage IT projects' },
        { id: 11, label: 'Apply IT to societal issues' },
    ]);

    const [clos, setClos] = useState([
        { id: 1, text: 'Apply fundamental concepts of computing, science, and mathematics' },
        { id: 2, text: 'Analyze simple to complex computing problems' },
        { id: 3, text: 'Demonstrate proficiency in using modern computing tools' },
        { id: 4, text: 'Understand the professional, ethical, and societal impacts' },
        { id: 5, text: 'Communicate technical information effectively' },
    ]);

    const isMapped = Object.values(iloMapping).some(val => val === true) && 
                     Object.values(ploMapping).some(val => val !== null && val !== '');

    const validateData = () => {
        const errors = validateStep2(plos, clos, iloMapping, ploMapping);

        setLocalErrors(errors);
        setShowErrors(true);

        const isValid = Object.keys(errors).length === 0;

        if (!isValid) {
            setValidationError("Please complete all required fields and mappings.");
            setSuccessMessage(null);

            // ✅ AUTO HIDE ERROR AFTER 3 SECONDS
            setTimeout(() => {
                setValidationError(null);
                setShowErrors(false);
            }, 3000);
        }

        return isValid;
    };

    const handlePreviewOpen = () => {
        if (validateData()) setShowPreview(true);
    };

    const validateAndNext = () => {
        const isValid = validateData();

        if (isValid) {
            setSuccessMessage("All fields completed successfully!");
            setValidationError(null);

            setTimeout(() => {
                window.location.href = "/syllabus-generator/step-3";
            }, 1000);
        }
    };
    const addPloRow = () => {
        const newId = plos.length > 0 ? Math.max(...plos.map(p => p.id)) + 1 : 1;
        setPlos([...plos, { id: newId, label: '' }]);
    };

    const removePloRow = (id: number) => {
        setPlos(plos.filter(p => p.id !== id));
    };

    const addCloRow = () => {
        const newId = clos.length > 0 ? Math.max(...clos.map(c => c.id)) + 1 : 1;
        setClos([...clos, { id: newId, text: '' }]);
    };

    const removeCloRow = (id: number) => {
        setClos(clos.filter(c => c.id !== id));
    };

    const toggleIloMapping = (ploId: number, iloNum: number) => {
        const key = `${ploId}-${iloNum}`;
        setIloMapping(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handlePloMapping = (cloId: number, ploId: number, val: string) => {
        const key = `${cloId}-${ploId}`;
        setPloMapping(prev => ({ ...prev, [key]: prev[key] === val ? null : val }));
    };

    useEffect(() => {
        const errors = validateStep2(plos, clos, iloMapping, ploMapping);

        const isValid = Object.keys(errors).length === 0;

        if (isValid) {
            setSuccessMessage("All fields completed successfully!");
            setValidationError(null);
        } else {
            setSuccessMessage(null);
        }

    }, [plos, clos, iloMapping, ploMapping]);

    return (
        <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans pb-40">
            <Navbar />
            <Head title="Step 2: Map Learning Outcomes" />

            <main className="grow pt-24 sm:pt-28 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-4">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-[10px] sm:text-xs font-bold text-[#800000] uppercase tracking-widest mb-1">Mapping Matrix</h2>
                        <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                            Step 2 of 6: <span className="text-slate-600 font-bold">Map Learning Outcomes</span>
                        </h1>
                    </motion.div>
                    
                    <button 
                        onClick={handlePreviewOpen}
                        className="flex items-center justify-center gap-2 bg-[#800000] text-white px-4 py-2.5 rounded-lg font-bold shadow-lg hover:bg-[#600000] transition-all text-xs sm:text-sm active:scale-95 w-full sm:w-auto"
                    >
                        <FileDown size={18} /> View Live PDF Preview
                    </button>
                </div>

                <hr className="border-t-2 border-slate-200 mb-6" />

                <div className="bg-white border-l-4 border-[#800000] p-4 rounded-r-xl shadow-sm mb-8 flex items-start gap-3">
                    <Info className="text-[#800000] mt-0.5 shrink-0" size={20} />
                    <p className="text-[11px] md:text-sm text-slate-600 font-medium">
                        <span className="font-bold text-slate-900">Instructions:</span> Map the outcomes below by clicking the icons or selecting the achievement level. All fields are required to continue.
                    </p>
                </div>

                <AnimatePresence>
                    {validationError && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 flex items-center gap-3 text-red-700 text-[11px] sm:text-sm font-bold"
                        >
                            <AlertTriangle size={18} className="shrink-0" /> {validationError}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-8">
                    {/* PLO Editor */}
                    <motion.div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8">
                        <div className="bg-slate-50/50 p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#800000] p-2 rounded-lg text-white shadow-sm shrink-0">
                                    <CheckCircle2 size={18}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-[11px] sm:text-sm uppercase tracking-widest">Program Learning Outcomes</h3>
                                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium uppercase">Mapping PLOs to ILOs</p>
                                </div>
                            </div>
                            <button 
                                onClick={addPloRow} 
                                className="flex items-center justify-center gap-2 bg-[#800000] text-white px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-[#600000] transition-all w-full sm:w-auto active:scale-95"
                            >
                                <Plus size={14}/> ADD NEW PLO
                            </button>
                        </div>

                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                            <table className="w-full min-w-200 border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80">
                                        <th className="p-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Outcome Description</th>
                                        {Array.from({ length: iloCount }, (_, i) => i + 1).map(n => (
                                            <th key={n} className="p-4 text-center text-[11px] font-bold text-[#800000] uppercase border-b border-slate-200 w-16">ILO {n}</th>
                                        ))}
                                        <th className="p-4 border-b border-slate-200 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {plos.map((plo, idx) => (
                                        <tr key={plo.id} className="hover:bg-slate-50/40 transition-colors group">
                                            <td className="p-4 min-w-75">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex gap-3">
                                                        <span className="text-[#800000] font-bold text-[10px] mt-2 bg-red-50 w-6 h-6 flex items-center justify-center rounded-full shrink-0">
                                                            {idx + 1}
                                                        </span>

                                                        <textarea
                                                            rows={2}
                                                            placeholder="Enter program outcome description..."
                                                            className={`w-full text-sm p-3 bg-white border rounded-lg transition-all resize-none shadow-sm min-h-15 focus:ring-2 focus:ring-red-100 focus:border-[#800000]
                                                                ${showErrors && localErrors[`plo_${idx}`] ? 'border-red-500' : 'border-slate-200'}
                                                            `}
                                                            value={plo.label}
                                                            onChange={(e) => {
                                                                const newPlos = [...plos];
                                                                newPlos[idx].label = e.target.value;
                                                                setPlos(newPlos);
                                                            }}
                                                        />
                                                    </div>

                                                        {showErrors && localErrors[`plo_${idx}`] && (
                                                            <p className="text-red-500 text-[10px] ml-9 mt-1">
                                                                {localErrors[`plo_${idx}`]}
                                                            </p>
                                                        )}
                                                </div>
                                            </td>
                                            {Array.from({ length: iloCount }, (_, i) => i + 1).map(num => {
                                                const isSelected = iloMapping[`${plo.id}-${num}`];
                                                // Check if this specific PLO row has any selections at all
                                                const rowHasNoSelection = !Object.keys(iloMapping).some(key => key.startsWith(`${plo.id}-`) && iloMapping[key]);
                                                const showErrorState = showErrors && rowHasNoSelection;

                                                return (
                                                    <td key={num} className="p-2 text-center">
                                                        <button 
                                                            onClick={() => toggleIloMapping(plo.id, num)}
                                                            className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center transition-all border-2 ${
                                                                isSelected 
                                                                    ? 'bg-[#800000] text-white border-[#800000] shadow-sm' 
                                                                    : showErrorState
                                                                        ? 'border-red-500 bg-red-50 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                                                                        : 'bg-white text-slate-200 border-slate-100 hover:border-red-200'
                                                            }`}
                                                        >
                                                            <Check size={18} strokeWidth={3} />
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                            <td className="p-2 text-center">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedDelete({ type: "plo", id: plo.id });
                                                        setDeleteModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full md:opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    {/* CLO Editor */}
                    <motion.div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50/50 p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#800000] p-2 rounded-lg text-white shadow-sm shrink-0">
                                    <BookOpen size={18}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-[11px] sm:text-sm uppercase tracking-widest">Course Learning Outcomes</h3>
                                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium">L (Learned), P (Practiced), O (Opportunity)</p>
                                </div>
                            </div>
                            <button 
                                onClick={addCloRow} 
                                className="flex items-center justify-center gap-2 bg-[#800000] text-white px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-[#600000] transition-all w-full sm:w-auto shadow-sm active:scale-95"
                            >
                                <Plus size={14}/> ADD NEW CLO
                            </button>
                        </div>

                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                            <table className="w-full min-w-200 border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80">
                                        <th className="p-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Course Outcome Description</th>
                                        {plos.map((plo, i) => (
                                            <th key={plo.id} className="p-4 text-center text-[11px] font-bold text-[#800000] border-b border-slate-200 w-20">PLO {i + 1}</th>
                                        ))}
                                        <th className="p-4 border-b border-slate-200 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {clos.map((clo, idx) => (
                                        <tr key={clo.id} className="hover:bg-slate-50/40 transition-colors group">
                                            <td className="p-4 min-w-87.5">
                                                <textarea
                                                    rows={3}
                                                    placeholder="Enter course outcome description..."
                                                    className={`w-full text-sm p-3 bg-white border rounded-lg focus:ring-2 focus:ring-red-100 focus:border-[#800000] transition-all resize-none shadow-sm
                                                        ${showErrors && localErrors[`clo_${idx}`] ? 'border-red-500' : 'border-slate-200'}
                                                    `}
                                                    value={clo.text}
                                                    onChange={(e) => {
                                                        const newClos = [...clos];
                                                        newClos[idx].text = e.target.value;
                                                        setClos(newClos);
                                                    }}
                                                />

                                                {showErrors && localErrors[`clo_${idx}`] && (
                                                    <p className="text-red-500 text-[10px] mt-1">
                                                        {localErrors[`clo_${idx}`]}
                                                    </p>
                                                )}
                                            </td>
                                            {plos.map((plo) => {
                                                const currentValue = ploMapping[`${clo.id}-${plo.id}`];
                                                const rowHasError =
                                                                    showErrors &&
                                                                    localErrors[`clo_map_${idx}`]; // row-level error

                                                                const showErrorState = rowHasError && !currentValue;

                                                return (
                                                    <td key={plo.id} className="p-1.5 text-center">
                                                        <div className="relative">
                                                            <select 
                                                                className={`w-14 h-10 mx-auto bg-white border-2 text-center text-sm font-black rounded-lg outline-none transition-all cursor-pointer appearance-none ${
                                                                    currentValue 
                                                                        ? 'border-[#800000] text-[#800000] bg-red-50/50' 
                                                                        : showErrorState
                                                                            ? 'border-red-500! text-red-600! bg-red-50 shadow-sm' 
                                                                            : 'border-slate-100 text-slate-400 hover:border-slate-300'
                                                                }`}
                                                                value={currentValue || ''}
                                                                onChange={(e) => handlePloMapping(clo.id, plo.id, e.target.value)}
                                                            >
                                                                <option value="">-</option>
                                                                <option value="L">L</option>
                                                                <option value="P">P</option>
                                                                <option value="O">O</option>
                                                            </select>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="p-2 text-center">
                                                <button 
                                                            onClick={() => {
                                                                            setSelectedDelete({ type: "clo", id: clo.id });
                                                                            setDeleteModalOpen(true);
                                                                        }}
                                                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full md:opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    
                                </tbody>
                                <DeleteModal
                                    open={deleteModalOpen}
                                    onClose={() => {
                                        setDeleteModalOpen(false);
                                        setSelectedDelete(null);
                                    }}
                                    onConfirm={() => {
                                        if (!selectedDelete || selectedDelete.id === null) return;

                                        if (selectedDelete.type === "plo") {
                                            removePloRow(selectedDelete.id);
                                        }

                                        if (selectedDelete.type === "clo") {
                                            removeCloRow(selectedDelete.id);
                                        }

                                        setDeleteModalOpen(false);
                                        setSelectedDelete(null);
                                    }}
                                />
                            </table>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* SYLLABUS PREVIEW MODAL */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-100 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
                            className="bg-white w-full max-w-[98%] h-[90vh] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="bg-[#800000] p-3 sm:p-4 flex justify-between items-center text-white shrink-0">
                                <span className="font-bold flex items-center gap-2 uppercase tracking-wider text-[10px] sm:text-xs">
                                    <FileText size={18} className="shrink-0"/> MAP LEARNING OUTCOMES SYLLABUS PREVIEW
                                </span>
                                <button onClick={() => setShowPreview(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"><X size={20}/></button>
                            </div>
                            
                            <div className="flex-1 bg-slate-400 overflow-auto p-2 sm:p-8 flex justify-start lg:justify-center">
                                <div className="origin-top-left scale-[0.35] min-[400px]:scale-[0.45] sm:scale-[0.6] md:scale-[0.8] lg:scale-100 transition-transform">
                                    <div className="bg-white w-[297mm] min-h-[210mm] p-[15mm] shadow-2xl font-serif text-black leading-tight">
                                        <div className="flex items-center gap-4 mb-2">
                                            <img src="/images/pup_logo.png" alt="PUP Logo" className="w-20 h-20 object-contain" />
                                            <div className="text-left">
                                                <p className="text-[10pt] italic">Republic of the Philippines</p>
                                                <p className="font-bold text-[12pt]">POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</p>
                                                <p className="font-bold text-[11pt]">SANTA ROSA CAMPUS</p>
                                                <p className="text-[10pt] italic">City of Santa Rosa, Laguna</p>
                                            </div>
                                        </div>

                                        <hr className="border-t-2 border-black mb-6" />

                                        <div className="flex w-full border border-black mb-6">
                                            <div className="w-[5%] border-r border-black flex items-center justify-center bg-white p-2 text-center">
                                                <span className="font-bold text-[8pt] rotate-180 [writing-mode:vertical-lr] whitespace-nowrap">PROGRAM LEARNING OUTCOMES</span>
                                            </div>
                                            <div className="flex-1">
                                                <table className="w-full border-collapse text-[8pt]">
                                                    <thead>
                                                        <tr className="border-b border-black">
                                                            <th className="p-2 text-left font-normal italic border-r border-black w-[50%]">Based on CHED Memorandum Order (CMO) No. 25, series of 2015</th>
                                                            <th colSpan={iloCount} className="p-1 border-b border-black text-center font-bold">Alignment to ILOs</th>
                                                        </tr>
                                                        <tr className="border-b border-black">
                                                            <th className="border-r border-black"></th>
                                                            {Array.from({ length: iloCount }, (_, i) => i + 1).map(n => (
                                                                <th key={n} className="border-r border-black last:border-0 w-8">{n}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {plos.map(plo => (
                                                            <tr key={plo.id} className="border-b border-black last:border-0">
                                                                <td className="p-1 border-r border-black">{plo.label}</td>
                                                                {Array.from({ length: iloCount }, (_, i) => i + 1).map(n => (
                                                                    <td key={n} className="border-r border-black last:border-0 text-center font-bold">
                                                                        {iloMapping[`${plo.id}-${n}`] ? '✓' : ''}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="flex w-full border border-black">
                                            <div className="w-[5%] border-r border-black flex items-center justify-center bg-white p-2 text-center">
                                                <span className="font-bold text-[8pt] rotate-180 [writing-mode:vertical-lr] whitespace-nowrap">COURSE LEARNING OUTCOMES</span>
                                            </div>
                                            <div className="flex-1">
                                                <table className="w-full border-collapse text-[8pt]">
                                                    <thead>
                                                        <tr className="border-b border-black">
                                                            <th className="p-2 text-left font-bold border-r border-black w-[50%]">After completion of the course, the students should be able to:</th>
                                                            <th colSpan={plos.length} className="p-1 border-b border-black text-center font-bold">Alignment to PLOs</th>
                                                        </tr>
                                                        <tr className="border-b border-black">
                                                            <th className="border-r border-black"></th>
                                                            {plos.map((_, i) => (
                                                                <th key={i} className="border-r border-black last:border-0 w-8">{i + 1}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {clos.map(clo => (
                                                            <tr key={clo.id} className="border-b border-black last:border-0">
                                                                <td className="p-1 border-r border-black">{clo.text}</td>
                                                                {plos.map(plo => (
                                                                    <td key={plo.id} className="border-r border-black last:border-0 text-center font-bold">
                                                                        {ploMapping[`${clo.id}-${plo.id}`] || ''}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <p className="text-[7pt] mt-2 italic">Legend: L-Learned, P-Practiced, O-Opportunity to Learn</p>
                                        
                                        {/* Bottom Labels  */}
                                        <div className="mt-6 flex justify-between items-start text-[8pt] text-slate-500 italic">
                                            <div>
                                                <p>PUP LCA Boulevard, Brgy. Tagapo, City of Santa Rosa, Laguna</p>
                                                <p>Direct Line: 0961-8023780</p>
                                                <p>Website: https://pupsrc101.school.blog/ | Email: starosa@pup.edu.ph</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <div className="flex gap-2">
                                                     <img src="/images/iso_logo.png" alt="ISO" className="h-8 opacity-70" />
                                                     <img src="/images/ajb_logo.png" alt="AJB" className="h-8 opacity-70" />
                                                </div>
                                                <p className="font-bold text-black not-italic uppercase">THE COUNTRY'S 1st POLYTECHNIC U</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 sm:p-4 z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">

                    {/* ALERT AREA (LEFT OF NEXT BUTTON) */}
                    <div className="flex-1 flex justify-start">
                        <AnimatePresence mode="wait">
                            {validationError && (
                                <Alert type="error" message={validationError} />
                            )}

                            {successMessage && (
                                <Alert type="success" message={successMessage} />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* NAV BUTTONS */}
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                            href="/syllabus-generator/step-1"
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 text-xs sm:text-sm border border-slate-200 transition-all"
                        >
                            <ChevronLeft size={16} /> Back
                        </Link>

                        <button
                            onClick={validateAndNext}
                            className="flex-2 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 bg-[#800000] text-white rounded-xl font-bold hover:bg-[#600000] text-xs sm:text-sm shadow-md active:scale-95 transition-all"
                        >
                            Next: Weekly Plan <ChevronRight size={16} />
                        </button>
                    </div>

                </div>
            </footer>
        </div>
    );
};

export default Step2;