'use strict';

let background,
    itemList = {
        props: ['title'],
        template: '#item-list',
        data: () => ({
            currentPage: 1,
            totalPage: 1,
            readState: '',
            items: [],
            activeNames: '',
            loading: false
        }),
        created: function () {
            if (background) {
                this.readState = background.setting.readState;
            }
        },
        methods: {
            itemParser(items) {
                for (let item of items) {
                    if (item.description)
                        item.description = item.description.replace(/<(a[^>]*)>/g, '<$1 target="_blank">')
                            .replace(/<img[^>]*src=["']([^"']*)["'][^>]*?>/g, '<span class="image-box is-zoomed"><img src="$1"><i class="fa fa-search-plus fa-fw"></i><i class="fa fa-search-minus fa-fw"></i></span>');
                }
                this.items = items;
                this.$nextTick(function () {
                    this.loading = false;
                });
            },
            count(count) {
                this.totalPage = Math.ceil(count / background.setting.itemsPerPage);
                if (this.currentPage > this.totalPage) this.currentPage = 1;
            },
            refresh(page) {
                this.activeNames = '';
                if (sidebarList.active.type == 'collect') {
                    return background.database.getCollectCount().then(count => this.count(count))
                        .then(() => background.database.getCollectItems(((page ? page : this.currentPage) - 1) * background.setting.itemsPerPage, background.setting.itemsPerPage))
                        .then(items => this.itemParser(items)).catch(handleError);
                }
                else {
                    return background.database.getItemsCount(`${sidebarList.active.type}id`, sidebarList.active.id, background.setting.readState)
                        .then(count => this.count(count))
                        .then(() => background.database.getItems(`${sidebarList.active.type}id`, sidebarList.active.id, ((page ? page : this.currentPage) - 1) * background.setting.itemsPerPage, background.setting.itemsPerPage, background.setting.readState))
                        .then(items => this.itemParser(items)).catch(handleError);
                }
            },
            next() {
                if (this.currentPage < this.totalPage) {
                    this.loading = true;
                    this.refresh(++this.currentPage);
                }
            },
            prev() {
                if (this.currentPage > 1) {
                    this.loading = true;
                    this.refresh(--this.currentPage);
                }
            },
            first() {
                this.loading = true;
                this.refresh(this.currentPage = 1);
            },
            last() {
                this.loading = true;
                this.refresh(this.currentPage = this.totalPage);
            },
            update(type = sidebarList.active.type, id = sidebarList.active.id) {
                if (type == 'group') {
                    if (id == '0')
                        Object.values(sidebarList.items).filter(item => item.group).forEach(feed => feed.pending = true);
                    else
                        sidebarList.items[`group-${id}`].feeds.forEach(feed => sidebarList.items[`feed-${feed.id}`].pending = true);
                }
                else
                    sidebarList.items[`feed-${id}`].pending = true;
                background.ajax.update(type, id);
            },
            parseTime(timeString) {
                let time = new Date(timeString);
                if (time.toDateString() === new Date().toDateString())
                    return `${('0' + time.getHours()).slice(-2)}:${('0' + time.getMinutes()).slice(-2)}`;
                else
                    return `${time.getFullYear()}/${time.getMonth() + 1}/${time.getDate()}`;
            },
            readStateChange(state) {
                background.setting.change('readState', this.readState = state);
                this.first();
            },
            readAll() {
                if (this.readState == 'read' || this.items.length === 0) return;
                this.loading = true;
                setReadState(sidebarList.active.type, sidebarList.active.id, true);
            },
            changeReadState(item, event) {
                this.activeNames = '';
                setReadState('item', item.itemid, event.target.checked);
            },
            visitLink(item, forceFront) {
                browser.tabs.create({ url: item.link, active: background.setting.openMode == 'front' || forceFront ? true : false });
                if (item.state == 'unread' && sidebarList.active.type != 'collect')
                    setReadState('item', item.itemid, true);
            },
            openHomePage() {
                browser.tabs.create({ url: sidebarList.items[`feed-${sidebarList.active.id}`].homePage });
            },
            customAction(item, id) {
                try {
                    eval(sidebarList.buttons[id].scripts);
                }
                catch (e) {
                    handleError(e);
                }
            },
            clearErrorMessage() {
                sidebarList.items[`feed-${sidebarList.active.id}`].error = false;
                sidebarList.items[`feed-${sidebarList.active.id}`].errorMessage = null;
            },
            collectItem(item) {
                this.activeNames = [];
                if (item.isCollected) {
                    background.database.deleteFromCollect(item.itemid).catch(handleError);
                    Vue.set(item, 'isCollected', false);
                }
                else {
                    background.database.addToCollect(item.itemid).catch(handleError);
                    Vue.set(item, 'isCollected', true);
                }
                if (sidebarList.active.type == 'collect') this.items.splice(this.items.findIndex(i => i.itemid == item.itemid), 1);
            },
            openDetail(item, event) {
                if (event.target.classList.contains('el-checkbox') || event.target.classList.contains('el-checkbox__input') ||
                    event.target.classList.contains('el-checkbox__inner') || event.target.classList.contains('el-checkbox__original')) return;
                this.$msgbox({
                    title: '查看详情',
                    message: this.$createElement(itemDetail, {
                        props: {
                            item: item
                        }
                    }),
                    customClass: 'detail-box',
                    confirmButtonText: '访问网页',
                    beforeClose: (action, instance, done) => {
                        if (action == 'confirm') {
                            this.visitLink(item, true);
                        }
                        done();
                    }
                });
            }
        },
    },
    addFeed = {
        props: ['title'],
        template: '#add-feed',
        data: () => ({
            ruleForm: {
                id: Date.now().toString(),
                type: '',
                group: '',
                name: '',
                customIcon: '',
                homePage: '',
                link: '',
                subSteps: [{ id: 'root', subSteps: [] }],
                scripts: '',
                applyFeeds: [],
            },
            rules: {
                type: [
                    { required: true, message: '必填', trigger: 'change' }
                ],
                group: [
                    { required: true, message: '必填', trigger: 'change' }
                ],
                name: [
                    { required: true, message: '必填', trigger: 'blur' }
                ],
                homePage: [
                    { type: 'url', message: '请填写正确的url地址', trigger: 'blur' }
                ],
                link: [
                    { type: 'url', required: true, message: '请填写正确的url地址', trigger: 'blur' }
                ],
                scripts: [
                    { required: true, message: '必填', trigger: 'blur' }
                ],
            },
            edit: false,
            types: {
                addGroup: '分组',
                addFeed: '订阅源',
                addCustomFeed: '自定义源',
                addCustomButton: '自定义按钮'
            },
            groups: [],
            feeds: [],
            stepsProps: {
                children: 'subSteps',
                label: 'regexp'
            },
            webContent: '',
            parseResult: '',
            pending: false
        }),
        beforeCreate: function () {
            background.database.getGroups().then(groups => {
                for (let group of groups)
                    this.groups.push({ name: group.name, id: group.id });
            }).catch(handleError);
            background.database.getFeeds().then(feeds => {
                for (let feed of feeds)
                    this.feeds.push({ label: feed.name, key: feed.id });
            }).catch(handleError);
        },
        methods: {
            querySearch(queryString, cb) {
                let icons = iconSet(),
                    results = queryString ? icons.filter(item => item.value.indexOf(queryString.toLowerCase()) === 0) : icons;
                cb(results);
            },
            handleSelect(item) {
                this.ruleForm.customIcon = `built-in:${item.value}`;
            },
            uploadIcon(e) {
                let reader = new FileReader();
                reader.addEventListener('loadend', event => {
                    this.ruleForm.customIcon = (event.target.result);
                });
                reader.readAsDataURL(e.file);
            },
            fetch() {
                let self = this;
                this.pending = true;
                this.$refs.ruleForm.validateField('link', function (e) {
                    if (e) return;
                    background.ajax.fetch(self.ruleForm.link).then(text => {
                        self.webContent = text;
                        self.parseResult = text;
                        self.pending = false;
                    }).catch(e => {
                        self.webContent = '';
                        self.parseResult = `错误信息：${e}`;
                        self.pending = false;
                    });
                });
            },
            checkSteps() {
                let all = Object.values(this.$refs.steps.store.nodesMap),
                    nodes = all.filter(item => item.data.id != 'root'),
                    root = all.find(item => item.data.id == 'root'),
                    results = [];
                for (let node of nodes) {
                    if (!node.data.regexp) {
                        handleError('有部分步骤为空');
                        return false;
                    }
                    if (node.data.isResultItem) {
                        let path = [], result = results, thisStep = root.data.subSteps;
                        while (node && node.data.id != 'root') {
                            path.unshift(node.data.id);
                            node = node.parent;
                        }
                        while (path.length > 0) {
                            let id = path.shift(),
                                index = thisStep.findIndex(item => item.id == id);
                            if (index == -1) continue;
                            if (!result[index]) result[index] = { subSteps: [] };
                            if (path.length > 0) {
                                result = result[index].subSteps;
                                thisStep = thisStep[index].subSteps;
                            }
                            else result[index].type = thisStep[index].resultType;
                        }
                    }
                }
                return results;
            },
            step(createElement, context) {
                return createElement(Object.assign({
                    created: function () {
                        this.ruleForm = context.data;
                        this.node = context.node;
                    }
                }, step));
            },
            submitForm(done) {
                this.$refs.ruleForm.validate(valid => {
                    if (valid) {
                        let ruleForm = this.ruleForm,
                            edit = this.edit,
                            type = ruleForm.type.replace(/(add|Custom)/g, '').toLowerCase(),
                            newItem = {
                                id: ruleForm.id,
                                customIcon: ruleForm.customIcon,
                                name: ruleForm.name
                            };
                        this[ruleForm.type].apply(this, [ruleForm, newItem, edit]).then(() => {
                            if (edit) {
                                done();
                                showMessage('成功修改 ', ruleForm.name);
                            }
                            else {
                                showMessage('成功添加 ', ruleForm.name);
                                showPage('list');
                                mainPanel.$nextTick(function () {
                                    if (type == 'feed') {
                                        this.$refs.child.loading = false;
                                        this.$refs.child.update();
                                    }
                                    if (type == 'button')
                                        this.$refs.child.first();
                                });
                            }
                        });
                        customIcons.addIcons(`${type}-${newItem.id}`, newItem.customIcon);
                    }
                });
            },
            addGroup(ruleForm, newItem, edit) {
                newItem.feeds = edit ? ruleForm.feeds : [];
                let addPromise = edit ? background.database.updateGroup(newItem) : background.database.addGroup(newItem);
                return addPromise.then(() => {
                    newItem.unread = edit ? ruleForm.unread : 0;
                    Vue.set(sidebarList.items, `group-${newItem.id}`, newItem);
                    if (!edit) {
                        sidebarList.active.type = 'group';
                        sidebarList.active.id = newItem.id;
                        sidebarList.order.push({ id: newItem.id, type: 'group' });
                    }
                }).catch(handleError);
            },
            addFeed(ruleForm, newItem, edit, custom) {
                newItem.group = ruleForm.group;
                newItem.homePage = ruleForm.homePage;
                newItem.link = ruleForm.link;
                newItem.type = custom ? 'custom' : 'normal';
                newItem.customButtons = ruleForm.customButtons;
                if (custom) {
                    newItem.steps = ruleForm.subSteps[0].subSteps;
                    newItem.results = this.checkSteps();
                    if (!newItem.results) return Promise.reject('有步骤为空');
                }
                let addPromise = edit ? background.database.updateFeed(newItem) : background.database.addFeed(newItem);
                return addPromise.then(() => {
                    delete newItem.results;
                    newItem.pending = false;
                    newItem.error = false;
                    newItem.errorMessage = null;
                    if (!edit) {
                        newItem.unread = 0;
                        sidebarList.active.type = 'feed';
                        sidebarList.active.id = newItem.id;
                    }
                    else {
                        newItem.unread = ruleForm.unread;
                        if (sidebarList.items[`feed-${newItem.id}`].group != newItem.group) {
                            let oldGroupTag = `group-${sidebarList.items[`feed-${newItem.id}`].group}`;
                            if (oldGroupTag == 'group-0') {
                                sidebarList.order.splice(sidebarList.order.findIndex(item => item.type == 'feed' && item.id == newItem.id), 1);
                            }
                            else {
                                sidebarList.items[oldGroupTag].feeds.splice(sidebarList.items[oldGroupTag].feeds.findIndex(item => item.id == newItem.id), 1);
                            }
                        }
                    }
                    Vue.set(sidebarList.items, `feed-${newItem.id}`, newItem);
                    if (newItem.group == '0') {
                        if (sidebarList.order.findIndex(item => item.type == 'feed' && item.id == newItem.id) == -1)
                            sidebarList.order.push({ id: newItem.id, type: 'feed' });
                    }
                    else
                        if (sidebarList.items[`group-${newItem.group}`].feeds.findIndex(item => item.id == newItem.id) == -1)
                            sidebarList.items[`group-${newItem.group}`].feeds.push({ id: newItem.id, type: 'feed' });
                }).catch(handleError);
            },
            addCustomFeed(ruleForm, newItem, edit) {
                return this.addFeed(ruleForm, newItem, edit, true);
            },
            addCustomButton(ruleForm, newItem, edit) {
                newItem.scripts = ruleForm.scripts;
                let addPromise = edit ? background.database.updateButton(newItem, ruleForm.applyFeeds) : background.database.addButton(newItem, ruleForm.applyFeeds);
                Object.values(sidebarList.items).filter(item => item.group).forEach(feed => {
                    if (feed.customButtons) {
                        let buttonIndex = feed.customButtons.indexOf(newItem.id),
                            feedIndex = ruleForm.applyFeeds.indexOf(feed.id);
                        if (buttonIndex != -1 && feedIndex == -1) {
                            feed.customButtons.splice(buttonIndex, 1);
                        }
                        if (buttonIndex == -1 && feedIndex != -1) {
                            feed.customButtons.push(newItem.id);
                        }
                    }
                    else {
                        ruleForm.applyFeeds.includes(feed.id) && Vue.set(feed, 'customButtons', [newItem.id]);
                    }
                });
                return addPromise.then(() => {
                    if (!edit) {
                        sidebarList.active.type = 'group';
                        sidebarList.active.id = '0';
                    }
                    Vue.set(sidebarList.buttons, newItem.id, newItem);
                });
            },
            resetForm() {
                this.$refs.ruleForm.resetFields();
                this.ruleForm.subSteps = [{ id: 'root', subSteps: [] }];
            }
        }
    },
    arrange = {
        template: '#arrange',
        data: () => ({
            activeName: 'feeds'
        }),
        methods: {
            buttonEdit(button) {
                let applyFeeds = this.getApplyFeeds(button.id),
                    edit = Object.assign({
                        created: function () {
                            this.edit = true;
                            this.ruleForm.id = button.id;
                            this.ruleForm.type = 'addCustomButton';
                            this.ruleForm.name = button.name;
                            this.ruleForm.customIcon = button.customIcon;
                            this.ruleForm.scripts = button.scripts;
                            this.ruleForm.applyFeeds = applyFeeds;
                        }
                    }, addFeed);
                delete edit._Ctor;
                this.$msgbox({
                    title: '编辑自定义按钮',
                    message: this.$createElement(edit),
                    customClass: 'edit-box',
                    showCancelButton: true,
                    closeOnClickModal: false,
                    beforeClose: function (action, instance, done) {
                        if (action == 'confirm')
                            instance.$slots.default[0].componentInstance.submitForm(done);
                        else
                            done();
                    }
                });
            },
            buttonDelete(button) {
                this.$confirm('此操作将永久删除该按钮, 是否继续?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => background.database.deleteButton(button.id)).then(() => {
                    Object.values(sidebarList.items).filter(feed => feed.customButtons && feed.customButtons.includes(button.id))
                        .forEach(feed => feed.customButtons.splice(feed.customButtons.indexOf(button.id), 1));
                    showMessage('成功删除 ', button.name);
                    Vue.delete(sidebarList.buttons, button.id);
                }).catch(handleError);
            },
            listItemEdit(tag) {
                let listItem = sidebarList.items[tag],
                    edit = Object.assign({
                        created: function () {
                            this.edit = true;
                            this.ruleForm.id = listItem.id;
                            this.ruleForm.type = listItem.group ? listItem.type == 'normal' ? 'addFeed' : 'addCustomFeed' : 'addGroup';
                            this.ruleForm.name = listItem.name;
                            this.ruleForm.customIcon = listItem.customIcon;
                            this.ruleForm.homePage = listItem.homePage;
                            this.ruleForm.link = listItem.link;
                            this.ruleForm.group = listItem.group;
                            this.ruleForm.feeds = listItem.feeds;
                            this.ruleForm.subSteps[0].subSteps = listItem.steps;
                            this.ruleForm.unread = listItem.unread;
                            this.ruleForm.customButtons = listItem.customButtons;
                        }
                    }, addFeed);
                delete edit._Ctor;
                this.$msgbox({
                    title: '编辑源/分组',
                    message: this.$createElement(edit),
                    customClass: 'edit-box',
                    showCancelButton: true,
                    closeOnClickModal: false,
                    beforeClose: function (action, instance, done) {
                        if (action == 'confirm')
                            instance.$slots.default[0].componentInstance.submitForm(done);
                        else
                            done();
                    }
                });
            },
            listItemDelete(tag) {
                let listItem = sidebarList.items[tag],
                    type = listItem.group ? 'feed' : 'group';
                this.$confirm(`此操作将永久删除该${type == 'feed' ? '源' : '分组，且该分组的所有源及其数据将同时被删除'}, 是否继续?`, '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => type == 'feed' ? background.database.deleteFeed(listItem.id) : background.database.deleteGroup(listItem.id)).then(() => {
                    if (type == 'feed') {
                        if (listItem.group == '0')
                            sidebarList.order.splice(sidebarList.order.findIndex(item => item.id == listItem.id && item.type == 'feed'), 1);
                        else
                            listItem.group != '0' && sidebarList.items[`group-${listItem.group}`].feeds.splice(sidebarList.items[`group-${listItem.group}`].feeds.findIndex(item => item.id == listItem.id), 1);
                    }
                    else {
                        sidebarList.order.splice(sidebarList.order.findIndex(item => item.id == listItem.id && item.type == 'group'), 1);
                        for (let feed of listItem.feeds)
                            Vue.delete(sidebarList.items, `feed-${feed.id}`);
                    }
                    showMessage('成功删除 ', listItem.name);
                    Vue.delete(sidebarList.items, `${type}-${listItem.id}`);
                }).catch(handleError);
            },
            moveUp(tag, index) {
                this.processing = true;
                if (tag == 'group-0')
                    sidebarList.order.splice(index - 1, 0, sidebarList.order.splice(index, 1).pop());
                else
                    sidebarList.items[tag].feeds.splice(index - 1, 0, sidebarList.items[tag].feeds.splice(index, 1).pop());
                background.database.changeIndexInGroup(tag.split('-').pop(), index, index - 1).catch(handleError);
            },
            moveDown(tag, index) {
                this.processing = true;
                if (tag == 'group-0')
                    sidebarList.order.splice(index + 1, 0, sidebarList.order.splice(index, 1).pop());
                else
                    sidebarList.items[tag].feeds.splice(index + 1, 0, sidebarList.items[tag].feeds.splice(index, 1).pop());
                background.database.changeIndexInGroup(tag.split('-').pop(), index, index + 1).catch(handleError);
            },
            getItemsOfList(listItems) {
                if (listItems) {
                    let items = [];
                    for (let listItem of listItems) {
                        items.push(sidebarList.items[`${listItem.type}-${listItem.id}`]);
                    }
                    return items;
                }
            },
            getAllGroups() {
                let allGroups = {};
                allGroups['group-0'] = sidebarList.order;
                allGroups['group-0'].filter(item => item.type == 'group').forEach(group => {
                    allGroups[`group-${group.id}`] = sidebarList.items[`group-${group.id}`].feeds;
                });
                return allGroups;
            },
            getApplyFeeds(id) {
                return Object.values(sidebarList.items).filter(feed => feed.customButtons && feed.customButtons.includes(id))
                    .map(feed => feed.id);
            }
        }
    },
    setting = {
        props: ['title'],
        template: '#setting',
        data: () => ({
            ruleForm: {
                itemsPerPage: 0,
                timeout: 0,
                isAutoRefresh: false,
                frequency: 0,
                openMode: '',
            },
            rules: {
                itemsPerPage: [
                    { type: 'integer', min: 1, trigger: 'change' }
                ],
                timeout: [
                    { type: 'integer', min: 1, trigger: 'change' }
                ],
                frequency: [
                    { type: 'integer', min: 1, trigger: 'change' }
                ],
            }
        }),
        created: function () {
            this.init();
        },
        methods: {
            init() {
                this.ruleForm.itemsPerPage = background.setting.itemsPerPage;
                this.ruleForm.timeout = background.setting.timeout;
                this.ruleForm.isAutoRefresh = background.setting.isAutoRefresh;
                this.ruleForm.frequency = background.setting.frequency;
                this.ruleForm.openMode = background.setting.openMode;
            },
            importConfig(e) {
                this.clearConfig(true).then(() => {
                    return new Promise((resolve, reject) => {
                        let reader = new FileReader();
                        reader.addEventListener('loadend', event => {
                            let config, pGroupArray = [], pFeedArray = [], pButtonArray = [], pConfigArray = [];
                            try {
                                config = JSON.parse(event.target.result);
                            }
                            catch (e) { reject(e); }
                            let all = config.groups.shift();
                            Object.entries(config.configs).forEach(entry => pConfigArray.push(background.setting.change(entry[0], entry[1])));
                            config.groups.forEach(group => pGroupArray.push(background.database.addGroup(group)));
                            config.feeds.forEach(feed => pFeedArray.push(background.database.addFeed(feed)));
                            config.buttons.forEach(button => pButtonArray.push(background.database.addButton(button, config.feeds.filter(feed => feed.customButtons && feed.customButtons.includes(button.id)).map(feed => feed.id))));
                            background.database.updateGroup(all).then(() => Promise.all(pConfigArray))
                                .then(() => Promise.all(pGroupArray)).then(() => Promise.all(pFeedArray))
                                .then(() => Promise.all(pButtonArray)).then(() => this.init()).then(() => dataInit()).then(resolve).catch(reject);
                        });
                        reader.readAsText(e.file);
                    });
                }).catch(handleError);
            },
            exportConfig() {
                let config = {};
                background.database.getGroups().then(groups => config.groups = groups)
                    .then(() => background.database.getFeeds()).then(feeds => config.feeds = feeds)
                    .then(() => background.database.getButtons()).then(buttons => config.buttons = buttons)
                    .then(() => {
                        config.configs = background.setting;
                        let file = new Blob([JSON.stringify(config)], { type: 'application/json' });
                        browser.downloads.download({
                            url: URL.createObjectURL(file),
                            filename: 'all configs.json',
                            saveAs: true
                        });
                    }).catch(handleError);
            },
            clearConfig(isImport) {
                return this.$confirm('此操作将清除原有所有配置，包括所有源、分组、按钮, 是否继续?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => background.database.clearDataBase()).then(() => background.setting.clear()).then(() => {
                    customIcons.icons = {};
                    sidebarList.order = [];
                    sidebarList.items = {};
                    sidebarList.buttons = {};
                    //sidebarList.totalUnread = 0;
                    !isImport && this.init();
                }).catch(handleError);
            },
            handleChange(key, value) {
                background.setting.change(key, value);
            },
            reset() {
                background.setting.reset().then(() => this.init());
            }
        }
    },
    step = {
        template: '#step-item',
        data: () => ({
            ruleForm: {},
            resultTypes: {
                title: '标题',
                link: '链接',
                pubDate: '时间',
                description: '内容',
                author: '作者'
            },
            rules: {
                regexp: [
                    { required: true, trigger: 'blur' }
                ],
            }
        }),
        methods: {
            handleCommand(command) {
                this[command].apply(this);
            },
            runStep() {
                let path = [], thisNode = this.node, parse = this.parse, form;
                if (mainPanel.$refs.child.ruleForm)
                    form = mainPanel.$refs.child;
                else
                    form = this.$root.$slots.default[0].componentInstance;
                while (thisNode.data.id != 'root') {
                    path.unshift(thisNode.data.id);
                    thisNode = thisNode.parent;
                }
                form.$refs.ruleForm.validateField('link', function (e) {
                    if (e) return;
                    let ruleForm = form.ruleForm,
                        thisStep = ruleForm.subSteps[0],
                        result = form.webContent;
                    form.pending = true;
                    if (!form.webContent)
                        background.ajax.fetch(ruleForm.link).then(text => {
                            form.webContent = result = text;
                            result = parse(path, thisStep, result);
                            form.parseResult = result;
                            form.pending = false;
                        }).catch(e => {
                            form.webContent = '';
                            form.parseResult = `错误信息：${e}`;
                            form.pending = false;
                        });
                    else {
                        result = parse(path, thisStep, result);
                        form.parseResult = result;
                        form.pending = false;
                    }
                });
            },
            setAsResult() {
                this.ruleForm.isResultItem = !this.ruleForm.isResultItem;
                this.ruleForm.isResultItem && (this.ruleForm.resultPattern = '');
                this.ruleForm.isResultItem && (this.ruleForm.resultType = 'title');
            },
            addStep() {
                this.ruleForm.subSteps.push({
                    id: Date.now().toString(),
                    regexp: '',
                    method: 'match',
                    isGlobal: false,
                    isUnderGlobal: this.ruleForm.isUnderGlobal || this.ruleForm.isGlobal && this.ruleForm.method != 'replace',
                    isCase: false,
                    repalceExp: '',
                    subPattern: '',
                    isResultItem: false,
                    resultPattern: '',
                    resultType: 'title',
                    subSteps: []
                });
            },
            insertBrotherStep() {
                let father = this.node.parent.data.subSteps,
                    index = father.findIndex(item => item.id == this.ruleForm.id);
                father.splice(index, 0, {
                    id: Date.now().toString(),
                    regexp: '',
                    method: 'match',
                    isGlobal: false,
                    isUnderGlobal: this.ruleForm.isUnderGlobal,
                    isCase: false,
                    repalceExp: '',
                    subPattern: '',
                    isResultItem: false,
                    resultPattern: '',
                    resultType: 'title',
                    subSteps: []
                });
            },
            insertFatherStep() {
                let father = this.node.parent.data.subSteps,
                    index = father.findIndex(item => item.id == this.ruleForm.id);
                father.splice(index, 1, {
                    id: Date.now().toString(),
                    regexp: '',
                    method: 'match',
                    isGlobal: false,
                    isUnderGlobal: this.ruleForm.isUnderGlobal,
                    isCase: false,
                    repalceExp: '',
                    subPattern: '',
                    isResultItem: false,
                    resultPattern: '',
                    resultType: 'title',
                    subSteps: [this.ruleForm]
                });
            },
            deleteStep() {
                let father = this.node.parent.data.subSteps,
                    child = this.ruleForm.subSteps,
                    index = father.findIndex(item => item.id == this.ruleForm.id);
                father.splice(index, 1);
                child.reverse().forEach(item => father.splice(index, 0, Object.assign({}, item)));
            },
            deleteStepAndChild() {
                let fatherSteps = this.node.parent.data.subSteps;
                fatherSteps.splice(fatherSteps.findIndex(item => item.id == this.ruleForm.id), 1);
            },
            deleteChildStep() {
                this.ruleForm.subSteps = [];
            },
            importSteps(e) {
                let reader = new FileReader();
                reader.addEventListener('loadend', event => {
                    let Allsteps = JSON.parse(event.target.result);
                    this.node.childNodes = [];
                    this.$nextTick(function () {
                        this.ruleForm.subSteps = Allsteps;
                    });
                });
                reader.readAsText(e.file);
            },
            exportSteps() {
                let file = new Blob([JSON.stringify(this.ruleForm.subSteps)], { type: 'application/json' });
                browser.downloads.download({
                    url: URL.createObjectURL(file),
                    filename: 'all steps.json',
                    saveAs: true
                });
            },
            setGlobal(e) {
                if (this.ruleForm.method == 'replace') return;
                let steps = [].concat(this.ruleForm.subSteps),
                    isUnderGlobal = e.target.checked;
                while (steps.length > 0) {
                    let thisStep = steps.shift();
                    thisStep.isUnderGlobal = isUnderGlobal;
                    steps = steps.concat(thisStep.subSteps);
                }
            },
            parse(path, thisStep, result) {
                try {
                    while (path.length > 0) {
                        let fatherResults = {}, id = path.shift();
                        if (thisStep.method) {
                            fatherResults.method = thisStep.method;
                            fatherResults.isCase = thisStep.isCase;
                            fatherResults.isGlobal = thisStep.isGlobal;
                            fatherResults.results = (thisStep.isGlobal && thisStep.method != 'replace') || thisStep.isUnderGlobal ? result : result[0];
                        }
                        else
                            fatherResults.results = result;
                        thisStep = thisStep.subSteps.find(item => item.id == id);
                        result = background.ajax.patternParser(thisStep.regexp, thisStep.method, thisStep.isCase, thisStep.isGlobal, thisStep.isUnderGlobal, fatherResults, thisStep.subPattern, thisStep.repalceExp);
                    }
                }
                catch (e) {
                    handleError(e);
                }
                return result;
            }
        }
    },
    itemDetail = {
        template: '#item-detail',
        props: ['item'],
        mounted: function () {
            this.parseDescription();
        },
        updated: function () {
            this.parseDescription();
        },
        methods: {
            parseDescription() {
                if (!this.$refs.description) return;
                let buttons = this.$refs.description.querySelectorAll('.image-box');
                if (buttons) {
                    for (let button of buttons) {
                        button.firstElementChild.onload = () => {
                            button.classList.remove('is-zoomed');
                            if (button.firstElementChild.height > 300) {
                                button.classList.add('image-button', 'is-zoomed');
                                button.addEventListener('click', () => button.classList.toggle('is-zoomed'));
                            }
                        };
                    }
                }
            }
        }
    };

