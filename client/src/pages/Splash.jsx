import { useNavigate } from "react-router-dom";

export function Splash() {
  const navigate = useNavigate();

  return (
    <div 
      className="bg-[#3198F5] min-h-screen flex flex-col justify-center items-center text-white cursor-pointer"
      onClick={() => navigate("/welcome")}
    >
      <div className="flex flex-col items-center flex-1 justify-center mt-20">
        <div className="flex items-center space-x-2">
          {/* Mock Logo */}
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-[4px]">
            <div className="w-full h-full border-[5px] border-[#3198F5] rounded-full flex items-center justify-center">
              <div className="w-[10px] h-[10px] bg-[#3198F5] rounded-full"></div>
            </div>
          </div>
          <span className="text-5xl font-bold tracking-tight">Ber</span>
        </div>
        <p className="mt-4 text-white/90 text-sm font-medium">Find a ride before the ride finds you</p>
      </div>

      <div className="pb-12 flex space-x-2">
        <div className="w-2 h-2 rounded-full bg-white"></div>
        <div className="w-2 h-2 rounded-full bg-white/40"></div>
        <div className="w-2 h-2 rounded-full bg-white/40"></div>
      </div>
    </div>
  );
}
