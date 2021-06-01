'use strict';

const helper = require('../helper/helper.js');

function handleGET(req, res) {
    res.status(403).send('Forbidden!');
}

function handlePUT(req, res) {
    res.status(403).send('Forbidden!');
}

function handleDELETE(req, res) {
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
            console.log('header NOT found in whitelist');
            res.set('Content-Type', 'application/json')
                .set('Access-Control-Allow-Origin', originVal)
                .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                .status(403)
                .send('Error: CloudImage- You cannot repeat this request. Domain forbidden');
        }
    } else {
        res.set('Content-Type', 'application/json')
            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
            .status(403)
            .send('Error: CloudImage- You cannot repeat this request. Domain forbidden');
    }
}

async function handlePOST(req, res, logging, recaptcha_secret_key) {
    const response = req.body.response;
    const rp = require('request-promise');
    // console.log("recaptcha response", response);
    rp({
        uri: 'https://recaptcha.google.com/recaptcha/api/siteverify',
        method: 'POST',
        formData: {
            secret: recaptcha_secret_key,
            response: response
        },
        json: true
    }).then(async (result) => {
        console.log("recaptcha result", JSON.stringify(result));
        await helper.reportJSON(logging,result,{user: 'system'});
        if (result.hostname.indexOf(`${helper.serverConfig.host_name}`) !== -1) {
            if (result.success) {
                res.set('Content-Type', 'application/json')
                    .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                    .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                    .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                    .status(200)
                    .send({
                        'success': result.score > 0.1 ? result.success : false, //0.5
                        'score': result.score
                    });
            }
            else {
                res.set('Content-Type', 'application/json')
                    .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                    .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                    .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                    .status(400)
                    .send({
                        'success': false,
                        'score': result.score
                    });
            }
        }
        else {
            res.set('Content-Type', 'application/json')
                .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                .status(400)
                .send({
                    'success': false,
                    'score': 0.0
                });
        }
    }).catch(async (reason) => {
        console.log("Recaptcha request failure", reason);
        await helper.reportError(logging, reason, {user : 'system'});
        res.set('Content-Type', 'application/json')
            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
            .status(500)
            .send('Recaptcha request failure');
    });
}

exports.handler = async function (req, res, logging, recaptcha_secret_key) {
    switch (req.method) {
        case 'GET':
            handleGET(req, res);
            break;
        case 'PUT':
            handlePUT(req, res);
            break;
        case 'POST':
            handlePOST(req, res, logging, recaptcha_secret_key);
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

// {
//     "success": true | false,      // whether this request was a valid reCAPTCHA token for your site
//         "score": number             // the score for this request (0.0 - 1.0)
//     "action": string            // the action name for this request (important to verify)
//     "challenge_ts": timestamp,  // timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
//         "hostname": string,         // the hostname of the site where the reCAPTCHA was solved
//             "error-codes": [...]        // optional
// }
