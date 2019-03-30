'use strict';

module.exports = function(config) {
  const http_request = require("request");

  this.config = config;

  const _getReading = function(meter) {
    return new Promise( async function (resolve, reject)  {
      http_request("https://"+escape(config.DISCOVERGY_ACCOUNT)+":"+escape(config.DISCOVERGY_PASSWORD)+"@api.discovergy.com/public/v1/last_reading?meterId="+meter.meterId,async function(e,r,b) {
          try {
            let _reading = JSON.parse(b);
            meter["1.8.0"] = _reading.values.energy;
            meter.timeStamp = _reading.time;
            resolve(meter);
          } catch(e) {
            console.log(e);
            reject({});
          }
      });
    });
  }

  const  _getGSI = function(meter) {
    return new Promise( async function (resolve, reject)  {
      let gsidata = {};
      gsidata.zip = meter.location.zip;
      gsidata.externalAccount = meter.administrationNumber;
      gsidata.energy = meter["1.8.0"];
      gsidata.secret = meter.meterId;
      gsidata.timeStamp = meter.timeStamp;
      http_request.post("https://api.corrently.io/core/reading",{form:gsidata},function(e,r,b) {
        let _gsi = JSON.parse(b);
        if(typeof _gsi["account"] != "undefined") meter.account = _gsi["account"];
        if(typeof _gsi["1.8.1"] != "undefined") meter["1.8.1"] = _gsi["1.8.1"]*1;
        if(typeof _gsi["1.8.2"] != "undefined") meter["1.8.2"] = _gsi["1.8.2"]*1;
        resolve(meter);
      })
    });
  }

  this.meters = async function() {
    let parent = this;
    return new Promise( async function (resolve, reject)  {
      http_request("https://"+escape(parent.config.DISCOVERGY_ACCOUNT)+":"+escape(parent.config.DISCOVERGY_PASSWORD)+"@api.discovergy.com/public/v1/meters",async function(e,r,b) {
        try {
          let _meters =  JSON.parse(b);
          for(let i=0; i < _meters.length; i++) {
            if((_meters[i].measurementType == "ELECTRICITY") && ( _meters[i].type == "EASYMETER")) {
              _meters[i] = await _getReading(_meters[i]);
              _meters[i] = await _getGSI(_meters[i]);
            }
          }
          resolve(_meters);
        } catch(e) {
          console.log(e);
          reject([]);
        }
      });
    });
  }
  
  this.meter = async function(query) {
    let parent = this;
    return new Promise( async function (resolve, reject)  {
      parent.meters().then(function(meters) {
        for(let i=0; i< meters.length; i++) {
          if(meters[i].meterId==query) resolve(meters[i]);
          if(meters[i].administrationNumber==query) resolve(meters[i]);
          if(meters[i].account==query) resolve(meters[i]);
          if(meters[i].serialNumber==query) resolve(meters[i]);
        }
      });
    });
  }

  this.REQUIREDCONFIGS = ["DISCOVERGY_ACCOUNT","DISCOVERGY_PASSWORD"];
}