import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Navbar from '../navbar_layouts/Navbar'; 
import { 
    ChevronLeft, ChevronRight, X, FileText, AlertCircle,
    Info, FileDown, Plus, Trash2, Layout, Link as LinkIcon, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DeleteModal from '../modals_section/DeleteConfirmation';

// --- Interfaces ---
interface SubItem {
    id: string;
    label: string;
}

interface GradingComponent {
    id: string;
    label: string;
    percentage: string;
    subItems: SubItem[];
}

const Step4 = () => {
    const defaultGradingComponents: GradingComponent[] = [
        { 
            id: '1', 
            label: 'Class Standing', 
            percentage: '70', 
            subItems: [
                { id: 's1', label: 'Seatwork' },
                { id: 's2', label: 'Assignment' }
            ] 
        },
        { 
            id: '2', 
            label: 'Quiz', 
            percentage: '30', 
            subItems: [
                { id: 'q1', label: 'Midterm / Final Examinations and Project' }
            ] 
        }
    ];

    const defaultRequirements = [
        { id: '1', text: 'Participation in the classroom activities', clo: 'CLOs 1-5' },
        { id: '2', text: 'Oral Presentation - Final paper presentations', clo: 'CLO 5' }
    ];

    const [showPreview, setShowPreview] = useState(false);
    const [f2fLink, setF2fLink] = useState('');
    const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    type: 'requirement' | 'component';
    id: string | null;
    }>({
        open: false,
        type: 'requirement',
        id: null,
    });

    const handleConfirmDelete = () => {
        if (!deleteModal.id) return;

        if (deleteModal.type === 'requirement') {
            setRequirements(prev => prev.filter(r => r.id !== deleteModal.id));
        }

        if (deleteModal.type === 'component') {
            setGradingComponents(prev => prev.filter(c => c.id !== deleteModal.id));
        }

        setDeleteModal({ open: false, type: 'requirement', id: null });
    };
    
    const [gradingComponents, setGradingComponents] = useState<GradingComponent[]>(defaultGradingComponents);
    const [requirements, setRequirements] = useState(defaultRequirements);

    // Automatic Total Logic
    const totalPercentage = useMemo(() => {
        return gradingComponents.reduce((acc, curr) => acc + (parseFloat(curr.percentage) || 0), 0);
    }, [gradingComponents]);

    // --- Logic Handlers ---
    const addGradingComponent = () => {
        const newComp: GradingComponent = {
            id: Date.now().toString(),
            label: '',
            percentage: '0',
            subItems: []
        };
        setGradingComponents([...gradingComponents, newComp]);
    };

    const addSubItem = (compId: string) => {
        setGradingComponents(prev => prev.map(comp => {
            if (comp.id === compId) {
                return {
                    ...comp,
                    subItems: [...comp.subItems, { id: Date.now().toString(), label: '' }]
                };
            }
            return comp;
        }));
    };

    const updateSubItem = (compId: string, subId: string, val: string) => {
        setGradingComponents(prev => prev.map(comp => {
            if (comp.id === compId) {
                return {
                    ...comp,
                    subItems: comp.subItems.map(s => s.id === subId ? { ...s, label: val } : s)
                };
            }
            return comp;
        }));
    };

    const removeSubItem = (compId: string, subId: string) => {
        setGradingComponents(prev => prev.map(comp => {
            if (comp.id === compId) {
                return { ...comp, subItems: comp.subItems.filter(s => s.id !== subId) };
            }
            return comp;
        }));
    };

    const syllabusSessionId = sessionStorage.getItem('syllabus_session_id');

    const storageKey = syllabusSessionId
    ? `syllabus_step4_${syllabusSessionId}`
    : 'syllabus_step4';

    useEffect(() => {
        const saved = sessionStorage.getItem(storageKey);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                setGradingComponents(parsed.gradingComponents?.length ? parsed.gradingComponents : defaultGradingComponents);
                setRequirements(parsed.requirements?.length ? parsed.requirements : defaultRequirements);
                setF2fLink(parsed.f2fLink ?? '');
            } catch (err) {
                console.error("Failed to parse Step 4 session data", err);
            }
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const dataToSave = {
                gradingComponents,
                requirements,
                f2fLink
            };

            sessionStorage.setItem(storageKey, JSON.stringify(dataToSave));
        }, 600);

        return () => clearTimeout(timeout);
    }, [gradingComponents, requirements, f2fLink]);

    return (
        <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans pb-40">
            <Navbar />
            <Head title="Step 4: Classroom Policies & Grading" />

            <main className="grow pt-24 md:pt-28 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto w-full">
                {/* Hero Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[#800000] font-bold text-[10px] md:text-sm tracking-widest uppercase mb-1">Assessment & Policies</span>
                        <h1 className="text-xl md:text-3xl font-black text-slate-800 flex flex-wrap items-center gap-2 md:gap-3">
                            Step 4 of 6: <span className="text-slate-600 font-bold text-lg md:text-3xl"> Classroom Policies & Grading </span>
                        </h1>
                    </div>
                    
                    <button 
                        onClick={() => setShowPreview(true)} 
                        className="w-full lg:w-auto bg-[#800000] hover:bg-[#600000] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                        <FileDown size={18}/> View Live PDF Preview
                    </button>
                </div>

                <hr className="border-t-2 border-slate-200 mb-6" />

                {/* Instructions */}
                <div className="bg-white border-l-4 border-[#800000] p-4 rounded-r-xl shadow-sm mb-8 flex items-start gap-3">
                    <Info className="text-[#800000] mt-0.5 shrink-0" size={20} />
                    <p className="text-[11px] md:text-sm text-slate-600 font-medium">
                        <span className="font-bold text-slate-900">Instructions:</span> Review the institutional policies and set your specific grading criteria. Add sub-items to Class Standing to specify activities.
                    </p>
                </div>

                {/* MAIN CONTENT TABLES */}
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden mb-10">
                    <div className="p-4 bg-[#800000] text-white flex items-center gap-2 font-bold text-sm tracking-widest uppercase">
                        <Layout size={18} /> Classroom Policies (Faculty-Assigned)
                    </div>

                    {/* TOP TABLES: F2F & Flexible */}
                    <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                        {/* Left: F2F */}
                        <div className="p-6 bg-slate-50/30 flex flex-col">
                            <h3 className="font-black text-[#800000] text-sm mb-4 uppercase tracking-tighter">Face-to-Face Delivery</h3>
                            
                            <div className="space-y-3 text-[11px] text-slate-600 leading-relaxed mb-6 flex-1">
                                <p className="font-bold text-slate-800 italic">General Classroom Guidelines:</p>
                                <p>1. Students shall attend set contact schedule ready with all the materials and outputs required to be read, discussed, and/or submitted. Students should have also read required texts at least once before its scheduled discussion. </p>
                                <p>2. PLAGIARISM SHALL NOT BE TOLERATED. The following penalties will be strictly implemented to outputs proven to contain plagiarized words, phrases, clauses, sentences, paragraphs, or ideas: First offense – automatic failure in the output; Second offense – automatic failure in the output + letter from parent/s/guardian/s that acknowledges the offense; Third offense – automatic failure in the course.</p>
                                <p>3. Requirements shall be submitted on time. However, in special cases when students fail to submit requirements for some acceptable reasons, submissions will be subjected to deductions of no less than 0.25 per day.</p>
                                <p>4. Students who have any form of disability must inform the course instructor immediately so that alternative arrangements may be immediately considered.</p>
                                <p>5. All students are expected to read and strictly observe the PUP Student Code of Conduct. </p>
                            </div>

                            <div className="mt-auto">
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-2">
                                    <LinkIcon size={12}/> Insert F2F Resource Link
                                </label>
                                <input 
                                    type="text" 
                                    value={f2fLink}
                                    onChange={(e) => setF2fLink(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full p-2 bg-white border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-[#800000] outline-none"
                                />
                            </div>

                            <div className="space-y-3 text-[11px] text-slate-600 leading-relaxed  mt-6 mb-6 flex-1">
                                <p className="font-bold text-slate-800 italic">Guidelines for the face-to-face delivery:</p>
                                <p>1. Strictly observe the minimum health protocols set by the university. </p>
                                <p>2. Check your schedule on the class Facebook page before going to school.</p>
                                <p>3. Be mindful of your classmates and teacher’s time. Be alert, constructive, and responsive.</p>
                            </div>
                        </div>

                        {/* Right: Flexible */}
                        <div className="p-6 bg-slate-50/30">
                            <h3 className="font-black text-[#800000] text-sm mb-4 uppercase tracking-tighter">Flexible Teaching and Learning</h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="font-bold text-slate-800 text-[11px] mb-2 italic">Synchronous Sessions:</p>
                                    <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600">
                                        <p>1. Check your device ahead of your scheduled synchronous meeting (camera, microphone, keyboard, speakers, etc.)</p>
                                        <p>2. Attend the synchronous class on time.</p>
                                        <p>3. Be ready to turn on your microphone and camera anytime.</p>
                                        <p>4. Choose a comfortable space to attend the online class.</p>
                                        <p>5. Click the ‘raise hand’ button and wait to be acknowledged by the teacher(s) before unmuting your microphone.</p>
                                        <p>6. Do not abuse the chatbox.</p>
                                        <p>7. Read the assigned materials before attending the class.</p>
                                        <p>8. Be mindful of your classmates and teacher’s time. Be alert, constructive, and responsive.</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-[11px] mb-2 italic">Asynchronous Sessions:</p>
                                    <div className="space-y-1 text-[11px] text-slate-600">
                                        <p>1. Study the sections and functions of the assigned learning management system (LMS) ahead of time.</p>
                                        <p>2. Check the expected submission/turn in schedule at all times. For some timed activities, late submission may cause deductions to your grades. For group activities, discuss the best time and platform to discuss the assignment of tasks with your groupmates.</p>
                                        <p>3. Ask for help from your teacher(s) and classmates when necessary. (Follow the rules on sending an effective email to your teacher. A separate discussion shall be allotted for this.)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM TABLES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                        {/* Left Bottom: Course Requirements */}
                        <div className="p-4 md:p-6 flex flex-col">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                <h3 className="font-black text-[#800000] text-xs md:text-sm uppercase tracking-tight">
                                    Course Requirements
                                </h3>
                                <button 
                                    onClick={() => setRequirements([...requirements, { id: Date.now().toString(), text: '', clo: '' }])} 
                                    className="bg-[#800000] hover:bg-[#600000] text-white px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 uppercase transition-all active:scale-95 w-full sm:w-auto text-[10px] md:text-[11px] cursor-pointer"
                                >
                                    <Plus size={14} className="shrink-0"/> 
                                    Add Row
                                </button>
                            </div>
                            <div className="space-y-4 max-h-125 overflow-y-auto pr-2 scrollbar-thin">
                                {requirements.map((req) => (
                                    <div key={req.id} className="relative p-6 border border-slate-200 rounded-lg bg-slate-50/50">
                                        <button 
                                            onClick={() =>
                                                        setDeleteModal({
                                                            open: true,
                                                            type: 'requirement',
                                                            id: req.id,
                                                        })
                                                    } 
                                            className="absolute top-2 right-2 text-slate-400 hover:text-[#800000] transition-colors"
                                        >
                                            <Trash2 className="cursor-pointer" size={14}/>
                                        </button>
                                        <textarea 
                                            className="w-full p-3 bg-white border border-slate-200 rounded-md text-[11px] resize-none mb-2 focus:ring-1 focus:ring-[#800000] outline-none" 
                                            placeholder="Requirement description..."
                                            rows={2}
                                            value={req.text}
                                            onChange={(e) => setRequirements(requirements.map(r => r.id === req.id ? {...r, text: e.target.value} : r))}
                                        />
                                        <input 
                                            className="w-full p-2 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-[#800000]" 
                                            placeholder="Linked CLOs (e.g. CLOs 1-5)"
                                            value={req.clo}
                                            onChange={(e) => setRequirements(requirements.map(r => r.id === req.id ? {...r, clo: e.target.value} : r))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Bottom: Grading System */}
                        <div className="p-6 bg-slate-50/30 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-[#800000] text-sm uppercase">Grading System</h3>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${totalPercentage === 100 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                                    TOTAL: {totalPercentage}%
                                </div>
                            </div>

                            {totalPercentage !== 100 && (
                                <div className={`mb-3 text-[11px] font-bold flex items-center justify-center gap-2 bg-red-100 rounded-full p-1.5
                                    ${totalPercentage > 100 ? 'text-red-600' : 'text-amber-600'}`}>
                                    
                                    <AlertCircle size={14} />

                                    {totalPercentage > 100 
                                        ? `Total exceeds 100% by ${totalPercentage - 100}%. Reduce some values.` 
                                        : `Total is missing ${100 - totalPercentage}%. Add more percentage.`}
                                </div>
                            )}
                            
                            <div className="space-y-4 max-h-125 overflow-y-auto pr-2 scrollbar-thin">
                                {gradingComponents.map((comp) => (
                                    <div key={comp.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start gap-3 mb-3">
                                            <input 
                                                className="flex-1 font-bold text-slate-800 text-sm border-b border-transparent focus:border-[#800000] outline-none pb-1" 
                                                value={comp.label}
                                                placeholder="Component Name"
                                                onChange={(e) => setGradingComponents(gradingComponents.map(c => c.id === comp.id ? {...c, label: e.target.value} : c))}
                                            />
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                                                    Editable %
                                                </span>

                                                <div className="flex items-center bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 focus-within:border-[#800000] transition-all">
                                                    <input 
                                                        type="number"
                                                        className="w-14 bg-transparent text-right font-black text-base text-[#800000] outline-none"
                                                        value={comp.percentage}
                                                        onChange={(e) => setGradingComponents(gradingComponents.map(c => c.id === comp.id ? {...c, percentage: e.target.value} : c))}
                                                    />
                                                    <span className="ml-1 text-sm font-bold text-[#800000]">%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 ml-4 border-l-2 border-slate-100 pl-4">
                                            {comp.subItems.map((sub) => (
                                                <div key={sub.id} className="flex items-center gap-2">
                                                    <input 
                                                        type="text"
                                                        className="flex-1 p-1.5 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-600 outline-none focus:bg-white"
                                                        value={sub.label}
                                                        placeholder="Activity..."
                                                        onChange={(e) => updateSubItem(comp.id, sub.id, e.target.value)}
                                                    />
                                                    <button onClick={() => removeSubItem(comp.id, sub.id)} className="text-slate-300 hover:text-red-500"><X size={12}/></button>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => addSubItem(comp.id)}
                                                className="text-[9px] font-bold text-[#800000] flex items-center gap-1 uppercase hover:underline"
                                            >
                                                <Plus size={10}/> Add Sub-item
                                            </button>
                                        </div>
                                        
                                        <button 
                                            onClick={() =>
                                                setDeleteModal({
                                                    open: true,
                                                    type: 'component',
                                                    id: comp.id,
                                                })
                                            }
                                            className="mt-3 w-full py-2 text-[9px] cursor-pointer hover:bg-[#800000]/5 hover:rounded-xl text-slate-400 hover:text-red-500 uppercase font-medium flex items-center justify-center gap-1"
                                        >
                                            <Trash2 size={10}/> Remove Component
                                        </button>
                                    </div>
                                ))}

                                <button 
                                    onClick={addGradingComponent}
                                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold text-[10px] hover:border-[#800000] hover:text-[#800000] transition-all flex items-center justify-center gap-2 uppercase"
                                >
                                    <Plus size={14}/> Add New Component
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <DeleteModal
                        open={deleteModal.open}
                        onClose={() =>
                            setDeleteModal({ open: false, type: 'requirement', id: null })
                        }
                        onConfirm={handleConfirmDelete}
                    />
            </main>

            {/* FOOTER */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 sm:p-4 z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className={`hidden sm:flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full border ${totalPercentage === 100 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        <AlertCircle size={14} className={totalPercentage === 100 ? 'text-green-500' : 'text-[#007BFF]'}/> 
                        {totalPercentage === 100 ? 'Grading system balanced (100%)' : `Grading total is currently ${totalPercentage}%`}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                            href="/syllabus-generator/step-3"
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 text-xs sm:text-sm border border-slate-200 transition-all"
                        >
                            <ChevronLeft size={16} /> Back
                        </Link>

                        <Link
                            href="/syllabus-generator/step-5"
                            className={`flex-2 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all ${totalPercentage === 100 ? 'bg-[#800000] text-white hover:bg-[#600000]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                        >
                            Next: Rubrics & Info <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            </footer>
             
            {/* PREVIEW MODAL STEP 4 */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-100 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }} 
                            className="bg-white w-full max-w-[98%] lg:max-w-300 h-[92vh] rounded-xl overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Modal Header Bar */}
                            <div className="bg-[#800000] p-3 md:p-4 flex justify-between items-center text-white shrink-0 shadow-lg">
                                <span className="font-bold flex items-center gap-2 uppercase tracking-wider text-[9px] sm:text-[10px] md:text-xs">
                                    <FileText size={18} className="shrink-0 hidden sm:block"/> 
                                    CLASSROOM POLICIES & EVALUATION PREVIEW
                                </span>
                                <button 
                                    onClick={() => setShowPreview(false)} 
                                    className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
                                >
                                    <X size={20}/>
                                </button>
                            </div>
                            
                            {/* Scrollable Container */}
                            <div className="flex-1 bg-slate-600 overflow-auto p-2 sm:p-4 md:p-8 flex flex-col items-center gap-4 md:gap-8 scrollbar-thin scrollbar-thumb-white/20">
                                
                                {/* PAGINATION */}
                                {[0, 1].map((pageIdx) => (
                                    <div 
                                        key={pageIdx} 
                                        className="bg-white shadow-2xl relative shrink-0 
                                                   lg:w-[297mm] lg:min-h-[210mm] lg:p-[15mm]
                                                   w-full max-w-[297mm] min-h-auto p-4 sm:p-8 md:p-[10mm]
                                                   font-serif text-black flex flex-col justify-between"
                                    >
                                        
                                        <div className="w-full">
                                            {/* OFFICIAL PUP HEADER */}
                                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mb-2 text-center sm:text-left">
                                                <img src="/images/pup_logo.png" alt="PUP Logo" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                                                <div className="flex-1">
                                                    <p className="text-[7pt] md:text-[9pt] leading-tight uppercase">Republic of the Philippines</p>
                                                    <p className="font-bold text-[9pt] md:text-[11pt] leading-tight">POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</p>
                                                    <p className="font-bold text-[8pt] md:text-[10pt] leading-tight uppercase">SANTA ROSA CAMPUS</p>
                                                    <p className="text-[7pt] md:text-[9pt] italic">City of Santa Rosa, Laguna</p>
                                                </div>
                                            </div>
                                            <hr className="border-t-2 border-black mb-4" />

                                            {pageIdx === 0 ? (
                                                /* --- PAGE 1: CLASSROOM POLICIES --- */
                                                <div className="animate-in fade-in duration-500 overflow-x-auto">
                                                    <div className="w-full bg-slate-100 border border-black p-1 text-center font-bold text-[8pt] md:text-[10pt] uppercase mb-0">
                                                        CLASSROOM POLICIES (to be filled out by the assigned faculty)
                                                    </div>
                                                    <table className="w-full border-collapse border border-black text-[7.5pt] md:text-[8pt]">
                                                        <thead>
                                                            <tr className="flex flex-col md:table-row">
                                                                <th className="border border-black p-2 bg-slate-50 uppercase md:w-1/2 font-bold text-center">FACE-TO-FACE DELIVERY</th>
                                                                <th className="border border-black p-2 bg-slate-50 uppercase md:w-1/2 font-bold text-center">FLEXIBLE TEACHING AND LEARNING ACTIVITIES (FLTAs)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="flex flex-col md:table-row align-top text-justify">
                                                                <td className="border border-black p-3 space-y-2">
                                                                    <p className="font-bold text-slate-800 ">General Classroom Guidelines:</p>
                                                                    <p>1. Students shall attend set contact schedule ready with all the materials and outputs required to be read, discussed, and/or submitted. Students should have also read required texts at least once before its scheduled discussion. </p>
                                                                    <p>2. <span className="font-bold underline uppercase">Plagiarism shall not be tolerated.</span> The following penalties will be strictly implemented: First offense – failure in output; Second offense – failure + parent letter; Third offense – failure in course.</p>
                                                                    <p>3. Requirements shall be submitted on time. However, in special cases kapag ang estudyante ay hindi nakapag-submit, deductions of no less than 0.25 per day will apply.</p>
                                                                    <p>4. Students who have any form of disability must inform the course instructor immediately so that alternative arrangements may be immediately considered.</p>
                                                                    <p>5. All students are expected to read and strictly observe the PUP Student Code of Conduct. </p>
                                                                    <p className="text-blue-700 underline break-all mt-2 font-sans text-[7.5pt] md:text-[8pt]">{f2fLink}</p>
                                                                    <p className="font-bold text-slate-800 italic pt-2">Guidelines for face-to-face:</p>
                                                                    <p>1. Strictly observe the minimum health protocols set by the university. </p>
                                                                    <p>2. Check your schedule on the class Facebook page before going to school.</p>
                                                                    <p>3. Be mindful of your classmates and teacher’s time. Be alert, constructive, and responsive.</p>
                                                                </td>
                                                                <td className="border border-black p-3 space-y-4">
                                                                    <div>
                                                                        <p className="font-bold text-slate-800 text-[8pt] md:text-[9pt] mb-2">Synchronous Sessions:</p>
                                                                        <p>1. Check your device ahead of your scheduled synchronous meeting (camera, microphone, keyboard, speakers, etc.)</p>
                                                                        <p>2. Attend the synchronous class on time.</p>
                                                                        <p>3. Be ready to turn on your microphone and camera anytime.</p>
                                                                        <p>4. Choose a comfortable space to attend the online class.</p>
                                                                        <p>5. Click the ‘raise hand’ button and wait to be acknowledged by the teacher(s) before unmuting your microphone.</p>
                                                                        <p>6. Do not abuse the chatbox.</p>
                                                                        <p>7. Read the assigned materials before attending the class.</p>
                                                                        <p>8. Be mindful of your classmates and teacher’s time. Be alert, constructive, and responsive.</p>
                                                                    </div>
                                                                    <div className="pt-2 border-t border-slate-200">
                                                                        <p className="font-bold text-slate-800 text-[8pt] md:text-[9pt] mb-2 ">Asynchronous Sessions:</p>
                                                                        <p>1. Study the sections and functions of the assigned learning management system (LMS) ahead of time.</p>
                                                                        <p>2. Check the expected submission/turn in schedule at all times. For some timed activities, late submission may cause deductions to your grades. For group activities, discuss the best time and platform to discuss the assignment of tasks with your groupmates.</p>
                                                                        <p>3. Ask for help from your teacher(s) and classmates when necessary. (Follow the rules on sending an effective email to your teacher. A separate discussion shall be allotted for this.)</p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                /* --- PAGE 2: REQUIREMENTS & EVALUATION --- */
                                                <div className="animate-in fade-in duration-500">
                                                    <div className="w-full bg-slate-100 border border-black p-1 text-center font-bold text-[8pt] md:text-[10pt] uppercase mb-4">
                                                        COURSE REQUIREMENTS & EVALUATION
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-5 border border-black min-h-[100mm]">
                                                        <div className="col-span-1 md:col-span-3 border-b md:border-b-0 md:border-r border-black p-4">
                                                            <h3 className="font-bold text-[8pt] md:text-[9pt] mb-3 uppercase underline">Course Requirements</h3>
                                                            <ul className="list-disc ml-5 space-y-4 text-[7.5pt] md:text-[8.5pt]">
                                                                {requirements && requirements.map((req, i) => (
                                                                    <li key={i}>
                                                                        <span className="font-bold">{req.text}</span>
                                                                        <span className="ml-2 italic text-slate-500">({req.clo})</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div className="col-span-1 md:col-span-2 p-4">
                                                            <h3 className="font-bold text-[8pt] md:text-[9pt] mb-3 uppercase underline">Grading System</h3>
                                                            <div className="space-y-4">
                                                                {gradingComponents && gradingComponents.map((comp) => (
                                                                    <div key={comp.id} className="flex justify-between items-start text-[7.5pt] md:text-[8.5pt] border-b border-dotted border-slate-300 pb-2">
                                                                        <div>
                                                                            <p className="font-bold">{comp.label}</p>
                                                                            <p className="text-[6.5pt] md:text-[7pt] text-slate-500">{comp.subItems.map(s => s.label).join('')}</p>
                                                                        </div>
                                                                        <p className="font-bold">{comp.percentage}%</p>
                                                                    </div>
                                                                ))}
                                                                <div className="pt-2 flex justify-between font-black text-[9pt] md:text-[10pt] border-t-2 border-black">
                                                                    <span>TOTAL</span>
                                                                    <span>100%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* REUSABLE FOOTER */}
                                        <div className="mt-6 md:mt-auto border-t border-slate-300 pt-4 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-3 text-[6pt] md:text-[7pt]">
                                            <div className="space-y-0.5 text-center sm:text-left italic text-slate-500">
                                                <p>PUP LCA Boulevard, Brgy. Tagapo, City of Santa Rosa, Laguna</p>
                                                <p>Direct Line: 0961-8023780 | Email: starosa@pup.edu.ph</p>
                                                <p className="font-bold text-black not-italic uppercase mt-1">THE COUNTRY'S 1st POLYTECHNIC U</p>
                                            </div>
                                            <div className="flex gap-4 opacity-70 shrink-0">
                                                <img src="/images/iso_logo.png" alt="ISO" className="h-6 md:h-8" />
                                                <img src="/images/ajb_logo.png" alt="AJB" className="h-6 md:h-8" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Step4;
