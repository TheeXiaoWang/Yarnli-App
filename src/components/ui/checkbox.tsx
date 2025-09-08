import React, { forwardRef } from "react";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
        <input
          type="checkbox"
          ref={ref}
          className="peer h-4 w-4 shrink-0 rounded border border-gray-400 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <span className="hidden peer-checked:block text-blue-600">
          ✓
        </span>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
