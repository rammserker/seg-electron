const { contextBridge, ipcRenderer } = require('electron');

// Utils
contextBridge.exposeInMainWorld('segUtils', {
    existsProyecto: nombre => ipcRenderer.invoke('utils:existsProyecto', nombre),
    getProyectos: _ => ipcRenderer.invoke('utils:getProyectos'),
    openFileExplorer: options => ipcRenderer.invoke('utils:openFileExplorer', options),
});

// Acciones
contextBridge.exposeInMainWorld('segActions', {
    nuevoProyecto: nombre => ipcRenderer.invoke('acciones:nuevoProyecto', nombre),
    compilarProyecto: nombre => ipcRenderer.invoke('acciones:compilarProyecto', nombre),
    crearTemplate: tpath => ipcRenderer.invoke('acciones:crearTemplate', tpath),
    dataProyecto: (nombre, fpath) => ipcRenderer.invoke('acciones:dataProyecto', nombre, fpath),
    abrirDirPry: nombre => ipcRenderer.invoke('acciones:abrirDirPry', nombre),
    borrarProyecto: nombre => ipcRenderer.invoke('acciones:borrarProyecto', nombre),
});
