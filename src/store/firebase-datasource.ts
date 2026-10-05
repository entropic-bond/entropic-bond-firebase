import { and, collection, connectFirestoreEmulator, deleteDoc, doc, DocumentData, getCountFromServer, getDoc, getDocs, limit, onSnapshot, or, orderBy, Query, query, QueryDocumentSnapshot, QueryFieldFilterConstraint, QueryNonFilterConstraint, runTransaction as firestoreRunTransaction, startAfter, where, WhereFilterOp, writeBatch } from 'firebase/firestore'
import { CollectionChangeListener, Collections, DataSource, DocumentChange, DocumentChangeListener, DocumentObject, QueryCursor, QueryObject, QueryOperator, TransactionConflictError, TransactionHandle, Unsubscriber } from 'entropic-bond'
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

	async findById( id: string, collectionName: string ): Promise< DocumentObject > {
		const db = FirebaseHelper.instance.firestore()
		
		const docSnap = await getDoc( doc( db, collectionName, id ) )
		return docSnap.data() as DocumentObject
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

	find( queryObject: QueryObject<DocumentObject>, collectionName: string ): Promise< QueryCursor > {
		const baseQuery = this.queryObjectToQueryConstraints( queryObject, collectionName )
		return Promise.resolve( new FirebaseQueryCursor( baseQuery, queryObject.limit ?? 0 ) )
	}

	async count( queryObject: QueryObject<DocumentObject>, collectionName: string ): Promise<number> {
		const baseQuery = this.queryObjectToQueryConstraints( queryObject, collectionName )
		
		const snapShot = await getCountFromServer( baseQuery )
		return snapShot.data().count
	}

	delete( id: string, collectionName: string ): Promise< void > {
		const db = FirebaseHelper.instance.firestore()

		return deleteDoc( doc( db, collectionName, id ) )
	}

	override runTransaction< Result >( fn: ( handle: TransactionHandle ) => Promise< Result > ): Promise< Result > {
		const db = FirebaseHelper.instance.firestore()

		return firestoreRunTransaction( db, async transaction => {
			const handle: TransactionHandle = {
				findById: async ( id, collectionName ) => {
					const snap = await transaction.get( doc( db, collectionName, id ) )
					return snap.exists() ? snap.data() as DocumentObject : undefined
				},
				save: async ( id, collectionName, docData ) => {
					transaction.set( doc( db, collectionName, id ), docData as DocumentData, { merge: true } )
				},
				delete: async ( id, collectionName ) => {
					transaction.delete( doc( db, collectionName, id ) )
				}
			}
			return fn( handle )
		}).catch( error => {
			if ( error?.code === 'aborted' || error?.code === 'resource-exhausted' || error?.code === 'deadline-exceeded' ) {
				throw new TransactionConflictError()
			}
			throw error
		})
	}

	// prev should be used with next in reverse order
	// prev( limit?: number ): Promise< DocumentObject[] > {
	// }

	override onCollectionChange( queryObject: QueryObject<DocumentObject>, collectionName: string, listener: CollectionChangeListener<DocumentObject> ): Unsubscriber {
		const baseQuery = this.queryObjectToQueryConstraints( queryObject, collectionName )
		const queryConstraints = queryObject.limit
			? query( baseQuery, limit( queryObject.limit ) )
			: baseQuery

		return onSnapshot( queryConstraints, snapshot => {
			const changes = snapshot.docChanges().map( change => ({
				after: change.doc.data() as DocumentObject,
				type: change.type === 'added' ? 'create' : change.type === 'removed' ? 'delete' : 'update',
				before: undefined,
				params: {}
			} as DocumentChange<DocumentObject> ))
			listener( changes, snapshot.docs.map( d => d.data() as DocumentObject ) )
		})
	}

	override onDocumentChange( documentPath: string, documentId: string, listener: DocumentChangeListener<DocumentObject> ): Unsubscriber {
		const db = FirebaseHelper.instance.firestore()
		let previousExists: boolean | undefined

		return onSnapshot( doc( db, documentPath, documentId ), snapshot => {
			const exists = snapshot.exists()

			if ( previousExists === undefined && !exists ) {
				previousExists = exists
				return
			}

			previousExists = exists
			listener({
				type: exists ? 'update' : 'delete',
				before: undefined,
				after: snapshot.data() as DocumentObject,
				params: { ...snapshot.metadata, exists },
				collectionPath: documentPath
			})
		})
	}

	override onDocumentTemplateChange( collectionTemplate: string, listener: DocumentChangeListener<DocumentObject> ): Unsubscriber {
		throw new Error('Method not implemented.')
	}
	
	private queryObjectToQueryConstraints( queryObject: QueryObject<DocumentObject>, collectionName: string ): Query {
		const db = FirebaseHelper.instance.firestore()
		const andConstraints: QueryFieldFilterConstraint[] = []
		const orConstraints: QueryFieldFilterConstraint[] = []
		const nonFilterConstraints: QueryNonFilterConstraint[] = []

		DataSource.toPropertyPathOperations( queryObject.operations as any ).forEach( operation =>	{
			const operator = this.toFirebaseOperator( operation.operator )
			if ( operation.aggregate ) orConstraints.push( where( operation.property, operator, operation.value ) )
			else andConstraints.push( where( operation.property, operator, operation.value ) )
		})

		if ( queryObject.sort?.propertyName ) {
			nonFilterConstraints.push( orderBy( queryObject.sort.propertyName, queryObject.sort.order ) )
		}

		return query( collection( db, collectionName ), or( ...orConstraints, and( ...andConstraints ) ), ...nonFilterConstraints )
	}

	toFirebaseOperator( operator: QueryOperator ): WhereFilterOp {
		switch( operator ) {
			case '==': 
			case '!=':
			case '<':
			case '<=':
			case '>':
			case '>=': return operator
			case 'contains': return 'array-contains'
			case 'containsAny': return 'array-contains-any'
			default: return operator
		}
	}

	protected override resolveCollectionPaths( template: string ): Promise<string[]> {
		throw new Error('Method not implemented.')
	}
}

