import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Splash } from "./pages/Splash";
import { Welcome } from "./pages/Welcome";
import { PassengerLogin } from "./pages/PassengerLogin";
import { PassengerSignUp } from "./pages/PassengerSignUp";
import { OTPVerify } from "./pages/OTPVerify";
import { ForgotPasswordRequest } from "./pages/ForgotPasswordRequest";
import { ForgotPasswordConfirm } from "./pages/ForgotPasswordConfirm";
import { TurnOnLocation } from "./pages/TurnOnLocation";
import { DriverSignIn } from "./pages/DriverSignIn";
import { DriverSignUp } from "./pages/DriverSignUp";
import { DriverPINEntry } from "./pages/DriverPINEntry";

function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/splash" />} />
          <Route path="/splash" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          
          {/* Passenger Routes */}
          <Route path="/passenger/login" element={<PassengerLogin />} />
          <Route path="/passenger/signup" element={<PassengerSignUp />} />
          <Route path="/verify-phone" element={<OTPVerify />} />
          <Route path="/location-permission" element={<TurnOnLocation />} />
          <Route path="/forgot-password" element={<ForgotPasswordRequest />} />
          <Route path="/reset-password" element={<ForgotPasswordConfirm />} />

          {/* Driver Routes */}
          <Route path="/driver/signin" element={<DriverSignIn />} />
          <Route path="/driver/signup" element={<DriverSignUp />} />
          <Route path="/driver/pin" element={<DriverPINEntry />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
