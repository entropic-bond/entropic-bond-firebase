import { CloudFunctions, Persistent, persistent, registerPersistentClass } from 'entropic-bond'
import { FirebaseHelper } from '../firebase-helper'
import { FirebaseCloudFunctions } from './firebase-cloud-functions'

@registerPersistentClass( 'ParamWrapper' )
export class ParamWrapper extends Persistent {
	constructor( a?: string, b?: number ) {
		super()
		this._a = a
		this._b = b
	}
	@persistent _a: string
	@persistent _b: number
}


describe( 'Cloud functions', ()=>{

	beforeEach(()=>{
		FirebaseHelper.setFirebaseConfig({
			projectId: 'demo-test',
			storageBucket: 'default-bucket'
		})
		
		FirebaseHelper.useEmulator()
		CloudFunctions.useCloudFunctionsService( 
			new FirebaseCloudFunctions( 'europe-west1', { emulate: true })
		)
	})

	it( 'should call cloud function', async ()=>{
		const testCallable = CloudFunctions.instance.getFunction<ParamWrapper, ParamWrapper>( 'testCallable' )
		const paramWrapper = new ParamWrapper( 'test', 30 )

		const a = paramWrapper.toObject()
		
		const result = await testCallable( paramWrapper )
		expect( result._a ).toEqual( 'test' )
		expect( result._b ).toEqual( 30 )
	})
})