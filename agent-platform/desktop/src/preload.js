import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatformStatus: ()      => ipcRenderer.invoke('platform:status'),
  openProject:       ()      => ipcRenderer.invoke('platform:openProject'),
  getVersion:        ()      => ipcRenderer.invoke('app:getVersion'),
  getProjectPath:    ()      => null, // Set by user in UI
})
