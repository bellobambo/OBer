import { cn } from "../utils/cn";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function Input({ label, icon: Icon, className, inputClassName, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = props.type === "password";
  const currentType = isPasswordType && showPassword ? "text" : props.type;
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      {label && <label className="text-sm font-semibold text-gray-900">{label}</label>}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-4 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          className={cn(
            "w-full bg-white border border-gray-200 rounded-[12px] py-4 text-gray-900 outline-none focus:border-[#3198F5] focus:ring-1 focus:ring-[#3198F5] transition-all",
            Icon ? "pl-12" : "pl-4",
            isPasswordType ? "pr-12" : "pr-4",
            inputClassName
          )}
          {...props}
          type={currentType}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
