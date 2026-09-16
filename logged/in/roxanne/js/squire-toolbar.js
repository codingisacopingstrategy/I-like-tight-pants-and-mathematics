// Shared Squire toolbar: article editor and the public comment form.

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

const SQUIRE_FORMAT = {
    bold:          { tag: "B",   on: "bold",          off: "removeBold" },
    italic:        { tag: "I",   on: "italic",        off: "removeItalic" },
    underline:     { tag: "U",   on: "underline",     off: "removeUnderline" },
    strikethrough: { tag: "S",   on: "strikethrough", off: "removeStrikethrough" },
    subscript:     { tag: "SUB", on: "subscript",     off: "removeSubscript" },
    superscript:   { tag: "SUP", on: "superscript",   off: "removeSuperscript" },
};

function bindSquireToolbar(opts) {
    const toolbar = opts.toolbar;
    const htmlSource = opts.htmlSource || null;
    if (!toolbar) return;

    const getEditor = opts.getEditor;
    const getRoot = opts.getRoot;
    const onSave = opts.onSave || function () {};
    const onImage = opts.onImage;
    const dock = !!opts.dock;
    const autoHide = !!opts.autoHide;

    const htmlBtn = toolbar.querySelector('[data-action="html"]');
    const linkBtn = toolbar.querySelector('[data-action="link"]');
    const linkUrl = toolbar.querySelector(".squire-link-url");
    let sourceMode = false;
    let sourceSession = null;
    let linkPromptOpen = false;
    const linkHighlightName = "squire-link-pending";

    function currentSquire() {
        return getEditor();
    }

    function currentRoot() {
        return getRoot();
    }

    function showToolbar() {
        toolbar.hidden = false;
        toolbar.classList.add("visible");
    }

    function hideToolbar(force) {
        if (!autoHide) return;
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
        } catch (err) {}
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
        if (!dock || !root || !root.parentNode) return;
        root.before(toolbar);
        if (htmlSource) {
            if (sourceMode) root.after(htmlSource);
            else toolbar.after(htmlSource);
        }
    }

    function applySourceIfOpen() {
        if (!sourceMode || !sourceSession) return;
        sourceSession.squire.setHTML(htmlSource.value);
        if (typeof sourceSession.save === "function") sourceSession.save();
        sourceSession.root.hidden = false;
        htmlSource.hidden = true;
        sourceMode = false;
        sourceSession = null;
        if (htmlBtn) htmlBtn.classList.remove("active");
    }

    function discardSourceIfOpen() {
        if (!sourceMode) return;
        if (sourceSession) sourceSession.root.hidden = false;
        if (htmlSource) {
            htmlSource.hidden = true;
            htmlSource.value = "";
        }
        sourceMode = false;
        sourceSession = null;
        if (htmlBtn) htmlBtn.classList.remove("active");
    }

    function updateActiveStates() {
        const editor = currentSquire();
        if (!editor) return;
        for (const [action, fmt] of Object.entries(SQUIRE_FORMAT)) {
            const btn = toolbar.querySelector('[data-action="' + action + '"]');
            if (btn) btn.classList.toggle("active", editor.hasFormat(fmt.tag));
        }
        if (linkBtn) linkBtn.classList.toggle("active", editor.hasFormat("A"));
    }

    if (dock || autoHide) {
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
        document.addEventListener("focusout", function () {
            requestAnimationFrame(function () {
                const next = document.activeElement;
                if (!next) return hideToolbar();
                if (toolbar.contains(next) || (htmlSource && htmlSource.contains(next))) return;
                if (next.closest && next.closest(".asset-picker")) return;
                const root = currentRoot();
                if (root && root.contains(next)) return;
                hideToolbar();
            });
        });
    }

    document.addEventListener("squire-path", updateActiveStates);

    toolbar.addEventListener("mousedown", function (e) {
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

        if (action === "html" && htmlSource) {
            sourceMode = !sourceMode;
            btn.classList.toggle("active", sourceMode);
            if (sourceMode) {
                sourceSession = {
                    squire: editor,
                    root: editorEl,
                    save: onSave,
                };
                try {
                    htmlSource.value = prettyPrintHTML(editor.getHTML());
                } catch (err) {
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
                onSave();
            }
            return;
        }

        if (action === "removeAllFormatting") {
            editor.removeAllFormatting();
            editorEl.focus();
            return;
        }

        if (action === "image") {
            if (typeof onImage === "function") onImage();
            return;
        }

        if (action === "ul") {
            editor.makeUnorderedList();
            editorEl.focus();
            updateActiveStates();
            return;
        }
        if (action === "ol") {
            editor.makeOrderedList();
            editorEl.focus();
            updateActiveStates();
            return;
        }
        if (action === "quote") {
            editor.increaseQuoteLevel();
            editorEl.focus();
            updateActiveStates();
            return;
        }

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

        const fmt = SQUIRE_FORMAT[action];
        if (fmt) {
            if (editor.hasFormat(fmt.tag)) editor[fmt.off]();
            else editor[fmt.on]();
            editorEl.focus();
            updateActiveStates();
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

    const editor = currentSquire();
    if (editor && editor.addEventListener) {
        editor.addEventListener("pathChange", updateActiveStates);
        editor.addEventListener("select", updateActiveStates);
        editor.addEventListener("cursor", updateActiveStates);
    }
}
