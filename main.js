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

    var rootAbs = __dirname + root;

    if (root !== ROOT_DEFAULT) {
        rootAbs = root;
    }

    if (port === PORT_DEFAULT && root === ROOT_DEFAULT) {
        console.log("No inputs specified, defaults will be used: (port = %s, root = %s)", port, rootAbs);
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

        const resultSHTML = [];
        var isSuccessful = true;

        const shtmlFileRelPath = req.baseUrl;
        const shtmlFileDir = rootAbs + path.dirname(shtmlFileRelPath);
        const shtmlFileAbsPath = rootAbs + shtmlFileRelPath;

        try {
            fs.accessSync(shtmlFileAbsPath);
        } catch (err) {
            console.log("Error: Could not access requested file: %s", shtmlFileAbsPath);
        }

        var shtmlFileString;
        try {
            shtmlFileString = fs.readFileSync(shtmlFileAbsPath, shtmlEncoding);
        } catch(err) {
            console.log("Error: Could not read requested file: %s", shtmlFileAbsPath);
            next();
            return;
        }

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
                console.trace();
                isSuccessful = false;
                break;
            }

            const attributes = shtmlFileString.substring(beginAttr, endAttr).split(" ").map((attribute) => attribute.split("="));

            if (attributes.length != 1) {
                // As per requirement, only a single attribute (file) is allowed.
                console.log("Error: Only a single file attribute is allowed per directive, but given are %s.", attributes.length);
                console.trace();
                isSuccessful = false;
                break;
            }

            if (!parseAttribute(attributes[0], resultSHTML, shtmlFileDir, shtmlFileAbsPath)) {
                isSuccessful = false;
                break;
            }

            i = endAttr + includeSSIPatternEnd.length;
        }

        if (isSuccessful) {
            console.log("Success: '%s' served as .shtml file.", shtmlFileAbsPath);
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

        // We only check for double quotes, i.e. a more strict parsing.
        const attrPath = attribute[1].replace(/(^"|"$)/g, "");

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