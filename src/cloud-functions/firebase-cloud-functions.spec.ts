import { CloudFunctions } from 'entropic-bond'
import { FirebaseHelper } from '../firebase-helper'
import { FirebaseCloudFunctions } from './firebase-cloud-functions'

describe( 'Cloud functions', ()=>{

	beforeEach(()=>{
		FirebaseHelper.setFirebaseConfig({
			projectId: 'demo-test',
			storageBucket: 'default-bucket'
		})
		
		FirebaseHelper.useEmulator()
		CloudFunctions.useCloudFunctionsService( new FirebaseCloudFunctions() )
	})

	it( 'should call cloud function', async ()=>{
		const testCallable = CloudFunctions.instance.getFunction( 'testCallable' )
		expect( await testCallable({ test: 'test', age: 3 }) ).resolves.toEqual({ test: 'test', age: 3 })
	})
})