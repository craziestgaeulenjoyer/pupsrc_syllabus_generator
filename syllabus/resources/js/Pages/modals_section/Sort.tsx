import { useEffect, useRef } from "react";

interface SortDropdownProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  dateSort: string;
  setDateSort: (value: string) => void;
  deptSort: string;
  setDeptSort: (value: string) => void;
}

export default function SortDropdown({
  open,
  onClose,
  onApply,
  onReset,
  dateSort,
  setDateSort,
  deptSort,
  setDeptSort,
}: SortDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

return (
    <div
      ref={ref}
      className="
        absolute
        left-1/4 -translate-x-1/2        
        sm:left-0 sm:translate-x-0       
        md:left-auto md:right-33   

        mt-10

        w-[90vw] sm:w-[320px]
        max-w-[320px]

        max-h-[80vh] overflow-y-auto

        bg-white rounded-[15px] shadow-xl z-50 overflow-hidden
        border border-[#D6D3D3]
      "
    >
      {/* HEADER */}
      <div className="bg-[#800000] text-white px-4 py-3 flex justify-between items-center">
        <span className="font-medium">Sort by</span>
        <button
          onClick={onClose}
          className="text-lg font-bold hover:opacity-80"
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div className="bg-white">

        {/* DATE GROUP */}
        <div className="px-4 py-4 space-y-2 border-b border-[#D6D3D3]">
          <label className="block text-sm font-semibold text-gray-500">
            Date
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="date"
              value="asc"
              checked={dateSort === "asc"}
              onChange={() => setDateSort("asc")}
              className="w-[18px] h-[18px] accent-[#800000]"
            />
            <span className="text-sm text-gray-800">Ascending</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="date"
              value="desc"
              checked={dateSort === "desc"}
              onChange={() => setDateSort("desc")}
              className="w-[18px] h-[18px] accent-[#800000]"
            />
            <span className="text-sm text-gray-800">Descending</span>
          </label>
        </div>

        {/* DEPARTMENT GROUP */}
        <div className="px-4 py-4 space-y-2 border-b border-[#D6D3D3]">
          <label className="block text-sm font-semibold text-gray-500">
            Department Name
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="dept"
              value="asc"
              checked={deptSort === "asc"}
              onChange={() => setDeptSort("asc")}
              className="w-[18px] h-[18px] accent-[#800000]"
            />
            <span className="text-sm text-gray-800">A-Z</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="dept"
              value="desc"
              checked={deptSort === "desc"}
              onChange={() => setDeptSort("desc")}
              className="w-[18px] h-[18px] accent-[#800000]"
            />
            <span className="text-sm text-gray-800">Z-A</span>
          </label>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center px-4 py-3 border-t border-[#D6D3D3]">
        <button
        onClick={onReset}
        className="flex items-center gap-2 text-xs px-5 py-2 border border-[#D6D3D3] rounded-lg hover:bg-gray-100"
        >
        <img
            src="https://img.icons8.com/?size=100&id=21967&format=png&color=000000"
            alt="Reset"
            className="w-4 h-4"
        />
        <span>Reset</span>
        </button>

        <button
          onClick={onApply}
          className="bg-[#800000] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#600000]"
        >
          Apply Now
        </button>
      </div>
    </div>
  );
}