/**
 * A {@link QueryCursor} over one Firestore query. Firestore paginates server
 * side with `startAfter( snapshot )`, so instead of preloading the whole match
 * set this cursor keeps the base query, the page size and the last retrieved
 * snapshot and rebuilds the query on every `next()` call. All pagination state
 * lives in the cursor instance, never on the shared data source.
 */
export class FirebaseQueryCursor extends QueryCursor {
	/**
	 * @param baseQuery the query with the filters and sort, without limit
	 * @param pageSize the amount of documents per page. Zero means no limit.
	 */
	constructor( baseQuery: FirebaseQuery, pageSize: number ) {
		super([], pageSize )
		this._baseQuery = baseQuery
		this._pageSize = pageSize
	}

	/**
	 * Retrieves the next page of documents and advances the cursor. Once the
	 * result set is exhausted, later calls resolve to an empty page without
	 * querying Firestore again.
	 * @param limit the max amount of documents to retrieve. When set it replaces
	 * the cursor's current page size
	 * @returns a promise resolving to the next page of documents
	 */
	override next( limitTo?: number ): Promise< DocumentObject[] > {
		if ( this._exhausted ) return Promise.resolve([])
		if ( limitTo !== undefined ) this._pageSize = limitTo

		const constraints: QueryNonFilterConstraint[] = []
		if ( this._pageSize > 0 ) constraints.push( limit( this._pageSize ) )
		if ( this._lastSnapshot ) constraints.push( startAfter( this._lastSnapshot ) )

		return getDocs( query( this._baseQuery, ...constraints ) ).then( snapshot => {
			if ( snapshot.empty ) {
				this._exhausted = true
				return []
			}

			this._lastSnapshot = snapshot.docs[ snapshot.docs.length - 1 ]
			if ( this._pageSize > 0 && snapshot.size < this._pageSize ) this._exhausted = true

			return snapshot.docs.map( doc => doc.data() as DocumentObject )
		})
	}

	private _baseQuery: FirebaseQuery
	private _pageSize: number
	private _lastSnapshot: QueryDocumentSnapshot<DocumentData> | undefined
	private _exhausted = false
}
