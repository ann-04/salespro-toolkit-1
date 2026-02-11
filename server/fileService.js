import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage directory for uploaded files
const STORAGE_DIR = path.join(__dirname, '../storage/assets');

// Ensure storage directory exists
export function ensureStorageDirectory() {
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        console.log('✅ Created storage directory:', STORAGE_DIR);
    }
}

/**
 * Get file type from extension
 */
export function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const typeMap = {
        '.pdf': 'PDF',
        '.xlsx': 'XLSX',
        '.xls': 'XLSX',
        '.csv': 'CSV',
        '.doc': 'DOC',
        '.docx': 'DOCX',
        '.ppt': 'PPT',
        '.pptx': 'PPTX',
        '.txt': 'TXT'
    };
    return typeMap[ext] || 'OTHER';
}

/**
 * Generate unique filename with UUID
 */
export function generateStoredFileName(originalFileName) {
    const ext = path.extname(originalFileName);
    const uniqueId = uuidv4();
    return `${uniqueId}${ext}`;
}

/**
 * Get full storage path for a stored filename
 */
export function getStoragePath(storedFileName) {
    return path.join(STORAGE_DIR, storedFileName);
}

/**
 * Extract text from PDF file
 */
export async function extractPdfText(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return null;
    }
}

/**
 * Extract metadata from Excel file
 */
export function extractExcelMetadata(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const metadata = {
            sheetNames: workbook.SheetNames,
            sheetCount: workbook.SheetNames.length,
            sheets: {}
        };

        // Extract basic info from each sheet
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
            metadata.sheets[sheetName] = {
                rowCount: range.e.r + 1,
                columnCount: range.e.c + 1
            };
        });

        return metadata;
    } catch (error) {
        console.error('Error extracting Excel metadata:', error);
        return null;
    }
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        console.error('Error getting file size:', error);
        return 0;
    }
}

/**
 * Copy file to storage and return stored filename
 */
export async function copyFileToStorage(sourcePath, originalFileName) {
    try {
        ensureStorageDirectory();
        const storedFileName = generateStoredFileName(originalFileName);
        const destPath = getStoragePath(storedFileName);

        // Copy file
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ File copied to storage: ${storedFileName}`);

        return storedFileName;
    } catch (error) {
        console.error('Error copying file to storage:', error);
        throw error;
    }
}

/**
 * Delete file from storage
 */
export function deleteFileFromStorage(storedFileName) {
    try {
        const filePath = getStoragePath(storedFileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ File deleted from storage: ${storedFileName}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file from storage:', error);
        return false;
    }
}

/**
 * Validate file type (only allow safe file types)
 */
export function isValidFileType(filename) {
    const allowedExtensions = ['.pdf', '.xlsx', '.xls', '.csv', '.doc', '.docx', '.ppt', '.pptx', '.txt'];
    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(ext);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Recursively get all files from a folder
 */
export function getAllFilesFromFolder(folderPath) {
    const files = [];

    function scanDirectory(dirPath) {
        try {
            const items = fs.readdirSync(dirPath);

            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    // Recursively scan subdirectories
                    scanDirectory(fullPath);
                } else if (stat.isFile() && isValidFileType(item)) {
                    // Add valid files to the list
                    files.push({
                        path: fullPath,
                        name: item,
                        size: stat.size,
                        relativePath: path.relative(folderPath, fullPath)
                    });
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
    }

    scanDirectory(folderPath);
    return files;
}