let sidebarList = new Vue({
    el: '#left-wrapper',
    data: {
        order: [],
        items: {},
        buttons: {},
        active: {
            type: 'group',
            id: '0'
        },
    },
    watch: {
        totalUnread: function () {
            browser.browserAction.setBadgeText({ text: this.unreadParser(this.totalUnread) });
            document.title = this.totalUnread === 0 ? 'Feed Maker' : `有${this.totalUnread}条未读信息 - Feed Maker`;
        }
    },
    computed: {
        totalUnread: function () {
            return Object.values(this.items).filter(item => item.group).reduce((sum, item) => sum += item.unread ? item.unread : 0, 0);
        }
    },
    methods: {
        feedSelect(e) {
            let nodeClicked = e.target.parentNode,
                classList = nodeClicked.parentNode.classList;
            classList.contains('el-submenu__title') && (nodeClicked = nodeClicked.parentNode.parentNode);
            let tag = nodeClicked.__vue__._props.index,
                [type, id] = tag.split('-');
            if (this.active.id == id && this.active.type == type) return;
            sidebarList.active.type = type;
            sidebarList.active.id = id;
            showPage('list');
            mainPanel.$nextTick(function () {
                this.$refs.child.first();
            });
        },
        groupUnread(id) {
            return Object.values(this.items).filter(item => item.group == id).reduce((sum, item) => sum += item.unread ? item.unread : 0, 0);
        },
        unreadParser(count) {
            return count === 0 ? '' : count < 100 ? count.toString() : '99+';
        },
        itemClassParser(id, type) {
            return { 'is-active': this.active.id == id && this.active.type == type };
        },
        add() {
            showPage('add', '添加');
        },
        arrange() {
            showPage('arrange', '');
        },
        setting() {
            showPage('setting', '设置');
        },
        handleSwitching() {
            background.setting.change('openedMenus', this.$refs.list.openedMenus);
        },
        isHas(id, type) {
            let isHas = false;
            Object.values(this.items).filter(item => item.group == id).forEach(item => isHas = item[type] || isHas);
            return isHas;
        }
    }
});
let mainPanel = new Vue({
    el: '#right-wrapper',
    data: {
        currentView: 'list',
        title: '全部'
    },
    components: {
        list: itemList,
        add: addFeed,
        arrange: arrange,
        setting: setting,
    }
});
let customIcons = new Vue({
    el: '#custom-icons',
    data: {
        icons: {},
    },
    methods: {
        addIcons(tag, icon) {
            if (icon && icon.indexOf('built:in') == -1) {
                Vue.set(this.icons, tag, icon);
            }
        }
    },
    computed: {
        iconStyles: function () {
            let styles = '';
            for (let icon in this.icons) {
                if (this.icons[icon].indexOf('built-in:') !== 0)
                    styles += `.${icon}{background-image:url('${this.icons[icon]}')}`;
            }
            return styles;
        }
    }
});

