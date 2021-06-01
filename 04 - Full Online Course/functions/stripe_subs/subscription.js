'use strict';

//TODO: https://stripe.com/docs/billing/testing

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

async function handleOriginAndAuth(req, res, logging, admin, database, stripe, stripe_basic_planprice_id, stripe_pro_planprice_id) {
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
                    handlePOST(req, res, logging, admin, database, stripe, stripe_basic_planprice_id, stripe_pro_planprice_id);
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

async function handlePOST(req, res, logging, admin, database, stripe, stripe_basic_planprice_id, stripe_pro_planprice_id) {
    let { name, email, plan, paymentMethodId, guid } = req.body;
    await helper.reportJSON(logging, { name, email, plan, paymentMethodId, guid }, { user: guid });
    console.log(`Request params: name = ${name}, email = ${email}, plan = ${plan}, paymentMethodId = ${JSON.stringify(paymentMethodId)}, guid = ${guid}`)
    if (!name || !email || !plan || !paymentMethodId || !guid) {
        await helper.reportJSON(logging, { name, email, plan, paymentMethodId, guid }, { user: guid });
        // helper.failure(res,`Require all parameters: name = ${name}, email = ${email}`, 422);
        res.set('Content-Type', 'application/json')
            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
            .status(422)
            .send(`Require all parameters: name = ${name}, email = ${email} and plan = ${plan} & paymentMethod`);
        return;
    }
    else {
        try {
            /* Create customer and set default payment method */
            let customer = await stripe.customers.create({
                payment_method: paymentMethodId,
                email: email,
                name: name,
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
            helper.reportJSON(logging,customer,{user: guid});
            console.log(`Customer Created Success: ${JSON.stringify(customer)}`);
            /* Create subscription and expand the latest invoice's Payment Intent 
             * We'll check this Payment Intent's status to determine if this payment needs SCA
             */
            let subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [{
                    plan: plan === 'basic' ? stripe_basic_planprice_id : stripe_pro_planprice_id,
                }],
                // trial_from_plan: true,
                expand: ["latest_invoice.payment_intent"],
            });
            helper.reportJSON(logging,subscription,{user: guid});
            console.log(`Subscription Success: ${JSON.stringify(subscription)}`);

            res.set('Content-Type', 'application/json');
            res.set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`); //comment this line for google api direct use
            res.set('Access-Control-Allow-Headers', 'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token, Authorization, X-Requested-With');
            res.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
            res.set('Access-Control-Expose-Headers', 'X-Api-Version, X-Request-Id, X-Response-Time');
            res.set('Access-Control-Max-Age', '1000');
            res.status(200).send(subscription);
            return;
        } catch (error) {
            helper.reportError(logging, error, { user: guid });
            console.log(`Error in try catch block ${JSON.stringify(error)}`);
            res.set('Content-Type', 'application/json')
                .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                .status(500)
                .send('Stripe charge error');
                return;
        }
    }
}

exports.handler = async function (req, res, logging, admin, database, stripe, stripe_basic_planprice_id, stripe_pro_planprice_id) {
    switch (req.method) {
        case 'GET':
            handleGET(req, res);
            break;
        case 'PUT':
            handlePUT(req, res);
            break;
        case 'POST':
            handleOriginAndAuth(req, res, logging, admin, database, stripe, stripe_basic_planprice_id, stripe_pro_planprice_id);
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