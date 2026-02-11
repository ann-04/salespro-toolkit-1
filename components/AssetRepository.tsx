import React, { useState, useEffect } from 'react';
import { DataService } from '../services/api';
import FileUploadDialog from './FileUploadDialog';

interface Asset {
  id: number;
  title: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  salesStage: string;
  audience: string;
  category: string;
  createdAt: string;
}

const AssetRepository: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStage, setFilterStage] = useState('');

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await DataService.getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Error loading assets:', error);
      alert('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: File[], metadata: any) => {
    for (const file of files) {
      await DataService.uploadAsset(file, metadata);
    }
    await loadAssets();
  };

  const handleDownload = async (asset: Asset) => {
    try {
      await DataService.downloadAsset(asset.id, asset.originalFileName);
    } catch (error) {
      console.error('Error downloading asset:', error);
      alert('Failed to download asset');
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to delete "${asset.title}"?`)) {
      return;
    }

    try {
      await DataService.deleteAsset(asset.id);
      await loadAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset');
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

  const getFileTypeIcon = (fileType: string) => {
    const colors: Record<string, string> = {
      'PDF': 'bg-red-500',
      'XLSX': 'bg-green-500',
      'DOCX': 'bg-blue-500',
      'PPTX': 'bg-orange-500',
      'TXT': 'bg-gray-500',
      'OTHER': 'bg-purple-500'
    };
    return colors[fileType] || colors['OTHER'];
  };

  // Filter assets
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.originalFileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || asset.fileType === filterType;
    const matchesStage = !filterStage || asset.salesStage === filterStage;
    return matchesSearch && matchesType && matchesStage;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Sales Asset Repository</h2>
          <p className="text-slate-500 mt-1">Ready-to-use collateral, decks, and proposal blocks.</p>
        </div>
        <button
          onClick={() => setUploadDialogOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>Upload Files</span>
        </button>
      </header>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Types</option>
          <option value="PDF">PDF</option>
          <option value="XLSX">Excel</option>
          <option value="DOCX">Word</option>
          <option value="PPTX">PowerPoint</option>
        </select>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Stages</option>
          <option value="Discovery">Discovery</option>
          <option value="Proposal">Proposal</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Closing">Closing</option>
        </select>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Loading assets...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-slate-600 font-semibold">No assets found</p>
            <p className="text-slate-500 text-sm mt-1">Upload your first sales asset to get started</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Asset Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Sales Stage</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Audience</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Uploaded</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-blue-50/20 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded flex items-center justify-center mr-3 text-white font-bold text-xs ${getFileTypeIcon(asset.fileType)}`}>
                        {asset.fileType}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{asset.title}</p>
                        <p className="text-xs text-slate-400">{formatFileSize(asset.fileSize)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{asset.fileType}</td>
                  <td className="px-6 py-4">
                    {asset.salesStage && (
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-bold">
                        {asset.salesStage}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{asset.audience || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{asset.category || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(asset.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleDownload(asset)}
                        className="text-blue-600 hover:text-blue-800 font-bold text-sm px-3 py-1 rounded hover:bg-blue-50 transition"
                        title="Download"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(asset)}
                        className="text-red-600 hover:text-red-800 font-bold text-sm px-3 py-1 rounded hover:bg-red-50 transition"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Dialog */}
      <FileUploadDialog
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
};

export default AssetRepository;
