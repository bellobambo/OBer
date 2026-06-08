import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ScreenHeader({ title, subtitle, onBack }) {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div className="flex items-start space-x-4 mb-8">
      <button 
        onClick={handleBack}
        className="mt-1 p-2 bg-white rounded-full border border-gray-100 shadow-sm hover:bg-gray-50 flex-shrink-0"
      >
        <ChevronLeft className="w-5 h-5 text-gray-800" strokeWidth={2.5} />
      </button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
