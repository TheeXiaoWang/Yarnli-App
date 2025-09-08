import React, { useState, ReactNode } from "react";

interface AlertDialogProps {
  triggerText: string;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  children?: ReactNode;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  triggerText,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  children,
}) => {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm?.();
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600 transition"
      >
        {triggerText}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-md mx-4 p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
            {children && <div className="mt-4">{children}</div>}
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AlertDialog;
