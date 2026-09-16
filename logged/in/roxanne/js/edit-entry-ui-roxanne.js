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

bindSquireToolbar({
    toolbar: document.getElementById("squire-toolbar"),
    htmlSource: document.getElementById("squire-html-source"),
    getEditor: function () { return ActiveEditor.squire; },
    getRoot: function () { return ActiveEditor.root; },
    onSave: function () {
        if (typeof ActiveEditor.save === "function") ActiveEditor.save();
    },
    onImage: function () {
        if (typeof window.openAssetPicker === "function") window.openAssetPicker();
    },
    dock: true,
    autoHide: true,
});
