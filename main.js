"use strict";

var fs = require("fs");
var path = require("path");
var express = require("express");

const port = 80;

var inputRoot = "/www";

if (!inputRoot.endsWith("/")) {
    inputRoot += "/";
}

const rootRel = inputRoot;
const rootAbs = __dirname + rootRel;
const shtmlFilter = "/*.shtml";
const shtmlEncoding = "utf8";
const illegalPathTerm = "../";
const includeSSIPatternBegin = "<!--#include ";
const includeSSIPatternEnd = " -->";

const app = express();

function parseAttribute(attribute, resultSHTML) {

    if (attribute[0] != "file") {
        console.log("Error: The only allowed attribute is 'file', but the specified attribute is '%s'", attribute[0]);
        return false;
    }

    const attrPath = attribute[1].replace(/(^"|"$)/g, "");

    if (path.isAbsolute(attrPath)) {
        console.log("Error: Only relative paths inside the root directory are allowed, but the specified path is absolute: %s", attrPath);
        if (attrPath[0] === "/") {
            console.log("Tip: Instead of '/', use './' or '' (empty string) at the beginning of the path.");
        }
        return false;
    }

    if (attrPath.includes(illegalPathTerm)) {
        console.log("Error: The term '%s' is not allowed in the specified path: %s", illegalPathTerm, attrPath);
        return false;
    }

    const attributeFilePath = rootAbs + attrPath;
    
    try {
        fs.accessSync(attributeFilePath);
    } catch (err) {
        console.log("Error: The file of the specified relative path could not be accessed (does it exist?): %s", attrPath);
        console.log("Absolute Path: %s", attributeFilePath);
        return false;
    }

    try {
        const attributeFileString = fs.readFileSync(attributeFilePath, shtmlEncoding);
        resultSHTML.push(attributeFileString);
    } catch (err) {
        console.log("Error: The file of the specified relative path could not be parsed (is it 'utf-8' enconded?): %s", attrPath);
        console.log("Absolute Path: %s", attributeFilePath);
        return false;
    }

    return true;
}

app.use(shtmlFilter, (req, res, next) => {

    var resultSHTML = [];
    var isSuccessful = true;

    const shtmlFileRelPath = req.baseUrl;
    const shtmlFilePath = rootAbs + shtmlFileRelPath;
    const shtmlFileString = fs.readFileSync(shtmlFilePath, shtmlEncoding);

    for (let i = 0; i < shtmlFileString.length; i++) {

        while (i < shtmlFileString.length && !shtmlFileString.startsWith(includeSSIPatternBegin, i)) {
            resultSHTML.push(shtmlFileString[i++]);
        }

        if (i >= shtmlFileString.length) {
            break;
        }

        const beginAttr = i + includeSSIPatternBegin.length;

        let j = beginAttr;

        while (j < shtmlFileString.length && !shtmlFileString.startsWith(includeSSIPatternEnd, j)) {
            j++;
        }

        const endAttr = j;

        if (j >= shtmlFileString.length) {
            console.log("Error: The closing of an opened SSI directive could not be found. Maybe you forgot a space?");
            isSuccessful = false;
            break;
        }

        const attributes = shtmlFileString.substring(beginAttr, endAttr).split(" ").map((attribute) => attribute.split("="));

        if (attributes.length != 1) {
            // As per requirement, only a single attribute (file) is allowed.
            console.log("Error: Only a single file attribute is allowed per directive, but given are %s.", attributes.length);
            isSuccessful = false;
            break;
        }

        if (!parseAttribute(attributes[0], resultSHTML)) {
            isSuccessful = false;
            break;
        }

        i = endAttr + includeSSIPatternEnd.length;
    }

    if (isSuccessful) {
        res.send(resultSHTML.join(""));
    } else {
        console.log("Abort: '%s' served as .html file.", shtmlFileRelPath);
        next();
    }
});

app.use(express.static(rootAbs));
app.listen(process.env.PORT || port);
