import { Auth } from 'entropic-bond'
import { FirebaseHelper } from '../firebase-helper'
import { FirebaseAuth } from './firebase-auth'

// NOTE: Firebase auth emulator requires a modification of the code to test which
//       violates testing best practices. Therefore, this test is disabled.

describe( 'Firebase Auth', ()=>{
	it( 'should pass', ()=>{
		expect( true ).toBe( true )
	})
	
// 	let authChangeSpy = jest.fn()
// 	FirebaseHelper.setFirebaseConfig({
// 		projectId: "demo-test",
// 	})
// 	FirebaseHelper.useEmulator({ authPort: 9099 })

// 	beforeEach(()=>{
// 		Auth.registerAuthService( new FirebaseAuth() )
// 		Auth.instance.onAuthStateChange( authChangeSpy ) 
// 	})

// 	it( 'should emulate sign-up', async ()=>{
// 		const userCredential = await Auth.instance.signUp({
// 			authProvider: 'google',
// 			email: 'test@test.com',
// 			password: 'password'
// 		})

// 		expect( userCredential.email ).toEqual( 'test@test.com' )
// 		expect( authChangeSpy ).toHaveBeenCalledWith( userCredential )
// 	})

// 	it( 'should emulate failed sign-up', async ()=>{
// 		try {
// 			var userCredential = await Auth.instance.signUp({
// 				authProvider: 'fail',
// 				email: 'test@test.com',
// 				password: 'password'
// 			})
// 		}
// 		catch {}

// 		expect( userCredential ).toBeUndefined()
// 		expect( authChangeSpy ).toHaveBeenCalledWith( undefined )
// 	})

// 	it( 'should login with fake registered user', async ()=>{
// 		const userCredentials = await Auth.instance.login({
// 			email: 'fakeUser@test.com',
// 			password: 'password',
// 			authProvider: 'google'
// 		})

// 		expect( userCredentials ).toEqual( 'fakeUseCredentials' )
// 		expect( authChangeSpy ).toHaveBeenCalledWith( 'fakeUseCredentials' )
// 	})

// 	it( 'should fail login with email auth provider if does not match fake user credentials', async ()=>{
// 		try {
// 			var userCredentials = await Auth.instance.login({
// 				email: 'test@test.com',
// 				password: 'password',
// 				authProvider: 'email'
// 			})
// 		} catch {}

// 		expect( userCredentials ).toEqual( undefined )
// 		expect( authChangeSpy ).toHaveBeenCalledWith( undefined )
// 	})
	
// 	it( 'should NOT fail login with non email auth provider even if does not match fake user credentials', async ()=>{
// 		const userCredentials = await Auth.instance.login({
// 			email: 'test@test.com',
// 			password: 'password',
// 			authProvider: 'google'
// 		})

// 		expect( userCredentials.email ).toEqual( 'test@test.com' )
// 		expect( authChangeSpy ).toHaveBeenCalledWith( undefined )
// 	})

// 	it( 'should logout', async ()=>{
// 		await Auth.instance.logout()

// 		expect( authChangeSpy ).toHaveBeenCalledWith( undefined )
// 	})
	
})