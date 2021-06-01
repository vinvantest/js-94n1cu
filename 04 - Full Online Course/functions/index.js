 'use strict';

 /***
  * 3d Secure Payment Method and Intent
  */
 
 // Stripe payment intent tutorial PSD2, SCA, 3DS2 explained
 // Code -> https://codenebula.io/node.js/stripe/sca/2020/03/03/how-to-use-stripes-new-payment-intents-api-with-node-js-to-create-subscriptions-with-built-in-sca/
 // Webhooks -> https://medium.com/code-nebula/using-stripe-webhooks-to-handle-failed-subscription-payments-node-js-b284e9110ace

 // Stripe Ref: https://stripe.com/docs/billing/subscriptions/fixed-price

// Code -> Load all stripe products & plans and sort them: https://github.com/code-nebula/stripe-subscriptions-sca/blob/master/api/stripe-functions.js

/**
 * Before we begin, make sure you include the Stripe client library in all of your app's html 
 * files that are rendered to the frontend, regardless of whether those pages will contain Stripe elements. 
 * This is something Stripe recommends to protect against fraud:
  <script src="https://js.stripe.com/v3/"></script>
  We can test our integration by using a few test card numbers that Stripe recommends. 
  Keep in mind that these will only work if both the Publishable and Secret Stripe Keys you use are from test mode:

4242424242424242 — This card does not require authentication. It should successfully create an active subscription.

4000002500003155 — This card requires SCA. Your customer will see a 3D Secure modal asking them to authenticate the payment. Once the user authenticates the payment, an active subscription is successfully created.

4000008260003178 — This card will always fail with an insufficient_funds message.
As you'll see in the cases below, when SCA fails, a customer's subscription status changes to Incomplete. Incomplete subscriptions will expire automatically in 24 hours.

In these cases, Stripe will return an error message that prompts the customer to enter another card.

If the customer enters a valid card and successfully signs up, a new subscription will be created with a status of Active, and the Incomplete subscription can be ignored.
 */

 const functions = require('firebase-functions');
 // The logger SDK supports log entries as part of a wildcard import. For example
 // functions.logger.log("Hello from info. Here's an object:", someObj);
/*
logger.log() commands have the INFO log level.
logger.info() commands have the INFO log level.
logger.warn() commands have the ERROR log level.
logger.error() commands have the ERROR log level.
Internal system messages have the DEBUG log level.
With logger.write(), you can write log entries addition log severity levels of CRITICAL, ALERT, and EMERGENCY. See LogSeverity.
*/

 const admin = require('firebase-admin');
 admin.initializeApp();
 const database = admin.database();
 const storage = admin.storage();
 /*
 - Recaptcha Site Key: 
 - Recaptcha Secret Key: 
*/
const recaptcha_site_key = functions.config().recaptcha.site_key;
const recaptcha_secret_key = functions.config().recaptcha.secret_key;

/*
Stripe (Test) public key: pk_test_fj
Stripe (Test) secret key: sk_test_dyI
Stripe - webhook secret: whsec_MBO

*/

const stripe_publickey = functions.config().stripe.stripe_publickey;
const stripe_secertkey = functions.config().stripe.stripe_secertkey;
const stripe = require('stripe')(stripe_secertkey);
const stripe_webhook_seceret = functions.config().stripe.webhook_seceret; //whsec_qaup4YVZo
const stripe_basic_planprice_id = functions.config().stripe.basic_planprice_id; //price_1In6
const stripe_pro_planprice_id = functions.config().stripe.pro_planprice_id; // price_1In

// 6000 emails per month | 200 emails per day
const mailjet_apikey = functions.config().mailjet.apikey; //da981be6b4
const mailjet_secretkey = functions.config().mailjet.secretkey; //74f733ba5
const mailjet = require('node-mailjet').connect(mailjet_apikey, mailjet_secretkey);

const slack_token = functions.config().slack.slack_token;

const { Logging } = require('@google-cloud/logging');
 const logging = new Logging({
   projectId: process.env.GCLOUD_PROJECT,
 });

