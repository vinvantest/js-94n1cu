'use strict';

const helper = require('../helper/helper.js');

function handleGET(req, res) {
    // Do something with the PUT request
    res.status(403).send('Forbidden!');
}

function handlePUT(req, res) {
    // Do something with the PUT request
    res.status(403).send('Forbidden!');
}

function handleDELETE(req, res) {
    // Do something with the PUT request
    res.status(403).send('Forbidden!');
}

function handleOPTIONS(req, res) {
    // console.log('inside handleOPTIONS()');
    //console.log('req.headers ='+req.headers['ORIGIN']);
    var originVal = null;
    for (var name in req.headers) {
        if (name.indexOf('origin') !== -1) {
            originVal = req.headers[name];
            // console.log('Found origin in header =' + req.headers[name]);
        }
    }
    if (originVal != null) {
        var boolFound = false;
        for (var i = 0; i < helper.serverConfig.whitelist.length; i++) {
            if (helper.serverConfig.whitelist[i] === originVal) {
                boolFound = true;
            }
        }
        if (boolFound) {
            // console.log('header found in whitelist');
            res.set('Content-Type', 'application/json')
                .set('Access-Control-Allow-Origin', originVal)
                .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                .status(204)
                .send('Options Success');
        } else {
            console.log('Error: header NOT found in whitelist');
            res.set('Content-Type', 'application/json')
                .set('Access-Control-Allow-Origin', originVal)
                .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                .status(403)
                .send('Error: You cannot repeat this request. Domain forbidden');
        }
    } else {
        res.set('Content-Type', 'application/json')
            //.set('Access-Control-Allow-Origin', req.headers['ORIGIN'])
            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
            .status(403)
            .send('Error:You cannot repeat this request. Domain forbidden');
    }

}

async function handleOriginAndAuth(req, res, logging, admin, database, stripe) {
    // Do something with the GET request
    var originVal = null;
    var idToken = null;
    for (var name in req.headers) {
        res.set(name, req.headers[name]);
        if (name.indexOf('origin') !== -1) {
            originVal = req.headers[name];
            //console.log('Found origin in header ='+req.headers[name]);
        }
        if (name.indexOf('authorization') !== -1) {
            idToken = req.headers[name];
            //console.log('idToken = '+idToken);
        }
    }
    if (!req.headers || !req.headers.authorization) {
        res.status(401).send('No authorization token found.');
        return;
    }
    const parts = req.headers.authorization.split(' ');
    if (parts.length != 2) {
        res.status(401).send('Bad credential format.');
        return;
    }
    const scheme = parts[0];
    const credentials = parts[1];

    if (!/^Bearer$/i.test(scheme)) {
        res.status(401).send('Bad credential format.');
        return;
    }
    // idToken comes from the client app (shown above)
    if (credentials != null || credentials != undefined) {
        admin.auth().verifyIdToken(credentials)
            .then(async function (decodedToken) {
                var uid = decodedToken.uid;
                // console.log(uid + 'AuthToken Verified and uid');
                // if(req.query.guid === uid) // GET
                if (req.body.guid === uid) // POST
                    handlePOST(req, res, logging, admin, database, stripe);
                else
                    return res.status(401).send('Unauthorized access');
            }).catch(function (error) {
                // Handle error
                console.log('AuthTokenId verification Failed! -' + error);
                return res.status(401).send('Error in Authorization');
            });
    } else {
        conole.log('AuthTokenId verification Failed! -' + error);
        return res.status(401).send('Not Authorized');
    }

}

