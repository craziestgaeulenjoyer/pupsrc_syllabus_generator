import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Navbar from '../navbar_layouts/Navbar'; 
import { 
    ChevronLeft, ChevronRight, CheckCircle, FileText, 
    Download, FileJson, ShieldCheck, Info, Check,
    FileDown, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Step6 = ({ allSyllabusData }: { allSyllabusData: any }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [exportFormat, setExportFormat] = useState('pdf');
    const [fileName, setFileName] = useState('INTE_30063_Syllabus');
    const [showSuccess, setShowSuccess] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [finalSyllabusData, setFinalSyllabusData] = useState<any>({});
    const [sessionId, setSessionId] = useState<string | null>(null); 

    const [headerContent, setHeaderContent] = useState('');
    const [footerContent, setFooterContent] = useState('');
    
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
            // SAVE FIRST
            await saveToDatabase();

            // THEN GENERATE PDF
            const response = await axios.post('/syllabus-generator/generate-pdf', {
                ...finalSyllabusData,
                header: headerContent,
                footer: footerContent,
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

    const saveToDatabase = async () => {
        if (!sessionId) return;

        try {
            const step1 = JSON.parse(sessionStorage.getItem(`syllabus_step1_${sessionId}`) || '{}');
            const step2 = JSON.parse(sessionStorage.getItem(`syllabus_step2_${sessionId}`) || '{}');
            const step3 = JSON.parse(sessionStorage.getItem(`syllabus_step3_${sessionId}`) || '{}');
            const step4 = JSON.parse(sessionStorage.getItem(`syllabus_step4_${sessionId}`) || '{}');
            const step5 = JSON.parse(sessionStorage.getItem(`syllabus_step5_${sessionId}`) || '{}');
            const step6 = JSON.parse(sessionStorage.getItem(`syllabus_step6_${sessionId}`) || '{}');

            await axios.post('/syllabus/save', {
                session_id: sessionId,

                course_code: step1.course_code || '',
                course_title: step1.course_title || '',

                step1,
                step2,
                step3,
                step4,
                step5,
                step6,

                final_data: finalSyllabusData
            });

            console.log("Saved to DB");
        } catch (error) {
            console.error("DB Save failed:", error);
        }
    };

    useEffect(() => {
        const id = sessionStorage.getItem('syllabus_session_id');

        if (!id) {
            console.warn("No syllabus_session_id found. Redirecting or fallback may be needed.");
            return;
        }

        setSessionId(id);
    }, []);

    useEffect(() => {
        if (!sessionId) return;

        try {
            const step1 = JSON.parse(sessionStorage.getItem(`syllabus_step1_${sessionId}`) || '{}');
            const step2 = JSON.parse(sessionStorage.getItem(`syllabus_step2_${sessionId}`) || '{}');
            const step3 = JSON.parse(sessionStorage.getItem(`syllabus_step3_${sessionId}`) || '{}');
            const step4 = JSON.parse(sessionStorage.getItem(`syllabus_step4_${sessionId}`) || '{}');
            const step5 = JSON.parse(sessionStorage.getItem(`syllabus_step5_${sessionId}`) || '{}');

            const merged = {
                ...step1,
                ...step2,
                ...step3,
                ...step4,
                ...step5,
                syllabus_session_id: sessionId
            };

            setFinalSyllabusData(merged);

            console.log("Final Aggregated Data:", merged);

        } catch (err) {
            console.error("Failed to load syllabus steps", err);
        }
    }, [sessionId]);

    useEffect(() => {
        const savedHeader = sessionStorage.getItem('syllabus_header');
        const savedFooter = sessionStorage.getItem('syllabus_footer');

        if (savedHeader) setHeaderContent(savedHeader);
        if (savedFooter) setFooterContent(savedFooter);
    }, []);

    useEffect(() => {
        sessionStorage.setItem('syllabus_header', headerContent);
        sessionStorage.setItem('syllabus_footer', footerContent);
    }, [headerContent, footerContent]);

    useEffect(() => {
        if (!sessionId) return;

        sessionStorage.setItem(`syllabus_step6_${sessionId}`, JSON.stringify({
            finalSyllabusData,
            exportFormat,
            fileName
        }));
    }, [finalSyllabusData, exportFormat, fileName, sessionId]);

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

                        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200">
                            <h3 className="font-black text-slate-800 text-sm md:text-base mb-4 flex items-center gap-2">
                                <FileText size={18}/> Header & Footer Editor
                            </h3>

                            <p className="text-[10px] md:text-xs text-slate-500 mb-4">
                                Customize how your syllabus header and footer will appear in the final document (similar to editing in Word).
                            </p>

                            {/* HEADER */}
                            <div className="mb-5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
                                    Header Content
                                </label>
                                <textarea
                                    value={headerContent}
                                    onChange={(e) => setHeaderContent(e.target.value)}
                                    placeholder="e.g. Polytechnic University of the Philippines..."
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#800000] outline-none min-h-[80px]"
                                />
                            </div>

                            {/* FOOTER */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
                                    Footer Content
                                </label>
                                <textarea
                                    value={footerContent}
                                    onChange={(e) => setFooterContent(e.target.value)}
                                    placeholder="e.g. Contact details, copyright..."
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#800000] outline-none min-h-[80px]"
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            <AnimatePresence>
                {showPreview && (() => {
                    // ─── Pull all step data from sessionStorage ───────────────────────
                    const sid = sessionId;
                    const s1 = (() => { try { return JSON.parse(sessionStorage.getItem(`syllabus_step1_${sid}`) || '{}'); } catch { return {}; } })();
                    const s2 = (() => { try { return JSON.parse(sessionStorage.getItem(`syllabus_step2_${sid}`) || '{}'); } catch { return {}; } })();
                    const s3 = (() => { try { return JSON.parse(sessionStorage.getItem(`syllabus_step3_${sid}`) || '{}'); } catch { return {}; } })();
                    const s4 = (() => { try { return JSON.parse(sessionStorage.getItem(`syllabus_step4_${sid}`) || '{}'); } catch { return {}; } })();
                    const s5 = (() => { try { return JSON.parse(sessionStorage.getItem(`syllabus_step5_${sid}`) || '{}'); } catch { return {}; } })();

                    // Step 1
                    const courseCode        = s1.course_code || '---';
                    const courseTitle       = s1.course_title || '---';
                    const courseCredit      = s1.course_credit ?? '---';
                    const courseDescription = s1.course_description || '';
                    const preRequisites     = s1.pre_requisites || 'None';
                    const coRequisites      = s1.co_requisites || 'None';

                    // Step 2
                    const plos       = s2.plos       || [];
                    const clos       = s2.clos       || [];
                    const iloMapping = s2.iloMapping || {};
                    const ploMapping = s2.ploMapping || {};
                    const iloCount   = 9;

                    // Step 3
                    const obtlData       = s3.obtlData       || [];
                    const references     = (s3.references     || []).filter((r: any) => r.text?.trim());
                    const otherRefs      = (s3.otherReferences || []).filter((r: any) => r.text?.trim());

                    // Step 4
                    const gradingComponents = s4.gradingComponents || [];
                    const requirements      = s4.requirements      || [];
                    const f2fLink           = s4.f2fLink            || '';

                    // Step 5
                    const classInfo    = s5.classInfo    || {};
                    const facultyInfo  = s5.facultyInfo  || {};
                    const rubrics      = s5.rubrics      || [];
                    const groupCriteria= s5.groupCriteria|| [];
                    const signatories  = s5.signatories  || [];

                    // ─── OBTL pagination (7 rows per page, same as Step3) ────────────
                    const ROWS_PER_PAGE = 7;
                    const paginatedObtl: any[][] = [];
                    for (let i = 0; i < obtlData.length; i += ROWS_PER_PAGE) {
                        paginatedObtl.push(obtlData.slice(i, i + ROWS_PER_PAGE));
                    }
                    if (paginatedObtl.length === 0) paginatedObtl.push([]);

                    // ─── Rubric pagination (5 rows per page) ─────────────────────────
                    const RUBRIC_PER_PAGE = 5;
                    const paginatedRubrics: any[][] = [];
                    for (let i = 0; i < rubrics.length; i += RUBRIC_PER_PAGE) {
                        paginatedRubrics.push(rubrics.slice(i, i + RUBRIC_PER_PAGE));
                    }
                    if (paginatedRubrics.length === 0) paginatedRubrics.push([]);

                    // ─── Shared sub-components ───────────────────────────────────────
                    const PupHeader = () => (
                        <div className="flex items-start justify-start gap-4 mb-6 border-b-2 border-black pb-4">
                            <img src="/images/pup_logo.png" alt="PUP Logo" className="w-20 h-20 object-contain" />
                            <div className="text-left">
                                <p className="text-[10px] uppercase">Republic of the Philippines</p>
                                <p className="font-bold text-[16px]">POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</p>
                                <p className="font-bold text-[14px]">SANTA ROSA CAMPUS</p>
                                <p className="italic text-[10px]">City of Santa Rosa, Laguna</p>
                            </div>
                        </div>
                    );

                    const PupFooter = () => (
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
                    );

                    const pageBase = "preview-container shadow-2xl font-serif text-black relative bg-white mb-8";

                    return (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4"
                        >
                            <style dangerouslySetInnerHTML={{ __html: `
                                .preview-container {
                                    width: 100%;
                                    max-width: 297mm;
                                    min-width: 800px;
                                    margin: 0 auto;
                                    background: white;
                                    padding: 1.5rem;
                                }
                                .syllabus-table {
                                    width: 100%;
                                    border-collapse: collapse;
                                    table-layout: fixed;
                                    word-wrap: break-word;
                                }
                                .syllabus-table td, .syllabus-table th {
                                    border: 1px solid black;
                                    padding: 8px;
                                    vertical-align: top;
                                    overflow: hidden;
                                }
                                .label-cell {
                                    background-color: #fcfcfc;
                                    font-weight: bold;
                                    width: 15%;
                                    text-align: center;
                                    font-size: 10px;
                                    text-transform: uppercase;
                                }
                                .value-cell { font-size: 11px; }
                                .header-yellow {
                                    background-color: #FFF9C4;
                                    border: 1px solid black;
                                    font-weight: bold;
                                    text-align: center;
                                    text-transform: uppercase;
                                    padding: 10px;
                                }
                                @media (max-width: 640px) {
                                    .preview-container {
                                        transform: scale(0.4);
                                        transform-origin: top left;
                                        width: 250%;
                                    }
                                }
                            `}} />

                            <motion.div
                                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                                className="bg-white w-full max-w-[98%] md:max-w-[95%] h-[95vh] md:h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                            >
                                {/* Modal top bar */}
                                <div className="bg-[#800000] p-3 md:p-4 flex justify-between items-center text-white shrink-0">
                                    <span className="font-bold flex items-center gap-2 text-xs md:text-base">
                                        <FileText size={20}/> FULL SYLLABUS PREVIEW (ALL STEPS)
                                    </span>
                                    <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-white/10 rounded-lg">
                                        <X size={24}/>
                                    </button>
                                </div>

                                {/* Scrollable pages */}
                                <div className="flex-1 overflow-auto p-4 md:p-12 bg-slate-400">

                                    {/* ══════════════════════════════════════════════
                                        PAGE 1 — STEP 1: Course Overview & Description
                                        (mirrors Step1.tsx preview exactly)
                                    ══════════════════════════════════════════════ */}
                                    <div className={pageBase}>
                                        <PupHeader />
                                        <div className="header-yellow mb-0">
                                            Bachelor of Science in Information Technology <br/>
                                            Outcomes-Based Course Syllabus
                                        </div>
                                        <table className="syllabus-table" style={{tableLayout:'fixed'}}>
                                            <colgroup>
                                                <col style={{width:'15%'}} />
                                                <col style={{width:'15%'}} />
                                                <col style={{width:'12%'}} />
                                                <col style={{width:'38%'}} />
                                                <col style={{width:'12%'}} />
                                                <col style={{width:'8%'}} />
                                            </colgroup>
                                            <tbody>
                                                <tr>
                                                    <td className="label-cell">Course Code</td>
                                                    <td className="value-cell font-bold">{courseCode}</td>
                                                    <td className="label-cell">Course Title</td>
                                                    <td className="value-cell font-bold">{courseTitle}</td>
                                                    <td className="label-cell">Course Credit</td>
                                                    <td className="value-cell text-center">{courseCredit}</td>
                                                </tr>
                                                <tr>
                                                    <td colSpan={6} className="value-cell text-justify leading-relaxed py-4">
                                                        <span className="font-bold uppercase block mb-1">Course Description</span>
                                                        <div className="italic break-words"
                                                            dangerouslySetInnerHTML={{ __html: courseDescription || 'No description provided.' }}
                                                        />
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell">Pre-Requisites</td>
                                                    <td colSpan={2} className="value-cell">{preRequisites}</td>
                                                    <td className="label-cell">Co-Requisites</td>
                                                    <td colSpan={2} className="value-cell">{coRequisites}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <table className="syllabus-table -mt-px" style={{tableLayout:'fixed'}}>
                                            <colgroup>
                                                <col style={{width:'15%'}} />
                                                <col style={{width:'85%'}} />
                                            </colgroup>
                                            <tbody>
                                                <tr>
                                                    <td className="label-cell">VISION</td>
                                                    <td className="value-cell font-bold text-center">
                                                        PUP: The National Polytechnic University <br/>
                                                        (PUP: Pambansang Politeknikong Unibersidad)
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell">MISSION</td>
                                                    <td className="value-cell text-justify">
                                                        Ensuring inclusive and equitable quality education and promoting lifelong learning opportunities through a re-engineered polytechnic university by committing to:
                                                        <ul className="list-disc ml-5 mt-1">
                                                            <li>provide democratized access to educational opportunities for the holistic development of individuals with global perspective</li>
                                                            <li>offer industry-oriented curricula that produce highly skilled professionals...</li>
                                                            <li>embed a culture of research and innovation</li>
                                                        </ul>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell">QUALITY STATEMENT POLICY</td>
                                                    <td className="value-cell text-justify">
                                                        The Polytechnic University of the Philippines commits to provide inclusive and equitable quality education and promote lifelong learning opportunities... Toward this end, we, the members of the PUP Community, will vigorously and steadfastly endeavor to continuously improve the standard of university services...
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell">INSTITUTIONAL LEARNING OUTCOMES (ILO)</td>
                                                    <td className="value-cell">
                                                        <ol className="list-decimal ml-5">
                                                            <li><strong>Creative and Critical Thinking</strong> - Graduates use their imaginative as well as rational thinking abilities...</li>
                                                            <li><strong>Effective Communication</strong> - Graduates are proficient in the four macro skills in communication...</li>
                                                            <li><strong>Strong Service Orientation</strong> - Graduates exemplify the potentialities of an efficient, well-rounded and responsible professional...</li>
                                                        </ol>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <PupFooter />
                                    </div>

                                    {/* ══════════════════════════════════════════════
                                        PAGE 2 — STEP 2: PLO/CLO Mapping Matrix
                                        (mirrors Step2.tsx preview exactly)
                                    ══════════════════════════════════════════════ */}
                                    <div className={pageBase}>
                                        <PupHeader />
                                        <div className="header-yellow mb-4">
                                            Bachelor of Science in Information Technology <br/>
                                            Outcomes-Based Course Syllabus
                                        </div>

                                        {/* PLO → ILO table */}
                                        <div className="flex w-full border border-black mb-0">
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
                                                        {plos.map((plo: any) => (
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

                                        {/* CLO → PLO table */}
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
                                                            {plos.map((_: any, i: number) => (
                                                                <th key={i} className="border-r border-black last:border-0 w-8">{i + 1}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {clos.map((clo: any) => (
                                                            <tr key={clo.id} className="border-b border-black last:border-0">
                                                                <td className="p-1 border-r border-black">{clo.text}</td>
                                                                {plos.map((plo: any) => (
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
                                        <PupFooter />
                                    </div>

                                    {/* ══════════════════════════════════════════════
                                        PAGES 3+ — STEP 3: OBTL Weekly Plan (paginated)
                                        (mirrors Step3.tsx preview exactly)
                                    ══════════════════════════════════════════════ */}
                                    {paginatedObtl.map((pageRows, pageIdx) => (
                                        <div key={pageIdx} className={pageBase}>
                                            <PupHeader />
                                            <div className="header-yellow mb-4">
                                                Bachelor of Science in Information Technology <br/>
                                                Outcomes-Based Course Syllabus
                                            </div>
                                            <div className="w-full border border-black">
                                                <table className="w-full border-collapse text-[8pt]" style={{tableLayout:'fixed'}}>
                                                    <colgroup>
                                                        <col style={{width:'6%'}} />
                                                        <col style={{width:'18%'}} />
                                                        <col style={{width:'10%'}} />
                                                        <col style={{width:'15%'}} />
                                                        <col style={{width:'13%'}} />
                                                        <col style={{width:'13%'}} />
                                                        <col style={{width:'13%'}} />
                                                        <col style={{width:'12%'}} />
                                                    </colgroup>
                                                    {pageIdx === 0 && (
                                                        <thead>
                                                            <tr className="border-b border-black bg-slate-50">
                                                                <th className="p-2 border-r border-black font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Weeks (18 Weeks)</th>
                                                                <th className="p-2 border-r border-black font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Learning Outcomes (DLOs)</th>
                                                                <th className="p-2 border-r border-black font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Alignment to (CLOs)</th>
                                                                <th className="p-2 border-r border-black font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Learning Content/Topics</th>
                                                                <th className="p-1 border-b border-r border-black font-bold text-center bg-[#ffe8e8]" colSpan={3}>Instructional Delivery Design</th>
                                                                <th className="p-2 border-l border-black font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Assessment Tasks (TAs)</th>
                                                            </tr>
                                                            <tr className="border-b border-black bg-slate-50">
                                                                <th className="p-1 border-r border-black font-bold text-center bg-[#e8f4ff]" rowSpan={2}>Face-to-Face</th>
                                                                <th className="p-0.5 border-b border-r border-black font-bold text-center bg-[#e8f4ff]" colSpan={2}>Flexible Learning and Teaching Activities (FLTAs)</th>
                                                            </tr>
                                                            <tr className="border-b border-black bg-slate-50">
                                                                <th className="p-1 border-r border-black font-bold text-center text-[7pt] bg-[#e8f4ff]">Synchronous</th>
                                                                <th className="p-1 border-r border-black font-bold text-center text-[7pt] bg-[#e8f4ff]">Asynchronous</th>
                                                            </tr>
                                                        </thead>
                                                    )}
                                                    <tbody className="divide-y divide-slate-100 align-top">
                                                        {pageRows.map((row: any) => (
                                                            <tr key={row.id} className="border-b border-black last:border-0 align-top">
                                                                {row.type === 'regular' ? (
                                                                    <>
                                                                        <td className="p-2 border-r border-black text-center font-bold">{row.weeks}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.dlo}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.clo}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.topics}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.deliveryFace}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.deliverySync}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.deliveryAsync}</td>
                                                                        <td className="p-2 whitespace-pre-wrap">{row.tasks}</td>
                                                                    </>
                                                                ) : (
                                                                    <td colSpan={8} className="p-3 bg-amber-50 text-center font-bold text-[9pt] border-b border-black">
                                                                        {row.topics}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* References — only on the last OBTL page */}
                                            {pageIdx === paginatedObtl.length - 1 && (
                                                <div className="w-full mt-3 text-[8pt]">
                                                    <table className="w-full border border-black border-collapse">
                                                        <tbody>
                                                            <tr>
                                                                <td className="p-2 font-bold uppercase">
                                                                    REFERENCES FROM THE NINOY AQUINO LEARNING AND LIBRARY RESOURCES CENTER (NALLRC)<br/>
                                                                    OUTCOMES-BASED BOOK LISTINGS (CBBL)
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td className="p-2">
                                                                    {references.length > 0
                                                                        ? references.map((ref: any) => <p key={ref.id} className="mb-1">{ref.text}</p>)
                                                                        : <p className="italic text-slate-400">No references added.</p>}
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td className="p-2 font-bold uppercase">OTHER REFERENCES</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="p-2">
                                                                    {otherRefs.length > 0
                                                                        ? otherRefs.map((ref: any) => <p key={ref.id} className="mb-1">{ref.text}</p>)
                                                                        : <p className="italic text-slate-400">No other references added.</p>}
                                                                </td>
                                                            </tr>
                                                            <tr><td className="p-3 min-h-[40px]">&nbsp;</td></tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            <PupFooter />
                                        </div>
                                    ))}

                                    {/* ══════════════════════════════════════════════
                                        STEP 4 PAGES — Classroom Policies & Grading
                                        (mirrors Step4.tsx preview pages exactly)
                                    ══════════════════════════════════════════════ */}

                                    {/* Step4 Page 1: Classroom Policies */}
                                    <div className={pageBase}>
                                        <PupHeader />
                                        <div className="header-yellow mb-4">
                                            Bachelor of Science in Information Technology <br/>
                                            Outcomes-Based Course Syllabus
                                        </div>
                                        <div className="w-full bg-slate-100 border border-black p-1 text-center font-bold text-[10pt] uppercase mb-0">
                                            CLASSROOM POLICIES (to be filled out by the assigned faculty)
                                        </div>
                                        <table className="w-full border-collapse border border-black text-[8pt]">
                                            <thead>
                                                <tr>
                                                    <th className="border border-black p-2 bg-slate-50 uppercase w-1/2 font-bold text-center">FACE-TO-FACE DELIVERY</th>
                                                    <th className="border border-black p-2 bg-slate-50 uppercase w-1/2 font-bold text-center">FLEXIBLE TEACHING AND LEARNING ACTIVITIES (FLTAs)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="align-top text-justify">
                                                    <td className="border border-black p-3 space-y-2">
                                                        <p className="font-bold text-slate-800">General Classroom Guidelines:</p>
                                                        <p>1. Students shall attend set contact schedule ready with all the materials and outputs required to be read, discussed, and/or submitted.</p>
                                                        <p>2. <span className="font-bold underline uppercase">Plagiarism shall not be tolerated.</span> First offense – failure in output; Second offense – failure + parent letter; Third offense – failure in course.</p>
                                                        <p>3. Requirements shall be submitted on time. Late submissions will have deductions of no less than 0.25 per day.</p>
                                                        <p>4. Students who have any form of disability must inform the course instructor immediately.</p>
                                                        <p>5. All students are expected to read and strictly observe the PUP Student Code of Conduct.</p>
                                                        {f2fLink && <p className="text-blue-700 underline break-all mt-2 text-[7.5pt]">{f2fLink}</p>}
                                                        <p className="font-bold text-slate-800 italic pt-2">Guidelines for face-to-face:</p>
                                                        <p>1. Strictly observe the minimum health protocols set by the university.</p>
                                                        <p>2. Check your schedule on the class Facebook page before going to school.</p>
                                                        <p>3. Be mindful of your classmates and teacher's time. Be alert, constructive, and responsive.</p>
                                                    </td>
                                                    <td className="border border-black p-3 space-y-4">
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-[9pt] mb-2">Synchronous Sessions:</p>
                                                            <p>1. Check your device ahead of your scheduled synchronous meeting.</p>
                                                            <p>2. Attend the synchronous class on time.</p>
                                                            <p>3. Be ready to turn on your microphone and camera anytime.</p>
                                                            <p>4. Choose a comfortable space to attend the online class.</p>
                                                            <p>5. Click the 'raise hand' button and wait to be acknowledged before unmuting.</p>
                                                            <p>6. Do not abuse the chatbox.</p>
                                                            <p>7. Read the assigned materials before attending the class.</p>
                                                            <p>8. Be mindful of your classmates and teacher's time.</p>
                                                        </div>
                                                        <div className="pt-2 border-t border-slate-200">
                                                            <p className="font-bold text-slate-800 text-[9pt] mb-2">Asynchronous Sessions:</p>
                                                            <p>1. Study the sections and functions of the assigned LMS ahead of time.</p>
                                                            <p>2. Check the expected submission schedule at all times.</p>
                                                            <p>3. Ask for help from your teacher(s) and classmates when necessary.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <PupFooter />
                                    </div>

                                    {/* Step4 Page 2: Requirements & Grading */}
                                    <div className={pageBase}>
                                        <PupHeader />
                                        <div className="header-yellow mb-4">
                                            Bachelor of Science in Information Technology <br/>
                                            Outcomes-Based Course Syllabus
                                        </div>
                                        <div className="w-full bg-slate-100 border border-black p-1 text-center font-bold text-[10pt] uppercase mb-4">
                                            COURSE REQUIREMENTS & EVALUATION
                                        </div>
                                        <div className="grid grid-cols-5 border border-black min-h-[100mm]">
                                            <div className="col-span-3 border-r border-black p-4">
                                                <h3 className="font-bold text-[9pt] mb-3 uppercase underline">Course Requirements</h3>
                                                <ul className="list-disc ml-5 space-y-4 text-[8.5pt]">
                                                    {requirements.map((req: any, i: number) => (
                                                        <li key={i}>
                                                            <span className="font-bold">{req.text}</span>
                                                            {req.clo && <span className="ml-2 italic text-slate-500">({req.clo})</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="col-span-2 p-4">
                                                <h3 className="font-bold text-[9pt] mb-3 uppercase underline">Grading System</h3>
                                                <div className="space-y-4">
                                                    {gradingComponents.map((comp: any) => (
                                                        <div key={comp.id} className="flex justify-between items-start text-[8.5pt] border-b border-dotted border-slate-300 pb-2">
                                                            <div>
                                                                <p className="font-bold">{comp.label}</p>
                                                                <p className="text-[7pt] text-slate-500">{comp.subItems?.map((s: any) => s.label).join(', ')}</p>
                                                            </div>
                                                            <p className="font-bold">{comp.percentage}%</p>
                                                        </div>
                                                    ))}
                                                    <div className="pt-2 flex justify-between font-black text-[10pt] border-t-2 border-black">
                                                        <span>TOTAL</span><span>100%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <PupFooter />
                                    </div>

                                    {/* ══════════════════════════════════════════════
                                        STEP 5 PAGES — Rubrics, Group Grade, Signatories
                                        (mirrors Step5.tsx preview exactly)
                                    ══════════════════════════════════════════════ */}
                                    {paginatedRubrics.map((pageRubrics: any[], pageIdx: number) => (
                                        <div key={pageIdx} className={pageBase}>
                                            <PupHeader />
                                            <div className="header-yellow mb-4">
                                                Bachelor of Science in Information Technology <br/>
                                                Outcomes-Based Course Syllabus
                                            </div>
                                            <div className="text-[8pt]">
                                                <p className="font-bold mb-1">
                                                    {pageIdx === 0 ? 'Part 1. ' : ''}Rubrics for Assessment (to be filled out by the assigned faculty)
                                                </p>
                                                <table className="w-full border border-black border-collapse mt-1">
                                                    <thead>
                                                        <tr>
                                                            <th rowSpan={2} className="border w-[20%] p-1">Skills</th>
                                                            <th className="border text-center p-1">4</th>
                                                            <th className="border text-center p-1">3</th>
                                                            <th className="border text-center p-1">2</th>
                                                            <th className="border text-center p-1">1</th>
                                                        </tr>
                                                        <tr>
                                                            <th className="border p-1">Advanced</th>
                                                            <th className="border p-1">Competent</th>
                                                            <th className="border p-1">Progressing</th>
                                                            <th className="border p-1">Beginning</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {pageRubrics.map((r: any) => (
                                                            <tr key={r.id}>
                                                                <td className="border font-bold p-1">{r.skills}</td>
                                                                <td className="border p-1">{r.v4}</td>
                                                                <td className="border p-1">{r.v3}</td>
                                                                <td className="border p-1">{r.v2}</td>
                                                                <td className="border p-1">{r.v1}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                {/* Group Grade, Class/Faculty Info, Signatories — only on first rubric page */}
                                                {pageIdx === 0 && (
                                                    <>
                                                        <p className="mt-2 font-bold">Part 2. Group grade</p>
                                                        <table className="w-full border border-black border-collapse">
                                                            <thead>
                                                                <tr>
                                                                    <th className="border p-1">Criteria</th>
                                                                    <th className="border text-center p-1">1</th>
                                                                    <th className="border text-center p-1">2</th>
                                                                    <th className="border text-center p-1">3</th>
                                                                    <th className="border text-center p-1">4</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {groupCriteria.map((g: any, i: number) => (
                                                                    <tr key={g.id}>
                                                                        <td className="border p-1">{i + 1}. {g.label} ({g.weight}%)</td>
                                                                        {[1,2,3,4].map(n => (
                                                                            <td key={n} className="border text-center p-1">{g.score === n ? '✔' : ''}</td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>

                                                        <table className="w-full border border-black border-collapse mt-2">
                                                            <thead>
                                                                <tr>
                                                                    <th className="border p-1">CLASS INFORMATION</th>
                                                                    <th className="border p-1">FACULTY INFORMATION</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td className="border p-2 text-[7.5pt]">
                                                                        Section: {classInfo.section}<br/>
                                                                        Time: {classInfo.time}<br/>
                                                                        Room: {classInfo.room}<br/>
                                                                        Semester: {classInfo.semester}
                                                                    </td>
                                                                    <td className="border p-2 text-[7.5pt]">
                                                                        Name of Faculty: {facultyInfo.name}<br/>
                                                                        Consultation Time: {facultyInfo.consultation}<br/>
                                                                        Office Tel. No./ Mobile Phone No.: {facultyInfo.contact}<br/>
                                                                        Institutional Email: {facultyInfo.email}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>

                                                        <table className="w-full border border-black border-collapse mt-2 text-center">
                                                            <tbody>
                                                                <tr>
                                                                    {signatories.map((s: any) => (
                                                                        <td key={s.id} className="border h-24 align-bottom p-2">
                                                                            {s.signature && <img src={s.signature} className="h-10 mx-auto" alt="signature"/>}
                                                                            <br/>
                                                                            <span className="font-bold uppercase text-[8pt]">{s.name || '______________________'}</span><br/>
                                                                            <span className="text-[7pt]">{s.title}</span><br/>
                                                                            <span className="text-[7pt] italic">{s.role}</span>
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </>
                                                )}
                                            </div>
                                            <PupFooter />
                                        </div>
                                    ))}

                                </div>{/* end scrollable pages */}
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

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