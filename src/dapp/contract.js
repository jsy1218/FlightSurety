import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.appAddress = config.appAddress;
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            this.flightSuretyData.methods.authorizeCaller(this.appAddress).send({from: this.owner}, (error, result) => {
                if(error) {
                    console.log("Could not authorize the App contract");
                    console.log(error);
                }
            });

            this.flightSuretyData.methods.fund().send({from: this.owner, value: this.web3.utils.toWei("10", "ether") }, (error, result) => {
                if(error) {
                    console.log("Airline " + this.owner  + " cannot fund.");
                    console.log(error);
                }
            });

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fund(airline, callback) {
        let self = this;
        let value = this.web3.utils.toWei("10", "ether");

        if (!this.airlines.includes(airline)) {
            callback("airline " + airline + " is not valid. Valid airlines are " + this.airlines.join('\r\n'))
        }

        self.flightSuretyData.methods
            .fund()
            .send({from: airline, value: value }, (error, result) => {
                if (error) {
                    callback(error, result);
                } else {
                    callback(error, "Successfully funded airline " + airline)
                }
            });
    }

    registerAirline(fromAirline, airlineToRegister, callback) {
        let self = this;
        let payload = {
            fromAirline: fromAirline,
            airlineToRegister: airlineToRegister
        }
        if (!this.airlines.includes(airlineToRegister)) {
            callback("airline " + airlineToRegister + " is not valid. Valid airlines are " + this.airlines.join('\r\n'))
        }
        self.flightSuretyApp.methods
            .registerAirline(payload.airlineToRegister)
            .send({ from: payload.fromAirline, gas: 6721975}, (error, result) => {
                if (error) {
                    callback(error, result);
                } else {
                    self.flightSuretyData.methods.isAirline(payload.airlineToRegister).call({ from: self.owner}, (error, result) => {
                        if (error) {
                            callback(error, result);
                        } else {
                            if (result == true) {
                                callback(error, payload.fromAirline + " successfully registered airline " + payload.airlineToRegister)
                            } else {
                                callback(error, payload.fromAirline + " needs more registration from other airline(s)")
                            }
                        }
                    });
                }
            });
    }

    registerFlight(airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: timestamp
        }
        if (!this.airlines.includes(airline)) {
            callback("airline " + airline + " is not valid. Valid airlines are " + this.airlines.join('\r\n'))
        }
        self.flightSuretyApp.methods
            .registerFlight(payload.airline, payload.flight, payload.timestamp)
            .send({ from: payload.airline, gas: 6721975 }, (error, result) => {
                if (error) {
                    callback(error, result);
                } else {
                    callback(error, payload.airline + " successfully registered flight " + payload.flight + " at time " + new Date(payload.timestamp * 1000))
                }
            });
    }

    buy(passenger, airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            passenger: passenger,
            airline: airline,
            flight: flight,
            timestamp: timestamp
        }
        if (!this.airlines.includes(airline)) {
            callback("airline " + airline + " is not valid. Valid airlines are " + this.airlines.join('\r\n'))
        }
        if (!this.passengers.includes(passenger)) {
            callback("passengers " + passenger + " is not valid. Valid passengers are " + this.passenger.join('\r\n'))
        }
        self.flightSuretyData.methods
            .buy(payload.airline, payload.flight, payload.timestamp)
            .send({ from: payload.passenger, gas: 6721975 }, (error, result) => {
                if (error) {
                    callback(error, result);
                } else {
                    callback(error, payload.passenger + " successfully bought insurance for airline " + payload.airline + " flight " + payload.flight + " at time " + new Date(payload.timestamp * 1000))
                }
            });
    }

    fetchFlightStatus(airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: timestamp
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }
}