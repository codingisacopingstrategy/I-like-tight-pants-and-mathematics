function sanitize(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    const frag = document.createDocumentFragment();
    while (container.firstChild) frag.appendChild(container.firstChild);
    return frag;
}

function createdOnRoot(el) {
    if (!el) return null;
    if (el.classList && el.classList.contains("created-on")) return el;
    return el.closest ? el.closest(".created-on") : el;
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

function fillSelectRange(select, max, selected) {
    if (!select || select.options.length) return;
    const value = pad2(selected || 0);
    for (let i = 0; i < max; i++) {
        const option = document.createElement("option");
        option.value = pad2(i);
        option.textContent = pad2(i);
        if (option.value === value) option.selected = true;
        select.appendChild(option);
    }
}

function ensureTimeSelects(root) {
    if (!root || root.querySelector(".created-on-hour")) return;
    const given = (root.getAttribute("data-time") || "00:00").split(":");
    const hour = document.createElement("select");
    hour.className = "created-on-hour";
    hour.setAttribute("aria-label", "Hour");
    fillSelectRange(hour, 24, given[0]);
    const colon = document.createElement("span");
    colon.className = "created-on-colon";
    colon.setAttribute("aria-hidden", "true");
    colon.textContent = ":";
    const minute = document.createElement("select");
    minute.className = "created-on-minute";
    minute.setAttribute("aria-label", "Minute");
    fillSelectRange(minute, 60, given[1]);
    root.appendChild(hour);
    root.appendChild(colon);
    root.appendChild(minute);
}

function createdOnValue(el) {
    const root = createdOnRoot(el) || el;
    if (!root) return "";
    const date = root.querySelector && root.querySelector('input[type="date"]');
    const hour = root.querySelector && root.querySelector(".created-on-hour");
    const minute = root.querySelector && root.querySelector(".created-on-minute");
    if (date && date.value) {
        const h = (hour && hour.value) || "00";
        const m = (minute && minute.value) || "00";
        return date.value + "T" + h + ":" + m + ":00";
    }
    return root.getAttribute("content") || "";
}

function bindCreatedOnInput(el, save) {
    const root = createdOnRoot(el) || el;
    if (!root || root.dataset.createdBound) return;
    ensureTimeSelects(root);
    root.dataset.createdBound = "1";
    function commit() {
        const iso = createdOnValue(root);
        if (!iso) return;
        root.setAttribute("content", iso);
        save(iso);
    }
    root.querySelectorAll("input[type='date'], select").forEach(function (field) {
        field.addEventListener("change", commit);
    });
}

function fillCreatedOnInput(el, date) {
    const root = createdOnRoot(el);
    if (!root) return;
    const ymd =
        date.getFullYear() +
        "-" +
        pad2(date.getMonth() + 1) +
        "-" +
        pad2(date.getDate());
    const h = pad2(date.getHours());
    const m = pad2(date.getMinutes());
    root.setAttribute("data-time", h + ":" + m);
    ensureTimeSelects(root);
    const dateInput = root.querySelector('input[type="date"]');
    const hour = root.querySelector(".created-on-hour");
    const minute = root.querySelector(".created-on-minute");
    if (dateInput) dateInput.value = ymd;
    if (hour) hour.value = h;
    if (minute) minute.value = m;
    root.setAttribute("content", ymd + "T" + h + ":" + m + ":00");
}

function debounce(fn, delay) {
    let timer;
    function debounced(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    }
    debounced.cancel = function () {
        clearTimeout(timer);
        timer = 0;
    };
    return debounced;
}

const SaveStatus = {
    pending: 0,
    startedAt: 0,
    timer: 0,
    minSpin: 600,
    header() {
        return document.querySelector("header#site");
    },
    begin() {
        const header = this.header();
        if (!header) return;
        clearTimeout(this.timer);
        if (this.pending === 0) this.startedAt = Date.now();
        this.pending += 1;
        header.classList.remove("save-ok", "save-err");
        header.classList.add("save-pending");
    },
    end(ok) {
        const header = this.header();
        if (!header) return;
        this.pending = Math.max(0, this.pending - 1);
        if (this.pending > 0) return;
        const flash = () => {
            header.classList.remove("save-pending");
            header.classList.add(ok ? "save-ok" : "save-err");
            this.timer = setTimeout(() => {
                header.classList.remove("save-ok", "save-err");
            }, 900);
        };
        const wait = Math.max(0, this.minSpin - (Date.now() - this.startedAt));
        clearTimeout(this.timer);
        this.timer = setTimeout(flash, wait);
    },
};

const squireByRoot = new WeakMap();

const ActiveEditor = {
    squire: null,
    root: null,
    save() {},
    cancel() {},
    activate(squire, root, save, cancel) {
        this.squire = squire;
        this.root = root;
        this.save = save || function () {};
        this.cancel = cancel || function () {};
        document.dispatchEvent(new CustomEvent("squire-activate"));
    },
};

function isSquireSurface(el) {
    if (!el) return false;
    if (ActiveEditor.root && (el === ActiveEditor.root || ActiveEditor.root.contains(el))) {
        return true;
    }
    return !!(el.closest && el.closest("#squire-toolbar, #squire-html-source"));
}

document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (e.defaultPrevented) return;
    if (!isSquireSurface(e.target)) return;
    e.preventDefault();
    ActiveEditor.cancel();
});

