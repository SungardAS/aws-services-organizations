
var sleep = require('sleep');
var AWS = require('aws-sdk');

var baseHandler = require('aws-services-lib/lambda/base_handler.js')

exports.handler = (event, context) => {
  baseHandler.handler(event, context);
}

baseHandler.get = function(params, callback) {
  var credentials = new AWS.Credentials({
    accessKeyId: params.credentials.AccessKeyId,
    secretAccessKey: params.credentials.SecretAccessKey,
    sessionToken: params.credentials.SessionToken
  });
  var organizations = new AWS.Organizations({region: process.env.REGION, credentials:credentials});
  if (params.accountId) {
    // find detail of the given account
    var input = {
      AccountId: params.accountId
    };
    organizations.describeAccount(input, function(err, data) {
      if (err) {
        console.log(err, err.stack);
        callback(err);
      }
      else {
        console.log(data);
        callback(null, data);
      }
    });
  }
  else if (params.requestId) {
    var input = {
      CreateAccountRequestId: params.requestId
    };
    organizations.describeCreateAccountStatus(input, function(err, data) {
      if (err) {
        console.log(err, err.stack);
        callback(err);
      }
      else {
        console.log(data);
        callback(null, data);
      }
    });
  }
  else {
    // find account list
    var input = {
      //MaxResults: 0,
      //NextToken: 'STRING_VALUE'
    };
    var accounts = [];
    getAccounts(organizations, accounts, input, function(err, data) {
      if (err) {
        console.log(err, err.stack);
        callback(err);
      }
      else {
        console.log(`${data.length} accounts are found`);
        console.log(data);
        callback(null, data);
      }
    });
  }
};

baseHandler.post = function(params, callback) {
  var credentials = new AWS.Credentials({
    accessKeyId: params.credentials.AccessKeyId,
    secretAccessKey: params.credentials.SecretAccessKey,
    sessionToken: params.credentials.SessionToken
  });
  var input = {
    AccountName: params.name,
    Email: params.email
    //IamUserAccessToBilling: 'ALLOW | DENY',
    //RoleName: 'STRING_VALUE'
  };
  var organizations = new AWS.Organizations({region: process.env.AWS_DEFAULT_REGION, credentials:credentials});
  organizations.createAccount(input, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      callback(err);
    }
    else {
      console.log(`account creation has been started, ${params.name}`);
      console.log(data);
      if (params.checkStatus) {
        input = {
          CreateAccountRequestId: data.CreateAccountStatus.Id
        };
        checkCreationStatus(organizations, input, callback);
      }
      else {
        callback(null, data);
      }
    }
  });
};

function getAccounts(organizations, accounts, input, callback) {
  organizations.listAccounts(input, function(err, data) {
    if (err) callback(err);
    else {
      console.log(data);
      data.Accounts.forEach(function(account) {
        accounts.push(account);
      });
      if (data.NextToken) {
        input.NextToken = data.NextToken;
        getAccounts(organizations, accounts, input, callback);
      }
      else {
        callback(null, accounts);
      }
    }
  });
}

function checkCreationStatus(organizations, input, callback) {
  organizations.describeCreateAccountStatus(input, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      callback(err);
    }
    else {
      console.log(data);
      if (data.CreateAccountStatus.State == "IN_PROGRESS") {
        console.log("CreateAccountStatus is IN_PROGRESS, so check again...")
        sleep.sleep(5); //sleep for 5 seconds
        checkCreationStatus(organizations, input, callback);
      }
      else {
        callback(null, data);
      }
    }
  });
}
