
var Test = require('../config/testConfig.js');
var BN = require('bn.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  let now = Date.now();
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
    
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
      let reverted = false;

      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
        reverted = true;
        assert.equal(e.reason, "Caller is not contract owner", "Access must be restricted to owner.");
      }

      assert.equal(reverted, true, "Call must be reverted.");

      let status = await config.flightSuretyData.isOperational.call();
      assert.equal(status, true, "Access restricted to non-Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
      let reverted = false;

      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.owner });
      }
      catch(e) {
      }

      assert.equal(reverted, false, "Call must not be reverted.");

      let status = await config.flightSuretyData.isOperational.call();
      assert.equal(status, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false, { from: config.owner });

      // ARRANGE
      let newAirline = accounts[2];
      let reverted = false;

      try 
      {
          await config.flightSuretyApp.registerAirline.call(newAirline, {from: config.firstAirline});
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true, { from: config.owner });

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    let reverted = false;

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "the caller airline has not paid participation fee.", "The caller cannot register.");
    }

    assert.equal(reverted, true, "New airline registration should be reverted.");      

    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding.");

  });
 
  it('(airline) cannot register an Airline using registerAirline() because it is under funding', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    let funds = await config.flightSuretyData.PARTICIPATION_FUND.call() / 2;
    let reverted = false;

    // ACT
    await config.flightSuretyData.fund({from: config.firstAirline, value: funds});
    try {
      await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "the caller airline has not paid participation fee.", "The caller cannot register.");
    }

    assert.equal(reverted, true, "New airline registration should be reverted.");      

    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT

    assert.equal(result, false, "Airline should not be able to register another airline since it is under funding");

  });

  it('(airline) cannot register an Airline using registerAirline() because it is over funding', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    let funds = await config.flightSuretyData.PARTICIPATION_FUND.call();
    let reverted = false;

    // ACT
    try {
      await config.flightSuretyData.fund({from: config.firstAirline, value: funds});
      await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {
      reverted = true;
      console.log("WTF " + e.reason)
      assert.equal(e.reason, "Airline over funded the surety", "The caller cannot register.");
    }

    assert.equal(reverted, true, "New airline registration should be reverted.");      

    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT

    assert.equal(result, false, "Airline should not be able to register another airline since it is under funding");

  });

  it('(airline) can register an Airline using registerAirline() after it is funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    let funds = await config.flightSuretyData.PARTICIPATION_FUND.call() / 2;

    // ACT
    // first airline is registered and funded now
    await config.flightSuretyData.fund({from: config.firstAirline, value: funds});
    await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});

    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT

    assert.equal(result, true, "Airline should be able to register another airline since it has provided funding");

  });

  it('second (airline) can register third Airline using registerAirline() after it is funded', async () => {
    
    // ARRANGE
    let secondAirline = accounts[2];
    let thirdAirline = accounts[3];
    let funds = await config.flightSuretyData.PARTICIPATION_FUND.call();

    // ACT
    // second airline is registered and funded now
    await config.flightSuretyData.fund({from: secondAirline, value: funds});
    await config.flightSuretyApp.registerAirline(thirdAirline, {from: config.firstAirline});

    let result = await config.flightSuretyData.isAirline.call(thirdAirline); 

    // ASSERT
    assert.equal(result, true, "Airline should be able to register another airline since it has provided funding");

  });

  it('third (airline) can register fourth Airline using registerAirline() after it is funded', async () => {
    
    // ARRANGE
    let thirdAirline = accounts[3];
    let fourthAirline = accounts[4];
    let funds = await config.flightSuretyData.PARTICIPATION_FUND.call();

    // ACT
    // third airline is registered and funded now
    await config.flightSuretyData.fund({from: thirdAirline, value: funds});
    await config.flightSuretyApp.registerAirline(fourthAirline, {from: config.firstAirline});


    let result = await config.flightSuretyData.isAirline.call(fourthAirline); 

    // ASSERT
    assert.equal(result, true, "Airline should be able to register another airline since it has provided funding");

  });

  it('fourth (airline) cannot register fifth Airline using registerAirline() because of multi-party consensus', async () => {
    
    // ARRANGE
    let fourthAirline = accounts[4];
    let fifthAirline = accounts[5];
    let funds = await config.flightSuretyData.PARTICIPATION_FUND.call();

    // ACT
    // fourth airline is registered and funded now
    await config.flightSuretyData.fund({from: fourthAirline, value: funds});
    // fourth airline alone cannot register fifth airline
    await config.flightSuretyApp.registerAirline(fifthAirline, {from: fourthAirline});

    let result = await config.flightSuretyData.isAirline.call(fifthAirline); 

    // ASSERT
    assert.equal(result, false, "Fifth airline should not be registered yet, because of insufficient votes");

  });

  it('fourth (airline) cannot register fifth Airline using registerAirline() again', async () => {
    
    // ARRANGE
    let fourthAirline = accounts[4];
    let fifthAirline = accounts[5];
    let reverted = false;

    // ACT
    // fourth airline cannot register fifth airline again
    try {
      await config.flightSuretyApp.registerAirline(fifthAirline, {from: fourthAirline});
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "the caller airline has already voted for passed in airline.", "revert reason must be double voting.");
    }

    // ASSERT
    assert.equal(reverted, true, "Fourth line cannot register fifth airline again.");
  });

  it('one more (airline) can register fifth Airline using registerAirline() because of multi-party consensus', async () => {
    
    // ARRANGE
    let secondAirline = accounts[2];
    let fifthAirline = accounts[5];

    // ACT
    // second airline can register fifth airline
    await config.flightSuretyApp.registerAirline(fifthAirline, {from: secondAirline});

    let result = await config.flightSuretyData.isAirline.call(fifthAirline); 

    // ASSERT
    assert.equal(result, true, "Fifth airline should be registered now.");
  });

  it('fifth (airline) cannot register sixth Airline using registerAirline() because of no funding', async () => {
    
    // ARRANGE
    let fifthAirline = accounts[5];
    let sixthAirline = accounts[6];
    let reverted = false;

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(sixthAirline, {from: fifthAirline});
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "the caller airline has not paid participation fee.", "The caller cannot register.");
    }

    assert.equal(reverted, true, "New airline registration should be reverted.");      

    let result = await config.flightSuretyData.isAirline.call(sixthAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding.");

  });

  it('fifth (airline) cannot register sixth Airline using registerAirline() because of multi-party consensus', async () => {
    
    // ARRANGE
    let fifthAirline = accounts[5];
    let sixthAirline = accounts[6];
    let funds = await config.flightSuretyData.PARTICIPATION_FUND.call();

    // ACT
    // fifth airline is registered and funded now
    await config.flightSuretyData.fund({from: fifthAirline, value: funds});
    // fifth airline alone cannot register sixth airline
    await config.flightSuretyApp.registerAirline(sixthAirline, {from: fifthAirline});

    let result = await config.flightSuretyData.isAirline.call(sixthAirline); 

    // ASSERT
    assert.equal(result, false, "Sixth airline should not be registered yet, because of insufficient votes");

  });

  it('fifth (airline) cannot register sixth Airline using registerAirline() again', async () => {
    
    // ARRANGE
    let fifthAirline = accounts[5];
    let sixthAirline = accounts[6];
    let reverted = false;

    // ACT
    // fifth airline cannot register sixth airline again
    try {
      await config.flightSuretyApp.registerAirline(sixthAirline, {from: fifthAirline});
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "the caller airline has already voted for passed in airline.", "revert reason must be double voting.");
    }

    // ASSERT
    assert.equal(reverted, true, "Fifth line cannot register sixth airline again.");
  });

  it('one more (airline) can register sixth Airline using registerAirline() because of multi-party consensus', async () => {
    
    // ARRANGE
    let secondAirline = accounts[2];
    let sixthAirline = accounts[6];
    let funds = await config.flightSuretyData.PARTICIPATION_FUND.call();

    // ACT
    // second airline can register sixth airline
    await config.flightSuretyApp.registerAirline(sixthAirline, {from: secondAirline});
    // sixth airline is registered and funded now
    await config.flightSuretyData.fund({from: sixthAirline, value: funds});

    let result = await config.flightSuretyData.isAirline.call(sixthAirline); 

    // ASSERT
    assert.equal(result, true, "Sixth airline should be registered now.");
  });

  it('Seventh airline cannot register flight using registerFlight() because of no registration', async () => {
    
    // ARRANGE
    let seventhAirline = accounts[7];
    let reverted = false;

    try {
      // ACT
      // seventh airline can register first flight
      await config.flightSuretyApp.registerFlight(seventhAirline, "FirstFlight", Math.floor(now / 1000) + 60000);
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "airline is not registered yet.", "revert reason must be airline not registered yet.");
    }

    // ASSERT
    assert.equal(reverted, true, "Seventh airline cannot register flight.");

  });

  it('First airline cannot register flight using registerFlight() because of past timestamp', async () => {
    
    // ARRANGE
    let reverted = false;

    try {
      // ACT
      // seventh airline can register first flight
      await config.flightSuretyApp.registerFlight(config.firstAirline, "FirstFlight", Math.floor(now / 1000) - 60000);
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "flight must be in future", "revert reason must be flight must be in future.");
    }

    // ASSERT
    assert.equal(reverted, true, "First airline cannot register flight.");

  });

  it('First airline can register flight using registerFlight()', async () => {
    
    // ARRANGE
    let timestamp = Math.floor(now / 1000) + 60000;

    // ACT
    // first airline can register first flight
    await config.flightSuretyApp.registerFlight(config.firstAirline, "FirstFlight", timestamp);

   let flightStatus= await config.flightSuretyData.viewFlightStatus.call(config.firstAirline, "FirstFlight", timestamp);

   // ASSERT
   assert.equal(flightStatus, 0, "Flight status code should be 0");
  });

  it('First airline cannot register flight using registerFlight() because of double registration', async () => {
    
    // ARRANGE
    let reverted = false;

    try {
      // ACT
      // seventh airline can register first flight
      await config.flightSuretyApp.registerFlight(config.firstAirline, "FirstFlight", Math.floor(now / 1000) + 60000);
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "flight is already registered", "revert reason must be flight is already registered.");
    }

    // ASSERT
    assert.equal(reverted, true, "First airline cannot register flight again.");

  });

  it('Passenger cannot buy insurance for first flight using registerFlight() because of over paid amount', async () => {
    
    // ARRANGE
    let reverted = false;
    let passenger = accounts[8];
    let funds = await config.flightSuretyData.INSURANCE_PAY_LIMIT.call() * 2;

    try {
      // ACT
      // passenger cannot buy insurance for the first flight
      await config.flightSuretyData.buy(config.firstAirline, "FirstFlight", Math.floor(now / 1000) + 60000, {from: passenger, value: funds});
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "Passenger overbought the insurance.", "Revert reason must be passenger overbought the insurance.");
    }

    // ASSERT
    assert.equal(reverted, true, "Passenger overbought the insurance.");

  });

  it('Passenger cannot buy insurance for second flight using registerFlight() because not registered', async () => {
    
    // ARRANGE
    let reverted = false;
    let passenger = accounts[8];
    let funds = await config.flightSuretyData.INSURANCE_PAY_LIMIT.call();

    try {
      // ACT
      // passenger cannot buy insurance for the first flight
      await config.flightSuretyData.buy(config.firstAirline, "SecondFlight", Math.floor(now / 1000) + 60000, {from: passenger, value: funds});
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "Flight is not registered yet.", "Revert reason must be not registered flight.");
    }

    // ASSERT
    assert.equal(reverted, true, "Flight is not registered yet.");

  });

  it('Passenger buy half of the insurance for first flight using registerFlight()', async () => {
    
    // ARRANGE
    let passenger = accounts[8];
    let funds = await config.flightSuretyData.INSURANCE_PAY_LIMIT.call() / 2;

    // ACT
    // passenger can buy insurance for the first flight
    await config.flightSuretyData.buy(config.firstAirline, "FirstFlight", Math.floor(now / 1000) + 60000, {from: passenger, value: funds});

  });

  it('Passenger buy another half of the insurance for first flight using registerFlight()', async () => {
    
    // ARRANGE
    let passenger = accounts[8];
    let funds = await config.flightSuretyData.INSURANCE_PAY_LIMIT.call() / 2;

    // ACT
    // passenger can buy insurance for the first flight
    await config.flightSuretyData.buy(config.firstAirline, "FirstFlight", Math.floor(now / 1000) + 60000, {from: passenger, value: funds});

  });

  it('Passenger cannot buy insurance for first flight using registerFlight() because of over paid amount', async () => {
    
    // ARRANGE
    let reverted = false;
    let passenger = accounts[8];

    try {
      // ACT
      // passenger cannot buy insurance for the first flight
      await config.flightSuretyData.buy(config.firstAirline, "FirstFlight", Math.floor(now / 1000) + 60000, {from: passenger, value: web3.utils.toWei(web3.utils.toBN(1))});
    }
    catch(e) {
      reverted = true;
      assert.equal(e.reason, "Passenger overbought the insurance.", "Revert reason must be passenger overbought the insurance.");
    }

    // ASSERT
    assert.equal(reverted, true, "Passenger overbought the insurance.");

  });

  it('Second Passenger buy half of the insurance for first flight using registerFlight()', async () => {
    
    // ARRANGE
    let passenger = accounts[9];
    let funds = await config.flightSuretyData.INSURANCE_PAY_LIMIT.call() * 1 / 2;

    // ACT
    // passenger can buy insurance for the first flight
    await config.flightSuretyData.buy(config.firstAirline, "FirstFlight", Math.floor(now / 1000) + 60000, {from: passenger, value: funds});

  });

  it('Smart contract credit insurees for the first flight using creditInsurees()', async () => {
    
    // ARRANGE
    let firstPassenger = accounts[8];
    let secondPassenger = accounts[9];
    let funds = await config.flightSuretyData.INSURANCE_PAY_LIMIT.call();

    // ACT
    // passenger can get credited insurance for the first flight
    await config.flightSuretyData.creditInsurees(config.firstAirline, "FirstFlight", Math.floor(now / 1000) + 60000);

    // ASSERT
    let firstPassengerCredit = await config.flightSuretyData.getInsureeCredit.call({from: firstPassenger});
    assert.equal(firstPassengerCredit.toString(10), (funds * 3 / 2).toString(10), "first passenger should get 1.5 ether");
    let secondPassengerCredit = await config.flightSuretyData.getInsureeCredit.call({from: secondPassenger});
    assert.equal(secondPassengerCredit.toString(10), (funds * 3 / 4).toString(10), "second passenger should get 1 ether");

  });

  it('Smart contract credit insurees for the first flight using creditInsurees() again', async () => {
    
    // ARRANGE
    let firstPassenger = accounts[8];
    let secondPassenger = accounts[9];
    let funds = await config.flightSuretyData.INSURANCE_PAY_LIMIT.call();

    // ACT
    // passenger cannot get credited insurance for the first flight again
    await config.flightSuretyData.creditInsurees(config.firstAirline, "FirstFlight", Math.floor(now / 1000) + 60000);

    // ASSERT
    let firstPassengerCredit = await config.flightSuretyData.getInsureeCredit.call({from: firstPassenger});
    assert.equal(firstPassengerCredit.toString(10), (funds * 3 / 2).toString(10), "first passenger should get 1.5 ether");
    let secondPassengerCredit = await config.flightSuretyData.getInsureeCredit.call({from: secondPassenger});
    assert.equal(secondPassengerCredit.toString(10), (funds * 3 / 4).toString(10), "second passenger should get 1 ether");

  });

  it('Smart contract pays out the credit to passengers', async () => {
    
    // ARRANGE
    let firstPassenger = accounts[8];
    let secondPassenger = accounts[9];

    // ACT
    // passenger can get credited insurance for the first flight
    await config.flightSuretyData.pay({from: firstPassenger});
    await config.flightSuretyData.pay({from: secondPassenger});

  });

});
