
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    
        // User-submitted transaction
        DOM.elid('register-airline').addEventListener('click', () => {
            let fromAirline = DOM.elid('from-airline').value;
            let airlineToRegister = DOM.elid('airline').value;
            // Write transaction
            contract.registerAirline(fromAirline, airlineToRegister, (error, result) => {
                display('Airline', 'Register airline', [ { label: 'Register Airline Status', error: error, value: result } ]);
                DOM.elid('registered-airline').textContent = airlineToRegister;
            });
        })

        // User-submitted transaction
        DOM.elid('fund').addEventListener('click', () => {
            let airline = DOM.elid('airline').value;
            let funds = DOM.elid('funds').value;
            // Write transaction
            contract.fund(airline, funds, (error, result) => {
                display('Airline', 'Fund', [ { label: 'Fund Status', error: error, value: result } ]);
            });
        })

        // User-submitted transaction
        DOM.elid('register-flight').addEventListener('click', () => {
            let flight = DOM.elid('flight').value;
            let airline = DOM.elid('airline').value;
            let timestamp = new Date(DOM.elid('time').value).getTime()/ 1000;
            console.log(timestamp)
            // Write transaction
            contract.registerFlight(airline, flight, timestamp, (error, result) => {
                display('Flight', 'Register flight', [ { label: 'Register Flight Status', error: error, value: result } ]);
                DOM.elid('registered-flight').textContent = flight;
                DOM.elid('registered-time').textContent = DOM.elid('time').value;
            });
        })

        // User-submitted transaction
        DOM.elid('buy').addEventListener('click', () => {
            let passenger = DOM.elid('passenger').value;
            let ether = DOM.elid('ether').value;
            let flight = DOM.elid('flight').value;
            let airline = DOM.elid('airline').value;
            let timestamp = new Date(DOM.elid('time').value).getTime()/ 1000;
            // Write transaction
            contract.buy(passenger, ether, airline, flight, timestamp, (error, result) => {
                display('Insurance', 'Buy insurance', [ { label: 'Buy Insurance Status', error: error, value: result } ]);
            });
        })

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight').value;
            let airline = DOM.elid('airline').value;
            let timestamp = new Date(DOM.elid('time').value).getTime()/ 1000;
            // Write transaction
            contract.fetchFlightStatus(airline, flight, timestamp, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result } ]);
            });
        })
    
        // User-submitted transaction
        DOM.elid('view-flight-status').addEventListener('click', () => {
            let flight = DOM.elid('flight').value;
            let airline = DOM.elid('airline').value;
            let timestamp = new Date(DOM.elid('time').value).getTime()/ 1000;
            // Write transaction
            contract.viewFlightStatus(airline, flight, timestamp, (error, result) => {
                display('Flight', 'Flight Status', [ { label: 'View Flight Status', error: error, value: result } ]);
            });
        })

        // User-submitted transaction
        DOM.elid('get-insuree-credit').addEventListener('click', () => {
            let passenger = DOM.elid('passenger').value;
            // Write transaction
            contract.getInsureeCredit(passenger, (error, result) => {
                display('Credit', 'Insuree credit', [ { label: 'Get insuree credit', error: error, value: result } ]);
            });
        })

        // User-submitted transaction
        DOM.elid('payout-insuree').addEventListener('click', () => {
            let passenger = DOM.elid('passenger').value;
            // Write transaction
            contract.payout(passenger, (error, result) => {
                display('Payout', 'Payout to passenger', [ { label: 'Payout result', error: error, value: result } ]);
            });
        })
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







