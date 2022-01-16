# NodeJs http SSI Server

## Installation

```
npm install nodejs_http_ssi_server
```

(please only use the newest version, i.e. 1.0.4 and up)

## Usage example

```
const server = require("nodejs_http_ssi_server");
server(port, root);
```

Defaults are (port = 3000, root = "./www").

.shtml SSI include directives (SGML comments) have the following format:

```
<!--#include file="path" --> 
```

i.e. only a single file is parsed per directive.

Note that the path must be relative and contained in the directory of the current .shtml document being parsed. Additionally, the pattern "../" is not allowed for simplicity reasons. 

## Description

This minimal webserver is based on express.js and provides a simplified variant of the Server Side Include (SSI) "include" directive. That is, .html files are served as usual, while .shtml files are parsed for directives as described above. If, for any reason, an .shtml file cannot be properly parsed, the .shtml file is server as .html file.

## Technical description

The implementation is based on node.js and express.js. This allows us to only care about the middleware layer, i.e. fetching /\*.shtml pages to parse for the SSI "include" directive and replace it with the specified file attribute given as path. The decision was made to use synchronous functions for file I/O, as we need to wait for reading .shtml files and the attribute files to replace the "include" directive (if any) anyway, while using asynchronous file I/O would have resulted in unnecessary nesting. However, this point can be improved upon in the future. While the parsing loop does its job sufficiently quickly, it could absolutely be refactored into something more simple, making use of (potentially functional) common JavaScript language constructs. Another low-hanging fruit would be to (at least partially) generalise the directive parser for future extensions. Lastly, the logging is very rudimentary and can be generalised as well.

Apart from very common lookup of minimal code fragments, no significant amount of code has been copied from anywhere. Except for the imported libraries, the code that can be seen in this repository is written by me.
 

