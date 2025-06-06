import { useEffect, useState } from "react";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  // Simulate useSearchParams and useNavigate
  const getParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    return {
      get: (key) => urlParams.get(key) || hashParams.get(key)
    };
  };

  const navigate = (path) => {
    alert(`Navigating to ${path}`);
    // In real app: window.location.href = path;
  };

  // Simulate supabase client
  const supabase = {
    auth: {
      setSession: (session) => {
        console.log("Setting session:", session);
        // In real app: actual Supabase session management
      },
      updateUser: async (userData) => {
        console.log("Updating user password:", userData);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate different scenarios
        const random = Math.random();
        if (random < 0.2) {
          return { 
            error: { 
              message: "New password should be different from the old password" 
            } 
          };
        } else if (random < 0.3) {
          return { 
            error: { 
              message: "Something went wrong" 
            } 
          };
        } else {
          return { error: null };
        }
      }
    }
  };

  useEffect(() => {
    const params = getParams();
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
  }, []);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    handleUpdatePassword();
  };

  // Eye and EyeOff icons as SVG components
  const Eye = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  const EyeOff = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  );

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
        <div onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              className="w-full mb-4 p-2 pr-10 border border-gray-300 rounded"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdatePassword();
                }
              }}
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
            onClick={handleUpdatePassword}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Update password
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;