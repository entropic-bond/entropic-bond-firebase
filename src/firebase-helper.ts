import { FirebaseApp, initializeApp } from "firebase/app"
import { CollectionReference, DocumentData, getFirestore, Query } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

export type FirebaseQuery = CollectionReference<DocumentData> 
							| Query<DocumentData>

export interface FirebaseConfig {
	apiKey?: string,
	authDomain?: string,
	projectId: string,
	databaseURL?: string,
	storageBucket?: string,
	messagingSenderId?: string,
	appId?: string,
	measurementId?: string
}

export interface EmulatorConfig {
	host: string
	firestorePort: number
	storagePort: number
	authPort: number
	functionsPort: number
	emulate: boolean
}

export class FirebaseHelper {
	
	static setFirebaseConfig( config: FirebaseConfig ) {
		FirebaseHelper._firebaseConfig = config
	}

	private static defaultEmulatorConfig = {
		host: 'localhost',
		firestorePort: 8080,
		storagePort: 9199,
		authPort: 9099,
		functionsPort: 5001,
		emulate: false
	}

	static useEmulator( emulatorConfig?: Partial<EmulatorConfig> ) {

		this._emulatorConfig = {
			...FirebaseHelper.defaultEmulatorConfig,
			emulate: true,
			...emulatorConfig
		}
	}

	static get emulator() {
		return this._emulatorConfig
	}

	private constructor() {
		if ( !FirebaseHelper._firebaseConfig ) throw new Error( 'You should set a firebase config object before using Firebase' )
		this._firebaseApp = initializeApp( FirebaseHelper._firebaseConfig )
	}

	static get instance() {
		return this._instance || ( this._instance = new FirebaseHelper() )
	}

	firestore() {
		return getFirestore( this._firebaseApp )
	}

	storage() {
		return getStorage( this._firebaseApp )
	}

	auth() {
		return getAuth( this._firebaseApp )
	}

	functions() {
		return getFunctions( this._firebaseApp, FirebaseHelper._region )
	}

	static setRegion( region: string ) {
		this._region = region
	}

	private static _instance: FirebaseHelper
	private static _firebaseConfig: FirebaseConfig
	private static _emulatorConfig: EmulatorConfig = FirebaseHelper.defaultEmulatorConfig
	private static _region: string
	private _firebaseApp: FirebaseApp
}
