"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import toast from "react-hot-toast";
import { Plus, Send, X } from "lucide-react";
import { getCurrentUser } from "@/actions/auth";
import { getAllUsers } from "@/actions/users";
import { inviteUser, revokeUser, updateUserRole } from "@/actions/admin";

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Row-level loading states
  const [updatingRoles, setUpdatingRoles] = useState(new Set());
  const [revokingUsers, setRevokingUsers] = useState(new Set());

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isInviting, setIsInviting] = useState(false);

  // Prevent duplicate fetches from StrictMode
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [user, usersData] = await Promise.all([
        getCurrentUser(),
        getAllUsers()
      ]);

      if (user) {
        setCurrentUserId(user.id);
      }
      setUsers(usersData);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      const { success, errorMessage } = await inviteUser(inviteEmail, inviteName, inviteRole);

      if (!success) throw new Error(errorMessage);

      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("user");

      // Refresh user list
      loadData();
    } catch (error) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeAccess = async (userId, email) => {
    if (
      !confirm(
        `Are you sure you want to revoke access for ${email}?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    // Add to revoking set for loading state
    setRevokingUsers(prev => new Set(prev).add(userId));

    try {
      const { success, errorMessage } = await revokeUser(userId);

      if (!success) throw new Error(errorMessage);

      toast.success(`Access revoked for ${email}`);
      loadData();
    } catch (error) {
      toast.error(error.message || "Failed to revoke access");
    } finally {
      setRevokingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    // Add to updating set for loading state
    setUpdatingRoles(prev => new Set(prev).add(userId));

    try {
      await updateUserRole(userId, newRole);
      toast.success("Role updated successfully");
      loadData();
    } catch (error) {
      toast.error("Failed to update role");
    } finally {
      setUpdatingRoles(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px] sm:min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-end mb-4 sm:mb-8">
        <button
          className="btn btn-primary btn-sm sm:btn-md"
          onClick={() => setShowInviteModal(true)}
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Invite User</span>
          <span className="sm:hidden">Invite</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="card bg-base-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-sm sm:table-md">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th className="hidden md:table-cell">Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm sm:text-base truncate">
                          {user.full_name || "—"}
                        </div>
                        <div className="text-xs sm:text-sm opacity-50 truncate max-w-[100px] sm:max-w-[200px] md:max-w-none">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="relative inline-block">
                      <select
                        className={`select select-xs sm:select-sm select-bordered transition-opacity ${
                          updatingRoles.has(user.id) ? 'opacity-50' : ''
                        }`}
                        value={user.role}
                        onChange={(e) =>
                          handleUpdateRole(user.id, e.target.value)
                        }
                        disabled={user.id === currentUserId || updatingRoles.has(user.id)}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      {updatingRoles.has(user.id) && (
                        <span className="loading loading-spinner loading-xs absolute right-6 sm:right-8 top-1/2 -translate-y-1/2"></span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap hidden md:table-cell">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    {user.id === currentUserId ? (
                      <span className="badge badge-ghost badge-sm sm:badge-md">You</span>
                    ) : (
                      <button
                        className="btn btn-ghost btn-xs sm:btn-sm text-error"
                        onClick={() =>
                          handleRevokeAccess(user.id, user.email)
                        }
                        disabled={revokingUsers.has(user.id)}
                      >
                        {revokingUsers.has(user.id) && (
                          <span className="loading loading-spinner loading-xs"></span>
                        )}
                        <span className="hidden sm:inline">Revoke Access</span>
                        <span className="sm:hidden">Revoke</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <p className="text-base-content/60 text-sm sm:text-base">No users found</p>
            <button
              className="btn btn-primary btn-sm mt-4"
              onClick={() => setShowInviteModal(true)}
            >
              Invite First User
            </button>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Transition appear show={showInviteModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setShowInviteModal(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-base-100 shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <Dialog.Title as="h3" className="text-lg font-semibold">
                      Invite New User
                    </Dialog.Title>
                    <button
                      className="btn btn-ghost btn-sm btn-square"
                      onClick={() => setShowInviteModal(false)}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleInvite} className="p-6">
                    <div className="space-y-4">
                      {/* Email Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Email address</span>
                          <span className="label-text-alt text-error">*</span>
                        </label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="input input-bordered w-full"
                          placeholder="colleague@company.com"
                          required
                          autoComplete="email"
                        />
                      </div>

                      {/* Name Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Full name</span>
                          <span className="label-text-alt text-error">*</span>
                        </label>
                        <input
                          type="text"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          className="input input-bordered w-full"
                          placeholder="John Doe"
                          required
                          autoComplete="name"
                        />
                      </div>

                      {/* Role Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Role</span>
                        </label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="select select-bordered w-full"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <label className="label">
                          <span className="label-text-alt text-base-content/50">
                            Admins can invite and manage other users
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6 pt-4 border-t border-base-300">
                      <button
                        type="button"
                        className="btn btn-ghost flex-1"
                        onClick={() => setShowInviteModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary flex-1 gap-2"
                        disabled={isInviting}
                      >
                        {isInviting ? (
                          <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Invitation
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
