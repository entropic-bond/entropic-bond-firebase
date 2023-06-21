import { and, collection, connectFirestoreEmulator, deleteDoc, doc, DocumentData, getCountFromServer, getDoc, getDocs, limit, or, orderBy, Query, query, QueryCompositeFilterConstraint, QueryConstraint, QueryDocumentSnapshot, QueryFieldFilterConstraint, QueryNonFilterConstraint, startAfter, where, writeBatch } from 'firebase/firestore'
import { Collections, DataSource, DocumentObject, QueryObject } from 'entropic-bond'
import { EmulatorConfig, FirebaseHelper, FirebaseQuery } from '../firebase-helper'

type FirestoreConstraint = QueryConstraint | QueryCompositeFilterConstraint

interface ConstraintsContainer {
	andConstraints: QueryFieldFilterConstraint[]
	orConstraints: QueryFieldFilterConstraint[]
	nonFilterConstraints: QueryNonFilterConstraint[]
}

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
				resolve( docSnap.data() as DocumentObject )
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
			collection?.forEach( document => {
					const ref = doc( db, collectionName, document.id )
					batch.set( ref, document ) 
			})
		})

		return batch.commit()
	}

	find( queryObject: QueryObject<DocumentObject>, collectionName: string ): Promise< DocumentObject[] > {
		const query = this.queryObjectToQueryConstraints( queryObject, collectionName )
		return this.getFromQuery( query )
	}

	async count( queryObject: QueryObject<DocumentObject>, collectionName: string ): Promise<number> {
		const query = this.queryObjectToQueryConstraints( queryObject, collectionName )
		
		const snapShot = await getCountFromServer( query )
		return snapShot.data().count
	}

	delete( id: string, collectionName: string ): Promise< void > {
		const db = FirebaseHelper.instance.firestore()

		return deleteDoc( doc( db, collectionName, id ) )
	}

	next( maxDocs?: number ): Promise< DocumentObject[] > {
		if( !this._lastConstraints || !this._lastCollectionName ) throw new Error('You should perform a query prior to using method next')

		const db = FirebaseHelper.instance.firestore()
		this._lastLimit = maxDocs || this._lastLimit

		const constraints = this._lastConstraints.nonFilterConstraints.concat(
			limit( this._lastLimit ),
			startAfter( this._lastDocRetrieved )
		)

		return this.getFromQuery( query( collection( db, this._lastCollectionName ), ...constraints ) )
	}

	// prev should be used with next in reverse order
	// prev( limit?: number ): Promise< DocumentObject[] > {
	// }

	private queryObjectToQueryConstraints( queryObject: QueryObject<DocumentObject>, collectionName: string ): Query {
		const db = FirebaseHelper.instance.firestore()
		const andConstraints: QueryFieldFilterConstraint[] = []
		const orConstraints: QueryFieldFilterConstraint[] = []
		const nonFilterConstraints: QueryNonFilterConstraint[] = []

		DataSource.toPropertyPathOperations( queryObject.operations as any ).forEach( operation =>	{
			if ( operation.aggregate) orConstraints.push( where( operation.property, operation.operator, operation.value ) )
			else andConstraints.push( where( operation.property, operation.operator, operation.value ) )
		})

		if ( queryObject.sort?.propertyName ) {
			nonFilterConstraints.push( orderBy( queryObject.sort.propertyName, queryObject.sort.order ) )
		}
		
		this._lastConstraints = {
			orConstraints,
			andConstraints,
			nonFilterConstraints
		}

		this._lastCollectionName = collectionName

		if( queryObject.limit ) {
			this._lastLimit = queryObject.limit
			nonFilterConstraints.push( limit( queryObject.limit ) )
		}

		return query( collection( db, collectionName ), or( ...orConstraints, and( ...andConstraints ) ), ...nonFilterConstraints )
	}

	private getFromQuery( query: FirebaseQuery ) {
		return new Promise< DocumentObject[] >( async resolve => {
			const doc = await getDocs( query )
			this._lastDocRetrieved = doc.docs[ doc.docs.length-1 ]

			resolve( doc.docs.map( doc => doc.data() as DocumentObject ) ) 
		})
	}

	private _lastDocRetrieved: QueryDocumentSnapshot<DocumentData> | undefined
	private _lastConstraints: ConstraintsContainer | undefined
	private _lastLimit: number = 0
	private _lastCollectionName: string | undefined
}