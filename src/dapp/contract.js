import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {

    constructor(network, callback) {
        this.AIRLINE_NAMES = ["Alaska", "American", "United", "Delta", "Spirit"];
        this.PASSENGER_NAMES = ["John", "Jane", "Janet", "Joe", "Jason"];    

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.appAddress = config.appAddress;
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = {};
        this.passengers = {};
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0]; 
            let counter = 1;
            
            while(counter < 6) {
                this.airlines[this.AIRLINE_NAMES[counter - 1]] = accts[counter++];
            }

            while(counter < 11) {
                this.passengers[this.PASSENGER_NAMES[counter - 6]] = accts[counter++];
            }

            this.flightSuretyData.methods.authorizeCaller(this.appAddress).send({from: this.owner}, (error, result) => {
                if(error) {
                    console.log("Could not authorize the App contract");
                    console.log(error);
                }
            });

            this.flightSuretyData.methods.fund().send({from: this.airlines[this.AIRLINE_NAMES[0]], value: this.web3.utils.toWei("10", "ether") }, (error, result) => {
                if(error) {
                    console.log("Airline " + his.AIRLINE_NAMES[0]  + " cannot fund.");
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

    registerAirline(fromAirline, airlineToRegister, callback) {
        let self = this;
        let payload = {
            fromAirline: fromAirline,
            airlineToRegister: airlineToRegister
        }
        if (!airlineToRegister in this.airlines) {
            callback("airline " + airlineToRegister + " is not valid. Valid airlines are " + this.airlines.join('\r\n'))
        }
        self.flightSuretyApp.methods
            .registerAirline(this.airlines[payload.airlineToRegister])
            .send({ from: this.airlines[payload.fromAirline], gas: 6721975}, (error, result) => {
                if (error) {
                    callback(error, result);
                } else {
                    self.flightSuretyData.methods.isAirline(this.airlines[payload.airlineToRegister])
                    .call({ from: self.owner}, (error, result) => {
                        if (error) {
                            callback(error, result);
                        } else {
                            if (result == true) {
                                callback(error, "Airline " + payload.fromAirline + " successfully registered airline " + payload.airlineToRegister)
                            } else {
                                callback(error, "Airline " + payload.airlineToRegister + " needs more registration from other airline(s) other than " + payload.fromAirline)
                            }
                        }
                    });
                }
            });
    }

    fund(airline, funds, callback) {
        let self = this;
        let value = this.web3.utils.toWei(funds, "ether");

        self.flightSuretyData.methods
            .fund()
            .send({from: this.airlines[airline], value: value }, (error, result) => {
                if (error) {
                    callback(error, result);
                } else {
                    callback(error, "Airline " + airline + " successfully funded flight surety with " + Web3.utils.fromWei(value, "ether") + " ether")
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
        if (!airline in this.airlines) {
            callback("airline " + airline + " is not valid. Valid airlines are " + this.airlines.join('\r\n'))
        }
        self.flightSuretyApp.methods
            .registerFlight(this.airlines[payload.airline], payload.flight, payload.timestamp)
            .send({ from: this.airlines[payload.airline], gas: 6721975 }, (error, result) => {
                if (error) {
                    callback(error, result);
                } else {
                    console.log(result);
                    callback(error, "Airline " + payload.airline + " successfully registered flight " + payload.flight + " that will fly at " + new Date(payload.timestamp * 1000))
                }
            });
    }

    buy(passenger, ether, airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            passenger: passenger,
            airline: airline,
            flight: flight,
            timestamp: timestamp
        }
        let value = this.web3.utils.toWei(ether, "ether");
        if (!airline in this.airlines) {
            callback("airline " + airline + " is not valid. Valid airlines are " + this.airlines.join('\r\n'))
        }
        if (!passenger in this.passengers) {
            callback("passengers " + passenger + " is not valid. Valid passengers are " + this.passenger.join('\r\n'))
        }
        self.flightSuretyData.methods
            .buy(this.airlines[payload.airline], payload.flight, payload.timestamp)
            .send({ from: this.passengers[payload.passenger], value: value, gas: 6721975 }, (error, result) => {
                if (error) {
                    callback(error, result);
                } else {
                    callback(error, "Passenger " + payload.passenger + " successfully bought " + ether + " ether of insurance for airline " + payload.airline + " flight " + payload.flight + " that will fly at " + new Date(payload.timestamp * 1000))
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
            .fetchFlightStatus(this.airlines[payload.airline], payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                if (error) {
                    callback(error, payload);
                } else {                   
                    self.flightSuretyData.methods
                        .viewFlightStatus(this.airlines[payload.airline], payload.flight, payload.timestamp)
                        .call({ from: self.owner }, (error, result) => {
                            if (error) {
                                callback(error, "cannot view status")
                            } else {
                                if (result == 0) {
                                    callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: unknown")
                                } else if (result == 10) {
                                    callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: on-time")
                                } else if (result == 20) {
                                    callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: late airline")
                                } else if (result == 30) {
                                    callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: late weather")
                                } else if (result == 40) {
                                    callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: late technical")
                                } else if (result == 50) {
                                    callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: late other")
                                } else {
                                    callback(error, "cannot view status")
                                }
                            }
                        });
                }
            });
    }

    viewFlightStatus(airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: timestamp
        }
        self.flightSuretyData.methods
            .viewFlightStatus(this.airlines[payload.airline], payload.flight, payload.timestamp)
            .call({ from: self.owner }, (error, result) => {
                if (error) {
                    callback(error, "cannot view status")
                } else {
                    if (result == 0) {
                        callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: unknown")
                    } else if (result == 10) {
                        callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: on-time")
                    } else if (result == 20) {
                        callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: late airline")
                    } else if (result == 30) {
                        callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: late weather")
                    } else if (result == 40) {
                        callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: late technical")
                    } else if (result == 50) {
                        callback(error, "Airline " + airline + " Flight " + flight + " that will fly at " + new Date(payload.timestamp * 1000) + " status: late other")
                    } else {
                        callback(error, "cannot view status")
                    }
                }
            });
    }
}