import React from "react";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const getVariantClasses = (variant: ButtonVariant = "default") => {
  switch (variant) {
    case "destructive":
      return "bg-red-500 text-white hover:bg-red-600";
    case "outline":
      return "border-2 border-primary text-primary bg-white hover:bg-primary hover:text-white";
    case "secondary":
      return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    case "ghost":
      return "bg-transparent text-gray-700 hover:bg-gray-100";
    case "link":
      return "text-blue-600 underline hover:text-blue-800";
    default:
      return "bg-blue-600 text-white hover:bg-blue-700";
  }
};

const getSizeClasses = (size: ButtonSize = "default") => {
  switch (size) {
    case "sm":
      return "h-9 px-3 rounded-md text-sm";
    case "lg":
      return "h-11 px-8 rounded-md text-base";
    case "icon":
      return "h-10 w-10 p-0 flex items-center justify-center";
    default:
      return "h-10 px-4 py-2 text-sm";
  }
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = getVariantClasses(variant);
    const sizeClasses = getSizeClasses(size);

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
