import { useState, useEffect } from "react";

interface RenameModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  currentName?: string;
}

export default function RenameModal({
  open,
  onClose,
  onConfirm,
  currentName = "",
}: RenameModalProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-[1000]">
      <div className="w-[400px] rounded-lg shadow-xl overflow-hidden bg-white" style={{ fontFamily: "Poppins, sans-serif" }}>
        
        {/* HEADER */}
        <div className="bg-[#800000] text-white px-4 py-3 font-semibold">
          Rename
        </div>

        {/* BODY */}
        <div className="p-4 text-sm text-gray-700">
          <p className="mb-2">Please enter a new name for this syllabus</p>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#800000] hover:shadow-md transition"
          />
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="px-7 py-1 rounded border border-[#c7c7c7] bg-white hover:bg-[#800000]/30 hover:text-[#800000] text-sm shadow-sm hover:shadow-xl hover:border-b-[#800000] hover:border-b-4 transition"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirm(name)}
            className="px-8 py-1 rounded bg-[#800000] text-white hover:bg-[#c7c7c7] hover:text-[#800000] text-sm shadow-sm hover:shadow-xl hover:border-b-4 hover:border-b-[#800000] transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}