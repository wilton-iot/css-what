;(function(global){ "use strict";

//regexps
var re_name = /^(?:\\.|[\w\-\u00c0-\uFFFF])+/,
    re_cleanSelector = /\s*([>~+])\s*/g,
    re_nthElement = /^([+\-]?\d*n)?\s*([+\-])?\s*(\d)?$/,
    re_escapedCss = /\\(\d{6}|.)/g,
    re_attr = /^\s*((?:\\.|[\w\u00c0-\uFFFF\-])+)\s*(?:(\S?)=\s*(?:(['"])(.*?)\3|(#?(?:\\.|[\w\u00c0-\uFFFF\-])*)|)|)\s*(i)?\]/; //https://github.com/jquery/sizzle/blob/master/sizzle.js#L374

var actionTypes = {
	__proto__: null,
	"undefined": "exists",
	"":  "equals",
	"~": "element",
	"^": "start",
	"$": "end",
	"*": "any",
	"!": "not",
	"|": "hyphen"
};

var simpleSelectors = {
	__proto__: null,
	">": "child",
	"~": "sibling",
	"+": "adjacent",
	"*": "universal"
};

var namedSelectors = {
	__proto__: null,
	"#": "id",
	".": "class"
};

function unescapeCSS(str){
	//based on http://mathiasbynens.be/notes/css-escapes
	//TODO support short sequences (/\\\d{1,5} /)
	return str.replace(re_escapedCss, function(m, s){
		if(isNaN(s)) return s;
		return String.fromCharCode(parseInt(s, 10));
	});
}

function getClosingPos(selector){
	for(var pos = 1, counter = 1, len = selector.length; counter > 0 && pos < len; pos++){
		if(selector.charAt(pos) === "(") counter++;
		else if(selector.charAt(pos) === ")") counter--;
	}
	return pos;
}

function parse(selector){
	selector = (selector + "").trim().replace(re_cleanSelector, "$1");

	var subselects = [],
	    tokens = [],
	    data, firstChar, name;
	
	function getName(){
		var sub = selector.match(re_name)[0];
		selector = selector.substr(sub.length);
		return unescapeCSS(sub);
	}

	while(selector !== ""){
		if(re_name.test(selector)){
			tokens.push({type: "tag", name: getName().toLowerCase()});
		} else if(/^\s/.test(selector)){
			tokens.push({type: "descendant"});
			selector = selector.trimLeft();
		} else {
			firstChar = selector.charAt(0);
			selector = selector.substr(1);

			if(firstChar in simpleSelectors){
				tokens.push({type: simpleSelectors[firstChar]});
			} else if(firstChar in namedSelectors){
				tokens.push({type: namedSelectors[firstChar], value: getName()});				
			} else if(firstChar === "["){
				data = selector.match(re_attr);
				selector = selector.substr(data[0].length);

				tokens.push({
					type: "attribute",
					name: unescapeCSS(data[1]),
					action: actionTypes[data[2]],
					value: unescapeCSS(data[4] || data[5] || ""),
					ignoreCase: !!data[6]
				});
				
			} else if(firstChar === ":"){
				//if(selector.charAt(0) === ":"){} //TODO pseudo-element
				name = getName();
				data = "";
				
				if(selector.charAt(0) === "("){
					var pos = getClosingPos(selector);
					data = selector.substr(1, pos - 2);
					selector = selector.substr(pos);
				}
				
				tokens.push({type: "pseudo", name: name, data: data});
			} else if(firstChar === ","){
				subselects.push(tokens);
				tokens = [];
			} else {
				//otherwise, the parser needs to throw or it would enter an infinite loop
				throw new Error("Unmatched selector:" + firstChar + selector);
			}
		}
	}
	
	subselects.push(tokens);
	return subselects;
}

if(typeof module !== "undefined" && "exports" in module){
	module.exports = parse;
} else {
	if(typeof define === "function" && define.amd){
		define("CSSwhat", function(){
			return parse;
		});
	}
	global.CSSwhat = parse;
}

})(typeof window === "object" ? window : this);