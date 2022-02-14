pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

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
        airlines.count.add(1);
        airlines.airlineStatus[firstAirline].registered = true;
        airlines.airlineStatus[firstAirline].participated = true;
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
    * @dev Modifier that checks the airline registration requirements
    */
    modifier requireCanRegisterAirline(address airline)
    {
        if (airlines.count > 0 && airlines.count < 4) {
            require(!airlines.airlineStatus[airline].registered, "airline is already registered");
            require(airlines.airlineStatus[msg.sender].participated, "the caller airline has not paid participation fee.");
            _;
        }

        if (airlines.count >= 4) {
            bool isDuplicate = false;
            for(uint c=0; c<airlines.airlineVotes[airline].length; c++) {
                if (airlines.airlineVotes[airline][c] == msg.sender) {
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "the caller airline has already voted for passed in airline.");
            _;
        }
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

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
                            requireCanRegisterAirline(airline)
                            returns(bool success, uint256 votes)
    {
        if (airlines.count < 4) {
            airlines.airlineStatus[airline].registered = true;
            airlines.airlineVotes[airline].push(msg.sender);
            return (true, 1);
        } else {
            airlines.airlineVotes[airline].push(msg.sender);
            if (airlines.airlineVotes[airline].length < airlines.count.div(2)) {
                return (false, airlines.airlineVotes[airline].length);
            } else {
                airlines.airlineStatus[airline].registered = true;
                return (true, airlines.airlineVotes[airline].length);
            }
        }
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            )
                            external
                            payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
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
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
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

