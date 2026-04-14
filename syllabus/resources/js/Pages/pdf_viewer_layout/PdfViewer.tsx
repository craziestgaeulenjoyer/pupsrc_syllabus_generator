import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { router } from "@inertiajs/react";

// Worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

export default function PdfViewer({ file }: any) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadingError, setLoadingError] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [isDarkMode, setIsDarkMode] = useState(false); // Theme State

  // Refs for scrolling to specific pages
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // --- SCROLL LISTENER TO TRACK CURRENT PAGE ---
  useEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop + container.clientHeight / 2;
      for (let i = 1; i <= (numPages || 0); i++) {
        const pageElement = pageRefs.current[i];
        if (pageElement) {
          const { offsetTop, offsetHeight } = pageElement;
          if (scrollPosition >= offsetTop && scrollPosition <= offsetTop + offsetHeight) {
            setPageNumber(i);
            break;
          }
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages]);

  const scrollToPage = (index: number) => {
    setPageNumber(index);
    const target = pageRefs.current[index];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoadingError(false);
  }

  function onDocumentLoadError() {
    setLoadingError(true);
  }

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setScale(1.0);

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.print();
    }
  };

  if (!file || !file.url) {
    return <div className="flex h-screen items-center justify-center">No file data provided.</div>;
  }

  return (
    <div 
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? "bg-[#121212] text-white" : "bg-[#f4f4f7] text-gray-900"}`} 
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      
      <iframe ref={iframeRef} src={file.url} style={{ display: 'none' }} title="pdf-print-frame" />

      {/* 1. LEFT SIDEBAR */}
      <div className={`hidden lg:flex w-64 border-r flex-col shadow-sm transition-colors duration-300 ${isDarkMode ? "bg-[#1e1e1e] border-gray-800" : "bg-white border-gray-200"}`}>
        <div className={`h-16 flex items-center px-4 border-b shrink-0 ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <img 
              src="https://img.icons8.com/?size=100&id=102445&format=png&color=000000" 
              className={`w-4 h-4 ${isDarkMode ? "invert" : ""}`} 
              alt="page icon" 
            />
            <h2 className={`text-xs tracking-widest ${isDarkMode ? "text-gray-300" : "text-black"}`}>Page Previews</h2>
          </div>
        </div>
        
        <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${isDarkMode ? "bg-[#181818]" : "bg-gray-50"}`}>
          <Document file={file.url} onLoadSuccess={onDocumentLoadSuccess}>
            {numPages && Array.from(new Array(numPages), (_, index) => (
              <div key={`thumb_${index + 1}`} className="flex flex-col items-center">
                <div
                  id={`thumb-box-${index + 1}`}
                  onClick={() => scrollToPage(index + 1)}
                  className={`cursor-pointer transition-all border-4 rounded-sm ${
                    pageNumber === index + 1 ? "border-blue-500 shadow-md scale-105" : (isDarkMode ? "border-transparent hover:border-gray-700" : "border-white hover:border-gray-300 shadow-sm")
                  }`}
                >
                  <Page pageNumber={index + 1} width={150} renderTextLayer={false} renderAnnotationLayer={false} />
                </div>
                <p className={`text-[11px] mt-2 font-bold ${pageNumber === index + 1 ? "text-blue-600" : "text-gray-400"}`}>
                  {index + 1}
                </p>
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* 2. CENTER: MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className={`h-16 border-b flex items-center justify-between px-4 sm:px-8 z-10 shrink-0 transition-colors duration-300 ${isDarkMode ? "bg-[#1e1e1e] border-gray-800" : "bg-white border-gray-200"}`}>
          <button 
            onClick={() => router.visit("/dashboard")} 
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black group"
          >
            <img 
              src="https://img.icons8.com/?size=100&id=99287&format=png&color=737373" 
              className="w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-180 group-hover:brightness-0" 
              alt="back icon" 
            />
            <span className="hidden sm:inline hover:text-[#800000]">Go Back</span>
          </button>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold truncate max-w-[150px] sm:max-w-[300px] ${isDarkMode ? "text-white" : "text-black"}`}>{file.name}.pdf</span>
          </div>
          <button className={`px-4 py-1.5 rounded-full border text-sm font-bold shadow-sm flex items-center gap-2 transition-all ${isDarkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-white text-[#800000] border-[#c7c7c7]/45 hover:bg-[#800000]/30 hover:text-white"}`}>
            <span className="hidden md:inline">Download</span>
            <img src="https://img.icons8.com/?size=100&id=100211&format=png&color=800000" className={`w-5 h-5 ${isDarkMode ? "brightness-0" : ""}`} alt="download icon" />
          </button>
        </header>

        <main 
          ref={mainContainerRef}
          className={`flex-1 overflow-y-auto p-4 sm:p-12 scroll-smooth transition-colors duration-300 ${isDarkMode ? "bg-[#121212]" : "bg-[#f4f4f7]"}`}
        >
          <div className="flex flex-col items-center gap-8">
            {loadingError ? (
              <div className={`flex flex-col items-center justify-center p-10 rounded-xl shadow-lg border ${isDarkMode ? "bg-[#1e1e1e] border-red-900/50" : "bg-white border-red-100"}`}>
                <span className="text-4xl mb-4">⚠️</span>
                <h3 className={`text-lg font-bold ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>Failed to load document</h3>
                <button onClick={() => window.location.reload()} className="mt-4 text-blue-600 text-sm underline font-semibold">Try Again</button>
              </div>
            ) : (
              <Document 
                file={file.url} 
                onLoadSuccess={onDocumentLoadSuccess} 
                onLoadError={onDocumentLoadError}
                loading={null}
              >
                {numPages && Array.from(new Array(numPages), (_, index) => (
                  <div 
                    key={`main_page_${index + 1}`}
                    ref={(el) => { pageRefs.current[index + 1] = el; }}
                    className={`shadow-2xl mb-8 transition-all duration-200 ${isDarkMode ? "bg-[#1e1e1e] shadow-black/40" : "bg-white"}`}
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
        </main>

        {/* FLOATING ZOOMER + THEME + PRINT */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#c7c7c7]/60 backdrop-blur-sm border border-gray-800 px-4 py-2 rounded-full shadow-2xl z-20">
          <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold hover:text-black">－</button>
          <button onClick={handleResetZoom} className="px-2 text-xs font-bold text-black min-w-[60px] text-center">{Math.round(scale * 100)}%</button>
          <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold hover:text-black">＋</button>
          
          <div className="w-[1px] h-4 bg-gray-800 mx-1"></div>

          {/* THEME TOGGLE */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 group transition-all"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <img src="https://img.icons8.com/?size=100&id=45475&format=png&color=000000" className="w-4 h-4" alt="light mode icon" />
            ) : (
              <img src="https://img.icons8.com/?size=100&id=45474&format=png&color=000000" className="w-4 h-4" alt="dark mode icon" />
            )}
          </button>
          
          <button onClick={handlePrint} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 group">
            <img src="https://img.icons8.com/?size=100&id=10338&format=png&color=000000" className="w-4 h-4 opacity-70 group-hover:opacity-100" alt="print icon" />
          </button>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR */}
      <div className={`hidden xl:flex w-72 border-l flex-col shadow-sm shrink-0 transition-colors duration-300 ${isDarkMode ? "bg-[#1e1e1e] border-gray-800" : "bg-white border-gray-200"}`}>
        <div className={`h-16 flex items-center px-6 border-b ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <img 
              src="https://img.icons8.com/?size=100&id=78811&format=png&color=000000" 
              className={`w-5 h-5 ${isDarkMode ? "invert" : ""}`} 
              alt="document icon" 
            />
            <p className={`text-sm tracking-widest ${isDarkMode ? "text-gray-300" : "text-black"}`}>File Details</p>
          </div>
        </div>
        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          <div className={`flex flex-col items-center p-6 rounded-2xl border transition-colors duration-300 ${isDarkMode ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-100"}`}>
            <div className={`w-16 h-16 rounded-xl shadow-sm flex items-center justify-center mb-4 ${isDarkMode ? "bg-[#252525]" : "bg-white"}`}>
              <img src="https://img.icons8.com/?size=100&id=mcyAsTDJNTI9&format=png" className="w-10" />
            </div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Current File</p>
            <p className={`text-sm font-bold text-center break-all ${isDarkMode ? "text-blue-100" : "text-blue-900"}`}>{file.name}</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <DetailItem label="Date Uploaded" value={file.date || "N/A"} isDarkMode={isDarkMode} />
            <DetailItem label="Total Pages" value={`${numPages || "--"} Pages`} isDarkMode={isDarkMode} />
            <DetailItem label="Current Position" value={`Page ${pageNumber} of ${numPages}`} isDarkMode={isDarkMode} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, isDarkMode }: { label: string; value: string; isDarkMode?: boolean }) {
  return (
    <div className="group">
      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-tighter">{label}</p>
      <p className={`text-sm font-semibold ${isDarkMode ? "text-gray-200" : "text-black"}`}>{value}</p>
    </div>
  );
}