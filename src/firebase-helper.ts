import firebase from "firebase";

import "firebase/auth";
import "firebase/firestore";

export type FirebaseQuery = firebase.firestore.CollectionReference<firebase.firestore.DocumentData> 
							| firebase.firestore.Query<firebase.firestore.DocumentData>

export interface FirebaseConfig {
	apiKey?: string,
	authDomain?: string,
	projectId: string,
	databaseURL?: string,
	storageBucket?: string,
	messagingSenderId?: string,
	appId?: string,
}

export class FirebaseHelper {
	
	static setFirebaseConfig( config: FirebaseConfig ) {
		FirebaseHelper._firebaseConfig = config
	}

	private constructor() {
		if ( !FirebaseHelper._firebaseConfig ) throw new Error( 'You should set a firebase config object before using Firebase' )
		firebase.initializeApp( FirebaseHelper._firebaseConfig )
	}

	static get instance() {
		return this._instance || ( this._instance = new FirebaseHelper() )
	}

	firestore() {
		return firebase.firestore()
	}

	private static _instance: FirebaseHelper
	private static _firebaseConfig: FirebaseConfig
}
