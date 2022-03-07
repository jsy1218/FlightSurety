pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    mapping(address => uint256) private authorizedCallers;              // Addresses that can access this contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    uint256 public constant PARTICIPATION_FUND = 10 ether;
    uint256 public constant INSURANCE_PAY_LIMIT = 1 ether;


    struct AirlineStatus {
        bool registered;
        bool participated;
    }

    struct Airlines {
        mapping (address => address[]) airlineVotes;
        mapping (address => AirlineStatus) airlineStatus;
        uint256 count;
    }
    Airlines private airlines;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    mapping(bytes32 => Flight) private flights;

    struct Passenger {
        mapping(bytes32 => uint256) boughtFlightInsurance;
        uint256 flightInsuranceCredit;
    }
    mapping(address => Passenger) private passengers;
    address[] private passengerAddresses;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address firstAirline
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        airlines.count = 0;
        airlines.airlineStatus[firstAirline].registered = true;
        airlines.airlineStatus[firstAirline].participated = false;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the "ExternallyOwnedAccount" account to be the function caller
    */
    modifier requireExternallyOwnedAccount()
    {
        require(msg.sender == tx.origin, "Contracts not allowed");
        _;
    }

    /**
    * @dev Modifier that requires the "authorized" account to be the function caller
    */
    modifier isCallerAuthorized()
    {
        require(authorizedCallers[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    /**
    * @dev Modifier that checks the airline registration prerequisites
    */
    modifier isAirlineNotRegisteredAndFunded(address fundAirline, address registerAirline)
    {
        require(!airlines.airlineStatus[registerAirline].registered, "airline is already registered");
        require(airlines.airlineStatus[fundAirline].participated, "the caller airline has not paid participation fee.");
        _;
    }

    /**
    * @dev Modifier that checks the flight registration prerequisites
    */
    modifier isAirlineRegisteredAndFunded(address fundAirline, address registerAirline)
    {
        require(airlines.airlineStatus[registerAirline].registered, "airline is not registered yet.");
        require(airlines.airlineStatus[fundAirline].participated, "the caller airline has not paid participation fee.");
        _;
    }

    /**
    * @dev Modifier that checks the airline registration requirements
    */
    modifier canRegisterAirline(address airline)
    {
        if (airlines.count >= 4) {
            bool isDuplicate = false;
            for(uint c=0; c<airlines.airlineVotes[airline].length; c++) {
                if (airlines.airlineVotes[airline][c] == tx.origin) {
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "the caller airline has already voted for passed in airline.");
        }

        _;
    }

    /**
    * @dev Modifier that checks the passenger buy insurance requirements
    */
    modifier isFlightRegistered(
                                    address airline,
                                    string flight,
                                    uint256 timestamp
                                )
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(flights[flightKey].isRegistered, "Flight is not registered yet.");
        _;
    }

    /**
    * @dev Modifier that checks the flight registration requirements
    */
    modifier canRegisterFlight(
                                    address airline,
                                    string flight,
                                    uint256 timestamp
                              )
    {
        require(!flights[getFlightKey(airline, flight, timestamp)].isRegistered, "flight is already registered");
        require(timestamp > block.timestamp, "flight must be in future");
        _;
    }

    /**
    * @dev Modifier that checks the airline funding
    */
    modifier canFund()
    {
        require(airlines.airlineStatus[tx.origin].registered, "airline is not registered");
        require(!airlines.airlineStatus[tx.origin].participated, "airline has already participated");
        require(tx.origin.balance >= PARTICIPATION_FUND, "airline must have enough balance");
        require(msg.value == PARTICIPATION_FUND, "airline must fund 10 ether");
        _;
    }

    /**
    * @dev Modifier that checks the flight insurance buy
    */
    modifier canBuy(
                        address airline,
                        string flight,
                        uint256 timestamp
                   )
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(passengers[tx.origin].boughtFlightInsurance[flightKey] + msg.value <= INSURANCE_PAY_LIMIT, "Passenger overbought the insurance.");
        require(tx.origin.balance >= 0 ether, "Passenger must have some balance to buy.");
        _;
    }

    /**
    * @dev Modifier that checks the insurance credit payout
    */
    modifier canPay()
    {
        require(passengers[tx.origin].flightInsuranceCredit > 0, "Passenger should not get credit payout.");
        require(address(this).balance >= passengers[tx.origin].flightInsuranceCredit, "Contract address has insufficient balance.");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function authorizeCaller(
                                address dataContract
                            )
                            external
                            requireContractOwner
    {
        authorizedCallers[dataContract] = 1;
    }

    function deauthorizeCaller(
                                address dataContract
                            )
                            external
                            requireContractOwner
    {
        authorizedCallers[dataContract] = 0;
    }

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            )
                            external
                            requireContractOwner
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (
                                address airline
                            )
                            external
                            requireIsOperational
                            isCallerAuthorized
                            isAirlineNotRegisteredAndFunded(tx.origin, airline)
                            canRegisterAirline(airline)
                            returns(bool, uint256)
    {
        bool success;
        uint256 votes;
        if (airlines.count < 4) {
            airlines.airlineStatus[airline].registered = true;
            airlines.airlineVotes[airline].push(tx.origin);
            success = true;
            votes = airlines.airlineVotes[airline].length;
        } else {
            airlines.airlineVotes[airline].push(tx.origin);

            if (airlines.airlineVotes[airline].length < airlines.count.div(2)) {
                success = false;
                votes = airlines.airlineVotes[airline].length;
            } else {
                airlines.airlineStatus[airline].registered = true;
                success = true;
                votes = airlines.airlineVotes[airline].length;
            }
        }

        return (success, votes);
    }

    function isAirline
                        (
                            address airline
                        )
                        external 
                        view 
                        returns(bool) 
    {
        return airlines.airlineStatus[airline].registered;
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                    address airline,
                                    string flight,
                                    uint256 timestamp
                                )
                                external
                                requireIsOperational
                                isAirlineRegisteredAndFunded(airline, airline)
                                canRegisterFlight(airline, flight, timestamp)
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        flights[flightKey] = Flight(true, STATUS_CODE_UNKNOWN, timestamp, airline);
    }

    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (   
                                address airline,
                                string flight,
                                uint256 timestamp                          
                            )
                            external
                            requireIsOperational
                            requireExternallyOwnedAccount
                            isFlightRegistered(airline, flight, timestamp)
                            canBuy(airline, flight, timestamp)
                            payable
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        passengers[tx.origin].boughtFlightInsurance[flightKey] += msg.value;
        passengerAddresses.push(tx.origin);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address airline,
                                    string flight,
                                    uint256 timestamp
                                )
                                external
                                requireIsOperational
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        for(uint c=0; c<passengerAddresses.length; c++) {
            Passenger storage passenger = passengers[passengerAddresses[c]];
            if (passenger.boughtFlightInsurance[flightKey] > 0) {
                // credit 1.5x insurance amount
                passenger.flightInsuranceCredit += passenger.boughtFlightInsurance[flightKey].mul(3).div(2);
                passenger.boughtFlightInsurance[flightKey] = 0;
            }
        }
    }

    /**
    *  @dev Get insuree's credit
    */
    function getInsureeCredit
                                (
                                )
                                external
                                view
                                returns (uint256)
    {
        return passengers[tx.origin].flightInsuranceCredit;
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            canPay
                            requireIsOperational
                            requireExternallyOwnedAccount
    {
        uint256 credit = passengers[tx.origin].flightInsuranceCredit;
        passengers[tx.origin].flightInsuranceCredit = 0;
        tx.origin.transfer(credit); 
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            canFund
                            requireIsOperational
                            requireExternallyOwnedAccount
                            payable
    {
        airlines.count = airlines.count.add(1);
        airlines.airlineStatus[tx.origin].participated = true;
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

