// src/pages/UserManagement.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Eye,
  Search,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Lock,
  Settings,
  Save,
  X,
  Crown,
  Activity,
  Building,
  AlertTriangle,
  Key
} from "lucide-react";

import CreateUserModal from "../components/CreateUserModal";

// --- THEME HELPER (To manage Colors easily) ---
const getTheme = (isLight) => ({
  bg: isLight ? "bg-[#F0F2F5]" : "bg-gradient-to-br from-[#0A192F] to-[#112240]",
  card: isLight ? "bg-white border-gray-300 shadow-md" : "bg-[#112240] border-[#1E2D45]",
  textMain: isLight ? "text-[#0A192F]" : "text-white",
  textMuted: isLight ? "text-gray-600" : "text-gray-400",
  input: isLight ? "bg-gray-50 border-gray-300 text-[#0A192F]" : "bg-[#0A192F] border-[#1E2D45] text-white",
  tableHeader: isLight ? "bg-gray-200 text-[#0A192F]" : "bg-[#0A192F] text-gray-400",
  tableRowHover: isLight ? "hover:bg-gray-100" : "hover:bg-[#0A192F]",
  borderColor: isLight ? "border-gray-300" : "border-[#1E2D45]",
  accentText: isLight ? "text-blue-600" : "text-[#64FFDA]",
  accentBg: isLight ? "bg-blue-600 text-white" : "bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F]"
});

