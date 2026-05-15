import React, { useState, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
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
    // ── Inertia props (present only in edit mode) ────────────────────────────
    const { props } = usePage<{
        isEditMode?: boolean;
        syllabusHash?: string;
        sessionId?: string;
        step1?: {
            course_code?: string;
            course_credit?: number;
            course_title?: string;
            pre_requisites?: string;
            co_requisites?: string;
            course_description?: string;
        };
    }>();

    const isEditMode  = props.isEditMode ?? false;
    const syllabusHash  = props.syllabusHash ?? null;
    const serverStep1 = props.step1 ?? null;

    const [showPreview, setShowPreview] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showSaveToast, setShowSaveToast] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'error' | 'success'>('error');
    const [contextModal, setContextModal] = useState<{ title: string; content: React.ReactNode } | null>(null);

    const campusGoals = [
        "Innovation and continuous improvement; to build a diverse, transparent, inclusive workforce; and reduce the organization's environmental impact.",
        "To offer curricula that are relevant and responsive to the changing needs of the industry and society; the ability of curriculum developers to translate knowledge about new development into curriculum content and structure; to promote critical thinking, a sense of adventure, and an openness to adapt challenges of their future workplace and give them the confidence and skills to continue to adapt; to provide a hierarchical system for grades levels/subjects within aims and objectives for individual lessons.",
        "To increase students' attention, and focus, promote a meaningful learning experience, encourage higher levels of student performance, motivate students to practice higher-order thinking skills; to prepare students to become productive, creative, innovative, and dynamic in their chosen fields of specialization and to provide state of the art facilities of learning to optimize student development; tap potentials of students, faculty, administrative staff, and other stakeholders in formulating policies for institutional development.",
        "To prepare holistic approaches to inculcate appropriate values that are necessary to build a humane, disciplined, nationalist, and independent society and to develop students, physical, emotional, social, and intellectual well-being through providing opportunities for students to learn and grow in all areas of their lives; to create a supportive, inclusive environment where students feel safe and respected; to be active participants in their learning for students to connect with others, build relationships and to help students develop a sense of purpose and direction.",
        "To build a culture of trust, deliver honest feedback, foster open communication, delegate responsibilities and tasks, and support growth opportunities to empower faculty members and employees. Also, to increase productivity and innovation; improve morale and satisfaction; better decision-making; increase engagement with students and clients, and make empowerment part of our university organizations, culture and vision.",
        "To a renowned leader and center of excellence in product utilization research, feasibility study, development, and technology transfer; develop the culture of collaborative research among students, faculty, and employees; to partner with industry and other research institutions in strengthening research capabilities of faculty, employees, and students; to facilitate presentation of research outputs in international fora, their publication in recognized local and international journals; and to develop the culture of collaborative research among students, faculty, and employees.",
        "To contribute to the attainment of Vision, Mission, Goal, and Objectives (VMGO) distinctively include complying with the rules and policies of the Polytechnic University of the Philippines (PUP); striving for academic excellence, participating actively in universities activities, becoming a role model, passing the board exam and conducting research. To maintain and enhance its high academic standards in the performance of its functions of instructions, research, and adaptive community for extension.",
        "To create value for each company and leverage combined expertise by offering students internship partnerships through a Memorandum of Agreement (MOA); undertake outreach and research-based extension programs by tapping all stakeholders; expertise and other resources.",
        "To increase understanding of stakeholder needs and expectations, improve communication and collaboration, and involve all stakeholders in enhancing student, faculty, and employee development programs, build trust and rapport with stakeholders, and get input from stakeholders on critical decisions.",
        "To ensure that our curricula possess Social Development Goals (SDG) such as social equity, justice, diversity, inclusion, democratic participation, empowerment, livelihood security, social well-being, and quality of life; to end poverty, to protect the earth, environment and climate and to ensure that students, educators, and stakeholders can enjoy peace and prosperity; to provide training to students that will enable them to become potent instruments for socio-economic development, produce technologies for commercialization or livelihood improvement, and achieve long-term economic growth.",
    ];

    const MODAL_CONTENT: Record<string, { title: string; content: React.ReactNode }> = {
        vision: {
            title: 'PUP Vision & Mission',
            content: (
                <div className="space-y-5">
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                        <div className="bg-[#800000]/10 px-4 py-2 border-b border-slate-200">
                            <span className="text-xs font-black uppercase tracking-widest text-[#800000]">Vision</span>
                        </div>
                        <div className="px-4 py-3 bg-white">
                            <p className="text-sm font-bold text-slate-800 text-center leading-relaxed">
                                PUP: The National Polytechnic University<br/>
                                <span className="font-normal text-slate-600">(PUP: Pambansang Politeknikong Unibersidad)</span>
                            </p>
                        </div>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                        <div className="bg-[#800000]/10 px-4 py-2 border-b border-slate-200">
                            <span className="text-xs font-black uppercase tracking-widest text-[#800000]">Mission</span>
                        </div>
                        <div className="px-4 py-3 bg-white">
                            <p className="text-sm text-slate-700 leading-relaxed mb-2">Ensuring inclusive and equitable quality education and promoting lifelong learning opportunities through a re-engineered polytechnic university by committing to:</p>
                            <ul className="space-y-1.5 ml-2">
                                {['Provide democratized access to educational opportunities for the holistic development of individuals with global perspective.','Offer industry-oriented curricula that produce highly skilled professionals.','Embed a culture of research and innovation.'].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#800000] shrink-0" />{item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ),
        },
        quality: {
            title: 'Quality Policy Statement',
            content: (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                    <div className="bg-[#800000]/10 px-4 py-2 border-b border-slate-200">
                        <span className="text-xs font-black uppercase tracking-widest text-[#800000]">Quality Policy Statement</span>
                    </div>
                    <div className="px-4 py-4 bg-white">
                        <p className="text-sm text-slate-700 leading-relaxed text-justify italic border-l-4 border-[#800000]/30 pl-4">
                            "The Polytechnic University of the Philippines commits to provide inclusive and equitable quality education and promote lifelong learning opportunities. Toward this end, we, the members of the PUP Community, will vigorously and steadfastly endeavor to continuously improve the standard of university services."
                        </p>
                    </div>
                </div>
            ),
        },
        ilo: {
            title: 'Institutional Learning Outcomes (ILO)',
            content: (
                <div className="space-y-2.5">
                    {[
                        { bold: 'Critical and Creative Thinking', text: 'Graduates use their rational and reflective thinking as well as innovative abilities to life situations in order to push boundaries, realize possibilities, and deepen their interdisciplinary, multidisciplinary, and/or transdisciplinary understanding of the world.' },
                        { bold: 'Effective Communication', text: 'Graduates apply the four macro skills in communication (reading, writing, listening, and speaking), through conventional and digital means, and are able to use these skills in solving problems, making decisions, and articulating thoughts when engaging with people in various circumstances.' },
                        { bold: 'Strong Service Orientation', text: 'Graduates exemplify strong commitment to service excellence for the people, the clientele, industry and other sectors.' },
                        { bold: 'Adept and Responsible Use or Development of Technology', text: 'Graduates demonstrate optimized and responsible use of state-of-the-art technologies of their profession. They possess digital learning abilities, including technical, numerical, and/or technopreneurial skills.' },
                        { bold: 'Passion for Lifelong Learning', text: 'Graduates perform and function in society by taking responsibility in their quest for further improvement through lifelong learning.' },
                        { bold: 'Leadership and Organizational Skills', text: 'Graduates assume leadership roles and become leading professionals in their respective disciplines by equipping them with appropriate organizational skills.' },
                        { bold: 'Personal and Professional Ethics', text: 'Graduates manifest integrity and adherence to moral and ethical principles in their personal and professional circumstances.' },
                        { bold: 'Resilience and Agility', text: 'Graduates demonstrate flexibility and the growth mindset to adapt and thrive in the volatile, uncertain, complex and ambiguous (VUCA) environment.' },
                        { bold: 'National and Global Responsiveness', text: 'Graduates exhibit a deep sense of nationalism as it complements the need to live as part of the global community where diversity is respected. They promote and fulfill various advocacies for human and social development.' },
                    ].map((ilo, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="flex-none w-5 h-5 rounded-full bg-[#800000] text-white text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                            <p className="text-sm text-slate-700 leading-relaxed"><span className="font-bold text-slate-900">{ilo.bold}.</span> {ilo.text}</p>
                        </div>
                    ))}
                </div>
            ),
        },
        campus: {
            title: 'College / Campus Goals',
            content: (
                <div className="space-y-2.5">
                    {campusGoals.map((goal, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="flex-none w-5 h-5 rounded-full bg-[#800000] text-white text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                            <p className="text-sm text-slate-700 leading-relaxed">{goal}</p>
                        </div>
                    ))}
                </div>
            ),
        },
        programgoals: {
            title: 'Program Goals',
            content: (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                    <div className="bg-[#800000]/10 px-4 py-2 border-b border-slate-200">
                        <span className="text-xs font-black uppercase tracking-widest text-[#800000]">BSIT Program Goals</span>
                    </div>
                    <div className="px-4 py-4 bg-white">
                        <p className="text-sm text-slate-700 leading-relaxed text-justify">
                            The Bachelor of Science in Information Technology (BSIT) program is a four-year degree program which focuses on the study of computer utilization and computer software to plan, install, customize, operate, manage, administer and maintain information technology infrastructure. It likewise deals with the design and development of computer-based information systems for real-world business solutions. The program prepares students to become IT professionals with primary competencies in the areas of systems analysis and design, applications development, database administration, network administration, and systems implementation and maintenance. The program also requires a Capstone project. It should be in the form of an IT applications development as a business solution for an industry need.
                        </p>
                    </div>
                </div>
            ),
        },
        programobj: {
            title: 'Program Objectives',
            content: (
                <div className="space-y-2.5">
                    {[
                        'To introduce students to current technologies and tools while learning new methodologies that will lead to the development of better information systems.',
                        'To enable students to understand the different components of the information technology field, including hardware, software, communication, networking, research, peopleware and management skills.',
                        'To demonstrate awareness of how to methodically and practically approach a variety of technological and managerial issues to ultimately improve business strategies and attain competitive advantage.',
                        'To inculcate to students the essential virtues and attitudes, as well as develop necessary knowledge and competency levels required of an information technology professional.',
                        "To train students to systematically analyze and evaluate organizational systems and processes in order to recommend software solutions that properly address the organization's needs and goals.",
                    ].map((obj, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="flex-none w-5 h-5 rounded-full bg-[#800000] text-white text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                            <p className="text-sm text-slate-700 leading-relaxed">{obj}</p>
                        </div>
                    ))}
                </div>
            ),
        },
    };

    const openContextModal = (key: string) => {
        const entry = MODAL_CONTENT[key];
        if (entry) setContextModal(entry);
    };

    const Font = ReactQuill.Quill.import('formats/font') as any;

    Font.whitelist = [
        'sans-serif',
        'serif',
        'monospace'
    ];

    ReactQuill.Quill.register(Font, true);

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

    const sessionId = isEditMode
        ? (props.sessionId ?? sessionStorage.getItem('syllabus_session_id'))
        : sessionStorage.getItem('syllabus_session_id');

    const storageKey = sessionId
        ? `syllabus_step1_${sessionId}`
        : null;

    const { data, setData, post, processing, errors } = useForm(() => {
        // 1. Always check sessionStorage first (covers both create and edit-mode
        //    in-progress drafts so going back preserves unsaved changes)
        const saved = storageKey ? sessionStorage.getItem(storageKey) : null;
        if (saved) {
            try { return JSON.parse(saved); } catch { /* fall through */ }
        }

        // 2. Edit mode with no sessionStorage draft yet → seed from server data
        if (isEditMode && serverStep1 && Object.keys(serverStep1).length > 0) {
            return {
                course_code:        serverStep1.course_code        ?? '',
                course_credit:      serverStep1.course_credit      ?? 3,
                course_title:       serverStep1.course_title       ?? '',
                pre_requisites:     serverStep1.pre_requisites     ?? '',
                co_requisites:      serverStep1.co_requisites      ?? '',
                course_description: serverStep1.course_description ?? '',
            };
        }

        // 3. Blank defaults (create mode, no draft)
        return {
            course_code: '',
            course_credit: 3,
            course_title: '',
            pre_requisites: '',
            co_requisites: '',
            course_description: '',
        };
    });

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
        setShowPreview(true);
    };

    const handleCancel = () => {
        setShowCancelModal(true);
    };

    const confirmCancel = () => {
        const uuid = sessionStorage.getItem('syllabus_uuid');

        if (uuid) {
            sessionStorage.removeItem(`syllabus_step1_${uuid}`);
            sessionStorage.removeItem(`syllabus_step2_${uuid}`);
            sessionStorage.removeItem(`syllabus_step3_${uuid}`);
            sessionStorage.removeItem(`syllabus_step4_${uuid}`);
            sessionStorage.removeItem(`syllabus_step5_${uuid}`);
            sessionStorage.removeItem(`syllabus_step6_${uuid}`);
        }

        router.visit(route('dashboard'));
    };

    const closeCancelModal = () => {
        setShowCancelModal(false);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = validateStep1(data);

        console.log({
            isEditMode,
            syllabusHash
        });

        if (Object.keys(validationErrors).length > 0) {
            setLocalErrors(validationErrors);
            setAlertMessage("Please complete all required fields.");
            setAlertType("error");
            return;
        }

        if (isEditMode && syllabusHash) {
            // Persist sessionId and current step draft
            if (sessionId) sessionStorage.setItem('syllabus_session_id', sessionId);
            if (storageKey) {
                sessionStorage.setItem(storageKey, JSON.stringify(data));
            }

            // Navigate to hashed Step 2 edit route
            router.visit(
                route('syllabus.step2.edit', {
                    hash: syllabusHash,
                })
            );

            return;
        }

        if (!storageKey) {
            console.warn("Missing session ID");
            return;
        }

        sessionStorage.setItem(storageKey, JSON.stringify(data));

        router.visit(route('syllabus.step2'));
    };

    useEffect(() => {
        // Auto-save to sessionStorage in both create AND edit mode
        // so navigating back always restores the latest in-progress changes.
        if (!storageKey) return;

        const timeout = setTimeout(() => {
            sessionStorage.setItem(storageKey, JSON.stringify(data));

            setShowSaveToast(true);
            setTimeout(() => setShowSaveToast(false), 2000);
        }, 1000);

        return () => clearTimeout(timeout);
    }, [data]);

    return (
        <div className="min-h-screen bg-[#F3F4F6] font-poppins selection:bg-[#800000]/20 pb-32">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                .ql-toolbar.ql-snow { border: none !important; background-color: #F8FAFC !important; border-bottom: 1px solid #E2E8F0 !important; }
                .ql-container.ql-snow { 
                    border: none !important; 
                    height: 180px; 
                    font-family: 'Poppins', sans-serif !important; 
                }

                .ql-font-serif {
                    font-family: Georgia, Times New Roman, serif !important;
                }

                .ql-font-monospace {
                    font-family: monospace !important;
                }

                .ql-font-sans-serif {
                    font-family: Arial, Helvetica, sans-serif !important;
                }
                
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                
                @page {
                    margin: 0;
                }

                @media print {
                    body {
                        margin: 0;
                    }
                }

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

                /* QUILL CONTENT STYLING FOR PDF PREVIEW */

                .ql-editor {
                    font-size: 12px;
                    line-height: 1.7;
                    color: black;
                }

                .ql-editor p {
                    margin-bottom: 8px;
                }

                .ql-editor ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin-bottom: 10px;
                }

                .ql-editor ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin-bottom: 10px;
                }

                .ql-editor li {
                    margin-bottom: 4px;
                }

                .ql-editor .ql-align-center {
                    text-align: center;
                }

                .ql-editor .ql-align-right {
                    text-align: right;
                }

                .ql-editor .ql-align-justify {
                    text-align: justify;
                }

                .ql-editor .ql-align-left {
                    text-align: left;
                }

                /* FONT SUPPORT */

                .ql-font-serif {
                    font-family: Georgia, Times New Roman, serif;
                }

                .ql-font-monospace {
                    font-family: monospace;
                }

                /* FONT DROPDOWN LABELS */

                .ql-snow .ql-picker.ql-font .ql-picker-label::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item::before {
                    content: attr(data-value);
                }

                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="sans-serif"]::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="sans-serif"]::before {
                    content: "Sans Serif";
                }

                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="serif"]::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="serif"]::before {
                    content: "Serif";
                }

                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="monospace"]::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="monospace"]::before {
                    content: "Monospace";
                }

                /* INDENTATION */

                .ql-indent-1 {
                    padding-left: 3em;
                }

                .ql-indent-2 {
                    padding-left: 6em;
                }

                .ql-indent-3 {
                    padding-left: 9em;
                }

                /* TEXT FORMATTING */

                .ql-editor strong {
                    font-weight: bold;
                }

                .ql-editor em {
                    font-style: italic;
                }

                .ql-editor u {
                    text-decoration: underline;
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
                            <h3 className="font-extrabold text-lg border-b pb-3 mb-4 flex items-center gap-2 text-[#800000]">
                                Institutional Context
                            </h3>
                            <div className="space-y-2.5 mb-4">
                                {[
                                    { title: 'PUP Vision & Mission',                 icon: <ScrollText size={15} className="text-[#800000] shrink-0" />,   key: 'vision' },
                                    { title: 'Quality Policy Statement',              icon: <ScrollText size={15} className="text-[#800000] shrink-0" />,   key: 'quality' },
                                    { title: 'Institutional Learning Outcomes (ILO)', icon: <GraduationCap size={15} className="text-[#800000] shrink-0" />, key: 'ilo' },
                                    { title: 'Campus Goals',                          icon: <ListChecks size={15} className="text-[#800000] shrink-0" />,   key: 'campus' },
                                    { title: 'Program Goals',                         icon: <BookOpen size={15} className="text-[#800000] shrink-0" />,     key: 'programgoals' },
                                    { title: 'Program Objectives',                    icon: <CheckCircle2 size={15} className="text-[#800000] shrink-0" />, key: 'programobj' },
                                ].map(({ title, icon, key }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => openContextModal(key)}
                                        className="w-full p-3 bg-slate-50 hover:bg-[#800000]/5 rounded-xl border border-slate-200 hover:border-[#800000]/30 flex items-center justify-between transition-all group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            {icon}
                                            <span className="text-[10px] md:text-xs font-bold text-slate-700 text-left">{title}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[9px] text-[#800000] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                                            <ChevronRight size={13} className="text-[#800000]" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="border-t border-dashed border-slate-200 pt-3">
                                <p className="text-[10px] text-slate-400 italic text-center leading-relaxed">
                                    These will be inserted automatically with the generated syllabus.
                                </p>
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
                                                        className="ql-editor wrap-break-word"
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

                                    {/* Institutional Context Table */}
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
                                                        <li>offer industry-oriented curricula that produce highly skilled professionals</li>
                                                        <li>embed a culture of research and innovation</li>
                                                    </ul>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="label-cell">QUALITY STATEMENT POLICY</td>
                                                <td className="value-cell text-justify">
                                                    The Polytechnic University of the Philippines commits to provide inclusive and equitable quality education and promote lifelong learning opportunities. Toward this end, we, the members of the PUP Community, will vigorously and steadfastly endeavor to continuously improve the standard of university services.
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="label-cell">INSTITUTIONAL LEARNING OUTCOMES (ILO)</td>
                                                <td className="value-cell">
                                                    <ol className="list-decimal ml-5 space-y-1">
                                                        <li><strong>Critical and Creative Thinking</strong> – Graduates use their rational and reflective thinking as well as innovative abilities to life situations in order to push boundaries, realize possibilities, and deepen their interdisciplinary, multidisciplinary, and/or transdisciplinary understanding of the world.</li>
                                                        <li><strong>Effective Communication</strong> – Graduates apply the four macro skills in communication (reading, writing, listening, and speaking), through conventional and digital means, and are able to use these skills in solving problems, making decisions, and articulating thoughts when engaging with people in various circumstances.</li>
                                                        <li><strong>Strong Service Orientation</strong> – Graduates exemplify strong commitment to service excellence for the people, the clientele, industry and other sectors.</li>
                                                        <li><strong>Adept and Responsible Use or Development of Technology</strong> – Graduates demonstrate optimized and responsible use of state-of-the-art technologies of their profession. They possess digital learning abilities, including technical, numerical, and/or technopreneurial skills.</li>
                                                        <li><strong>Passion for Lifelong Learning</strong> – Graduates perform and function in society by taking responsibility in their quest for further improvement through lifelong learning.</li>
                                                        <li><strong>Leadership and Organizational Skills</strong> – Graduates assume leadership roles and become leading professionals in their respective disciplines by equipping them with appropriate organizational skills.</li>
                                                        <li><strong>Personal and Professional Ethics</strong> – Graduates manifest integrity and adherence to moral and ethical principles in their personal and professional circumstances.</li>
                                                        <li><strong>Resilience and Agility</strong> – Graduates demonstrate flexibility and the growth mindset to adapt and thrive in the volatile, uncertain, complex and ambiguous (VUCA) environment.</li>
                                                        <li><strong>National and Global Responsiveness</strong> – Graduates exhibit a deep sense of nationalism as it complements the need to live as part of the global community where diversity is respected. They promote and fulfill various advocacies for human and social development.</li>
                                                    </ol>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="label-cell">COLLEGE / CAMPUS GOALS</td>
                                                <td className="value-cell">
                                                    <ol className="list-decimal ml-5 space-y-1">
                                                        {campusGoals.map((goal, i) => (
                                                            <li key={i}>{goal}</li>
                                                        ))}
                                                    </ol>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="label-cell">PROGRAM GOALS</td>
                                                <td className="value-cell text-justify">
                                                    The Bachelor of Science in Information Technology (BSIT) program is a four-year degree program which focuses on the study of computer utilization and computer software to plan, install, customize, operate, manage, administer and maintain information technology infrastructure. It likewise deals with the design and development of computer-based information systems for real-world business solutions. The program prepares students to become IT professionals with primary competencies in the areas of systems analysis and design, applications development, database administration, network administration, and systems implementation and maintenance. The program also requires a Capstone project. It should be in the form of an IT applications development as a business solution for an industry need.
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="label-cell">PROGRAM OBJECTIVES</td>
                                                <td className="value-cell">
                                                    <ol className="list-decimal ml-5 space-y-1">
                                                        <li>To introduce students to current technologies and tools while learning new methodologies that will lead to the development of better information systems.</li>
                                                        <li>To enable students to understand the different components of the information technology field, including hardware, software, communication, networking, research, peopleware and management skills.</li>
                                                        <li>To demonstrate awareness of how to methodically and practically approach a variety of technological and managerial issues to ultimately improve business strategies and attain competitive advantage.</li>
                                                        <li>To inculcate to students the essential virtues and attitudes, as well as develop necessary knowledge and competency levels required of an information technology professional.</li>
                                                        <li>To train students to systematically analyze and evaluate organizational systems and processes in order to recommend software solutions that properly address the organization's needs and goals.</li>
                                                    </ol>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Institutional Context Modal ───────────────────────────────── */}
            <AnimatePresence>
                {contextModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setContextModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 16 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[82vh] flex flex-col overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-[#800000] px-5 py-4 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2.5 text-white">
                                    <BookOpen size={17} />
                                    <span className="font-bold text-sm">{contextModal.title}</span>
                                </div>
                                <button type="button" onClick={() => setContextModal(null)} className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-all">
                                    <X size={19} />
                                </button>
                            </div>
                            <div className="overflow-y-auto p-5 flex-1 scrollbar-hide">
                                {contextModal.content}
                            </div>
                            <div className="px-5 py-3 border-t border-slate-100 shrink-0 flex justify-end bg-slate-50/60">
                                <button type="button" onClick={() => setContextModal(null)} className="px-4 py-2 rounded-lg bg-[#800000] text-white text-xs font-bold hover:bg-[#600000] transition-all active:scale-95">
                                    Close
                                </button>
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