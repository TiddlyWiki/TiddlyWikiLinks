/*
Simple command line argument parser
*/

exports.ArgParser = class ArgParser {
	constructor(args,options = {}) {
		// Collect the arguments into a hashmap
		this.byName = new Object(null);
		let target = null;
		args.forEach(arg => {
			if(arg.startsWith("--")) {
				if(arg.length > 2) {
					target = arg.slice(2);
					if(!(target in this.byName)) {
						this.byName[target] = [];
					} else {
						throw `Repeated option --${target} ${JSON.stringify(this.byName,null,4)}`;
					}
				} else {
					throw "Missing option name after --";
				}
			} else {
				if(!target) {
					throw "Missing options";
				}
				this.byName[target].push(arg);
			}
		});
		// Add defaults for any missing arguments
		for(const [key,value] of Object.entries(options.defaults || {})) {
			if(!(key in this.byName)) {
				this.byName[key] = [value];
			}
		}
	}
};
