
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DataService } from '../services/api';
import { Product } from '../types';

const API_URL = 'http://localhost:3000/api';

// Add helper valid types for users
interface AdminUser {
  id: number;
  name: string;
  email: string;
  status: string;
  roleId?: number;
  roleName?: string;
  buId?: number;
  buName?: string;
  userType?: string;
  partnerCategory?: string;
  createdAt: string;
}

// Add User prop to AdminPanel
interface AdminPanelProps {
  user?: any; // Use the User type
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'users' | 'org' | 'categories' | 'audit' | 'system' | 'assetPerms'>('overview');

  // System Config State
  const [systemConfig, setSystemConfig] = useState({ apiKey: '', modelName: '' });
  // ...

  // Helper for Permissions
  const can = (action: string) => {
    // Admin bypass or check permissions
    if (user?.role === 'Admin') return true;
    if (user?.roleName === 'Admin') return true; // Handling both potential shapes
    return user?.permissions?.includes(action);
  };

  // ... (rest of code)

  // In Render:
  /*
     {can('PRODUCTS_CREATE') && (
        <button ... + Add Product ... />
     )}
     
     // In Table Row:
     {can('PRODUCTS_UPDATE') && <button>Edit</button>}
     {can('PRODUCTS_DELETE') && <button>Delete</button>}
  */
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', roleId: 0, buId: 0, userType: 'INTERNAL', partnerCategory: '' });

  // ... (Existing useEffects)
  // Partner Categories State
  const [partnerCategories, setPartnerCategories] = useState<{ id: number; name: string }[]>([]);
  const [newPartnerCategory, setNewPartnerCategory] = useState('');

