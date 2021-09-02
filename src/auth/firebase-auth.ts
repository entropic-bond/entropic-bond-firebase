import { SignData, UserCredentials } from 'entropic-bond'
import { AuthService, RejectedCallback, ResovedCallback, AuthErrorCode } from 'entropic-bond'
import { connectAuthEmulator, createUserWithEmailAndPassword, FacebookAuthProvider, GoogleAuthProvider, sendEmailVerification, signInAnonymously, signInWithEmailAndPassword, signInWithPopup, updateProfile, User, UserCredential } from 'firebase/auth'
import { EmulatorConfig, FirebaseHelper } from '../firebase-helper'
import { camelCase } from '../utils/utils'

export class FirebaseAuth extends AuthService<UserCredential> {
	constructor( emulator?: EmulatorConfig ) {
		super()
		if ( emulator ) FirebaseHelper.useEmulator( emulator )
		
		if ( FirebaseHelper.emulator?.emulate ) {
			const { host, authPort } = FirebaseHelper.emulator
			connectAuthEmulator( FirebaseHelper.instance.auth(), `http://${ host }:${ authPort }` )
		}

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
						await updateProfile( userCredentials.user, {
							displayName: signData.name
						})
					}
					
					if ( verificationLink ) {
						await sendEmailVerification( userCredentials.user, {
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

	private async toUserCredentials( nativeUserCredential: User ): Promise< UserCredentials > {
		if ( !nativeUserCredential ) return null
		
		const claims = ( await nativeUserCredential.getIdTokenResult() ).claims

		return FirebaseAuth.convertCredentials( nativeUserCredential, claims )
	}

	static convertCredentials( nativeUserCredential: User, claims: {[key:string]:any} ): UserCredentials {
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
		this.registerCredentialProvider( 'email-sign-up', signData => createUserWithEmailAndPassword( 
			FirebaseHelper.instance.auth(), signData.email, signData.password 
		))
		this.registerCredentialProvider( 'email', signData => signInWithEmailAndPassword(
			FirebaseHelper.instance.auth(), signData.email, signData.password
		))
		this.registerCredentialProvider( 'google', () => signInWithPopup(
			FirebaseHelper.instance.auth(), new GoogleAuthProvider()
		))
		this.registerCredentialProvider( 'facebook', () => signInWithPopup(
			FirebaseHelper.instance.auth(), new FacebookAuthProvider()
		))
		this.registerCredentialProvider( 'anonymous', () => signInAnonymously(
			FirebaseHelper.instance.auth()
		))
	}
}