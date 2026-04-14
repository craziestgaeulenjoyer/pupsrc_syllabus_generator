import Navbar from '../navbar_layouts/Navbar';
import { Head } from '@inertiajs/react';
import { router } from "@inertiajs/react";
import { useState, useEffect, useRef } from 'react';
import FilterDropdown from '../modals_section/Filter';
import SortDropdown from '../modals_section/Sort';
import FileOptionsDropdown from '../modals_section/File_option';
import RenameModal from '../modals_section/Rename';
import PageSpacer from '../pagespacer_layout/PageSpacer';
import DeleteModal from '../modals_section/DeleteConfirmation';

export default function Dashboard() {
    const [isGrid, setIsGrid] = useState(true);
    const [isDetailed, setIsDetailed] = useState(false);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [tempDateFilter, setTempDateFilter] = useState("");
    const [tempDepartmentFilter, setTempDepartmentFilter] = useState("");
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [dateSort, setDateSort] = useState("");
    const [deptSort, setDeptSort] = useState("");
    const [tempDateSort, setTempDateSort] = useState("");
    const [tempDeptSort, setTempDeptSort] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [renameOpen, setRenameOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const isFilterActive = dateFilter !== "" || departmentFilter !== "";
    const isSortApplied = dateSort !== "" || deptSort !== "";
    

    const syllabuses = [
        { id: 1, name: "BSBA-MM 2026 - Syllabus", date: "January 8, 2026 8:30 AM", type: "PDF", department: "BSBA-MM" },
        { id: 2, name: "BSIT 2026 - Syllabus", date: "February 8, 2026 9:00 PM", type: "Excel", department: "BSIT" },
        { id: 3, name: "BSIT 2026 - Syllabus", date: "February 8, 2026 9:00 PM", type: "Docx", department: "BSIT" },
        { id: 4, name: "BSIE 2026 - Syllabus", date: "February 8, 2026 9:00 PM", type: "Excel", department: "BSIE" },
        { id: 5, name: "BSBA-HRM 2026 - Syllabus", date: "January 8, 2026 8:30 AM", type: "Docx", department: "BSBA-HRM" },
        { id: 6, name: "BSIT 2026 - Syllabus", date: "February 8, 2026 9:00 PM", type: "PDF", department: "BSIT" },
        { id: 7, name: "BSIT 2026 - Syllabus", date: "February 8, 2026 9:00 PM", type: "PDF", department: "BSIT" },
        { id: 8, name: "BSIE 2026 - Syllabus", date: "February 8, 2026 9:00 PM", type: "Excel", department: "BSIE" },
    ];

    const filteredSyllabuses = syllabuses
        .filter((file) => {
            const matchesDepartment =
                !departmentFilter || file.department === departmentFilter;

            const matchesDate =
                !dateFilter ||
                new Date(file.date).toISOString().split("T")[0] === dateFilter;

            const matchesSearch =
                file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                file.department.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesType =
                !selectedType || file.type === selectedType;

            return matchesDepartment && matchesDate && matchesSearch && matchesType;
        })
        .sort((a, b) => {
            // PRIORITY: Department sort first
            if (deptSort) {
                return deptSort === "asc"
                    ? a.department.localeCompare(b.department)
                    : b.department.localeCompare(a.department);
            }

            // Then Date sort
            if (dateSort) {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();

                return dateSort === "asc" ? dateA - dateB : dateB - dateA;
            }

            return 0;
    });

    const isFilterApplied = dateFilter !== "" || departmentFilter !== "";
    const isFilterOpenState = isFilterOpen;

    const getIcon = (type: string) => {
        if (type === "PDF")
            return "https://img.icons8.com/?size=100&id=mcyAsTDJNTI9&format=png&color=000000";
        if (type === "Excel")
            return "https://img.icons8.com/color/96/microsoft-excel-2019.png";
        if (type === "Docx")
            return "https://img.icons8.com/color/96/microsoft-word-2019.png";
    };
    
    useEffect(() => {
    const link = document.createElement("link");
    link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
         
        if(hour<12) return "Good morning";
        if(hour<18) return "Good afternoon";
        return "Good evening";
    };

return (
    <div className="min-h-screen bg-slate-50">
        <Head title="Dashboard" />
        <Navbar />

        <main className="pt-24 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <header className="mb-8">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                            PUP SRC Syllabus Generator
                    </h1>
                    <p className="text-slate-500 mt-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                            {getGreeting()}, Macy! Manage your academic syllabi efficiently.
                    </p>
                </header>

                    {/* SEARCH + OPTIONS  AREA*/}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6" style={{ fontFamily: "Poppins, sans-serif" }}>

                        {/* SEARCH */}
                        <div className="relative w-full md:max-w-lg group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-[#8EC1FB] transition-all duration-200 
                                group-focus-within:bg-[#8EC1FB] 
                                group-focus-within:shadow-lg 
                                group-focus-within:shadow-black/30"
                            >
                                <img
                                    src="https://img.icons8.com/?size=100&id=W0xu6u7K9A0F&format=png&color=737373"
                                    className="w-4 h-4 transition-all duration-200 group-focus-within:brightness-0 group-focus-within:invert"
                                />
                            </div>

                            {/* INPUT */}
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for syllabus name or department..."
                                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[#8EC1FB] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8EC1FB]"
                            />
                        </div>

                        {/* OPTIONS CARD AREA */}
                        <div className="bg-white border border-red-800 rounded-lg p-4 shadow-sm w-full md:w-[320px]">

                            {/* VIEW MODE */}
                            <div className="flex flex-col gap-2 mb-3">
                                <span className="font-bold text-sm">View Mode</span>

                                <div className="flex items-center gap-3 text-xs text-gray-700">
                                    <span>Column</span>

                                    <label className="relative inline-block w-10 h-5">
                                        <input
                                            type="checkbox"
                                            checked={isGrid}
                                            onChange={() => setIsGrid(!isGrid)}
                                            className="opacity-0 w-0 h-0 peer"
                                        />
                                        <span className="absolute inset-0 bg-gray-300 rounded-full transition peer-checked:bg-red-800"></span>
                                        <span className="absolute left-1 bottom-1 w-3.5 h-3.5 bg-white rounded-full transition peer-checked:translate-x-5"></span>
                                    </label>

                                    <span className="flex items-center gap-1">
                                        Grid
                                        <img
                                            src="https://img.icons8.com/?size=100&id=RbvvCrbVx1iK&format=png"
                                            className="w-3 h-3"
                                        />
                                    </span>
                                </div>
                            </div>

                            <hr className="my-3" />

                            {/* FILE TYPE DISPLAY */}
                            <div className="flex flex-col gap-2">
                                <span className="font-bold text-sm">File Type Display</span>

                                <div className="flex items-center gap-3 text-xs text-gray-700">
                                    <span>Simple</span>

                                    <label className="relative inline-block w-10 h-5">
                                        <input
                                            type="checkbox"
                                            checked={isDetailed}
                                            onChange={() => {
                                                    setIsDetailed(!isDetailed);
                                                    if (isDetailed) {
                                                        setSelectedType(null);
                                                    }
                                                }}
                                            className="opacity-0 w-0 h-0 peer"
                                        />
                                        <span className="absolute inset-0 bg-gray-300 rounded-full transition peer-checked:bg-red-800"></span>
                                        <span className="absolute left-1 bottom-1 w-3.5 h-3.5 bg-white rounded-full transition peer-checked:translate-x-5"></span>
                                    </label>

                                    <span>Detailed</span>
                                </div>
                            </div>

                            {/* MINI PREVIEW */}
                            {isDetailed && (
                                <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-center">

                                    {/* PDF */}
                                    <div
                                        onClick={() =>
                                            setSelectedType(selectedType === "PDF" ? null : "PDF")
                                        }
                                        className={`p-2 rounded-md border border-[#c7c7c7] cursor-pointer transition
                                            ${selectedType === "PDF"
                                                ? "bg-[#800000] text-white font-bold"
                                                : "bg-gray-50 hover:bg-[#800000]/30 hover:text-white hover:font-bold hover:border-[#800000]/30 hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                                            }`}
                                    >
                                        <img src={getIcon("PDF")} className="w-5 mx-auto mb-1" />
                                        PDF
                                    </div>

                                    {/* WORD */}
                                    <div
                                        onClick={() =>
                                            setSelectedType(selectedType === "Docx" ? null : "Docx")
                                        }
                                        className={`p-2 rounded-md border border-[#c7c7c7] cursor-pointer transition
                                            ${selectedType === "Docx"
                                                ? "bg-[#800000] text-white font-bold"
                                                : "bg-gray-50 hover:bg-[#800000]/30 hover:text-white hover:font-bold hover:border-[#800000]/30 hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                                            }`}
                                    >
                                        <img src={getIcon("Docx")} className="w-5 mx-auto mb-1" />
                                        Word
                                    </div>

                                    {/* EXCEL */}
                                    <div
                                        onClick={() =>
                                            setSelectedType(selectedType === "Excel" ? null : "Excel")
                                        }
                                        className={`p-2 rounded-md border border-[#c7c7c7] cursor-pointer transition
                                            ${selectedType === "Excel"
                                                ? "bg-[#800000] text-white font-bold"
                                                : "bg-gray-50 hover:bg-[#800000]/30 hover:text-white hover:font-bold hover:border-[#800000]/30 hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                                            }`}
                                    >
                                        <img src={getIcon("Excel")} className="w-5 mx-auto mb-1" />
                                        Excel
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>

                    {/* RECENT HEADER (NO MODALS) */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6" style={{ fontFamily: "Poppins, sans-serif" }}>
                        <h2 className="text-red-800 font-extrabold text-xl md:text-2xl">
                            Recent Syllabus
                        </h2>

                        {/* JUST BUTTONS (NO MODALS) */}
                        <div className="flex gap-3">
                            {/* Sort Button */}
                            <button
                                onClick={() => setIsSortOpen(true)}
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl border transition text-sm shadow-sm hover:shadow-md
                                    ${
                                        isSortOpen || isSortApplied
                                            ? "bg-[#800000] text-white border-[#800000]"
                                            : "bg-white text-gray-700 border-[#c7c7c7]"
                                    }
                                `}
                            >
                            <img
                                src="https://img.icons8.com/?size=100&id=69881&format=png&color=4b5563"
                                className="w-4 h-4"
                                style={{
                                    filter: (isSortOpen || isSortApplied)
                                        ? "brightness(0) invert(1)"
                                        : "none"
                                }}
                            />
                                Sort By
                            </button>

                            {/* Filter Button */}
                            <button
                            onClick={() => setIsFilterOpen(true)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl border transition text-sm shadow-sm hover:shadow-md
                                ${
                                isFilterOpen || isFilterApplied
                                    ? "bg-[#800000] text-white border-[#800000]"
                                    : "bg-white text-gray-700 border-[#c7c7c7]"
                                }`
                            }
                            >
                            <img
                            src="https://img.icons8.com/?size=100&id=69913&format=png"
                            className="w-4 h-4"
                            style={{
                                filter: (isFilterOpen || isFilterApplied)
                                ? "brightness(0) invert(1)"
                                : "none"
                            }}
                            />
                                Filter
                            </button>

                            <div className="relative">
                            <FilterDropdown
                            open={isFilterOpen}
                            onClose={() => setIsFilterOpen(false)}
                            date={tempDateFilter}
                            setDate={setTempDateFilter}
                            department={tempDepartmentFilter}
                            setDepartment={setTempDepartmentFilter}
                                onApply={() => {
                                setDateFilter(tempDateFilter);
                                setDepartmentFilter(tempDepartmentFilter);
                                setIsFilterOpen(false);
                                }}
                                onReset={() => {
                                setTempDateFilter("");
                                setTempDepartmentFilter("");

                                setDateFilter("");
                                setDepartmentFilter("");

                                setIsFilterOpen(false);
                                }}
                            />
                            </div>
                            <div className="relative">
                                <SortDropdown
                            open={isSortOpen}
                            onClose={() => setIsSortOpen(false)}
                            dateSort={tempDateSort}
                            setDateSort={setTempDateSort}
                            deptSort={tempDeptSort}
                            setDeptSort={setTempDeptSort}
                            onApply={() => {
                                setDateSort(tempDateSort);
                                setDeptSort(tempDeptSort);
                                setIsSortOpen(false);
                            }}
                            onReset={() => {
                                setTempDateSort("");
                                setTempDeptSort("");

                                setDateSort("");
                                setDeptSort("");

                                setIsSortOpen(false);
                            }}
                        />
                            </div>
                        </div>
                    </div>

                    {/* SYLLABUS CARDS GRID (LIKE YOUR IMAGE) */}
                    {filteredSyllabuses.length === 0 ? (
                        <div className="flex items-center justify-center min-h-[300px] w-full" style={{ fontFamily: "Poppins, sans-serif" }}>
                        <div className="flex flex-col items-center justify-center text-center">
                            <img
                            src="https://img.icons8.com/?size=100&id=xIe14rYy1ngM&format=png&color=64748b"
                            width="40"
                            className="mb-2"
                            />
                            <p className="text-gray-500">No syllabus found.</p>
                        </div>
                        </div>
                    ) : (
                        isGrid ? (
                            // ================= GRID VIEW =================
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredSyllabuses.map((file) => (
                                <div
                                key={file.id}
                                onClick={(e) => {
                                    if ((e.target as HTMLElement).closest(".file-menu")) return;

                                                if (file.type === "PDF") {
                                                    router.visit(`/viewer/${file.id}`);
                                                }
                                            }}
                                className="rounded-2xl overflow-visible shadow-md hover:shadow-xl transition bg-white"
                                >
                                <div
                                    className="relative h-44 bg-cover bg-center flex items-center justify-center rounded-t-2xl"
                                    style={{
                                    backgroundImage: "url('/images/pup_background_card.jpg')"
                                    }}
                                >
                                    <div className="absolute inset-0 bg-[#C2504F]/25 rounded-t-2xl"></div>

                                    <img
                                    src={getIcon(file.type)}
                                    className="relative w-20 drop-shadow-lg"
                                    />
                                </div>

                                <div className="p-3 flex justify-between items-center">
                                    <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-gray-800 truncate">
                                        {file.name}
                                    </h4>
                                    <p className="text-xs text-gray-500">
                                        {file.date}
                                    </p>
                                    </div>

                                    <div className="relative">
                                    <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // ✅ prevents card click
                                                setOpenMenuId(openMenuId === file.id ? null : file.id);
                                            }}
                                        className="p-1 hover:bg-gray-100 rounded px-2"
                                    >
                                        <img
                                        src="https://img.icons8.com/?size=100&id=102729&format=png"
                                        className="w-4 h-4"
                                        />
                                    </button>

                                    <FileOptionsDropdown
                                        open={openMenuId === file.id}
                                        onClose={() => setOpenMenuId(null)}
                                        onEdit={() => {
                                        console.log("Edit", file.id);
                                        setOpenMenuId(null);
                                        }}
                                        onRename={() => {
                                            setSelectedFile(file);
                                            setRenameOpen(true);
                                            setOpenMenuId(null);
                                        }}
                                        onDelete={() => {
                                            setSelectedFile(file); 
                                            setDeleteOpen(true); 
                                            setOpenMenuId(null);
                                        }}
                                    />
                                    </div>
                                </div>
                                </div>
                            ))}
                                <RenameModal
                                    open={renameOpen}
                                    currentName={selectedFile?.title}
                                    onClose={() => setRenameOpen(false)}
                                    onConfirm={(newName) => {
                                        console.log("Rename:", selectedFile.id, newName);
                                        setRenameOpen(false);
                                    }}
                                />
                                <DeleteModal
                                    open={deleteOpen}
                                    onClose={() => setDeleteOpen(false)}
                                    onConfirm={() => {
                                        console.log("Delete:", selectedFile.id);

                                        // 👉 TODO: delete logic here

                                        setDeleteOpen(false);
                                    }}
                                />
                            </div>
                        ) : (
                            // ================= LIST VIEW =================
                            <div className="space-y-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                                {filteredSyllabuses.map((file) => {
                                    const formattedDate = new Date(file.date).toLocaleDateString("en-US", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    });

                                    return (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between bg-white border border-[#c7c7c7] rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition relative"
                                        >
                                            {/* LEFT SIDE */}
                                            <div className="flex items-center gap-4 min-w-0">
                                                <img src={getIcon(file.type)} className="w-8 h-8" />

                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 truncate">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formattedDate}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* RIGHT SIDE (OPTIONS MENU) */}
                                            <div className="relative file-menu">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === file.id ? null : file.id);
                                                    }}
                                                    className="p-1 hover:bg-gray-100 rounded px-2"
                                                >
                                                    <img
                                                        src="https://img.icons8.com/?size=100&id=102729&format=png"
                                                        className="w-4 h-4"
                                                    />
                                                </button>

                                                <FileOptionsDropdown
                                                    open={openMenuId === file.id}
                                                    onClose={() => setOpenMenuId(null)}
                                                    onEdit={() => {
                                                        console.log("Edit", file.id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    onRename={() => {
                                                        setSelectedFile(file);   
                                                        setRenameOpen(true);    
                                                        setOpenMenuId(null); 
                                                    }}
                                                    onDelete={() => {
                                                        setSelectedFile(file);   
                                                        setDeleteOpen(true);
                                                        setOpenMenuId(null);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                    <RenameModal
                                        open={renameOpen}
                                        currentName={selectedFile?.title}
                                        onClose={() => setRenameOpen(false)}
                                        onConfirm={(newName) => {
                                            console.log("Rename:", selectedFile.id, newName);
                                            setRenameOpen(false);
                                        }}
                                    />
                                    <DeleteModal
                                        open={deleteOpen}
                                        onClose={() => setDeleteOpen(false)}
                                        onConfirm={() => {
                                            console.log("Delete:", selectedFile.id);
                                            setDeleteOpen(false);
                                        }}
                                    />
                            </div>
                        )
                    )}
                </div>
            </main>
            <PageSpacer/>
        </div>
    );
}