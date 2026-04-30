type Props = {
    open?: boolean;
    message?: string;
    onClose?: () => void;
};

export default function GlobalSessionModal({
    open,
    message,
    onClose,
}: Props) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-[90%] max-w-sm text-center">
                <h2 className="text-lg font-bold text-[#800000] mb-2">
                    Session Expired
                </h2>

                <p className="text-sm text-gray-600 mb-6">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className="bg-[#800000] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#600000]"
                >
                    OK
                </button>
            </div>
        </div>
    );
}