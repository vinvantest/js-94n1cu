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

    let productsArray = [];

    let readObjDBPromise = await database.ref('users/' + body.guid).child('products').once("value");
    let productObj = readObjDBPromise.val();
    console.log('Products - ' + JSON.stringify(productObj));
    await helper.reportJSON(logging,productObj,{user: body.guid});

    let obj = [];
    if (productObj !== null) {
        let keys = Object.keys(productObj);
        keys.forEach(function (key) {
            // obj.push(productObj[key]); //{keyval: key, prd: productObj[key]}
            obj.push({ 'keyval': key, 'prd': productObj[key] });
        });
    }
    console.log('Products null removed - ' + JSON.stringify(obj));
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
        for (let key in obj) {
            console.log('key = ' + key); //1,2,3,4,5...
            let itemObj = obj[key];
            // console.log('itemObj = ' + JSON.stringify(itemObj)); // object under product No i.e. 1.,2,3,
            let itemParent = itemObj.prd;
            let objkey = itemObj.keyval;
            // console.log('itemParent = ' + JSON.stringify(itemParent));
            // console.log('objkey = ' + JSON.stringify(objkey));
            for (let innerKey in itemParent) {
                let item = itemParent[innerKey];
                // console.log('item = ' + JSON.stringify(item)); //-"MSXss" object or "resize"
                if (item.hasOwnProperty('status')) {
                    if (item['status'].indexOf('deleted') !== -1) {
                        let newObj = {
                            "name": item.name,
                            "pic": '../images/deleted/del_picture.jpg',
                            'status': item.status,
                            'key': innerKey,
                            'timestamp': item.timestamp,
                            'outerkey': objkey
                        }
                        let len = productsArray.push(newObj);
                    }
                    else {
                        let newObj = {
                            "name": item.name,
                            "pic": item.picture, // -- original pictures rendering                                    
                            'status': item.status,
                            'key': innerKey,
                            'timestamp': item.timestamp,
                            'outerkey': objkey
                        }
                        let len = productsArray.push(newObj);
                    } // end if else
                } // end status
            } // end for

        }
        //send the data
        res.set('Content-Type', 'application/json')
            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
            .set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT')
            .set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-PINGARUNER, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept')
            .status(200)
            .send({ status : true, product: productsArray });

    } catch (error) {
        console.log('Error: Unknown Error occured ->' + JSON.stringify(error));
        await helper.reportError(logging,error,{user: body.guid});
        res.set('Content-Type', 'application/json')
            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`) // comment this line for google api direct
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

/**
 *
 * Subscription Status
 *
 * Possible values are incomplete, incomplete_expired, trialing, active, past_due, canceled, or unpaid.
 *
 *
For collection_method=charge_automatically a subscription moves into incomplete if the initial payment
attempt fails. A subscription in this state can only have metadata and default_source updated.
Once the first invoice is paid, the subscription moves into an active state. If the first invoice
is not paid within 23 hours, the subscription transitions to incomplete_expired. This is a terminal
state, the open invoice will be voided and no further invoices will be generated.

A subscription that is currently in a trial period is trialing and moves to active when the trial period is over.

If subscription collection_method=charge_automatically it becomes past_due when payment to renew it
fails and canceled or unpaid (depending on your subscriptions settings) when Stripe has exhausted all
payment retry attempts.

If subscription collection_method=send_invoice it becomes past_due when its invoice is not paid by
the due date, and canceled or unpaid if it is still not paid by an additional deadline after that.
Note that when a subscription has a status of unpaid, no subsequent invoices will be attempted
(invoices will be created, but then immediately automatically closed). After receiving updated payment
information from a customer, you may choose to reopen and pay their closed invoices.
 *
 */

/*
users/uid/products - DB (they are sequenced in array)
[
  null,
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
    "status": "non_compliant"
  },
  {
    "status": "non_compliant"
  },
  {
    "status": "non_compliant"
  },
  {
    "status": "non_compliant"
  },
  {
    "status": "non_compliant"
  },
  {
    "-MCoqvRFCORMbY390kip": {
      "name": "Product 8",
      "status": "compliant",
      "timestamp": 1595393422673
    }
  },
  {
    "status": "non_compliant"
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
  }
]
*/