Vue.config.errorHandler = handleError;
window.onerror = handleError;

browser.runtime.onMessage.addListener(handleMessage);
dataInit();

function dataInit() {
    return browser.runtime.getBackgroundPage().then(p => background = p)
        .then(() => background.database.getGroups()).then(groupInitialize)
        .then(() => background.database.getFeeds()).then(feedInitialize)
        .then(() => background.database.getButtons()).then(buttonInitialize).then(() => {
            if (mainPanel.currentView == 'list') {
                mainPanel.$refs.child.first();
                mainPanel.$refs.child.readState = background.setting.readState;
                sidebarList.$refs.list.openedMenus = [].concat(background.setting.openedMenus);
            }
        }).catch(handleError);
}

function groupInitialize(groups) {
    let sidebarListItems = sidebarList.items;
    sidebarList.order = groups.shift().feeds;
    for (let group of groups) {
        group.unread = 0;
        Vue.set(sidebarListItems, `group-${group.id}`, group);
        customIcons.addIcons(`group-${group.id}`, group.customIcon);
    }
}

function feedInitialize(feeds) {
    let sidebarListItems = sidebarList.items;
    for (let feed of feeds) {
        customIcons.addIcons(`feed-${feed.id}`, feed.customIcon);
        feed.unread = 0;
        feed.pending = false;
        feed.error = false;
        feed.errorMessage = null;
        Vue.set(sidebarListItems, `feed-${feed.id}`, feed);
        background.database.getItemsCount('feedid', feed.id, 'unread').then(count => setFeedUnreadCount(feed.id, count));
    }
}

