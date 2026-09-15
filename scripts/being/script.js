function commentTextField() {
    return document.getElementById("id_text") || document.getElementById("comment-text");
}

function mtReplyCommentOnClick(parent_id, author) {
    var checkbox = document.getElementById("comment-reply");
    var label = document.getElementById("comment-reply-label");
    var replyBox = document.getElementById("comment-form-reply");
    var parentField = document.getElementById("id_parent");
    var text = commentTextField();
    var form = document.getElementById("reply") || document.getElementById("comments-open");
    var hasParent = parent_id !== "" && parent_id !== null && parent_id !== undefined;

    if (replyBox) {
        replyBox.style.display = hasParent ? "" : "none";
    }

    if (label) {
        label.textContent = "";
        if (hasParent) {
            label.appendChild(document.createTextNode("Replying to "));
            var link = document.createElement("a");
            link.href = "#comment-" + parent_id;
            link.textContent = "comment from " + (author || "");
            label.appendChild(link);
        }
    }

    if (checkbox) {
        checkbox.value = hasParent ? parent_id : "";
        checkbox.checked = hasParent;
    }

    if (parentField) {
        parentField.value = hasParent ? parent_id : "";
    }

    if (form && form.scrollIntoView) {
        form.scrollIntoView({ block: "nearest" });
    }
    if (text) {
        try {
            text.focus();
        } catch (e) {}
    }
}

function mtSetCommentParentID() {
    var checkbox = document.getElementById("comment-reply");
    var parentField = document.getElementById("id_parent");
    if (!parentField) return;
    if (!checkbox) return;
    parentField.value = checkbox.checked ? checkbox.value : "";
}
