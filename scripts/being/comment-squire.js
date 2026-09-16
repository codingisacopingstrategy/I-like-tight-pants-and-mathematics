(function () {
    var textarea = document.getElementById("id_text");
    var surface = document.getElementById("comment-squire");
    var toolbar = document.getElementById("comment-squire-toolbar");
    var form = document.getElementById("reply");
    if (!textarea || !surface || !toolbar || typeof Squire === "undefined") return;
    if (typeof bindSquireToolbar !== "function") return;

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
    toolbar.classList.add("visible");
    textarea.classList.add("comment-squire-source");
    textarea.setAttribute("tabindex", "-1");
    textarea.removeAttribute("required");

    function sync() {
        textarea.value = editor.getHTML();
    }
    surface.addEventListener("input", sync);
    if (form) form.addEventListener("submit", sync);

    bindSquireToolbar({
        toolbar: toolbar,
        htmlSource: document.getElementById("comment-squire-html"),
        getEditor: function () { return editor; },
        getRoot: function () { return surface; },
        onSave: sync
    });

    window.commentSquireFocus = function () {
        surface.focus();
    };
})();
