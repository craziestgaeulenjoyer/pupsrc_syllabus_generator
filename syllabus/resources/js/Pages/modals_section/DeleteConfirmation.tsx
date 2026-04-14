import React from "react";

interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({
  open,
  onClose,
  onConfirm,
}: DeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-[1000]">
      
      {/* MODAL */}
      <div className="w-[360px] bg-white rounded-2xl p-6 text-center 
        shadow-[0_0_25px_#800000]/45" style={{ fontFamily: "Poppins, sans-serif" }}>

        {/*Content*/}  
        <img
          src="https://img.icons8.com/?size=100&id=y4IaznsvidBW&format=png&color=000000"
          className="w-16 mx-auto mb-3"
        />
        <h2 className="text-lg font-bold text-gray-800 mb-1">
          Are you sure?
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          This action will permanently delete this file and cannot be undone.
        </p>

        {/* BUTTONS */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-[#800000] text-gray-500 border-[#c7c7c7] font-medium hover:border-[#800000] hover:text-[#800000] hover:bg-[#800000]/10 hover:border-b-4 hover:border-b-[#800000] transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-[#ff3b3b] text-white font-semibold hover:bg-red-600 shadow-md hover:border-b-4 hover:border-b-[#800000]/30 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}