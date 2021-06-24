import { Collections, DataSource, DocumentObject, QueryObject } from 'entropic-bond'
import firebase from 'firebase'
import { EmulatorConfig, FirebaseHelper, FirebaseQuery } from '../firebase-helper'

export class FirebaseDatasource extends DataSource {
	constructor( emulator?: EmulatorConfig ) {
		super()
		if ( emulator ) FirebaseHelper.useEmulator( emulator )
		const { emulate, host, firestorePort } = FirebaseHelper.emulator

		if ( emulate ) {
			FirebaseHelper.instance.firestore().useEmulator( host, firestorePort )
		}
	}

	findById( id: string, collectionName: string ): Promise< DocumentObject > {
		const db = FirebaseHelper.instance.firestore()
		
		return new Promise<DocumentObject>( async resolve => {
			try {
				const doc = await db.collection( collectionName ).doc( id ).get()
				resolve( doc.data() )
			} 
			catch( error ) {
				console.log( error )
				return null
			}
		})
	}

	save( collections: Collections ): Promise< void > {
		const db = FirebaseHelper.instance.firestore()
		const batch = db.batch()

		Object.entries( collections ).forEach(([ collectionName, collection ]) => {
			collection.forEach( document => {
					const ref = db.collection( collectionName ).doc( document.id )
					batch.set( ref, document ) 
			})
		})

		return batch.commit()
	}

	find( queryObject: QueryObject<DocumentObject>, collectionName: string ): Promise< DocumentObject[] > {
		let query: FirebaseQuery = FirebaseHelper.instance.firestore().collection( collectionName )

		DataSource.toPropertyPathOperations( queryObject.operations as any ).forEach( operation =>{
			query = query.where( operation.property, operation.operator, operation.value )
		})

		if ( queryObject.sort ) {
			query = query.orderBy( queryObject.sort.propertyName, queryObject.sort.order )
		}
		
		this._lastQuery = query

		if( queryObject.limit ) {
			this._lastLimit = queryObject.limit
			query = query.limit( queryObject.limit )
		}


		return this.getFromQuery( query )
	}

	delete( id: string, collectionName: string ): Promise< void > {
		const db = FirebaseHelper.instance.firestore()

		return db.collection( collectionName ).doc( id ).delete()
	}

	next( limit?: number ): Promise< DocumentObject[] > {
		if( !this._lastQuery ) throw new Error('You should perform a query prior to using method next')
		this._lastLimit = limit || this._lastLimit
		let query = this._lastQuery
									.limit( this._lastLimit )
									.startAfter( this._lastDocRetrieved )

		return this.getFromQuery( query )
	}

	// prev should be used with next in reverse order
	// prev( limit?: number ): Promise< DocumentObject[] > {
	// }

	private getFromQuery( query: FirebaseQuery ) {
		return new Promise< DocumentObject[] >( async resolve => {
			const doc = await query.get()
			this._lastDocRetrieved = doc.docs[ doc.docs.length-1 ]

			resolve( doc.docs.map( doc => doc.data() ) ) 
		})
	}

	private _lastDocRetrieved: firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>
	private _lastQuery: FirebaseQuery
	private _lastLimit: number
}