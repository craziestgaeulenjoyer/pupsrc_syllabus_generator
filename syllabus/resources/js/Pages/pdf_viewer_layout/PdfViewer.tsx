import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { router } from "@inertiajs/react";

// Worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { CircleArrowDown, CircleArrowLeft, Files, FileText, Printer } from "lucide-react";

export default function PdfViewer({ file }: any) {
  const [numPages, setNumPages]         = useState<number | null>(null);
  const [pageNumber, setPageNumber]     = useState(1);
  const [loadingError, setLoadingError] = useState(false);
  const [scale, setScale]               = useState(1.0);
  const [isDarkMode, setIsDarkMode]     = useState(false);

  const pageRefs         = useRef<Record<number, HTMLDivElement | null>>({});
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef        = useRef<HTMLIFrameElement>(null);

  // true = render HTML syllabus from DB, false = render static PDF
  const isHtmlMode = !!file?.syllabusHtml;

  // --- SCROLL LISTENER (PDF mode only) ---
  useEffect(() => {
    if (isHtmlMode) return;
    const container = mainContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const mid = container.scrollTop + container.clientHeight / 2;
      for (let i = 1; i <= (numPages || 0); i++) {
        const el = pageRefs.current[i];
        if (el && mid >= el.offsetTop && mid <= el.offsetTop + el.offsetHeight) {
          setPageNumber(i);
          break;
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages, isHtmlMode]);

  const scrollToPage = (index: number) => {
    setPageNumber(index);
    pageRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoadingError(false);
  }

  const handleZoomIn    = () => setScale(p => Math.min(p + 0.2, 3.0));
  const handleZoomOut   = () => setScale(p => Math.max(p - 0.2, 0.5));
  const handleResetZoom = () => setScale(1.0);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  // Download: HTML → blob, PDF → anchor download
  const handleDownload = () => {
    if (isHtmlMode && file.syllabusHtml) {
      const blob = new Blob([file.syllabusHtml], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${file.name ?? "syllabus"}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (file?.url) {
      const a    = document.createElement("a");
      a.href     = file.url;
      a.download = `${file.name ?? "syllabus"}.pdf`;
      a.click();
    }
  };

  if (!file) {
    return (
      <div className="flex h-screen items-center justify-center">
        No file data provided.
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
        isDarkMode ? "bg-[#121212] text-white" : "bg-[#f4f4f7] text-gray-900"
      }`}
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      {/* Hidden iframe for printing PDF mode */}
      {!isHtmlMode && file.url && (
        <iframe ref={iframeRef} src={file.url} style={{ display: "none" }} title="pdf-print-frame" />
      )}

      {/* ── 1. LEFT SIDEBAR ── */}
      <div
        className={`hidden lg:flex w-64 border-r flex-col shadow-sm transition-colors duration-300 ${
          isDarkMode ? "bg-[#1e1e1e] border-gray-800" : "bg-white border-gray-200"
        }`}
      >
        <div
          className={`h-16 flex items-center px-4 border-b shrink-0 ${
            isDarkMode ? "border-gray-800" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Files className={`w-4 h-4 stroke-current ${isDarkMode ? "text-white" : "text-black"}`} />
            <h2 className={`text-xs tracking-widest ${isDarkMode ? "text-gray-300" : "text-black"}`}>
              {isHtmlMode ? "Sections" : "Page Previews"}
            </h2>
          </div>
        </div>

        <div
          className={`flex-1 overflow-y-auto p-4 space-y-6 ${
            isDarkMode ? "bg-[#181818]" : "bg-gray-50"
          }`}
        >
          {isHtmlMode ? (
            /* HTML mode: section anchor links */
            <SyllabusNavLinks isDarkMode={isDarkMode} iframeRef={iframeRef} />
          ) : (
            /* PDF mode: page thumbnails */
            <Document file={file.url} onLoadSuccess={onDocumentLoadSuccess}>
              {numPages &&
                Array.from(new Array(numPages), (_, index) => (
                  <div key={`thumb_${index + 1}`} className="flex flex-col items-center">
                    <div
                      id={`thumb-box-${index + 1}`}
                      onClick={() => scrollToPage(index + 1)}
                      className={`cursor-pointer transition-all border-4 rounded-sm ${
                        pageNumber === index + 1
                          ? "border-blue-500 shadow-md scale-105"
                          : isDarkMode
                          ? "border-transparent hover:border-gray-700"
                          : "border-white hover:border-gray-300 shadow-sm"
                      }`}
                    >
                      <Page
                        pageNumber={index + 1}
                        width={150}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>
                    <p
                      className={`text-[11px] mt-2 font-bold ${
                        pageNumber === index + 1 ? "text-blue-600" : "text-gray-400"
                      }`}
                    >
                      {index + 1}
                    </p>
                  </div>
                ))}
            </Document>
          )}
        </div>
      </div>

      {/* ── 2. CENTER MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header bar */}
        <header
          className={`h-16 border-b flex items-center justify-between px-4 sm:px-8 z-10 shrink-0 transition-colors duration-300 ${
            isDarkMode ? "bg-[#1e1e1e] border-gray-800" : "bg-white border-gray-200"
          }`}
        >
          <button
            onClick={() => router.visit("/dashboard")}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black group"
          >
            <CircleArrowLeft className="w-5 h-5 transition-all duration-300 stroke-current group-hover:scale-110 group-hover:-rotate-180 group-hover:text-black" />
            <span className="hidden sm:inline hover:text-[#800000]">Go Back</span>
          </button>

          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-bold truncate max-w-[150px] sm:max-w-[300px] ${
                isDarkMode ? "text-white" : "text-black"
              }`}
            >
              {file.name}
              {isHtmlMode ? "" : ".pdf"}
            </span>
          </div>

          <button
            onClick={handleDownload}
            className={`px-4 py-1.5 rounded-full border text-sm font-bold shadow-sm flex items-center gap-2 transition-all ${
              isDarkMode
                ? "bg-white text-black border-white hover:bg-gray-200"
                : "bg-white text-[#800000] border-[#c7c7c7]/45 hover:bg-[#800000]/30 hover:text-white"
            }`}
          >
            <span className="hidden md:inline">Download</span>
            <CircleArrowDown className="w-5 h-5 stroke-current" />
          </button>
        </header>

        {/* Main scrollable content */}
        <main
          ref={mainContainerRef}
          className={`flex-1 overflow-y-auto p-4 sm:p-12 scroll-smooth transition-colors duration-300 ${
            isDarkMode ? "bg-[#121212]" : "bg-[#f4f4f7]"
          }`}
        >
          {isHtmlMode ? (
            /* ── HTML SYLLABUS VIEWER ── */
            <div
              style={{
                transformOrigin: "top center",
                transform: `scale(${scale})`,
                // Compensate layout height when zoomed out so scrollbar stays accurate
                marginBottom: scale < 1 ? `${(scale - 1) * 600}px` : 0,
                width: "100%",
                maxWidth: 960,
                margin: "0 auto",
                filter: isDarkMode ? "invert(0.88) hue-rotate(180deg)" : "none",
                transition: "transform 0.15s ease, filter 0.3s",
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={file.syllabusHtml}
                title="syllabus-viewer"
                style={{
                  width: "100%",
                  minHeight: "80vh",
                  border: "none",
                  background: "white",
                  boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
                  display: "block",
                }}
                onLoad={(e) => {
                  // Expand iframe to full content height so outer container scrolls through all pages
                  const iframe = e.currentTarget;
                  try {
                    const body = iframe.contentDocument?.body;
                    if (body) {
                      iframe.style.height = body.scrollHeight + 60 + "px";
                    }
                  } catch {}
                }}
              />
            </div>
          ) : (
            /* ── PDF VIEWER ── */
            <div className="flex flex-col items-center gap-8">
              {loadingError ? (
                <div
                  className={`flex flex-col items-center justify-center p-10 rounded-xl shadow-lg border ${
                    isDarkMode ? "bg-[#1e1e1e] border-red-900/50" : "bg-white border-red-100"
                  }`}
                >
                  <span className="text-4xl mb-4">⚠️</span>
                  <h3
                    className={`text-lg font-bold ${
                      isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    Failed to load document
                  </h3>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 text-blue-600 text-sm underline font-semibold"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <Document
                  file={file.url}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={() => setLoadingError(true)}
                  loading={null}
                >
                  {numPages &&
                    Array.from(new Array(numPages), (_, index) => (
                      <div
                        key={`main_page_${index + 1}`}
                        ref={(el) => {
                          pageRefs.current[index + 1] = el;
                        }}
                        className={`shadow-2xl mb-8 transition-all duration-200 ${
                          isDarkMode ? "bg-[#1e1e1e] shadow-black/40" : "bg-white"
                        }`}
                      >
                        <Page
                          pageNumber={index + 1}
                          width={Math.min(window.innerWidth - 40, 800) * scale}
                          className="max-w-none"
                        />
                      </div>
                    ))}
                </Document>
              )}
            </div>
          )}
        </main>

        {/* FLOATING ZOOM / THEME / PRINT BAR */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#c7c7c7]/60 backdrop-blur-sm border border-gray-800 px-4 py-2 rounded-full shadow-2xl z-20">
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold hover:text-black"
          >
            －
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 text-xs font-bold text-black min-w-[60px] text-center"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold hover:text-black"
          >
            ＋
          </button>

          <div className="w-px h-4 bg-gray-800 mx-1"></div>

          {/* THEME TOGGLE */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 group transition-all"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <img
                src="https://img.icons8.com/?size=100&id=45475&format=png&color=000000"
                className="w-4 h-4"
                alt="light mode icon"
              />
            ) : (
              <img
                src="https://img.icons8.com/?size=100&id=45474&format=png&color=000000"
                className="w-4 h-4"
                alt="dark mode icon"
              />
            )}
          </button>

          <button
            onClick={handlePrint}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 group"
          >
            <Printer className="w-4 h-4 stroke-current" />
          </button>
        </div>
      </div>

      {/* ── 3. RIGHT SIDEBAR ── */}
      <div
        className={`hidden xl:flex w-72 border-l flex-col shadow-sm shrink-0 transition-colors duration-300 ${
          isDarkMode ? "bg-[#1e1e1e] border-gray-800" : "bg-white border-gray-200"
        }`}
      >
        <div
          className={`h-16 flex items-center px-6 border-b ${
            isDarkMode ? "border-gray-800" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText
              className={`w-5 h-5 stroke-current ${isDarkMode ? "text-white" : "text-black"}`}
            />
            <p className={`text-sm tracking-widest ${isDarkMode ? "text-gray-300" : "text-black"}`}>
              File Details
            </p>
          </div>
        </div>
        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          <div
            className={`flex flex-col items-center p-6 rounded-2xl border transition-colors duration-300 ${
              isDarkMode ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-100"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-xl shadow-sm flex items-center justify-center mb-4 ${
                isDarkMode ? "bg-[#252525]" : "bg-white"
              }`}
            >
              <img
                src="https://img.icons8.com/?size=100&id=mcyAsTDJNTI9&format=png"
                className="w-10"
                alt="file icon"
              />
            </div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">
              Current File
            </p>
            <p
              className={`text-sm font-bold text-center break-all ${
                isDarkMode ? "text-blue-100" : "text-blue-900"
              }`}
            >
              {file.name}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <DetailItem label="Date Modified"    value={file.date || "N/A"}                      isDarkMode={isDarkMode} />
            <DetailItem label="Format"           value={isHtmlMode ? "HTML Syllabus" : "PDF"}    isDarkMode={isDarkMode} />
            <DetailItem label="Zoom"             value={`${Math.round(scale * 100)}%`}           isDarkMode={isDarkMode} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section nav for HTML mode left sidebar ─────────────────────────────────
function SyllabusNavLinks({
  isDarkMode,
  iframeRef,
}: {
  isDarkMode: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sections = [
    { label: "Course Info",     id: "section-course-info" },
    { label: "Course Outcomes", id: "section-outcomes" },
    { label: "Course Schedule", id: "section-schedule" },
    { label: "Requirements",    id: "section-requirements" },
    { label: "Grading",         id: "section-grading" },
    { label: "Rubrics",         id: "section-rubrics" },
  ];

  const scrollTo = (id: string) => {
    setActiveId(id);
    try {
      const doc = iframeRef.current?.contentDocument;
      const el  = doc?.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (e) {
      console.warn("Iframe scroll failed:", e);
    }
  };

  return (
    <div className="space-y-1 pt-2">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
            activeId === s.id
              ? isDarkMode
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-800 border-l-4 border-blue-500"
              : isDarkMode
              ? "text-gray-300 hover:bg-gray-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ── Shared detail item ──────────────────────────────────────────────────────
function DetailItem({
  label,
  value,
  isDarkMode,
}: {
  label: string;
  value: string;
  isDarkMode?: boolean;
}) {
  return (
    <div className="group">
      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-tighter">
        {label}
      </p>
      <p className={`text-sm font-semibold ${isDarkMode ? "text-gray-200" : "text-black"}`}>
        {value}
      </p>
    </div>
  );
}