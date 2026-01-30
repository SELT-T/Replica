// src/pages/UserManagement.jsx - COMPACT & PERMISSION BASED
import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Users, UserPlus, Trash2, Shield, Eye,
  Search, CheckCircle, Mail, Phone, Lock,
  Settings, Save, X, Crown, Activity, Building,
  AlertTriangle, Key, User, Star, Filter, Download
} from "lucide-react";

import CreateUserModal from "../components/CreateUserModal";

const getTheme = (isLight) => ({
  bg: isLight ? "bg-gray-50" : "bg-gray-900",
  card: isLight ? "bg-white border-gray-300 shadow" : "bg-gray-800 border-gray-700",
  textMain: isLight ? "text-gray-800" : "text-white",
  textMuted: isLight ? "text-gray-600" : "text-gray-400",
  input: isLight ? "bg-gray-100 border-gray-300 text-gray-800" : "bg-gray-700 border-gray-600 text-white",
  tableHeader: isLight ? "bg-gray-200 text-gray-700" : "bg-gray-900 text-gray-300",
  tableRowHover: isLight ? "hover:bg-gray-100" : "hover:bg-gray-700",
  borderColor: isLight ? "border-gray-300" : "border-gray-700",
  accentText: isLight ? "text-blue-600" : "text-blue-400",
  accentBg: isLight ? "bg-blue-600 text-white" : "bg-blue-700 text-white"
});

