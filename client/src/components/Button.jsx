import { cn } from "../utils/cn";

export function Button({ children, className, variant = "primary", ...props }) {
  return (
    <button
      className={cn(
        "w-full flex items-center justify-center py-4 px-6 rounded-2xl font-semibold transition-all duration-200",
        {
          "bg-[#3198F5] text-white hover:bg-[#207CCC]": variant === "primary",
          "bg-[#EAF4FF] text-[#3198F5] hover:bg-[#D4E8FF]": variant === "secondary",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
