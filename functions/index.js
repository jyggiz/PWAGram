const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
var webpush = require('web-push');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var serviceAccount = require("./pwagram-keys.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-29785.firebaseio.com/'
});

exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, function() {
    admin.database().ref('posts').push({
      id: request.body.id,
      title: request.body.title,
      location: request.body.location,
      image: request.body.image
    })
    .then(function() {
      webpush.setVapidDetails(
        'mailto:zhygmytov@gmail.com',
        'BGn0S8HDebOxHlLku04Ijgx8k76Fmu5R9BR73jb0bNoC0VKbhRrHQw7dAqx1P59eDYJ9VC5zlA2svOMWKaB_BWs',
        'bPB8YZFoQ95AYeDmCtW_04UxR20IPDbK-IV2kldMTsA'
      );
      return admin.database().ref('subscriptions').once('value');
    })
    .then(function(subscriptions) {
      subscriptions.forEach(function(sub) {
        var pushConfig = {
          endpoint: sub.val().endpoint,
          keys: {
            auth: sub.val().keys.auth,
            p256dh: sub.val().keys.p256dh
          }
        };

        webpush.sendNotification(pushConfig, JSON.stringify({ 
          title: 'New post!',
          content: 'New post added!',
          openUrl: '/help'
        }))
          .catch(function(err) {
            console.log(err);
          })
      });
      response.status(201).json({ message: 'Data stored', id: request.body.id });
    })
    .catch(function(err) {
      response.status(500).json({ message: err });
    })
  })
 });
