import firebase from 'firebase/app'
import { SignData, UserCredentials } from 'entropic-bond'
import { AuthService, RejectedCallback, ResovedCallback, AuthErrorCode } from 'entropic-bond'
import { FirebaseHelper } from '../firebase-helper'
import { camelCase } from '../utils/utils'

export class FirebaseAuth extends AuthService<firebase.auth.UserCredential> {
	constructor() {
		super()
		this.registerCredentialProviders()
	}

	signUp( signData: SignData ): Promise<UserCredentials> {
		const { authProvider, verificationLink } = signData
	
		if ( authProvider.slice( 0, 5 ) === 'email' ) {
			return new Promise<UserCredentials>( async ( resolve: ResovedCallback, reject: RejectedCallback ) => {
				try {
					const credentialFactory = this.credentialProviders[ 'email-sign-up' ]
					const userCredentials = await credentialFactory( signData )
					
					if ( signData.name ) {
						userCredentials.user.updateProfile({
							displayName: signData.name
						})
					}
					
					if ( verificationLink ) {
						await userCredentials.user.sendEmailVerification({
							url: verificationLink
						})
					}

					resolve( await this.toUserCredentials( userCredentials.user ) )
				}
				catch( error ) {
					reject({ 
						code: camelCase( error.code.slice( 5 ) ) as AuthErrorCode, 
						message: error.message 
					})
				}
			})
		}
		else return this.login( signData )
	}

	login( signData: SignData ): Promise<UserCredentials> {
		const { authProvider } = signData

		return new Promise<UserCredentials>( async ( resolve: ResovedCallback, reject: RejectedCallback ) => {
			try {
				const credentialFactory = this.credentialProviders[ authProvider ]
				const userCredentials = await credentialFactory( signData )
				resolve( await this.toUserCredentials( userCredentials.user ) )
			}
			catch( error ) {
				reject({ 
					code: camelCase( error.code.slice( 5 ) ) as AuthErrorCode, 
					message: error.message
				})
			}
		})
	}

	logout(): Promise<void> {
		return FirebaseHelper.instance.auth().signOut()
	}

	onAuthStateChange( onChange: (userCredentials: UserCredentials) => void ) {
		FirebaseHelper.instance.auth().onAuthStateChanged( async credentials =>{
			onChange( await this.toUserCredentials( credentials ) )
		})
	}

	private async toUserCredentials( nativeUserCredential: firebase.User ): Promise< UserCredentials > {
		if ( !nativeUserCredential ) return null
		
		const claims = ( await nativeUserCredential.getIdTokenResult() ).claims

		return FirebaseAuth.convertCredentials( nativeUserCredential, claims )
	}

	static convertCredentials( nativeUserCredential: firebase.User, claims: {[key:string]:any} ): UserCredentials {
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