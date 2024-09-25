import * as functions from 'firebase-functions/v2'

import admin from 'firebase-admin'
import { persistent, Persistent, PersistentObject, registerPersistentClass } from 'entropic-bond'

@registerPersistentClass( 'ParamWrapper' )
export class ParamWrapper extends Persistent {
	constructor( a?: string, b?: number ) {
		super()
		this._a = a
		this._b = b
	}
	@persistent _a: string
	@persistent _b: number
}


admin.initializeApp()
functions.setGlobalOptions({
	region: 'europe-west1',
	maxInstances: 10
})

export const test = functions.https.onRequest((_req, res) => {
  res.send('Hello from Firebase!')
})

export const testCallablePersistent = functions.https.onCall( 
	param => {
		Persistent.registerFactory( 'ParamWrapper', ParamWrapper )
		return param
	}
)

export const testCallablePlain = functions.https.onCall( 
	request => request.data().length
)