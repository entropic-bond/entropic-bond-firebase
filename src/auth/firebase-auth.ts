import { AuthProvider, SignData, UserCredentials, AuthService, RejectedCallback, ResovedCallback, AuthErrorCode, camelCase } from 'entropic-bond'
import { connectAuthEmulator, createUserWithEmailAndPassword, FacebookAuthProvider, GoogleAuthProvider, linkWithPopup, sendEmailVerification, signInAnonymously, signInWithEmailAndPassword, signInWithPopup, TwitterAuthProvider, updateProfile, unlink, User, UserCredential, sendPasswordResetEmail } from 'firebase/auth'
import { EmulatorConfig, FirebaseHelper } from '../firebase-helper'

interface CredentialProviders {
	[ name: string ]: ( signData: SignData ) => Promise<UserCredential>
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
			if ( !host || !authPort ) throw new Error( `You should define a host and an auth emulator port to use the emulator` )

			connectAuthEmulator( FirebaseHelper.instance.auth(), `http://${ host }:${ authPort }` )
		}

		this.registerCredentialProviders()
	}

	signUp<T extends {}>( signData: SignData ): Promise<UserCredentials<T>> {
		const { authProvider, verificationLink } = signData
	
		if ( authProvider.slice( 0, 5 ) === 'email' ) {
			return new Promise<UserCredentials<T>>( async ( resolve: ResovedCallback<T>, reject: RejectedCallback ) => {
				try {
					const credentialFactory = this.credentialProviders[ 'email-sign-up' ]
					if ( !credentialFactory ) throw new Error( `The provider ${ authProvider } is not registered` )

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

	login<T extends {}>( signData: SignData ): Promise<UserCredentials<T>> {
		const { authProvider } = signData

		return new Promise<UserCredentials<T>>( async ( resolve: ResovedCallback<T>, reject: RejectedCallback ) => {
			try {
				const credentialFactory = this.credentialProviders[ authProvider ]
				if ( !credentialFactory ) throw new Error( `The provider ${ authProvider } is not registered` )
				const userCredentials = await credentialFactory( signData )
				resolve( await this.toUserCredentials<T>( userCredentials.user ) )
			}
			catch( error ) {
				reject({ 
					code: error.code === 400? 'missingPassword' : camelCase( error.code.slice( 5 )) as AuthErrorCode, 
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

	onAuthStateChange<T extends {}>( onChange: (userCredentials: UserCredentials<T> | undefined) => void ) {
		FirebaseHelper.instance.auth().onAuthStateChanged( async credentials =>{
			onChange( credentials? await this.toUserCredentials( credentials ) : undefined )
		})
	}

	linkAdditionalProvider( provider: AuthProvider ): Promise<unknown> {
		const providerInstance = providerFactory[ provider ]()
		const currentUser = FirebaseHelper.instance.auth().currentUser
		if ( !currentUser ) throw new Error( `There is no logged in user` )

		return linkWithPopup( currentUser, providerInstance )
	}

	unlinkProvider( provider: AuthProvider ): Promise<unknown> {
		const { currentUser } = FirebaseHelper.instance.auth()
		if ( !currentUser ) throw new Error( `There is no logged in user` )

		currentUser.providerData
		return unlink( currentUser, providerFactory[ provider ]().providerId )
	}

	private async toUserCredentials<T extends {}>( nativeUserCredential: User ): Promise<UserCredentials<T>> {
		if ( !nativeUserCredential ) throw new Error( `The user in user credentials is not defined` )
		
		const claims = ( await nativeUserCredential.getIdTokenResult() ).claims as T

		return FirebaseAuth.convertCredentials<T>( nativeUserCredential, claims )
	}

	static convertCredentials<T extends {}>( nativeUserCredential: User, claims: T ): UserCredentials<T> {
		return ({
			id: nativeUserCredential.uid,
			email: nativeUserCredential.email ?? '',
			name: nativeUserCredential.displayName ?? undefined,
			pictureUrl: nativeUserCredential.photoURL ?? undefined,
			phoneNumber: nativeUserCredential.phoneNumber ?? undefined,
			emailVerified: nativeUserCredential.emailVerified,
			customData: {...claims},
			lastLogin: Date.now(),
			creationDate: nativeUserCredential.metadata.creationTime? new Date( nativeUserCredential.metadata.creationTime ).getTime() : undefined,
		})
	}

	registerCredentialProvider( name: string, providerFactory: ( singData: SignData ) => Promise<UserCredential> ) {
		this.credentialProviders[ name ] = providerFactory		
	}

	private registerCredentialProviders() { //TODO: refactor. Not needed anymore
		this.registerCredentialProvider( 'email-sign-up', signData => {
			if ( !signData.email || !signData.password ) throw new Error( `Email and password are required` )
			return createUserWithEmailAndPassword(	FirebaseHelper.instance.auth(), signData.email, signData.password )
		})
		this.registerCredentialProvider( 'email', signData => {
			if ( !signData.email || !signData.password ) throw new Error( `Email and password are required` )
			return signInWithEmailAndPassword( FirebaseHelper.instance.auth(), signData.email, signData.password )
		})
		this.registerCredentialProvider( 'google', () => signInWithPopup(
			FirebaseHelper.instance.auth(), new GoogleAuthProvider()
		))
		this.registerCredentialProvider( 'facebook', () => signInWithPopup(
			FirebaseHelper.instance.auth(), new FacebookAuthProvider()
		))
		this.registerCredentialProvider( 'twitter', () => signInWithPopup(
			FirebaseHelper.instance.auth(), new TwitterAuthProvider()
		))
		this.registerCredentialProvider( 'link-twitter', () => {
			const currentUser = FirebaseHelper.instance.auth().currentUser
			if ( !currentUser ) throw new Error( `There is no logged in user` )
			return linkWithPopup(	currentUser, new TwitterAuthProvider() )
		})
		this.registerCredentialProvider( 'anonymous', () => signInAnonymously(
			FirebaseHelper.instance.auth()
		))
	}

	private credentialProviders: CredentialProviders = {}
}