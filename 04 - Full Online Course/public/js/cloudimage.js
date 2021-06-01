const firebaseConfig = {
    apiKey: "AIzaSyDVZi9i9Dmk6RZ0EMTAOSrrZQ3ZGSqnlog",
    authDomain: "refprojc.firebaseapp.com",
    databaseURL: "https://refprojc-default-rtdb.firebaseio.com",
    projectId: "refprojc",
    storageBucket: "refprojc.appspot.com",
    messagingSenderId: "444965113636",
    appId: "1:444965113636:web:a58f0ea327c1c026ddadb1",
    measurementId: "G-9CJ0ZVD0SF"
};

const siteName = 'refprojc.web.app';

const basicPrice = '$3.99';
const jsBasicPrice = '399';

const premiumPrice = '$9.99';
const jsPremiumPrice = '999';

const bigbusinessPrice = '$59.99';
const jsBigbusinessPrice = '5999';

const recaptchaPubKey = '6LdZzrMaAAAAAHNNPjjU142Pr_4fxnv-EVA771R0';

const calls = {
    recaptcha: 'https://us-central1-refprojc.cloudfunctions.net/recaptchaCheck',
    charge: 'https://us-central1-refprojc.cloudfunctions.net/charge',
    chkLimit: 'https://us-central1-refprojc.cloudfunctions.net/checkLimit',
    subscr: 'https://us-central1-refprojc.cloudfunctions.net/subscribe',

    getPrd: 'https://us-central1-refprojc.cloudfunctions.net/getProducts',
    delPrd: 'https://us-central1-refprojc.cloudfunctions.net/deleteProduct',

    sndPicEml: 'https://us-central1-refprojc.cloudfunctions.net/sendEmail',
    fdbbck: 'https://us-central1-refprojc.cloudfunctions.net/feedback',
};
