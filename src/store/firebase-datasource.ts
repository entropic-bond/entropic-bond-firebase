import { collection, connectFirestoreEmulator, deleteDoc, doc, DocumentData, getDoc, getDocs, limit, orderBy, query, QueryConstraint, QueryDocumentSnapshot, startAfter, where, writeBatch } from 'firebase/firestore'
import { Collections, DataSource, DocumentObject, QueryObject } from 'entropic-bond'
import { EmulatorConfig, FirebaseHelper, FirebaseQuery } from '../firebase-helper'

export class FirebaseDatasource extends DataSource {
	constructor( emulator?: EmulatorConfig ) {
		super()
		if ( emulator ) FirebaseHelper.useEmulator( emulator )
		
		if ( FirebaseHelper.emulator?.emulate ) {
			const { host, firestorePort } = FirebaseHelper.emulator
			connectFirestoreEmulator( FirebaseHelper.instance.firestore(), host, firestorePort )
		}
	}

	findById( id: string, collectionName: string ): Promise< DocumentObject > {
		const db = FirebaseHelper.instance.firestore()
		
		return new Promise<DocumentObject>( async resolve => {
			try {
				const docSnap = await getDoc( doc( db, collectionName, id ) )
				resolve( docSnap.data() )
			} 
			catch( error ) {
				console.log( error )
				return null
			}
		})
	}

	save( collections: Collections ): Promise< void > {
		const db = FirebaseHelper.instance.firestore()
		const batch = writeBatch( db )

		Object.entries( collections ).forEach(([ collectionName, collection ]) => {
			collection.forEach( document => {
					const ref = doc( db, collectionName, document.id )
					batch.set( ref, document ) 
			})
		})

		return batch.commit()
	}

	find( queryObject: QueryObject<DocumentObject>, collectionName: string ): Promise< DocumentObject[] > {
		const db = FirebaseHelper.instance.firestore()
		let queryRef = query( collection( db, collectionName ) )

		const constraints: QueryConstraint[] = DataSource.toPropertyPathOperations( 
			queryObject.operations as any 
		).map( operation =>	where( operation.property, operation.operator, operation.value ) )

		if ( queryObject.sort ) {
			constraints.push( orderBy( queryObject.sort.propertyName, queryObject.sort.order ) )
		}
		
		this._lastConstraints = constraints
		this._lastCollectionName = collectionName

		if( queryObject.limit ) {
			this._lastLimit = queryObject.limit
			constraints.push( limit( queryObject.limit ) )
		}

		return this.getFromQuery( query( collection( db, collectionName ), ...constraints ) )
	}

	delete( id: string, collectionName: string ): Promise< void > {
		const db = FirebaseHelper.instance.firestore()

		return deleteDoc( doc( db, collectionName, id ) )
	}

	next( maxDocs?: number ): Promise< DocumentObject[] > {
		if( !this._lastConstraints ) throw new Error('You should perform a query prior to using method next')

		const db = FirebaseHelper.instance.firestore()
		this._lastLimit = maxDocs || this._lastLimit

		const constraints = this._lastConstraints.concat(
			limit( this._lastLimit ),
			startAfter( this._lastDocRetrieved )
		)

		return this.getFromQuery( query( collection( db, this._lastCollectionName ), ...constraints ) )
	}

	// prev should be used with next in reverse order
	// prev( limit?: number ): Promise< DocumentObject[] > {
	// }

	private getFromQuery( query: FirebaseQuery ) {
		return new Promise< DocumentObject[] >( async resolve => {
			const doc = await getDocs( query )
			this._lastDocRetrieved = doc.docs[ doc.docs.length-1 ]

			resolve( doc.docs.map( doc => doc.data() ) ) 
		})
	}

	private _lastDocRetrieved: QueryDocumentSnapshot<DocumentData>
	private _lastConstraints: QueryConstraint[]
	private _lastLimit: number
	private _lastCollectionName: string
}