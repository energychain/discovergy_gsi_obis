'use strict';

module.exports = function(config) {
  const http_request = require("request");
  const storage = require('node-persist');
  const meterStorage = storage.create({ dir: 'storageMeter', ttl: (895000) })
  this.config = config;

  const _getReading = function(meter) {
    return new Promise( async function (resolve, reject)  {
      http_request("https://"+escape(config.DISCOVERGY_ACCOUNT)+":"+escape(config.DISCOVERGY_PASSWORD)+"@api.discovergy.com/public/v1/last_reading?meterId="+meter.meterId,async function(e,r,b) {
          try {
            let _reading = JSON.parse(b);
            meter["1.8.0"] = _reading.values.energy;
            if(typeof _reading.values.power1 != "undefined") meter["power1"] = _reading.values.power1;
            if(typeof _reading.values.power2 != "undefined") meter["power2"] = _reading.values.power2;
            if(typeof _reading.values.power3 != "undefined") meter["power3"] = _reading.values.power3;
            if(typeof _reading.values.energyOut != "undefined") meter["2.8.0"] = _reading.values.energyOut;
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
        gsidata.externalAccount = "DGY_"+meter.administrationNumber;
        if((typeof meter.administrationNumber == "undefined") || (meter.administrationNumber == null) || (meter.administrationNumber.length <1)) {
          gsidata.externalAccount = "DGY_"+meter.meterId;
        }
        gsidata.energy = Math.round(meter["1.8.0"]/10000000);
        gsidata.secret = meter.meterId;
        gsidata.timeStamp = meter.timeStamp;

        const  _getGSIremote = function(gsidata) {
          return new Promise( async function (resolve, reject)  {
            http_request.post("https://api.corrently.io/core/reading",{form:gsidata},function(e,r,b) {
              let _gsi = JSON.parse(b);
              meterStorage.setItem(gsidata.externalAccount,_gsi);
              resolve(_gsi);
            })
          });
        }

        let _gsi = await meterStorage.getItem(gsidata.externalAccount);

        if(_gsi == null) {
          _gsi = await _getGSIremote(gsidata);
        }

        if(typeof _gsi["account"] != "undefined") meter.account = _gsi["account"];
        if(typeof _gsi["1.8.1"] != "undefined") meter["1.8.1"] = _gsi["1.8.1"]*1;
        if(typeof _gsi["1.8.2"] != "undefined") meter["1.8.2"] = _gsi["1.8.2"]*1;
        if(typeof _gsi["co2_g_standard"] != "undefined") meter["co2_g_standard"] = _gsi["co2_g_standard"]*1;
        if(typeof _gsi["co2_g_oekostrom"] != "undefined") meter["co2_g_oekostrom"] = _gsi["co2_g_oekostrom"]*1;
        if(typeof _gsi.err != "undefined") {
          console.log("Error Updating Reading",_gsi.err,_gsi);
        }

        resolve(meter);

    });
  }

  this.meters = async function() {
    let parent = this;
    return new Promise( async function (resolve, reject)  {
      meterStorage.init();
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
      meterStorage.init();
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
