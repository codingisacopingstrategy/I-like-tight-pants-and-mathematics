$.SyntaxHighlighter.init({
'lineNumbers': false,
});

$(function() {
  if ($("#aside").length !== 0) {
    $("div.article").removeClass("suffix_2");
    $("#aside").addClass("grid_2")
    $("div.post").append($("#aside"));
  }
});

