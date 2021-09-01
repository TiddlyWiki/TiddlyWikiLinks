# TiddlyWiki Links


## Setup

Clone this repository and install its dependencies:

```
npm install
```

To install subsequent upstream changes from TiddlyWiki 5:

```
npm update
```

## Develop

To build the app locally and serve it over HTTP:

```
npm start
```

## Build

To build the app locally:

```
npm run build
```

The output files will be in `/output`.

It is recommended to view the output files via the HTTTP server. The links in the output files won't work correctly if they are viewed via the `file://` protocol (in particular, unlike a webserver, the `file://` protocol does not automatically add `/index.html` to URLs that reference a directory).

