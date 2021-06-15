'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
var serviceAccount = require("./service_account/serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://kloudimage-default-rtdb.firebaseio.com"
});
const database = admin.database();

const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors({ origin: true }));
app.use(express.json());

// https://bonus-express.herokuapp.com/getProducts
app.post('/getProducts', async (req, res, next) => {
    var helper = require('./helper/helper.js');
    let productsArray = [];
    let readDBPromise = await database.ref('users/' + req.body.guid).child('/products').once('value');
    let productObj = readDBPromise.val();
    let obj = [];
    if (productObj) {
        let keys = Object.keys(productObj);
        keys.forEach(function (key) {
            obj.push({ 'keyval': key, 'prd': productObj[key] });
        });
    }
    try {
        for (let key in obj) {
            // console.log(`key = ${key}`); //119006066983, 124177456735
            let itemObj = obj[key];
            let itemParent = itemObj.prd;
            let objkey = itemObj.keyval;
            for (let innerKey in itemParent) {
                let item = itemParent[innerKey];
                if (item.hasOwnProperty('status')) {
                    if (item['status'].indexOf('deleted') !== -1) {
                        let newObj = {
                            'name': item.name,
                            'pic': '../images/deleted/del_picture.jpg',
                            'status': item.status,
                            'key': innerKey,
                            'timestamp': item.timestamp,
                            'outerkey': objkey
                        };
                        let len = productsArray.push(newObj);
                    } else {
                        let newObj = {
                            'name': item.name,
                            'pic': item.picture,
                            'status': item.status,
                            'key': innerKey,
                            'timestamp': item.timestamp,
                            'outerkey': objkey
                        };
                        let len = productsArray.push(newObj);
                    }
                } // end if status
            } // end for
        } // end outter for
        // console.log(`products array = ${JSON.stringify(productsArray)}`);
        res.json({ status: true, product: productsArray });

    } catch (error) {
        console.log('Error: Unknown : ' + JSON.stringify(error));
        res.set('Content-Type', 'application/json')
            .set('Access-Control-Allow-Origin', `${helper.serverConfig.app_name}`)
            .set('Access-Control-Allow-Headers', 'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token, Authorization, X-Requested-With')
            .set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS')
            .status(500).send(`Something went wrong!`);
    }
});

const port = process.env.PORT || '3000';
app.listen(port, () => {
    console.log(`bonus_nodeexpress app started on PORT : ${port}`);
});
