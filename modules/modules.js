/*globals DB_INFO*/

'use strict';

let manager = {
    tabids: [],
    handleBrowserAction() {
        browser.tabs.create({
            url: browser.extension.getURL('rss/rss.html')
        });
    },
    handleMessage(request, sender, sendResponse) {
        switch (request.type) {
            case 'newtab':
                if (this.tabids.indexOf(request.tabid) == -1)
                    this.tabids.push(request.tabid);
                sendResponse({
                    response: 'The new tabid has been saved'
                });
                break;
        }
    },
    handleRemoved(tabid) {
        if (this.tabids.indexOf(tabid) != -1)
            this.tabids.splice(this.tabids.indexOf(tabid), 1);
    },
    sendMessageToAllTabs(message) {
        return Promise.all(this.tabids.map(tabid => browser.tabs.sendMessage(tabid, message)));
    }
};

let ajax = {
    timeout: 30000,
    pendingQueue: [],
    update(type, id) {
        database.getFeeds(type == 'feed' ? 'id' : type, id).then(feeds => feeds.map(feed => {
            let queueIndex = this.pendingQueue.findIndex(item => item.id == feed.id);
            if (queueIndex > -1) {
                this.pendingQueue[queueIndex].fetchPromise.abort();
                this.pendingQueue.splice(queueIndex, 1);
            }
            let fetchPromise = this.fetch(feed.link);
            this.pendingQueue.push({ id: feed.id, fetchPromise });
            fetchPromise.then(text => feed.type == 'normal' ? this.parseFeed(text) : this.parseCustomFeed(text, feed))
                .then(result => database.addItems(result, feed.id, feed.group))
                .then(() => manager.sendMessageToAllTabs({ type: 'update success', feedid: feed.id, groupid: feed.group }))
                .then(() => this.pendingQueue.splice(this.pendingQueue.findIndex(item => item.id == feed.id), 1))
                .then(() => database.getItemsCount('groupid', '0', 'unread'))
                .then(count => browser.browserAction.setBadgeText({ text: count === 0 ? '' : count < 100 ? count.toString() : '99+' }))
                .catch(e => {
                    if (!e) return;
                    this.pendingQueue.splice(this.pendingQueue.findIndex(item => item.id == feed.id), 1);
                    manager.sendMessageToAllTabs({ type: 'update fail', feedid: feed.id, groupid: feed.group, message: `${e}` });
                    console.error(e);
                    if (e.stack) console.error(e.stack);
                });
        }));
    },
    fetch(url) {
        let timeout = null, abort = null,
            abort_promise = new Promise((resolve, reject) => {
                timeout = () => {
                    reject('请求超时');
                };
                abort = () => {
                    reject();
                };
            }),
            promise = Promise.race([
                fetch(url, { credentials: 'include' }).then(response => {
                    if (response.status >= 200 && response.status < 300) {
                        return Promise.all([response.clone().text(), response.blob()]).then(values => {
                            let [text, blob] = values;
                            return new Promise((resolve, reject) => {
                                let reader = new FileReader(),
                                    charset = blob.type.match(/charset=(.*)/);
                                if (!charset) charset = text.match(/encoding="([^"]*)"/);
                                if (charset && charset[0].toLowerCase() == 'utf-8') resolve(text);
                                reader.onload = e => {
                                    resolve(e.target.result);
                                };
                                reader.onerror = reject;
                                reader.readAsText(blob, charset ? charset[1] : 'utf-8');
                            });
                        });
                    }
                    const error = new Error(response.statusText);
                    error.response = response;
                    throw error;
                }),
                abort_promise
            ]);
        setTimeout(timeout, window.setting.timeout * 1000);
        promise.abort = abort;
        return promise;
    },
    parseFeed(text) {
        return new Promise((resolve, reject) => {
            let dom = null;
            try {
                dom = (new DOMParser()).parseFromString(text, 'text/xml');
            } catch (e) {
                reject(e);
            }
            if (dom && dom.firstElementChild.nodeName != 'parsererror') {
                try {
                    if (dom.children[0].nodeName == 'rss') {
                        resolve(this.rss(dom));
                    } else {
                        resolve(this.atom(dom));
                    }
                } catch (e) {
                    reject(e);
                }
            } else if (dom) {
                reject(dom.firstElementChild.textContent);
            }
        });
    },
    parseCustomFeed(text, feed) {
        return new Promise((resolve, reject) => {
            try {
                let result = {
                    type: 'custom',
                    name: feed.name,
                    link: feed.link,
                    description: '',
                    items: this.transToFeed(this.customParser({ results: text }, feed.steps, feed.results))
                };
                if (result.items.length === 0) reject('格式错误');
                resolve(result);
            }
            catch (e) {
                reject(e);
            }
        });
    },
    rss(dom) {
        let feed = {
            type: 'rss',
            name: dom.querySelector('channel > title').textContent,
            link: dom.querySelector('channel > link').innerHTML,
            description: dom.querySelector('channel > description').textContent,
            items: [],
        };
        let items = dom.querySelectorAll('channel > item');
        for (let item of items) {
            feed.items.push({
                title: item.querySelector('title').textContent,
                link: item.querySelector('link').innerHTML,
                description: (item.getElementsByTagName('content:encoded')[0] || item.querySelector('description')).textContent,
                pubDate: Date.parse(item.querySelector('pubDate').innerHTML),
            });
            let author = item.getElementsByTagName('dc:creator')[0] || item.querySelector('author');
            if (author)
                feed.items[feed.items.length - 1].author = author.textContent;
            let enclosures = item.getElementsByTagName('enclosure');
            if (enclosures) {
                for (let enclosure of enclosures) {
                    let type = enclosure.getAttribute('type'),
                        url = enclosure.getAttribute('url');
                    if (type && type.toString().indexOf('audio') == 0) {
                        feed.items[feed.items.length - 1].description += `<br /><audio src="${url}">`;
                    }
                    else if (type && type.toString().indexOf('video') == 0) {
                        feed.items[feed.items.length - 1].description += `<br /><video controls src="${url}"></video>`;
                    }
                    else {
                        let isImage = type && type.toString().indexOf('image') == 0;
                        if (!isImage) {
                            let urlLength = url.length,
                                imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif'];
                            for (let imageExt of imageExts) {
                                if (url.toLowerCase().lastIndexOf('.' + imageExt) == (urlLength - imageExt.length - 1)) {
                                    isImage = true;
                                    break;
                                }
                            }
                        }
                        if (isImage) {
                            feed.items[feed.items.length - 1].description += `<br /><img src="${url}" />`;
                        }
                        else {
                            feed.items[feed.items.length - 1].description += `<br /><div><a href="${url}">File</a></div>`;
                        }
                    }
                }
            }
        }

        return feed;
    },
    atom(dom) {
        let feed = {
            type: 'atom',
            title: dom.querySelector('feed > title').textContent,
            link: dom.querySelector('feed > link').getAttribute('href'),
            description: dom.querySelector('feed > subtitle') && dom.querySelector('feed > subtitle').textContent,
            items: [],
        };
        let items = dom.querySelectorAll('feed > entry');
        for (let item of items) {
            feed.items.push({
                title: item.querySelector('title').textContent,
                link: item.querySelector('link').getAttribute('href'),
                description: (item.querySelector('content') || item.querySelector('summary')).textContent,
                pubDate: Date.parse(item.querySelector('updated').innerHTML),
                author: item.querySelector('author') ? item.querySelector('author').firstElementChild.textContent : null,
            });
        }
        return feed;
    },
    customParser(fatherResults, steps, results) {
        let subSteps = results.subSteps;
        if (subSteps) {
            let output = [],
                thisResults = this.patternParser(steps.regexp, steps.method, steps.isCase, steps.isGlobal, steps.isUnderGlobal, fatherResults, steps.subPattern, steps.repalceExp);
            if (results.type) {
                let result = [];
                if (steps.method == 'match' && steps.resultPattern)
                    thisResults.map(item => result.push(item[steps.resultPattern]));
                else if (steps.method == 'json')
                    thisResults.map(item => result.push(JSON.stringify(item).replace(/(^")|("$)/g, '')));
                else if (steps.method == 'selector')
                    thisResults.map(item => result.push(item.innerHTML.trim()));
                else result = thisResults;
                output.push({ type: results.type, results: result });
            }
            for (let i in subSteps) {
                let otherOutput = this.customParser({
                    method: steps.method,
                    isCase: steps.isCase,
                    isGlobal: steps.isGlobal,
                    results: (steps.isGlobal && steps.method != 'replace') || steps.isUnderGlobal ? thisResults : thisResults[0]
                }, steps.subSteps[i], results.subSteps[i]);
                if (otherOutput.length > output.length) {
                    otherOutput.unshift(...output);
                    output = otherOutput;
                }
                else output.push(...otherOutput);
            }
            return output;
        } else if (results) {
            let output = [];
            for (let i in results) {
                let otherOutput = this.customParser(fatherResults, steps[i], results[i]);
                if (otherOutput.length > output.length) {
                    otherOutput.unshift(...output);
                    output = otherOutput;
                }
                else output.push(...otherOutput);
            }
            return output;
        }
    },
    patternParser(regexp, method, isCase, isGlobal, isUnderGlobal, fatherResults, subPattern, repalceExp) {
        if (!fatherResults) return null;
        let parseResults = [],
            fatherMethod = fatherResults.method,
            results = fatherResults.results;
        if (!isUnderGlobal) results = [results];
        for (let result of results) {
            if (Array.isArray(result)) result = result[subPattern];
            if (!result && result !== '') continue;
            let parseResult;
            switch (method) {
                case 'match':
                case 'replace': {
                    if (fatherMethod == 'json' && typeof fatherMethod != 'string')
                        result = JSON.stringify(result);
                    if (fatherMethod == 'selector') {
                        result = result.innerHTML;
                    }
                    if (Number(result)) result = result.toString();
                    let mode = 'm',
                        subs, matches = [];
                    if (isCase) mode += 'i';
                    if (isGlobal) mode += 'g';
                    let patt = new RegExp(regexp, mode);
                    while (isGlobal && method == 'match' && (subs = patt.exec(result)) !== null) {
                        matches.push(subs);
                    }
                    parseResult = method == 'replace' ? result.replace(patt, repalceExp) : isGlobal ? matches : result.match(patt);
                    break;
                }
                case 'json': {
                    let isJSON = typeof (result) == 'object' && Object.prototype.toString.call(result).toLowerCase() == '[object object]' && !result.length;
                    if (!isJSON) parseResult = JSON.parse(result);
                    else parseResult = result;

                    let propertyNames = regexp.split('.');
                    for (let propertyName of propertyNames)
                        parseResult = parseResult[propertyName];
                    break;
                }
                case 'selector': {
                    let dom;
                    if (fatherMethod == 'json' && typeof fatherMethod != 'string')
                        result = JSON.stringify(result);
                    if (fatherMethod == 'selector') {
                        dom = result;
                    }
                    else {
                        dom = document.createElement('body');
                        dom.innerHTML = result;
                    }
                    try {
                        if (isGlobal) parseResult = dom.querySelectorAll(regexp);
                        else parseResult = dom.querySelector(regexp);
                    } catch (e) {
                        throw e;
                    }
                    break;
                }
            }
            if (!isGlobal || method == 'replace') parseResults.push(parseResult);
            else parseResults = parseResult;
        }
        return parseResults;
    },
    transToFeed(parseResults) {
        let length = parseResults[0].results.length, items = [];
        for (let parseResult of parseResults) {
            if (parseResult.results.length == length) {
                let results = parseResult.results,
                    type = parseResult.type;
                for (let i in results) {
                    if (!items[i]) items[i] = {};
                    if (items[i][type]) {
                        items[i][type] += results[i];
                    }
                    else {
                        items[i][type] = results[i];
                    }
                }
            }
        }
        let today = new Date();
        for (let item of items) {
            item.pubDate = item.pubDate.replace('yy', today.getFullYear()).replace('mm', today.getMonth() + 1).replace('dd', today.getDate());
            if (Number(item.pubDate)) item.pubDate = parseInt(item.pubDate);
            item.pubDate = new Date(item.pubDate).getTime();
            if (!item.pubDate) throw '日期格式不正确，请检查是否前后有空格或换行符。';
            if (!item.link) throw '链接结果字段未定义。';
        }
        return items;
    },
    autoUpdate() {
        this.timer = setInterval(() => {
            manager.sendMessageToAllTabs({ type: 'auto update' });
            this.update('group', '0');
        }, window.setting.frequency * 60 * 1000);
    },
    stopUpdate() {
        clearInterval(this.timer);
        this.timer = null;
    }
};

