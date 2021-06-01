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

async function handleOriginAndAuth(req, res, logging, admin, database) {
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
                console.log(uid + ' AuthToken Verified and uid');
                // if(req.query.guid === uid) // GET
                if (req.body.guid === uid) // POST
                    handlePOST(req, res, logging, admin, database);
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

async function handlePOST(req, res, logging, admin, database) {
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
    console.log('guid: ' + body.guid);
    console.log('prodId: ' + body.prodId);
    console.log('prodKey: ' + body.prodKey);

    let productsArray = [];
    
    var readPrdDBPromise = await database.ref('users/' + body.guid).child('productCount').once("value");
    var productCount = readPrdDBPromise.val();
    // console.log('product count - ' + productCount);

    var readDelDBPromise = await database.ref('users/' + body.guid).child('productDeleteCount').once("value");
    var productDelCount = readDelDBPromise.val();

    let readObjDBPromise = await database.ref('users/' + body.guid).child('products').once("value");
    let productObj = readObjDBPromise.val();
    console.log('Products - ' + JSON.stringify(productObj));

    await helper.reportJSON(logging,productObj,{user: body.guid});

    try {
        // formulate product response
        /**
         * null,
            {
              "status": "non_compliant"
            },
            {
              "-MCoA5eYZUXRJ53TgePf": {
                "name": "Product 2 - Description",
                "status": "compliant",
                "timestamp": 1595381934820
              }
            },
            {
              "-MCosRehD7viaqi_x7vM": {
                "name": "product 10 des",
                "pictures": [
                  "https://firebasestorage.googleapis.com/v0/b/test-firebase-400eb.appspot.com/o/Ky7mIkfQXUbp5ttKeSvtSo4WXm92%2F10%2F1595393819728_0.8406821218785153.jpeg?alt=media&token=b9184641-6f01-4488-8f33-f01a67649b80",
                  "https://firebasestorage.googleapis.com/v0/b/test-firebase-400eb.appspot.com/o/Ky7mIkfQXUbp5ttKeSvtSo4WXm92%2F10%2F1595393819730_0.8736912046780728.jpeg?alt=media&token=64b9b43d-964b-4625-b2a0-275b90e9d64c"
                ],
                "status": "compliant",
                "timestamp": 1595393820866
              }
            },                    
            {
              "-MCosRehD7viaqi_x7vM": {
                "name": "product 10 des",
                "pictures": [
                  "https://firebasestorage.googleapis.com/v0/b/test-firebase-400eb.appspot.com/o/Ky7mIkfQXUbp5ttKeSvtSo4WXm92%2F10%2F1595393819728_0.8406821218785153.jpeg?alt=media&token=b9184641-6f01-4488-8f33-f01a67649b80",
                  "https://firebasestorage.googleapis.com/v0/b/test-firebase-400eb.appspot.com/o/Ky7mIkfQXUbp5ttKeSvtSo4WXm92%2F10%2F1595393819730_0.8736912046780728.jpeg?alt=media&token=64b9b43d-964b-4625-b2a0-275b90e9d64c"
                ],
                "status": "compliant",
                "timestamp": 1595393820866
              },
              "resize": [0:"", 1:"" ...],
            }
         */
            if (productDelCount + 1 > productCount) {
                // throw error
                res.set('Content-Type', 'application/json')
                    .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                    .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                    .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                    .status(400)
                    .send('Product delete count greater than product count');// show under limit records only ...                                
            }
            else {
                if (productObj !== null || productObj !== undefined) {
                    // you can delete by finding the product
                    var prodUpdated = false;
                    for (var key in productObj) {
                        // console.log('Each object key under DB path = ' + key);
                        var itemParent = productObj[key];
                        // console.log('itemParent = ' + JSON.stringify(itemParent));
                        for (var innerKey in itemParent) {
                            if (innerKey === body.prodKey) {
                                // console.log(body.prodKey + ' : found key matching : ' + innerKey);
                                var item = itemParent[innerKey];
                                // console.log('item = ' + JSON.stringify(item));
                                if (item.hasOwnProperty('status')) {
                                    if (item.status === 'compliant') {
                                        item.status = 'deleted';
                                        //update product as deleted
                                        // console.log('DB updating del count');
                                        await database.ref('users/' + body.guid).child('/productDeleteCount').set(productDelCount + 1);
                                        // console.log('DB updating products array');
                                        await database.ref('users/' + body.guid + '/products/' + key).child(innerKey).set(item);
                                        // console.log('DB updated for the product to be deleted status');
                                        prodUpdated = true;
                                    }
                                    else {
                                        prodUpdated = true;
                                    }
                                }
                                else {
                                    prodUpdated = true;
                                }
                            }
                        }
                    }// for end
                    res.set('Content-Type', 'application/json')
                        .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
                        .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
                        .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
                        .status(200)
                        .send({ status: prodUpdated });// show under limit records only ...  
                }
            }

    } catch (error) {
        console.log('Error: Unknown Error occured ->' + JSON.stringify(error));
        await helper.reportError(logging,error,{user: body.guid});
        res.set('Content-Type', 'application/json')
            .set('Access-Control-Allow-Origin', `${helper.helper.serverConfig.app_name}`) // comment this line for google api direct
            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
            .status(500)
            .send('Something went wrong!');
    } // end Catch

}

exports.handler = async function (req, res, logging, admin, database) {
    switch (req.method) {
        case 'GET':
            handleGET(req, res);
            break;
        case 'PUT':
            handlePUT(req, res);
            break;
        case 'POST':
            // handlePOST(req, res, logging, admin, database);
            handleOriginAndAuth(req, res, logging, admin, database);
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