import { FolderPen, SquarePen, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface FileOptionsDropdownProps {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export default function FileOptionsDropdown({
  open,
  onClose,
  onEdit,
  onRename,
  onDelete,
}: FileOptionsDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full w-45 bg-white rounded-2xl shadow-xl border border-[#c7c7c7] overflow-hidden z-[999]"
    >
      {/* HEADER */}
      <div className="bg-[#800000] text-white px-4 py-3 font-semibold text-md rounded-t-2xl">
        File Options
      </div>

      {/* OPTIONS */}
      <div className="divide-y divide-[#c7c7c7]">
        <button
          onClick={onEdit}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[#c7c7c7] text-[#800000] font-medium text-sm"
        >
          <SquarePen  color="#800000" className="w-4.5 h-4.5"/>
          Edit
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[#c7c7c7] text-[#800000] font-medium text-sm"
        >
          <FolderPen  color="#800000" className="w-4.5 h-4.5"/>
          Rename
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[#c7c7c7] text-[#800000] font-medium text-sm"
        >
          <Trash2 color="#800000" className="w-4.5 h-4.5"/>
          Delete
        </button>
      </div>
    </div>
  );
}