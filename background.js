/*globals database, ajax, manager*/

'use strict';

init();

function init() {
    browser.browserAction.onClicked.addListener(manager.handleBrowserAction.bind(manager));
    browser.runtime.onMessage.addListener(manager.handleMessage.bind(manager));
    browser.tabs.onRemoved.addListener(manager.handleRemoved.bind(manager));
    window.database = database;
    window.ajax = ajax;
    window.setting = {
        init() {
            return browser.storage.local.get().then(item => {
                this.itemsPerPage = item.itemsPerPage || 20;
                this.timeout = item.timeout || 30;
                this.isAutoRefresh = item.isAutoRefresh || false;
                this.frequency = item.frequency || 20;
                this.openMode = item.openMode || 'front';
                this.readState = item.readState || 'unread';
                this.openedMenus = item.openedMenus || [];
                if (this.isAutoRefresh) ajax.autoUpdate();
            });
        },
        change(key, value) {
            this[key] = Array.isArray(value) ? [].concat(value) : value;
            if (key == 'isAutoRefresh') value ? ajax.autoUpdate() : ajax.stopUpdate();
            if (key == 'frequency') {
                ajax.stopUpdate();
                ajax.autoUpdate();
            }
            return browser.storage.local.set({ [key]: value });
        },
        clear() {
            ajax.stopUpdate();
            return browser.storage.local.clear().then(() => this.init());
        },
        reset() {
            ajax.stopUpdate();
            return browser.storage.local.remove(['itemsPerPage', 'timeout', 'isAutoRefresh', 'frequency', 'openMode']).then(() => this.init());
        }
    };
    window.onerror = (errorMessage, scriptURI, lineNumber) => {
        manager.sendMessageToAllTabs({
            type: 'unknown error', errorMessage: errorMessage, scriptURI: scriptURI, lineNumber: lineNumber
        });
    };
    window.setting.init();
    database.init();
}