function buttonInitialize(buttons) {
    let siderbarButtons = sidebarList.buttons;
    for (let button of buttons) {
        Vue.set(siderbarButtons, button.id, button);
    }
}

function showMessage(text, name, text2) {
    new Vue().$message({
        message: new Vue().$createElement('p', null, [
            text ? text : '',
            new Vue().$createElement('span', { style: 'color: #20a0ff' }, name ? name : ''),
            text2 ? text2 : '',
        ])
    });
}

function handleError(e) {
    if (e == 'cancel') return;
    new Vue().$notify({
        title: '提示',
        type: 'error',
        message: '出现了未知错误，打开控制台查看。',
        duration: 0
    });
    console.error(e);
}

function handleMessage(request) {
    switch (request.type) {
        case 'auto update':
            Object.values(sidebarList.items).filter(item => item.group).forEach(feed => feed.pending = true);
            break;
        case 'update success': {
            let active = sidebarList.active,
                type = active.type, id = active.id;
            sidebarList.items[`feed-${request.feedid}`].pending = false;
            sidebarList.items[`feed-${request.feedid}`].error = false;
            sidebarList.items[`feed-${request.feedid}`].errorMessage = '';
            background.database.getItemsCount('feedid', request.feedid, 'unread').then(count => {
                setFeedUnreadCount(request.feedid, count);
                if (type == 'group' && (id == request.groupid || id == '0') || type == 'feed' && id == request.feedid && mainPanel.currentView == 'list')
                    mainPanel.$refs.child.refresh();
            });
            break;
        }
        case 'update fail':
            sidebarList.items[`feed-${request.feedid}`].pending = false;
            sidebarList.items[`feed-${request.feedid}`].error = true;
            sidebarList.items[`feed-${request.feedid}`].errorMessage = `错误信息：${request.message}`;
            break;
        case 'unknown error':
            handleError(request.errorMessage);
    }
}

