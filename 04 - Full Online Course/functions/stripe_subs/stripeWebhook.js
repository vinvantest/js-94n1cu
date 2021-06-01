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

/*
router.post("/webhooks", async function (req, res) {
    console.log("/webhooks POST route hit! req.body: ", req.body)

    let { data, type } = req.body
    let { previous_attributes, object } = data

    try {
        if ('status' in previous_attributes
            && type === 'customer.subscription.updated'
            && previous_attributes.status === 'active'
            && object.status === 'past_due') {
            console.log("A subscription payment has failed! Subscription id: ",
                object.id)
        }
        res.send(200)
    }
    catch (err) {
        console.log("/webhooks route error: ", err)
        res.send(200)
    }
} 
*/

async function handlePOST(req, res, admin, database, stripe, stripe_webhook_seceret) {

  let { data, type } = req.body;
  let { object } = data;
  console.log(`Webhook = ${JSON.stringify(req.body)}`);
  /*
  The two things we want to pay attention to here are data.object and data.previous_attributes.

  Stripe’s docs explain it pretty well, but basically data.object is the latest version of the API resource that was changed, 
   
  While, data.previous_attributes contains the old key-value pairs of all fields that were changed in this webhook event.

  https://medium.com/code-nebula/using-stripe-webhooks-to-handle-failed-subscription-payments-node-js-b284e9110ace

  */
  if (type === 'charge.succeeded') {
    // Used to provision services after the trial has ended.
    // The status of the invoice will show up as paid. Store the status in your
    // database to reference when a user accesses your service to avoid hitting rate limits.
    try {
      if (object.status === 'succeeded') {
        console.log(`Charge payment has succeeded! id: ${object.id} and customer_id = ${object.customer}`);
        let customer_id = object.customer;
        // https://stripe.com/docs/api/subscriptions/object
        if (!customer_id) {
          res.send(200);
          return;
        }
        let customer_object = await stripe.customers.retrieve(
          customer_id,
          { expand: ["default_source"] }
        );
        console.log(`customer obj -> ${JSON.stringify(customer_object)}`);
        let customer_email = customer_object.email;
        // https://stripe.com/docs/api/customers/object
        // let emailSplit = customer_email.split('@');
        // let name = emailSplit[0];
        // let domain = emailSplit[1];
        // let emailKey = name.replace('.', '-') + '==' + domain.replace(/\./g, '-');
        // console.log(`emailKey = ${emailKey}`);
        let readDBPromise = await database.ref('/global').orderByChild('email').equalTo(customer_email).limitToFirst(1).once("value");
        let snapshot = readDBPromise.val();
        console.log(`email obj : ${JSON.stringify(snapshot)}`);
        // {"-MZpgtEriBrTrFI4Evcw":{"email":"ramhanse@gmail.com","guid":"aI8gLPs15YWAy6XyXb1x1NqWMt13"}}
        let guid;
        let keys = Object.keys(snapshot);
        keys.forEach(function (key) {
          let obj = snapshot[key];
          guid = obj.guid;
        });
        console.log(`guid : ${JSON.stringify(guid)}`);
        await database.ref('users/' + guid).child('/consumption').set(5); //reset comsumption
        res.sendStatus(200);
        return;
      }
    }
    catch (err) {
      console.log(`/webhooks error: ${JSON.stringify(err)}`);
      res.sendStatus(200);
      return;
    }
  }
  else if (type === 'invoice.payment_succeeded') {
    // Used to provision services after the trial has ended.
    // The status of the invoice will show up as paid. Store the status in your
    // database to reference when a user accesses your service to avoid hitting rate limits.
    try {
      if (object.status === 'paid') {
        console.log(`Invoice paid for Subscription! id: ${object.id} and customer_id = ${object.customer}`);
        let customer_email = object.customer_email;
        // https://stripe.com/docs/api/invoices/object
        // let emailSplit = customer_email.split('@');
        // let name = emailSplit[0];
        // let domain = emailSplit[1];
        // let emailKey = name.replace('.', '-') + '==' + domain.replace(/\./g, '-');
        // console.log(`emailKey = ${emailKey}`);
        let readDBPromise = await database.ref('/global').orderByChild('email').equalTo(customer_email).limitToFirst(1).once("value");
        let snapshot = readDBPromise.val();
        console.log(`email obj : ${JSON.stringify(snapshot)}`);
        // {"-MZpgtEriBrTrFI4Evcw":{"email":"ramhanse@gmail.com","guid":"aI8gLPs15YWAy6XyXb1x1NqWMt13"}}
        let guid;
        let keys = Object.keys(snapshot);
        keys.forEach(function (key) {
          let obj = snapshot[key];
          guid = obj.guid;
        });
        console.log(`guid : ${JSON.stringify(guid)}`);
        await database.ref('users/' + guid).child('/consumption').set(5); //reset comsumption
        res.sendStatus(200);
        return;
      }
    }
    catch (err) {
      console.log(`/webhooks error: ${JSON.stringify(err)}`);
      res.sendStatus(200);
      return;
    }
  }
  else {
    res.sendStatus(200);
    return;
  }

}

