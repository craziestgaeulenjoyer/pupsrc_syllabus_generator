import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Navbar from '../navbar_layouts/Navbar'; 

import { motion, AnimatePresence } from 'framer-motion';
import DeleteModal from '../modals_section/DeleteConfirmation';
import Alert from '../Validation/Alert';

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';

import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';

import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

import { CSS } from '@dnd-kit/utilities';

import { 
    ChevronLeft, ChevronRight, X, FileText, AlertCircle,
    Info, FileDown, Plus, Trash2, Layers, BookMarked, TriangleAlert, CheckCircle2
} from 'lucide-react';


interface OBTLRow {
    id: number;
    type: 'regular' | 'midterm' | 'final';
    weeks: string;
    dlo: string;
    clo: string;
    topics: string;
    deliveryFace: string;
    deliverySync: string;
    deliveryAsync: string;
    tasks: string;
}

interface TableCellProps {
    id: number;
    field: string;
    value: string;
    placeholder: string;
    onChange: (id: number, field: string, value: string) => void;
    isDelivery?: boolean;
    bgColor?: string;
    label?: string;
    readOnly?: boolean;
}

const initialWeeklyData: OBTLRow[] = [
    {
        id: 1,
        type: 'regular',
        weeks: '1',
        dlo: 'Understand the course objectives, structure, and assessment methods.',
        clo: 'CLO 1, CLO 5',
        topics: '1. Introduction to the Course\n2. Vision, Mission, Goals and Objectives',
        deliveryFace: 'Explain the parts of the course syllabus',
        deliverySync: '',
        deliveryAsync: '',
        tasks: 'Submission of personal learning goals.'
    }
];

// Optimized Cell
const TableCell: React.FC<TableCellProps> = ({
    id,
    field,
    value,
    placeholder,
    onChange,
    isDelivery = false,
    bgColor = "",
    label,
    readOnly = false,
}) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // auto resize on mount + value change
    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [value]);

    return (
        <div className="flex flex-col w-full h-full">
            {label && (
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 md:hidden">
                    {label}
                </label>
            )}

            <textarea
                ref={textareaRef}
                value={value}
                readOnly={readOnly}
                placeholder={placeholder}
                onChange={(e) => onChange(id, field, e.target.value)}
                onInput={(e) => {
                    const target = e.currentTarget;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                }}
                className={`
                    w-full text-[11px] p-2 bg-transparent border-0 md:border-r border-slate-200
                    focus:ring-1 focus:ring-[#800000] focus:bg-white focus:rounded-md
                    resize-none overflow-hidden
                    whitespace-pre-wrap break-words
                    leading-relaxed
                    ${isDelivery ? bgColor : ''} 
                    ${value === '' ? 'italic text-slate-400' : 'text-slate-700'}
                    ${readOnly ? 'cursor-not-allowed bg-slate-100' : ''}
                `}
            />
        </div>
    );
};

