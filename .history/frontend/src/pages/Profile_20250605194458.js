import { useEffect, useState } from "react";
import { supabase } from "../supaBaseClient";
import { useNavigate } from 'react-router-dom';
import { User, Edit3, Save, X, Camera, Trash2, Lock, Mail, Shield } from 'lucide-react';

const Profile = ({ user }) => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = async () => {
    // If user prop is available, use it as a starting point
    if (user) {
      setUserInfo({
        email: user.email,
        username: user.username || user.email?.split('@')[0],
        role: user.role || 'user'
      });
      setNewUsername(user.username || user.email?.split('@')[0]);
      setAvatarUrl(user.avatar_url || "");
    }

    // Still fetch from Supabase for complete profile data
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      // If no Supabase auth but we have user prop, use that
      if (user) return;
      setMessage("Authentication required.");
      return;
    }

    const userId = authData.user.id;

    const { data, error } = await supabase
      .from("users")
      .select("email, username, role")
      .eq("id", userId);

    if (error || !data.length) {
      // If DB fetch fails but we have auth data, use that
      const fallbackInfo = {
        email: authData.user.email,
        username: authData.user.user_metadata?.username || authData.user.email?.split('@')[0],
        role: authData.user.user_metadata?.role || 'user'
      };
      setUserInfo(fallbackInfo);
      setNewUsername(fallbackInfo.username);
      setAvatarUrl(authData.user.user_metadata?.avatar_url || "");
      setMessage("Profile loaded from authentication data.");
      return;
    }

    // Use DB data with auth metadata as fallback
    const completeUserInfo = {
      ...data[0],
      username: authData.user.user_metadata?.username || data[0].username,
    };
    
    setUserInfo(completeUserInfo);
    setNewUsername(completeUserInfo.username);
    setAvatarUrl(authData.user.user_metadata?.avatar_url || "");
  };

  useEffect(() => {
    fetchProfile();
  }, [user]); // Re-fetch when user prop changes

  const handleUsernameUpdate = async () => {
    setIsLoading(true);
    setMessage("");
    
    try {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData?.user) {
        setMessage("Authentication required for this action.");
        setIsLoading(false);
        return;
      }
      
      const userId = authData.user.id;

      // Update in database if available
      const { error: dbError } = await supabase
        .from("users")
        .update({ username: newUsername })
        .eq("id", userId);

      if (dbError) {
        console.warn("DB update failed, but continuing with auth update:", dbError);
      }

      // Update in auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { username: newUsername },
      });

      if (authError) {
        setMessage("Failed to update username.");
        setIsLoading(false);
        return;
      }

      // Refresh session and profile
      await supabase.auth.refreshSession();
      await fetchProfile();

      // Update localStorage currentUser if it exists
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          userData.username = newUsername;
          localStorage.setItem("currentUser", JSON.stringify(userData));
          
          // Trigger storage event to update other components
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'currentUser',
            newValue: JSON.stringify(userData)
          }));
        } catch (e) {
          console.warn("Failed to update localStorage user data:", e);
        }
      }

      setMessage("Username updated successfully!");
      setEditMode(false);
    } catch (error) {
      console.error("Username update error:", error);
      setMessage("Failed to update username. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      setMessage("Please select a file.");
      return;
    }

    if (!userInfo?.email) {
      setMessage("Profile not loaded. Please refresh the page.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData?.user?.id) {
        setMessage("Authentication required for avatar upload.");
        setIsLoading(false);
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${userInfo.email}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          upsert: false,
          cacheControl: "3600",
          contentType: file.type,
        });

      if (uploadError) {
        setMessage("Failed to upload avatar.");
        setIsLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      if (publicUrlData) {
        await supabase.auth.updateUser({
          data: { avatar_url: publicUrlData.publicUrl },
        });
        setAvatarUrl(publicUrlData.publicUrl);
        setMessage("Avatar updated!");
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      setMessage("Failed to upload avatar. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!avatarUrl) return;

    setIsLoading(true);
    setMessage("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData?.user) {
        setMessage("Authentication required for this action.");
        setIsLoading(false);
        return;
      }

      const avatarPath = avatarUrl.split("/").pop();

      const { error: deleteError } = await supabase.storage
        .from("avatars")
        .remove([avatarPath]);

      if (deleteError) {
        console.warn("Failed to delete avatar file:", deleteError);
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null },
      });

      if (updateError) {
        setMessage("Failed to clear profile avatar.");
        setIsLoading(false);
        return;
      }

      setAvatarUrl("");
      setMessage("Avatar deleted successfully.");
    } catch (error) {
      console.error("Avatar deletion error:", error);
      setMessage("Failed to delete avatar. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNewUsername(userInfo?.username || "");
    setEditMode(false);
  };

  // Show loading state while fetching profile
  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-purple-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <User size={32} className="text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-purple-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative group mb-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-28 h-28 rounded-full object-cover border-4 border-indigo-300 shadow-md group-hover:opacity-80 transition" />
            ) : (
              <div className="w-28 h-28 rounded-full border-4 border-indigo-200 flex items-center justify-center bg-indigo-50 text-indigo-400">
                <User className="w-10 h-10" />
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition">
              <Camera className="text-white w-5 h-5" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isLoading} />
            </label>
          </div>

          {avatarUrl && (
            <button onClick={handleDeleteAvatar} disabled={isLoading} className="text-sm text-red-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
              <Trash2 className="inline w-4 h-4 mr-1" /> Remove Photo
            </button>
          )}

          <h2 className="text-2xl font-bold text-gray-900 mt-4">Your Profile</h2>
          <p className="text-gray-500 text-sm">Manage your account details</p>
        </div>

        <div className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email Address
            </label>
            <div className="p-3 bg-gray-100 rounded-lg text-gray-800">{userInfo.email}</div>
          </div>

          {/* Username */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <User className="w-4 h-4" /> Username
              </label>
              {!editMode && (
                <button 
                  onClick={() => setEditMode(true)} 
                  disabled={isLoading}
                  className="text-indigo-600 hover:underline text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
              )}
            </div>
            {editMode ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Enter new username"
                  disabled={isLoading}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUsernameUpdate}
                    disabled={isLoading || !newUsername.trim()}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="inline w-4 h-4 mr-1" /> {isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <X className="inline w-4 h-4 mr-1" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-100 rounded-lg text-gray-800">{userInfo.username || 'Not set'}</div>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Role
            </label>
            <div className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-full inline-block text-sm font-medium">
              {userInfo.role || 'User'}
            </div>
          </div>

          <button
            onClick={() => navigate('/reset-password')}
            disabled={isLoading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Lock className="w-4 h-4" /> Change Password
          </button>

          {message && (
            <div className={`text-center text-sm font-medium p-3 rounded-lg ${
              message.includes('success') || message.includes('updated') || message.includes('deleted')
                ? 'text-green-600 bg-green-50 border border-green-200'
                : 'text-red-600 bg-red-50 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                <span className="text-gray-700">Processing...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;