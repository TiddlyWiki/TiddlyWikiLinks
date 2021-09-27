/*
TiddlyWiki Utilities
*/

function extractTiddlersFromWikiFile(text) {
	var results = [];
	// Check if we've got an old-style store area
	const storeAreaMarkerRegExp = /<div id=["']?storeArea['"]?( style=["']?display:none;["']?)?>/gi,
		storeAreaMatch = storeAreaMarkerRegExp.exec(text);
	if(storeAreaMatch) {
		// If so, it's either a classic TiddlyWiki file or an unencrypted TW5 file
		results.push.apply(results,deserializeTiddlyWikiFile(text,storeAreaMarkerRegExp.lastIndex,!!storeAreaMatch[1]));
	}
	// Check for new-style store areas
	var newStoreAreaMarkerRegExp = /<script class="tiddlywiki-tiddler-store" type="([^"]*)">/gi,
		newStoreAreaMatch = newStoreAreaMarkerRegExp.exec(text),
		haveHadNewStoreArea = !!newStoreAreaMatch;
	while(newStoreAreaMatch) {
		results.push.apply(results,deserializeNewStoreArea(text,newStoreAreaMarkerRegExp.lastIndex,newStoreAreaMatch[1]));
		newStoreAreaMatch = newStoreAreaMarkerRegExp.exec(text);
	}
	// Return results
	if(storeAreaMatch || haveHadNewStoreArea) {
		return results;
	} else {
		return null;
	}
}

function deserializeNewStoreArea(text,storeAreaEnd,type,fields) {
	var endOfScriptRegExp = /<\/script>/gi;
	endOfScriptRegExp.lastIndex = storeAreaEnd;
	var match = endOfScriptRegExp.exec(text);
	if(type === "application/json" && match) {
		var scriptContent = text.substring(storeAreaEnd,match.index),
			json = [];
		try {
			json = JSON.parse(scriptContent);
		} catch(e) {
			// Ignore errors
		}
		return json;
	} else {
		return [];
	}
}

function deserializeTiddlyWikiFile(text,storeAreaEnd,isTiddlyWiki5,fields) {
	var results = [],
		endOfDivRegExp = /(<\/div>\s*)/gi,
		startPos = storeAreaEnd,
		defaultType = isTiddlyWiki5 ? undefined : "text/x-tiddlywiki";
	endOfDivRegExp.lastIndex = startPos;
	var match = endOfDivRegExp.exec(text);
	while(match) {
		var endPos = endOfDivRegExp.lastIndex,
			tiddlerFields = parseTiddlerDiv(text.substring(startPos,endPos),fields,{type: defaultType});
		if(!tiddlerFields) {
			break;
		}
		for(const name in tiddlerFields) {
			const value = tiddlerFields[name];
			if(typeof value === "string") {
				tiddlerFields[name] = htmlDecode(value);
			}
		}
		if(tiddlerFields.text !== null) {
			results.push(tiddlerFields);
		}
		startPos = endPos;
		match = endOfDivRegExp.exec(text);
	}
	return results;
}

/*
Utility function to parse an old-style tiddler DIV in a *.tid file. It looks like this:

<div title="Title" creator="JoeBloggs" modifier="JoeBloggs" created="201102111106" modified="201102111310" tags="myTag [[my long tag]]">
<pre>The text of the tiddler (without the expected HTML encoding).
</pre>
</div>

Note that the field attributes are HTML encoded, but that the body of the <PRE> tag is not encoded.

When these tiddler DIVs are encountered within a TiddlyWiki HTML file then the body is encoded in the usual way.
*/
function parseTiddlerDiv(text /* [,fields] */) {
	// Slot together the default results
	var result = {};
	if(arguments.length > 1) {
		for(var f=1; f<arguments.length; f++) {
			var fields = arguments[f];
			for(var t in fields) {
				result[t] = fields[t];		
			}
		}
	}
	// Parse the DIV body
	var startRegExp = /^\s*<div\s+([^>]*)>(\s*<pre>)?/gi,
		endRegExp,
		match = startRegExp.exec(text);
	if(match) {
		// Old-style DIVs don't have the <pre> tag
		if(match[2]) {
			endRegExp = /<\/pre>\s*<\/div>\s*$/gi;
		} else {
			endRegExp = /<\/div>\s*$/gi;
		}
		var endMatch = endRegExp.exec(text);
		if(endMatch) {
			// Extract the text
			result.text = text.substring(match.index + match[0].length,endMatch.index);
			// Process the attributes
			var attrRegExp = /\s*([^=\s]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
				attrMatch;
			do {
				attrMatch = attrRegExp.exec(match[1]);
				if(attrMatch) {
					var name = attrMatch[1];
					var value = attrMatch[2] !== undefined ? attrMatch[2] : attrMatch[3];
					result[name] = value;
				}
			} while(attrMatch);
			return result;
		}
	}
	return undefined;
}

// Parse a string array from a bracketed list. For example "OneTiddler [[Another Tiddler]] LastOne"
function parseStringArray(value, allowDuplicate) {
	if(typeof value === "string") {
		var memberRegExp = /(?:^|[^\S\xA0])(?:\[\[(.*?)\]\])(?=[^\S\xA0]|$)|([\S\xA0]+)/mg,
			results = [], names = {},
			match;
		do {
			match = memberRegExp.exec(value);
			if(match) {
				var item = match[1] || match[2];
				if(item !== undefined && (!(item in names) || allowDuplicate)) {
					results.push(item);
					names[item] = true;
				}
			}
		} while(match);
		return results;
	} else if(Array.isArray(value)) {
		return value;
	} else {
		return null;
	}
}

// Stringify an array of tiddler titles into a list string
function stringifyList(value) {
	if(Array.isArray(value)) {
		var result = new Array(value.length);
		for(var t=0, l=value.length; t<l; t++) {
			var entry = value[t] || "";
			if(entry.indexOf(" ") !== -1) {
				result[t] = "[[" + entry + "]]";
			} else {
				result[t] = entry;
			}
		}
		return result.join(" ");
	} else {
		return value || "";
	}
}

/*
Convert "&amp;" to &, "&nbsp;" to nbsp, "&lt;" to <, "&gt;" to > and "&quot;" to "
*/
function htmlDecode(s) {
	return s.toString().replace(/&lt;/mg,"<").replace(/&nbsp;/mg,"\xA0").replace(/&gt;/mg,">").replace(/&quot;/mg,"\"").replace(/&amp;/mg,"&");
}

exports.extractTiddlersFromWikiFile = extractTiddlersFromWikiFile;
exports.deserializeTiddlyWikiFile = deserializeTiddlyWikiFile;
exports.parseTiddlerDiv = parseTiddlerDiv;
exports.parseStringArray = parseStringArray;
exports.stringifyList = stringifyList;
exports.htmlDecode = htmlDecode;