export default function UserManagement({ isLight }) {
  const {
    user: currentUser,
    users,
    approveUser,
    updateUserData,
    deleteUser,
    createUser,
    canAccess,
    fetchUsers,
    isAdmin,
    isMIS,
    companies,
    partyGroups,
  } = useAuth();

  const theme = getTheme(isLight);

  const isAdminOrMIS = isAdmin || isMIS;
  // Fallback: If canAccess is undefined, allow access to Admins
  const canManageUsers = isAdmin || (canAccess && canAccess("usermanagement"));

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // EDITING STATE
  const [editingPermissions, setEditingPermissions] = useState(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    company: "",
    role: "user",
    status: "active",
    loginMethod: "email",
    companyLockEnabled: false,
    partyLockEnabled: false,
    allowedCompanies: [],
    allowedPartyGroups: [],
  });
  const [createMsg, setCreateMsg] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

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
    // Deep copy to avoid mutating state directly and handle nulls
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

    // Construct Payload safely
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

  // --- TOGGLE LOGIC ---
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

  // --- CREATE USER ---
  const handleCreateUser = async () => {
    setCreateMsg("");

    if (createForm.loginMethod === "email" && !createForm.email)
      return setCreateMsg("❌ Email required");

    if (createForm.loginMethod === "phone") {
      if (!createForm.phone) return setCreateMsg("❌ Phone required");
      if (createForm.phone.length < 10)
        return setCreateMsg("❌ Enter valid phone");
    }

    if (!createForm.password || createForm.password.length < 6)
      return setCreateMsg("❌ Password must be at least 6 characters");

    try {
      setCreateLoading(true);
      const res = await createUser(createForm);
      setCreateLoading(false);

      if (!res.success) return setCreateMsg("❌ " + (res.message || "Failed"));

      setCreateMsg("✅ User created!");
      setCreateForm((f) => ({
        ...f,
        name: "",
        email: "",
        phone: "",
        password: "",
        company: "",
        role: "user",
        status: "active",
      }));

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateMsg("");
      }, 800);
    } catch (e) {
      setCreateLoading(false);
      setCreateMsg("❌ Something went wrong");
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} p-6 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold flex items-center gap-3 ${theme.accentText}`}>
              <Users size={32} /> User Management
            </h1>
            <p className={`text-sm mt-1 ${theme.textMuted}`}>
              Manage users, roles, and permissions
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-4 py-2 ${theme.accentBg} rounded-lg font-bold shadow-lg hover:scale-105 transition`}
          >
            <UserPlus size={18} className="inline mr-2" /> Create User
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard title="Total Users" value={stats.total} icon={<Users />} color="blue" isLight={isLight} theme={theme} />
          <StatCard title="Active" value={stats.active} icon={<CheckCircle />} color="green" isLight={isLight} theme={theme} />
          <StatCard title="Pending" value={stats.pending} icon={<Clock />} color="yellow" isLight={isLight} theme={theme} />
          <StatCard title="Admins" value={stats.admins} icon={<Crown />} color="red" isLight={isLight} theme={theme} />
          <StatCard title="MIS" value={stats.mis} icon={<Shield />} color="purple" isLight={isLight} theme={theme} />
          <StatCard title="Users" value={stats.regularUsers} icon={<Users />} color="cyan" isLight={isLight} theme={theme} />
        </div>

        {/* FILTERS */}
        <div className={`${theme.card} rounded-xl border p-4`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className={`absolute left-3 top-3 ${theme.textMuted}`} size={18} />
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${theme.input} pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500`}
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`${theme.input} px-4 py-2 rounded-lg`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={`${theme.input} px-4 py-2 rounded-lg`}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="mis">MIS</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className={`${theme.card} rounded-xl border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${theme.tableHeader} border-b ${theme.borderColor}`}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase opacity-70">User</th>
                  <th className="px-4 py-3 text-left text-xs uppercase opacity-70">Contact</th>
                  <th className="px-4 py-3 text-left text-xs uppercase opacity-70">Role</th>
                  <th className="px-4 py-3 text-left text-xs uppercase opacity-70">Status</th>
                  <th className="px-4 py-3 text-left text-xs uppercase opacity-70">Login</th>
                  <th className="px-4 py-3 text-left text-xs uppercase opacity-70">Company</th>
                  <th className="px-4 py-3 text-left text-xs uppercase opacity-70">Party</th>
                  <th className="px-4 py-3 text-left text-xs uppercase opacity-70">Actions</th>
                </tr>
              </thead>

              <tbody className={`divide-y ${theme.borderColor}`}>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={`text-center py-6 ${theme.textMuted}`}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className={`${theme.tableRowHover}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F]'}`}>
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className={`font-medium ${theme.textMain}`}>{u.name}</div>
                            <div className={`text-xs ${theme.textMuted}`}>{u.company || "—"}</div>
                          </div>
                        </div>
                      </td>

                      <td className={`px-4 py-3 text-sm ${theme.textMuted}`}>
                        {u.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={14} /> {u.email}
                          </div>
                        )}
                        {u.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={14} /> {u.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold
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

                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${
                            u.status === "active"
                              ? "bg-green-500/20 text-green-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }`}
                        >
                          {u.status?.toUpperCase()}
                        </span>
                      </td>

                      <td className={`px-4 py-3 ${theme.textMuted} text-sm`}>
                        {u.loginMethod === "phone" ? "Phone/OTP" : "Email/Password"}
                      </td>

                      <td className={`px-4 py-3 ${theme.textMuted} text-xs`}>
                        {!u.companyLockEnabled
                          ? "All Companies"
                          : (u.allowedCompanies || []).join(", ") || "None"}
                      </td>

                      <td className={`px-4 py-3 ${theme.textMuted} text-xs`}>
                        {!u.partyLockEnabled
                          ? "All Groups"
                          : (u.allowedPartyGroups || []).length + " groups"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className={`p-2 rounded-lg ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-blue-600' : 'bg-[#0A192F] hover:bg-[#64FFDA]/10 text-[#64FFDA]'}`}
                          >
                            <Eye size={16} />
                          </button>

                          {u.status === "pending" && (
                            <button
                              onClick={() => handleApprove(u.id)}
                              className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-500"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}

                          {u.id !== currentUser?.id && (
                            <>
                              <button
                                onClick={() => handleEditPermissions(u)}
                                className={`p-2 rounded-lg ${isLight ? 'bg-blue-50 hover:bg-blue-100 text-blue-600' : 'bg-[#0A192F] hover:bg-[#64FFDA]/10 text-[#64FFDA]'}`}
                              >
                                <Settings size={16} />
                              </button>

                              <button
                                onClick={() => handleDelete(u.id)}
                                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500"
                              >
                                <Trash2 size={16} />
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
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreateUser}
            onClose={() => {
              setShowCreateModal(false);
              setCreateMsg("");
            }}
            msg={createMsg}
            loading={createLoading}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------ COMPONENTS ------------------------------ */

function StatCard({ title, value, icon, color, isLight }) {
  const colors = {
    blue: isLight ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-blue-500/10 border-blue-500/30 text-white",
    green: isLight ? "bg-green-50 border-green-200 text-green-700" : "bg-green-500/10 border-green-500/30 text-white",
    yellow: isLight ? "bg-yellow-50 border-yellow-200 text-yellow-700" : "bg-yellow-500/10 border-yellow-500/30 text-white",
    red: isLight ? "bg-red-50 border-red-200 text-red-700" : "bg-red-500/10 border-red-500/30 text-white",
    purple: isLight ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-purple-500/10 border-purple-500/30 text-white",
    cyan: isLight ? "bg-cyan-50 border-cyan-200 text-cyan-700" : "bg-cyan-500/10 border-cyan-500/30 text-white",
  };

  return (
    <div className={`border rounded-xl p-4 shadow-sm ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="opacity-80">{icon}</div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
      <div className="text-xs uppercase font-bold opacity-70">{title}</div>
    </div>
  );
}

/* ---------------------- NEW USER PROFILE VIEW (For Normal Users) ---------------------- */

function UserProfileView({ user, isLight, theme }) {
  const modules = [
    "dashboard", "reports", "hierarchy", "outstanding", 
    "analyst", "messaging", "usermanagement", "setting"
  ];

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}>
        <div className={`text-center ${theme.textMuted}`}>
          <Activity className={`mx-auto mb-3 ${theme.accentText}`} />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} p-6 flex justify-center`}>
      <div className={`max-w-5xl w-full space-y-6`}>
        
        {/* Profile Header Card */}
        <div className={`${theme.card} rounded-2xl p-8 border shadow-lg flex flex-col md:flex-row items-center gap-8`}>
           <div className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold shadow-xl ${isLight ? "bg-blue-100 text-blue-700" : "bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F]"}`}>
              {user.name?.charAt(0)?.toUpperCase()}
           </div>
           <div className="text-center md:text-left flex-1">
              <h2 className={`text-3xl font-bold ${theme.textMain} flex items-center justify-center md:justify-start gap-3`}>
                 {user.name}
                 <span className={`text-xs px-3 py-1 rounded-full border ${isLight ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-[#64FFDA]/10 text-[#64FFDA] border-[#64FFDA]/30"}`}>
                    {user.role?.toUpperCase()}
                 </span>
              </h2>
              <div className={`mt-3 flex flex-col md:flex-row gap-4 ${theme.textMuted}`}>
                 <p className="flex items-center gap-2"><Mail size={16}/> {user.email}</p>
                 <p className="flex items-center gap-2"><Phone size={16}/> {user.phone || "No phone linked"}</p>
                 <p className="flex items-center gap-2"><CheckCircle size={16}/> Status: {user.status}</p>
              </div>
           </div>
        </div>

        {/* Permissions Grid */}
        <div>
           <h3 className={`text-xl font-bold mb-4 ${theme.textMain} flex items-center gap-2`}>
              <Key size={20} className={theme.accentText} /> My Access Permissions
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map(mod => {
                 const perms = user.permissions?.[mod] || {};
                 const hasAny = Object.values(perms).some(Boolean);
                 return (
                    <div key={mod} className={`p-5 rounded-xl border ${theme.card} ${!hasAny && "opacity-50"}`}>
                       <h4 className={`font-bold capitalize mb-3 ${theme.textMain} border-b ${theme.borderColor} pb-2`}>{mod}</h4>
                       <div className="flex flex-wrap gap-2">
                          {["view", "create", "edit", "delete", "export"].map(act => (
                             <span key={act} className={`text-[10px] px-2 py-1 rounded uppercase font-bold 
                                ${perms[act] 
                                   ? (isLight ? "bg-green-100 text-green-700" : "bg-green-500/20 text-green-400") 
                                   : (isLight ? "bg-gray-100 text-gray-400" : "bg-white/5 text-gray-600")}`}>
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
        <div className="grid md:grid-cols-2 gap-6">
           <div className={`p-6 rounded-xl border ${theme.card}`}>
              <h4 className={`font-bold mb-3 ${theme.textMain} flex items-center gap-2`}><Building size={18}/> Company Access</h4>
              <p className={`text-sm ${theme.textMuted} bg-opacity-50 p-3 rounded-lg ${isLight?"bg-gray-50":"bg-black/20"}`}>
                 {user.companyLockEnabled ? user.allowedCompanies.join(", ") : "🌍 All Companies Accessible"}
              </p>
           </div>
           <div className={`p-6 rounded-xl border ${theme.card}`}>
              <h4 className={`font-bold mb-3 ${theme.textMain} flex items-center gap-2`}><Shield size={18}/> Party Group Access</h4>
              <p className={`text-sm ${theme.textMuted} bg-opacity-50 p-3 rounded-lg ${isLight?"bg-gray-50":"bg-black/20"}`}>
                 {user.partyLockEnabled ? user.allowedPartyGroups.join(", ") : "🌍 All Groups Accessible"}
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}

/* ---------------------- USER DETAILS MODAL ---------------------- */

function UserDetailsModal({ user, onClose, isLight, theme }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${theme.card} border rounded-2xl max-w-xl w-full p-6 z-50 shadow-2xl`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-bold ${theme.textMain}`}>User Details</h3>
          <button onClick={onClose}><X size={18} className={theme.textMuted} /></button>
        </div>
        <pre className={`text-xs p-4 rounded overflow-auto max-h-96 ${isLight ? "bg-gray-100 text-gray-800" : "bg-black/30 text-gray-300"}`}>
          {JSON.stringify(user, null, 2)}
        </pre>
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
    <div className="fixed inset-0 z-40 flex items-center justify-center px-2 md:px-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className={`relative ${theme.card} border rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden z-50 shadow-2xl flex flex-col`}>
        
        {/* HEADER */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${theme.borderColor} ${isLight ? "bg-gray-50" : "bg-[#0A192F]"}`}>
          <div className="flex items-center gap-2">
            <Settings className={theme.accentText} size={18} />
            <h3 className={`text-lg font-semibold ${theme.textMain}`}>
              Edit Permissions – {editingUser.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* BODY */}
        <div className="grid md:grid-cols-[260px,1fr] gap-4 p-4 overflow-y-auto flex-1">
          
          {/* LEFT SIDEBAR */}
          <div className={`border ${theme.borderColor} ${isLight ? "bg-white" : "bg-[#0A192F]"} rounded-xl p-4 space-y-4 h-fit`}>

            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isLight ? "bg-blue-100 text-blue-700" : "bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F]"}`}>
                {editingUser.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div className={`text-sm font-semibold ${theme.textMain}`}>{editingUser.name}</div>
                <div className={`text-xs ${theme.textMuted}`}>{editingUser.email || editingUser.phone}</div>
              </div>
            </div>

            {/* ROLE */}
            <div className={`space-y-3 text-xs ${theme.textMain}`}>
              <div>
                <label className={`block text-[11px] mb-1 ${theme.textMuted}`}>Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingPermissions((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className={`w-full ${theme.input} rounded-lg px-2 py-1.5 text-xs outline-none`}
                >
                  <option value="user">User (Restricted)</option>
                  <option value="mis">MIS</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
                {isAdminRole && (
                    <div className="mt-1 flex items-start gap-1 text-orange-500">
                        <AlertTriangle size={12} className="mt-0.5"/>
                        <span className="text-[10px] leading-tight">Admin role overrides all permissions below.</span>
                    </div>
                )}
              </div>

              {/* STATUS */}
              <div>
                <label className={`block text-[11px] mb-1 ${theme.textMuted}`}>Status</label>
                <select
                  value={editingUser.status}
                  onChange={(e) =>
                    setEditingPermissions((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className={`w-full ${theme.input} rounded-lg px-2 py-1.5 text-xs outline-none`}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* LOGIN METHOD */}
              <div>
                <label className={`block text-[11px] mb-1 ${theme.textMuted}`}>Login Method</label>
                <select
                  value={editingUser.loginMethod || "email"}
                  onChange={(e) =>
                    setEditingPermissions((prev) => ({ ...prev, loginMethod: e.target.value }))
                  }
                  className={`w-full ${theme.input} rounded-lg px-2 py-1.5 text-xs outline-none`}
                >
                  <option value="email">Email / Password</option>
                  <option value="phone">Phone / OTP</option>
                </select>
              </div>

              {/* COMPANY LOCK */}
              <div className={`mt-3 border-t ${theme.borderColor} pt-3`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] ${theme.textMuted}`}>Company Lock</span>
                  <button
                    onClick={() =>
                      setEditingPermissions((prev) => ({
                        ...prev,
                        companyLockEnabled: !prev.companyLockEnabled,
                      }))
                    }
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] ${
                      editingUser.companyLockEnabled
                        ? "bg-red-500/20 text-red-500"
                        : "bg-green-500/20 text-green-500"
                    }`}
                  >
                    <Lock size={11} />
                    {editingUser.companyLockEnabled ? "Locked" : "Unlocked"}
                  </button>
                </div>

                {editingUser.companyLockEnabled && (
                  <div className="space-y-1 max-h-32 overflow-auto text-[11px] custom-scrollbar">
                    {companies.map((c) => {
                      const name = c.name || c.companyName || c;
                      return (
                        <label key={name} className={`flex items-center gap-2 cursor-pointer p-1 rounded ${theme.tableRowHover}`}>
                          <input
                            type="checkbox"
                            className="accent-[#64FFDA]"
                            checked={(editingUser.allowedCompanies || []).includes(name)}
                            onChange={() => toggleInArray("allowedCompanies", name)}
                          />
                          <span>{name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PARTY LOCK */}
              <div className={`mt-3 border-t ${theme.borderColor} pt-3`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] ${theme.textMuted}`}>Party Group Lock</span>
                  <button
                    onClick={() =>
                      setEditingPermissions((prev) => ({
                        ...prev,
                        partyLockEnabled: !prev.partyLockEnabled,
                      }))
                    }
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] ${
                      editingUser.partyLockEnabled
                        ? "bg-red-500/20 text-red-500"
                        : "bg-green-500/20 text-green-500"
                    }`}
                  >
                    <Lock size={11} />
                    {editingUser.partyLockEnabled ? "Locked" : "Unlocked"}
                  </button>
                </div>

                {editingUser.partyLockEnabled && (
                  <div className="space-y-1 max-h-32 overflow-auto text-[11px] custom-scrollbar">
                    {partyGroups.map((g) => {
                      const name = g.name || g.groupName || g;
                      return (
                        <label key={name} className={`flex items-center gap-2 cursor-pointer p-1 rounded ${theme.tableRowHover}`}>
                          <input
                            type="checkbox"
                            className="accent-[#64FFDA]"
                            checked={(editingUser.allowedPartyGroups || []).includes(name)}
                            onChange={() => toggleInArray("allowedPartyGroups", name)}
                          />
                          <span>{name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE – PERMISSION MATRIX */}
          <div className={`border ${theme.borderColor} rounded-xl p-4 ${isLight ? "bg-white" : "bg-[#0A192F]"} ${isAdminRole ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center gap-2 text-sm ${theme.textMain}`}>
                <Shield size={16} className={theme.accentText} />
                <span>Module Permissions</span>
              </div>
              {isAdminRole && <span className="text-xs text-orange-500 font-bold border border-orange-500/50 px-2 py-1 rounded bg-orange-500/10">Admin has ALL Permissions</span>}
            </div>

            <div className="overflow-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className={`${isLight ? "bg-gray-100 text-gray-700" : "bg-[#020817] text-gray-400"}`}>
                    <th className="text-left px-2 py-2">Module</th>
                    <th className="px-2 py-2">View</th>
                    <th className="px-2 py-2">Create</th>
                    <th className="px-2 py-2">Edit</th>
                    <th className="px-2 py-2">Delete</th>
                    <th className="px-2 py-2">Export</th>
                    <th className="px-2 py-2">ALL</th>
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
                        <td className={`px-2 py-2 ${theme.textMain} text-left`}>
                          {m.label}
                        </td>

                        {["view", "create", "edit", "delete", "export"].map((p) => (
                          <td key={p} className="px-2 py-2 text-center">
                            <button
                              onClick={() => togglePermission(m.key, p)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center border text-[10px] transition-colors
                                ${
                                  perms[p]
                                    ? (isLight ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-[#64FFDA]/20 border-[#64FFDA] text-[#64FFDA]")
                                    : (isLight ? "border-gray-300 text-gray-400" : "border-[#1E2D45] text-gray-500")
                                }`}
                            >
                              {perms[p] ? "✓" : "-"}
                            </button>
                          </td>
                        ))}

                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => setAllModulePermissions(m.key, !allOn)}
                            className={`px-3 py-1 rounded-full border text-[10px] transition-colors
                              ${
                                allOn
                                  ? (isLight ? "bg-green-100 border-green-500 text-green-700" : "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]")
                                  : (isLight ? "border-gray-300 text-gray-400" : "border-[#1E2D45] text-gray-400")
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

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-xs flex items-center gap-1"
              >
                <X size={14} /> Cancel
              </button>

              <button
                onClick={onSave}
                className={`px-4 py-2 rounded-lg ${theme.accentBg} text-xs font-semibold flex items-center gap-1`}
              >
                <Save size={14} /> Save Changes
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
