Date.prototype.toISOish = function() {
    // like http://stackoverflow.com/questions/2573521/how-do-i-output-an-iso-8601-formatted-string-in-javascript
    // Yet there’s some problem with timezones we do naieve timezones for now.
    function pad(n) { return n < 10 ? '0' + n : n; }
    return this.getFullYear() + '-'
        + pad(this.getMonth() + 1) + '-'
        + pad(this.getDate()) + 'T'
        + pad(this.getHours()) + ':'
        + pad(this.getMinutes()) + ':'
        + pad(this.getSeconds()); // <-- naive | aware --> + '+01:00';
};

var Entry = function() {
    this.slug = $('meta[property="mt:entry_basename"]').attr("content");
    // find properties set in body (user editable)
    this.excerpt =              function(){
                                    /** The Facebook description */
                                   return $('meta[property~="og:description"]').attr("content");
    };
    this.preview_image =        function( ){
                                    /** Actually used for the Facebook preview image*/
                                    return $('meta[property~="og:image"]').attr("content");
                                };
    this.published =            function() {
                                    if ($('[property="mt:entry_status"]').is(':checked')) {
                                        // published:
                                        return true;
                                    } else {
                                        return false;
                                    }
                                };
    this.id =                   function() {
                                    if ($('[property="mt:entry_id"]').length == 0) {
                                        return false;
                                    } else {
                                        return parseInt($('[property="mt:entry_id"]').
                                                attr("content"));
                                    }
                                };
    this.title =                function() {
                                    return $('[property="mt:entry_title"]').
                                            text();
                                };
    this.author =               function() {
                                    return parseInt($('[property="mt:entry_author_id"]').
                                            find("option:selected").
                                                attr('value'));
                                };
    this.created_on =           function() {
                                    return $('[property="dc:created"]').
                                            attr("content");
                                };
    this.modified_on =          function() {
                                    return $('[property="dc:modified"]').
                                            attr("content");
                                };
    this.body =                 function() {
                                    var txt;
                                    if (Aloha.activeEditable) {
                                        txt = cleanWhiteSpace(Aloha.activeEditable.originalObj[0], { indentationLevel : 2 }, document).innerHTML;
                                    } // this has the side-effect of running cleanWhiteSpace on the DOM on the page
                                    else {
                                        txt = $("article").html();
                                    }
                                    // actually, we had moved the aside out of the editor, so we need to add it back in again:
                                    txt += $("#aside").length > 0 ? $("#aside").clone().removeClass("grid_2")[0].outerHTML : "";
                                    return txt;
                                };
};

var Comment = function(el, text) {
    this.el =                   el;
    this.id =                   function() {
                                    if (this.el.attr('property') === 'mt:comment_id') {
                                        return parseInt(this.el.
                                            attr('content'));
                                    }
                                    return false;
                                };
    this.author =               function() {
                                    if (this.el.find('[property="dc:creator"]').length === 0) {
                                        return this.el.find("select option:selected").
                                                text();
                                    }
                                    return this.el.find('[property="dc:creator"]').
                                                text();
                                };
    this.mt_author =            function() {
                                    if (this.el.find("select").length === 0) {
                                        return null;
                                    }
                                    return parseInt(this.el.find("select option:selected").
                                                attr('value'));
                                };

    this.created_on =           function() {
                                    return this.el.find('[property="dc:created"]').
                                            attr("content");
                                };
    this.email =                function() {
                                    return this.el.find('[property="mt:comment_email"]').
                                            attr("content");
                                };
    this.entry =                entry.id;
    this.ip =                   "192.168.0.1";
    this.parent =               function() {
                                    if (this.el.parents(".comments-parent-container").length === 0) {
                                        return null;
                                    };
                                    return new Comment(this.el.parents(".comments-parent-container").first().prev(), "").id();
                                };
    this.text =                 text || function() {
                                    return this.el.find('[property="mt:comment_text"]').
                                        html();
                                };
    this.url =                  function() {
                                    return this.el.find('[property="dc:creator"]').attr('href');
                                };
    this.visible =              true;
    this.resource_uri =         function() {
                                    if (this.id()) {
                                        return "/api/comment/" + this.id() + "/";
                                    }
                                    return "/api/comment/";
                                };
};

Entry.prototype.toHash = Comment.prototype.toHash = function() {
    var result = {};
    for (var property in this) {
    if (this.hasOwnProperty(property))
        if (typeof this[property] == "function") {
            result[property] = this[property]();
        } else {
            result[property] = this[property];
        }
        
    }
    return result;
};

Entry.prototype.makeHash = Comment.prototype.makeHash = function(keys) {
    var result = {};
    for (var i=0; i < keys.length; i++) {
        var property = keys[i];
        if (this.hasOwnProperty(property))
            if (typeof this[property] == "function") {
                result[property] = this[property]();
            } else {
                result[property] = this[property];
            }
    }
    return result;
};

