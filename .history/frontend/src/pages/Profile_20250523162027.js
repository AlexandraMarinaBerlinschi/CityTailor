import { useEffect, useState } from "react";
import { supabase } from "../supaBaseClient";
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

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
    setMessage("");
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user.id;

    const { error: dbError } = await supabase
      .from("users")
      .update({ username: newUsername })
      .eq("id", userId);

    if (dbError) {
      setMessage("Failed to update username.");
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { username: newUsername },
    });

    if (authError) {
      setMessage("Username updated in DB, but failed to sync with auth.");
      return;
    }

    await supabase.auth.refreshSession();
    await fetchProfile();

    setMessage("Username updated successfully!");
    setEditMode(false);
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

  if (!userInfo) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Your Profile</h2>

        <div className="mb-4 text-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full mx-auto" />
          ) : (
            <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="mt-2 text-sm"
          />
          {avatarUrl && (
            <button
              onClick={handleDeleteAvatar}
              className="mt-2 text-red-500 text-sm hover:underline"
            >
              Delete your profile photo 
            </button>
          )}
        </div>

        <div className="mb-4">
          <strong>Email:</strong> <p>{userInfo.email}</p>
        </div>

        <div className="mb-4">
          <strong>Username:</strong>
          {editMode ? (
            <>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full p-2 border rounded mt-2"
              />
              <button
                onClick={handleUsernameUpdate}
                className="mt-2 bg-green-500 text-white py-1 px-4 rounded"
              >
                Save
              </button>
            </>
          ) : (
            <div className="flex justify-between items-center mt-1">
              <p>{userInfo.username}</p>
              <button
                onClick={() => setEditMode(true)}
                className="text-blue-500 hover:underline text-sm"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <strong>Role:</strong> <p>{userInfo.role}</p>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/resetPassword')}
            className="mt-2 bg-blue-500 text-white py-2 px-4 rounded"
          >
            Change Password
          </button>
        </div>

        {message && <p className="text-sm text-center mt-4 text-green-600">{message}</p>}
      </div>
    </div>
  );
};

export default Profile;