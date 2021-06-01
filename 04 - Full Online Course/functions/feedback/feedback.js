'use strict';

const helper = require('../helper/helper.js');
const { WebClient } = require('@slack/web-api');
const APP_NAME = helper.serverConfig.email_app_name;

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
    console.log('inside handleOPTIONS()');
    //console.log('req.headers ='+req.headers['ORIGIN']);
    let originVal = null;
    for (let name in req.headers) {
        if (name.indexOf('origin') !== -1) {
            originVal = req.headers[name];
            // console.log('Found origin in header =' + req.headers[name]);
        }
    }
    if (originVal != null) {
        let boolFound = false;
        for (let i = 0; i < helper.serverConfig.whitelist.length; i++) {
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
                .send('Error: You cannot repeat this request. Domain forbidden');
        }
    } else {
        res.set('Content-Type', 'application/json')
            //.set('Access-Control-Allow-Origin', req.headers['ORIGIN'])
            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
            .status(403)
            .send('Error: You cannot repeat this request. Domain forbidden');
    }

}

async function handleOriginAndAuth(req, res, logging, admin, slack_token) {
    // Do something with the GET request
    //console.log('Inside serer.handleOriginAndAuth(getbanks)');
    let originVal = null;
    let idToken = null;
    for (let name in req.headers) {
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
                let uid = decodedToken.uid;
                // console.log(uid + 'AuthToken Verified and uid');
                // if(req.query.guid === uid) // GET
                if (req.body.guid === uid) // POST
                    handlePOST(req, res, logging, admin, slack_token);
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

async function handlePOST(req, res, logging, admin, slack_token) {
    // const body = JSON.parse(req.body);
    let body = null;
    try {
        body = JSON.parse(req.body);
    } catch (e) {
        // console.log("req.body is an object not a string");
        // You can read e for more info
        // Let's assume the error is that we already have parsed the payload
        // So just return that
        body = req.body;
    }
    // console.log('body: ' + JSON.stringify(body));
    console.log('feedback: ' + body.feedback);
    console.log('email: ' + body.email);
    console.log('photoURL: ' + body.photoURL);
    console.log('user: ' + body.user);
    console.log('guid: ' + body.guid);
    console.log('type: ' + body.type); //3: not_happy, 2: satisfied, 1: very_happy
    await helper.reportJSON(logging, {
        feedback: body.feedback, email: body.email, photoURL: body.photoURL,
        user: body.user, guid: body.guid, type: body.type
    }, { user: body.guid });

    try {
        if (body.feedback) {
            var slackChannel = helper.serverConfig.slack_satisfied;
            var markDwn = 'worried';
            const time = new Date().toISOString().slice(0, 19).replace('T', '_').replace(':', '_').replace(':', '_');
            // console.log(`time value -> ${time}`);
            //2020-08-15 21:39:31 -> 2020-08-30_19_59_46
            if (body.type === 3) {
                console.log('not happy insert');
                slackChannel = helper.serverConfig.slack_nothappy;
                markDwn = 'worried';
            }
            else if (body.type === 2) {
                console.log('satisfied insert');
                slackChannel = helper.serverConfig.slack_satisfied;
                markDwn = 'satisfied';
            }
            else if (body.type === 1) {
                console.log('Happy insert');
                slackChannel = helper.serverConfig.slack_happy;
                markDwn = 'simple_smile';
            }
            else {
                slackChannel = helper.serverConfig.slack_nothappy;
            }

            const web = new WebClient(slack_token);

            // Use the `chat.postMessage` method to send a message from this app
            await web.chat.postMessage({
                channel: slackChannel,
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `${body.user} Feedback:`
                        }
                    },
                    {
                        "type": "section",
                        "block_id": "section567",
                        "text": {
                            "type": "mrkdwn",
                            "text": `\n :${markDwn}: \n ${body.feedback}`
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": `${body.photoURL}`,
                            "alt_text": `${body.user}`
                        }
                    },
                    {
                        "type": "section",
                        "block_id": "section789",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": `*Email:*\n${body.email} \n[${body.guid}]`
                            }
                        ]
                    }
                ],
                // text: `USER: ${body.user} | EMAIL: ${body.email} | UID: ${body.guid} | FEEDBACK: ${body.feedback}`,
            });
            res.set('Content-Type', 'application/json')
                .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                .status(200)
                .send({ status: true });

        }
        else {
            console.log('No feedback in request body');
            res.set('Content-Type', 'application/json')
                .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                .status(200)
                .send({ status: false });
        }
    }
    catch (e) {
        console.log(`System Error = ${JSON.stringify(e)}`);
        res.set('Content-Type', 'application/json')
            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
            .status(400)
            .send({ status: false });
    }
}

exports.handler = async function (req, res, logging, admin, slack_token) {
    switch (req.method) {
        case 'GET':
            handleGET(req, res);
            break;
        case 'PUT':
            handlePUT(req, res);
            break;
        case 'POST':
            handleOriginAndAuth(req, res, logging, admin, slack_token);
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