exports.handler = async function (req, res, admin, database, stripe, stripe_webhook_seceret) {
  switch (req.method) {
    case 'GET':
      handleGET(req, res);
      break;
    case 'PUT':
      handlePUT(req, res);
      break;
    case 'POST':
      handlePOST(req, res, admin, database, stripe, stripe_webhook_seceret);
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
 * CHARGE OBJECT STRIPE
 *

{
    "id": "ch_1ImQq6C6pAIhd7r1VpkhuJoW",
    "object": "charge",
    "amount": 100,
    "amount_captured": 0,
    "amount_refunded": 0,
    "application": null,
    "application_fee": null,
    "application_fee_amount": null,
    "balance_transaction": "txn_1ImQqFC6pAIhd7r1FBYrQWs6",
    "billing_details": {
      "address": {
        "city": null,
        "country": null,
        "line1": null,
        "line2": null,
        "postal_code": "22222",
        "state": null
      },
      "email": null,
      "name": null,
      "phone": null
    },
    "calculated_statement_descriptor": null,
    "captured": false,
    "created": 1619906346,
    "currency": "aud",
    "customer": null,
    "description": "My First Test Charge (created for API docs)",
    "disputed": false,
    "failure_code": null,
    "failure_message": null,
    "fraud_details": {},
    "invoice": null,
    "livemode": false,
    "metadata": {},
    "on_behalf_of": null,
    "order": null,
    "outcome": null,
    "paid": true,
    "payment_intent": null,
    "payment_method": "card_1ImQmyC6pAIhd7r1JG6KRnfb",
    "payment_method_details": {
      "card": {
        "brand": "visa",
        "checks": {
          "address_line1_check": null,
          "address_postal_code_check": "unchecked",
          "cvc_check": "unchecked"
        },
        "country": "US",
        "exp_month": 3,
        "exp_year": 2022,
        "fingerprint": "IS951BxHD4gHp8q5",
        "funding": "credit",
        "installments": null,
        "last4": "4242",
        "network": "visa",
        "three_d_secure": null,
        "wallet": null
      },
      "type": "card"
    },
    "receipt_email": null,
    "receipt_number": null,
    "receipt_url": "https://pay.stripe.com/receipts/acct_1IlK0WC6pAIhd7r1/ch_1ImQq6C6pAIhd7r1VpkhuJoW/rcpt_JPFKnxJjWgiQi2GvVknPBxo9ALbqAOC",
    "refunded": false,
    "refunds": {
      "object": "list",
      "data": [],
      "has_more": false,
      "url": "/v1/charges/ch_1ImQq6C6pAIhd7r1VpkhuJoW/refunds"
    },
    "review": null,
    "shipping": null,
    "source_transfer": null,
    "statement_descriptor": null,
    "statement_descriptor_suffix": null,
    "status": "succeeded",
    "transfer_data": null,
    "transfer_group": null
  }


  /**
   *
   * Invoice object in stripe
   *

{
  "id": "in_1In9ZMC6pAIhd7r1DWqZVFy1",
  "object": "invoice",
  "account_country": "AU",
  "account_name": "Test-Online-Course",
  "account_tax_ids": null,
  "amount_due": 1000,
  "amount_paid": 0,
  "amount_remaining": 1000,
  "application_fee_amount": null,
  "attempt_count": 0,
  "attempted": false,
  "auto_advance": true,
  "billing_reason": "manual",
  "charge": null,
  "collection_method": "charge_automatically",
  "created": 1620078288,
  "currency": "aud",
  "custom_fields": null,
  "customer": "cus_JPzYgH88tasFOc",
  "customer_address": null,
  "customer_email": "ramhanse@gmail.com",
  "customer_name": "Ram Hanse",
  "customer_phone": null,
  "customer_shipping": null,
  "customer_tax_exempt": "none",
  "customer_tax_ids": [],
  "default_payment_method": null,
  "default_source": null,
  "default_tax_rates": [],
  "description": null,
  "discount": null,
  "discounts": [],
  "due_date": null,
  "ending_balance": null,
  "footer": null,
  "hosted_invoice_url": null,
  "invoice_pdf": null,
  "last_finalization_error": null,
  "lines": {
    "object": "list",
    "data": [
      {
        "id": "il_1In9ZMC6pAIhd7r1vOT0AJTx",
        "object": "line_item",
        "amount": 1000,
        "currency": "aud",
        "description": "My First Invoice Item (created for API docs)",
        "discount_amounts": [],
        "discountable": true,
        "discounts": [],
        "invoice_item": "ii_1In9ZMC6pAIhd7r1hdMqRE2I",
        "livemode": false,
        "metadata": {},
        "period": {
          "end": 1620078288,
          "start": 1620078288
        },
        "price": {
          "id": "price_HKLjXl339HdJTJ",
          "object": "price",
          "active": true,
          "billing_scheme": "per_unit",
          "created": 1590177596,
          "currency": "aud",
          "livemode": false,
          "lookup_key": null,
          "metadata": {},
          "nickname": null,
          "product": "prod_HKLjwVE5gWVLSl",
          "recurring": null,
          "tiers_mode": null,
          "transform_quantity": null,
          "type": "one_time",
          "unit_amount": 1000,
          "unit_amount_decimal": "1000"
        },
        "proration": false,
        "quantity": 1,
        "subscription": null,
        "tax_amounts": [],
        "tax_rates": [],
        "type": "invoiceitem"
      }
    ],
    "has_more": false,
    "url": "/v1/invoices/in_1In9ZMC6pAIhd7r1DWqZVFy1/lines"
  },
  "livemode": false,
  "metadata": {},
  "next_payment_attempt": 1620081888,
  "number": null,
  "on_behalf_of": null,
  "paid": false,
  "payment_intent": null,
  "payment_settings": {
    "payment_method_options": null,
    "payment_method_types": null
  },
  "period_end": 1620078288,
  "period_start": 1620078288,
  "post_payment_credit_notes_amount": 0,
  "pre_payment_credit_notes_amount": 0,
  "receipt_number": null,
  "starting_balance": 0,
  "statement_descriptor": null,
  "status": "draft",
  "status_transitions": {
    "finalized_at": null,
    "marked_uncollectible_at": null,
    "paid_at": null,
    "voided_at": null
  },
  "subscription": null,
  "subtotal": 1000,
  "tax": null,
  "total": 1000,
  "total_discount_amounts": [],
  "total_tax_amounts": [],
  "transfer_data": null,
  "webhooks_delivered_at": null
}

  */


/**
 * 
 * ACTUAL
 * 
 */

/*
Invoice successfully paid Object in webhook

{
    "id": "evt_1InIcpC6pAIhd7r17omdNJm1",
    "object": "event",
    "api_version": "2020-08-27",
    "created": 1620113098,
    "data": {
      "object": {
        "id": "in_1InIcmC6pAIhd7r1GX3cEglu",
        "object": "invoice",
        "account_country": "AU",
        "account_name": "Test-Online-Course",
        "account_tax_ids": null,
        "amount_due": 500,
        "amount_paid": 500,
        "amount_remaining": 0,
        "application_fee_amount": null,
        "attempt_count": 1,
        "attempted": true,
        "auto_advance": false,
        "billing_reason": "subscription_create",
        "charge": "ch_1InIcnC6pAIhd7r1ty8HRdRS",
        "collection_method": "charge_automatically",
        "created": 1620113096,
        "currency": "aud",
        "custom_fields": null,
        "customer": "cus_JQ8u5y2EVDktGE",
        "customer_address": null,
        "customer_email": "ramhanse@gmail.com",
        "customer_name": "Ram Hanse",
        "customer_phone": null,
        "customer_shipping": null,
        "customer_tax_exempt": "none",
        "customer_tax_ids": [],
        "default_payment_method": null,
        "default_source": null,
        "default_tax_rates": [],
        "description": null,
        "discount": null,
        "discounts": [],
        "due_date": null,
        "ending_balance": 0,
        "footer": null,
        "hosted_invoice_url": "https://invoice.stripe.com/i/acct_1IlK0WC6pAIhd7r1/invst_JQ8u1MpkDcXzSNsrH0ITitsrPXqXKRh",
        "invoice_pdf": "https://pay.stripe.com/invoice/acct_1IlK0WC6pAIhd7r1/invst_JQ8u1MpkDcXzSNsrH0ITitsrPXqXKRh/pdf",
        "last_finalization_error": null,
        "lines": {
          "object": "list",
          "data": [
            {
              "id": "il_1InIcmC6pAIhd7r1mlG4V41x",
              "object": "line_item",
              "amount": 500,
              "currency": "aud",
              "description": "1 × Cloud Image Test Pro (at $5.00 / month)",
              "discount_amounts": [],
              "discountable": true,
              "discounts": [],
              "livemode": false,
              "metadata": {},
              "period": {
                "end": 1622791496,
                "start": 1620113096
              },
              "plan": {
                "id": "price_1In6v7C6pAIhd7r1VNyrTdcl",
                "object": "plan",
                "active": true,
                "aggregate_usage": null,
                "amount": 500,
                "amount_decimal": "500",
                "billing_scheme": "per_unit",
                "created": 1620068105,
                "currency": "aud",
                "interval": "month",
                "interval_count": 1,
                "livemode": false,
                "metadata": {},
                "nickname": null,
                "product": "prod_JPwoBYT3lWa529",
                "tiers_mode": null,
                "transform_usage": null,
                "trial_period_days": null,
                "usage_type": "licensed"
              },
              "price": {
                "id": "price_1In6v7C6pAIhd7r1VNyrTdcl",
                "object": "price",
                "active": true,
                "billing_scheme": "per_unit",
                "created": 1620068105,
                "currency": "aud",
                "livemode": false,
                "lookup_key": null,
                "metadata": {},
                "nickname": null,
                "product": "prod_JPwoBYT3lWa529",
                "recurring": {
                  "aggregate_usage": null,
                  "interval": "month",
                  "interval_count": 1,
                  "trial_period_days": null,
                  "usage_type": "licensed"
                },
                "tiers_mode": null,
                "transform_quantity": null,
                "type": "recurring",
                "unit_amount": 500,
                "unit_amount_decimal": "500"
              },
              "proration": false,
              "quantity": 1,
              "subscription": "sub_JQ8umQfVaEhYdG",
              "subscription_item": "si_JQ8u8eHkUYsJXl",
              "tax_amounts": [],
              "tax_rates": [],
              "type": "subscription"
            }
          ],
          "has_more": false,
          "total_count": 1,
          "url": "/v1/invoices/in_1InIcmC6pAIhd7r1GX3cEglu/lines"
        },
        "livemode": false,
        "metadata": {},
        "next_payment_attempt": null,
        "number": "83CBCB5A-0001",
        "on_behalf_of": null,
        "paid": true,
        "payment_intent": "pi_1InIcnC6pAIhd7r1wooHamOF",
        "payment_settings": {
          "payment_method_options": null,
          "payment_method_types": null
        },
        "period_end": 1620113096,
        "period_start": 1620113096,
        "post_payment_credit_notes_amount": 0,
        "pre_payment_credit_notes_amount": 0,
        "receipt_number": null,
        "starting_balance": 0,
        "statement_descriptor": null,
        "status": "paid",
        "status_transitions": {
          "finalized_at": 1620113096,
          "marked_uncollectible_at": null,
          "paid_at": 1620113096,
          "voided_at": null
        },
        "subscription": "sub_JQ8umQfVaEhYdG",
        "subtotal": 500,
        "tax": null,
        "total": 500,
        "total_discount_amounts": [],
        "total_tax_amounts": [],
        "transfer_data": null,
        "webhooks_delivered_at": 1620113096
      }
    },
    "livemode": false,
    "pending_webhooks": 1,
    "request": {
      "id": "req_EgrgzvxT0aMMtL",
      "idempotency_key": null
    },
    "type": "invoice.payment_succeeded"
  }




  /// Charge success webhook object

  {
    "id": "evt_1InIcpC6pAIhd7r1mN4W387r",
    "object": "event",
    "api_version": "2020-08-27",
    "created": 1620113098,
    "data": {
      "object": {
        "id": "ch_1InIcnC6pAIhd7r1ty8HRdRS",
        "object": "charge",
        "amount": 500,
        "amount_captured": 500,
        "amount_refunded": 0,
        "application": null,
        "application_fee": null,
        "application_fee_amount": null,
        "balance_transaction": "txn_1InIcoC6pAIhd7r1TfmlHPtd",
        "billing_details": {
          "address": {
            "city": null,
            "country": null,
            "line1": null,
            "line2": null,
            "postal_code": "22222",
            "state": null
          },
          "email": "ramhanse@gmail.com",
          "name": "Ram Hanse",
          "phone": null
        },
        "calculated_statement_descriptor": "CLOUD IMAGE PRODUCT",
        "captured": true,
        "created": 1620113097,
        "currency": "aud",
        "customer": "cus_JQ8u5y2EVDktGE",
        "description": "Subscription creation",
        "destination": null,
        "dispute": null,
        "disputed": false,
        "failure_code": null,
        "failure_message": null,
        "fraud_details": {},
        "invoice": "in_1InIcmC6pAIhd7r1GX3cEglu",
        "livemode": false,
        "metadata": {},
        "on_behalf_of": null,
        "order": null,
        "outcome": {
          "network_status": "approved_by_network",
          "reason": null,
          "risk_level": "normal",
          "risk_score": 36,
          "seller_message": "Payment complete.",
          "type": "authorized"
        },
        "paid": true,
        "payment_intent": "pi_1InIcnC6pAIhd7r1wooHamOF",
        "payment_method": "pm_1InIchC6pAIhd7r1jyqFeeIR",
        "payment_method_details": {
          "card": {
            "brand": "visa",
            "checks": {
              "address_line1_check": null,
              "address_postal_code_check": "pass",
              "cvc_check": "pass"
            },
            "country": "US",
            "exp_month": 2,
            "exp_year": 2022,
            "fingerprint": "IS951BxHD4gHp8q5",
            "funding": "credit",
            "installments": null,
            "last4": "4242",
            "network": "visa",
            "three_d_secure": null,
            "wallet": null
          },
          "type": "card"
        },
        "receipt_email": null,
        "receipt_number": null,
        "receipt_url": "https://pay.stripe.com/receipts/acct_1IlK0WC6pAIhd7r1/ch_1InIcnC6pAIhd7r1ty8HRdRS/rcpt_JQ8uh0svJqeLbgBMs2WUNPamHKz30Z0",
        "refunded": false,
        "refunds": {
          "object": "list",
          "data": [],
          "has_more": false,
          "total_count": 0,
          "url": "/v1/charges/ch_1InIcnC6pAIhd7r1ty8HRdRS/refunds"
        },
        "review": null,
        "shipping": null,
        "source": null,
        "source_transfer": null,
        "statement_descriptor": "Cloud Image Product",
        "statement_descriptor_suffix": null,
        "status": "succeeded",
        "transfer_data": null,
        "transfer_group": null
      }
    },
    "livemode": false,
    "pending_webhooks": 1,
    "request": {
      "id": "req_EgrgzvxT0aMMtL",
      "idempotency_key": null
    },
    "type": "charge.succeeded"
  }

  */