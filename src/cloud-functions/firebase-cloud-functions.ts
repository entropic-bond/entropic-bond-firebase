import { CloudFunction, CloudFunctionsService } from 'entropic-bond'
import { connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import { EmulatorConfig, FirebaseHelper } from '../firebase-helper'

export class FirebaseCloudFunctions implements CloudFunctionsService {
	constructor( region?: string, emulator?: EmulatorConfig ) {
		if ( region ) FirebaseHelper.setRegion( region )
		if ( emulator ) FirebaseHelper.useEmulator( emulator )
		
		if ( FirebaseHelper.emulator?.emulate ) {
			const { host, functionsPort } = FirebaseHelper.emulator
			connectFunctionsEmulator( FirebaseHelper.instance.functions(), host, functionsPort )
		}

	}

	getFunction<P, R>( cloudFunction: string ): CloudFunction<P, R> {
		return httpsCallable<P,R>( FirebaseHelper.instance.functions(), cloudFunction ) as unknown as CloudFunction<P, R>
	}
}