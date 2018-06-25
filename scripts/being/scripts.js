$(function() {
  if ($("#aside").length !== 0) {
    $("div.article").removeClass("suffix_2");
    if (!$("#aside").is("[style]")) {
        $("#aside").attr("style", "padding-top: 44px;");
    }
    $("#aside").addClass("grid_2");
    $("div.post").append($("#aside"));
  }
});


function mtReplyCommentOnClick(parent_id, author) {
    $('#comment-form-reply').show();

    var checkbox = document.getElementById('comment-reply');
    var label = document.getElementById('comment-reply-label');
    var text = document.getElementById('comment-text');

    // Populate label with new values
    var reply_text = 'Replying to \<a href=\"#comment-__PARENT__\" onclick=\"location.href=this.href; return false\"\>comment from __AUTHOR__\<\/a\>';
    reply_text = reply_text.replace(/__PARENT__/, parent_id);
    reply_text = reply_text.replace(/__AUTHOR__/, author);
    label.innerHTML = reply_text;

    checkbox.value = parent_id; 
    checkbox.checked = true;
    try {
        // text field may be hidden
        text.focus();
    } catch(e) {
    }

    mtSetCommentParentID();
}


function mtSetCommentParentID() {
    var checkbox = document.getElementById('comment-reply');
    var parent_id_field = document.getElementById('id_parent');
    if (!checkbox || !parent_id_field) return;

    var pid = null;
    if (checkbox.checked == true)
        pid = checkbox.value;
    parent_id_field.value = pid;
}
