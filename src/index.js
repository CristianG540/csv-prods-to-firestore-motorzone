// modulos
import { env } from './modules/config'

// Libs terceros
import _ from 'lodash'
import Papa from 'papaparse'
import * as admin from 'firebase-admin'

/** *** FIREBASE *****/

// Fetch the service account key JSON file contents
const serviceAccount = require('./../motorzone-efef6-firebase-adminsdk-thfle-d2d5a6b23b.json')

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

// As an admin, the app has access to read and write all data, regardless of Security Rules
const firestoreDB = admin.firestore()

/** *** end FIREBASE *****/

const docRef = firestoreDB.collection('users').doc('alovelace')

const setAda = docRef.set({
  first: 'Ada',
  last: 'Lovelace',
  born: 1815
})

setAda
  .then(res => {
    console.log('Funciona esta porqueria putrida', res)
  })
  .catch(err => console.log('No funciona esta basura putrida', err))

console.log('Hola puto mundo !!!!!')