function attachSquire(root, save) {
    if (!root) return null;
    const existing = squireByRoot.get(root);
    if (existing) return existing;

    const initialHTML = root.innerHTML;
    let firstCall = true;
    const squire = new Squire(root, {
        blockTag: "p",
        sanitizeToDOMFragment: (html) => {
            // Squire's constructor calls setHTML("") which would wipe
            // the server-rendered content. On that first call, return
            // the original DOM content instead.
            if (firstCall) {
                firstCall = false;
                return sanitize(initialHTML);
            }
            return sanitize(html);
        },
    });
    squireByRoot.set(root, squire);

    let savedHTML = squire.getHTML();
    let restoring = false;
    const scheduledSave = debounce(save, 1000);

    function rememberSaved() {
        savedHTML = squire.getHTML();
    }

    function cancel() {
        restoring = true;
        scheduledSave.cancel();
        document.dispatchEvent(new CustomEvent("squire-cancel"));
        squire.setHTML(savedHTML);
        scheduledSave.cancel();
        restoring = false;
        const active = document.activeElement;
        if (active && typeof active.blur === "function") active.blur();
        else root.blur();
    }

    squire.rememberSaved = rememberSaved;
    squire.cancelEdits = cancel;

    root.addEventListener("input", function () {
        if (restoring) return;
        scheduledSave();
    });
    root.addEventListener("focusin", function () {
        ActiveEditor.activate(squire, root, save, cancel);
    });
    squire.addEventListener("pathChange", function () {
        document.dispatchEvent(new CustomEvent("squire-path"));
    });
    squire.addEventListener("select", function () {
        document.dispatchEvent(new CustomEvent("squire-path"));
    });
    squire.addEventListener("cursor", function () {
        document.dispatchEvent(new CustomEvent("squire-path"));
    });
    return squire;
}

function apiWrite(url, options) {
    SaveStatus.begin();
    return fetch(url, options)
        .then((res) => {
            if (!res.ok) {
                throw new Error(String(res.status));
            }
            if (res.status === 204 || (options && options.method === "DELETE")) {
                SaveStatus.end(true);
                return null;
            }
            return res.json().then((data) => {
                SaveStatus.end(true);
                return data;
            });
        })
        .catch((err) => {
            SaveStatus.end(false);
            throw err;
        });
}


// ---- Entry object ----
class Entry {
    constructor() {
        const meta = document.querySelector('meta[property="mt:entry_basename"]');
        this.slug = meta ? meta.getAttribute("content") : '';

        const editorEl = document.querySelector("article > section");
        const save = () => this.update();
        this.editor = attachSquire(editorEl, save);
        ActiveEditor.activate(
            this.editor,
            editorEl,
            save,
            this.editor && this.editor.cancelEdits
        );
        bindCreatedOnInput(
            document.querySelector("h2 [property='dc:created']"),
            (iso) => this.patchFields({ created_on: iso })
        );
    }

