'use strict';

const helper = require('../helper/helper.js');

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

async function handleOriginAndAuth(req, res, logging, admin, mailjet) {
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
                    handlePOST(req, res, logging, admin, mailjet);
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

async function handlePOST(req, res, logging, admin, mailjet) {
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
    console.log('pic: ' + body.pic);
    console.log('email: ' + body.email);
    console.log('user: ' + body.user);
    console.log('prodName: ' + body.prodName);
    await helper.reportJSON(logging, {pic: body.pic, email: body.email, user: body.user, prodName: body.prodName}, {user: body.email});
    // Delete the subscription
    try {
        console.log(`inside try block`);
        let pic = [];
        if (body.pic) {
            console.log(`body.pic is not null : ${body.pic}`);
            pic.push({ "name": body.prodName + '-' + 1, "url": body.pic });
            console.log(`pic object is : ${JSON.stringify(pic)}`);      
            let request = mailjet
                .post("send", { 'version': 'v3.1' })
                .request({
                    "Messages": [
                        {
                            "From": {
                                "Email": helper.serverConfig.email_from,
                                "Name": APP_NAME
                            },
                            "To": [
                                {
                                    "Email": body.email,
                                    "Name": body.user
                                }
                            ],
                            "Variables": {
                                "pictures": pic,
                                "prodName": body.prodName,
                                "name": body.user
                            },
                            "TemplateID": helper.serverConfig.email_send_pictures_id,
                            "TemplateLanguage": true,
                            "TemplateErrorReporting": {
                                "Email": 'ramhanse@gmail.com',
                                "Name": APP_NAME
                            },
                            // 'Attachments': [{
                            //     "Content-Type": "text-plain",
                            //     "Filename": "files.txt",
                            //     "Base64Content": buff, // Base64 for "This is your attached file!!!"
                            // }],
                            "Subject": "Cloud Image > Product " + body.prodName + " files"
                        }
                    ]
                });
            console.log(`got request from mailjet : ${JSON.stringify(request)}`); 
            request
                .then((result) => {
                    console.log(JSON.stringify(result.body));
                    res.set('Content-Type', 'application/json')
                        .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                        .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                        .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                        .status(200)
                        .send({ status: true });
                })
                .catch((err) => {
                    console.log(JSON.stringify(err));
                    res.set('Content-Type', 'application/json')
                        .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                        .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                        .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                        .status(400)
                        .send({ status: false });
                });
        }
        else {
            console.log('No pictures send in body');
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

exports.handler = async function (req, res, logging, admin, mailjet) {
    switch (req.method) {
        case 'GET':
            handleGET(req, res);
            break;
        case 'PUT':
            handlePUT(req, res);
            break;
        case 'POST':
            handleOriginAndAuth(req, res, logging, admin, mailjet);
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


/**
 
 */

/**
*
* This call sends a message to the given recipient with vars and custom vars.
*

const mailjet = require('node-mailjet')
    .connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE)
const request = mailjet
    .post("send", { 'version': 'v3.1' })
    .request({
        "Messages": [
            {
                "From": {
                    "Email": "customerservice@spin-360.web.app",
                    "Name": "Customer Service"
                },
                "To": [
                    {
                        "Email": "passenger1@example.com",
                        "Name": "passenger 1"
                    }
                ],
                "TemplateID": 1609243,
                "TemplateLanguage": true,
                "Subject": "Cloud Image > [[data:firstname:""]]: Your product pictures",
                "Variables": {
                    "firstname": "",
                    "name": "",
                    "prodName": "",
                    "pictures": ""
                }
            }
        ]
    })
request
    .then((result) => {
        console.log(result.body)
    })
    .catch((err) => {
        console.log(err.statusCode)
    })
*/