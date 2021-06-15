'use strict';

module.exports.serverConfig = {
    whitelist: [
        'https://kloudimage.web.app',
        'https://kloudimage.firebaseapp.com',
        'https://us-central1-kloudimage.cloudfunctions.net'
    ],
    app_name: 'https://kloudimage.web.app',
    project_id: 'kloudimage',
    host_name: 'kloudimage.web.app',
    email_app_name: 'Kloud Image',
    email_from: 'KloudImage<ramhanse@gmail.com>', // your organisation email
    email_customer_service: 'ramhanse@gmail.com',
    // mailjet
    email_send_pictures_id: 2887946,
    // slack
    slack_nothappy: '#feedback-unhappy-live',
    slack_happy: '#feedback-happy-live',
    slack_satisfied: '#feedback-satisfied-live',
};