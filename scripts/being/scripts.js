$.SyntaxHighlighter.init({
'lineNumbers': false,
});

$(function() {
  if ($("#aside").length !== 0) {
    $("div.article").removeClass("suffix_2");
    $("#aside").attr("style", "padding-top: 44px;")
    $("#aside").addClass("grid_2")
    $("div.post").append($("#aside"));
  }
  if ($("#aside-left").length !== 0) {
    $("div.article").removeClass("suffix_2");
    $("#aside-left").attr("style", "padding-top: 44px;")
    $("#aside-left").addClass("grid_2")
    $("div.post").prepend($("#aside-left"));
  }
});