export default function UserManagement({ isLight }) {
  const {
    user: currentUser,
    users,
    approveUser,
    updateUserData,
    deleteUser,
    createUser,
    fetchUsers,
    isAdmin,
    isMIS,
    companies,
    partyGroups,
  } = useAuth();

  const theme = getTheme(isLight);

  // Check if user can manage users
  const canManageUsers = isAdmin || isMIS;

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState(null);

  // Load users on mount
  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers]);

  // --- LOGIC CHANGE: If User cannot manage, Show Profile View Only ---
  if (!canManageUsers) {
    return <UserProfileView user={currentUser} isLight={isLight} theme={theme} />;
  }

  // --- FILTERS ---
  const filteredUsers = useMemo(() => {
    let result = users || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.company?.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== "all") {
      result = result.filter((u) => u.status === filterStatus);
    }

    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    return result;
  }, [users, searchQuery, filterStatus, filterRole]);

  // --- STATS ---
  const stats = useMemo(() => {
    const all = users || [];
    return {
      total: all.length,
      active: all.filter((u) => u.status === "active").length,
      pending: all.filter((u) => u.status === "pending").length,
      admins: all.filter((u) => u.role === "admin").length,
      mis: all.filter((u) => u.role === "mis").length,
      regularUsers: all.filter((u) => u.role === "user").length,
    };
  }, [users]);

  // --- ACTIONS ---
  const handleApprove = async (userId) => {
    if (!window.confirm("Approve this user?")) return;
    const res = await approveUser(userId);
    if (!res.success) alert(res.message);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    const res = await deleteUser(userId);
    if (!res.success) alert(res.message);
  };

  const handleEditPermissions = (user) => {
    setEditingPermissions({
      ...user,
      permissions: user.permissions ? JSON.parse(JSON.stringify(user.permissions)) : {},
      allowedCompanies: user.allowedCompanies || [],
      allowedPartyGroups: user.allowedPartyGroups || [],
      companyLockEnabled: !!user.companyLockEnabled,
      partyLockEnabled: !!user.partyLockEnabled,
    });
    setShowPermissionModal(true);
  };

  const handleSavePermissions = async () => {
    if (!editingPermissions) return;

    const payload = {
      permissions: editingPermissions.permissions || {},
      role: editingPermissions.role,
      status: editingPermissions.status,
      loginMethod: editingPermissions.loginMethod,
      companyLockEnabled: editingPermissions.companyLockEnabled ? 1 : 0,
      allowedCompanies: editingPermissions.allowedCompanies,
      partyLockEnabled: editingPermissions.partyLockEnabled ? 1 : 0,
      allowedPartyGroups: editingPermissions.allowedPartyGroups,
    };

    const res = await updateUserData(editingPermissions.id, payload);
    if (!res.success) {
      alert(res.message || "Failed to update user");
      return;
    }

    setShowPermissionModal(false);
    setEditingPermissions(null);
  };

  const togglePermission = (module, perm) => {
    setEditingPermissions((prev) => {
      const currentPermissions = prev.permissions || {};
      const existingModulePerms = currentPermissions[module] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
        export: false,
      };

      return {
        ...prev,
        permissions: {
          ...currentPermissions,
          [module]: {
            ...existingModulePerms,
            [perm]: !existingModulePerms[perm],
          },
        },
      };
    });
  };

  const setAllModulePermissions = (module, value) => {
    setEditingPermissions((prev) => {
      const currentPermissions = prev.permissions || {};
      return {
        ...prev,
        permissions: {
          ...currentPermissions,
          [module]: {
            view: value,
            create: value,
            edit: value,
            delete: value,
            export: value,
          },
        },
      };
    });
  };

  // Export users to CSV
  const exportUsers = () => {
    const exportData = filteredUsers.map(u => ({
      Name: u.name,
      Email: u.email,
      Phone: u.phone,
      Role: u.role,
      Status: u.status,
      Company: u.company,
      'Login Method': u.loginMethod,
      'Created At': u.createdAt
    }));
    
    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
  };

  return (
    <div className={`min-h-screen ${theme.bg} p-2 sm:p-3 md:p-4 overflow-x-hidden`}>
      <div className="max-w-7xl mx-auto space-y-3">
        {/* HEADER - COMPACT */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className={`text-xl font-bold flex items-center gap-2 ${theme.accentText}`}>
              <Users size={20} /> User Management
            </h1>
            <p className={`text-xs mt-1 ${theme.textMuted}`}>
              Manage user access and permissions • Total: {stats.total} users
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportUsers}
              className={`px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs flex items-center gap-1`}
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`px-3 py-1.5 ${theme.accentBg} rounded-lg text-xs flex items-center gap-1`}
            >
              <UserPlus size={14} /> Add User
            </button>
          </div>
        </div>

        {/* STATS - COMPACT */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
          <StatCard title="Total" value={stats.total} icon={<Users size={12} />} color="gray" isLight={isLight} />
          <StatCard title="Active" value={stats.active} icon={<CheckCircle size={12} />} color="green" isLight={isLight} />
          <StatCard title="Pending" value={stats.pending} icon={<AlertTriangle size={12} />} color="yellow" isLight={isLight} />
          <StatCard title="Admins" value={stats.admins} icon={<Crown size={12} />} color="red" isLight={isLight} />
          <StatCard title="MIS" value={stats.mis} icon={<Shield size={12} />} color="blue" isLight={isLight} />
          <StatCard title="Users" value={stats.regularUsers} icon={<User size={12} />} color="purple" isLight={isLight} />
        </div>

        {/* FILTERS - COMPACT */}
        <div className={`${theme.card} rounded-lg border p-2`}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2 relative">
              <Search className={`absolute left-2 top-2 ${theme.textMuted}`} size={14} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${theme.input} pl-8 pr-2 py-1.5 text-sm rounded focus:outline-none`}
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`${theme.input} px-2 py-1.5 text-sm rounded`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={`${theme.input} px-2 py-1.5 text-sm rounded`}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="mis">MIS</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>

        {/* TABLE - COMPACT & SCROLLABLE */}
        <div className={`${theme.card} rounded-lg border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-xs">
              <thead className={`${theme.tableHeader}`}>
                <tr>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Contact</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Login</th>
                  <th className="px-3 py-2 text-left">Company</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>

              <tbody className={`divide-y ${theme.borderColor}`}>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={`text-center py-4 ${theme.textMuted}`}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className={`${theme.tableRowHover}`}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900 text-blue-300'}`}>
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className={`font-medium ${theme.textMain}`}>{u.name}</div>
                            <div className={`text-[10px] ${theme.textMuted}`}>{u.company || "—"}</div>
                          </div>
                        </div>
                      </td>

                      <td className={`px-3 py-2 ${theme.textMuted} text-xs`}>
                        {u.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={10} /> {u.email}
                          </div>
                        )}
                        {u.phone && (
                          <div className="flex items-center gap-1 mt-1">
                            <Phone size={10} /> {u.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
                          ${
                            u.role === "admin"
                              ? "bg-red-500/20 text-red-500"
                              : u.role === "mis"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-green-500/20 text-green-500"
                          }`}
                        >
                          {u.role?.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
                          ${
                            u.status === "active"
                              ? "bg-green-500/20 text-green-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }`}
                        >
                          {u.status?.toUpperCase()}
                        </span>
                      </td>

                      <td className={`px-3 py-2 ${theme.textMuted} text-xs`}>
                        {u.loginMethod === "phone" ? "Phone/OTP" : "Email"}
                      </td>

                      <td className={`px-3 py-2 ${theme.textMuted} text-xs`}>
                        {!u.companyLockEnabled
                          ? "All Companies"
                          : (u.allowedCompanies || []).slice(0, 2).join(", ") + ((u.allowedCompanies || []).length > 2 ? "..." : "")}
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className={`p-1 rounded ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-blue-600' : 'bg-gray-700 hover:bg-gray-600 text-blue-400'}`}
                            title="View Details"
                          >
                            <Eye size={12} />
                          </button>

                          {u.status === "pending" && (
                            <button
                              onClick={() => handleApprove(u.id)}
                              className="p-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-500"
                              title="Approve User"
                            >
                              <CheckCircle size={12} />
                            </button>
                          )}

                          {u.id !== currentUser?.id && (
                            <>
                              <button
                                onClick={() => handleEditPermissions(u)}
                                className={`p-1 rounded ${isLight ? 'bg-blue-50 hover:bg-blue-100 text-blue-600' : 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-400'}`}
                                title="Edit Permissions"
                              >
                                <Settings size={12} />
                              </button>

                              <button
                                onClick={() => handleDelete(u.id)}
                                className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-500"
                                title="Delete User"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className={`${theme.card} rounded-lg border p-2 text-xs ${theme.textMuted}`}>
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div>
              Showing <span className="font-bold">{filteredUsers.length}</span> of <span className="font-bold">{users?.length || 0}</span> users
            </div>
            <div className="flex gap-3 mt-1 sm:mt-0">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Active</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* MODALS */}
        {selectedUser && (
          <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} isLight={isLight} theme={theme} />
        )}

        {showPermissionModal && editingPermissions && (
          <PermissionEditorModal
            user={editingPermissions}
            onClose={() => {
              setShowPermissionModal(false);
              setEditingPermissions(null);
            }}
            onSave={handleSavePermissions}
            togglePermission={togglePermission}
            setAllModulePermissions={setAllModulePermissions}
            setEditingPermissions={setEditingPermissions}
            companies={companies}
            partyGroups={partyGroups}
            isLight={isLight}
            theme={theme}
          />
        )}

        {showCreateModal && (
          <CreateUserModal
            onClose={() => setShowCreateModal(false)}
            isLight={isLight}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------ COMPONENTS ------------------------------ */

function StatCard({ title, value, icon, color, isLight }) {
  const colors = {
    gray: isLight ? "bg-gray-100 border-gray-300 text-gray-700" : "bg-gray-800 border-gray-700 text-gray-300",
    green: isLight ? "bg-green-100 border-green-300 text-green-700" : "bg-green-900/30 border-green-800 text-green-400",
    yellow: isLight ? "bg-yellow-100 border-yellow-300 text-yellow-700" : "bg-yellow-900/30 border-yellow-800 text-yellow-400",
    red: isLight ? "bg-red-100 border-red-300 text-red-700" : "bg-red-900/30 border-red-800 text-red-400",
    blue: isLight ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-blue-900/30 border-blue-800 text-blue-400",
    purple: isLight ? "bg-purple-100 border-purple-300 text-purple-700" : "bg-purple-900/30 border-purple-800 text-purple-400",
  };

  return (
    <div className={`border rounded-lg p-2 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="opacity-70">{icon}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
      <div className="text-[10px] uppercase font-bold opacity-70">{title}</div>
    </div>
  );
}

/* ---------------------- USER PROFILE VIEW (For Normal Users) ---------------------- */

function UserProfileView({ user, isLight, theme }) {
  const modules = [
    "dashboard", "reports", "hierarchy", "outstanding", 
    "analyst", "messaging", "setting", "helpsupport"
  ];

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}>
        <div className={`text-center ${theme.textMuted}`}>
          <Activity className={`mx-auto mb-2 ${theme.accentText}`} size={20} />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const hasAnyPermission = (module) => {
    const perms = user.permissions?.[module] || {};
    return Object.values(perms).some(Boolean);
  };

  return (
    <div className={`min-h-screen ${theme.bg} p-3 md:p-4 flex justify-center`}>
      <div className={`max-w-4xl w-full space-y-3`}>
        
        {/* Profile Header Card */}
        <div className={`${theme.card} rounded-lg p-4 border shadow-sm`}>
           <div className="flex flex-col md:flex-row items-center gap-4">
             <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${isLight ? "bg-blue-100 text-blue-700" : "bg-blue-900 text-blue-300"}`}>
                {user.name?.charAt(0)?.toUpperCase()}
             </div>
             <div className="text-center md:text-left">
                <h2 className={`text-xl font-bold ${theme.textMain} flex flex-col md:flex-row items-center gap-2`}>
                   {user.name}
                   <span className={`text-xs px-2 py-0.5 rounded-full border ${isLight ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-blue-900/30 text-blue-400 border-blue-800"}`}>
                      {user.role?.toUpperCase()}
                   </span>
                </h2>
                <div className={`mt-2 flex flex-col gap-1 ${theme.textMuted} text-sm`}>
                   <p className="flex items-center gap-1"><Mail size={14}/> {user.email}</p>
                   {user.phone && <p className="flex items-center gap-1"><Phone size={14}/> {user.phone}</p>}
                   <p className="flex items-center gap-1"><CheckCircle size={14}/> Status: <span className="capitalize">{user.status}</span></p>
                </div>
             </div>
           </div>
        </div>

        {/* Permissions Grid */}
        <div>
           <h3 className={`text-lg font-bold mb-2 ${theme.textMain} flex items-center gap-2`}>
              <Key size={16} className={theme.accentText} /> My Access Permissions
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {modules.map(mod => {
                 const perms = user.permissions?.[mod] || {};
                 const hasAny = hasAnyPermission(mod);
                 
                 return (
                    <div key={mod} className={`p-3 rounded-lg border ${theme.card} ${!hasAny && "opacity-60"}`}>
                       <h4 className={`font-bold capitalize mb-2 ${theme.textMain} border-b ${theme.borderColor} pb-1 text-sm`}>
                          {mod.replace(/([A-Z])/g, ' $1')}
                       </h4>
                       <div className="flex flex-wrap gap-1">
                          {["view", "create", "edit", "delete", "export"].map(act => (
                             <span key={act} className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold 
                                ${perms[act] 
                                   ? (isLight ? "bg-green-100 text-green-700" : "bg-green-900/30 text-green-400") 
                                   : (isLight ? "bg-gray-100 text-gray-400" : "bg-gray-700 text-gray-500")}`}>
                                {act}
                             </span>
                          ))}
                       </div>
                    </div>
                 )
              })}
           </div>
        </div>

        {/* Locks Info */}
        <div className="grid md:grid-cols-2 gap-3">
           <div className={`p-3 rounded-lg border ${theme.card}`}>
              <h4 className={`font-bold mb-2 ${theme.textMain} flex items-center gap-2 text-sm`}><Building size={14}/> Company Access</h4>
              <p className={`text-xs ${theme.textMuted} bg-opacity-50 p-2 rounded ${isLight?"bg-gray-100":"bg-gray-900"}`}>
                 {user.companyLockEnabled ? 
                   <span className="flex flex-wrap gap-1">
                     {user.allowedCompanies?.map((c, i) => (
                       <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs">{c}</span>
                     ))}
                   </span>
                   : "🌍 All Companies Accessible"}
              </p>
           </div>
           <div className={`p-3 rounded-lg border ${theme.card}`}>
              <h4 className={`font-bold mb-2 ${theme.textMain} flex items-center gap-2 text-sm`}><Shield size={14}/> Party Group Access</h4>
              <p className={`text-xs ${theme.textMuted} bg-opacity-50 p-2 rounded ${isLight?"bg-gray-100":"bg-gray-900"}`}>
                 {user.partyLockEnabled ? 
                   <span className="flex flex-wrap gap-1">
                     {user.allowedPartyGroups?.map((g, i) => (
                       <span key={i} className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-xs">{g}</span>
                     ))}
                   </span>
                   : "🌍 All Groups Accessible"}
              </p>
           </div>
        </div>

        {/* Quick Summary */}
        <div className={`p-3 rounded-lg border ${theme.card}`}>
          <h4 className={`font-bold mb-2 ${theme.textMain} text-sm`}>Access Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Full Access: {modules.filter(m => hasAnyPermission(m)).length} modules</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>View Only: {modules.filter(m => user.permissions?.[m]?.view && !user.permissions?.[m]?.edit).length} modules</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ---------------------- USER DETAILS MODAL ---------------------- */

function UserDetailsModal({ user, onClose, isLight, theme }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-2">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${theme.card} border rounded-lg max-w-md w-full p-4 z-50 shadow-xl`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-lg font-bold ${theme.textMain}`}>User Details</h3>
          <button onClick={onClose}><X size={16} className={theme.textMuted} /></button>
        </div>
        <div className={`text-xs p-3 rounded overflow-auto max-h-96 ${isLight ? "bg-gray-100 text-gray-800" : "bg-gray-900 text-gray-300"}`}>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- PERMISSION EDITOR MODAL ---------------------- */

function PermissionEditorModal({
  user: editingUser,
  onClose,
  onSave,
  togglePermission,
  setAllModulePermissions,
  setEditingPermissions,
  companies = [],
  partyGroups = [],
  isLight,
  theme
}) {
  const modules = [
    { key: "dashboard", label: "Dashboard" },
    { key: "reports", label: "Reports" },
    { key: "hierarchy", label: "Company Hierarchy" },
    { key: "outstanding", label: "Outstanding" },
    { key: "analyst", label: "Analyst" },
    { key: "messaging", label: "Messaging" },
    { key: "usermanagement", label: "User Management" },
    { key: "setting", label: "Settings" },
    { key: "helpsupport", label: "Help & Support" },
  ];

  const isAdminRole = editingUser.role === "admin";

  const toggleInArray = (field, value) => {
    setEditingPermissions((prev) => {
      const list = new Set(prev[field] || []);
      if (list.has(value)) list.delete(value);
      else list.add(value);
      return { ...prev, [field]: Array.from(list) };
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-2">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative ${theme.card} border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden z-50 shadow-2xl flex flex-col`}>
        
        {/* HEADER */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${theme.borderColor}`}>
          <div className="flex items-center gap-2">
            <Settings className={theme.accentText} size={16} />
            <h3 className={`text-base font-semibold ${theme.textMain}`}>
              Edit Permissions – {editingUser.name}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-500">
            <X size={16} />
          </button>
        </div>

        {/* BODY */}
        <div className="grid md:grid-cols-[200px,1fr] gap-3 p-3 overflow-y-auto flex-1">
          
          {/* LEFT SIDEBAR */}
          <div className={`border ${theme.borderColor} rounded-lg p-3 space-y-3 h-fit`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isLight ? "bg-blue-100 text-blue-700" : "bg-blue-900 text-blue-300"}`}>
                {editingUser.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="text-xs">
                <div className={`font-semibold ${theme.textMain}`}>{editingUser.name}</div>
                <div className={`${theme.textMuted}`}>{editingUser.email || editingUser.phone}</div>
              </div>
            </div>

            {/* ROLE */}
            <div className="space-y-2 text-xs">
              <div>
                <label className={`block text-[10px] mb-1 ${theme.textMuted}`}>Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingPermissions((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className={`w-full ${theme.input} rounded px-2 py-1 text-xs outline-none`}
                >
                  <option value="user">User (Restricted)</option>
                  <option value="mis">MIS</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              {/* STATUS */}
              <div>
                <label className={`block text-[10px] mb-1 ${theme.textMuted}`}>Status</label>
                <select
                  value={editingUser.status}
                  onChange={(e) =>
                    setEditingPermissions((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className={`w-full ${theme.input} rounded px-2 py-1 text-xs outline-none`}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* COMPANY LOCK */}
              <div className={`mt-2 border-t ${theme.borderColor} pt-2`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] ${theme.textMuted}`}>Company Lock</span>
                  <button
                    onClick={() =>
                      setEditingPermissions((prev) => ({
                        ...prev,
                        companyLockEnabled: !prev.companyLockEnabled,
                      }))
                    }
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      editingUser.companyLockEnabled
                        ? "bg-red-500/20 text-red-500"
                        : "bg-green-500/20 text-green-500"
                    }`}
                  >
                    {editingUser.companyLockEnabled ? "Locked" : "Unlocked"}
                  </button>
                </div>

                {editingUser.companyLockEnabled && (
                  <div className="space-y-1 max-h-24 overflow-auto text-[10px]">
                    {companies.slice(0, 10).map((c) => {
                      const name = c.name || c.companyName || c;
                      return (
                        <label key={name} className={`flex items-center gap-1 cursor-pointer p-0.5 rounded ${theme.tableRowHover}`}>
                          <input
                            type="checkbox"
                            className="accent-blue-500"
                            checked={(editingUser.allowedCompanies || []).includes(name)}
                            onChange={() => toggleInArray("allowedCompanies", name)}
                          />
                          <span>{name.length > 20 ? name.substring(0, 20) + "..." : name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE – PERMISSION MATRIX */}
          <div className={`border ${theme.borderColor} rounded-lg p-3 ${isAdminRole ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`flex items-center gap-1 text-sm ${theme.textMain}`}>
                <Shield size={14} className={theme.accentText} />
                <span>Module Permissions</span>
              </div>
              {isAdminRole && <span className="text-xs text-orange-500 font-bold px-1.5 py-0.5 rounded bg-orange-500/10">Admin has ALL Permissions</span>}
            </div>

            <div className="overflow-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className={`${isLight ? "bg-gray-100 text-gray-700" : "bg-gray-900 text-gray-400"}`}>
                    <th className="text-left px-1 py-1">Module</th>
                    <th className="px-1 py-1">View</th>
                    <th className="px-1 py-1">Create</th>
                    <th className="px-1 py-1">Edit</th>
                    <th className="px-1 py-1">Delete</th>
                    <th className="px-1 py-1">Export</th>
                    <th className="px-1 py-1">ALL</th>
                  </tr>
                </thead>

                <tbody>
                  {modules.map((m) => {
                    const perms = editingUser.permissions?.[m.key] || {
                      view: false,
                      create: false,
                      edit: false,
                      delete: false,
                      export: false,
                    };

                    const allOn =
                      perms.view &&
                      perms.create &&
                      perms.edit &&
                      perms.delete &&
                      perms.export;

                    return (
                      <tr key={m.key} className={`border-t ${theme.borderColor} ${theme.tableRowHover}`}>
                        <td className={`px-1 py-1 ${theme.textMain} text-left`}>
                          {m.label}
                        </td>

                        {["view", "create", "edit", "delete", "export"].map((p) => (
                          <td key={p} className="px-1 py-1 text-center">
                            <button
                              onClick={() => togglePermission(m.key, p)}
                              className={`w-5 h-5 rounded flex items-center justify-center border text-[9px] transition-colors
                                ${
                                  perms[p]
                                    ? (isLight ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-blue-900/30 border-blue-700 text-blue-400")
                                    : (isLight ? "border-gray-300 text-gray-400" : "border-gray-600 text-gray-500")
                                }`}
                            >
                              {perms[p] ? "✓" : "-"}
                            </button>
                          </td>
                        ))}

                        <td className="px-1 py-1 text-center">
                          <button
                            onClick={() => setAllModulePermissions(m.key, !allOn)}
                            className={`px-2 py-0.5 rounded border text-[10px] ${
                              allOn
                                ? (isLight ? "bg-green-100 border-green-500 text-green-700" : "bg-green-900/30 border-green-700 text-green-400")
                                : (isLight ? "border-gray-300 text-gray-400" : "border-gray-600 text-gray-400")
                            }`}
                          >
                            {allOn ? "On" : "Off"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex justify-end gap-1">
              <button
                onClick={onClose}
                className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-xs"
              >
                Cancel
              </button>

              <button
                onClick={onSave}
                className={`px-3 py-1 rounded ${theme.accentBg} text-xs font-semibold`}
              >
                <Save size={12} className="inline mr-1" /> Save
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
