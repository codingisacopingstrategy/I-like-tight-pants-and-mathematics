// <div property="mt:comment_id" content="{{ c.pk }}" id="comment-{{ c.pk }}" resource="/and/{{ e.slug }}#comment-{{ c.pk }}" class="comment{% if c.parent %} comment-reply{% endif %}{% if c.mt_author and c.mt_author.pk in author_ids %} {{ c.mt_author }}{% endif %}">
function newCommentElement() {
    const template = document.createElement('template');
    template.innerHTML = `
<div class="comment bnf">
    <div class="comment-editor" property="mt:comment_text">
        <p>Welcome</p>
    </div>
    <p class="byline" property="mt:comment_email" content="eric@ericschrijver.nl">
        by
        <select>
            <option value="3">glit</option>
            <option value="4">jenseits</option>
            <option value="5">habitus</option>
            <option value="6">tellyou</option>
            <option value="7">baseline</option>
            <option value="8" selected="true">bnf</option>
        </select>- <span class="created-on" property="dc:created" content="" data-time=""><input type="date"></span>
        <br /> <button type="button" title="Reply" href="#reply">Reply</button> <button type="button" href="#delete"><b>×</b></button>
    </p>
</div>
`;

    const el = template.content.firstElementChild;

    fillCreatedOnInput(el.querySelector('[property="dc:created"]'), new Date());

    syncCommentAuthorClass(el);
    const authorSelect = el.querySelector("select");
    if (authorSelect) {
        authorSelect.addEventListener("change", function () {
            syncCommentAuthorClass(el);
        });
    }

    return el;
}

const commentAuthorNames = ["glit", "jenseits", "habitus", "tellyou", "baseline", "bnf"];

function syncCommentAuthorClass(commentEl) {
    const sel = commentEl.querySelector("select");
    commentAuthorNames.forEach(function (name) {
        commentEl.classList.remove(name);
    });
    if (!sel || !sel.selectedOptions.length) return;
    commentEl.classList.add(sel.selectedOptions[0].textContent.trim());
}

/* Handle the insertion of nested comment elements */
document.querySelector(".comments-content").addEventListener("click", function (e) {
    const replyLink = e.target.closest('[href="#reply"]');
    if (!replyLink) return;

    e.preventDefault();

    const el = newCommentElement();
    console.log("adding a comment");

    const parentComment = replyLink.closest(".comment");

    if (parentComment) {
        console.log("not a root level comment");

        let container = parentComment.nextElementSibling;

        if (container && container.classList.contains("comments-parent-container")) {
            console.log("there is already a container for children");
        } else {
            console.log("there is no container for children, adding one");
            container = document.createElement("div");
            container.className = "comments-parent-container";
            parentComment.after(container);
        }

        container.appendChild(el);
    } else {
        console.log("root level comment");
        document.querySelector(".comments-content").appendChild(el);
    }

    const c = new Comment(el);

    console.log(c.created_on());

    c.update(function (id) {
        el.setAttribute("property", "mt:comment_id");
        el.setAttribute("content", id);
        el.id = "comment-" + id;
        comments[el.id] = c;
    });

    const editorEl = el.querySelector(".comment-editor");
    if (editorEl) editorEl.focus();
});

document.querySelector(".comments-content").addEventListener("click", function (e) {
    const deleteLink = e.target.closest('[href="#delete"]');
    if (!deleteLink) return;

    e.preventDefault();

    const parent = deleteLink.closest(".comment");
    const c = comments[parent.id] || new Comment(parent);

    const confirmed = confirm("Delete?");
    if (confirmed) {
        c.delete();
    }
});

function bindMetaField(input, field, metaSelector) {
    if (!input) return;
    input.dataset.saved = input.value;
    const row = input.closest(".meta-field");
    if (!row) return;
    const cancel = row.querySelector(".meta-cancel");
    const save = row.querySelector(".meta-save");

    function dirty() {
        return input.value !== input.dataset.saved;
    }

    function syncButtons() {
        const on = dirty();
        cancel.disabled = !on;
        save.disabled = !on;
    }

    input.addEventListener("input", syncButtons);
    cancel.addEventListener("click", function () {
        input.value = input.dataset.saved;
        syncButtons();
    });
    save.addEventListener("click", function () {
        if (!dirty()) return;
        const value = input.value;
        if (metaSelector) {
            document.querySelectorAll(metaSelector).forEach(function (meta) {
                meta.setAttribute("content", value);
            });
        }
        if (field === "custom_css") {
            let style = document.getElementById("entry-custom-css");
            if (!value) {
                if (style) style.remove();
            } else {
                if (!style) {
                    style = document.createElement("style");
                    style.id = "entry-custom-css";
                    document.head.appendChild(style);
                }
                style.textContent = value;
            }
        }
        entry.patchFields({ [field]: value })
            .then(function () {
                input.dataset.saved = value;
                syncButtons();
            })
            .catch(function (err) {
                console.error(err);
            });
    });
    syncButtons();
}

