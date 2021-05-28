import firebase from "firebase";

import "firebase/auth";
import "firebase/firestore";

export type FirebaseQuery = firebase.firestore.CollectionReference<firebase.firestore.DocumentData> 
							| firebase.firestore.Query<firebase.firestore.DocumentData>

export class FirebaseHelper {
	private static firebaseConfig = {
		apiKey: "AIzaSyDfMQ5VJ6KvqzWioD-uQA2z_2HjJwFtWH0",  																				// cSpell: disable-line
		authDomain: "test-934d3.firebaseapp.com",
		projectId: "test-934d3",
		storageBucket: "test-934d3.appspot.com",
		messagingSenderId: "386723616857",
		appId: "1:386723616857:web:aacf5f1f7a786a1925f948"
	}
	
	private constructor() {
		firebase.initializeApp( FirebaseHelper.firebaseConfig )
	}

	static get instance() {
		return this._instance || ( this._instance = new FirebaseHelper() )
	}

	firestore() {
		return firebase.firestore()
	}

	private static _instance: FirebaseHelper
}
