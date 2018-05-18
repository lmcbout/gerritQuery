// @ts-check

// Workaround for https://github.com/electron/electron/issues/9225. Chrome has an issue where
// in certain locales (e.g. PL), image metrics are wrongly computed. We explicitly set the
// LC_NUMERIC to prevent this from happening (selects the numeric formatting category of the
// C locale, http://en.cppreference.com/w/cpp/locale/LC_categories).
if (process.env.LC_ALL) {
    process.env.LC_ALL = 'C';
}
process.env.LC_NUMERIC = 'C';

const { join } = require('path');
const { isMaster } = require('cluster');
const { fork } = require('child_process');
const { app, BrowserWindow, ipcMain } = require('electron');

const windows = [];

function createNewWindow(theUrl) {
    const newWindow = new BrowserWindow({ width: 1024, height: 728, show: !!theUrl });
    if (windows.length === 0) {
        newWindow.webContents.on('new-window', (event, url, frameName, disposition, options) => {
            // If the first electron window isn't visible, then all other new windows will remain invisible.
            // https://github.com/electron/electron/issues/3751
            options.show = true;
            options.width = 1024;
            options.height = 728;
        });
    }
    windows.push(newWindow);
    if (!!theUrl) {
        newWindow.loadURL(theUrl);
    } else {
        newWindow.on('ready-to-show', () => newWindow.show());
    }
    newWindow.on('closed', () => {
        const index = windows.indexOf(newWindow);
        if (index !== -1) {
            windows.splice(index, 1);
        }
        if (windows.length === 0) {
            app.exit(0);
        }
    });
    return newWindow;
}

if (isMaster) {
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
    ipcMain.on('create-new-window', (event, url) => {
        createNewWindow(url);
    });
    app.on('ready', () => {
        // Check whether we are in bundled application or development mode.
        const devMode = process.defaultApp || /node_modules[/]electron[/]/.test(process.execPath);
        const mainWindow = createNewWindow();
        const loadMainWindow = (port) => {
            mainWindow.loadURL('file://' + join(__dirname, '../../lib/index.html') + '?port=' + port);
        };
        const mainPath = join(__dirname, '..', 'backend', 'main');
        // We need to distinguish between bundled application and development mode when starting the clusters.
        // See: https://github.com/electron/electron/issues/6337#issuecomment-230183287
        if (devMode) {
            require(mainPath).then(address => {
                loadMainWindow(address.port);
            }).catch((error) => {
                console.error(error);
                app.exit(1);
            });
        } else {
            const cp = fork(mainPath);
            cp.on('message', (message) => {
                loadMainWindow(message);
            });
            cp.on('error', (error) => {
                console.error(error);
                app.exit(1);
            });
            app.on('quit', () => {
                // If we forked the process for the clusters, we need to manually terminate it.
                // See: https://github.com/theia-ide/theia/issues/835
                process.kill(cp.pid);
            });
        }
    });
} else {
    require('../backend/main');
}
