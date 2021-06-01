'use strict';

module.exports.serverConfig = {
    whitelist: [
        'https://refprojc.firebaseapp.com',
        'https://us-central1-refprojc.cloudfunctions.net',
        'https://refprojc.web.app'
    ],
    app_name: 'https://refprojc.web.app',
    project_id: 'refprojc',
    host_name: 'refprojc.web.app',
    email_app_name: 'CloudImage',
    email_from: 'CloudImage<ramhanse@gmail.com>',
    email_customer_service: 'ramhanse@gmail.com>',
    // mailjet
    email_send_pictures_id: 2856413,
    slack_nothappy: '#feedback-unhappy-live',
    slack_happy: '#feedback-happy-live',
    slack_satisfied: '#feedback-satisfied-live',
};

function _respondSuccess(res, status, data, httpCode) {
    var response = {
        'status': status,
        'successFlag': true,
        'data': data
    };
    res.set('Content-Type', 'application/json');
    res.set('Access-Control-Allow-Origin', `${serverConfig.app_name}`); //comment this line for google api direct use
    res.set('Access-Control-Allow-Headers', 'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    res.set('Access-Control-Expose-Headers', 'X-Api-Version, X-Request-Id, X-Response-Time');
    res.set('Access-Control-Max-Age', '1000');
    res.status(httpCode).send(response);
    return;
}

function _respondFailure(res, status, data, httpCode) {
    var response = {
        'status': status,
        'successFlag': false,
        'data': data
    };
    res.set('Access-Control-Allow-Origin', `${serverConfig.app_name}`);
    res.set('Content-Type', 'application/json');
    res.set('Access-Control-Allow-Headers', 'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    res.set('Access-Control-Expose-Headers', 'X-Api-Version, X-Request-Id, X-Response-Time');
    res.set('Access-Control-Max-Age', '1000');
    res.status(httpCode).send(response);
    return;
}

module.exports.success = function success(res, data) {
    _respondSuccess(res, 'success', data, 200);
}

module.exports.failure = function failure(res, data, httpCode) {
    _respondFailure(res, 'failure', data, httpCode);
}


module.exports.reportError = async function reportError(logging, err, context = {}) {
    const logName = 'errors';
    const log = logging.log(logName);

    const metadataError = {
        resource: {
            type: 'cloud_function',
            labels: { function_name: process.env.FUNCTION_NAME },
        },
    };
    const errorEvent = {
        message: err.stack,
        serviceContext: {
            service: process.env.FUNCTION_NAME,
            resourceType: 'cloud_function',
        },
        context: context,
    };
    return new Promise((resolve, reject) => {
        log.write([log.entry(metadataError, errorEvent)], (error) => {
            if (error) {
                return reject(error);
            }
            return resolve();
        });
    });
}

module.exports.reportJSON = async function reportJSON(logging, jsonEvent, context = {}) {
    const logName = 'json_data';
    const log = logging.log(logName);
    const metadataJson = {
        severity: 'WARNING',
        context, //labels { foo: 'bar},
        resource: {
            type: 'cloud_function',
            labels: { function_name: process.env.FUNCTION_NAME },
        },
    };
    return new Promise((resolve, reject) => {
        log.write([log.entry(metadataJson, jsonEvent)], (error) => {
            if (error) {
                return reject(error);
            }
            return resolve();
        });
    });
}
