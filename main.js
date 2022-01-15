"use strict";

var fs = require("fs");
var path = require('path');
var express = require("express");

const port = 80;
const root = __dirname + "/www";
const shtmlFilter = "/*.shtml";
const shtmlEncoding = "utf8";
const includeSSIPatternBegin = "<!--#include ";
const includeSSIPatternEnd = " -->";

const app = express();

app.use(shtmlFilter, (req, res, next) => {
    fs.readFile(root + req.baseUrl, shtmlEncoding, function (err, data) {
        let resultSHTML = [];
        for (let i = 0; i < data.length; i++) {
            if (!data.startsWith(includeSSIPatternBegin, i)) {
                resultSHTML.push(data[i]);
                continue;
            }
            let isOk = false;
            const beginPattern = i + includeSSIPatternBegin.length;
            for (let j = beginPattern; j < data.length; j++) {
                if (!data.startsWith(includeSSIPatternEnd, j)) {
                    continue;
                }
                const endPattern = j;
                const attributes = data.substring(beginPattern, endPattern).split(" ").map(attribute => attribute.split("="));
                for (const attribute of attributes) {
                    if (attribute[0] != "file") {
                        continue;
                    }
                    let attrPath = attribute[1];
                    if (path.isAbsolute(attrPath)) {
                        console.log("Error: Only relative paths inside the root directory are allowed, but the following specified path is absolute:\n%s", attrPath);
                        continue;
                    }
                    if (attrPath.contains("../")) {
                        console.log("Error: Only relative paths inside the root directory are allowed, but the following specified path is outside the root directory:\n%s", attrPath);
                        continue;
                    }
                    fs.access(attrPath, fs.R_OK, (err) => {
                        if (err) {
                            console.log("The following file is not correct:\n%s")
                        }
                    })
                    isOk = true;
                }
                i = endPattern + includeSSIPatternEnd.length;
                break;
            }
            if (!isOk) {
                resultSHTML.push(data[i]);
                continue;
            }
        }
        res.send(resultSHTML.join(""));
    });
})

app.use(express.static(root));
app.listen(process.env.PORT || port);