bindMetaField(
    document.getElementById("excerpt-input"),
    "excerpt",
    'meta[property~="og:description"], meta[name="description"]'
);
bindMetaField(
    document.getElementById("thumbnail-input"),
    "preview_image",
    'meta[property~="og:image"]'
);
bindMetaField(document.getElementById("custom-css-input"), "custom_css");

document.querySelectorAll(".comment select").forEach(function (sel) {
    const commentEl = sel.closest(".comment");
    if (!commentEl) return;
    sel.addEventListener("change", function () {
        syncCommentAuthorClass(commentEl);
    });
});

const publishBtn = document.getElementById("publish-entry");
if (publishBtn) {
    publishBtn.addEventListener("click", function () {
        entry.publishNow();
    });
}

// Pretty-print live Squire HTML for the source textarea only.
// First-level blocks stay flush left; nested structure indents 2 spaces.
function prettyPrintHTML(html) {
    const VOID = {
        AREA: 1, BASE: 1, BR: 1, COL: 1, EMBED: 1, HR: 1, IMG: 1,
        INPUT: 1, LINK: 1, META: 1, PARAM: 1, SOURCE: 1, TRACK: 1, WBR: 1,
    };
    const CONTAINER = {
        ADDRESS: 1, ARTICLE: 1, ASIDE: 1, BLOCKQUOTE: 1, DIV: 1, DL: 1,
        FIELDSET: 1, FIGURE: 1, FOOTER: 1, FORM: 1, HEADER: 1, MAIN: 1,
        NAV: 1, OL: 1, SECTION: 1, TABLE: 1, TBODY: 1, TFOOT: 1, THEAD: 1,
        TR: 1, UL: 1, COLGROUP: 1, SVG: 1, G: 1, DEFS: 1, SYMBOL: 1,
        CLIPPATH: 1, MASK: 1, PATTERN: 1, FILTER: 1, LINEARGRADIENT: 1,
        RADIALGRADIENT: 1, MARKER: 1, FOREIGNOBJECT: 1,
    };
    const BLOCK = Object.assign({
        DD: 1, DT: 1, FIGCAPTION: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1,
        H6: 1, HR: 1, LI: 1, P: 1, PRE: 1, TD: 1, TH: 1,
    }, CONTAINER);

    function isElement(node) {
        return node && node.nodeType === 1;
    }

    function isStructural(el) {
        return !!(el instanceof SVGElement || BLOCK[el.nodeName]);
    }

    function shouldBreak(el) {
        if (el.nodeName === "PRE") return false;
        if (CONTAINER[el.nodeName] || el instanceof SVGElement) {
            return el.children.length > 0;
        }
        return Array.from(el.children).some(isStructural);
    }

    function openingTag(el) {
        const html = el.cloneNode(false).outerHTML;
        const closer = "</" + el.nodeName.toLowerCase() + ">";
        if (html.length >= closer.length &&
            html.slice(-closer.length).toLowerCase() === closer) {
            return html.slice(0, -closer.length);
        }
        return html;
    }

    function pad(depth) {
        return depth > 0 ? "  ".repeat(depth) : "";
    }

    function serializeElement(el, depth, parts) {
        const indent = pad(depth);
        const open = openingTag(el);
        const close = "</" + el.nodeName.toLowerCase() + ">";

        if (VOID[el.nodeName] || (el instanceof SVGElement && !el.hasChildNodes())) {
            parts.push("\n", indent, VOID[el.nodeName] ? open : el.outerHTML);
            return;
        }
        if (!shouldBreak(el)) {
            parts.push("\n", indent, open, el.innerHTML, close);
            return;
        }
        parts.push("\n", indent, open);
        serializeChildren(el, depth + 1, parts);
        parts.push("\n", indent, close);
    }

    function serializeChildren(parent, depth, parts) {
        const indent = pad(depth);
        for (const child of parent.childNodes) {
            if (child.nodeType === 3) {
                const text = child.data.replace(/[ \t\r\n]+/g, " ").trim();
                if (text) parts.push("\n", indent, text);
            } else if (child.nodeType === 8) {
                parts.push("\n", indent, "<!--", child.data, "-->");
            } else if (isElement(child)) {
                serializeElement(child, depth, parts);
            }
        }
    }

    const root = document.createElement("div");
    root.innerHTML = html;
    const parts = [];
    serializeChildren(root, 0, parts);
    return parts.join("").replace(/^\n/, "");
}

