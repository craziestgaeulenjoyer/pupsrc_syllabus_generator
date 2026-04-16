import { useEffect, useRef } from "react";

interface FilterDropdownProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  date: string;
  setDate: (value: string) => void;
  department: string;
  setDepartment: (value: string) => void;
}

export default function FilterDropdown({
  open,
  onClose,
  onApply,
  onReset,
  date,
  setDate,
  department,
  setDepartment,
}: FilterDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent background scrolling on mobile when modal is open
      if (window.innerWidth < 640) {
        document.body.style.overflow = "hidden";
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* MOBILE OVERLAY */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 sm:hidden" 
        onClick={onClose} 
      />

      <div
        ref={ref}
        className="
          /* MOBILE: Fixed Modal Center */
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          
          /* DESKTOP: Original Absolute Alignment */
          sm:absolute sm:top-full sm:mt-1.5
          sm:left-0 sm:translate-x-0 sm:translate-y-0
          md:left-auto md:right-2

          w-[90vw] sm:w-[350px]
          max-w-[350px]
          max-h-[90vh] overflow-y-auto

          bg-white rounded-[15px] shadow-2xl z-50 overflow-hidden
          border border-gray-300
        "
      >
        {/* HEADER */}
        <div className="bg-[#800000] text-white px-4 py-3 flex justify-between items-center sticky top-0 z-10">
          <span className="font-semibold">Filter</span>
          <button onClick={onClose} className="text-lg hover:opacity-80">✕</button>
        </div>

        {/* BODY */}
        <div className="p-4 space-y-4 bg-[#F4F3F3]">
          {/* DATE */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1 text-sm shadow-md outline-none focus:ring-1 focus:ring-[#800000]"
            />
          </div>

          {/* DEPARTMENT */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1 text-sm shadow-md outline-none focus:ring-1 focus:ring-[#800000]"
            >
              <option value="">Select Department</option>
              <option value="BSA">BS-Accountancy</option>
              <option value="BSECE">BS-Electronics Engineering</option>
              <option value="BSIE">BS-Industrial Engineering</option>
              <option value="BSIT">BS-Information Technology</option>
              <option value="BSMA">BS-Management Accounting</option>
              <option value="BSPYSCH">BS-Psychology</option>
              <option value="BSBA-HRM">BSBA-Human Resource Management</option>
              <option value="BSBA-MM">BSBA-Marketing Management</option>
              <option value="BSED-ENGLISH">BSEd-English</option>
              <option value="BSED-FIL">BSEd-Filipino</option>
              <option value="BSED-MATH">BSEd-Mathematics</option>
            </select>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-b border-[#c7c7c7] bg-white">
          {/* RESET */}
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-xs px-5 py-2 border border-[#D6D3D3] rounded-lg bg-white hover:bg-gray-100 transition-colors"
          >
            <img
              src="https://img.icons8.com/?size=100&id=21967&format=png&color=000000"
              alt="Reset"
              className="w-4 h-4"
            />
            <span>Reset</span>
          </button>

          {/* APPLY */}
          <button
            onClick={onApply}
            className="bg-[#800000] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#600000] transition-colors font-medium"
          >
            Apply Now
          </button>
        </div>

        {/* INFO SECTION */}
        <div className="px-4 py-3 text-[11px] bg-white">
          <p className="text-[#800000] font-semibold mb-1">
            Action Breakdown & Information:
          </p>

          <ul className="list-disc pl-4 text-gray-700 space-y-1">
            <li>
              <span className="font-semibold text-black">Clear Filters:</span>{" "}
              Clear all selected criteria. Return the dashboard view to display all available syllabuses.
            </li>

            <li>
              <span className="font-semibold text-black">Apply Changes:</span>{" "}
              Refresh the syllabus list based on your current settings.
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}