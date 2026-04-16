import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Navbar from '../navbar_layouts/Navbar'; 
import { 
    ChevronLeft, ChevronRight, X, FileText, 
    Info, FileDown, Plus, Trash2, CalendarDays,
    ArrowUpDown, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Initial data 
const initialWeeklyData = [
    {
        id: 1,
        weeks: '1',
        dlo: '1. Understand the course objectives, structure, and assessment methods.\n2. Recognize the importance of computing in various disciplines.\n3. Familiarize with the course requirements and policies.\n4. Set personal learning goals for the course.',
        clo: 'CLO 1: Apply fundamental concepts of computing, science, and mathematics to solve basic problems.\nCLO 5: Communicate technical information effectively in both oral and written forms.',
        topics: '1. Introduction to the Course\n2. Vision, Mission, Goals and Objectives of the University, and the Campus.\n3. Self-Introduction\n4. Course Overview\n5. Grading System\n6. Classroom Management',
        deliveryFace: 'Explain the parts of the course syllabus\n\nCourse orientation and discussion using a PowerPoint presentation in the classroom.',
        deliverySync: '',
        deliveryAsync: '',
        tasks: 'Submission of personal learning goals.'
    },
    {
        id: 2,
        weeks: '2',
        dlo: '1. Define Information Technology and its components.\n2. Identify different types of computer systems.\n3. Understand the role of IT in organizations and society.\n4. Explore career opportunities in the IT field.',
        clo: 'CLO 4: Demonstrate proficiency in using modern computing tools and techniques for basic IT tasks and projects.\nCLO 9: Understand the professional, ethical, and societal impacts of computing and technology on individuals, organizations, and society.',
        topics: '1. Definition and Components of IT\n2. Types of Computer Systems\n3. Role of IT in Society\n4. Career Opportunities in IT',
        deliveryFace: '',
        deliverySync: 'Live discussion via MS Teams with a PowerPoint presentation to introduce the basic concepts of IT.',
        deliveryAsync: '',
        tasks: 'Online quiz on IT components and types of computer systems.\nReflection paper on the role of IT in society.'
    }
];

// Reusable component for Table Cells 
interface TableCellProps {
    id: number; field: string; value: string; placeholder: string;
    onChange: (id: number, field: string, value: string) => void;
    isDelivery?: boolean; bgColor?: string;
}

const TableCell: React.FC<TableCellProps> = ({ id, field, value, placeholder, onChange, isDelivery = false, bgColor = "" }) => {
    return (
        <td className={`p-1 align-top border-r border-slate-100 ${isDelivery ? bgColor : ''}`}>
            <textarea 
                value={value} rows={4} placeholder={placeholder}
                onChange={(e) => onChange(id, field, e.target.value)}
                className={`w-full text-xs p-2.5 bg-transparent border-0 focus:ring-1 focus:ring-[#007BFF] focus:bg-white focus:rounded-md resize-none scrollbar-thin scrollbar-thumb-slate-200 ${value === '' ? 'italic text-slate-400' : 'text-slate-700'}`}
                style={{ minHeight: '120px' }}
            />
        </td>
    );
};

const Step3 = () => {
    const [showPreview, setShowPreview] = useState(false);
    const [obtlData, setObtlData] = useState(initialWeeklyData);

    const handleCellChange = (id: number, field: string, value: string) => {
        setObtlData(prevData =>
            prevData.map(row =>
                row.id === id ? { ...row, [field]: value } : row
            )
        );
    };

    const addRow = () => {
        const newId = obtlData.length > 0 ? Math.max(...obtlData.map(r => r.id)) + 1 : 1;
        setObtlData([...obtlData, {
            id: newId, weeks: '', dlo: '', clo: '', topics: '',
            deliveryFace: '', deliverySync: '', deliveryAsync: '', tasks: ''
        }]);
    };

    const removeRow = (id: number) => {
        if (obtlData.length > 1) {
            setObtlData(obtlData.filter(row => row.id !== id));
        } else {
            alert("Syllabus must have at least one week entry.");
        }
    };

    const validateAndNext = () => {
        const hasEmptyWeeks = obtlData.some(row => row.weeks.trim() === '');
        if (hasEmptyWeeks) {
            alert("Please specify the week(s) for all entries.");
            return;
        }
        window.location.href = "/syllabus-generator/step-4"; 
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans pb-40">
            <Navbar />
            <Head title="Step 3: Weekly OBTL Plan" />

            <main className="grow pt-28 px-4 sm:px-6 lg:px-8 max-w-[95%] mx-auto w-full">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-3 gap-4 border-b-2 border-slate-300 pb-3">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-[10px] sm:text-[11px] font-bold text-[#800000] uppercase tracking-widest">Learning Plan</h2>
                        </div>
                        <h1 className="text-lg sm:text-3xl font-black text-slate-800 leading-tight">
                            Step 3 of 5: <span className="text-slate-600 font-bold">Weekly Teaching & Learning (OBTL)</span>
                        </h1>
                    </motion.div>
                    
                    <button 
                        onClick={() => setShowPreview(true)}
                        className="flex items-center justify-center gap-2 bg-[#800000] text-white px-4 py-2.5 sm:px-5 rounded-xl font-bold shadow-lg hover:bg-[#600000] transition-all text-[11px] min-[375px]:text-xs sm:text-sm active:scale-95 shrink-0 w-full md:w-auto"
                    >
                        <FileDown size={18} /> Live PDF Preview
                    </button>
                </div>

                <div className="bg-white border-l-4 border-[#800000] p-4 rounded-r-xl shadow-sm mb-6 flex items-start gap-3">
                    <Info className="text-[#800000] mt-0.5 shrink-0" size={20} />
                    <p className="text-xs md:text-sm text-slate-600 font-medium">
                        <span className="font-bold text-slate-900">Instructions:</span> Fill out the Outcomes-Based Teaching and Learning (OBTL) plan below.
                    </p>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center gap-2">
                        <h3 className="font-bold text-slate-700 text-[11px] min-[375px]:text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                            <ArrowUpDown size={16} className="text-[#800000] shrink-0"/> OBTL Plan
                        </h3>
                        <button onClick={addRow} className="flex items-center gap-1.5 bg-[#800000] text-white px-3 py-2 rounded-lg text-[10px] min-[375px]:text-xs font-bold hover:bg-[#600000] shadow shrink-0">
                            <Plus size={14}/> ADD NEW 
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse table-fixed min-w-250">
                            <thead className="sticky top-0 z-10 bg-[#ffe8e8]">
                                <tr className="border-b-2 border-slate-300">
                                    <th className="p-3 text-center text-[11px] font-bold text-slate-600 uppercase w-20" rowSpan={3}>Weeks</th>
                                    <th className="p-3 text-center text-[11px] font-bold text-slate-600 uppercase w-[18%]" rowSpan={3}>Desired Learning Outcomes (DLOs)</th>
                                    <th className="p-3 text-center text-[11px] font-bold text-slate-600 uppercase w-[18%]" rowSpan={3}>Alignment to CLOs</th>
                                    <th className="p-3 text-center text-[11px] font-bold text-slate-600 uppercase w-[18%]" rowSpan={3}>Learning Content/Topics</th>
                                    <th className="p-3 text-center text-[11px] font-bold text-slate-600 uppercase border-b-2 border-slate-200" colSpan={3}>Instructional Delivery Design</th>
                                    <th className="p-3 text-center text-[11px] font-bold text-slate-600 uppercase w-[15%]" rowSpan={3}>Assessment Tasks (TAs)</th>
                                    <th className="p-3 w-12 border-b-2 border-slate-200" rowSpan={3}></th>
                                </tr>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="p-2 text-center text-[10px] font-bold text-slate-500 uppercase  bg-[#e8f4ff] border-r border-slate-200 w-[12%]" rowSpan={2}>Face-to-Face</th>
                                    <th className="p-1 text-center text-[9px] font-bold text-[#0056b3] uppercase bg-[#e8f4ff] border-b border-slate-200" colSpan={2}>Flexible Learning and Teaching Activities (FLTAs)</th>
                                </tr>
                                <tr className="bg-slate-50/50 border-b-2 border-slate-300">
                                    <th className="p-2 text-center text-[10px] font-semibold text-slate-500 uppercase border-r border-slate-200 w-[12%] bg-[#f0f7ff]">Synchronous</th>
                                    <th className="p-2 text-center text-[10px] font-semibold text-slate-500 uppercase w-[12%] bg-[#f0f7ff]">Asynchronous</th>
                                </tr>
                            </thead>
                            
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {obtlData.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-2 align-top border-r border-slate-100">
                                            <input type="text" value={row.weeks} placeholder="e.g. 1" onChange={(e) => handleCellChange(row.id, 'weeks', e.target.value)} className="w-full text-center text-sm font-bold p-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-[#007BFF]" />
                                        </td>
                                        <TableCell id={row.id} field="dlo" value={row.dlo} onChange={handleCellChange} placeholder="Enter DLOs..." />
                                        <TableCell id={row.id} field="clo" value={row.clo} onChange={handleCellChange} placeholder="Map to CLOs..." />
                                        <TableCell id={row.id} field="topics" value={row.topics} onChange={handleCellChange} placeholder="Enter Topics..." />
                                        <TableCell id={row.id} field="deliveryFace" value={row.deliveryFace} onChange={handleCellChange} placeholder="F2F..." isDelivery bgColor="bg-[#f8fbff]" />
                                        <TableCell id={row.id} field="deliverySync" value={row.deliverySync} onChange={handleCellChange} placeholder="Sync..." isDelivery bgColor="bg-[#f0f7ff]" />
                                        <TableCell id={row.id} field="deliveryAsync" value={row.deliveryAsync} onChange={handleCellChange} placeholder="Async..." isDelivery bgColor="bg-[#f0f7ff]" />
                                        <TableCell id={row.id} field="tasks" value={row.tasks} onChange={handleCellChange} placeholder="Tasks..." />
                                        <td className="p-2 align-middle text-center">
                                            <button onClick={() => removeRow(row.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full md:opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 sm:p-4 z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 text-[10px] min-[375px]:text-xs font-medium px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 w-full sm:w-auto justify-center">
                        <AlertCircle size={14} className="text-[#007BFF] shrink-0"/> Auto-saved to session.
                    </div>
                    <div className="flex gap-2 min-[375px]:gap-3 w-full sm:w-auto">
                        <Link href="/syllabus-generator/step-2" className="flex-1 sm:flex-none flex items-center justify-center gap-1 min-[375px]:gap-2 px-3 min-[375px]:px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 text-[11px] min-[375px]:text-xs sm:text-sm border border-slate-200">
                            <ChevronLeft size={16} /> Back
                        </Link>
                        <button onClick={validateAndNext} className="flex-2 sm:flex-none flex items-center justify-center gap-1 min-[375px]:gap-2 px-4 min-[375px]:px-8 py-2.5 bg-[#800000] text-white rounded-xl font-bold hover:bg-[#600000] text-[11px] min-[375px]:text-xs sm:text-sm shadow-md active:scale-95 transition-all">
                            Next: Grading System <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </footer>

            {/* SYLLABUS PREVIEW MODAL  */}
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
                                    <FileText size={18} className="shrink-0"/> OBTL Syllabus Preview
                                </span>
                                <button onClick={() => setShowPreview(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"><X size={20}/></button>
                            </div>
                            
                            <div className="flex-1 bg-slate-500 overflow-auto p-2 sm:p-8 flex justify-center">
                                <div className="origin-top scale-[0.25] min-[320px]:scale-[0.28] min-[375px]:scale-[0.32] min-[400px]:scale-[0.4] sm:scale-[0.55] md:scale-[0.75] lg:scale-90 xl:scale-100 transition-transform bg-white shadow-2xl">
                                    <div className="w-[297mm] min-h-[210mm] p-[15mm] font-serif text-black leading-tight">
                                        
                                        {/* Header  */}
                                        <div className="flex items-center gap-4 mb-2">
                                            <img src="/images/pup_logo.png" alt="PUP Logo" className="w-16 h-16 object-contain" />
                                            <div className="text-left">
                                                <p className="text-[10pt]">Republic of the Philippines</p>
                                                <p className="font-bold text-[12pt]">POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</p>
                                                <p className="font-bold text-[11pt]">SANTA ROSA CAMPUS</p>
                                                <p className="text-[10pt] italic">City of Santa Rosa, Laguna</p>
                                            </div>
                                        </div>

                                        <hr className="border-t-2 border-black mb-4" />

                                        {/* OBTL Header */}
                                        <h2 className="font-bold text-[11pt] mb-4 uppercase text-center w-full">OUTCOMES-BASED TEACHING AND LEARNING PLAN (OBTL PLAN)</h2>
                                        
                                        {/* OBTL Table  */}
                                        <div className="w-full border-[1pt] border-black">
                                            <table className="w-full border-collapse text-[8pt]">
                                                <thead>
                                                    <tr className="border-b border-black bg-[#ffe8e8]">
                                                        <th className="p-2 border-r border-black w-[6%] font-bold text-center" rowSpan={3}>Weeks<br/><span className="text-[7pt] font-normal">(18 Weeks)</span></th>
                                                        <th className="p-2 border-r border-black w-[18%] font-bold text-center" rowSpan={3}>Desired Learning Outcomes (DLOs)</th>
                                                        <th className="p-2 border-r border-black w-[15%] font-bold text-center" rowSpan={3}>Alignment to CLOs</th>
                                                        <th className="p-2 border-r border-black w-[15%] font-bold text-center" rowSpan={3}>Learning Content/Topics</th>
                                                        <th className="p-1 border-b border-black font-bold text-center" colSpan={3}>Instructional Delivery Design</th>
                                                        <th className="p-2 border-l border-black w-[15%] font-bold text-center" rowSpan={3}>Assessment Tasks (TAs)</th>
                                                    </tr>
                                                    <tr className="border-b border-black bg-gray-50">
                                                        <th className="p-1 border-r border-black w-[10%] font-bold text-center bg-[#e8f4ff]" rowSpan={2}>Face-to-Face</th>
                                                        <th className="p-0.5 border-b border-black font-bold text-center bg-[#e8f4ff]" colSpan={2}>Flexible Learning and Teaching Activities (FLTAs)</th>
                                                    </tr>
                                                    <tr className="border-b border-black bg-[#e8f4ff]">
                                                        <th className="p-1 border-r border-black w-[10%] font-bold text-center">Synchronous</th>
                                                        <th className="p-1 w-[10%] font-bold text-center">Asynchronous</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {obtlData.map((row) => (
                                                        <tr key={row.id} className="border-b border-black last:border-0 align-top">
                                                            <td className="p-2 border-r border-black text-center font-bold">{row.weeks}</td>
                                                            <td className="p-2 border-r border-black whitespace-pre-wrap">{row.dlo}</td>
                                                            <td className="p-2 border-r border-black whitespace-pre-wrap">{row.clo}</td>
                                                            <td className="p-2 border-r border-black whitespace-pre-wrap">{row.topics}</td>
                                                            <td className="p-2 border-r border-black whitespace-pre-wrap bg-gray-50/30">{row.deliveryFace}</td>
                                                            <td className="p-2 border-r border-black whitespace-pre-wrap bg-blue-50/20">{row.deliverySync}</td>
                                                            <td className="p-2 border-r border-black whitespace-pre-wrap bg-blue-50/20">{row.deliveryAsync}</td>
                                                            <td className="p-2 whitespace-pre-wrap">{row.tasks}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

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
        </div>
    );
};

export default Step3;