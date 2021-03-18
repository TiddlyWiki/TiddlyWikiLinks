/*
Collect TiddlyWiki files containing 
*/

const fs = require("fs"),
	path = require("path"),
	http = require("http"),
	https = require("https"),
	{promisify} = require("util"),
	readFileAsync = promisify(fs.readFile),
	writeFileAsync = promisify(fs.writeFile),
	mkdirAsync = promisify(fs.mkdir),
	fetch = require("node-fetch"),
	{extractTiddlersFromWikiFile,parseStringArray,stringifyList} = require("./tiddlywiki-utils"),
	{ArgParser} = require("./utils");

class App {

	constructor(args) {
		// Parse arguments
		this.args = new ArgParser(args,{
			defaults: {
				"sites": "./sites/sites.json",
				"output-tiddlers": "./app-wiki/tiddlers/sites/tiddlers.json"
			}
		});
	}

	async main() {
		// Collect errors rather than failing on the first
		const errors = [];
		// Get arguments
		const sitesPath = this.args.byName["sites"][0],
			outputTiddlersPath = this.args.byName["output-tiddlers"][0];
		// Retrieve and parse the bill of materials
		const sitesInfo = JSON.parse(await readFileAsync(sitesPath,"utf8"));
		// Collect up the output tiddlers
		const output = [];
		// Go through each entry
		for(const siteInfo of sitesInfo) {
			console.log(siteInfo)
			// Read file
			const contents = await this.getFileContents(siteInfo.url);
			// Collect any errors
			if(contents.error) {
				errors.push({siteInfo: siteInfo, error: contents.error});
			} else {
				// Output a tiddler with information about the source
				output.push({
					title: `$:/config/sites/${siteInfo.name}`,
					name: siteInfo.name,
					url: siteInfo.url,
					text: siteInfo.description,
					tags: "$:/tags/LinkSource"
				})
				// Get the tiddlers from the site
				var tiddlers = extractTiddlersFromWikiFile(contents.text);
				// Collect tiddlers whose title looks like a URL
				for(const fields of tiddlers) {
					const tags = parseStringArray(fields.tags || "");
					if(tags.includes("$:/tags/Link") &&  fields.url && (fields.url.startsWith("https://") || fields.url.startsWith("http://"))) {
						output.push({
							title: `$:/config/links/${siteInfo.name}/${fields.title}`,
							modified: fields.modified,
							created: fields.created,
							text: fields.text,
							url: fields.url,
							tags: stringifyList(tags),
							origin: siteInfo.name
						})
					}
				}
			}
		}
		// Write the output tiddlers
		await mkdirAsync(path.dirname(outputTiddlersPath),{recursive: true});
		await writeFileAsync(outputTiddlersPath,JSON.stringify(output,null,4),"utf8");
	}

	async getFileContents(url) {
		// Retrieve the file contents
		let response, text;
		try {
			response = await fetch(url);
			text = await response.text();
		} catch(e) {
			return {error: e.toString()};
		}
		return {text: text};
	}
}

const app = new App(process.argv.slice(2));

app.main().then(() => {
	process.exit(0);
}).catch(err => {
	console.error(err);
	process.exit(1);
});
