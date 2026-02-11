import React, { useState } from 'react';

interface FileUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[], metadata: { title: string; salesStage: string; audience: string; category: string }) => Promise<void>;
}

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({ isOpen, onClose, onUpload }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [title, setTitle] = useState('');
    const [salesStage, setSalesStage] = useState('');
    const [audience, setAudience] = useState('');
    const [category, setCategory] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileSelect = async () => {
        try {
            // Check if Electron API is available
            // @ts-ignore - electron API
            if (window.electron && window.electron.openFileDialog) {
                // Use Electron file dialog
                // @ts-ignore
                const result = await window.electron.openFileDialog({});
                if (!result.canceled && result.filePaths.length > 0) {
                    // Convert file paths to File objects
                    const files = await Promise.all(
                        result.filePaths.map(async (filePath: string) => {
                            const response = await fetch(`file://${filePath}`);
                            const blob = await response.blob();
                            const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'file';
                            return new File([blob], fileName, { type: blob.type });
                        })
                    );
                    setSelectedFiles(files);
                    if (files.length === 1 && !title) {
                        setTitle(files[0].name.replace(/\.[^/.]+$/, '')); // Remove extension
                    }
                }
            } else {
                // Fallback to native HTML file input for browser mode
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = '.pdf,.xlsx,.xls,.doc,.docx,.ppt,.pptx,.txt,.csv';

                input.onchange = (e: Event) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files && target.files.length > 0) {
                        const filesArray = Array.from(target.files);
                        setSelectedFiles(filesArray);
                        if (filesArray.length === 1 && !title) {
                            setTitle(filesArray[0].name.replace(/\.[^/.]+$/, '')); // Remove extension
                        }
                    }
                };

                input.click();
            }
        } catch (error) {
            console.error('Error selecting files:', error);
            alert('Failed to select files: ' + (error as Error).message);
        }
    };

    const handleFolderSelect = async () => {
        try {
            // Check if Electron API is available
            // @ts-ignore - electron API
            if (window.electron && window.electron.openFolderDialog) {
                // Use Electron folder dialog
                // @ts-ignore
                const result = await window.electron.openFolderDialog({});
                if (!result.canceled && result.filePaths.length > 0) {
                    const folderPath = result.filePaths[0];

                    // Get all files from folder recursively via API
                    const response = await fetch(`http://localhost:3000/api/assets/scan-folder`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ folderPath })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to scan folder');
                    }

                    const { files: fileInfos } = await response.json();

                    // Convert file paths to File objects
                    const files = await Promise.all(
                        fileInfos.map(async (fileInfo: any) => {
                            const response = await fetch(`file://${fileInfo.path}`);
                            const blob = await response.blob();
                            return new File([blob], fileInfo.name, { type: blob.type });
                        })
                    );

                    setSelectedFiles(files);
                    if (!title) {
                        const folderName = folderPath.split('\\').pop() || folderPath.split('/').pop() || 'folder';
                        setTitle(folderName);
                    }
                }
            } else {
                // Fallback for browser mode - use webkitdirectory
                const input = document.createElement('input');
                input.type = 'file';
                // @ts-ignore - webkitdirectory is not in TypeScript types
                input.webkitdirectory = true;
                input.multiple = true;

                input.onchange = (e: Event) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files && target.files.length > 0) {
                        const filesArray = Array.from(target.files).filter(file => {
                            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
                            return ['.pdf', '.xlsx', '.xls', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.csv'].includes(ext);
                        });
                        setSelectedFiles(filesArray);
                        if (!title && filesArray.length > 0) {
                            // Use the first folder name from the path
                            // @ts-ignore
                            const pathParts = filesArray[0].webkitRelativePath?.split('/') || [];
                            setTitle(pathParts[0] || 'folder');
                        }
                    }
                };

                input.click();
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
            alert('Failed to select folder: ' + (error as Error).message);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            alert('Please select at least one file');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const metadata = { title, salesStage, audience, category };

            // Upload files one by one
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const fileMetadata = {
                    ...metadata,
                    title: selectedFiles.length > 1 ? file.name.replace(/\.[^/.]+$/, '') : title
                };

                await onUpload([file], fileMetadata);
                setUploadProgress(((i + 1) / selectedFiles.length) * 100);
            }

            // Reset and close
            setSelectedFiles([]);
            setTitle('');
            setSalesStage('');
            setAudience('');
            setCategory('');
            setUploading(false);
            setUploadProgress(0);
            onClose();
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload files: ' + (error as Error).message);
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Upload Sales Assets</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>

                {/* File Selection */}
                <div className="mb-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <button
                            onClick={handleFileSelect}
                            disabled={uploading}
                            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
                        >
                            <svg className="w-10 h-10 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm font-semibold text-slate-700">Select Files</p>
                            <p className="text-xs text-slate-500 mt-1">Choose individual files</p>
                        </button>

                        <button
                            onClick={handleFolderSelect}
                            disabled={uploading}
                            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-green-500 hover:bg-green-50 transition cursor-pointer disabled:opacity-50"
                        >
                            <svg className="w-10 h-10 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <p className="text-sm font-semibold text-slate-700">Select Folder</p>
                            <p className="text-xs text-slate-500 mt-1">Upload all files in folder</p>
                        </button>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-semibold text-slate-700">{selectedFiles.length} file(s) selected</p>
                                <button
                                    onClick={() => setSelectedFiles([])}
                                    disabled={uploading}
                                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                                                <span className="text-blue-600 font-bold text-xs">{file.name.split('.').pop()?.toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                                                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                                            disabled={uploading}
                                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Metadata Form */}
                {selectedFiles.length > 0 && (
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={uploading}
                                placeholder="Asset title"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Sales Stage</label>
                                <select
                                    value={salesStage}
                                    onChange={(e) => setSalesStage(e.target.value)}
                                    disabled={uploading}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                >
                                    <option value="">Select...</option>
                                    <option value="Discovery">Discovery</option>
                                    <option value="Proposal">Proposal</option>
                                    <option value="Negotiation">Negotiation</option>
                                    <option value="Closing">Closing</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Audience</label>
                                <select
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                    disabled={uploading}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                >
                                    <option value="">Select...</option>
                                    <option value="C-Level">C-Level</option>
                                    <option value="Technical">Technical</option>
                                    <option value="Business">Business</option>
                                    <option value="End User">End User</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    disabled={uploading}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                >
                                    <option value="">Select...</option>
                                    <option value="Deck">Deck</option>
                                    <option value="Case Study">Case Study</option>
                                    <option value="Proposal">Proposal</option>
                                    <option value="Datasheet">Datasheet</option>
                                    <option value="Whitepaper">Whitepaper</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Progress */}
                {uploading && (
                    <div className="mb-6">
                        <div className="flex justify-between text-sm text-slate-600 mb-2">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={uploading || selectedFiles.length === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FileUploadDialog;
