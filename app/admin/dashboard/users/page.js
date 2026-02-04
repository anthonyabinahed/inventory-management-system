"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
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

  useEffect(() => {
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
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">User Management</h1>
            <p className="text-base-content/60 mt-1">
              Manage team members and their access ({users.length} users)
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowInviteModal(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              {/* TODO: update to react lucid */}
              <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
            </svg>
            Invite User
          </button>
        </div>

        {/* Users Table */}
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-bold">
                            {user.full_name || "—"}
                          </div>
                          <div className="text-sm opacity-50">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="relative inline-block">
                        <select
                          className={`select select-sm select-bordered transition-opacity ${
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
                          <span className="loading loading-spinner loading-xs absolute right-8 top-1/2 -translate-y-1/2"></span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      {user.id === currentUserId ? (
                        <span className="badge badge-ghost">You</span>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() =>
                            handleRevokeAccess(user.id, user.email)
                          }
                          disabled={revokingUsers.has(user.id)}
                        >
                          {revokingUsers.has(user.id) && (
                            <span className="loading loading-spinner loading-xs"></span>
                          )}
                          Revoke Access
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-base-content/60">No users found</p>
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
        {showInviteModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <button
                className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                onClick={() => setShowInviteModal(false)}
              >
                x
              </button>

              <h3 className="font-bold text-lg mb-4">Invite New User</h3>

              <form onSubmit={handleInvite} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email *</span>
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input input-bordered"
                    placeholder="colleague@company.com"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="input input-bordered"
                    placeholder="John Doe"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Role</span>
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="select select-bordered"
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

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowInviteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isInviting}
                  >
                    {isInviting && (
                      <span className="loading loading-spinner loading-xs"></span>
                    )}
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
            <div
              className="modal-backdrop bg-black/50"
              onClick={() => setShowInviteModal(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
