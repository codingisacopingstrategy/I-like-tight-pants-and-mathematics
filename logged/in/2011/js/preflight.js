// dependency: underscore
// when running from the server,
// require it from NPM
var _ = _ || require('underscore')._;

var cleanWhiteSpace = function (node, options, replacementDocument) {
    // when running from the server, with jsdom,
    // we need to pass our own document instance
    var document = replacementDocument || document;

    // set-up options
    var indentationLevel = options.indentationLevel || 1;
    var indentationString = options.indentationString || '  ';
    
    
    var inlineTags = ['span', 'em', 'strong', 'b', 'i', 'a', 'code', 'br'];
    var whitespace = function (indentationLevel) {
        output = '';
        for (var i = 0; i < indentationLevel; i++) {
            output += indentationString;
        }
        return output;
    };
    var processNode = function (node) {
        /* Process all child elements of this node. */
        for (var i = 0; i < node.childNodes.length; i++) {
            
            var child = node.childNodes[i];
            
            if (child.nodeType == 3 && !/\S/.test(child.nodeValue)) {
                /* The child element is a text-node, and white-space only.
                 * We remove the element so we can re-format after. */
                node.removeChild(child);
                i--;
            } else if (child.nodeType == 1) {
                /* The child element is a tag. */
               
                /* Process the child element’s children: */
                indentationLevel += 1;
                processNode(child);
                indentationLevel -= 1;
                
                /* Add space before and after the child element: */
                if ( !_.contains(inlineTags, child.nodeName.toLowerCase()) ) {
                    var spaceBefore = document.createTextNode((i === 0 ? '\n' : '') + whitespace(indentationLevel));
                    var spaceAfter = document.createTextNode('\n' + (i === node.childNodes.length - 1 ? whitespace(indentationLevel - 1) : ''));
                    node.insertBefore(spaceBefore, child);
                    node.insertBefore(spaceAfter, child.nextSibling);
                    i += 2;
                }
            }
        }
        return node;
    };
    processNode(node);
    return node;
};

if (typeof exports !== 'undefined') {
    // exports as nodeJS module if appropriate
    exports.cleanWhiteSpace = cleanWhiteSpace;
}
