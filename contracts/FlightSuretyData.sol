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
    uint public constant PARTICIPATION_FUND = 10 ether;


    struct AirlineStatus {
        bool registered;
        bool participated;
    }

    struct Airlines {
        mapping (address => address[]) airlineVotes;
        mapping (address => AirlineStatus) airlineStatus;
    }

    Airlines private airlines;
    uint256 count;

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
        count = 0;
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
    * @dev Modifier that requires the "authorized" account to be the function caller
    */
    modifier isCallerAuthorized()
    {
        require(authorizedCallers[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    /**
    * @dev Modifier that checks the airline registration requirements
    */
    modifier canRegisterAirline(address airline)
    {
        if (count < 4) {
            require(!airlines.airlineStatus[airline].registered, "airline is already registered");
            require(airlines.airlineStatus[tx.origin].participated, "the caller airline has not paid participation fee.");
            _;
        } else {
            bool isDuplicate = false;
            for(uint c=0; c<airlines.airlineVotes[airline].length; c++) {
                if (airlines.airlineVotes[airline][c] == tx.origin) {
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "the caller airline has already voted for passed in airline.");
            _;
        }
    }

    /**
    * @dev Modifier that checks the airline funding
    */
    modifier canFund()
    {
        require(airlines.airlineStatus[tx.origin].registered, "airline is not registered");
        require(!airlines.airlineStatus[tx.origin].participated, "airline has already participated");
        require(msg.value == PARTICIPATION_FUND, "airline must fund 10 ether");
        require(tx.origin.balance >= PARTICIPATION_FUND, "airline must have enough balance");
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
                            canRegisterAirline(airline)
                            returns(bool, uint256)
    {
        bool success;
        uint256 votes;
        if (count < 4) {
            airlines.airlineStatus[airline].registered = true;
            airlines.airlineVotes[airline].push(tx.origin);
            success = true;
            votes = airlines.airlineVotes[airline].length;
        } else {
            airlines.airlineVotes[airline].push(tx.origin);

            if (airlines.airlineVotes[airline].length < count.div(2)) {
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
                        public 
                        view 
                        returns(bool) 
    {
        return airlines.airlineStatus[airline].registered;
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
                            canFund
                            payable
    {
        count = count.add(1);
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

