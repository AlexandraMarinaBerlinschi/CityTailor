import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supaBaseClient";
import { Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let accessToken = params.get("access_token");
    let type = params.get("type");

    if (!accessToken || !type) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      accessToken = hashParams.get("access_token");
      type = hashParams.get("type");
    }

    if (type === "recovery" && accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: "",
      });
      setStep("enter-password");
    } else {
      setStep("invalid");
    }
  }, [params]);

  const handleUpdatePassword = async () => {
    setErrorMessage("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      if (error.message.toLowerCase().includes("new password should be different")) {
        setErrorMessage("You can't reuse an old password.");
      } else {
        setErrorMessage("Something went wrong. Try again.");
      }
    } else {
      setStep("success");
    }
  };

  if (step === "verifying") {
    return <div className="p-8 text-center">Verifying link...</div>;
  }

  if (step === "invalid") {
    return <div className="p-8 text-center text-red-600">Invalid or expired reset link.</div>;
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-white p-8 rounded shadow-md w-96 text-center">
          <h2 className="text-2xl font-bold mb-4 text-green-600">Password updated successfully!</h2>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Set a new password</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdatePassword();
          }}
        >
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              className="w-full mb-4 p-2 pr-10 border border-gray-300 rounded"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {errorMessage && (
            <p className="text-red-600 text-sm mb-4 text-center">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Update password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