    excerpt() {
        const input = document.getElementById("excerpt-input");
        if (input) return input.value;
        const meta = document.querySelector('meta[property~="og:description"]');
        return meta ? meta.content : '';
    }

    preview_image() {
        const input = document.getElementById("thumbnail-input");
        if (input) return input.value;
        const meta = document.querySelector('meta[property~="og:image"]');
        return meta ? meta.content : '';
    }

    custom_css() {
        const input = document.getElementById("custom-css-input");
        return input ? input.value : '';
    }

    rememberMeta() {
        document.querySelectorAll(".meta-field input, .meta-field textarea").forEach((input) => {
            input.dataset.saved = input.value;
            input.dispatchEvent(new Event("input"));
        });
    }

    patchFields(fields) {
        const entryId = this.id();
        if (!entryId) return this.update();
        return apiWrite(`/api/entry/${entryId}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fields),
        });
    }

    published() {
        const btn = document.getElementById("publish-entry");
        if (btn) return btn.dataset.published === "true";
        const article = document.querySelector("article");
        return !!(article && article.dataset.published === "true");
    }

    markPublished() {
        const btn = document.getElementById("publish-entry");
        if (btn) {
            btn.dataset.published = "true";
            btn.textContent = "Save Modifications";
        }
        const article = document.querySelector("article");
        if (article) article.dataset.published = "true";
    }

    publishNow() {
        const btn = document.getElementById("publish-entry");
        const updateAll = !!(document.getElementById("publish-all") || {}).checked;
        if (btn) btn.disabled = true;
        return this.update()
            .then(() => {
                const entryId = this.id();
                if (!entryId) return;
                return apiWrite(`/api/entry/${entryId}/publish/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ update_all: updateAll }),
                });
            })
            .then(() => this.markPublished())
            .catch((err) => console.error(err))
            .then(() => {
                if (btn) btn.disabled = false;
            });
    }

    id() {
        const e = document.querySelector('[property="mt:entry_id"]');
        return e ? parseInt(e.getAttribute("content")) : false;
    }

    title() {
        const e = document.querySelector('[property="mt:entry_title"]');
        return e ? e.textContent : '';
    }

    author() {
        const sel = document.querySelector('select[property="mt:entry_author_id"]');
        return sel ? parseInt(sel.value) : null;
    }

    created_on() {
        return createdOnValue(document.querySelector("h2 [property='dc:created']"));
    }

    modified_on() {
        const meta = document.querySelector('meta[property="dc:modified"]');
        return meta ? meta.getAttribute("content") : '';
    }

    body() {
        return this.editor ? this.editor.getHTML() : '';
    }

    toHash() {
        return {
            author: this.author(),
            title: this.title(),
            slug: this.slug,
            published: this.published(),
            created_on: this.created_on(),
            modified_on: this.modified_on(),
            excerpt: this.excerpt(),
            preview_image: this.preview_image(),
            custom_css: this.custom_css(),
            body: this.body()
        };
    }

    makeHash(keys) {
        const hash = {};
        for (const key of keys) {
            if (typeof this[key] === 'function') hash[key] = this[key]();
            else hash[key] = this[key];
        }
        return hash;
    }

    update() {
        console.log("update called");
        const modifiedEl = document.querySelector('[property="dc:modified"]');
        if (modifiedEl) modifiedEl.setAttribute('content', new Date().toISOString());

        const postData = this.makeHash(['author','title','slug','published','created_on','modified_on','excerpt','preview_image','custom_css','body']);
        postData.body = this.editor.getHTML();
        const entryId = this.id();
        const url = entryId ? `/api/entry/${entryId}/` : '/api/entry/';
        const method = entryId ? 'PATCH' : 'POST';
        console.log(postData);
        return apiWrite(url, {
            method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(postData)
        })
        .then(data => {
            console.log(entryId ? 'Updated entry' : 'Created entry', data);
            this.rememberMeta();
            if (this.editor && this.editor.rememberSaved) this.editor.rememberSaved();
            if (!entryId) location.reload(true);
            return data;
        })
        .catch(err => {
            console.error(err);
            throw err;
        });

    }
}

