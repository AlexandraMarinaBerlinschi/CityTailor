import { useState } from 'react';
import { User, Edit3, Save, X, Camera, Trash2, Lock, Mail, Shield } from 'lucide-react';

const Profile = () => {
  const [userInfo, setUserInfo] = useState({
    email: "john.doe@example.com",
    username: "johndoe123",
    role: "User"
  });
  const [newUsername, setNewUsername] = useState("johndoe123");
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleUsernameUpdate = async () => {
    setIsLoading(true);
    setMessage("");
    
    // Simulate API call
    setTimeout(() => {
      setUserInfo({ ...userInfo, username: newUsername });
      setMessage("Username updated successfully!");
      setEditMode(false);
      setIsLoading(false);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    }, 1000);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    setTimeout(() => {
      setAvatarUrl(previewUrl);
      setMessage("Avatar updated!");
      setIsLoading(false);
      
      setTimeout(() => setMessage(""), 3000);
    }, 1000);
  };

  const handleDeleteAvatar = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      if (avatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarUrl);
      }
      setAvatarUrl("");
      setMessage("Avatar deleted successfully.");
      setIsLoading(false);
      
      setTimeout(() => setMessage(""), 3000);
    }, 500);
  };

  const handleCancel = () => {
    setNewUsername(userInfo.username);
    setEditMode(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Profile</h1>
          <p className="text-gray-600">Manage your account settings</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {/* Avatar Section */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
            <div className="flex flex-col items-center">
              <div className="relative group">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg transition-transform duration-300 group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-24 h-24 bg-white/20 rounded-full border-4 border-white/30 flex items-center justify-center shadow-lg">
                    <User className="w-10 h-10 text-white/70" />
                  </div>
                )}
                
                {/* Upload Overlay */}
                <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                </label>
              </div>
              
              {avatarUrl && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={isLoading}
                  className="mt-3 flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors duration-200 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8 space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-gray-800">
                {userInfo.email}
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="w-4 h-4" />
                  Username
                </div>
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>
              
              {editMode ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter new username"
                    disabled={isLoading}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUsernameUpdate}
                      disabled={isLoading || !newUsername.trim()}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex-1"
                    >
                      <Save className="w-4 h-4" />
                      {isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 text-gray-800">
                  {userInfo.username}
                </div>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Shield className="w-4 h-4" />
                Role
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  {userInfo.role}
                </span>
              </div>
            </div>

            {/* Change Password Button */}
            <div className="pt-4">
              <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02]">
                <Lock className="w-4 h-4" />
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm font-medium text-center">{message}</p>
          </div>
        )}

        {/* Loading Overlay */}
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