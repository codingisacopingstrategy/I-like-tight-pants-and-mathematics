(function () {
    var textarea = document.getElementById("id_text");
    var surface = document.getElementById("comment-squire");
    var toolbar = document.getElementById("comment-squire-toolbar");
    var form = document.getElementById("reply");
    var linkUrl = document.getElementById("comment-squire-link");
    if (!textarea || !surface || !toolbar || typeof Squire === "undefined") return;

    var initial = textarea.value || "";
    var firstCall = true;
    var editor = new Squire(surface, {
        blockTag: "P",
        sanitizeToDOMFragment: function (html) {
            var container = document.createElement("div");
            if (firstCall) {
                firstCall = false;
                container.innerHTML = initial;
            } else {
                container.innerHTML = html;
            }
            var frag = document.createDocumentFragment();
            while (container.firstChild) frag.appendChild(container.firstChild);
            return frag;
        }
    });

    surface.hidden = false;
    toolbar.hidden = false;
    textarea.classList.add("comment-squire-source");
    textarea.setAttribute("tabindex", "-1");
    textarea.removeAttribute("required");

    function sync() {
        textarea.value = editor.getHTML();
    }
    surface.addEventListener("input", sync);
    if (form) form.addEventListener("submit", sync);

    var formatActions = {
        bold: { tag: "B", on: "bold", off: "removeBold" },
        italic: { tag: "I", on: "italic", off: "removeItalic" }
    };

    function updateActive() {
        Object.keys(formatActions).forEach(function (action) {
            var btn = toolbar.querySelector('[data-action="' + action + '"]');
            if (btn) btn.classList.toggle("active", editor.hasFormat(formatActions[action].tag));
        });
        var linkBtn = toolbar.querySelector('[data-action="link"]');
        if (linkBtn) linkBtn.classList.toggle("active", editor.hasFormat("A"));
    }

    editor.addEventListener("pathChange", updateActive);
    editor.addEventListener("select", updateActive);
    editor.addEventListener("cursor", updateActive);

    function closeLinkPrompt() {
        if (!linkUrl) return;
        linkUrl.hidden = true;
        linkUrl.value = "";
        var linkBtn = toolbar.querySelector('[data-action="link"]');
        if (linkBtn) linkBtn.classList.remove("prompting");
    }

    function applyLink() {
        var url = linkUrl ? linkUrl.value.trim() : "";
        closeLinkPrompt();
        if (url) editor.makeLink(url);
        surface.focus();
    }

    toolbar.addEventListener("mousedown", function (e) {
        if (e.target.closest("input")) return;
        e.preventDefault();
    });

    toolbar.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-action]");
        if (!btn) return;
        var action = btn.dataset.action;
        if (action === "bold" || action === "italic") {
            var fmt = formatActions[action];
            if (editor.hasFormat(fmt.tag)) editor[fmt.off]();
            else editor[fmt.on]();
        } else if (action === "link") {
            if (linkUrl && !linkUrl.hidden) {
                applyLink();
                return;
            }
            if (linkUrl) {
                linkUrl.hidden = false;
                linkUrl.value = "";
                btn.classList.add("prompting");
                linkUrl.focus();
            }
            return;
        } else if (action === "ul") {
            editor.makeUnorderedList();
        } else if (action === "ol") {
            editor.makeOrderedList();
        } else if (action === "quote") {
            editor.increaseQuoteLevel();
        }
        surface.focus();
        updateActive();
    });

    if (linkUrl) {
        linkUrl.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
            } else if (e.key === "Escape") {
                e.preventDefault();
                closeLinkPrompt();
                surface.focus();
            }
        });
    }

    window.commentSquireFocus = function () {
        surface.focus();
    };
})();
