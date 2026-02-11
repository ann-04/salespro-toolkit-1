const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    // File dialog APIs
    openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
    openFolderDialog: (options) => ipcRenderer.invoke('dialog:openFolder', options)
});
