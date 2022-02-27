
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
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
 
  it('(airline) can register an Airline using registerAirline() after it is funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    let funds = await config.flightSuretyData.PARTICIPATION_FUND.call();

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
    // first airline alone cannot register fifth airline
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
    let funds = await config.flightSuretyData.PARTICIPATION_FUND.call();

    // ACT
    // second airline can register fifth airline
    await config.flightSuretyApp.registerAirline(fifthAirline, {from: secondAirline});
    // fifth airline is registered and funded now
    await config.flightSuretyData.fund({from: fifthAirline, value: funds});

    let result = await config.flightSuretyData.isAirline.call(fifthAirline); 

    // ASSERT
    assert.equal(result, true, "Fifth airline should be registered now.");
  });
});
