import * as _functions from 'firebase-functions'
import admin from 'firebase-admin'

admin.initializeApp()
const functions = _functions.region('europe-west1')

export const test = functions.https.onRequest((_req, res) => {
  res.send('Hello from Firebase!')
})

export const testCallable = functions.https.onCall( 
	(data, _context) => data
)