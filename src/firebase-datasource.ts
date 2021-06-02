import { Collections, DataSource, DocumentObject, QueryObject } from 'entropic-bond'
import { FirebaseHelper, FirebaseQuery } from './firebase-helper'

export class FirebaseDatasource implements DataSource {
	constructor( useEmulator: 'useEmulator' = null, port: number = 8080 ) {
		if ( useEmulator ) FirebaseHelper.instance.firestore().useEmulator('localhost', port )
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
		const promises: Promise<void>[] = []
		const db = FirebaseHelper.instance.firestore()

		Object.entries( collections ).forEach(([ collectionName, collection ]) => {
			collection.forEach( document => {
				promises.push( 
					db.collection( collectionName ).doc( document.id ).set( document ) 
				)
			})
		})

		return Promise.all( promises ) as unknown as Promise<void>
	}

	find( queryObject: QueryObject<DocumentObject>, collectionName: string ): Promise< DocumentObject[] > {
		let query: FirebaseQuery = FirebaseHelper.instance.firestore().collection( collectionName )

		DataSource.toPropertyPathOperations( queryObject.operations ).forEach(([ propPath, operation ]) =>{
			query = query.where( propPath, operation.operator, operation.value )
		})

		if ( queryObject.sort ) {
			query = query.orderBy( queryObject.sort.propertyName, queryObject.sort.order )
		}

		if( queryObject.limit ) {
			query = query.limit( queryObject.limit )
		}

		return new Promise< DocumentObject[] >( async resolve => {
			const doc = await query.get()
			resolve( doc.docs.map( doc => doc.data() ) ) 
		})
	}

	delete( id: string, collectionName: string ): Promise< void > {
		const db = FirebaseHelper.instance.firestore()

		return db.collection( collectionName ).doc( id ).delete()
	}

	next( limit?: number ): Promise< DocumentObject[] > {
		// TODO
		throw 'Not Implemented'	
	}

	prev( limit?: number ): Promise< DocumentObject[] > {
		// TODO
		throw 'Not Implemented'
	}
}