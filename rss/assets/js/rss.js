'use strict';

init();

function init() {
    browser.tabs.getCurrent().then(onTabCreate, onError);
}

function handleResponse(message) {
    console.log(`Message from the background script:  ${message.response}`);
}

function onError(error) {
    console.log(`Error: ${error}`);
}

function onTabCreate(tabInfo) {
    browser.runtime.sendMessage({
        type: 'newtab',
        tabid: tabInfo.id
    }).then(handleResponse, onError);
}