async function handlePOST(req, res, logging, admin, database, stripe) {
    let { name, email, amount, stripeToken, guid } = req.body;
    await helper.reportJSON(logging, { name, email, amount, stripeToken, guid }, { user: guid });
    console.log(`Request params: name = ${name}, email = ${email}, amount = ${amount}, stripeToken = ${stripeToken}, guid = ${guid}`)
    if (!name || !email || !amount || !stripeToken || !guid) {
        await helper.reportJSON(logging, { name, email, amount, stripeToken, guid }, { user: guid });
        // helper.failure(res,`Require all parameters: name = ${name}, email = ${email}`, 422);
        res.set('Content-Type', 'application/json')
            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
            .status(422)
            .send(`Require all parameters: name = ${name}, email = ${email} and amount = ${amount}`);
        return;
    }
    else {
        stripe.customers
            .create({
                name: req.body.name,
                email: req.body.email,
                source: req.body.stripeToken.id
            })
            .then(async (customer) => {
                console.log(`Strip customer created: ${JSON.stringify(customer)}`);
                return stripe.charges.create({
                    amount: parseInt(''+parseFloat(req.body.amount).toFixed(2) * 100),
                    currency: "usd",
                    customer: customer.id
                });
            })
            .then(async (charge) => {
                await database.ref('users/' + guid).child('/consumption').set(5); //reset comsumption
                console.log(`Strip charge created: ${JSON.stringify(charge)}`);
                var response = {
                    'status': 'success',
                    'successFlag': true,
                    'data': 'charge created successfully'
                };
                res.set('Content-Type', 'application/json');
                res.set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`); //comment this line for google api direct use
                res.set('Access-Control-Allow-Headers', 'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token, Authorization, X-Requested-With');
                res.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
                res.set('Access-Control-Expose-Headers', 'X-Api-Version, X-Request-Id, X-Response-Time');
                res.set('Access-Control-Max-Age', '1000');
                res.status(200).send(response);
            })
            .catch(async (err) => {
                console.log("Stripe charge error", JSON.stringify(err));
                await helper.reportError(logging, err, { user: guid });
                switch (err.type) {
                    case 'StripeCardError':
                        var response = {
                            'status': 'failed',
                            'successFlag': false,
                            'errorCode' : 404,
                            'data': err.message
                        };
                        // A declined card error
                        // err.message; // => e.g. "Your card's expiration year is invalid."
                        res.set('Content-Type', 'application/json')
                            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                            .status(404) //bad card
                            .send(response);
                        break;
                    case 'StripeInvalidRequestError':
                        // Invalid parameters were supplied to Stripe's API
                        res.set('Content-Type', 'application/json')
                            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                            .status(500)
                            .send('Invalid parameters were supplied');
                        break;
                    case 'StripeAPIError':
                        // An error occurred internally with Stripe's API
                        res.set('Content-Type', 'application/json')
                            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                            .status(500)
                            .send('Internal payment gateway error');
                        break;
                    case 'StripeConnectionError':
                        // Some kind of error occurred during the HTTPS communication
                        res.set('Content-Type', 'application/json')
                            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                            .status(500)
                            .send('Some kind of error occurred during the HTTPS communication');
                        break;
                    case 'StripeAuthenticationError':
                        // You probably used an incorrect API key
                        res.set('Content-Type', 'application/json')
                            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                            .status(500)
                            .send('Internal Server Error: Invalid api key');
                        break;
                    case 'StripeRateLimitError':
                        // Too many requests hit the API too quickly
                        res.set('Content-Type', 'application/json')
                            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                            .status(500)
                            .send('Internal Server Error: Too many hits from client');
                        break;
                    default:
                        res.set('Content-Type', 'application/json')
                            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                            .status(500)
                            .send('Stripe charge error');
                        break;
                }
            });
    }
}

exports.handler = async function (req, res, logging, admin, database, stripe) {
    switch (req.method) {
        case 'GET':
            handleGET(req, res);
            break;
        case 'PUT':
            handlePUT(req, res);
            break;
        case 'POST':
            handleOriginAndAuth(req, res, logging, admin, database, stripe);
            break;
        case 'DELETE':
            handleDELETE(req, res);
            break;
        case 'OPTIONS':
            handleOPTIONS(req, res);
            break;
        default:
            res.status(500).send({
                error: 'Something blew up!'
            });
            break;
    }
};