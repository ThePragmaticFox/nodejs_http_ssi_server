"use strict";
var fetch = require("fetch");
var FileReader = require('filereader');
let reader = new FileReader();
var fs = require('fs');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use('/*.shtml', (req, res, next) => {
    fetch("www" + req.baseUrl)
    .then(response => response.text())
    .then(text => {
        console.log(text)
        reader.readAsText(text);
    })
    let reader = new FileReader();
    console.log(req.baseUrl);
    console.log(reader.result);
    //res.send(outputfile);
    next();
})

app.use(express.static(__dirname + '/www'));
app.listen(process.env.PORT || 80);

