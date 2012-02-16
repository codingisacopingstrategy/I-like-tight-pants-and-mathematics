$(function() {
    $.fn.reverse = [].reverse;
    var newHtml = ''
    $($(".content.container_7").reverse()).each( function() {
        newHtml += '<div class="container_7">\n';
        $(this).children().reverse().each( function() { newHtml += '<div class="grid_1">' + $(this).html() + '</div>\n\n'  } );
        newHtml += '</div>\n\n<div class="clear"></div>\n\n';
    })

    $(".content.container_7").remove()
    $("#header").after(newHtml)

    // build collection
    // cut into 7
    // format
    // insert

})

// $(this).children().reverse().each( function() { console.log($($(this).find("a")).attr('href') ) } )