Comment.prototype.update = function(created) {
    if (this.id()) {
        console.log("it is an existing Comment object");
        var postData = this.makeHash(["id", "entry", "author", "mt_author", "created_on", "email", "ip", "parent",
                                      "text", "url", "visible"]);
 
         console.log(JSON.stringify(postData));
         var url = this.resource_uri();
         
         var request = jQuery.ajax({
            url: url,
            type: "PATCH",
            data: JSON.stringify(postData),
            dataType: "json",
            contentType: "application/json",
            processData: false,
            success: function(data) {
                console.log(JSON.stringify(data, null, 2));
                console.log("Succesfully updated Comment nr ");
            },
            error: function(xhr, status, error) {
                console.log("error!");
                console.log(xhr, status, error);
                },
            });
 
    } else {
        console.log("creating a new Comment object");
        console.log("to be implemented");
        
        var postData = this.toHash();
        delete postData.id;
        delete postData.resource_uri;
        delete postData.el;
        
        var url = this.resource_uri();
        
        console.log(JSON.stringify(postData));
        
        var request = jQuery.ajax({
        url: url,
        type: "POST",
        data: JSON.stringify(postData),
        dataType: "json",
        contentType: "application/json",
        processData: false,
        success: function(data, textStatus, jqXHR) {
            var url = jqXHR.getResponseHeader('Location');
            var id = parseInt(/comment\/([0-9]+)\//.exec(url)[1]);
            console.log("Succesfully created Comment " + id);
            console.log(jqXHR.getResponseHeader('Location'));
            created(id);
        },
        error: function(xhr, status, error) {
            console.log("error!");
            console.log(xhr, status, error);
            },
        });
    }
};

Comment.prototype.delete = function() {
    var that = this;
    if (this.id()) {
        $.ajax({
            url: this.resource_uri(),
            type: 'DELETE',
            success: function(result) {
                console.log('deleted', result);
                that.el.remove();
            }
        });
    }
};

var entry;

var smartUpdate = function(jQueryEvent, eventArgument) {
    console.log(jQueryEvent, eventArgument);

    $('[property="dc:modified"]').attr("content", new Date().toISOish() + '+01:00');

    var e = eventArgument.editable;
    if (e.obj.hasClass("entry")) {
        console.log("started updating an Entry object");
        
        var entryId = entry.id();
        
        if (entryId) {
            console.log("it is an existing Entry object");
            
            var postData = entry.makeHash(['author', 'title', 'slug', 'published', 'created_on', 'modified_on',
                                           'excerpt', 'preview_image', 'body'] );
            
            console.log(JSON.stringify(postData));
            
            var request = jQuery.ajax({
                url: "/api/entry/" + entryId + "/",
                type: "PATCH",
                data: JSON.stringify(postData),
                dataType: "json",
                contentType: "application/json",
                processData: false,
                success: function(data) {
                    console.log("Succesfully updated " + entry.title());
                },
                error: function(xhr, status, error) {
                    console.log("error!");
                    console.log(xhr, status, error);
                    },
                });
        } else {
            
            console.log('creating a new entry object');
            
            var postData = entry.toHash();
            
            delete postData.id;
            
            console.log(JSON.stringify(postData));
            
            var request = jQuery.ajax({
                url: "/api/entry/",
                type: "POST",
                data: JSON.stringify(postData),
                dataType: "json",
                contentType: "application/json",
                processData: false,
                success: function(data, textStatus, jqXHR) {
                    console.log("Succesfully created " + entry.title());
                    console.log(jqXHR.getResponseHeader('Location'));
                    // I’m seeing some weird errors which I think are related to the
                    // fact that we’re using a non-standard primary key (`entry_id`)
                    // the url returned by the API doesn’t contain an id
                    // (i.e. /api/entry/None/). So we can’t learn the id.
                    // should reproduce on a smaller model and file a bug.
                    // for now we reload the page when a new post is created.
                    location.reload(true);
                },
                error: function(xhr, status, error) {
                    console.log("error!");
                    console.log(xhr, status, error);
                    },
                });
            
        }
    } else if (e.obj.hasClass("comment-editor")) {
        console.log("started updating a Comment object");
        var comment = new Comment(  e.obj.parents(".comment").first(),
                                cleanWhiteSpace(Aloha.activeEditable.originalObj[0], { indentationLevel : 1 }, document).innerHTML  );
        comment.update();
    }
    
    };

Aloha.ready( function() {
    var $ = Aloha.jQuery;
    entry = new Entry();
    $('article, div.comment-editor').aloha();
    Aloha.bind('aloha-smart-content-changed', smartUpdate);
 });