  // Permission State
  const [allPermissions, setAllPermissions] = useState<{ Id: number, Module: string, Action: string }[]>([]);
  const [managingRole, setManagingRole] = useState<{ Id: number, Name: string } | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set());

  // ... (Existing useEffects)

  useEffect(() => {
    fetchDataForUsers();
    DataService.getRoles().then(setRoles).catch(console.error);
    DataService.getBusinessUnits().then(setBus).catch(console.error);
    DataService.getAuditLogs().then(setAuditLogs).catch(console.error);
    fetchCategories();
    fetchPartnerCategories();
  }, [activeTab]); // Refresh when tab changes

  const fetchPartnerCategories = async () => {
    try {
      const data = await DataService.getPartnerCategories();
      setPartnerCategories(data);
    } catch (err) { console.error('Failed to load partner categories', err); }
  };

  const openPermissionModal = async (role: any) => {
    try {
      const [all, rolePerms] = await Promise.all([
        DataService.getPermissions(),
        DataService.getRolePermissions(role.Id)
      ]);
      setAllPermissions(all);
      setSelectedPermissionIds(new Set(rolePerms));
      setManagingRole(role);
    } catch (err: any) { alert('Failed to load permissions: ' + err.message); }
  };

  const savePermissions = async () => {
    if (!managingRole) return;
    try {
      await DataService.updateRolePermissions(managingRole.Id, Array.from(selectedPermissionIds));
      setManagingRole(null);
      alert('Permissions updated successfully');
    } catch (err) { alert('Failed to save permissions'); }
  };

  const handleApprove = async (id: number) => {
    try {
      const res = await DataService.approveUser(id);
      alert(`User Approved!\n\nTemp Password: ${res.tempPassword}\n\nPlease share this with the user.`);
      fetchDataForUsers();
    } catch (err: any) {
      alert('Failed to approve user: ' + err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await DataService.createUser(newUser);
      alert(`User Created!\n\nTemp Password: ${res.tempPassword}\n\nPlease share this with the user.`);
      setIsAddUserOpen(false);
      setNewUser({ name: '', email: '', roleId: 0, buId: 0 });
      fetchDataForUsers();
    } catch (err: any) {
      alert('Failed to create user: ' + err.message);
    }
  };

  // RBAC State
  const [roles, setRoles] = useState<any[]>([]);
  const [bus, setBus] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Org State
  const [newRole, setNewRole] = useState('');

  // --- VERSION ASSIGNMENT STATE ---
  const [assignUser, setAssignUser] = useState<AdminUser | null>(null);
  const [userAssignments, setUserAssignments] = useState<any[]>([]);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetResults, setAssetResults] = useState<any[]>([]);
  const [selectedAssetVersions, setSelectedAssetVersions] = useState<any[]>([]);
  const [selectedVersionGroupId, setSelectedVersionGroupId] = useState<string | null>(null);

  const openAssignModal = async (u: AdminUser) => {
    setAssignUser(u);
    setAssetSearchQuery('');
    setAssetResults([]);
    setSelectedAssetVersions([]);
    setSelectedVersionGroupId(null);
    try {
      const assignments = await DataService.getUserFileAssignments(u.id);
      setUserAssignments(assignments);
    } catch (error) {
      console.error('Failed to load assignments', error);
      alert('Failed to load existing assignments');
    }
  };

  const handleAssetSearch = async (q: string) => {
    setAssetSearchQuery(q);
    if (q.length < 2) {
      setAssetResults([]);
      return;
    }
    try {
      const results = await DataService.searchAssets(q);
      setAssetResults(results);
    } catch (error) {
      console.error('Search failed', error);
    }
  };

  const handleSelectAssetForVersion = async (latestId: number, versionGroupId: string) => {
    try {
      setSelectedVersionGroupId(versionGroupId);
      const versions = await DataService.getFileVersionsById(latestId);
      setSelectedAssetVersions(versions);
    } catch (error) {
      console.error('Failed to fetch versions', error);
    }
  };

  const handleAssignVersion = async (assetFileId: number, versionGroupId: string) => {
    if (!assignUser) return;
    try {
      // If assetFileId is -1 (or handling removal), logic needs to support it. 
      // The button will pass -1 for revert.
      await DataService.assignUserFileVersion(assignUser.id, assetFileId === -1 ? null : assetFileId, versionGroupId);
      const assignments = await DataService.getUserFileAssignments(assignUser.id);
      setUserAssignments(assignments);
      alert('Assignment updated successfully');
    } catch (error) {
      console.error('Assign error details:', error);
      alert('Failed to update assignment');
    }
  };
  const [newBu, setNewBu] = useState('');
  const [manageRoleId, setManageRoleId] = useState<number | null>(null);
  const [manageBuId, setManageBuId] = useState<number | null>(null);
  const [manageUserId, setManageUserId] = useState<number | null>(null);
  const [manageProductId, setManageProductId] = useState<number | null>(null);

  // Categories State
  const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);
  const [manageCategoryId, setManageCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Asset Permissions State
  const [allAssetPermissions, setAllAssetPermissions] = useState<any[]>([]);
  const [managingAssetUser, setManagingAssetUser] = useState<AdminUser | null>(null);
  const [selectedAssetPermIds, setSelectedAssetPermIds] = useState<Set<number>>(new Set());

  const fetchAuditLogs = async () => {
    try {
      const data = await DataService.getAuditLogs();
      setAuditLogs(data);
    } catch (err) { console.error(err); }
  };

  const fetchCategories = async () => {
    try {
      const data = await DataService.getCategories();
      setCategories(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'users' || activeTab === 'org') {
      fetchDataForUsers();
    } else if (activeTab === 'categories') {
      fetchCategories();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'system') {
      fetchSystemConfig();
    } else if (activeTab === 'assetPerms') {
      fetchDataForUsers();
      fetchAssetPermissions();
    }
  }, [activeTab]);

  const fetchAssetPermissions = async () => {
    try {
      const res = await fetch(`${API_URL}/assets/admin/asset-permissions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllAssetPermissions(data);
      }
    } catch (err) { console.error('Failed to load asset permissions', err); }
  };

  const openAssetPermissionModal = async (user: AdminUser) => {
    try {
      const res = await fetch(`${API_URL}/assets/admin/users/${user.id}/asset-permissions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const userPerms = await res.json();
        setSelectedAssetPermIds(new Set(userPerms.map((p: any) => p.Id)));
        setManagingAssetUser(user);
      }
    } catch (err: any) { alert('Failed to load user asset permissions: ' + err.message); }
  };

  const saveAssetPermissions = async () => {
    if (!managingAssetUser) return;
    try {
      const res = await fetch(`${API_URL}/assets/admin/users/${managingAssetUser.id}/asset-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ permissionIds: Array.from(selectedAssetPermIds) })
      });
      if (res.ok) {
        setManagingAssetUser(null);
        alert('Asset permissions updated successfully');
      } else {
        alert('Failed to save asset permissions');
      }
    } catch (err) { alert('Error saving asset permissions'); }
  };

  const fetchSystemConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/system-settings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSystemConfig({
          apiKey: data.GEMINI_API_KEY || '',
          modelName: data.GEMINI_MODEL || ''
        });
      }
    } catch (err) { console.error('Failed to load system settings', err); }
  };

  const saveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/system-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(systemConfig)
      });
      if (res.ok) {
        alert('System Configuration Updated');
        fetchSystemConfig();
      } else {
        alert('Failed to update configuration');
      }
    } catch (err) { alert('Error updating configuration'); }
  };

  const addRole = async () => {
    if (!newRole) return;
    try {
      await DataService.createRole(newRole);
      setNewRole('');
      fetchDataForUsers();
      alert('Role added');
    } catch (err) { alert('Failed'); }
  };

  const addBu = async () => {
    if (!newBu) return;
    try {
      await DataService.createBusinessUnit(newBu);
      setNewBu('');
      fetchDataForUsers();
      alert('Department added');
    } catch (err) { alert('Failed'); }
  };

  const fetchDataForUsers = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData, busData] = await Promise.all([
        DataService.getUsers(),
        DataService.getRoles(),
        DataService.getBusinessUnits()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setBus(busData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load user management data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await DataService.getProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load products. Ensure the Backend Server is running and connected to MS SQL.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    // Alias to main fetch
    fetchDataForUsers();
  };

  const approveUser = async (id: number) => {
    try {
      const res = await DataService.approveUser(id);
      alert(`User Approved!\n\nTemporary Password: ${res.tempPassword}\n\nPlease copy this password and share it with the user.`);
      fetchUsers();
    } catch (err) {
      alert('Approval failed');
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await DataService.deleteUser(id);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const saveUserRoleBu = async () => {
    if (!editingUser) return;
    try {
      const isPartner = editingUser.userType === 'PARTNER';
      await DataService.updateUser(editingUser.id, {
        roleId: isPartner ? null : editingUser.roleId,
        buId: isPartner ? null : editingUser.buId,
        partnerCategory: isPartner ? editingUser.partnerCategory : null,
        userType: editingUser.userType
      } as any); // Cast to any to allow nulls if strict types complain

      setEditingUser(null);
      fetchUsers();
      alert('User updated successfully');
    } catch (err) {
      alert('Failed to update user');
    }
  };

  // ... (Keep existing Product functions)


  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent row click
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await DataService.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;

    try {
      if (editingProduct.id) {
        await DataService.updateProduct(editingProduct as Product);
      } else {
        // ID is auto-generated by DB now
        const newProduct = {
          ...editingProduct,
          capabilities: [], // Default empty arrays to avoid backend errors
          itLandscape: [],
          deploymentModels: [],
          notToSell: []
        } as Product;
        await DataService.createProduct(newProduct);
      }
      setIsFormOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      alert('Failed to save product');
    }
  };

  const startEdit = (e?: React.MouseEvent, product?: Product) => {
    if (e) e.stopPropagation();
    setEditingProduct(product || {});
    setIsFormOpen(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedProductId(expandedProductId === id ? null : id);
  };

  const data = [
    { name: 'Seclore DRM', searches: 400, confidence: 85 },
    { name: 'IAM Connector', searches: 120, confidence: 60 },
    { name: 'BFSI Cases', searches: 210, confidence: 92 },
    { name: 'Competitor A', searches: 180, confidence: 45 },
    { name: 'New Release v3', searches: 50, confidence: 30 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            {user?.role !== 'Admin' ? 'Governance' : 'Admin & Governance'}
          </h2>
          <p className="text-slate-500 mt-1">Monitor platform health and manage content.</p>
        </div>
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'overview' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'products' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Manage Products
          </button>
          {(can('USERS_CREATE') || can('USERS_UPDATE') || can('USERS_APPROVE')) && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'users' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Manage Users
            </button>
          )}

          {(can('ROLES_UPDATE') || can('ROLES_CREATE') || can('ROLES_DELETE') || can('DEPARTMENTS_VIEW') || can('DEPARTMENTS_MANAGE') || can('CATEGORIES_MANAGE')) && (
            <button
              onClick={() => setActiveTab('org')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'org' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Organization
            </button>
          )}

          {(can('AUDIT_DELETE')) && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'audit' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Audit Logs
            </button>
          )}

          {(user?.role === 'Admin' || user?.roleName === 'Admin') && (
            <button
              onClick={() => setActiveTab('assetPerms')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'assetPerms' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Asset Permissions
            </button>
          )}

        </div>
      </header>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold mb-6">Topic Popularity</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="searches" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold mb-6">Sales Confidence</h3>
            <div className="space-y-6">
              {data.map(item => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.name}</span>
                    <span className={`font-bold ${item.confidence > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {item.confidence}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.confidence > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${item.confidence}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'products' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xl font-bold">Product Catalog (SQL DB)</h3>

          </div>

          <div className="space-y-3 mb-6 p-6">
            {products.map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-blue-200 transition bg-white shadow-sm">
                <div>
                  <p className="font-bold text-slate-700">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.category}</p>
                </div>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {can('PRODUCTS_UPDATE') && (
                    <button
                      onClick={(e) => startEdit(e, product)}
                      className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition"
                    >
                      Edit
                    </button>
                  )}
                  {can('PRODUCTS_DELETE') && (
                    <button
                      onClick={(e) => handleDelete(e, product.id!)}
                      className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100 transition"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            {products.length === 0 && <p className="text-slate-500 italic p-4">No products found.</p>}
          </div>

          <div className="p-6 border-t border-slate-200 bg-slate-50">
            {can('PRODUCTS_CREATE') && (
              <button
                onClick={() => {
                  setIsFormOpen(true);
                  setEditingProduct({});
                }}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                + Add New Product
              </button>
            )}
          </div>
        </section>
      )
      }

      {
        activeTab === 'users' && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold">User Management</h3>
            </div>
            {loading ? (
              <div className="p-12 text-center text-slate-500">Loading users...</div>
            ) : (
              <div className="space-y-3 mb-6 p-6">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg group hover:border-blue-200 transition bg-white shadow-sm">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                      <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${u.userType === 'PARTNER' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                          {u.userType || 'INTERNAL'}
                        </span>
                        {u.partnerCategory && (
                          <span className="ml-2 inline-block px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            {u.partnerCategory}
                          </span>
                        )}
                        <div className="mt-1 text-xs text-slate-600">
                          {u.roleName || 'No Role'} • {u.buName || 'No Dept'}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === 'APPROVED' || u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {u.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                      {u.userType === 'PARTNER' && (
                        <button
                          onClick={() => openAssignModal(u)}
                          className="px-3 py-1 text-xs font-bold text-amber-600 bg-amber-50 rounded hover:bg-amber-100 transition"
                        >
                          Manage Files
                        </button>
                      )}
                      <button
                        onClick={() => setEditingUser(u)}
                        className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition"
                      >
                        Edit
                      </button>
                      {u.status === 'PENDING' && (
                        <button
                          onClick={() => handleApprove(u.id)}
                          className="px-3 py-1 text-xs font-bold text-green-600 bg-green-50 rounded hover:bg-green-100 transition"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Delete user ${u.name}?`)) deleteUser(u.id);
                        }}
                        className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && <p className="text-slate-500 italic p-4">No users found.</p>}
              </div>
            )}

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setIsAddUserOpen(true)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                + Add New User
              </button>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                  <h3 className="text-xl font-bold mb-4">Edit User Access</h3>
                  <div className="space-y-4">

                    {/* User Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">User Type</label>
                      <select
                        className="w-full px-3 py-2 border rounded-lg"
                        value={editingUser.userType || 'INTERNAL'}
                        onChange={(e) => setEditingUser({ ...editingUser, userType: e.target.value })}
                      >
                        <option value="INTERNAL">Internal Employee</option>
                        <option value="PARTNER">External Partner</option>
                      </select>
                    </div>

                    {(!editingUser.userType || editingUser.userType === 'INTERNAL') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                          <select
                            className="w-full px-3 py-2 border rounded-lg"
                            value={editingUser.roleId || ''}
                            onChange={(e) => setEditingUser({ ...editingUser, roleId: parseInt(e.target.value) })}
                          >
                            <option value="">Select Role</option>
                            {roles.map(r => <option key={r.Id} value={r.Id}>{r.Name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                          <select
                            className="w-full px-3 py-2 border rounded-lg"
                            value={editingUser.buId || ''}
                            onChange={(e) => setEditingUser({ ...editingUser, buId: parseInt(e.target.value) })}
                          >
                            <option value="">Select Department</option>
                            {bus.map(b => <option key={b.Id} value={b.Id}>{b.Name}</option>)}
                          </select>
                        </div>
                      </>
                    )}

                    {/* Partner Category Selection */}
                    {editingUser.userType === 'PARTNER' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Partner Category</label>
                        <select
                          className="w-full px-3 py-2 border rounded-lg"
                          value={editingUser.partnerCategory || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, partnerCategory: e.target.value })}
                        >
                          <option value="">Select Category</option>
                          {partnerCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    )}

                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                      onClick={() => setEditingUser(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold"
                      onClick={saveUserRoleBu}
                    >
                      Save Info
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Version Assignment Modal */}
            {assignUser && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Manage File Versions for {assignUser.name}</h3>
                    <button onClick={() => setAssignUser(null)} className="text-gray-500 hover:text-gray-700">✕</button>
                  </div>

                  <div className="mb-8">
                    <h4 className="font-bold text-sm text-slate-700 mb-2 uppercase tracking-wide">Currently Pinned Versions</h4>
                    <div className="bg-slate-50 border rounded-lg p-4 space-y-2">
                      {userAssignments.length === 0 ? <p className="text-sm text-slate-500">No specific versions pinned (User sees Latest).</p> :
                        userAssignments.map(ua => (
                          <div key={ua.Id} className="flex justify-between items-center bg-white border p-3 rounded shadow-sm">
                            <div>
                              <p className="font-bold text-slate-800">{ua.Title}</p>
                              <p className="text-xs text-slate-500">Pinned Version: <span className="font-mono font-bold text-blue-600">V{ua.VersionNumber}</span> (Latest: V{ua.latestVersion})</p>
                            </div>
                            <button
                              onClick={() => handleAssignVersion(-1, ua.VersionGroupId)}
                              className="text-xs text-red-600 hover:text-red-800 font-bold border border-red-200 bg-red-50 px-2 py-1 rounded"
                            >
                              Revert to Latest
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-bold text-sm text-slate-700 mb-2 uppercase tracking-wide">Assign New Version</h4>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="Search assets by title..."
                        className="flex-1 border rounded px-3 py-2"
                        value={assetSearchQuery}
                        onChange={e => handleAssetSearch(e.target.value)}
                      />
                    </div>

                    {assetResults.length > 0 && (
                      <div className="mb-4 max-h-40 overflow-y-auto border rounded bg-white">
                        {assetResults.map(ar => (
                          <div
                            key={ar.versionGroupId}
                            className={`p-2 hover:bg-blue-50 cursor-pointer border-b ${selectedVersionGroupId === ar.versionGroupId ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                            onClick={() => handleSelectAssetForVersion(ar.latestId, ar.versionGroupId)}
                          >
                            <p className="font-bold text-sm">{ar.title}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedVersionGroupId && selectedAssetVersions.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h5 className="font-bold text-blue-900 mb-3">Select Version to Pin</h5>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {selectedAssetVersions.map(v => (
                            <div key={v.id} className="flex justify-between items-center p-2 bg-white rounded border border-blue-200">
                              <div>
                                <span className="font-bold text-slate-700">V{v.versionNumber}</span>
                                <span className="text-xs text-slate-500 ml-2">Created {new Date(v.createdAt).toLocaleDateString()}</span>
                                {v.isArchived && <span className="ml-2 text-[10px] bg-gray-200 px-1 rounded">Archived</span>}
                              </div>
                              <button
                                onClick={() => handleAssignVersion(v.id, v.versionGroupId || selectedVersionGroupId)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                              >
                                Pin This
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )
      }

      {
        activeTab === 'org' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(can('ROLES_CREATE') || can('ROLES_UPDATE') || can('ROLES_DELETE')) && (
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-xl font-bold mb-4">Roles & Positions</h3>

                <div className="space-y-3 mb-6">
                  {roles.map(r => (
                    <div key={r.Id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-blue-200 transition">
                      <span className="font-bold text-slate-700">{r.Name}</span>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(user?.role === 'Admin' || user?.roleName === 'Admin') && (
                          <button
                            onClick={() => openPermissionModal(r)}
                            className="px-3 py-1 text-xs font-bold text-teal-600 bg-teal-50 rounded hover:bg-teal-100 transition"
                          >
                            Permissions
                          </button>
                        )}
                        {r.Name !== 'Admin' && (
                          <>
                            {can('ROLES_UPDATE') && (
                              <button
                                onClick={async () => {
                                  const newName = prompt('Rename Role:', r.Name);
                                  if (newName && newName !== r.Name) {
                                    try {
                                      await DataService.updateRole(r.Id, newName);
                                      fetchDataForUsers();
                                    } catch (err) { alert('Failed to update role'); }
                                  }
                                }}
                                className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition"
                              >
                                Edit
                              </button>
                            )}
                            {can('ROLES_DELETE') && (
                              <button
                                onClick={async () => {
                                  if (confirm('Delete Role? This might break users assigned to it.')) {
                                    try {
                                      await DataService.deleteRole(r.Id);
                                      fetchDataForUsers();
                                    } catch (err) { alert('Failed to delete role'); }
                                  }
                                }}
                                className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100 transition"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {can('ROLES_CREATE') && (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      placeholder="New Role Name"
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                    />
                    <button onClick={async () => {
                      if (!newRole) return;
                      await addRole();
                    }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition text-sm">
                      + Add Role
                    </button>
                  </div>
                )}
              </section>
            )}

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-xl font-bold mb-4">Departments (Business Units)</h3>

              <div className="space-y-3 mb-6">
                {bus.map(b => (
                  <div key={b.Id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-blue-200 transition">
                    <span className="font-bold text-slate-700">{b.Name}</span>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {can('DEPARTMENTS_MANAGE') && (
                        <>
                          <button
                            onClick={async () => {
                              const newName = prompt('Rename Department:', b.Name);
                              if (newName && newName !== b.Name) {
                                try {
                                  await DataService.updateBusinessUnit(b.Id, newName);
                                  fetchDataForUsers();
                                } catch (err) { alert('Failed to update department'); }
                              }
                            }}
                            className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete Department?')) {
                                try {
                                  await DataService.deleteBusinessUnit(b.Id);
                                  fetchDataForUsers();
                                } catch (err) { alert('Failed to delete department'); }
                              }
                            }}
                            className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100 transition"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {can('DEPARTMENTS_MANAGE') && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="New Department Name"
                    value={newBu}
                    onChange={e => setNewBu(e.target.value)}
                  />
                  <button onClick={async () => {
                    if (!newBu) return;
                    await addBu();
                  }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition text-sm">
                    + Add Dept
                  </button>
                </div>
              )}
            </section>

            {/* Added: Partner Categories Management */}
            {can('CATEGORIES_MANAGE') && (
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Partner Categories</h3>
                    <p className="text-sm text-slate-500">Manage tiers for external partner users (e.g. Gold, Silver)</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {partnerCategories.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-indigo-200 transition">
                      <span className="font-bold text-slate-700">{c.name}</span>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={async () => {
                            const newName = prompt('Rename Category:', c.name);
                            if (newName && newName !== c.name) {
                              try {
                                await DataService.updatePartnerCategory(c.id, newName);
                                fetchPartnerCategories();
                              } catch (err) { alert('Failed to update category'); }
                            }
                          }}
                          className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete Partner Category "${c.name}"?`)) {
                              try {
                                await DataService.deletePartnerCategory(c.id);
                                fetchPartnerCategories();
                              } catch (err) { alert('Failed to delete category'); }
                            }
                          }}
                          className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {partnerCategories.length === 0 && <p className="text-slate-400 italic text-sm">No partner categories defined.</p>}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="New Partner Tier Name (e.g. Platinum)"
                    value={newPartnerCategory}
                    onChange={e => setNewPartnerCategory(e.target.value)}
                  />
                  <button onClick={async () => {
                    if (!newPartnerCategory) return;
                    try {
                      await DataService.createPartnerCategory(newPartnerCategory);
                      setNewPartnerCategory('');
                      fetchPartnerCategories();
                    } catch (err) { alert('Failed to add category'); }
                  }} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition text-sm">
                    + Add Tier
                  </button>
                </div>
              </section>
            )}
          </div>
        )
      }

      {
        activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">System Audit Logs</h3>
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to DELETE ALL logs? This cannot be undone.')) {
                    try {
                      await DataService.clearAllAuditLogs();
                      fetchAuditLogs();
                    } catch (err) { alert('Failed to clear logs'); }
                  }
                }}
                className="text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition"
              >
                Clear History
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Time</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {auditLogs.map(log => (
                    <tr key={log.Id} className="hover:bg-slate-50 group">
                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {new Date(log.Timestamp).toLocaleString()}
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {log.UserName || 'System/Guest'} <br />
                        <span className="text-xs text-slate-400 font-normal">{log.UserEmail}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700`}>
                          {log.Action}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        {log.Entity} <span className="text-slate-400">#{log.EntityId}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={async () => {
                            if (confirm('Delete this log entry?')) {
                              try {
                                await DataService.deleteAuditLog(log.Id);
                                fetchAuditLogs();
                              } catch (err) { alert('Failed to delete log'); }
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-full transition"
                          title="Delete Log"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">No logs found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      }


      {
        isAddUserOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold mb-4">Add New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Name</label>
                  <input type="text" required className="w-full border rounded px-3 py-2"
                    value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <input type="email" required className="w-full border rounded px-3 py-2"
                    value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">User Type</label>
                  <select className="w-full border rounded px-3 py-2"
                    value={newUser.userType || 'INTERNAL'} onChange={e => setNewUser({ ...newUser, userType: e.target.value })}
                  >
                    <option value="INTERNAL">Internal Employee</option>
                    <option value="PARTNER">External Partner</option>
                  </select>
                </div>

                {newUser.userType === 'PARTNER' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Privilege Category</label>
                    <select className="w-full border rounded px-3 py-2"
                      value={newUser.partnerCategory} onChange={e => setNewUser({ ...newUser, partnerCategory: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {partnerCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700">Role</label>
                  <select required className="w-full border rounded px-3 py-2"
                    value={newUser.roleId} onChange={e => setNewUser({ ...newUser, roleId: parseInt(e.target.value) })}>
                    <option value={0}>Select Role</option>
                    {roles.map(r => <option key={r.Id} value={r.Id}>{r.Name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Department</label>
                  <select required className="w-full border rounded px-3 py-2"
                    value={newUser.buId} onChange={e => setNewUser({ ...newUser, buId: parseInt(e.target.value) })}>
                    <option value={0}>Select Department</option>
                    {bus.map(b => <option key={b.Id} value={b.Id}>{b.Name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setIsAddUserOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">Create User</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {
        isFormOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">{editingProduct?.id ? 'Edit Product' : 'Add New Product'}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    value={editingProduct?.name || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    value={editingProduct?.category || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    value={editingProduct?.description || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
      {
        managingRole && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Manage Permissions: {managingRole.Name}</h3>
              <div className="space-y-6">
                {Object.entries(allPermissions.reduce((acc: any, p) => {
                  if (!acc[p.Module]) acc[p.Module] = [];
                  acc[p.Module].push(p);
                  return acc;
                }, {})).map(([module, perms]: [string, any]) => (
                  <div key={module} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">{module}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {perms.map((p: any) => (
                        <label key={p.Id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedPermissionIds.has(p.Id)}
                            onChange={e => {
                              const newSet = new Set(selectedPermissionIds);
                              if (e.target.checked) newSet.add(p.Id);
                              else newSet.delete(p.Id);
                              setSelectedPermissionIds(newSet);
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-700">{p.Action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-3 mt-6 border-t pt-4">
                <button
                  onClick={() => setManagingRole(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={savePermissions}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold"
                >
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Asset Permissions Tab */}
      {activeTab === 'assetPerms' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-bold">Asset Permissions Management</h3>
            <p className="text-sm text-slate-500 mt-1">
              Manage user permissions for creating, updating, and deleting assets. All users can view assets by default.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading users...</div>
          ) : (
            <div className="space-y-3 mb-6 p-6">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg group hover:border-blue-200 transition bg-white shadow-sm">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                    <div className="mt-1 text-xs text-slate-600">
                      {u.roleName || 'No Role'} • {u.buName || 'No Dept'}
                    </div>
                  </div>

                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                    <button
                      onClick={() => openAssetPermissionModal(u)}
                      className="px-3 py-1 text-xs font-bold text-teal-600 bg-teal-50 rounded hover:bg-teal-100 transition"
                    >
                      Manage Asset Permissions
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-slate-500 italic p-4">No users found.</p>}
            </div>
          )}
        </section>
      )}

      {/* Asset Permission Modal */}
      {managingAssetUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2">Manage Asset Permissions: {managingAssetUser.name}</h3>
            <p className="text-sm text-slate-500 mb-4">
              Select which asset operations this user can perform. View access is granted to all users by default.
            </p>

            <div className="space-y-6">
              {Object.entries(allAssetPermissions
                .filter(p => p.Action !== 'READ') // Exclude READ since all users can view
                .reduce((acc: any, p) => {
                  if (!acc[p.ResourceType]) acc[p.ResourceType] = [];
                  acc[p.ResourceType].push(p);
                  return acc;
                }, {})).map(([resourceType, perms]: [string, any]) => (
                  <div key={resourceType} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">
                      {resourceType.replace('_', ' ')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {perms.map((p: any) => (
                        <label key={p.Id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedAssetPermIds.has(p.Id)}
                            onChange={e => {
                              const newSet = new Set(selectedAssetPermIds);
                              if (e.target.checked) newSet.add(p.Id);
                              else newSet.delete(p.Id);
                              setSelectedAssetPermIds(newSet);
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-700">{p.Action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end space-x-3 mt-6 border-t pt-4">
              <button
                onClick={() => setManagingAssetUser(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveAssetPermissions}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default AdminPanel;