// ---- Comment object ----
const comments = {};

class Comment {
    constructor(el) {
        this.el = el;
        const editorEl = el.querySelector(".comment-editor");
        this.editor = attachSquire(editorEl, () => this.update());
        comments[el.id || ("pending-" + Date.now())] = this;
        bindCreatedOnInput(
            el.querySelector('[property="dc:created"]'),
            () => this.update()
        );
    }

    id() {
        if (this.el.getAttribute('property') === 'mt:comment_id') {
            return parseInt(this.el.getAttribute("content"));
        }
        return null;
    }

    author() {
        const creator = this.el.querySelector('[property="dc:creator"]');
        if (creator) return creator.textContent;
        const sel = this.el.querySelector('select option:checked');
        return sel ? sel.textContent : '';
    }

    mt_author() {
        const sel = this.el.querySelector('select option:checked');
        return sel ? parseInt(sel.value) : null;
    }

    created_on() {
        return createdOnValue(this.el.querySelector('[property="dc:created"]'));
    }

    email() {
        const e = this.el.querySelector('[property="mt:comment_email"]');
        return e ? e.getAttribute('content') : '';
    }

    entry() { return entry.id(); }

    parent() {
        const parentContainer = this.el.closest('.comments-parent-container');
        if (!parentContainer) return null;
        const prevComment = parentContainer.previousElementSibling;
        if (!prevComment || !prevComment.classList.contains("comment")) return null;
        if (prevComment.getAttribute("property") === "mt:comment_id") {
            return parseInt(prevComment.getAttribute("content"), 10);
        }
        return null;
    }

    text() {
        return this.editor ?
            this.editor.getHTML() :
            (this.el.querySelector('[property="mt:comment_text"]')?.innerHTML || '');
    }

    url() {
        const el = this.el.querySelector('[property="dc:creator"]');
        return el ? el.href : '';
    }

    visible() { return true; }

    resource_uri() {
        const id = this.id();
        return id ? `/api/comment/${id}/` : '/api/comment/';
    }

    update(createdCallback) {
        const modifiedEl = document.querySelector('[property="dc:modified"]');
        if (modifiedEl) modifiedEl.setAttribute('content', new Date().toISOString());

        const id = this.id();
        const postData = this.toHash();
        if (id) {
            return apiWrite(this.resource_uri(), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData)
            })
            .then(data => {
                console.log('Updated comment', data);
                if (this.editor && this.editor.rememberSaved) this.editor.rememberSaved();
                return data;
            })
            .catch(err => console.error(err));
        }
        return apiWrite(this.resource_uri(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        })
        .then(data => {
            const id = data.id;
            console.log("Succesfully created Comment " + id);
            console.log(location);
            if (this.editor && this.editor.rememberSaved) this.editor.rememberSaved();
            if (createdCallback) createdCallback(id);
            return data;
        })
        .catch(err => console.error(err));
    }

    delete() {
        const id = this.id();
        if (!id) return;
        apiWrite(this.resource_uri(), { method: 'DELETE' })
            .then(() => this.el.remove())
            .catch(err => console.error(err));
    }

    toHash() {
        let data = {
            id: this.id(),
            entry: this.entry(),
            author: this.author(),
            mt_author: this.mt_author(),
            created_on: this.created_on(),
            email: this.email(),
            ip: '192.168.0.1',
            parent: this.parent(),
            text: this.text(),
            url: this.url(),
            visible: this.visible()
        };
        if (!data.id) delete data.id;
        return data;
    }
}

// ---- Initialize editors ----
let entry = new Entry();

document.querySelectorAll("div.comment").forEach((el) => {
    new Comment(el);
});
