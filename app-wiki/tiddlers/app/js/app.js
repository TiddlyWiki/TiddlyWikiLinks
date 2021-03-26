/*\
title: $:/_Scripts/app.js
type: application/javascript
module-type: library

JavaScript for links.tiddlywiki.com static rendering

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var xhr = function() {
	var xhr = new XMLHttpRequest();
	return function(method, url, callback ) {
		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4) {
				callback(xhr.responseText);
			}
		};
		xhr.open(method, url);
		xhr.send();
	};
}();

window.addEventListener('DOMContentLoaded', function(event) {

	var inputSearch = document.getElementById('tid-page-search-input'),
		outputSearch = document.getElementById('tid-page-search-output');	
	inputSearch.addEventListener('focus', function(event) {
		if(outputSearch.hasChildNodes()) {
			showSearchResults();
		}
		// Prefetch the search data if the user focuses the search control
		getSearchData(function(searchData) {});
	});
	inputSearch.addEventListener('input', function(event) {
		getSearchData(function(searchData) {
			performSearch(inputSearch.value,searchData);
		});
	});
	document.addEventListener('click', function(event) {
		if(!outputSearch.contains(event.target) && event.target !== inputSearch) {
			hideSearchResults();
		}
	});

	var searchData;
	function getSearchData(callback) {
		if(searchData) {
			callback(searchData);
		} else {
			xhr('get', '/tiddlers.json', function(data) {
				searchData = JSON.parse(data);
				callback(searchData);
			});
		}
	}

	function performSearch(string,searchData) {
		var matches = findMatches(string,searchData);
		clearSearchResults();
		if(matches) {
			showSearchResults();
			outputSearch.appendChild(dm("p",{text: "WARNING: This is currenly a dumb, literal text search"}));
			if(matches.topicMatches.length > 0) {
				//  Matching topics
				outputSearch.appendChild(dm("h2",{text: "Matching topics"}));
				for(var index=0; index<matches.topicMatches.length; index++) {
					outputSearch.appendChild(dm("div",{
						"class": "tc-richlink tc-richlink-topic",
						children: [
							dm("a",{
								attributes: {href: "/topics/" + matches.topicMatches[index]},
								text: matches.topicMatches[index]
							})
						]
					}));
				}
			}
			if(matches.descriptionMatches.length > 0) {
				// Matching Descriptions
				outputSearch.appendChild(dm("h2",{text: "Matching descriptions"}));
				for(var index=0; index<matches.descriptionMatches.length; index++) {
					outputSearch.appendChild(dm("div",{
						"class": "tc-link-panel",
						children: [
							dm("div",{
								"class": "tc-link-panel-heading",
								children: [
									dm("div",{
										"class": "tc-richlink tc-richlink-url",
										children: [
											dm("a",{
												"class": "tc-richlink-link-info",
												attributes: {href: "/urls/" + matches.descriptionMatches[index]["url-hash"]},
												text: matches.descriptionMatches[index].url
											})
										]
									})
								]
							}),
							dm("div",{
								"class": "tc-link-panel-body",
								text: matches.descriptionMatches[index].text
							})
						]
					}));
				}
			}
			if(matches.urlMatches.length > 0) {
				// Matching URLs
				outputSearch.appendChild(dm("h2",{text: "Matching URLs"}));
				for(var index=0; index<matches.urlMatches.length; index++) {
					outputSearch.appendChild(dm("div",{
						"class": "tc-richlink tc-richlink-url",
						children: [
							dm("a",{
								"class": "tc-richlink-link-info",
								attributes: {
									href: "/urls/" + matches.urlMatches[index]["url-hash"]
								},
								text: matches.urlMatches[index].url
							})
						]
					}));
				}
			}
			if(matches.topicMatches.length === 0 && matches.descriptionMatches.length === 0 && matches.urlMatches.length === 0) {
				// Message if there are no matches
				outputSearch.appendChild(dm("h2",{text: "No matches"}));
			}
		} else {
			hideSearchResults();
		}
	}

	function showSearchResults() {
		outputSearch.removeAttribute("hidden");
	}

	function hideSearchResults() {
		outputSearch.setAttribute("hidden","hidden");
	}

	function clearSearchResults() {
		while(outputSearch.hasChildNodes()) {
			outputSearch.removeChild(outputSearch.firstChild);
		}
	}

	function findMatches(string,searchData) {
		var result = {
			topicMatches: [],
			descriptionMatches: [],
			urlMatches: [],
			urlHashes: {}
		};
		// Clean the string
		string = string.toLowerCase().trim();
		// Check for emtpy search string
		if(!string) {
			return null;
		}
		// Find matches
		for(var index = 0; index<searchData.length; index++) {
			var tiddler = searchData[index],
				tags = parseStringArray(tiddler.tags || "");
			if(tags.indexOf("$:/tags/Link") !== -1) {
				// Check for topic match
				for(var tagIndex=0; tagIndex<tags.length; tagIndex++) {
					var tag = tags[tagIndex].toLowerCase();
					if(tag.substring(0,3) !== "$:/") {
						if(tag.indexOf(string) !== -1 && result.topicMatches.indexOf(tag) === -1) {
							result.topicMatches.push(tag);
						}
					}
				}
				// Check for a description match
				if(tiddler.text.toLowerCase().indexOf(string) !== -1) {
					result.descriptionMatches.push(tiddler);
				}
				// Check for URL match
				if(tiddler.url.toLowerCase().indexOf(string) !== -1 && !result.urlHashes[tiddler["url-hash"]]) {
					result.urlHashes[tiddler["url-hash"]] = true;
					result.urlMatches.push({
						url: tiddler.url,
						"url-hash": tiddler["url-hash"]
					});
				}
			}
		}
		result.topicMatches = result.topicMatches.sort();
		result.urlMatches = result.urlMatches.sort(function(a,b) {
			if(a.url < b.url) {
				return -1
			} else if(a.url > b.url) {
				return +1;
			} else {
				return 0;
			}
		});
		return result;
	}

	// Parse a string array from a bracketted list. For example "OneTiddler [[Another Tiddler]] LastOne"
	function parseStringArray(value, allowDuplicate) {
		if(typeof value === "string") {
			var memberRegExp = /(?:^|[^\S\xA0])(?:\[\[(.*?)\]\])(?=[^\S\xA0]|$)|([\S\xA0]+)/mg,
				results = [], names = {},
				match;
			do {
				match = memberRegExp.exec(value);
				if(match) {
					var item = match[1] || match[2];
					if(item !== undefined && (!Object.prototype.hasOwnProperty(names,item) || allowDuplicate)) {
						results.push(item);
						names[item] = true;
					}
				}
			} while(match);
			return results;
		} else if(isArray(value)) {
			return value;
		} else {
			return null;
		}
	}

	function isArray(value) {
		return Object.prototype.toString.call(value) == "[object Array]";
	}

	/*
	Helper for making DOM elements
		tag: tag name
		options: see below
	Options include:
		namespace: defaults to http://www.w3.org/1999/xhtml
		attributes: hashmap of attribute values
		style: hashmap of styles
		text: text to add as a child node
		children: array of further child nodes
		innerHTML: optional HTML for element
		class: class name(s)
		document: defaults to current document
	*/
	function dm(tag,options) {
		var doc = options.document || document;
		var element = doc.createElementNS(options.namespace || "http://www.w3.org/1999/xhtml",tag);
		if(options["class"]) {
			element.className = options["class"];
		}
		if(options.text) {
			element.appendChild(doc.createTextNode(options.text));
		}
		forEachKey(options.children,function(child) {
			element.appendChild(child);
		});
		if(options.innerHTML) {
			element.innerHTML = options.innerHTML;
		}
		forEachKey(options.attributes,function(attribute,name) {
			element.setAttribute(name,attribute);
		});
		forEachKey(options.style,function(value,name) {
			element.style[name] = value;
		});
		return element;
	};

	function forEachKey(object,callback) {
		if(object) {
			var keys = Object.keys(object);
			for (var f=0, length=keys.length; f<length; f++) {
				var key = keys[f];
				var next = callback(object[key],key,object);
				if(next === false) {
					break;
				}
			}
		}
	}

});


	
})();
	