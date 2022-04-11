import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let oraclesIndexesMap = {};

const ORACLES_COUNT = 20;
const ORACLES_OFFSET = 11; // account 0 is contract owner, 1-5 are for airlines, 6-10 are for passengers

let STATUS_CODE_UNKNOWN = 0;
let STATUS_CODE_ON_TIME = 10;
let STATUS_CODE_LATE_AIRLINE = 20;
let STATUS_CODE_LATE_WEATHER = 30;
let STATUS_CODE_LATE_TECHNICAL = 40;
let STATUS_CODE_LATE_OTHER = 50;

let STATUS_CODES = [STATUS_CODE_UNKNOWN, STATUS_CODE_ON_TIME, STATUS_CODE_LATE_AIRLINE, STATUS_CODE_LATE_WEATHER, STATUS_CODE_LATE_TECHNICAL, STATUS_CODE_LATE_OTHER]

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

flightSuretyApp.events.OracleRequest({
  fromBlock: "latest"
}, function (error, event) {
  if (error) console.log(error)
  console.log(event)
  const index = event.returnValues.index;
  const airline = event.returnValues.airline;
  const flight = event.returnValues.flight;
  const timestamp = event.returnValues.timestamp;

  let randomStatusCode = STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];

  let payload = {
    index: index,
    airline: airline,
    flight: flight,
    timestamp: timestamp,
    statusCode: randomStatusCode
  }

  for (let account in oraclesIndexesMap) {
    let indexes = oraclesIndexesMap[account]; 
    if (indexes.includes(index)) {
      flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, randomStatusCode).call({ from: account }, (error, result) => {
        if (error) {
          console.log(error, payload);
        } else {
          console.log("Submitted oracle response for oracle " + account + " with status code " + randomStatusCode);
        }
      });
    } else {
      console.log("No matching index " + index + " for oracle " + account + ".");
    }
  }
});

flightSuretyApp.methods.REGISTRATION_FEE().call((error, fee) => {
  if (error) {
    console.log("Cannot get oracle registration fee, error: " + error)
  } else {
    web3.eth.getAccounts((error, accts) => {
      for (let a=ORACLES_OFFSET; a<ORACLES_OFFSET + ORACLES_COUNT; a++) {
        flightSuretyApp.methods.registerOracle().send({ from: accts[a], value: fee, gas: 6721975 }, (error, result) => {
          if (error) {
            console.log(error, "Cannot register oracle " + accts[a]);
          } else {
            console.log("Oracle " + accts[a] + " successfully registered.");
            flightSuretyApp.methods.getMyIndexes().call({ from: accts[a] }, (error, result) => {
              oraclesIndexesMap[accts[a]] = result;
            });
          }
        });
      }
    });
  }
});

export default app;