let database = {
    db: null,
    init() {
        let request = window.indexedDB.open(DB_INFO.DB_NAME, DB_INFO.DB_VERSION);

        request.onerror = e => manager.sendMessageToAllTabs({ type: 'unknown error', errorMessage: 'indexedDB ' + e.target.error.name + ': ' + e.target.error.message });
        request.onsuccess = e => {
            this.db = e.target.result;
            this.getItemsCount('groupid', '0', 'unread').then(count => browser.browserAction.setBadgeText({ text: count === 0 ? '' : count < 100 ? count.toString() : '99+' }));
        };
        request.onupgradeneeded = e => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains(DB_INFO.DB_STORE_NAME.ITEM)) {
                let itemStore = db.createObjectStore(DB_INFO.DB_STORE_NAME.ITEM, { keyPath: 'itemid', autoIncrement: true });
                itemStore.createIndex('pubDate', 'pubDate');
                itemStore.createIndex('feedid', ['feedid', 'pubDate']);
                itemStore.createIndex('groupid', ['groupid', 'pubDate']);
                itemStore.createIndex('link', ['feedid', 'link', 'pubDate']);
                itemStore.createIndex('pubDateWithState', ['state', 'pubDate']);
                itemStore.createIndex('feedidWithState', ['feedid', 'state', 'pubDate']);
                itemStore.createIndex('groupidWithState', ['groupid', 'state', 'pubDate']);
            }
            if (!db.objectStoreNames.contains(DB_INFO.DB_STORE_NAME.FEED)) {
                let feedStore = db.createObjectStore(DB_INFO.DB_STORE_NAME.FEED, { keyPath: 'id' });
                feedStore.createIndex('id', 'id', { unique: true });
                feedStore.createIndex('group', 'group');
            }
            if (!db.objectStoreNames.contains(DB_INFO.DB_STORE_NAME.GROUP)) {
                let groupStore = db.createObjectStore(DB_INFO.DB_STORE_NAME.GROUP, { keyPath: 'id' });
                groupStore.createIndex('id', 'id', { unique: true });
                groupStore.add({
                    id: '0',
                    name: '全部',
                    feeds: []
                });
            }
            if (!db.objectStoreNames.contains(DB_INFO.DB_STORE_NAME.BUTTON)) {
                let buttonStore = db.createObjectStore(DB_INFO.DB_STORE_NAME.BUTTON, { keyPath: 'id' });
                buttonStore.createIndex('id', 'id', { unique: true });
            }
            if (!db.objectStoreNames.contains(DB_INFO.DB_STORE_NAME.COLLECT))
                db.createObjectStore(DB_INFO.DB_STORE_NAME.COLLECT, { keyPath: 'itemid' });
        };
    },
    startStore(name) {
        let transaction = this.db.transaction([name], 'readwrite');
        transaction.onerror = e => manager.sendMessageToAllTabs({ type: 'unknown error', errorMessage: `${e}` });
        return transaction.objectStore(name);
    },
    getGroups(groupid) {
        return new Promise((resolve, reject) => {
            let request = groupid ? this.startStore(DB_INFO.DB_STORE_NAME.GROUP).index('id').openCursor(window.IDBKeyRange.only(groupid)) :
                this.startStore(DB_INFO.DB_STORE_NAME.GROUP).openCursor();
            let groups = [];
            request.onerror = reject;
            request.onsuccess = e => {
                let cursor = e.target.result;
                if (cursor) {
                    groups.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(groups);
                }
            };
        });
    },
    addGroup(group) {
        return new Promise((resolve, reject) => {
            let request = this.startStore(DB_INFO.DB_STORE_NAME.GROUP).add(group);
            request.onerror = reject;
            request.onsuccess = () => this.getGroups('0').then((groups => {
                if (group.id == '0') return;
                groups[0].feeds.findIndex(item => item.id == group.id) == -1 && groups[0].feeds.push({ id: group.id, type: 'group' });
                return this.updateGroup(groups[0]);
            }).bind(this)).then(resolve).catch(reject);
        });
    },
    updateGroup(group) {
        return new Promise((resolve, reject) => {
            let request = this.startStore(DB_INFO.DB_STORE_NAME.GROUP).put(group);
            request.onerror = reject;
            request.onsuccess = resolve;
        });
    },
    deleteGroup(id) {
        return new Promise((resolve, reject) => {
            if (!id) resolve();
            this.getGroups('0').then(groups => {
                let group = groups.pop();
                group.feeds.splice(group.feeds.findIndex(item => item.id == id && item.type == 'group'), 1);
                return this.updateGroup(group);
            }).then(() => this.getGroups(id)).then(groups => {
                let feeds = groups[0].feeds, pArray = Promise.resolve();
                for (let feed of feeds) {
                    pArray = pArray.then(() => this.deleteFeed(feed.id));
                }
                return pArray;
            }).then(() => {
                let itemStore = this.startStore(DB_INFO.DB_STORE_NAME.GROUP),
                    request = itemStore.delete(id);
                request.onerror = reject;
                request.onsuccess = resolve;
            }).catch(reject);
        });
    },
    changeIndexInGroup(id, index1, index2) {
        return new Promise((resolve, reject) => {
            this.getGroups(id).then(groups => {
                let group = groups.pop();
                [group.feeds[index1], group.feeds[index2]] = [group.feeds[index2], group.feeds[index1]];
                return this.updateGroup(group);
            }).then(resolve).catch(reject);
        });
    },
    getFeeds(index, value) {
        return new Promise((resolve, reject) => {
            let request = value && value != '0' ? this.startStore(DB_INFO.DB_STORE_NAME.FEED).index(index).openCursor(window.IDBKeyRange.only(value)) :
                this.startStore(DB_INFO.DB_STORE_NAME.FEED).openCursor();
            let feeds = [];
            request.onerror = reject;
            request.onsuccess = e => {
                let cursor = e.target.result;
                if (cursor) {
                    feeds.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(feeds);
                }
            };
        });
    },
    addFeed(feed) {
        return new Promise((resolve, reject) => {
            let request = this.startStore(DB_INFO.DB_STORE_NAME.FEED).add(feed);
            request.onerror = reject;
            request.onsuccess = () => this.getGroups(feed.group).then((groups => {
                let group = groups.pop();
                group.feeds.findIndex(item => item.id == feed.id) == -1 && group.feeds.push({ id: feed.id, type: 'feed' });
                return this.updateGroup(group);
            }).bind(this)).then(resolve).catch(reject);
        });
    },
    updateFeed(feed) {
        return new Promise((resolve, reject) => {
            this.getFeeds('id', feed.id).then(feeds => {
                let oldFeed = feeds.pop();
                if (oldFeed.group != feed.group) {
                    return this.getGroups(oldFeed.group).then(groups => {
                        let group = groups.pop();
                        group.feeds.splice(group.feeds.findIndex(item => item.id == feed.id && item.type == 'feed'), 1);
                        return this.updateGroup(group);
                    }).then(() => this.getGroups(feed.group)).then(groups => {
                        let group = groups.pop();
                        group.feeds.push({ id: feed.id, type: 'feed' });
                        return this.updateGroup(group);
                    }).then(() => this.getItems('feedid', oldFeed.id)).then(items => {
                        this.updateItems(items, { groupid: feed.group });
                    });
                }
            }).then(() => {
                let request = this.startStore(DB_INFO.DB_STORE_NAME.FEED).put(feed);
                request.onerror = reject;
                request.onsuccess = resolve;
            }).catch(reject);
        });
    },
    deleteFeed(id) {
        return new Promise((resolve, reject) => {
            if (!id) resolve();
            this.getFeeds('id', id).then(feeds => this.getGroups(feeds[0].group)).then(groups => {
                let group = groups.pop();
                group.feeds.splice(group.feeds.findIndex(item => item.id == id && item.type == 'feed'), 1);
                return this.updateGroup(group);
            }).then(() => this.getItems('feedid', id, null, null, null, null, null, true)).then(this.deleteItems.bind(this)).then(() => {
                let itemStore = this.startStore(DB_INFO.DB_STORE_NAME.FEED),
                    request = itemStore.delete(id);
                request.onerror = reject;
                request.onsuccess = resolve;
            }).catch(reject);
        });
    },
    getItems(index, value, startIndex, amount, state, lowerBound, upperBound, onlyKey) {
        return new Promise((resolve, reject) => {
            let DBIndex, keyRange, request, readState = '';
            Array.isArray(value) || (value = [value]);
            if (state && state != 'all') {
                readState = 'WithState';
                value.push(state);
            }
            if (index == 'itemid') {
                request = this.startStore(DB_INFO.DB_STORE_NAME.ITEM).get(parseInt(value));
            } else {
                if (index == 'groupid' && value[0] == '0') {
                    index = 'pubDate';
                    value.shift();
                }
                DBIndex = this.startStore(DB_INFO.DB_STORE_NAME.ITEM).index(index + readState);
                keyRange = window.IDBKeyRange.bound(value.length ? value.concat(lowerBound || 0) : lowerBound || 0, value.length ? value.concat(upperBound || Number.POSITIVE_INFINITY) : upperBound || Number.POSITIVE_INFINITY);
                request = onlyKey ? DBIndex.openKeyCursor(keyRange, 'prev') : DBIndex.openCursor(keyRange, 'prev');
            }

            let items = [],
                skipped = false;
            request.onerror = reject;
            request.onsuccess = e => {
                if (index == 'itemid') {
                    e.target.result ? resolve([e.target.result]) : resolve([]);
                    return;
                }
                if (amount && items.length >= amount) {
                    resolve(items);
                    return;
                }
                let cursor = e.target.result;
                if (cursor) {
                    if (startIndex && !skipped) {
                        skipped = true;
                        cursor.advance(startIndex);
                        return;
                    }
                    items.push(onlyKey ? cursor.primaryKey : cursor.value);
                    cursor.continue();
                } else {
                    resolve(items);
                }
            };
        });
    },
    getItemsCount(index, value, state, lowerBound, upperBound) {
        return new Promise((resolve, reject) => {
            let DBIndex, keyRange, request, readState = '';
            Array.isArray(value) || (value = [value]);
            if (state && state != 'all') {
                readState = 'WithState';
                value.push(state);
            }
            if (index == 'groupid' && value[0] == '0') {
                index = 'pubDate';
                value.shift();
            }
            DBIndex = this.startStore(DB_INFO.DB_STORE_NAME.ITEM).index(index + readState);
            keyRange = window.IDBKeyRange.bound(value.length ? value.concat(lowerBound || 0) : lowerBound || 0, value.length ? value.concat(upperBound || Number.POSITIVE_INFINITY) : upperBound || Number.POSITIVE_INFINITY);
            request = DBIndex.count(keyRange);
            request.onerror = reject;
            request.onsuccess = e => resolve(e.target.result);
        });
    },
    addItems(feed, feedid, groupid) {
        return this.getItems('feedid', feedid).then(results => {
            let newItems = feed.items.filter(item => {
                let index = results.findIndex(result => result.link == item.link && result.title == item.title);
                if (index > -1) results.splice(index, 1);
                else {
                    item.feedid = feedid;
                    item.groupid = groupid;
                    item.state = 'unread';
                }
                return index == -1;
            });
            return newItems.length == 0 ? Promise.resolve() : this.deleteItems(results.map(result => result.itemid)).then(() => new Promise((resolve, reject) => {
                let itemStore = this.startStore(DB_INFO.DB_STORE_NAME.ITEM), count = 0;
                for (let newItem of newItems) {
                    let request = itemStore.add(newItem);
                    request.onerror = reject;
                    request.onsuccess = () => ++count == newItems.length && resolve();
                }
            }));
        });
    },
    updateItems(items, keyValue) {
        return new Promise((resolve, reject) => {
            let itemStore = this.startStore(DB_INFO.DB_STORE_NAME.ITEM),
                count = 0;
            if (!items || items.length === 0) resolve();
            for (let item of items) {
                for (let key in keyValue)
                    item[key] = keyValue[key];
                let request = itemStore.put(item);
                request.onerror = reject;
                request.onsuccess = () => {
                    if (++count == items.length) {
                        resolve(items);
                    }
                };
            }
        });
    },
    deleteItems(keys) {
        return new Promise((resolve, reject) => {
            if (keys.length === 0) resolve();
            let itemStore = this.startStore(DB_INFO.DB_STORE_NAME.ITEM),
                count = 0;
            for (let key of keys) {
                let request = itemStore.delete(key);
                request.onerror = reject;
                request.onsuccess = () => {
                    if (++count == keys.length) {
                        resolve();
                    }
                };
            }
        });
    },
    addToCollect(key) {
        return this.getItems('itemid', key).then(items => this.updateItems(items, { isCollected: true })).then(items => {
            return new Promise((resolve, reject) => {
                items[0].state = 'unread';
                let itemStore = this.startStore(DB_INFO.DB_STORE_NAME.COLLECT),
                    request = itemStore.add(items[0]);
                request.onerror = reject;
                request.onsuccess = resolve;
            });
        });
    },
    deleteFromCollect(key) {
        return this.getItems('itemid', key).then(items => this.updateItems(items, { isCollected: false })).then(() => {
            return new Promise((resolve, reject) => {
                let itemStore = this.startStore(DB_INFO.DB_STORE_NAME.COLLECT),
                    request = itemStore.delete(key);
                request.onerror = reject;
                request.onsuccess = resolve;
            });
        });
    },
    getCollectCount() {
        return new Promise((resolve, reject) => {
            let request = this.startStore(DB_INFO.DB_STORE_NAME.COLLECT).count();
            request.onerror = reject;
            request.onsuccess = e => resolve(e.target.result);
        });
    },
    getCollectItems(startIndex, amount) {
        return new Promise((resolve, reject) => {
            let request = this.startStore(DB_INFO.DB_STORE_NAME.COLLECT).openCursor(),
                items = [], skipped = false;
            request.onerror = reject;
            request.onsuccess = e => {
                if (amount && items.length >= amount) {
                    resolve(items);
                    return;
                }
                let cursor = e.target.result;
                if (cursor) {
                    if (startIndex && !skipped) {
                        skipped = true;
                        cursor.advance(startIndex);
                        return;
                    }
                    items.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(items);
                }
            };
        });
    },
    getButtons(buttonid) {
        return new Promise((resolve, reject) => {
            let request = buttonid ? this.startStore(DB_INFO.DB_STORE_NAME.BUTTON).index('id').openCursor(window.IDBKeyRange.only(buttonid)) :
                this.startStore(DB_INFO.DB_STORE_NAME.BUTTON).openCursor();
            let buttons = [];
            request.onerror = reject;
            request.onsuccess = e => {
                let cursor = e.target.result;
                if (cursor) {
                    buttons.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(buttons);
                }
            };
        });
    },
    addButton(button, applyFeeds) {
        return new Promise((resolve, reject) => {
            let request = this.startStore(DB_INFO.DB_STORE_NAME.BUTTON).add(button);
            request.onerror = reject;
            request.onsuccess = () => {
                let pArray = [];
                for (let applyFeed of applyFeeds) {
                    pArray.push(this.getFeeds('id', applyFeed).then(feeds => {
                        let feed = feeds.pop();
                        if (feed.customButtons && feed.customButtons.includes(button.id)) return;
                        feed.customButtons ? feed.customButtons.push(button.id) : feed.customButtons = [button.id];
                        return this.updateFeed(feed);
                    }));
                }
                Promise.all(pArray).then(resolve).catch(reject);
            };
        });
    },
    updateButton(button, applyFeeds) {
        return new Promise((resolve, reject) => {
            let request = this.startStore(DB_INFO.DB_STORE_NAME.BUTTON).put(button);
            request.onerror = reject;
            request.onsuccess = () => {
                let pArray = [];
                this.getFeeds().then(feeds => {
                    for (let feed of feeds) {
                        let change = false;
                        if (feed.customButtons) {
                            let buttonIndex = feed.customButtons.indexOf(button.id),
                                feedIndex = applyFeeds.indexOf(feed.id);
                            if (buttonIndex != -1 && feedIndex == -1) {
                                feed.customButtons.splice(buttonIndex, 1);
                                change = true;
                            }
                            if (buttonIndex == -1 && feedIndex != -1) {
                                feed.customButtons.push(button.id);
                                change = true;
                            }
                        }
                        else {
                            if (applyFeeds.includes(feed.id)) {
                                feed.customButtons = [button.id];
                                change = true;
                            }
                        }
                        change && pArray.push(this.updateFeed(feed));
                    }
                    return Promise.all(pArray);
                }).then(resolve).catch(reject);
            };
        });
    },
    deleteButton(id) {
        return new Promise((resolve, reject) => {
            if (!id) resolve();
            this.getFeeds().then(feeds => {
                let pArray = [];
                feeds.filter(feed => feed.customButtons && feed.customButtons.includes(id)).forEach(feed => {
                    feed.customButtons.splice(feed.customButtons.indexOf(id), 1);
                    pArray.push(this.updateFeed(feed));
                });
                return Promise.all(pArray);
            }).then(() => {
                let itemStore = this.startStore(DB_INFO.DB_STORE_NAME.BUTTON),
                    request = itemStore.delete(id);
                request.onerror = reject;
                request.onsuccess = resolve;
            }).catch(reject);
        });
    },
    clearDataBase() {
        return new Promise(resolve => this.startStore(DB_INFO.DB_STORE_NAME.GROUP).clear().onsuccess = () => resolve())
            .then(() => new Promise(resolve => this.startStore(DB_INFO.DB_STORE_NAME.BUTTON).clear().onsuccess = () => resolve()))
            .then(() => new Promise(resolve => this.startStore(DB_INFO.DB_STORE_NAME.FEED).clear().onsuccess = () => resolve()))
            .then(() => new Promise(resolve => this.startStore(DB_INFO.DB_STORE_NAME.ITEM).clear().onsuccess = () => resolve()))
            .then(() => this.addGroup({ id: '0', name: '全部', feeds: [] }));
    }
};
