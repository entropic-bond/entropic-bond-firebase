import firebase from 'firebase'
import { AuthErrorCode, AuthService, SignData, UserCredential } from 'entropic-bond'
import { FirebaseHelper } from '../firebase-helper'

export class FirebaseAuth extends AuthService<firebase.auth.UserCredential> {
	constructor() {
		super()
		this.registerCredentialProviders()
	}

	signUp( signData: SignData ): Promise<UserCredential> {
		const { authProvider, verificationLink } = signData
	
		if ( authProvider.slice( 0, 5 ) === 'email' ) {
			return new Promise<UserCredential>( async ( resolve: ( credential: UserCredential )=>void, reject: ( reason: AuthErrorCode ) => void ) => {
				try {
					const credentialFactory = this.credentialProviders[ 'email-sign-up' ]
					const userCredential = await credentialFactory( signData )
					
					if ( signData.name ) {
						userCredential.user.updateProfile({
							displayName: signData.name
						})
					}
					
					if ( verificationLink ) {
						await userCredential.user.sendEmailVerification({
							url: verificationLink
						})
					}

					resolve( await this.toUserCredential( userCredential.user ) )
				}
				catch( error ) {
					reject( error.code as AuthErrorCode )
				}
			})
		}
		else return this.login( signData )
	}

	login( signData: SignData ): Promise<UserCredential> {
		const { authProvider } = signData

		return new Promise<UserCredential>( async ( resolve, reject ) => {
			try {
				const credentialFactory = this.credentialProviders[ authProvider ]
				const userCredential = await credentialFactory( signData )
				resolve( await this.toUserCredential( userCredential.user ) )
			}
			catch( error ) {
				reject( error )
			}
		})
	}

	logout(): Promise<void> {
		return FirebaseHelper.instance.auth().signOut()
	}

	onAuthStateChange( onChange: (userCredential: UserCredential) => void ) {
		FirebaseHelper.instance.auth().onAuthStateChanged( async credential =>{
			onChange( await this.toUserCredential( credential ) )
		})
	}

	private async toUserCredential( nativeUserCredential: firebase.User ): Promise< UserCredential > {
		if ( !nativeUserCredential ) return null
		
		const claims = ( await nativeUserCredential.getIdTokenResult() ).claims

		return FirebaseAuth.convertCredentials( nativeUserCredential, claims )
	}

	static convertCredentials( nativeUserCredential: firebase.User, claims: {[key:string]:any} ): UserCredential {
		return ({
			id: nativeUserCredential.uid,
			email: nativeUserCredential.email,
			name: nativeUserCredential.displayName,
			pictureUrl: nativeUserCredential.photoURL,
			phoneNumber: nativeUserCredential.phoneNumber,
			emailVerified: nativeUserCredential.emailVerified,
			customData: {
				planExpireDate: claims.planExpireDate,
				subscriptionPlan: claims.subscriptionPlan,
				gdprConsent: claims.gdprConsent
			},
			lastLogin: Date.now(),
			creationDate: new Date( nativeUserCredential.metadata.creationTime ).getTime()
		})
	}

	private registerCredentialProviders() {
		this.registerCredentialProvider( 'email-sign-up', signData => FirebaseHelper.instance.auth()
		.createUserWithEmailAndPassword( signData.email, signData.password ) 
		)
		this.registerCredentialProvider( 'email', signData => FirebaseHelper.instance.auth()
		.signInWithEmailAndPassword( signData.email, signData.password ) 
		)
		this.registerCredentialProvider( 'google', () => FirebaseHelper.instance.auth()
			.signInWithPopup( new firebase.auth.GoogleAuthProvider() ) 
		)
		this.registerCredentialProvider( 'facebook', () => FirebaseHelper.instance.auth()
			.signInWithPopup( new firebase.auth.FacebookAuthProvider() )
		)
		this.registerCredentialProvider( 'anonymous', async () => FirebaseHelper.instance.auth()
			.signInAnonymously()
		)
	}
}