exports.firstTimeAuth = functions.auth.user().onCreate(async (user) => {
  try {
    console.log(`user on firstAuth = ${JSON.stringify(user)}`);
    // user.terms = 'not_accepted';
    let trm = {
      'uid': user.uid,
      'displayName': user.displayName,
      'email': user.email,
      'emailVerified': user.emailVerified,
      'photoUrl': user.photoURL !== null || user.photoURL !== undefined ? user.photoURL : '',
      // 'provider': user.toJson()
    };
    console.log('setting auth and prd counts');
    let vl = await database.ref('/users/' + user.uid + '/authInfo').set(trm);
    vl = await database.ref('/users/' + user.uid + '/productCount').set(0);
    vl = await database.ref('/users/' + user.uid + '/productDeleteCount').set(0);
    vl = await database.ref('/users/' + user.uid + '/consumption').set(5);
    /*
    Character Set Limitations
    Note that URLs used to construct Firebase references may contain any unicode characters except:
    . (period)
    $ (dollar sign)
    [ (left square bracket)
    ] (right square bracket)
    # (hash or pound sign)
    / (forward slash)
    */
    // let emailSplit = user.email.split('@');
    // let name = emailSplit[0];
    // let domain = emailSplit[1];
    // let emailKey = name.replace('.','-') + '==' + domain.replace(/\./g, '-');
    vl = await database.ref('/global').push().set({ 'email': user.email, 'guid' : user.uid}); // for stripe webhook email uid mapping
    console.log(`First Time Auth : ${JSON.stringify(trm)} and Key: ${vl}`);

    return vl;
  } catch (error) {
    console.log('Error ->'+JSON.stringify(error));
    return false;
  }
});

exports.recaptchaCheck = functions.https.onRequest(async (req, res) => {
  var handlerObj = require('./auth/recaptcha');
  handlerObj.handler(req, res, logging, recaptcha_secret_key);
});

exports.checkLimit = functions.https.onRequest(async (req, res) => {
  var handlerObj = require('./upload/checkLimit');
  handlerObj.handler(req, res, admin, database);
});

// charge succeeded & invoice.payment_succeeded
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  var handlerObj = require('./stripe_subs/stripeWebhook');
  handlerObj.handler(req, res, admin, database, stripe, stripe_webhook_seceret);
});

exports.charge = functions.https.onRequest(async (req, res) => {
  var handlerObj = require('./stripe_subs/charge');
  handlerObj.handler(req, res, logging, admin, database, stripe);
});

exports.subscribe = functions.https.onRequest(async (req, res) => {
  var handlerObj = require('./stripe_subs/subscription');
  handlerObj.handler(req, res, logging, admin, database, stripe, stripe_basic_planprice_id, stripe_pro_planprice_id);
});

exports.getProducts = functions.https.onRequest(async (req, res) => {
  var handlerObj = require('./products/getProducts');
  handlerObj.handler(req, res, logging, admin, database);
});

exports.deleteProduct = functions.https.onRequest(async (req, res) => {
  var handlerObj = require('./products/deleteProduct');
  handlerObj.handler(req, res, logging, admin, database);
});

exports.sendEmail = functions.https.onRequest(async (req, res) => {
  var handlerObj = require('./email/sendEmail');
  handlerObj.handler(req, res, logging, admin, mailjet);
});

exports.feedback = functions.https.onRequest(async (req, res) => {
  var handlerObj = require('./feedback/feedback');
  handlerObj.handler(req, res, logging, admin, slack_token);
});

exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

/*

Function URL (charge): https://us-central1-refprojc.cloudfunctions.net/charge
Function URL (checkLimit): https://us-central1-refprojc.cloudfunctions.net/checkLimit
Function URL (deleteProduct): https://us-central1-refprojc.cloudfunctions.net/deleteProduct
Function URL (determine): https://us-central1-refprojc.cloudfunctions.net/determine
Function URL (feedback): https://us-central1-refprojc.cloudfunctions.net/feedback
Function URL (getProducts): https://us-central1-refprojc.cloudfunctions.net/getProducts
Function URL (helloWorld): https://us-central1-refprojc.cloudfunctions.net/helloWorld
Function URL (recaptchaCheck): https://us-central1-refprojc.cloudfunctions.net/recaptchaCheck
Function URL (sendEmail): https://us-central1-refprojc.cloudfunctions.net/sendEmail
Function URL (stripeWebhook): https://us-central1-refprojc.cloudfunctions.net/stripeWebhook
Function URL (subscribe): https://us-central1-refprojc.cloudfunctions.net/subscribe

*/

/*
{
  "uid": "Tuq1KGHipgZalnqKrvybKrQqYAC3",
  "email": "ramhanse@gmail.com",
  "emailVerified": true,
  "displayName": "Ram Hanse",
  "photoURL": "https://lh3.googleusercontent.com/a-/AOh14Gj9c92mWtIostJOSUGGt3Vv35weF_2wmKwMEF7p=s96-c",
  "phoneNumber": null,
  "disabled": false,
  "passwordHash": null,
  "passwordSalt": null,
  "tokensValidAfterTime": null,
  "metadata": {
    "creationTime": "2021-05-01T20:51:10Z",
    "lastSignInTime": "2021-05-01T20:51:10Z"
  },
  "customClaims": {},
  "providerData": [
    {
      "displayName": "Ram Hanse",
      "email": "ramhanse@gmail.com",
      "photoURL": "https://lh3.googleusercontent.com/a-/AOh14Gj9c92mWtIostJOSUGGt3Vv35weF_2wmKwMEF7p=s96-c",
      "providerId": "google.com",
      "uid": "117516330240970911271"
    }
  ]
}*/