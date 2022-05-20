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
	normalizeUrl = require('normalize-url'),
	{extractTiddlersFromWikiFile,parseStringArray,stringifyList} = require("./tiddlywiki-utils"),
	{ArgParser,hash} = require("./utils"),
	{ parse } = require('csv-parse');
	
/* Create Topics mapping */
const topicsDict = {}

fs.createReadStream('app-wiki/tiddlers/app/system/TopicsMap.txt')
    .pipe(parse({
        comment: '#',
        trim: true,    
    }))
    .on('data', (data) => {
        topicsDict[data[0]]=data[1] ;
    })
    .on('error',(err) => {
        console.log(err)
    })
    .on('end', ()=> {
        console.log("Done!")
        console.log(topicsDict)
    } );

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
		// Collect up the output tiddlers and tags
		const output = [], outputTags = Object.create(null);
		// Go through each entry
		for(const siteInfo of sitesInfo) {
			console.log(siteInfo)
			// Read file
			const contents = await this.getFileContents(siteInfo.url);
			// Collect any errors
			if(contents.error) {
				errors.push({siteInfo: siteInfo, error: contents.error});
			} else {
				// Collect a tiddler with information about the source
				var sourceDescriptionTiddler = {
					title: `Contributor: ${siteInfo.name}`,
					name: siteInfo.name,
					url: siteInfo.url,
					caption: "",
					text: "",
					tags: "$:/tags/Contributor"
				};
				// Get the tiddlers from the site
				var tiddlers = extractTiddlersFromWikiFile(contents.text);
				if(!tiddlers) {
					console.log("Failed to extract tiddlers from",contents.text.slice(0,1000));
				}
				// Look at each tiddler
				for(const fields of tiddlers) {
					const tags = parseStringArray(fields.tags || "");
					// Collect tiddlers with $:/tags/Link and an "url" field that looks like an http:// or https:// URL
					if(tags.includes("$:/tags/Link") &&  fields.url && (fields.url.startsWith("https://") || fields.url.startsWith("http://"))) {
						const normalizedUrl = normalizeUrl(fields.url),
							hashedNormalizedUrl = hash(normalizedUrl),
							filteredTags = tags.map(tag => tag.trim()).filter(tag => tag === "$:/tags/Link" || !tag.startsWith("$:/"))
							.map( tag => {
								if(tag === "$:/tags/Link") return tag ;
								return tag.replace(/\w\S*/g, txt => {
									return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); ;
									}
							 
								); 
								
							})
							.map( tag => {if( tag in topicsDict ) { return topicsDict[tag] } else {
								return tag ; 
								}}
							  );
						for(const tag of filteredTags) {
							outputTags[tag] = true;
						}
						output.push({
							title: `Link from ${siteInfo.name}: ${hashedNormalizedUrl}`,
							modified: fields.modified,
							created: fields.created,
							text: fields.text,
							url: normalizedUrl,
							"url-hash": hashedNormalizedUrl,
							tags: stringifyList(filteredTags),
							"original-title": fields.title, 
							origin: siteInfo.name
						})
					}
					// Collect favicons
					if(fields.title === "$:/favicon.ico") {
						output.push({
							title: `$:/config/avatars/${siteInfo.name}`,
							name: siteInfo.name,
							tags: "$:/tags/Avatar",
							text: fields.text,
							type: fields.type
						});
					}
					// Collect site title and subtitle
					if(fields.title === "$:/SiteTitle") {
						sourceDescriptionTiddler.caption = fields.text;
					}
					if(fields.title === "$:/SiteSubtitle") {
						sourceDescriptionTiddler.text = fields.text;
					}
				}
				// Output the source description tiddler
				output.push(sourceDescriptionTiddler);
			}
		}
		// Output the tags
		for(const tag in outputTags) {
			output.push({
				title: `Topic: ${tag}`,
				topic: tag,
				tags: "$:/tags/Topic"
			});
		}
		// Write the output tiddlers
		await mkdirAsync(path.dirname(outputTiddlersPath),{recursive: true});
		await writeFileAsync(outputTiddlersPath,JSON.stringify(output,null,4),"utf8");
		// Output any errors
		if(errors.length > 0) {
			console.log("Errors",errors);
		}
	}

	async getFileContents(url) {
		// Retrieve the file contents
		let response, text;
		try {
			response = await fetch(url);
			if(!response.ok) {
				throw response;
			}
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
