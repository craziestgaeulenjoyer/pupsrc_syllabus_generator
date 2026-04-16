import React from "react";

interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmationModal({
  open,
  onClose,
  onConfirm,
}: LogoutModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-[1000]">
      {/* MODAL */}
      <div
        className="w-[380px] bg-white rounded-2xl p-6 text-center shadow-[0_0_25px_#800000]/40"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        {/* SVG IMAGE (TOP CENTER) */}
        <div className="w-full flex justify-center mb-3">
          <img
            src="/images/Questions-pana.svg"
            alt="Question Illustration"
            className="w-45 h-45"
          />
        </div>

        {/* TITLE */}
        <h2 className="text-lg font-bold text-gray-800 mb-1">
          Are you sure you want to logout?
        </h2>

        <p className="text-sm text-gray-500 mb-5">
          You will be signed out of your account and need to login again to continue.
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
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}