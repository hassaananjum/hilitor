// Original JavaScript code by Chirp Internet: www.chirp.com.au
// Modified by Yanosh Kunsh to include UTF-8 string comparison
// Please acknowledge use of this code by including this header.
// 2/2013 jon: modified regex to display any match, not restricted to word boundaries.

// License at http://www.the-art-of-web.com/copyright.html

(function ( window, factory ) {

  if ( typeof module === "object" && typeof module.exports === "object" ) {
    // Expose a factory as module.exports in loaders that implement the Node
    // module pattern (including browserify).
    // This accentuates the need for a real window in the environment
    // e.g. var jQuery = require("jquery")(window);
    module.exports = function( w ) {
      w = w || window;
      if ( !w.document ) {
        throw new Error("Hilitor requires a window with a document");
      }
      return factory( w.document );
    };
  } else {
    if ( typeof define === "function" && define.amd ) {
      // AMD. Register as a named module.
      define( [], function() {
        return factory(document);
      });
    } else {
        // Browser globals
        window.Hilitor = factory(document);
    }
  }

// Pass this, window may not be defined yet
}(this, function ( document, undefined ) {


function Hilitor(id, tag, options)
{
    var targetNode = document.getElementById(id) || document.body;
    var hiliteTag = tag || "EM";
    var skipTags = new RegExp("^(?:SCRIPT|FORM|INPUT|TEXTAREA|IFRAME|VIDEO|AUDIO)$");
    var colors = ["#ff6", "#a0ffff", "#9f9", "#f99", "#f6f"];
    var wordColor = [];
    var colorIdx = 0;
    var matchRegex = "";
    var openLeft = true;
    var openRight = true;
    options = options || {};
    if (typeof options.onStart !== 'function') {
        options.onStart = function () { /* return FALSE when you want to abort */ };
    }
    if (typeof options.onFinish !== 'function') {
        options.onFinish = function () { /* What you return here is returned by Hilitor.apply() */ return true; };
    }
    if (typeof options.onDoOne !== 'function') {
        options.onDoOne = function (node) { /* return FALSE when you want to skip the highlighting change for this node */ };
    }

    this.setMatchType = function(type)
    {
        switch(type)
        {
        case "left":
            openLeft = false;
            openRight = true;
            break;
        case "right":
            openLeft = true;
            openRight = false;
            break;
        default:
        case "open":
            openLeft = openRight = true;
            break;
        case "complete":
            openLeft = openRight = false;
            break;
        }
    };

    this.setRegex = function (input)
    {
        input = input.replace(/[^\w0-9\\u ]+/, "").replace(/[ ]+/g, "|");
        var re = "(" + input + ")";
        if(!openLeft) re = "\\b" + re;
        if(!openRight) re = re + "\\b";
        matchRegex = new RegExp(re, "i");
    };

    this.getRegex = function ()
    {
        var retval = matchRegex.toString();
        retval = retval.replace(/^\/(\\b)?|(\\b)?\/i$/g, "");
        retval = retval.replace(/\|/g, " ");
        return retval;
    };

    function mergeTextNodes(textNode) {
        if (!textNode || !textNode.parentNode) {
            return textNode;
        }
        var leftSib = textNode;
        var count = 0;
        var node = leftSib;
        while (node && node.nodeType === 3) {
            leftSib = node;
            count++;
            node = node.previousSibling;
        }
        if (count < 2) {
            return leftSib;
        }
        // merge the texts stored by the text nodes, producing a single replacement text node:
        var text = [];
        node = leftSib;
        while (node && node.nodeType === 3) {
            text.push(node.nodeValue);
            node = node.nextSibling;
        }
        node = leftSib;
        node.nodeValue = text.join("");
        var n = node.nextSibling;
        while (n && n.nodeType === 3) {
            node = n.nextSibling;
            n.parentNode.removeChild(n);
            n = node;  
        }
        return leftSib;
    }

    // recursively apply word highlighting
    this.hiliteWords = function (node)
    {
        var i;

        if(!node)
            return;
        if(!matchRegex)
            return;
        if(skipTags.test(node.nodeName))
            return;
        if(node.nodeName === hiliteTag && node.className === "hilitor")
            return;

        if(node.hasChildNodes()) {
            for(i = 0; i < node.childNodes.length; i++) {
                this.hiliteWords(node.childNodes[i]);
            }
        }
        if(node.nodeType === 3) { // NODE_TEXT
            node = mergeTextNodes(node);
            if((nv = node.nodeValue) && (regs = matchRegex.exec(nv))) {
                if (false !== options.onDoOne.call(this, node)) {
                    if(!wordColor[regs[0].toLowerCase()]) {
                        wordColor[regs[0].toLowerCase()] = colors[colorIdx++ % colors.length];
                    }

                    var match = document.createElement(hiliteTag);
                    match.appendChild(document.createTextNode(regs[0]));
                    match.className = "hilitor";
                    match.style.backgroundColor = wordColor[regs[0].toLowerCase()];
                    match.style.fontStyle = "inherit";
                    match.style.color = "#000";

                    var after = node.splitText(regs.index);
                    after.nodeValue = after.nodeValue.substring(regs[0].length);
                    node.parentNode.insertBefore(match, after);
                }
            }
        }
    };

    // remove highlighting
    this.remove = function ()
    {
        var arr = document.getElementsByTagName(hiliteTag);
        while(arr.length && (el = arr[0])) {
            var parent = el.parentNode;
            parent.replaceChild(el.firstChild, el);
            parent.normalize();
        }
    };

    // start highlighting at target node
    this.apply = function (input)
    {
        input = convertCharStr2jEsc(input);
        // always remove all highlight markers which have been done previously
        this.remove();
        if(!input) {
            return false;
        }
        this.setRegex(input);
        var rv = options.onStart.call(this);
        if (rv === false) {
            return rv;
        }
        this.hiliteWords(targetNode);
        return options.onFinish.call(this);
    };
}


function dec2hex4(textString)
{
    var hexequiv = new Array("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F");
    return hexequiv[(textString >> 12) & 0xF] + hexequiv[(textString >> 8) & 0xF]
            + hexequiv[(textString >> 4) & 0xF] + hexequiv[textString & 0xF];
}

function convertCharStr2jEsc(str, cstyle)
{
    // Converts a string of characters to JavaScript escapes
    // str: sequence of Unicode characters
    var highsurrogate = 0;
    var suppCP;
    var pad;
    var n = 0;
    var outputString = '';
    for(var i = 0; i < str.length; i++) {
        var cc = str.charCodeAt(i);
        if(cc < 0 || cc > 0xFFFF) {
            outputString += '!Error in convertCharStr2UTF16: unexpected charCodeAt result, cc=' + cc + '!';
        }
        if(highsurrogate != 0) { // this is a supp char, and cc contains the low surrogate
            if(0xDC00 <= cc && cc <= 0xDFFF) {
                suppCP = 0x10000 + ((highsurrogate - 0xD800) << 10) + (cc - 0xDC00);
                if(cstyle) {
                    pad = suppCP.toString(16);
                    while(pad.length < 8) {
                        pad = '0' + pad;
                    }
                    outputString += '\\U' + pad;
                } else {
                    suppCP -= 0x10000;
                    outputString += '\\u' + dec2hex4(0xD800 | (suppCP >> 10)) + '\\u' + dec2hex4(0xDC00 | (suppCP & 0x3FF));
                }
                highsurrogate = 0;
                continue;
            } else {
                outputString += 'Error in convertCharStr2UTF16: low surrogate expected, cc=' + cc + '!';
                highsurrogate = 0;
            }
        }
        if(0xD800 <= cc && cc <= 0xDBFF) { // start of supplementary character
            highsurrogate = cc;
        } else { // this is a BMP character
            switch(cc)
            {
            case 0:
                outputString += '\\0';
                break;
            case 8:
                outputString += '\\b';
                break;
            case 9:
                outputString += '\\t';
                break;
            case 10:
                outputString += '\\n';
                break;
            case 13:
                outputString += '\\r';
                break;
            case 11:
                outputString += '\\v';
                break;
            case 12:
                outputString += '\\f';
                break;
            case 34:
                outputString += '\\\"';
                break;
            case 39:
                outputString += '\\\'';
                break;
            case 92:
                outputString += '\\\\';
                break;
            default:
                if(cc > 0x1f && cc < 0x7F) {
                    outputString += String.fromCharCode(cc);
                } else {
                    pad = cc.toString(16).toUpperCase();
                    while(pad.length < 4) {
                        pad = '0' + pad;
                    }
                    outputString += '\\u' + pad;
                }
                break;
            }
        }
    }
    return outputString;
}


    return Hilitor;
}));
