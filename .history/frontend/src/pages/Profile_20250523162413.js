import { useEffect, useState } from "react";
import { supabase } from "../supaBaseClient";
import { useNavigate } from 'react-router-dom';
import { User, Edit3, Save, X, Camera, Trash2, Lock, Mail, Shield } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return;

    const userId = authData.user.id;

    const { data, error } = await supabase
      .from("users")
      .select("email, username, role")
      .eq("id", userId);

    if (error || !data.length) {
      setMessage("Profile data not found.");
      return;
    }

    setUserInfo({
      ...data[0],
      username: authData.user.user_metadata?.username || data[0].username,
    });
    setNewUsername(authData.user.user_metadata?.username || data[0].username);
    setAvatarUrl(authData.user.user_metadata?.avatar_url || "");
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUsernameUpdate = async () => {
    setIsLoading(true);
    setMessage("");
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user.id;

    const { error: dbError } = await supabase
      .from("users")
      .update({ username: newUsername })
      .eq("id", userId);

    if (dbError) {
      setMessage("Failed to update username.");
      setIsLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { username: newUsername },
    });

    if (authError) {
      setMessage("Username updated in DB, but failed to sync with auth.");
      setIsLoading(false);
      return;
    }

    await supabase.auth.refreshSession();
    await fetchProfile();

    setMessage("Username updated successfully!");
    setEditMode(false);
    setIsLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    const { data: authData } = await supabase.auth.getUser();

    if (!file || !userInfo?.email || !authData?.user?.id) {
      setMessage("Please select a file and make sure profile is loaded.");
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
  };

  const handleDeleteAvatar = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user || !avatarUrl) return;

    const avatarPath = avatarUrl.split("/").pop();

    const { error: deleteError } = await supabase.storage
      .from("avatars")
      .remove([avatarPath]);

    if (deleteError) {
      setMessage("Failed to delete avatar.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: null },
    });

    if (updateError) {
      setMessage("Failed to clear profile avatar.");
      return;
    }

    setAvatarUrl("");
    setMessage("Avatar deleted successfully.");
  };

  const handleCancel = () => {
    setNewUsername(userInfo.username);
    setEditMode(false);
  };

  if (!userInfo) {
    return <div className="p-8 text-center">Loading profile...</div>;
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
            <button onClick={handleDeleteAvatar} disabled={isLoading} className="text-sm text-red-500 hover:underline">
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
                <button onClick={() => setEditMode(true)} className="text-indigo-600 hover:underline text-sm flex items-center gap-1">
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter new username"
                  disabled={isLoading}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUsernameUpdate}
                    disabled={isLoading || !newUsername.trim()}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                  >
                    <Save className="inline w-4 h-4 mr-1" /> {isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500"
                  >
                    <X className="inline w-4 h-4 mr-1" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-100 rounded-lg text-gray-800">{userInfo.username}</div>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Role
            </label>
            <div className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-full inline-block text-sm font-medium">
              {userInfo.role}
            </div>
          </div>

          <button
            onClick={() => navigate('/resetPassword')}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700"
          >
            <Lock className="w-4 h-4" /> Change Password
          </button>

          {message && (
            <div className="text-center text-green-600 text-sm font-medium bg-green-50 border border-green-200 p-3 rounded-lg">
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
