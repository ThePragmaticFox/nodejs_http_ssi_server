"use strict";

const PORT_DEFAULT = 3000;
const ROOT_DEFAULT = "/www";

module.exports = function (port = PORT_DEFAULT, root = ROOT_DEFAULT) {

    const fs = require("fs");
    const path = require("path");
    const express = require("express");

    if (root.endsWith("/")) {
        root = root.slice(0, -1);
    }

    const rootParent = __dirname.replace("/node_modules/nodejs_http_ssi_server", "");
    var rootAbs = rootParent + root;

    if (root !== ROOT_DEFAULT) {
        rootAbs = root;
    }

    if (port === PORT_DEFAULT && root === ROOT_DEFAULT) {
        console.log("No inputs specified, defaults will be used: (port = %s, root = %s)", port, rootAbs);
    } else {
        console.log("The following inputs will be used: (port = %s, root = %s)", port, rootAbs);
    }

    try {
        fs.accessSync(rootAbs);
    } catch (err) {
        console.log("Error: Root directory could not be accessed (is it a valid absolute path?): %s", rootAbs);
        if (root != ROOT_DEFAULT) {
            return;
        }
        try {
            rootAbs = rootParent + "/";
            console.log("Fallback default root directory will be used: %s", rootAbs);
            fs.accessSync(rootAbs);
        } catch (err) {
            console.log("Error: Fallback default root directory could not be accessed: %s", rootAbs);
            return;
        }
    }

    const shtmlFilter = "/*.shtml";
    const shtmlEncoding = "utf8";
    const illegalPathTerm = "../";
    const includeSSIPatternBegin = "<!--#include ";
    const includeSSIPatternEnd = " -->";

    const app = express();
    app.use(shtmlFilter, middlewareSSI);
    app.use(express.static(rootAbs));
    console.log("Server successfully started.");
    app.listen(process.env.PORT || port);

    function middlewareSSI(req, res, next) {

        const shtmlFileRelPath = req.baseUrl;
        const shtmlFileDir = rootAbs + path.dirname(shtmlFileRelPath);
        const shtmlFileAbsPath = rootAbs + shtmlFileRelPath;

        const debug = false;
        if (debug) {
            console.log(shtmlFileRelPath);
            console.log(shtmlFileDir);
            console.log(shtmlFileAbsPath);
        }

        try {
            fs.accessSync(shtmlFileAbsPath);
        } catch (err) {
            console.log("Error: Could not access requested file: %s", shtmlFileAbsPath);
        }

        var shtmlFileString;
        try {
            shtmlFileString = fs.readFileSync(shtmlFileAbsPath, shtmlEncoding);
        } catch (err) {
            console.log("Error: Could not read requested file: %s", shtmlFileAbsPath);
            next();
            return;
        }

        var lastIndex = 0;
        var includeSSIMatch;
        var isSuccessful = true;

        const resultSHTML = [];
        const includeSSIRegex = /<!--#include [0-9\/'"=.a-zA-Z]+ -->/g;

        while ((includeSSIMatch = includeSSIRegex.exec(shtmlFileString)) != null) {

            resultSHTML.push(shtmlFileString.substring(lastIndex, includeSSIMatch.index));

            const match = includeSSIMatch[0];
            const cleanedMatch = match.replace(includeSSIPatternBegin, "").replace(includeSSIPatternEnd, "");
            const attributes = cleanedMatch.split(" ").map(attribute => attribute.split("="));

            if (attributes.length != 1) {
                // As per (my interpretation of the) requirement, only a single attribute (file) is allowed.
                console.log("Error: Only a single file attribute is allowed per directive, but given are %s.", attributes.length);
                console.trace();
                isSuccessful = false;
                break;
            }

            if (!parseAttribute(attributes[0], resultSHTML, shtmlFileDir, shtmlFileAbsPath)) {
                isSuccessful = false;
                break;
            }

            lastIndex = includeSSIMatch.index + match.length;
        }

        if (isSuccessful) {
            console.log("Success: '%s' served as .shtml file.", shtmlFileAbsPath);
            resultSHTML.push(shtmlFileString.substring(lastIndex));
            res.send(resultSHTML.join(""));
        } else {
            console.log("Abort: '%s' served as .html file.", shtmlFileAbsPath);
            next();
        }
    }

    function parseAttribute(attribute, resultSHTML, shtmlFileDir, shtmlFileAbsPath) {

        if (attribute[0] !== "file") {
            console.log("Error: The only allowed attribute is 'file', but the specified attribute is '%s'", attribute[0]);
            console.trace();
            return false;
        }

        const attrPath = attribute[1].replace(/(^"|"$)/g, "").replace(/(^'|'$)/g, "");

        if (path.isAbsolute(attrPath)) {
            console.log("Error: Only paths relative and contained to the folder with the currently parsed .shtml file are allowed, but the specified path is absolute: %s", attrPath);
            console.log("Information: currently parsed .shtml file: %s", shtmlFileAbsPath);
            if (attrPath.length > 0 && attrPath[0] === "/") {
                console.log("Tip: Instead of '/', use './' or '' (empty string) at the beginning of the path.");
            }
            console.trace();
            return false;
        }

        if (attrPath.includes(illegalPathTerm)) {
            console.log("Error: The term '%s' is not allowed in the specified path: %s", illegalPathTerm, attrPath);
            console.trace();
            return false;
        }

        const attributeFilePath = shtmlFileDir + "/" + attrPath;

        try {
            fs.accessSync(attributeFilePath);
        } catch (err) {
            console.log("Error: The file of the specified relative path could not be accessed (does it exist?): %s", attrPath);
            console.log("Absolute Path: %s", attributeFilePath);
            console.trace();
            return false;
        }

        try {
            const attributeFileString = fs.readFileSync(attributeFilePath, shtmlEncoding);
            resultSHTML.push(attributeFileString);
        } catch (err) {
            console.log("Error: The file of the specified relative path could not be parsed (is it 'utf-8' enconded?): %s", attrPath);
            console.log("Absolute Path: %s", attributeFilePath);
            console.trace();
            return false;
        }

        return true;
    }
}