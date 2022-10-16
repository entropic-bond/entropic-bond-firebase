import * as _functions from 'firebase-functions'
import admin from 'firebase-admin'
import { persistent, Persistent, PersistentObject, registerPersistentClass } from 'entropic-bond'
import { log } from 'firebase-functions/logger'

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
const functions = _functions.region('europe-west1')

export const test = functions.https.onRequest((_req, res) => {
  res.send('Hello from Firebase!')
})

export const testCallablePersistent = functions.https.onCall( 
	( param: PersistentObject<ParamWrapper> ) => {
		Persistent.registerFactory( 'ParamWrapper', ParamWrapper )
		return param
	}
)

export const testCallablePlain = functions.https.onCall( 
	( param: string ) => param.length
)