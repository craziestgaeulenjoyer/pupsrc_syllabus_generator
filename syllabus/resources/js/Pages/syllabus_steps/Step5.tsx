import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
    Plus, Trash2, Calendar, Upload, FileText, X, FileDown, Edit3, BookOpen,
    ChevronLeft, ChevronRight, Award, Users, Info, CheckCircle, User,
    Mail,
    Phone,
    Clock,
    Image as ImageIcon,
    TriangleAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar_layouts/Navbar';
import { validateStep5} from '../Validation/SyllabusValidation';
import Alert from '../Validation/Alert';
import DeleteModal from '../modals_section/DeleteConfirmation';
/**
 * Interface for Group Grade Criteria
 * Defines the structure for the assessment rows
 */
interface Criterion {
    id: number;
    label: string;
    weight: number;
    score: number;
}

interface Signatory {
    id: number;
    role: string;
    name: string;
    title: string;
    signature: string | null;
}

const Step5 = () => {
    // --- STATE DEFINITIONS ---
    const [showPreview, setShowPreview] = useState(false);
    const [errors, setErrors] = useState<any>({});

    // 1. Class Information State
    const [classInfo, setClassInfo] = useState({
        section: '',
        semester: '',
        time: '',
        room: ''
});

   // 2. Faculty Information State
   const [facultyInfo, setFacultyInfo] = useState({
        name: '',
        consultation: '',
        contact: '',
        email: ''
});

    const [rubrics, setRubrics] = useState([
        { id: 1, skills: "Contributions, Attitude", v4: "Always willing to help...", v3: "Cooperative...", v2: "Sometimes...", v1: "Seldom..." },
        // ... rest of initial rubrics
    ]);

    const [groupCriteria, setGroupCriteria] = useState<Criterion[]>([
        { id: 1, label: 'Content', weight: 40, score: 0 },
        { id: 2, label: 'Presentation', weight: 30, score: 0 },
        { id: 3, label: 'Ability to answer the question', weight: 30, score: 0 },
    ]);

    const [signatories, setSignatories] = useState<Signatory[]>([
        { id: 1, role: 'Prepared by:', name: '', title: 'Faculty Member', signature: null },
        { id: 2, role: 'Reviewed by:', name: '', title: 'Head of Academic Programs', signature: null }
    ]);

    // --- HANDLERS ---
    const updateRubric = (id: number, field: string, value: string) => {
        setRubrics(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleClassInfo = (field: string, value: string) => {
        setClassInfo(prev => ({ ...prev, [field]: value }));
    };

    /** Adds a new criterion row to the Group Grade table */
    const addRow = () => {
        const newId = groupCriteria.length > 0 ? Math.max(...groupCriteria.map(c => c.id)) + 1 : 1;
        const newRow: Criterion = { 
            id: newId, 
            label: 'New Criteria', 
            weight: 0, 
            score: 1 
        };
        setGroupCriteria([...groupCriteria, newRow]);
    };

    /** Removes a criterion row from Group Grade */
    const removeRow = (id: number) => {
        setGroupCriteria(groupCriteria.filter(c => c.id !== id));
    };

    /**  Updates field values (label, weight, or score) in Group Grade */
    const updateRow = (id: number, field: keyof Criterion, value: string | number) => {
        setGroupCriteria(groupCriteria.map(c => 
            c.id === id ? { ...c, [field]: value } : c
        ));
    };

    // Handle Signature Upload
    const handleSignatureUpload = (id: number, file: File | Blob) => { 
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;

            setSignatories(prev => prev.map(sig => 
                sig.id === id ? { ...sig, signature: base64String } : sig
            ));
        };
        reader.readAsDataURL(file);
    };

    // Update Signatory Text Fields
    const updateSignatory = (id: number, field: string, value: string) => {
        setSignatories(prev => prev.map(sig => 
            sig.id === id ? { ...sig, [field]: value } : sig
        ));
    };

    function chunkArray(rubrics: any[], size: number) {
        const result: any[] = [];
        for (let i = 0; i < rubrics.length; i += size) {
            result.push(rubrics.slice(i, i + size));
        }
        return result;
    }

    const [alert, setAlert] = useState<{
        message: string | null | undefined;
        type: 'error' | 'success';
    }>({
        message: null,
        type: 'error'
    });

    const syllabusSessionId = sessionStorage.getItem('syllabus_session_id');

    const handleNext = () => {
        const result = validateStep5({
            classInfo,
            facultyInfo,
            signatories
        });

        if (!result.isValid) {
            setErrors(result.errors);

            // show alert message
            setAlert({
                message: result.message,
                type: 'error'
            });

            setTimeout(() => {
                setErrors({});
                setAlert({ message: null, type: 'error' });
            }, 3000);

            return;
        }

        setErrors({});
        setAlert({ message: null, type: 'error' });

        sessionStorage.setItem(
            `syllabus_step5_${syllabusSessionId}`,
            JSON.stringify({
                syllabus_session_id: syllabusSessionId,
                classInfo,
                facultyInfo,
                rubrics,
                groupCriteria,
                signatories
            })
        );

        window.location.href = "/syllabus-generator/step-6";
    };

    const getSigError = (sigId: number, field: string) => {
        return errors?.[`signatory_${field}_${sigId}`];
    };

    const [deleteModal, setDeleteModal] = useState<{
        open: boolean;
        type: 'rubric' | 'group' | 'signatory' | null;
        id: number | null;
    }>({
        open: false,
        type: null,
        id: null
    });

    const handleConfirmDelete = () => {
        if (!deleteModal.id) return;

        switch (deleteModal.type) {
            case 'rubric':
                setRubrics(prev => prev.filter(r => r.id !== deleteModal.id));
                break;

            case 'group':
                setGroupCriteria(prev => prev.filter(c => c.id !== deleteModal.id));
                break;

            case 'signatory':
                setSignatories(prev => prev.filter(s => s.id !== deleteModal.id));
                break;
        }

        setDeleteModal({ open: false, type: null, id: null });
    };

    useEffect(() => {
        if (!syllabusSessionId) return;

        const saved = sessionStorage.getItem(`syllabus_step5_${syllabusSessionId}`);

        if (saved) {
            const parsed = JSON.parse(saved);

            setClassInfo(parsed.classInfo || {
                section: '',
                semester: '',
                time: '',
                room: ''
            });

            setFacultyInfo(parsed.facultyInfo || {
                name: '',
                consultation: '',
                contact: '',
                email: ''
            });

            setRubrics(parsed.rubrics || []);
            setGroupCriteria(parsed.groupCriteria || []);
            setSignatories(parsed.signatories || []);
        }
    }, [syllabusSessionId]);

    useEffect(() => {
        if (!syllabusSessionId) return;

        const data = {
            classInfo,
            facultyInfo,
            rubrics,
            groupCriteria,
            signatories
        };

        sessionStorage.setItem(
            `syllabus_step5_${syllabusSessionId}`,
            JSON.stringify(data)
        );
    }, [classInfo, facultyInfo, rubrics, groupCriteria, signatories, syllabusSessionId]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <Navbar />
            <Head title="Step 5: Review & Verification"/>
            <main className="grow pt-24 px-4 max-w-7xl mx-auto w-full pb-32">
                {/* Hero Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[#800000] font-bold text-[10px] md:text-sm tracking-widest uppercase mb-1">Data Validation</span>
                        <h1 className="text-xl md:text-3xl font-black text-slate-800 flex flex-wrap items-center gap-2 md:gap-3">
                            Step 5 of 6: <span className="text-slate-600 font-bold text-lg md:text-3xl"> Review & Verification </span>
                        </h1>
                    </div>
            
                    <button
                        onClick={() => setShowPreview(true)}
                        className="w-full lg:w-auto bg-[#800000] hover:bg-[#600000] cursor-pointer text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <FileDown size={18}/> View Live PDF Preview
                    </button>
                </div>

                <hr className="border-t-2 border-slate-200 mb-6" />

                {/* Instructions */}
                <div className="bg-white border-l-4 border-[#800000] p-4 rounded-r-xl shadow-sm mb-8 flex items-start gap-3">
                    <Info className="text-[#800000] mt-0.5 shrink-0" size={20} />
                    <p className="text-[11px] md:text-sm text-slate-600 font-medium">
                        <span className="font-bold text-slate-900">Instructions:</span> Review the institutional policies and set your specific grading criteria. The rubrics below are pre-filled based on PUP standards but can be modified.
                    </p>
                </div>

                {/* WARNING / ERROR MESSAGE */}
                {alert.message && (
                    <div className="bg-white border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm mb-8 flex items-start gap-3">
                        <TriangleAlert className="text-red-500 mt-0.5 shrink-0" size={20} />
                        
                        <div className="flex-1">
                            <p className="text-[11px] md:text-sm text-red-600 font-medium break-words">
                                <span className="font-bold text-red-600">Warning:</span> {alert.message}
                            </p>
                        </div>
                    </div>
                )}

                {/* 1. RUBRICS TABLE */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 mx-auto w-full max-w-full">
                    {/* Header Section - Responsive Flex */}
                    <div className="bg-[#800000] p-3 sm:p-4 text-white flex flex-row justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-lg hidden xs:block">
                                <BookOpen size={18} className="text-[#D4AF37]" />
                            </div>
                            <h2 className="font-bold uppercase text-[10px] sm:text-xs md:text-sm tracking-widest leading-tight">
                                Rubrics for Assessment
                            </h2>
                        </div>
                        <button 
                            onClick={() => setRubrics([...rubrics, { id: Date.now(), skills: '', v4: '', v3: '', v2: '', v1: '' }])} 
                            className="bg-[#D4AF37] hover:bg-[#b8952e] cursor-pointer text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[9px] sm:text-xs font-black transition-all shadow-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap active:scale-95"
                        >
                            <Plus size={14} strokeWidth={3} /> 
                            <span className="hidden xxs:inline">ADD ROW</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                        <table className="w-full text-sm border-collapse min-w-[850px] lg:min-w-full">
                            <thead>
                                {/* ROW 1: NUMBERS (4, 3, 2, 1) */}
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th rowSpan={2} className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-left w-[20%] border-r border-slate-200">
                                        Learning Outcomes / Skills
                                    </th>
                                    <th className="p-2 text-xs font-black text-[#800000] text-center border-r border-slate-200 w-[18%]">4</th>
                                    <th className="p-2 text-xs font-black text-[#800000] text-center border-r border-slate-200 w-[18%]">3</th>
                                    <th className="p-2 text-xs font-black text-[#800000] text-center border-r border-slate-200 w-[18%]">2</th>
                                    <th className="p-2 text-xs font-black text-[#800000] text-center w-[18%]">1</th>
                                    <th rowSpan={2} className="w-12 border-l border-slate-200"></th>
                                </tr>
                                {/* ROW 2: LABELS (Advanced to Beginning) */}
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-2 text-[9px] font-black uppercase text-slate-400 text-center border-r border-slate-200 leading-tight">
                                        Advanced - Exceeds expectations
                                    </th>
                                    <th className="p-2 text-[9px] font-black uppercase text-slate-400 text-center border-r border-slate-200 leading-tight">
                                        Competent - Meets expectations
                                    </th>
                                    <th className="p-2 text-[9px] font-black uppercase text-slate-400 text-center border-r border-slate-200 leading-tight">
                                        Progressing - Does not fully meet expectations
                                    </th>
                                    <th className="p-2 text-[9px] font-black uppercase text-slate-400 text-center leading-tight">
                                        Beginning - Does not meet expectations 
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rubrics.map((row) => (
                                    <tr key={row.id} className="group hover:bg-slate-50/50 transition-colors">
                                        {/* Skills/Learning Outcomes Column */}
                                        <td className="p-3 align-top border-r border-slate-100">
                                            <textarea 
                                                placeholder="e.g. Technical Skills"
                                                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-100 focus:border-[#800000] outline-none transition-all resize-none min-h-[100px] bg-slate-50/30" 
                                                value={row.skills} 
                                                onChange={(e) => updateRubric(row.id, 'skills', e.target.value)} 
                                            />
                                        </td>
                                        
                                        {/* Descriptor Columns (v4 to v1) */}
                                        {[
                                            { key: 'v4', placeholder: 'Criteria for 4...' },
                                            { key: 'v3', placeholder: 'Criteria for 3...' },
                                            { key: 'v2', placeholder: 'Criteria for 2...' },
                                            { key: 'v1', placeholder: 'Criteria for 1...' }
                                        ].map((col, idx) => (
                                            <td key={col.key} className={`p-3 align-top ${idx < 3 ? 'border-r border-slate-100' : ''}`}>
                                                <textarea 
                                                    placeholder={col.placeholder}
                                                    className="w-full p-3 border border-slate-200 rounded-xl text-[10px] focus:ring-2 focus:ring-red-100 focus:border-[#800000] outline-none transition-all resize-none min-h-[100px]" 
                                                    value={(row as any)[col.key]} 
                                                    onChange={(e) => updateRubric(row.id, col.key, e.target.value)} 
                                                />
                                            </td>
                                        ))}

                                        {/* Actions Column */}
                                        <td className="p-3 text-center align-middle border-l border-slate-100 bg-slate-50/20">
                                            <button 
                                            onClick={() =>
                                                            setDeleteModal({ open: true, type: 'rubric', id: row.id })
                                                        }
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                                                title="Delete Row"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Empty State */}
                    {rubrics.length === 0 && (
                        <div className="p-8 sm:p-12 text-center text-slate-400 text-xs italic bg-slate-50/50">
                            No rubric rows added yet. Click "+ ADD ROW" to start.
                        </div>
                    )}
                </section>

                <div className="space-y-6 max-w-7xl mx-auto p-4">
                    {/* --- PART 2: GROUP GRADE --- */}
                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-6 mb-8 w-full">
                        {/* Header Container */}
                        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-3">
                            <div className="flex items-center gap-2">
                                <Users size={20} className="text-[#800000] shrink-0" />
                                <h3 className="text-[#800000] font-bold uppercase text-[11px] sm:text-sm tracking-widest leading-tight">
                                    Part 2: Group Grade
                                </h3>
                            </div>
                            <button 
                                onClick={addRow} 
                                className="w-full xs:w-auto text-[10px] sm:text-xs bg-[#800000] hover:bg-[#600000] cursor-pointer text-white px-4 py-2 rounded-lg hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Plus size={14} /> ADD ROW
                            </button>
                        </div>

                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                            <table className="w-full text-left border-separate border-spacing-y-2 min-w-[500px] lg:min-w-full">
                                <thead>
                                    <tr className="text-slate-400">
                                        <th className="pb-2 px-2 text-[10px] font-black uppercase tracking-wider w-[45%] md:w-auto">Criteria & Weight</th>
                                        <th className="pb-2 text-[10px] font-black uppercase text-center w-12 sm:w-16">1</th>
                                        <th className="pb-2 text-[10px] font-black uppercase text-center w-12 sm:w-16">2</th>
                                        <th className="pb-2 text-[10px] font-black uppercase text-center w-12 sm:w-16">3</th>
                                        <th className="pb-2 text-[10px] font-black uppercase text-center w-12 sm:w-16">4</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupCriteria.map((c: any) => (
                                        <tr key={c.id} className="group bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                            {/* Input & Weight Section */}
                                            <td className="py-3 px-3 sm:px-4 rounded-l-xl border-y border-l border-slate-100">
                                                <input 
                                                    className="text-xs sm:text-sm font-bold text-slate-700 bg-transparent border-none w-full focus:outline-none placeholder:text-slate-300" 
                                                    placeholder="Enter criteria name..."
                                                    value={c.label} 
                                                    onChange={(e) => updateRow(c.id, 'label', e.target.value)} 
                                                />
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <input 
                                                        type="number" 
                                                        className="w-10 sm:w-12 text-[10px] sm:text-[11px] font-bold text-[#800000] bg-red-50 border border-red-100 rounded px-1 outline-none py-0.5" 
                                                        value={c.weight} 
                                                        onChange={(e) => updateRow(c.id, 'weight', parseInt(e.target.value) || 0)} 
                                                    />
                                                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Weight %</span>
                                                </div>
                                            </td>

                                            {[1, 2, 3, 4].map((num) => (
                                                <td key={num} className="py-3 text-center border-y border-slate-100">
                                                    <button 
                                                        onClick={() => updateRow(c.id, 'score', num)} 
                                                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-all flex items-center justify-center mx-auto active:scale-90 ${
                                                            c.score === num 
                                                            ? 'border-[#800000] bg-[#800000] text-white shadow-sm ring-4 ring-red-50' 
                                                            : 'border-slate-200 hover:border-red-200 text-transparent'
                                                        }`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${c.score === num ? 'bg-white' : 'bg-transparent'}`} />
                                                    </button>
                                                </td>
                                            ))}

                                            {/* Action Column */}
                                            <td className="py-3 px-2 sm:px-3 text-center rounded-r-xl border-y border-r border-slate-100">
                                                <button 
                                                onClick={() =>
                                                                setDeleteModal({ open: true, type: 'group', id: c.id })
                                                            }
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 active:scale-90"
                                                    title="Delete Row"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <DeleteModal
                                open={deleteModal.open}
                                onClose={() =>
                                    setDeleteModal({ open: false, type: null, id: null })
                                }
                                onConfirm={handleConfirmDelete}
                            />
                        </div>
                        
                        {groupCriteria.length > 0 && (
                            <div className="mt-4 text-right">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    Total Weight: {groupCriteria.reduce((sum: number, c: any) => sum + (c.weight || 0), 0)}%
                                </span>
                            </div>
                        )}
                    </section>
                </div> 

                {/* --- BOTTOM SECTION: CLASS & FACULTY (Side-by-Side) --- */}
                <div className="w-full max-w-full px-1 sm:px-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        
                        {/* CLASS INFORMATION */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                                    <BookOpen size={20} className="text-blue-700" />
                                </div>
                                <h3 className="text-slate-800 font-bold uppercase text-[10px] sm:text-xs tracking-widest leading-tight">
                                    Class Information
                                </h3>
                            </div>
                            
                            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-5">
                            {[
                                { label: 'Section', key: 'section', placeholder: 'BSIT 4-1' },
                                { label: 'Semester', key: 'semester', placeholder: '2nd Semester' },
                                { label: 'Time', key: 'time', placeholder: '8:00 AM - 5:00 PM' },
                                { label: 'Room', key: 'room', placeholder: 'Lab 1 / Online' }
                            ].map((field) => (
                                <div key={field.label} className="space-y-1.5 w-full">
                                    
                                    {/* LABEL */}
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block">
                                        {field.label}
                                    </label>

                                    {/* INPUT */}
                                    <input 
                                        className={`w-full p-2.5 sm:p-3 bg-slate-50 border rounded-xl text-xs sm:text-sm outline-none transition-all placeholder:text-slate-300
                                        ${errors[field.key] ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'}`}
                                        
                                        placeholder={field.placeholder}
                                        
                                        value={classInfo[field.key as keyof typeof classInfo]}
                                        
                                        onChange={(e) =>
                                            setClassInfo({
                                                ...classInfo,
                                                [field.key]: e.target.value
                                            })
                                        }
                                    />

                                    {/* ERROR MESSAGE */}
                                    {errors[field.key] && (
                                        <p className="text-red-500 text-[10px] ml-1 mt-1">
                                            {errors[field.key]}
                                        </p>
                                    )}
                                </div>
                            ))}
                            </div>
                        </section>

                        {/* FACULTY INFORMATION */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col h-full">

                            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-amber-50 rounded-lg shrink-0">
                                    <User size={20} className="text-amber-700" />
                                </div>
                                <h3 className="text-slate-800 font-bold uppercase text-[10px] sm:text-xs tracking-widest leading-tight">
                                    Faculty Information
                                </h3>
                            </div>

                            <div className="space-y-4 sm:space-y-5">

                                {/* NAME */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block">
                                        Name of Faculty
                                    </label>

                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />

                                        <input 
                                            className={`w-full pl-10 p-3 bg-slate-50 border rounded-xl text-sm outline-none transition-all
                                            ${errors.name ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:ring-amber-100'}`}
                                            
                                            placeholder="Enter Full Name"
                                            value={facultyInfo.name}
                                            onChange={(e) =>
                                                setFacultyInfo({ ...facultyInfo, name: e.target.value })
                                            }
                                        />
                                    </div>

                                    {errors.name && (
                                        <p className="text-red-500 text-[10px] ml-1 mt-1">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                            {/* CONSULTATION + CONTACT  */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

                                    {/* CONSULTATION */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block">
                                            Consultation Time
                                        </label>

                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />

                                            <input 
                                                className={`w-full pl-10 p-3 bg-slate-50 border rounded-xl text-sm outline-none transition-all
                                                ${errors.consultation ? 'border-red-500' : 'border-slate-200'}`}
                                                
                                                placeholder="TTh 1:00 PM"
                                                value={facultyInfo.consultation}
                                                onChange={(e) =>
                                                    setFacultyInfo({ ...facultyInfo, consultation: e.target.value })
                                                }
                                            />
                                        </div>

                                        {errors.consultation && (
                                            <p className="text-red-500 text-[10px] ml-1 mt-1">
                                                {errors.consultation}
                                            </p>
                                        )}
                                    </div>

                                    {/* CONTACT */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block">
                                            Contact Number
                                        </label>

                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />

                                            <input 
                                                className={`w-full pl-10 p-3 bg-slate-50 border rounded-xl text-sm outline-none transition-all
                                                ${errors.contact ? 'border-red-500' : 'border-slate-200'}`}
                                                
                                                placeholder="09XX-XXX-XXXX"
                                                value={facultyInfo.contact}
                                                onChange={(e) =>
                                                    setFacultyInfo({ ...facultyInfo, contact: e.target.value })
                                                }
                                            />
                                        </div>

                                        {errors.contact && (
                                            <p className="text-red-500 text-[10px] ml-1 mt-1">
                                                {errors.contact}
                                            </p>
                                        )}
                                    </div>

                                </div>

                                {/* EMAIL */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block">
                                        Institutional Email
                                    </label>

                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />

                                        <input 
                                            className={`w-full pl-10 p-3 bg-slate-50 border rounded-xl text-sm outline-none transition-all
                                            ${errors.email ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:ring-amber-100'}`}
                                            
                                            placeholder="faculty@pup.edu.ph"
                                            value={facultyInfo.email}
                                            onChange={(e) =>
                                                setFacultyInfo({ ...facultyInfo, email: e.target.value })
                                            }
                                        />
                                    </div>

                                    {errors.email && (
                                        <p className="text-red-500 text-[10px] ml-1 mt-1">
                                            {errors.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* 4. SIGNATORIES INPUT */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mt-8 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <CheckCircle size={18} className="text-[#800000]" />
                            <h3 className="text-[#800000] font-bold uppercase text-sm tracking-tight">
                                Approval Signatories
                            </h3>
                        </div>

                        <button 
                            onClick={() =>
                                setSignatories([
                                    ...signatories,
                                    { id: Date.now(), role: 'Approved by:', name: '', title: '', signature: null }
                                ])
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100"
                        >
                            <Plus size={14} /> Add Signatory
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {signatories.map((sig: Signatory) => (
                            <div
                                key={sig.id}
                                className="border border-slate-200 bg-slate-50/30 rounded-xl p-4 relative group"
                            >
                                <button
                                   onClick={() =>
                                                setDeleteModal({ open: true, type: 'signatory', id: sig.id })
                                            }
                                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>

                                {/* ROLE */}
                                <input
                                    className={`w-full text-[10px] font-black uppercase text-[#800000] mb-3 bg-transparent outline-none
                                        ${getSigError(sig.id, 'role') ? 'border-b border-red-500' : ''}`}
                                    value={sig.role}
                                    onChange={(e) => updateSignatory(sig.id, 'role', e.target.value)}
                                />

                                {/* SIGNATURE */}
                                <label
                                    className={`aspect-video bg-white border-2 border-dashed rounded-lg mb-3 flex flex-col items-center justify-center cursor-pointer
                                    ${!sig.signature && errors?.signatories ? 'border-red-500' : 'border-slate-200'}`}
                                >
                                    {sig.signature ? (
                                        <img
                                            src={sig.signature}
                                            alt="Signature"
                                            className="w-full h-full object-contain p-2"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400">
                                            <Upload size={20} />
                                            <span className="text-[8px] mt-1 uppercase font-black tracking-widest">
                                                Upload E-Signature
                                            </span>
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const selectedFile = e.target.files?.[0];
                                            if (selectedFile) {
                                                handleSignatureUpload(sig.id, selectedFile);
                                            }
                                        }}
                                    />
                                </label>

                                {/* NAME */}
                                <input
                                    className={`w-full text-xs font-bold border-b py-1 outline-none uppercase
                                        ${getSigError(sig.id, 'name') ? 'border-red-500' : ''}`}
                                    placeholder="ENTER FULL NAME"
                                    value={sig.name}
                                    onChange={(e) => updateSignatory(sig.id, 'name', e.target.value)}
                                />

                                {/* TITLE */}
                                <input
                                    className={`w-full text-[9px] text-slate-500 mt-1 outline-none bg-transparent
                                        ${getSigError(sig.id, 'title') ? 'border-b border-red-500' : ''}`}
                                    placeholder="Position"
                                    value={sig.title}
                                    onChange={(e) => updateSignatory(sig.id, 'title', e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* FOOTER */}
           <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 sm:p-4 z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto flex items-center justify-between">

                    <div className="flex items-center">
                        <Alert message={alert.message} type={alert.type} />
                    </div>

                    {/* BUTTONS (RIGHT SIDE) */}
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Link
                            href="/syllabus-generator/step-4"
                            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 text-[10px] sm:text-xs md:text-sm border border-slate-200 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <ChevronLeft size={16} />
                            Back
                        </Link>

                        <button
                            onClick={handleNext}
                            className="flex items-center justify-center gap-1.5 cursor-pointer sm:gap-2 px-3 sm:px-8 py-2.5 rounded-xl font-bold text-[10px] sm:text-xs md:text-sm shadow-md bg-[#800000] text-white hover:bg-[#600000] transition-all active:scale-95 whitespace-nowrap"
                        >
                            Next: Finalize Syllabus
                            <ChevronRight size={16} />
                        </button>
                    </div>

                </div>
            </footer>

            {/* PREVIEW MODAL STEP 5 */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-1 sm:p-3"
                    >

                        <motion.div 
                            initial={{ scale: 0.95 }} 
                            animate={{ scale: 1 }} 
                            exit={{ scale: 0.95 }}
                            className="bg-white w-full h-full sm:h-[95vh] sm:max-w-[98%] rounded-none sm:rounded-lg overflow-hidden flex flex-col"
                        >

                            {/* HEADER */}
                            <div className="bg-[#800000] text-white px-3 py-2 sm:p-3 flex justify-between items-center">
                                <span className="font-bold text-[10px] sm:text-xs uppercase flex items-center gap-2">
                                    <FileText size={14}/> REVIEW & VERIFICATION PREVIEW
                                </span>
                                <button onClick={() => setShowPreview(false)}>
                                    <X size={18}/>
                                </button>
                            </div>

                            {/* VIEWPORT */}
                            <div className="flex-1 overflow-auto bg-gray-700 flex justify-center items-start">
                                <div className="w-full flex justify-center py-4">
                                    <div className="origin-top transition-all scale-[0.32] xs:scale-[0.38] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.9] xl:scale-100">

                                        {(chunkArray(rubrics, 8) as unknown as any[]).map((pageRubrics, pageIdx: number) => (

                                            <div
                                                key={pageIdx}
                                                className="w-[297mm] h-[210mm] bg-white p-[10mm] text-black font-serif shadow-xl text-[8pt] leading-tight flex flex-col justify-between"
                                            >
                                                <div>
                                                    <hr className="border-black border"/>

                                                    {/* RUBRICS */}
                                                    <p className="mt-2 font-bold text-center">
                                                        Rubrics for Assessment (to be filled out by the assigned faculty)
                                                    </p>

                                                    <table className="w-full border border-black border-collapse mt-1">
                                                        <thead>
                                                            <tr>
                                                                <th rowSpan={2} className="border w-[20%]">Skills</th>
                                                                <th className="border text-center">4</th>
                                                                <th className="border text-center">3</th>
                                                                <th className="border text-center">2</th>
                                                                <th className="border text-center">1</th>
                                                            </tr>
                                                            <tr>
                                                                <th className="border">Advanced</th>
                                                                <th className="border">Competent</th>
                                                                <th className="border">Progressing</th>
                                                                <th className="border">Beginning</th>
                                                            </tr>
                                                        </thead>

                                                        <tbody>
                                                            {(pageRubrics as any[]).map((r) => (
                                                                <tr key={r.id}>
                                                                    <td className="border font-bold">{r.skills}</td>
                                                                    <td className="border">{r.v4}</td>
                                                                    <td className="border">{r.v3}</td>
                                                                    <td className="border">{r.v2}</td>
                                                                    <td className="border">{r.v1}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    {/* GROUP GRADE  */}
                                                    {pageIdx === 0 && (
                                                        <>
                                                            <p className="mt-2 font-bold">Part 2. Group grade</p>

                                                            <table className="w-full border border-black border-collapse">
                                                                <thead>
                                                                    <tr>
                                                                        <th className="border">Criteria</th>
                                                                        <th className="border">1</th>
                                                                        <th className="border">2</th>
                                                                        <th className="border">3</th>
                                                                        <th className="border">4</th>
                                                                    </tr>
                                                                </thead>

                                                                <tbody>
                                                                    {groupCriteria.map((g, i) => (
                                                                        <tr key={g.id}>
                                                                            <td className="border">
                                                                                {i + 1}. {g.label} ({g.weight}%)
                                                                            </td>

                                                                            {[1,2,3,4].map((n) => (
                                                                                <td key={n} className="border text-center">
                                                                                    {g.score === n ? "✔" : ""}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>

                                                            {/* CLASS + FACULTY */}
                                                            <table className="w-full border border-black border-collapse mt-2">
                                                                <thead>
                                                                    <tr>
                                                                        <th className="border">CLASS INFORMATION</th>
                                                                        <th className="border">FACULTY INFORMATION</th>
                                                                    </tr>
                                                                </thead>

                                                                <tbody>
                                                                    <tr>
                                                                        <td className="border p-1">
                                                                            Section: {classInfo.section}<br/>
                                                                            Time: {classInfo.time}<br/>
                                                                            Room: {classInfo.room}<br/>
                                                                            Semester: {classInfo.semester}
                                                                        </td>

                                                                        <td className="border p-1">
                                                                            Name of Faculty: {facultyInfo.name}<br/>
                                                                            Consultation Time: {facultyInfo.consultation}<br/>
                                                                            Office Tel. No./ Mobile Phone No.:{facultyInfo.contact}<br/>
                                                                            Institutional Email: {facultyInfo.email}
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>

                                                            {/* SIGNATORIES */}
                                                            <table className="w-full border border-black border-collapse mt-2 text-center">
                                                                <tbody>
                                                                    <tr>
                                                                        {signatories.map((s) => (
                                                                            <td key={s.id} className="border h-24 align-bottom">
                                                                                {s.signature && (
                                                                                    <img src={s.signature} className="h-10 mx-auto"/>
                                                                                )}
                                                                                <br/>
                                                                                <span className="font-bold uppercase">{s.name}</span><br/>
                                                                                <span className="text-[7pt]">{s.title}</span>
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Step5;              