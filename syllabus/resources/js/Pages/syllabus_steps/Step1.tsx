import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronRight, BookOpen, ScrollText, CheckCircle2, 
    ListChecks, GraduationCap, Save, ChevronUp, FileDown,
    ChevronDown, X, FileText, Info, AlertTriangle
} from 'lucide-react';
import Navbar from '../navbar_layouts/Navbar'; 

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { route } from 'ziggy-js';
import PageSpacer from '../pagespacer_layout/PageSpacer';
import { router } from '@inertiajs/react';
import { validateStep1 } from '../Validation/SyllabusValidation';
import Alert from '../Validation/Alert';
import DOMPurify from 'dompurify';

const Step1 = () => {
    const [showPreview, setShowPreview] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showSaveToast, setShowSaveToast] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'error' | 'success'>('error');

    const modules = {
        toolbar: [
            [{ 'font': [] }],
            ['bold', 'italic', 'underline'],
            [{ 'color': [] }],
            [{ 'align': [] }], 
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
        ],
    };

    const handleSaveDescription = () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const handleCreditChange = (type: string) => {
        const current = typeof data.course_credit === 'number' ? data.course_credit : 0;
        if (type === 'up' && current < 10) setData('course_credit', current + 1);
        if (type === 'down' && current > 0) setData('course_credit', current - 1);
    };

    const getSessionId = () => {
        let sessionId = sessionStorage.getItem('syllabus_session_id');

        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem('syllabus_session_id', sessionId);
        }

        return sessionId;
    };

    const storageKey = `syllabus_step1_${getSessionId()}`;

    const savedData = localStorage.getItem(storageKey);

    const { data, setData, post, processing, errors } = useForm (
        savedData
            ? JSON.parse(savedData)
            : {
                course_code: '',
                course_credit: 3,
                course_title: '',
                pre_requisites: '',
                co_requisites: '',  
                course_description: '',
            }
    );

    useEffect(() => {
        const hasEmptyFields =
            !data.course_code ||
            !data.course_title ||
            !data.course_description;

        const validationErrors = validateStep1(data);

        // If ANY issue → ALWAYS hide success
        if (hasEmptyFields || Object.keys(validationErrors).length > 0) {
            setAlertMessage(null);
            return;
        }

        // success message 
        const timer = setTimeout(() => {
            setAlertMessage("All fields are complete.");
            setAlertType("success");
        }, 300);

        return () => clearTimeout(timer);
    }, [data.course_code, data.course_title, data.course_description]);

    const handlePreviewOpen = () => {
    const validationErrors = validateStep1(data);

        if (Object.keys(validationErrors).length > 0) {
            setLocalErrors(validationErrors);

            setAlertMessage("Please complete all required fields before preview.");
            setAlertType("error");

            setTimeout(() => {
                setAlertMessage(null);
                setLocalErrors({});
            }, 3000);

            return;
        }

        // If valid → open preview
        setShowPreview(true);
    };

    const handleCancel = () => {
        setShowCancelModal(true);
    };

    const confirmCancel = () => {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem('syllabus_session_id');

        router.visit(route('dashboard'));
    };

    const closeCancelModal = () => {
        setShowCancelModal(false);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = validateStep1(data);

        if (Object.keys(validationErrors).length > 0) {
            setLocalErrors(validationErrors);
            setAlertMessage("Please complete all required fields.");
            setAlertType("error");
            return;
        }

        // ensure latest data saved
        localStorage.setItem(storageKey, JSON.stringify(data));

        router.visit(route('syllabus.step2'));
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            localStorage.setItem(storageKey, JSON.stringify(data));

            // show toast
            setShowSaveToast(true);

            // hide after 2s
            setTimeout(() => setShowSaveToast(false), 2000);

        }, 800); 

        return () => clearTimeout(timeout);
    }, [data]);

    return (
        <div className="min-h-screen bg-[#F3F4F6] font-poppins selection:bg-[#800000]/20 pb-32">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                .ql-toolbar.ql-snow { border: none !important; background-color: #F8FAFC !important; border-bottom: 1px solid #E2E8F0 !important; }
                .ql-container.ql-snow { border: none !important; height: 180px; font-family: 'Poppins', sans-serif !important; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                
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
                        width: 250%; /* Compensation for scale */
                    }
                }
            `}} />
            
            <Navbar />
            <Head title="Step 1: Course Overview - PUP SyllabiSys" />

            <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-[#800000] font-bold text-[10px] md:text-sm uppercase tracking-widest mb-1">Module: Academic Development</h2>
                        <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">
                            Step 1 of 6: <span className="text-slate-600 font-bold">Course Overview & Description</span>
                        </h1>
                    </div>
                    <button 
                        type="button"
                        onClick={handlePreviewOpen}
                        className="bg-[#800000] text-white px-4 md:px-6 py-3 rounded-xl font-bold text-xs md:text-sm shadow-xl cursor-pointer hover:shadow-2xl hover:bg-[#600000] transition-all flex items-center justify-center gap-2 w-full md:w-fit active:scale-95"
                    >
                        <FileDown size={18} />
                        View Live PDF Preview
                    </button>
                </div>

                <hr className="border-t-2 border-slate-300 mb-6" />

                <div className="bg-white border-l-4 border-[#800000] p-4 rounded-r-xl shadow-sm mb-8 flex items-start gap-3">
                    <Info className="text-[#800000] mt-0.5 shrink-0" size={20} />
                    <p className="text-xs md:text-sm text-slate-600 font-medium">
                        <span className="font-bold text-slate-900">Instructions:</span> Fill out all fields for the Course Overview. Ensure the description matches the course contents. Fields marked Read-Only cannot be changed. All fields are required to continue.
                    </p>
                </div>
                {alertMessage && alertType === 'error' && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm mb-6 flex items-start gap-3">
                        <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={20} />
                        <p className="text-xs md:text-sm text-red-700 font-medium">
                            <span className="font-bold">Course Overview & Description Error:</span> {alertMessage}
                        </p>
                    </div>
                )}
                <form id="step1-form" onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mb-10">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white p-5 md:p-7 rounded-3xl shadow-sm border border-slate-200 space-y-5">
                            <h3 className="text-slate-900 font-extrabold text-lg border-b pb-3">Course Basics</h3>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] md:text-[12px] font-bold text-slate-500 uppercase ml-1">Course Code:</label>
                                       <input
                                            type="text"
                                            value={data.course_code}
                                            onChange={e => setData('course_code', e.target.value)}
                                            className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none
                                            ${localErrors.course_code ? 'border-red-500' : 'border-slate-200'}`}
                                            placeholder="e.g., COMP 001"
                                        />
                                            {localErrors.course_code && (
                                                <p className="text-red-500 text-xs mt-1">
                                                    {localErrors.course_code}
                                                </p>
                                            )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] md:text-[12px] font-bold text-slate-500 uppercase ml-1">Course Credit:</label>
                                        <div className="relative group">
                                            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm flex items-center">
                                                {data.course_credit} Units
                                            </div>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col text-slate-400">
                                                <button type="button" onClick={() => handleCreditChange('up')}><ChevronUp size={14} className="hover:text-[#800000]" /></button>
                                                <button type="button" onClick={() => handleCreditChange('down')}><ChevronDown size={14} className="hover:text-[#800000]" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] md:text-[12px] font-bold text-slate-500 uppercase ml-1">Course Title:</label>
                                    <input type="text" value={data.course_title} onChange={e => setData('course_title', e.target.value)}
                                        className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none
                                                    ${localErrors.course_title ? 'border-red-500' : 'border-slate-200'}`}
                                                    placeholder="e.g., Intro to Computing"/>
                                            {localErrors.course_title && (
                                                <p className="text-red-500 text-xs mt-1">
                                                    {localErrors.course_title}
                                                </p>
                                            )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] md:text-[12px] font-bold text-slate-500 uppercase ml-1">Pre-requisites:</label>
                                        <input type="text" value={data.pre_requisites} onChange={e => setData('pre_requisites', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#800000]" placeholder="e.g. None"/>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] md:text-[12px] font-bold text-slate-500 uppercase ml-1">Co-requisites:</label>
                                        <input type="text" value={data.co_requisites} onChange={e => setData('co_requisites', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#800000]" placeholder="e.g. COMP 002"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 md:p-7 rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-87.5">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 mb-5 gap-2">
                                <h3 className="text-slate-900 font-extrabold text-lg">Course Description</h3>
                                {/* <button type="button" onClick={handleSaveDescription} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isSaved ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600 hover:bg-[#800000] hover:text-white'}`}>
                                    <Save size={14} /> {isSaved ? 'Saved!' : 'Save Progress'}
                                </button> */}
                            </div>
                            <div className="flex-1">
                                <div
                                    className={`border rounded-2xl overflow-hidden bg-slate-50 h-full
                                    ${localErrors.course_description ? 'border-red-500' : 'border-slate-200'}`}
                                >
                                    <ReactQuill
                                        theme="snow"
                                        value={data.course_description}
                                        onChange={(val) => setData('course_description', val)}
                                        modules={modules}
                                        placeholder="Enter course description..."
                                    />
                                </div>

                                {localErrors.course_description && (
                                    <p className="text-red-500 text-xs mt-2 pl-1">
                                        {localErrors.course_description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-5 md:p-7 rounded-3xl shadow-sm border border-slate-200">
                            <h3 className="font-extrabold text-lg border-b pb-3 mb-6 flex items-center gap-2 text-[#800000]">
                                Institutional Context
                            </h3>
                            <div className="space-y-3">
                                {['PUP Vision & Mission', 'Quality Policy Statement', 'Institutional Learning Outcomes (ILO)', 'Campus Goals'].map((title, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <ScrollText size={16} className="text-[#800000]" />
                                            <span className="text-[10px] md:text-xs font-bold text-slate-700">{title}</span>
                                        </div>
                                        <CheckCircle2 size={14} className="text-green-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <AnimatePresence>
                {showPreview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-100 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white w-full max-w-[98%] md:max-w-[95%] h-[95vh] md:h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                            <div className="bg-[#800000] p-3 md:p-4 flex justify-between items-center text-white shrink-0">
                                <span className="font-bold flex items-center gap-2 text-xs md:text-base"><FileText size={20}/> COURSE INFO SYLLABUS PREVIEW </span>
                                <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-white/10 rounded-lg"><X size={24}/></button>
                            </div>

                            <div className="flex-1 overflow-auto p-4 md:p-12 bg-slate-400 scrollbar-hide">
                                <div className="preview-container shadow-2xl font-serif text-black relative">
                                    
                                    {/* PUP Header Section  */}
                                    <div className="flex items-start justify-start gap-4 mb-6 border-b-2 border-black pb-4">
                                        <img src="/images/pup_logo.png" alt="PUP Logo" className="w-20 h-20 object-contain" />
                                        <div className="text-left">
                                            <p className="text-[10px] uppercase">Republic of the Philippines</p>
                                            <p className="font-bold text-[16px]">POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</p>
                                            <p className="font-bold text-[14px]">SANTA ROSA CAMPUS</p>
                                            <p className="italic text-[10px]">City of Santa Rosa, Laguna</p>
                                        </div>
                                    </div>

                                    {/* Title Section */}
                                    <div className="header-yellow mb-0">
                                        Bachelor of Science in Information Technology <br/>
                                        Outcomes-Based Course Syllabus
                                    </div>

                                    {/* Technical Details Table */}
                                    <table className="syllabus-table">
                                        <tbody>
                                            <tr>
                                                <td className="label-cell">Course Code</td>
                                                <td className="value-cell font-bold" style={{width: '15%'}}>{data.course_code || '---'}</td>
                                                <td className="label-cell">Course Title</td>
                                                <td className="value-cell font-bold" style={{width: '40%'}}>{data.course_title || '---'}</td>
                                                <td className="label-cell">Course Credit</td>
                                                <td className="value-cell text-center" style={{width: '10%'}}>{data.course_credit}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan={6} className="value-cell text-justify leading-relaxed py-4">
                                                    <span className="font-bold uppercase block mb-1">Course Description</span>
                                                    <div
                                                        className="italic wrap-break-word"
                                                        dangerouslySetInnerHTML={{
                                                            __html: DOMPurify.sanitize(
                                                                data.course_description || 'No description provided.'
                                                            ),
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="label-cell">Pre-Requisites</td>
                                                <td colSpan={2} className="value-cell">{data.pre_requisites || 'None'}</td>
                                                <td className="label-cell">Co-Requisites</td>
                                                <td colSpan={2} className="value-cell">{data.co_requisites || 'None'}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {/* Vision & Mission Sections */}
                                    <table className="syllabus-table -mt-px">
                                        <tbody>
                                            <tr>
                                                <td className="label-cell" style={{width: '15%'}}>VISION</td>
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
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCancelModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md text-center"
                        >
                            <h2 className="text-lg font-bold text-slate-900 mb-2">
                                Cancel Syllabus Creation?
                            </h2>

                            <p className="text-sm text-slate-600 mb-6">
                                All your progress will be lost. This action cannot be undone.
                            </p>

                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={closeCancelModal}
                                    className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                                >
                                    No, go back
                                </button>

                                <button
                                    onClick={confirmCancel}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                                >
                                    Yes, cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSaveToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300]
                                bg-green-600 text-white px-5 py-2.5 rounded-xl 
                                shadow-xl text-sm font-semibold"
                    >
                        Draft saved!
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 sm:p-4 z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">

                    {/* ALERT (LEFT SIDE) */}
                    <div className="w-full md:w-auto">
                        <Alert message={alertMessage} type={alertType} />
                    </div>

                    <div className="md:ml-auto w-full md:w-auto flex gap-2">
                        {/* CANCEL BUTTON */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowPreview(false);
                                setShowCancelModal(true);
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-gray-300 text-gray-700 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-400 cursor-pointer transition-all active:scale-95"
                        >
                            Cancel
                        </button>

                        {/* NEXT BUTTON */}
                        <button
                            form="step1-form"
                            type="submit"
                            disabled={processing}
                            className="flex-2 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 bg-[#800000] text-white rounded-xl font-bold hover:bg-[#600000] cursor-pointer text-xs sm:text-sm shadow-md active:scale-95 transition-all"
                        >
                            Next: Map Learning Outcomes <ChevronRight size={20}/>
                        </button>

                    </div>
                </div>
            </div>
            <PageSpacer />
        </div>
    );
};

export default Step1;