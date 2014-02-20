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

