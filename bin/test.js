/*
Run tests on sites/sites.json
*/

const normalizeUrl = require('normalize-url'),
    assert = require('assert').strict;

function runTests() {
    const jsonSites = require("../sites/sites.json"),
		usernames = {},
		urls = {};
    assert(Array.isArray(jsonSites),"JSON object should be an array");
    for(const site of jsonSites) {
        assert(Object.keys(site).sort().join(",") =="name,url","Each array entry should be an object {name:,url:}");
        assert(typeof site.name === "string","Name must be a string");
        assert(site.name.length >= 3 && site.name.length <= 32,"Name must be a string of between 3 and 32 characters");
        assert(/^[a-z][a-z0-9_\-]*$/mg.test(site.name),"Name must start with a lowercase letter and only contain lower case letters, digits, dashes and underscores")
		assert(!(site.name in usernames),"usernames must be unique");
		usernames[site.name] = true;
        assert(typeof site.url === "string","URL must be a string");
        const normalizedUrl = normalizeUrl(site.url).toString();
        assert(normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://"),"URL must be a valid http or https URL");
		assert(!(site.url in urls),"urls must be unique");
		urls[site.url] = true;
    }
}

try {
    runTests();
} catch(e) {
    console.error("Error",e)
    process.exit(1);
}
process.exit(0);