#!/usr/bin/env node
'use strict';

require('dotenv').config();

let GSI_DGY = require("./lib/gsi_discovergy.js");

if((typeof process.env.DISCOVERGY_PASSWORD != "undefined")&&((typeof process.env.DISCOVERGY_ACCOUNT != "undefined"))) {
  let instance = new GSI_DGY({DISCOVERGY_PASSWORD:process.env.DISCOVERGY_PASSWORD,DISCOVERGY_ACCOUNT:process.env.DISCOVERGY_ACCOUNT});
  if(process.argv.length<3) {
    instance.meters().then(function(meters) {
      console.log(meters);
    });
  } else {
    instance.meter(process.argv[2]).then(function(meter) {
      console.log(meter);
    });
  }
} else {
  console.log("Missing environment variable DISCOVERGY_ACCOUNT or DISCOVERGY_PASSWORD.");
  console.log("Try to create a .env file with the values");
  console.log("Alternative you might type on command line:");
  console.log(" SET DISCOVERGY_ACCOUNT=YOURACCOUNT");
  console.log(" SET DISCOVERGY_PASSWORD=YOURPASSWORD");
  console.log(" ");
}
