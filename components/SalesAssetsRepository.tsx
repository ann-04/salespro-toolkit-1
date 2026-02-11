import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VersionHistoryDialog from './VersionHistoryDialog';

const API_URL = 'http://localhost:3000/api';

interface BusinessUnit {
    id: number;
    name: string;
    description: string;
}

interface Product {
    id: number;
    businessUnitId: number;
    name: string;
    description: string;
}

interface Folder {
    id: number;
    productId: number;
    name: string;
    description: string;
}

interface ContentType {
    id: number;
    name: string;
    description: string;
}

interface AssetFile {
    id: number;
    folderId: number;
    title: string;
    originalFileName: string;
    fileType: string;
    fileSize: number;
    description: string;
    uploadedBy: string;
    tags: { id: number; name: string }[];
    contentTypes: ContentType[];
    createdAt: string;
    isArchived: boolean;
    audienceLevel: 'Internal' | 'Partner' | 'EndUser';
    versionNumber: number;
    versionGroupId: string;
}

// ... (rest of code) ...


type ViewLevel = 'business-units' | 'products' | 'folders' | 'files';

const SalesAssetsRepository: React.FC = () => {
    const [currentView, setCurrentView] = useState<ViewLevel>('business-units');
    const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [files, setFiles] = useState<AssetFile[]>([]);
    const [historyFile, setHistoryFile] = useState<AssetFile | null>(null);

    const [selectedBU, setSelectedBU] = useState<BusinessUnit | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

    const [loading, setLoading] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showEditEntityDialog, setShowEditEntityDialog] = useState(false);
    const [editingFile, setEditingFile] = useState<AssetFile | null>(null);
    const [editingEntity, setEditingEntity] = useState<{ type: 'bu' | 'product' | 'folder', id: number } | null>(null);
    const [createType, setCreateType] = useState<'bu' | 'product' | 'folder' | 'file'>('bu');
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
    const [uploadTags, setUploadTags] = useState('');
    const [uploadMode, setUploadMode] = useState<'single' | 'folder'>('single');

    // Asset Permissions State
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    // Content Types State
    const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
    const [selectedContentTypes, setSelectedContentTypes] = useState<number[]>([]);
    const [editFileTags, setEditFileTags] = useState('');
    const [editFileContentTypes, setEditFileContentTypes] = useState<number[]>([]);
    const [uploadAudienceLevel, setUploadAudienceLevel] = useState<'Internal' | 'Partner' | 'EndUser'>('Internal');
    const [editAudienceLevel, setEditAudienceLevel] = useState<'Internal' | 'Partner' | 'EndUser'>('Internal');
    const [editIsArchived, setEditIsArchived] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    // Sort State
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
    const [contentTypeFilter, setContentTypeFilter] = useState<number[]>([]);
    const [dateRangeFrom, setDateRangeFrom] = useState('');
    const [dateRangeTo, setDateRangeTo] = useState('');
    const [uploadVersionGroupId, setUploadVersionGroupId] = useState<string | null>(null);

    const token = localStorage.getItem('token');
    const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    useEffect(() => {
        loadBusinessUnits();
        loadUserPermissions();
        loadContentTypes();
    }, []);

    // Reload files when sort order changes
    useEffect(() => {
        if (selectedFolder && currentView === 'files') {
            loadFiles(selectedFolder.id);
        }
    }, [sortOrder, showArchived]);

    // Load user's asset permissions
    const loadUserPermissions = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                // Check if user is admin
                if (user.role === 'Admin' || user.roleName === 'Admin') {
                    setIsAdmin(true);
                    return; // Admins have all permissions
                }

                // Fetch user's asset permissions
                const { data } = await axios.get(`${API_URL}/assets/admin/users/${user.id}/asset-permissions`, axiosConfig);
                const permCodes = data.map((p: any) => p.PermissionCode);
                setUserPermissions(permCodes);
            }
        } catch (error) {
            console.error('Error loading user permissions:', error);
        }
    };

    // Helper function to check if user has a specific permission
    const hasPermission = (permissionCode: string): boolean => {
        if (isAdmin) return true; // Admins have all permissions
        return userPermissions.includes(permissionCode);
    };

    // Load all content types
    const loadContentTypes = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/assets/content-types`, axiosConfig);
            setContentTypes(data);
        } catch (error) {
            console.error('Error loading content types:', error);
        }
    };

    const loadBusinessUnits = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_URL}/assets/business-units`, axiosConfig);
            setBusinessUnits(data);
        } catch (error: any) {
            console.error('Error loading business units:', error);
            if (error.response?.status === 403) {
                alert('You do not have permission to view business units');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async (buId: number) => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_URL}/assets/business-units/${buId}/products`, axiosConfig);
            setProducts(data);
        } catch (error: any) {
            console.error('Error loading products:', error);
            if (error.response?.status === 403) {
                alert('You do not have permission to view products');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadFolders = async (productId: number) => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_URL}/assets/products/${productId}/folders`, axiosConfig);
            setFolders(data);
        } catch (error: any) {
            console.error('Error loading folders:', error);
            if (error.response?.status === 403) {
                alert('You do not have permission to view folders');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadFiles = async (folderId: number) => {
        try {
            setLoading(true);
            const { data } = await axios.get(
                `${API_URL}/assets/folders/${folderId}/files?sort=${sortOrder}&showArchived=${showArchived}`,
                axiosConfig
            );
            setFiles(data);
        } catch (error: any) {
            console.error('Error loading files:', error);
            if (error.response?.status === 403) {
                alert('You do not have permission to view files');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBUClick = (bu: BusinessUnit) => {
        setSelectedBU(bu);
        setSelectedProduct(null);
        setSelectedFolder(null);
        setCurrentView('products');
        loadProducts(bu.id);
    };

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
        setSelectedFolder(null);
        setCurrentView('folders');
        loadFolders(product.id);
    };

    const handleFolderClick = (folder: Folder) => {
        setSelectedFolder(folder);
        setCurrentView('files');
        loadFiles(folder.id);
    };

    const handleBack = () => {
        if (currentView === 'files') {
            setCurrentView('folders');
            setSelectedFolder(null);
        } else if (currentView === 'folders') {
            setCurrentView('products');
            setSelectedProduct(null);
        } else if (currentView === 'products') {
            setCurrentView('business-units');
            setSelectedBU(null);
        }
    };

    const handleCreate = async () => {
        try {
            if (createType === 'file' && (uploadFile || uploadFiles)) {
                if (uploadMode === 'folder' && uploadFiles && uploadFiles.length > 0) {
                    // Bulk upload for folder
                    const formDataObj = new FormData();
                    Array.from(uploadFiles).forEach((file: File) => {
                        formDataObj.append('files', file);
                    });
                    formDataObj.append('description', formData.description);
                    formDataObj.append('audienceLevel', uploadAudienceLevel);

                    const response = await axios.post(
                        `${API_URL}/assets/folders/${selectedFolder?.id}/files/bulk`,
                        formDataObj,
                        { ...axiosConfig, headers: { ...axiosConfig.headers, 'Content-Type': 'multipart/form-data' } }
                    );

                    alert(`Successfully uploaded ${response.data.totalUploaded} file(s)${response.data.totalFailed > 0 ? `, ${response.data.totalFailed} failed` : ''}`);
                    loadFiles(selectedFolder!.id);
                } else if (uploadMode === 'single' && uploadFile) {
                    // Single file upload
                    // Single file upload
                    const formDataObj = new FormData();
                    // Append metadata FIRST
                    formDataObj.append('title', formData.name);
                    formDataObj.append('description', formData.description);
                    formDataObj.append('audienceLevel', uploadAudienceLevel);
                    // Add version group ID if we are updating a version
                    if (uploadVersionGroupId) {
                        formDataObj.append('updateVersionGroupId', uploadVersionGroupId);
                    }
                    if (uploadTags) {
                        formDataObj.append('tags', JSON.stringify(uploadTags.split(',').map(t => t.trim())));
                    }
                    // Append file LAST
                    formDataObj.append('file', uploadFile);

                    const response = await axios.post(
                        `${API_URL}/assets/folders/${selectedFolder?.id}/files`,
                        formDataObj,
                        { ...axiosConfig, headers: { ...axiosConfig.headers, 'Content-Type': 'multipart/form-data' } }
                    );

                    // Save content types if any selected
                    if (selectedContentTypes.length > 0 && response.data.id) {
                        await axios.put(
                            `${API_URL}/assets/files/${response.data.id}/content-types`,
                            { contentTypeIds: selectedContentTypes },
                            axiosConfig
                        );
                    }

                    loadFiles(selectedFolder!.id);
                }
            } else if (createType === 'bu') {
                await axios.post(`${API_URL}/assets/business-units`, formData, axiosConfig);
                loadBusinessUnits();
            } else if (createType === 'product' && selectedBU) {
                await axios.post(`${API_URL}/assets/business-units/${selectedBU.id}/products`, formData, axiosConfig);
                loadProducts(selectedBU.id);
            } else if (createType === 'folder' && selectedProduct) {
                await axios.post(`${API_URL}/assets/products/${selectedProduct.id}/folders`, formData, axiosConfig);
                loadFolders(selectedProduct.id);
            }

            setShowCreateDialog(false);
            setFormData({ name: '', description: '' });
            setUploadFile(null);
            setUploadFiles(null);
            setUploadTags('');
            setUploadMode('single');
            setSelectedContentTypes([]);
            setUploadAudienceLevel('Internal');
            setUploadVersionGroupId(null);
        } catch (error: any) {
            console.error('Error creating:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to create';
            alert(`Error: ${errorMessage}`);
        }
    };

    const handleUploadNewVersion = (file: AssetFile) => {
        setCreateType('file');
        setUploadMode('single');
        // If file is legacy (no versionGroupId), use its ID as the group ID reference
        setUploadVersionGroupId(file.versionGroupId || file.id.toString());
        setFormData({ name: file.title, description: file.description }); // Pre-fill
        setUploadAudienceLevel(file.audienceLevel || 'Internal');
        setShowCreateDialog(true);
    };

    const handleEditFile = async () => {
        if (!editingFile) return;

        try {
            await axios.put(
                `${API_URL}/assets/files/${editingFile.id}`,
                { title: formData.name, description: formData.description },
                axiosConfig
            );

            setShowEditDialog(false);
            setEditingFile(null);
            setFormData({ name: '', description: '' });
            loadFiles(selectedFolder!.id);
        } catch (error: any) {
            console.error('Error updating file:', error);
            alert(error.response?.data?.error || 'Failed to update file');
        }
    };

    const openEditDialog = (file: AssetFile) => {
        setEditingFile(file);
        setFormData({ name: file.title, description: file.description || '' });
        setEditFileTags(file.tags?.map(t => t.name).join(', ') || '');
        setEditFileContentTypes(file.contentTypes?.map(ct => ct.id) || []);
        setEditIsArchived(file.isArchived || false);
        setEditAudienceLevel(file.audienceLevel || 'Internal');
        setShowEditDialog(true);
    };

    const openEditEntityDialog = (type: 'bu' | 'product' | 'folder', id: number, name: string, description: string) => {
        setEditingEntity({ type, id });
        setFormData({ name, description: description || '' });
        setShowEditEntityDialog(true);
    };

    const handleEditEntity = async () => {
        if (!editingEntity) return;

        try {
            const { type, id } = editingEntity;
            if (type === 'bu') {
                await axios.put(`${API_URL}/assets/business-units/${id}`, formData, axiosConfig);
                loadBusinessUnits();
            } else if (type === 'product') {
                await axios.put(`${API_URL}/assets/products/${id}`, formData, axiosConfig);
                if (selectedBU) loadProducts(selectedBU.id);
            } else if (type === 'folder') {
                await axios.put(`${API_URL}/assets/folders/${id}`, formData, axiosConfig);
                if (selectedProduct) loadFolders(selectedProduct.id);
            }

            setShowEditEntityDialog(false);
            setEditingEntity(null);
            setFormData({ name: '', description: '' });
        } catch (error: any) {
            console.error('Error updating entity:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to update';
            alert(`Error: ${errorMessage}`);
        }
    };

    const handleDelete = async (type: 'bu' | 'product' | 'folder' | 'file', id: number) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            if (type === 'bu') {
                await axios.delete(`${API_URL}/assets/business-units/${id}`, axiosConfig);
                loadBusinessUnits();
            } else if (type === 'product') {
                await axios.delete(`${API_URL}/assets/products/${id}`, axiosConfig);
                loadProducts(selectedBU!.id);
            } else if (type === 'folder') {
                await axios.delete(`${API_URL}/assets/folders/${id}`, axiosConfig);
                loadFolders(selectedProduct!.id);
            } else if (type === 'file') {
                await axios.delete(`${API_URL}/assets/files/${id}`, axiosConfig);
                loadFiles(selectedFolder!.id);
            }
        } catch (error: any) {
            console.error('Error deleting:', error);
            alert(error.response?.data?.error || 'Failed to delete');
        }
    };

    const handleDownload = async (file: AssetFile) => {
        try {
            const response = await axios.get(`${API_URL}/assets/files/${file.id}/download`, {
                ...axiosConfig,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.originalFileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file');
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const handleBreadcrumbClick = (level: 'home' | 'bu' | 'product' | 'folder') => {
        if (level === 'home') {
            setCurrentView('business-units');
            setSelectedBU(null);
            setSelectedProduct(null);
            setSelectedFolder(null);
        } else if (level === 'bu') {
            setCurrentView('products');
            setSelectedProduct(null);
            setSelectedFolder(null);
            if (selectedBU) loadProducts(selectedBU.id);
        } else if (level === 'product') {
            setCurrentView('folders');
            setSelectedFolder(null);
            if (selectedProduct) loadFolders(selectedProduct.id);
        } else if (level === 'folder') {
            setCurrentView('files');
            if (selectedFolder) loadFiles(selectedFolder.id);
        }
    };

    const handleUpdateFile = async () => {
        if (!editingFile || !formData.name.trim()) return;

        try {
            const tagsArray = editFileTags.split(',').map(tag => tag.trim()).filter(tag => tag);

            console.log('📝 Updating file:', {
                fileId: editingFile.id,
                title: formData.name,
                description: formData.description,
                tags: tagsArray,
                contentTypeIds: editFileContentTypes,
                isArchived: editIsArchived,
                audienceLevel: editAudienceLevel
            });

            const response = await axios.put(
                `${API_URL}/assets/files/${editingFile.id}`,
                {
                    title: formData.name,
                    description: formData.description,
                    tags: tagsArray,
                    contentTypeIds: editFileContentTypes,
                    isArchived: editIsArchived,
                    audienceLevel: editAudienceLevel
                },
                axiosConfig
            );

            console.log('✅ Update response:', response.data);

            setShowEditDialog(false);
            setEditingFile(null);
            setFormData({ name: '', description: '' });
            setEditFileTags('');
            setEditFileContentTypes([]);
            setEditIsArchived(false);
            setEditAudienceLevel('Internal');

            // Wait a bit for database to update, then refresh
            console.log('🔄 Refreshing file list...');
            await new Promise(resolve => setTimeout(resolve, 300));

            if (selectedFolder) {
                await loadFiles(selectedFolder.id);
                console.log('✅ File list refreshed');
            }

            alert('File metadata updated successfully!');
        } catch (error: any) {
            console.error('❌ Error updating file:', error);
            console.error('Error details:', error.response?.data);
            alert(`Failed to update file: ${error.response?.data?.error || error.message}`);
        }
    };

    // Helper function to group files by date with filtering
    const getFilteredAndGroupedFiles = () => {
        let filtered = files;

        // 1. Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(file => {
                const matchesTitle = file.title.toLowerCase().includes(query);
                const matchesTags = file.tags?.some(tag => tag.name.toLowerCase().includes(query));
                const matchesContentType = file.contentTypes?.some(ct => ct.name.toLowerCase().includes(query));
                return matchesTitle || matchesTags || matchesContentType;
            });
        }

        // 2. File Type Filter
        if (fileTypeFilter !== 'all') {
            filtered = filtered.filter(file => file.fileType === fileTypeFilter);
        }

        // 3. Content Type Filter
        if (contentTypeFilter.length > 0) {
            filtered = filtered.filter(file =>
                file.contentTypes?.some(ct => contentTypeFilter.includes(ct.id))
            );
        }

        // 4. Date Range
        if (dateRangeFrom) {
            const fromDate = new Date(dateRangeFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(file => new Date(file.createdAt) >= fromDate);
        }
        if (dateRangeTo) {
            const toDate = new Date(dateRangeTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(file => new Date(file.createdAt) <= toDate);
        }

        const grouped = filtered.reduce((acc, file) => {
            const date = new Date(file.createdAt);
            const dateKey = date.toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(file);
            return acc;
        }, {} as Record<string, typeof files>);

        // Sort date groups (newest first)
        return Object.keys(grouped).sort((a, b) => {
            return new Date(b).getTime() - new Date(a).getTime();
        }).map(dateKey => ({ dateKey, files: grouped[dateKey] }));
    };

    const filteredGroupedFiles = getFilteredAndGroupedFiles();
    const filteredFileCount = filteredGroupedFiles.reduce((acc, group) => acc + group.files.length, 0);

    return (
        <div className="space-y-6 animate-fadeIn">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Assets Repository</h2>
                    <p className="text-slate-500 mt-1">Hierarchical repository: Business Units → Products → Folders → Files</p>
                </div>
                {currentView !== 'business-units' && (
                    <button
                        onClick={handleBack}
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>
                )}
            </header>

            {/* Breadcrumb - Now Clickable */}
            <div className="flex items-center space-x-2 text-sm bg-slate-50 px-4 py-2 rounded-lg">
                <button
                    onClick={() => handleBreadcrumbClick('home')}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition"
                >
                    Home
                </button>
                {selectedBU && (
                    <>
                        <span className="text-slate-400">/</span>
                        <button
                            onClick={() => handleBreadcrumbClick('bu')}
                            className={`${currentView === 'products'
                                ? 'text-slate-900 font-semibold'
                                : 'text-blue-600 hover:text-blue-800 hover:underline'
                                } transition`}
                        >
                            {selectedBU.name}
                        </button>
                    </>
                )}
                {selectedProduct && (
                    <>
                        <span className="text-slate-400">/</span>
                        <button
                            onClick={() => handleBreadcrumbClick('product')}
                            className={`${currentView === 'folders'
                                ? 'text-slate-900 font-semibold'
                                : 'text-blue-600 hover:text-blue-800 hover:underline'
                                } transition`}
                        >
                            {selectedProduct.name}
                        </button>
                    </>
                )}
                {selectedFolder && (
                    <>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-900 font-semibold">{selectedFolder.name}</span>
                    </>
                )}
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Bar */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">
                        {currentView === 'business-units' && 'Business Units'}
                        {currentView === 'products' && `Products in ${selectedBU?.name}`}
                        {currentView === 'folders' && `Folders in ${selectedProduct?.name}`}
                        {currentView === 'files' && `Files in ${selectedFolder?.name} (${filteredFileCount})`}
                    </h3>
                    {/* Conditionally show Create button based on permissions */}
                    {((currentView === 'business-units' && hasPermission('ASSET_BU_CREATE')) ||
                        (currentView === 'products' && hasPermission('ASSET_PRODUCT_CREATE')) ||
                        (currentView === 'folders' && hasPermission('ASSET_FOLDER_CREATE')) ||
                        (currentView === 'files' && hasPermission('ASSET_FILE_CREATE'))) && (
                            <button
                                onClick={() => {
                                    if (currentView === 'business-units') setCreateType('bu');
                                    else if (currentView === 'products') setCreateType('product');
                                    else if (currentView === 'folders') setCreateType('folder');
                                    else if (currentView === 'files') setCreateType('file');
                                    setShowCreateDialog(true);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>
                                    {currentView === 'business-units' && 'New Business Unit'}
                                    {currentView === 'products' && 'New Product'}
                                    {currentView === 'folders' && 'New Folder'}
                                    {currentView === 'files' && 'Upload File'}
                                </span>
                            </button>
                        )}
                </div>

                {/* Content Area */}
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-slate-600">Loading...</p>
                        </div>
                    ) : (
                        <>
                            {/* Business Units View */}
                            {currentView === 'business-units' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {businessUnits.map(bu => (
                                        <div
                                            key={bu.id}
                                            onClick={() => handleBUClick(bu)}
                                            className="p-6 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-lg text-slate-900 group-hover:text-blue-600">{bu.name}</h4>
                                                <div className="flex space-x-2">
                                                    {hasPermission('ASSET_BU_UPDATE') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditEntityDialog('bu', bu.id, bu.name, bu.description); }}
                                                            className="text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition"
                                                            title="Edit"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {hasPermission('ASSET_BU_DELETE') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete('bu', bu.id); }}
                                                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition"
                                                            title="Delete"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {bu.description && <p className="text-sm text-slate-500">{bu.description}</p>}
                                            <div className="mt-4 flex items-center text-sm text-blue-600 font-medium">
                                                <span>View Products</span>
                                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Products View */}
                            {currentView === 'products' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.length === 0 ? (
                                        <div className="col-span-full text-center py-12 text-slate-500">
                                            No products found. Click "New Product" to create one.
                                        </div>
                                    ) : (
                                        products.map(product => (
                                            <div
                                                key={product.id}
                                                onClick={() => handleProductClick(product)}
                                                className="p-6 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-lg text-slate-900 group-hover:text-blue-600">{product.name}</h4>
                                                    <div className="flex space-x-2">
                                                        {hasPermission('ASSET_PRODUCT_UPDATE') && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openEditEntityDialog('product', product.id, product.name, product.description); }}
                                                                className="text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition"
                                                                title="Edit"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        {hasPermission('ASSET_PRODUCT_DELETE') && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete('product', product.id); }}
                                                                className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition"
                                                                title="Delete"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {product.description && <p className="text-sm text-slate-500">{product.description}</p>}
                                                <div className="mt-4 flex items-center text-sm text-blue-600 font-medium">
                                                    <span>View Folders</span>
                                                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Folders View */}
                            {currentView === 'folders' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {folders.length === 0 ? (
                                        <div className="col-span-full text-center py-12 text-slate-500">
                                            No folders found. Click "New Folder" to create one.
                                        </div>
                                    ) : (
                                        folders.map(folder => (
                                            <div
                                                key={folder.id}
                                                onClick={() => handleFolderClick(folder)}
                                                className="p-6 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center space-x-3">
                                                        <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                                        </svg>
                                                        <h4 className="font-bold text-lg text-slate-900 group-hover:text-blue-600">{folder.name}</h4>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        {hasPermission('ASSET_FOLDER_UPDATE') && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openEditEntityDialog('folder', folder.id, folder.name, folder.description); }}
                                                                className="text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition"
                                                                title="Edit"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        {hasPermission('ASSET_FOLDER_DELETE') && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete('folder', folder.id); }}
                                                                className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition"
                                                                title="Delete"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {folder.description && <p className="text-sm text-slate-500">{folder.description}</p>}
                                                <div className="mt-4 flex items-center text-sm text-blue-600 font-medium">
                                                    <span>View Files</span>
                                                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Files View */}
                            {currentView === 'files' && (
                                <div className="space-y-4">
                                    {files.length > 0 && (
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                                <div className="col-span-1 md:col-span-2">
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            placeholder="Search by title, tags, or type..."
                                                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                        />
                                                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">File Type</label>
                                                    <select
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                                        value={fileTypeFilter}
                                                        onChange={(e) => setFileTypeFilter(e.target.value)}
                                                    >
                                                        <option value="all">All Types</option>
                                                        <option value="PDF">PDF</option>
                                                        <option value="XLSX">Excel</option>
                                                        <option value="DOCX">Word</option>
                                                        <option value="PPTX">PowerPoint</option>
                                                        <option value="CSV">CSV</option>
                                                        <option value="TXT">Text</option>
                                                        <option value="OTHER">Other</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        onClick={() => {
                                                            setSearchQuery('');
                                                            setFileTypeFilter('all');
                                                            setContentTypeFilter([]);
                                                            setShowArchived(false);
                                                            setDateRangeFrom('');
                                                            setDateRangeTo('');
                                                        }}
                                                        className="text-sm text-slate-600 hover:text-blue-600 font-medium transition flex items-center mb-2"
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        Clear Filters
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Date From</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                        value={dateRangeFrom}
                                                        onChange={(e) => setDateRangeFrom(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Date To</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                        value={dateRangeTo}
                                                        onChange={(e) => setDateRangeTo(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex items-end mb-2">
                                                    <label className="inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            checked={showArchived}
                                                            onChange={(e) => setShowArchived(e.target.checked)}
                                                        />
                                                        <span className="ml-2 text-sm text-slate-600">Show Archived</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-200 pt-3">
                                                <label className="block text-xs font-medium text-slate-500 mb-2">Filter by Content Type</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {contentTypes.map(ct => (
                                                        <label key={ct.id} className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition select-none
                                                             ${contentTypeFilter.includes(ct.id)
                                                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={contentTypeFilter.includes(ct.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setContentTypeFilter([...contentTypeFilter, ct.id]);
                                                                    } else {
                                                                        setContentTypeFilter(contentTypeFilter.filter(id => id !== ct.id));
                                                                    }
                                                                }}
                                                            />
                                                            {ct.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}                        {files.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500">
                                            No files found. Click "Upload File" to add one.
                                        </div>
                                    ) : filteredGroupedFiles.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                                            <p className="mb-2">No matching files found.</p>
                                            <button
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setFileTypeFilter('all');
                                                    setContentTypeFilter([]);
                                                    setDateRangeFrom('');
                                                    setDateRangeTo('');
                                                }}
                                                className="text-blue-600 hover:underline font-medium text-sm"
                                            >
                                                Clear all filters
                                            </button>
                                            {showArchived && <p className="mt-2 text-xs text-slate-400">(Includes archived files)</p>}
                                        </div>
                                    ) : (
                                        filteredGroupedFiles.map(({ dateKey, files: dateFiles }) => (
                                            <div key={dateKey} className="space-y-3">
                                                {/* Date Header */}
                                                <div className="flex items-center space-x-3 sticky top-0 bg-white z-10 py-2">
                                                    <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="font-semibold text-blue-900">{dateKey}</span>
                                                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                                            {dateFiles.length} {dateFiles.length === 1 ? 'file' : 'files'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 h-px bg-slate-200"></div>
                                                </div>

                                                {/* Files for this date */}
                                                {dateFiles.map(file => (
                                                    <div key={file.id} className="p-4 border border-slate-200 rounded-lg hover:border-blue-200 hover:bg-blue-50/30 transition">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-start space-x-4 flex-1">
                                                                <div className="bg-blue-100 text-blue-700 px-3 py-2 rounded font-bold text-xs flex flex-col items-center justify-center min-w-[60px]">
                                                                    <span>{file.fileType}</span>
                                                                    {file.isArchived && <span className="mt-1 text-[10px] bg-gray-500 text-white px-1 rounded">ARCHIVED</span>}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h5 className="font-semibold text-slate-900">{file.title}</h5>
                                                                    <p className="text-sm text-slate-500">{file.originalFileName}</p>
                                                                    <p className="text-xs text-slate-400 mt-1">
                                                                        {formatFileSize(file.fileSize)} • Uploaded {formatDate(file.createdAt)} by {file.uploadedBy}
                                                                        <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold border ${file.audienceLevel === 'Internal' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                            file.audienceLevel === 'Partner' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                                                                'bg-purple-100 text-purple-700 border-purple-200'
                                                                            }`}>
                                                                            {file.audienceLevel || 'Internal'}
                                                                        </span>
                                                                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold border bg-gray-100 text-gray-700 border-gray-200">
                                                                            V{file.versionNumber || 1}
                                                                        </span>
                                                                    </p>
                                                                    {file.description && (
                                                                        <p className="text-sm text-slate-600 mt-2">{file.description}</p>
                                                                    )}
                                                                    {file.tags.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                                            {file.tags.map(tag => (
                                                                                <span key={tag.id} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">
                                                                                    {tag.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {file.contentTypes && file.contentTypes.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                                            {file.contentTypes.map(ct => (
                                                                                <span key={ct.id} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium">
                                                                                    📄 {ct.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex space-x-2 ml-4">
                                                                <button
                                                                    onClick={() => setHistoryFile(file)}
                                                                    className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded transition"
                                                                    title="Version History"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </button>
                                                                {hasPermission('ASSET_FILE_UPDATE') && (
                                                                    <button
                                                                        onClick={() => handleUploadNewVersion(file)}
                                                                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                                        title="Upload New Version"
                                                                    >
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                                {hasPermission('ASSET_FILE_UPDATE') && (
                                                                    <button
                                                                        onClick={() => openEditDialog(file)}
                                                                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                                        title="Edit"
                                                                    >
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDownload(file)}
                                                                    className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition"
                                                                    title="Download"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                    </svg>
                                                                </button>
                                                                {hasPermission('ASSET_FILE_DELETE') && (
                                                                    <button
                                                                        onClick={() => handleDelete('file', file.id)}
                                                                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                                        title="Delete"
                                                                    >
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Create Dialog */}
                            {showCreateDialog && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] flex flex-col">
                                        <h3 className="text-xl font-bold mb-4">
                                            {createType === 'bu' && 'Create Business Unit'}
                                            {createType === 'product' && 'Create Product'}
                                            {createType === 'folder' && 'Create Folder'}
                                            {createType === 'file' && (uploadVersionGroupId ? 'Upload New Version' : 'Upload File')}
                                        </h3>

                                        <div className="space-y-4 overflow-y-auto flex-1 pr-2">{/* Scrollable content area */}
                                            {createType === 'file' ? (
                                                <>
                                                    {/* Upload Mode Toggle */}
                                                    <div className="flex space-x-4 mb-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setUploadMode('single'); setUploadFiles(null); }}
                                                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${uploadMode === 'single'
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                }`}
                                                        >
                                                            Single File
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setUploadMode('folder'); setUploadFile(null); }}
                                                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${uploadMode === 'folder'
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                }`}
                                                        >
                                                            📁 Upload Folder
                                                        </button>
                                                    </div>

                                                    {uploadMode === 'single' ? (
                                                        <>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
                                                                <input
                                                                    type="file"
                                                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                                                <input
                                                                    type="text"
                                                                    value={formData.name}
                                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                                    placeholder="File title"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                                                                <input
                                                                    type="text"
                                                                    value={uploadTags}
                                                                    onChange={(e) => setUploadTags(e.target.value)}
                                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                                    placeholder="proposal, datasheet, technical"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-2">Content Types</label>
                                                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                                                                    {contentTypes.map(ct => (
                                                                        <label key={ct.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedContentTypes.includes(ct.id)}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setSelectedContentTypes([...selectedContentTypes, ct.id]);
                                                                                    } else {
                                                                                        setSelectedContentTypes(selectedContentTypes.filter(id => id !== ct.id));
                                                                                    }
                                                                                }}
                                                                                className="w-4 h-4 text-blue-600"
                                                                            />
                                                                            <span className="text-sm text-slate-700">{ct.name}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                                {selectedContentTypes.length > 0 && (
                                                                    <p className="text-xs text-slate-500 mt-1">
                                                                        {selectedContentTypes.length} type(s) selected
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                                                <textarea
                                                                    value={formData.description}
                                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                                    rows={3}
                                                                    placeholder="File description"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-1">Audience Level</label>
                                                                <select
                                                                    value={uploadAudienceLevel}
                                                                    onChange={(e) => setUploadAudienceLevel(e.target.value as any)}
                                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                                                                >
                                                                    <option value="Internal">Internal Only</option>
                                                                    <option value="Partner">Partners & Internal</option>
                                                                    <option value="EndUser">End Users (Public)</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-2">Select Folder</label>
                                                                <input
                                                                    type="file"
                                                                    // @ts-ignore - webkitdirectory is not in TypeScript types but works in modern browsers
                                                                    webkitdirectory="true"
                                                                    multiple
                                                                    onChange={(e) => setUploadFiles(e.target.files)}
                                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                                />
                                                                {uploadFiles && uploadFiles.length > 0 && (
                                                                    <p className="text-sm text-slate-600 mt-2">
                                                                        📂 {uploadFiles.length} file(s) selected
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                                                <textarea
                                                                    value={formData.description}
                                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                                    rows={3}
                                                                    placeholder="File description"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-1">Audience Level (for all files)</label>
                                                                <select
                                                                    value={uploadAudienceLevel}
                                                                    onChange={(e) => setUploadAudienceLevel(e.target.value as any)}
                                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                                                                >
                                                                    <option value="Internal">Internal Only</option>
                                                                    <option value="Partner">Partners & Internal</option>
                                                                    <option value="EndUser">End Users (Public)</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                                        <input
                                                            type="text"
                                                            value={formData.name}
                                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                            placeholder="Enter name"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                                        <textarea
                                                            value={formData.description}
                                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                            rows={3}
                                                            placeholder="Enter description"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex justify-end space-x-3 mt-6">
                                            <button
                                                onClick={() => { setShowCreateDialog(false); setFormData({ name: '', description: '' }); setUploadFile(null); setUploadFiles(null); setUploadTags(''); setUploadMode('single'); }}
                                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleCreate}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                {createType === 'file' ? 'Upload' : 'Create'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Edit File Dialog */}
                            {showEditDialog && editingFile && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] flex flex-col">
                                        <h3 className="text-xl font-bold mb-4">Edit File Metadata</h3>

                                        <div className="space-y-4 overflow-y-auto flex-1 pr-2">{/* Scrollable content area */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                    placeholder="File title"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                                <textarea
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                    rows={3}
                                                    placeholder="File description"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Audience Level</label>
                                                <select
                                                    value={editAudienceLevel}
                                                    onChange={(e) => setEditAudienceLevel(e.target.value as any)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                                                >
                                                    <option value="Internal">Internal Only</option>
                                                    <option value="Partner">Partners & Internal</option>
                                                    <option value="EndUser">End Users (Public)</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center mt-2">
                                                <input
                                                    type="checkbox"
                                                    id="editParamsArchived"
                                                    checked={editIsArchived}
                                                    onChange={(e) => setEditIsArchived(e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <label htmlFor="editParamsArchived" className="ml-2 block text-sm text-slate-700">
                                                    Archived (Hidden by default)
                                                </label>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                                                <input
                                                    type="text"
                                                    value={editFileTags}
                                                    onChange={(e) => setEditFileTags(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                                    placeholder="proposal, datasheet, technical"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Content Types</label>
                                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                                                    {contentTypes.map(ct => (
                                                        <label key={ct.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={editFileContentTypes.includes(ct.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setEditFileContentTypes([...editFileContentTypes, ct.id]);
                                                                    } else {
                                                                        setEditFileContentTypes(editFileContentTypes.filter(id => id !== ct.id));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">{ct.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {editFileContentTypes.length > 0 && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {editFileContentTypes.length} type(s) selected
                                                    </p>
                                                )}
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded">
                                                <p className="text-xs text-slate-500">Original File: {editingFile.originalFileName}</p>
                                                <p className="text-xs text-slate-500">Type: {editingFile.fileType}</p>
                                                <p className="text-xs text-slate-500">Size: {formatFileSize(editingFile.fileSize)}</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-end space-x-3 mt-6">
                                            <button
                                                onClick={() => { setShowEditDialog(false); setEditingFile(null); setFormData({ name: '', description: '' }); setEditFileTags(''); setEditFileContentTypes([]); setEditIsArchived(false); }}
                                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleUpdateFile}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Edit Entity Dialog (BU/Product/Folder) */}
                            {showEditEntityDialog && editingEntity && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                                        <h3 className="text-xl font-bold mb-4">
                                            Edit {editingEntity.type === 'bu' ? 'Business Unit' : editingEntity.type === 'product' ? 'Product' : 'Folder'}
                                        </h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Enter name"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                                <textarea
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    rows={3}
                                                    placeholder="Enter description (optional)"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end space-x-3 mt-6">
                                            <button
                                                onClick={() => { setShowEditEntityDialog(false); setEditingEntity(null); setFormData({ name: '', description: '' }); }}
                                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleEditEntity}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {historyFile && (
                <VersionHistoryDialog
                    fileId={historyFile.id}
                    fileName={historyFile.title}
                    isOpen={!!historyFile}
                    onClose={() => setHistoryFile(null)}
                />
            )}
        </div >
    );
};

export default SalesAssetsRepository;
