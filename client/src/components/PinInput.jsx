import { useRef } from "react";

export function PinInput({ length = 4, value = "", onChange }) {
  const inputsRef = useRef([]);

  const handleChange = (i, e) => {
    const val = e.target.value;
    const newValue = value.split("");
    newValue[i] = val.slice(-1);
    
    const finalStr = newValue.join("").slice(0, length);
    if (onChange) onChange(finalStr);
    
    if (val && i < length - 1) {
      inputsRef.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-3 max-w-[320px] mx-auto">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          className="w-16 h-16 sm:w-[72px] sm:h-[72px] text-center text-3xl font-bold bg-white border border-gray-200 rounded-[12px] outline-none focus:border-[#3198F5] focus:ring-2 focus:ring-[#3198F5]/20 text-gray-900 transition-all"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
