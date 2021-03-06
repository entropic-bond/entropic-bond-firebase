import { AuthProvider, SignData, UserCredentials, AuthService, RejectedCallback, ResovedCallback, AuthErrorCode, camelCase } from 'entropic-bond'
import { connectAuthEmulator, createUserWithEmailAndPassword, FacebookAuthProvider, GoogleAuthProvider, linkWithPopup, sendEmailVerification, signInAnonymously, signInWithEmailAndPassword, signInWithPopup, TwitterAuthProvider, updateProfile, unlink, User, UserCredential, sendPasswordResetEmail } from 'firebase/auth'
import { EmulatorConfig, FirebaseHelper } from '../firebase-helper'

interface CredentialProviders {
	[ name: string ]: ( signData?: SignData ) => Promise<any>
}

const providerFactory = {
	'twitter': () => new TwitterAuthProvider(),
	'facebook': () => new FacebookAuthProvider(),
	'google': () => new GoogleAuthProvider()
}

export class FirebaseAuth extends AuthService {
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

	resetEmailPassword( email: string ) {
		return new Promise<void>( async ( resolve, reject ) => {
			try {
				await sendPasswordResetEmail( FirebaseHelper.instance.auth(), email )
				resolve()
			}
			catch( error ) {
				reject({
					code: camelCase( error.code.slice( 5 ) ) as AuthErrorCode,
					message: error.message
				})
			}
		})
	}

	onAuthStateChange( onChange: (userCredentials: UserCredentials) => void ) {
		FirebaseHelper.instance.auth().onAuthStateChanged( async credentials =>{
			onChange( await this.toUserCredentials( credentials ) )
		})
	}

	linkAdditionalProvider( provider: AuthProvider ): Promise<unknown> {
		const providerInstance = providerFactory[ provider ]()
		const currentUser = FirebaseHelper.instance.auth().currentUser

		return linkWithPopup( currentUser, providerInstance )
	}

	unlinkProvider( provider: AuthProvider ): Promise<unknown> {
		const { currentUser } = FirebaseHelper.instance.auth()
		currentUser.providerData
		return unlink( currentUser, providerFactory[ provider ]().providerId )
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

	registerCredentialProvider( name: string, providerFactory: ( singData?: SignData ) => Promise<UserCredential> ) {
		this.credentialProviders[ name ] = providerFactory		
	}

	private registerCredentialProviders() { //TODO: refactor. Not needed anymore
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
		this.registerCredentialProvider( 'twitter', () => signInWithPopup(
			FirebaseHelper.instance.auth(), new TwitterAuthProvider()
		))
		this.registerCredentialProvider( 'link-twitter', () => linkWithPopup(
			FirebaseHelper.instance.auth().currentUser, new TwitterAuthProvider()
		))
		this.registerCredentialProvider( 'anonymous', () => signInAnonymously(
			FirebaseHelper.instance.auth()
		))
	}

	private credentialProviders: CredentialProviders = {}
}