function showPage(type, title) {
    if (type != 'list') {
        sidebarList.active.id = -1;
        sidebarList.active.type = '';
    }
    else title = sidebarList.active.id === '0' ? '全部' : sidebarList.active.id ? sidebarList.items[`${sidebarList.active.type}-${sidebarList.active.id}`].name : '我的收藏';
    mainPanel.currentView = type;
    mainPanel.title = title;
}

function setFeedUnreadCount(id, count, diff) {
    let feed = sidebarList.items[`feed-${id}`];
    if (diff)
        feed.unread += diff;
    else {
        diff = count - feed.unread;
        feed.unread = count;
    }
    return diff;
}

function setReadState(type, id, readState) {
    let items = mainPanel.$refs.child.items, p;
    switch (type) {
        case 'group':
            (id == '0' ? Object.values(sidebarList.items).filter(item => item.group) : sidebarList.items[`group-${id}`].feeds)
                .forEach(feed => setFeedUnreadCount(sidebarList.items[`feed-${feed.id}`].id, 0));
            break;
        case 'feed':
            setFeedUnreadCount(id, 0);
            break;
        case 'item':
            setFeedUnreadCount(items.find(item => item.itemid == id).feedid, null, readState ? -1 : 1);
            if (background.setting.readState != 'all') {
                items.splice(items.findIndex(item => item.itemid == id), 1);
                p = background.database.getItems(`${sidebarList.active.type}id`, sidebarList.active.id, mainPanel.$refs.child.currentPage * background.setting.itemsPerPage, 1, background.setting.readState)
                    .then(item => item[0] && items.push(item[0]));
            }
            else {
                items.find(item => item.itemid == id).state = readState ? 'read' : 'unread';
            }
            break;
    }
    Promise.resolve(p).then(() => background.database.getItems(`${type}id`, id, null, null, readState ? 'unread' : 'read'))
        .then(items => background.database.updateItems(items, { state: readState ? 'read' : 'unread' }))
        .then(() => type != 'item' && mainPanel.$refs.child.refresh()).catch(handleError);
}