// ---- Squire toolbar ----
(function () {
    const toolbar = document.getElementById("squire-toolbar");
    const htmlSource = document.getElementById("squire-html-source");
    if (!toolbar || !htmlSource || typeof ActiveEditor === "undefined") return;

    const htmlBtn = toolbar.querySelector('[data-action="html"]');
    const linkBtn = toolbar.querySelector('[data-action="link"]');
    const linkUrl = document.getElementById("squire-link-url");
    let sourceMode = false;
    let sourceSession = null;
    let linkPromptOpen = false;
    const linkHighlightName = "squire-link-pending";

    function currentSquire() {
        return ActiveEditor.squire;
    }

    function currentRoot() {
        return ActiveEditor.root;
    }

    function saveCurrent() {
        if (typeof ActiveEditor.save === "function") ActiveEditor.save();
    }

    function showToolbar() {
        toolbar.hidden = false;
        toolbar.classList.add("visible");
    }

    function hideToolbar(force) {
        if (!force && sourceMode) return;
        if (!force && typeof window.assetPickerOpen === "function" && window.assetPickerOpen()) return;
        closeLinkPrompt();
        toolbar.classList.remove("visible");
    }

    function clearLinkSelection() {
        if (window.CSS && CSS.highlights) {
            CSS.highlights.delete(linkHighlightName);
        }
        document.querySelectorAll("." + linkHighlightName).forEach(function (el) {
            const parent = el.parentNode;
            if (!parent) return;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
        });
    }

    function paintLinkSelection(range) {
        clearLinkSelection();
        if (!range || range.collapsed) return;
        if (window.CSS && CSS.highlights && typeof Highlight === "function") {
            CSS.highlights.set(linkHighlightName, new Highlight(range.cloneRange()));
            return;
        }
        try {
            const mark = document.createElement("span");
            mark.className = linkHighlightName;
            range.surroundContents(mark);
        } catch (err) {
            // Range splits a non-text node; leave it unpainted.
        }
    }

    function closeLinkPrompt() {
        if (!linkUrl) return;
        linkPromptOpen = false;
        linkUrl.hidden = true;
        linkUrl.value = "";
        if (linkBtn) linkBtn.classList.remove("prompting");
        clearLinkSelection();
    }

    function applyLinkPrompt() {
        const editor = currentSquire();
        const editorEl = currentRoot();
        const url = linkUrl ? linkUrl.value.trim() : "";
        closeLinkPrompt();
        if (editor && url) editor.makeLink(url);
        if (editorEl) editorEl.focus();
    }

    function dockChrome(root) {
        if (!root || !root.parentNode) return;
        root.before(toolbar);
        if (sourceMode) {
            root.after(htmlSource);
        } else {
            toolbar.after(htmlSource);
        }
    }

    function applySourceIfOpen() {
        if (!sourceMode || !sourceSession) return;
        sourceSession.squire.setHTML(htmlSource.value);
        sourceSession.save();
        sourceSession.root.hidden = false;
        htmlSource.hidden = true;
        sourceMode = false;
        sourceSession = null;
        if (htmlBtn) htmlBtn.classList.remove("active");
    }

    function discardSourceIfOpen() {
        if (!sourceMode) return;
        if (sourceSession) sourceSession.root.hidden = false;
        htmlSource.hidden = true;
        htmlSource.value = "";
        sourceMode = false;
        sourceSession = null;
        if (htmlBtn) htmlBtn.classList.remove("active");
    }

    // Format‐tag to Squire method pairs (toggle style)
    const formatActions = {
        bold:           { tag: "B",   on: "bold",         off: "removeBold" },
        italic:         { tag: "I",   on: "italic",       off: "removeItalic" },
        underline:      { tag: "U",   on: "underline",    off: "removeUnderline" },
        strikethrough:  { tag: "S",   on: "strikethrough",off: "removeStrikethrough" },
        subscript:      { tag: "SUB", on: "subscript",    off: "removeSubscript" },
        superscript:    { tag: "SUP", on: "superscript",  off: "removeSuperscript" },
    };

    function updateActiveStates() {
        const editor = currentSquire();
        if (!editor) return;
        for (const [action, fmt] of Object.entries(formatActions)) {
            const btn = toolbar.querySelector(`[data-action="${action}"]`);
            if (btn) {
                btn.classList.toggle("active", editor.hasFormat(fmt.tag));
            }
        }
        const linkBtn = toolbar.querySelector('[data-action="link"]');
        if (linkBtn) {
            linkBtn.classList.toggle("active", editor.hasFormat("A"));
        }
    }

    document.addEventListener("squire-cancel", function () {
        discardSourceIfOpen();
        hideToolbar(true);
    });

    document.addEventListener("squire-activate", function () {
        if (sourceMode && sourceSession && sourceSession.root !== currentRoot()) {
            applySourceIfOpen();
        }
        closeLinkPrompt();
        dockChrome(currentRoot());
        showToolbar();
        updateActiveStates();
    });

    document.addEventListener("squire-path", updateActiveStates);

    document.addEventListener("focusout", function () {
        requestAnimationFrame(function () {
            const next = document.activeElement;
            if (!next) return hideToolbar();
            if (toolbar.contains(next) || htmlSource.contains(next)) return;
            if (next.closest && next.closest(".asset-picker")) return;
            const root = currentRoot();
            if (root && root.contains(next)) return;
            hideToolbar();
        });
    });

    toolbar.addEventListener("mousedown", function (e) {
        // Keep the editor selection unless the user is typing in a field.
        if (e.target.closest("input, textarea")) return;
        e.preventDefault();
    });

    toolbar.addEventListener("click", function (e) {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const editor = currentSquire();
        const editorEl = currentRoot();
        if (!editor || !editorEl) return;

        // HTML source toggle
        if (action === "html") {
            sourceMode = !sourceMode;
            btn.classList.toggle("active", sourceMode);
            if (sourceMode) {
                sourceSession = {
                    squire: editor,
                    root: editorEl,
                    save: ActiveEditor.save,
                };
                try {
                    htmlSource.value = prettyPrintHTML(editor.getHTML());
                } catch (err) {
                    console.error(err);
                    htmlSource.value = editor.getHTML();
                }
                htmlSource.hidden = false;
                editorEl.hidden = true;
                editorEl.after(htmlSource);
                htmlSource.focus();
            } else {
                editor.setHTML(htmlSource.value);
                htmlSource.hidden = true;
                editorEl.hidden = false;
                sourceSession = null;
                editorEl.focus();
                saveCurrent();
            }
            return;
        }

        // Remove all formatting
        if (action === "removeAllFormatting") {
            editor.removeAllFormatting();
            editorEl.focus();
            return;
        }

        if (action === "image") {
            if (typeof window.openAssetPicker === "function") {
                window.openAssetPicker();
            }
            return;
        }

        // Link
        if (action === "link") {
            if (editor.hasFormat("A")) {
                closeLinkPrompt();
                editor.removeLink();
                editorEl.focus();
            } else if (linkPromptOpen) {
                applyLinkPrompt();
            } else if (linkUrl) {
                const selected = (editor.getSelectedText() || "").trim();
                paintLinkSelection(editor.getSelection());
                linkPromptOpen = true;
                linkUrl.hidden = false;
                linkUrl.value = /^(https?:\/\/|mailto:|\/)/i.test(selected) ? selected : "";
                if (linkBtn) linkBtn.classList.add("prompting");
                requestAnimationFrame(function () {
                    linkUrl.focus();
                    linkUrl.select();
                });
            }
            return;
        }

        // Inline format toggles
        const fmt = formatActions[action];
        if (fmt) {
            if (editor.hasFormat(fmt.tag)) {
                editor[fmt.off]();
            } else {
                editor[fmt.on]();
            }
            editorEl.focus();
        }
    });

    if (linkUrl) {
        linkUrl.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                applyLinkPrompt();
            } else if (e.key === "Escape") {
                e.preventDefault();
                closeLinkPrompt();
                const editorEl = currentRoot();
                if (editorEl) editorEl.focus();
            }
        });
    }
})();
