import React, { useEffect, useState } from 'react';
import { DataService } from '../services/api';

interface VersionHistoryDialogProps {
    fileId?: number;
    fileName?: string;
    isOpen: boolean;
    onClose: () => void;
}

interface FileVersion {
    id: number;
    versionNumber: number;
    title: string;
    createdAt: string;
    createdByUser?: {
        id: number;
        name: string;
    };
    uploadedByName?: string; // Fallback
    originalFileName: string;
    VersionNumber?: number; // Casing fallback
    CreatedAt?: string;
    OriginalFileName?: string;
}

const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({ fileId, fileName, isOpen, onClose }) => {
    const [versions, setVersions] = useState<FileVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && fileId) {
            loadVersions();
        }
    }, [isOpen, fileId]);

    const loadVersions = async () => {
        setLoading(true);
        setError(null);
        try {
            // @ts-ignore - DataService might behave differently than typed
            const data = await DataService.getFileVersionsById(fileId!);
            console.log('Version History Data:', data);
            setVersions(data);
        } catch (error) {
            console.error('Failed to load versions', error);
            setError('Failed to load version history.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadVersion = async (versionId: number) => {
        try {
            const token = localStorage.getItem('token');
            const url = `http://localhost:3000/api/assets/files/${versionId}/download`;

            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', '');
            link.style.display = 'none';

            // Add authorization header via fetch first to handle auth
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            link.href = blobUrl;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download file');
        }
    };

    // Helper to safely get properties regardless of casing
    const getVal = (item: any, keyLower: string, keyPascal: string) => {
        return item[keyLower] !== undefined ? item[keyLower] : item[keyPascal];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Version History</h2>
                        <p className="text-slate-500 text-sm mt-1">File: {fileName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition p-2 rounded-full hover:bg-slate-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 text-red-700 p-3 rounded border border-red-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex-1 flex justify-center items-center py-12">
                        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="ml-3 text-slate-600">Loading versions...</span>
                    </div>
                ) : (
                    <div className="flex-1 overflow-x-auto">
                        <table className="min-w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                    <th className="p-4 font-semibold text-sm">Version</th>
                                    <th className="p-4 font-semibold text-sm">Date</th>
                                    <th className="p-4 font-semibold text-sm">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {versions.map((ver, idx) => {
                                    const vNum = getVal(ver, 'versionNumber', 'VersionNumber');
                                    const dateStr = getVal(ver, 'createdAt', 'CreatedAt');
                                    const verId = getVal(ver, 'id', 'Id');

                                    return (
                                        <tr key={verId || idx} className="hover:bg-blue-50 transition duration-150">
                                            <td className="p-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    V{vNum}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                {dateStr ? new Date(dateStr).toLocaleString() : '-'}
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleDownloadVersion(verId)}
                                                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                                                    title="View/Download this version"
                                                >
                                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {versions.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-slate-500 italic">
                                            No version history found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="mt-6 flex justify-end border-t pt-4">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VersionHistoryDialog;