const SortableRow = React.memo(({ row, children }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition
    } = useSortable({ id: row.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    return (
        <tr ref={setNodeRef} style={style}>
            {children({ attributes, listeners })}
        </tr>
    );
});

const Step3 = () => {
    const [showPreview, setShowPreview] = useState(false);
    const [obtlData, setObtlData] = useState<OBTLRow[]>([]);
    const [showDraftSaved, setShowDraftSaved] = useState(false);
    const [examLimitMessage, setExamLimitMessage] = useState<string | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const [references, setReferences] = useState([
    { id: 1, text: '' }
    ]);
    const [otherReferences, setOtherReferences] = useState([
    { id: 1, text: '' }
    ]);

    const hasMidterm = obtlData.some(r => r.type === 'midterm');
    const hasFinal = obtlData.some(r => r.type === 'final');

    const [selectedDelete, setSelectedDelete] = useState<{
        type: 'reference' | 'otherReference' | 'row' | null;
        id: number | null;
    }>({ type: null, id: null });

    const [alert, setAlert] = useState<{
        message: string | null;
        type: 'error' | 'success';
    }>({
        message: null,
        type: 'error'
    });

    const getSyllabusSessionId = () => {
        let sessionId = sessionStorage.getItem('syllabus_session_id');

        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem('syllabus_session_id', sessionId);
        }

        return sessionId;
    };

    const STORAGE_KEY = `syllabus_step3_${getSyllabusSessionId()}`;
    
    const validateStep = () => {
        const midterms = obtlData.filter(r => r.type === 'midterm');
        const finals = obtlData.filter(r => r.type === 'final');

        const totalWeeks = obtlData.length;

        if (midterms.length > 1 || finals.length > 1) {
            setAlert({
                message: 'Only ONE Midterm and ONE Final are allowed.',
                type: 'error'
            });
            return false;
        }

        if (midterms.length === 0 && finals.length === 0) {
            setAlert({
                message: 'You must add either Midterm or Final examination rows.',
                type: 'error'
            });
            return false;
        }

        if (totalWeeks !== 18) {
            setAlert({
                message: `You must have exactly 18 total rows (including exams). Currently: ${totalWeeks}.`,
                type: 'error'
            });
            return false;
        }

        const allRows = obtlData;

        // check empty fields INCLUDING exams
        for (const row of allRows) {
            if (row.type === 'regular') {
                if (!row.dlo || !row.clo || !row.topics || !row.tasks) {
                    setAlert({
                        message: 'All fields in weekly rows must be filled.',
                        type: 'error'
                    });
                    return false;
                }
            } else {
                // exam validation
                if (!row.topics) {
                    setAlert({
                        message: 'Exam rows must have a label.',
                        type: 'error'
                    });
                    return false;
                }
            }
        }

        if (!checkExamOrder()) return false;

        const arranged = sortByWeek(reindexWeeks(enforceExamOrder(obtlData)));

        if (JSON.stringify(arranged) !== JSON.stringify(obtlData)) {
            setObtlData(arranged);
        }

        return true;
    };

    const handleNext = () => {
        if (!validateStep()) return;

        // FINAL CLEANUP BEFORE STEP 4
        const arranged = sortByWeek(
            reindexWeeks(
                enforceExamOrder(obtlData)
            )
        );

        setObtlData(arranged);

        // OPTIONAL: save clean version
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            syllabus_session_id: getSyllabusSessionId(),
            obtlData: arranged,
            references,
            otherReferences
        }));

        window.location.href = "/syllabus-generator/step-4";
    };

    useEffect(() => {
        if (!alert.message) return;

        const timer = setTimeout(() => {
            setAlert({ message: null, type: 'error' });
        }, 3000); // duration in milliseconds (3 seconds)

        return () => clearTimeout(timer);
    }, [alert.message]);

    const handleCellChange = (id: number, field: string, value: string) => {
        const container = containerRef.current;
        const scrollTop = container?.scrollTop; // SAVE scroll position

        setObtlData(prev => {
            const updated = [...prev];
            const index = updated.findIndex(r => r.id === id);

            if (index !== -1) {
                updated[index] = {
                    ...updated[index],
                    [field]: value
                };
            }

            return updated;
        });

        // RESTORE scroll AFTER render
        requestAnimationFrame(() => {
            if (container && scrollTop !== undefined) {
                container.scrollTop = scrollTop;
            }
        });
    };

    const addRow = (type: 'regular' | 'midterm' | 'final' = 'regular') => {
        if (obtlData.length >= 18) {
            setAlert({
                message: 'You already have 18 weeks (including exams). You cannot add more.',
                type: 'error'
            });
            return;
        }

        if (type === 'midterm' && hasMidterm) {
            setExamLimitMessage('No more midterm row can be added. If you wish to add more, delete the previous midterm row.');
            return;
        }

        if (type === 'final' && hasFinal) {
            setExamLimitMessage('No more final row can be added. If you wish to add more, delete the previous final row.');
            return;
        }

        const regularCount = obtlData.filter(r => r.type === 'regular').length;

        if (type === 'regular' && regularCount >= 16) {
            setAlert({
                message: 'Maximum of 16 regular weeks reached (Week 9 and 18 are reserved for exams).',
                type: 'error'
            });
            return;
        }

        const newRow: OBTLRow = {
            id: Date.now(),
            type,
            weeks: '', // always empty initially
            dlo: type !== 'regular' ? 'Examination Period' : '',
            clo: '',
            topics:
                type === 'midterm'
                    ? 'MIDTERM EXAMINATION'
                    : type === 'final'
                    ? 'FINAL EXAMINATION'
                    : '',
            deliveryFace: '',
            deliverySync: '',
            deliveryAsync: '',
            tasks: ''
        };

        setObtlData(prev => {
            const updated = enforceExamOrder([...prev, newRow]);
            const reindexed = reindexWeeks(updated);
            return sortByWeek(reindexed);
        });
    };

    const addReference = () => {
        const newId =
            references.length > 0
                ? Math.max(...references.map(r => r.id)) + 1
                : 1;

        setReferences([...references, { id: newId, text: '' }]);
    };

    const updateReference = (id: number, value: string) => {
        setReferences(prev =>
            prev.map(ref =>
                ref.id === id ? { ...ref, text: value } : ref
            )
        );
    };

    const addOtherReference = () => {
        const newId =
            otherReferences.length > 0
                ? Math.max(...otherReferences.map(r => r.id)) + 1
                : 1;

        setOtherReferences([...otherReferences, { id: newId, text: '' }]);
    };

    const updateOtherReference = (id: number, value: string) => {
        setOtherReferences(prev =>
            prev.map(ref =>
                ref.id === id ? { ...ref, text: value } : ref
            )
        );
    };

    const openDeleteModal = (type: 'reference' | 'otherReference' | 'row', id: number) => {
        setSelectedDelete({ type, id });
        setDeleteModalOpen(true);
        };

    const confirmDelete = () => {
        if (!selectedDelete.id) return;

        if (selectedDelete.type === 'reference') {
            setReferences(prev => prev.filter(r => r.id !== selectedDelete.id));
        }

        if (selectedDelete.type === 'otherReference') {
            setOtherReferences(prev => prev.filter(r => r.id !== selectedDelete.id));
        }

        if (selectedDelete.type === 'row') {
            setObtlData(prev => {
                const updated = enforceExamOrder(prev.filter(r => r.id !== selectedDelete.id));
                return reindexWeeks(updated);
            });
        }

        setDeleteModalOpen(false);
        setSelectedDelete({ type: null, id: null });
    };


    const chunkData = (data: OBTLRow[], size: number) => {
        const chunks = [];
        for (let i = 0; i < data.length; i += size) {
            chunks.push(data.slice(i, i + size));
        }
        return chunks;
    };

    const checkExamOrder = () => {
        const midtermIndex = obtlData.findIndex(r => r.type === 'midterm');
        const finalIndex = obtlData.findIndex(r => r.type === 'final');

        // Only validate if BOTH exist
        if (midtermIndex !== -1 && finalIndex !== -1) {
            if (finalIndex < midtermIndex) {
                setAlert({
                    message: 'Midterm Examination row should be above the Final Examination row.',
                    type: 'error'
                });
                return false;
            }
        }

        return true;
    };

    const enforceExamOrder = (data: OBTLRow[]) => {
        const midtermIndex = data.findIndex(r => r.type === 'midterm');
        const finalIndex = data.findIndex(r => r.type === 'final');

        if (midtermIndex !== -1 && finalIndex !== -1 && finalIndex < midtermIndex) {
            const updated = [...data];
            const [finalRow] = updated.splice(finalIndex, 1);
            updated.splice(midtermIndex + 1, 0, finalRow); // move final BELOW midterm
            return updated;
        }

        return data;
    };

    const paginatedData = chunkData(obtlData, 6);

    const sensors = useSensors(
        useSensor(PointerSensor)
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        setObtlData((items) => {
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over.id);

            const updated = arrayMove(items, oldIndex, newIndex);

            const ordered = enforceExamOrder(updated);
            return reindexWeeks(ordered);
        });
    };

    const reindexWeeks = (data: OBTLRow[]) => {
        let counter = 1;

        return data.map(row => {
            if (row.type === 'regular') {

                // Skip week 9 (midterm slot)
                if (counter === 9) counter++;

                // Stop at 17 (18 is final)
                if (counter > 17) counter = 17;

                const updatedRow = {
                    ...row,
                    weeks: counter.toString()
                };

                counter++;
                return updatedRow;
            }

            // Force exam positions
            if (row.type === 'midterm') {
                return { ...row, weeks: '9' };
            }

            if (row.type === 'final') {
                return { ...row, weeks: '18' };
            }

            return row;
        });
    };

    const sortByWeek = (data: OBTLRow[]) => {
        return [...data].sort((a, b) => {
            const weekA = parseInt(a.weeks || '0');
            const weekB = parseInt(b.weeks || '0');
            return weekA - weekB;
        });
    };

    // useEffects

    useEffect(() => {
        const saved = sessionStorage.getItem(STORAGE_KEY);

        if (saved) {
            const parsed = JSON.parse(saved);

            setObtlData(parsed.obtlData || initialWeeklyData);
            setReferences(parsed.references || [{ id: 1, text: '' }]);
            setOtherReferences(parsed.otherReferences || [{ id: 1, text: '' }]);
        } else {
            setObtlData(initialWeeklyData);
        }

        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (!examLimitMessage) return;

        const timer = setTimeout(() => {
            setExamLimitMessage(null);
        }, 3000);

        return () => clearTimeout(timer);
    }, [examLimitMessage]);

    useEffect(() => {
        if (!isHydrated) return;

        const timeout = setTimeout(() => {
            const payload = {
                syllabus_session_id: getSyllabusSessionId(),
                obtlData,
                references,
                otherReferences
            };

            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

            setShowDraftSaved(true);
            setTimeout(() => setShowDraftSaved(false), 1200);
        }, 600);

        return () => clearTimeout(timeout);
    }, [obtlData, references, otherReferences]);

    return (
        <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans pb-40">
            <Navbar />
            <Head title="Step 3: Weekly OBTL Plan" />

            <main className="grow pt-24 md:pt-28 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[#800000] font-bold text-[10px] md:text-sm tracking-widest uppercase mb-1">Learning Plan</span>
                        <h1 className="text-xl md:text-3xl font-black text-slate-800 flex flex-wrap items-center gap-2 md:gap-3">
                            Step 3 of 6: <span className="text-slate-600 font-bold text-lg md:text-3xl"> Weekly OBTL Plan </span>
                        </h1>
                    </div>
                    
                    <button 
                        onClick={() => setShowPreview(true)} 
                        className="w-full lg:w-auto bg-[#800000] hover:bg-[#600000] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <FileDown size={18}/> View Live PDF Preview
                    </button>
                </div>

                <hr className="border-t-2 border-slate-200 mb-6" />
                
                {/* Instructions */}
                <div className="bg-white border-l-4 border-[#800000] p-4 rounded-r-xl shadow-sm mb-8 flex items-start gap-3">
                    <Info className="text-[#800000] mt-0.5 shrink-0" size={20} />
                    <p className="text-[11px] md:text-sm text-slate-600 font-medium">
                        <span className="font-bold text-slate-900">Instructions:</span> Complete the 18-week plan by mapping outcomes and topics. Use the Add buttons for exams. All fields are required.
                    </p>
                </div>
                {/* ERROR / SUCCESS MESSAGE (UNDER INSTRUCTIONS) */}
                {alert.message && (
                    <div
                        className={`mb-8 border-l-4 p-4 rounded-r-xl shadow-sm flex items-start gap-3 ${
                            alert.type === 'error'
                                ? 'bg-red-50 border-red-600'
                                : 'bg-green-50 border-green-600'
                        }`}
                    >
                        <TriangleAlert
                            className={`mt-0.5 shrink-0 ${
                                alert.type === 'error' ? 'text-red-600' : 'text-green-600'
                            }`}
                            size={20}
                        />

                        <p
                            className={`text-[11px] md:text-sm font-medium ${
                                alert.type === 'error' ? 'text-red-700' : 'text-green-700'
                            }`}
                        >
                            <span className="font-bold">Warning:</span>{' '}
                            {alert.message}
                        </p>
                    </div>
                )}

                {/* Table Container */}
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden mb-10">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 font-bold text-slate-700 text-xs md:text-base">
                            <Layers size={18} className="text-[#800000]" />
                            OBTL PLAN STRUCTURE
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => addRow('midterm')}
                                disabled={hasMidterm || obtlData.length >= 18}
                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[10px] font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all
                                ${hasMidterm
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
                                }`}
                            >
                                <Plus size={12}/> ADD MIDTERM EXAM ROW
                            </button>

                            <button
                                onClick={() => addRow('final')}
                                disabled={hasFinal || obtlData.length >= 18}
                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[10px] font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all
                                ${hasFinal
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                                }`}
                            >
                                <Plus size={12}/> ADD FINAL EXAM ROW
                            </button>
                        </div>
                        <AnimatePresence>
                            {examLimitMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="w-full mt-2 bg-red-50 border border-red-200 text-red-700 text-xs font-medium p-3 rounded-md"
                                >
                                    {examLimitMessage}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div ref={containerRef} style={{ scrollBehavior: 'auto' }} className="hidden md:block overflow-x-auto max-h-[70vh] overflow-y-auto">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                        >
                            <SortableContext
                                items={obtlData.map(row => row.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <table className="w-full border border-slate-300 border-collapse table-auto">
                                    <thead className="bg-[#fcfcfc] text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="p-4 w-10"></th>
                                            <th className="p-4 text-left font-black border border-slate-300 w-20">Weeks (18 Weeks) </th>
                                            <th className="p-4 text-left font-black border border-slate-300 w-[15%]">Desired Learning Outcomes (DLOs)</th>
                                            <th className="p-4 text-left font-black border border-slate-300 w-[10%]">Alignment to CLOs</th>
                                            <th className="p-4 text-left font-black border border-slate-300 w-[18%]">Learning Content/ Topics</th>
                                            <th className="p-2 text-center border-x border-slate-100 bg-slate-50/50" colSpan={3}>Instructional Delivery Design</th>
                                            <th className="p-4 text-left font-black border border-slate-300 w-[15%]">Assessment Tasks (TAs) </th>
                                            <th className="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {obtlData.map((row) => (
                                            <SortableRow key={row.id} row={row}>
                                                {({ attributes, listeners }: any) => (
                                                    <>
                                                        <td className="p-2 w-10 align-top">
                                                            <button
                                                                {...attributes}
                                                                {...listeners}
                                                                style={{ touchAction: 'none' }}
                                                                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-2 flex items-center justify-center rounded-md hover:bg-slate-100"
                                                            >
                                                                {/* 6 dots */}
                                                                <svg width="20" height="18" viewBox="0 0 20 20" fill="currentColor">
                                                                    <circle cx="5" cy="5" r="2" />
                                                                    <circle cx="12" cy="5" r="2" />
                                                                    <circle cx="19" cy="5" r="2" />

                                                                    <circle cx="5" cy="12" r="2" />
                                                                    <circle cx="12" cy="12" r="2" />
                                                                    <circle cx="19" cy="12" r="2" />
                                                                </svg>
                                                            </button>
                                                        </td>  
                                                        <td className="p-4 align-top">
                                                            <input 
                                                                type="text"
                                                                value={row.weeks}
                                                                readOnly={false}
                                                                onChange={(e) => handleCellChange(row.id, 'weeks', e.target.value)}
                                                                className={`w-10 h-10 md:w-12 md:h-12 rounded-lg text-center font-black text-sm focus:ring-2 focus:ring-[#800000] ${
                                                                    row.type !== 'regular'
                                                                        ? row.type === 'midterm'
                                                                            ? 'bg-amber-200 text-amber-900 cursor-not-allowed'
                                                                            : 'bg-red-200 text-red-900 cursor-not-allowed'
                                                                        : 'bg-slate-100 text-slate-700'
                                                                }`}
                                                            />
                                                        </td>

                                                        {row.type === 'regular' ? (
                                                            <>
                                                                <td className="p-3 align-top border border-slate-300"><TableCell id={row.id} field="dlo" value={row.dlo} onChange={handleCellChange} placeholder="DLO..." /></td>
                                                                <td className="p-3 align-top border border-slate-300"><TableCell id={row.id} field="clo" value={row.clo} onChange={handleCellChange} placeholder="CLO..." /></td>
                                                                <td className="p-3 align-top border border-slate-300"><TableCell id={row.id} field="topics" value={row.topics} onChange={handleCellChange} placeholder="Topics..." /></td>
                                                                <td className="p-3 align-top border border-slate-300"><TableCell id={row.id} field="deliveryFace" value={row.deliveryFace} onChange={handleCellChange} placeholder="Face-to-Face" isDelivery bgColor="bg-white" /></td>
                                                                <td className="p-3 align-top border border-slate-300"><TableCell id={row.id} field="deliverySync" value={row.deliverySync} onChange={handleCellChange} placeholder="Synchronous" isDelivery bgColor="bg-slate-50/30" /></td>
                                                                <td className="p-3 align-top border border-slate-300"><TableCell id={row.id} field="deliveryAsync" value={row.deliveryAsync} onChange={handleCellChange} placeholder="Asynchronous" isDelivery bgColor="bg-slate-50/30" /></td>
                                                                <td className="p-3 align-top border border-slate-300"><TableCell id={row.id} field="tasks" value={row.tasks} onChange={handleCellChange} placeholder="Tasks..." /></td>
                                                            </>
                                                        ) : (
                                                            <td
                                                                colSpan={7}
                                                                className={`p-4 ${
                                                                    row.type === 'midterm'
                                                                        ? 'bg-amber-100'
                                                                        : row.type === 'final'
                                                                        ? 'bg-red-100'
                                                                        : ''
                                                                }`}
                                                            >
                                                                <input
                                                                    type="text"
                                                                    value={row.topics}
                                                                    readOnly
                                                                    className="w-full bg-transparent p-3 rounded-lg font-black text-amber-900 uppercase text-[13px] border-none focus:ring-0"
                                                                />
                                                            </td>
                                                        )}

                                                        <td className="p-4 text-center">
                                                            <button onClick={() => openDeleteModal('row', row.id)} className="text-slate-300 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg">
                                                                <Trash2 size={16}/>
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </SortableRow>
                                        ))}
                                    </tbody>
                                </table>
                            </SortableContext>
                        </DndContext>
                    </div>

                    <div className="md:hidden flex flex-col divide-y divide-slate-200">
                        {obtlData.map((row) => (
                            <div key={row.id} className={`p-4 ${row.type !== 'regular' ? 'bg-amber-50' : 'bg-white'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#800000] text-white flex items-center justify-center font-black text-xs">
                                            {row.type === 'regular' ? `W${row.weeks}` : 'EXAM'}
                                        </div>
                                        {row.type !== 'regular' && <span className="font-bold text-amber-800 text-[10px] uppercase">Examination Period</span>}
                                    </div>
                                    <button  onClick={() => openDeleteModal('row', row.id)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                                </div>

                                {row.type === 'regular' ? (
                                    <div className="space-y-4">
                                        <TableCell id={row.id} label="Desired Outcomes" field="dlo" value={row.dlo} onChange={handleCellChange} placeholder="Outcomes..." />
                                        <TableCell id={row.id} label="Learning Content" field="topics" value={row.topics} onChange={handleCellChange} placeholder="Topics..." />
                                        <div className="grid grid-cols-2 gap-2">
                                            <TableCell id={row.id} label="CLO Mapping" field="clo" value={row.clo} onChange={handleCellChange} placeholder="CLO..." />
                                            <TableCell id={row.id} label="Assessments" field="tasks" value={row.tasks} onChange={handleCellChange} placeholder="Tasks..." />
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg space-y-3">
                                            <p className="text-[10px] font-black text-slate-500 uppercase">Delivery Design</p>
                                            <TableCell id={row.id} label="Face-to-Face" field="deliveryFace" value={row.deliveryFace} onChange={handleCellChange} placeholder="F2F Activities" />
                                            <TableCell id={row.id} label="Synchronous" field="deliverySync" value={row.deliverySync} onChange={handleCellChange} placeholder="Online Sync" />
                                            <TableCell id={row.id} label="Asynchronous" field="deliveryAsync" value={row.deliveryAsync} onChange={handleCellChange} placeholder="Self-paced" />
                                        </div>
                                    </div>
                                ) : (
                                    <input type="text" value={row.topics} onChange={(e) => handleCellChange(row.id, 'topics', e.target.value)} className="w-full bg-amber-100 p-3 rounded-lg font-black text-amber-900 uppercase text-[11px] focus:ring-1 focus:ring-amber-500 border-none" />
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => addRow('regular')}
                        disabled={obtlData.length >= 18}
                        className={`w-full py-6 md:py-8 border-t border-dashed border-slate-200 font-bold flex items-center justify-center gap-2 transition-all group text-xs md:text-sm
                        ${
                            obtlData.length >= 18
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                                : 'text-slate-400 hover:text-[#800000] hover:bg-slate-50 cursor-pointer'
                        }`}
                    >
                        <Plus size={18}/> ADD WEEKLY LEARNING PLAN
                    </button>
                </div>

                {/* REFERENCES SECTION*/}
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden mb-10">

                    {/* HEADER */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 text-xs md:text-base flex items-center gap-2">
                            <BookMarked size={16} className="text-[#800000] w-5 h-5"/>
                            REFERENCES
                        </h2>
                    </div>

                    {/* SUBTITLE */}
                    <div className="p-4 border-b border-slate-200 text-[10px] md:text-xs font-bold uppercase text-slate-400 leading-relaxed">
                        REFERENCES FROM THE NINOY AQUINO LEARNING AND LIBRARY RESOURCES CENTER (NALLRC)
                        <br />
                        OUTCOMES-BASED BOOK LISTINGS (CBBL)
                    </div>

                    {/* MAIN REFERENCES */}
                    <div className="p-3 bg-white">
                        <div className="flex justify-end items-center mb-2">
                            <button
                                onClick={addReference}
                                className="bg-[#800000] hover:bg-[#600000] text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                                <Plus size={14}/> Add
                            </button>
                        </div>

                        <table className="w-full border-collapse">
                            <tbody className="divide-y divide-slate-200">
                                {references.map((ref) => (
                                    <tr key={ref.id}>
                                        <td className="p-2 w-full">
                                            <textarea
                                                value={ref.text}
                                                onChange={(e) => updateReference(ref.id, e.target.value)}
                                                placeholder="Enter reference..."
                                                className="w-full text-[11px] p-2 border border-slate-200 rounded-md resize-none"
                                                rows={2}
                                            />
                                        </td>

                                        <td className="p-2 text-center w-12">
                                            <button
                                                onClick={() => openDeleteModal('reference', ref.id)}
                                                className="text-slate-300 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg cursor-pointer"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* OTHER REFERENCES */}
                    <div className="p-3 border-t border-slate-200 bg-white">

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-600 uppercase">
                                Other References
                            </span>

                            <button
                                onClick={addOtherReference}
                                className="bg-[#800000] hover:bg-[#600000] text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                                <Plus size={14}/> Add
                            </button>
                        </div>

                        <table className="w-full border-collapse">
                            <tbody className="divide-y divide-slate-200">
                                {otherReferences.map((ref) => (
                                    <tr key={ref.id}>
                                        <td className="p-2 w-full">
                                            <textarea
                                                value={ref.text}
                                                onChange={(e) => updateOtherReference(ref.id, e.target.value)}
                                                placeholder="Enter other reference..."
                                                className="w-full text-[11px] p-2 border border-slate-200 rounded-md resize-none"
                                                rows={2}
                                            />
                                        </td>

                                        <td className="p-2 text-center w-12">
                                            <button
                                                onClick={() => openDeleteModal('otherReference', ref.id)}
                                                className="text-slate-300 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            </main>

            {/* FOOTER */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 sm:p-4 z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
                    {/* LEFT SIDE */}
                    <div className="flex flex-col items-start gap-2">
                        
                        {/* Auto-save indicator */}
                        <div className="hidden sm:flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <AlertCircle size={14} className="text-[#007BFF] shrink-0"/> 
                            Auto-saved to session.
                        </div>

                        {/* ERROR MESSAGE BELOW IT */}
                        <div className="hidden sm:block w-full">
                            <Alert message={alert.message} type={alert.type} />
                        </div>

                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                                href="/syllabus-generator/step-2"
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 text-xs sm:text-sm border border-slate-200 transition-all"
                        >
                                <ChevronLeft size={16} /> Back
                                            </Link>

                        <button
                                onClick={handleNext}
                                className="flex-2 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 bg-[#800000] text-white rounded-xl font-bold hover:bg-[#600000] text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                                Next: Grading System <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </footer>

            {/* PREVIEW MODAL  */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-100 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} 
                            className="bg-white w-full max-w-[98%] h-[92vh] rounded-xl overflow-hidden flex flex-col"
                        >
                            <div className="bg-[#800000] p-3 md:p-4 flex justify-between items-center text-white shrink-0">
                                <span className="font-bold flex items-center gap-2 uppercase tracking-wider text-[10px] md:text-xs">
                                    <FileText size={18} className="shrink-0"/> OBTL PLAN SYLLABUS PREVIEW
                                </span>
                                <button onClick={() => setShowPreview(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"><X size={20}/></button>
                            </div>
                            
                            <div className="flex-1 bg-slate-600 overflow-auto p-2 md:p-8 flex flex-col items-center gap-4 md:gap-8 scrollbar-thin scrollbar-thumb-white/20">
                                {paginatedData.map((pageRows, pageIdx) => (
                                    <div key={pageIdx} className="bg-white shadow-2xl origin-top scale-[0.35] sm:scale-[0.5] md:scale-[0.7] lg:scale-100 transition-transform w-[297mm] min-h-[210mm] p-[15mm] font-serif text-black flex flex-col justify-between relative shrink-0">
                                        <div>
                                            <hr className="border-t-2 border-black mb-4" />
                                            {pageIdx === 0 && <h2 className="font-bold text-[11pt] mb-4 uppercase text-center w-full">OUTCOMES-BASED TEACHING AND LEARNING PLAN</h2>}

                                            <div className="w-full border-[1pt] border-black">
                                                <table className="w-full border-collapse text-[8pt]">
                                                    <colgroup>
                                                        <col style={{ width: '6%' }} />
                                                        <col style={{ width: '18%' }} />
                                                        <col style={{ width: '12%' }} />
                                                        <col style={{ width: '15%' }} />
                                                        <col style={{ width: '10%' }} />
                                                        <col style={{ width: '10%' }} />
                                                        <col style={{ width: '10%' }} />
                                                        <col style={{ width: '15%' }} />
                                                    </colgroup>
                                                    {pageIdx === 0 && (
                                                        <thead>
                                                            <tr className="border-b border-black bg-slate-50 ">
                                                                <th className="p-2 border-r border-black w-[6%] font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Weeks (18 Weeks)</th>
                                                                <th className="p-2 border-r border-black w-[18%] font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Learning Outcomes (DLOs) </th>
                                                                <th className="p-2 border-r border-black w-[12%] font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Alignment to (CLOs)</th>
                                                                <th className="p-2 border-r border-black w-[15%] font-bold text-center bg-[#ffe8e8] " rowSpan={3}>Learning Content/Topics</th>
                                                                <th className="p-1 border-b border-black font-bold text-center bg-[#ffe8e8]" colSpan={3}>Instructional Delivery Design</th>
                                                                <th className="p-2 border-l border-black w-[15%] font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Assessment Tasks (TAs)</th>
                                                            </tr>
                                                            <tr className="border-b border-black bg-slate-50">
                                                                <th className="p-1 border-r border-black w-[10%] font-bold text-center bg-[#e8f4ff]" rowSpan={2}>Face-to-Face</th>
                                                                <th className="p-0.5 border-b border-black font-bold text-center bg-[#e8f4ff]" colSpan={2}>Flexible Learning and Teaching Activities (FLTAs) </th>
                                                            </tr>
                                                            <tr className="border-b border-black bg-slate-50">
                                                                <th className="p-1 border-r border-black w-[10%] font-bold text-center text-[7pt] bg-[#e8f4ff]">Synchronous</th>
                                                                <th className="p-1 w-[10%] font-bold text-center text-[7pt] bg-[#e8f4ff]">Asynchronous</th>
                                                            </tr>
                                                        </thead>
                                                    )}
                                                    <tbody className="divide-y divide-slate-100 align-top">
                                                        {pageRows.map((row) => (
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
                                        </div>

                                        {pageIdx === paginatedData.length - 1 && (
                                            <div className="w-full mt-3 text-[8pt]">
                                                <table className="w-full border border-black border-collapse">
                                                    <tbody>

                                                        {/* HEADER */}
                                                        <tr>
                                                            <td className="p-2 font-bold uppercase">
                                                                REFERENCES FROM THE NINOY AQUINO LEARNING AND LIBRARY RESOURCES CENTER (NALLRC)
                                                                <br />
                                                                OUTCOMES-BASED BOOK LISTINGS (CBBL)
                                                            </td>
                                                        </tr>

                                                        {/* MAIN REFERENCES */}
                                                        <tr>
                                                            <td className="p-2">
                                                                {references
                                                                    .filter(ref => ref.text.trim() !== "")
                                                                    .map((ref) => (
                                                                        <p key={ref.id} className="mb-1">
                                                                            {ref.text}
                                                                        </p>
                                                                    ))}
                                                            </td>
                                                        </tr>

                                                        {/* OTHER REFERENCES LABEL */}
                                                        <tr>
                                                            <td className="p-2 font-bold uppercase">
                                                                OTHER REFERENCES
                                                            </td>
                                                        </tr>

                                                        {/* OTHER REFERENCES */}
                                                        <tr>
                                                            <td className="p-2">
                                                                {otherReferences
                                                                    .filter(ref => ref.text.trim() !== "")
                                                                    .map((ref) => (
                                                                        <p key={ref.id} className="mb-1">
                                                                            {ref.text}
                                                                        </p>
                                                                    ))}
                                                            </td>
                                                        </tr>

                                                        {/* EMPTY SPACE */}
                                                        <tr>
                                                            <td className="p-3 min-h-[40px]">&nbsp;</td>
                                                        </tr>

                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>  

            <AnimatePresence>
                {showDraftSaved && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
                    >
                        <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-bold">
                            <CheckCircle2 size={18} />
                            Draft saved
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <DeleteModal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
            />
        </div>
    );
};

export default Step3;