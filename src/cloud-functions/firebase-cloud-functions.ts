import { CloudFunction, CloudFunctionsService } from 'entropic-bond'
import { connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import { EmulatorConfig, FirebaseHelper } from '../firebase-helper'

export class FirebaseCloudFunctions implements CloudFunctionsService {
	constructor( region?: string, emulator?: EmulatorConfig ) {
		if ( region ) FirebaseHelper.setRegion( region )
		if ( emulator ) FirebaseHelper.useEmulator( emulator )
		
		if ( FirebaseHelper.emulator?.emulate ) {
			const { host, functionsPort } = FirebaseHelper.emulator
			if ( !host || !functionsPort ) throw new Error( `You should define a host and a functions emulator port to use the emulator` )

			connectFunctionsEmulator( FirebaseHelper.instance.functions(), host, functionsPort )
		}

	}

	retrieveFunction<P, R>( cloudFunction: string ): CloudFunction<P, R> {
		return httpsCallable<P,R>( FirebaseHelper.instance.functions(), cloudFunction ) as unknown as CloudFunction<P, R>
	}

	async callFunction<P, R>( func: CloudFunction<P, R>, params: P ): Promise<R> {
		const res = await func( params ) as any
		return res.data
	}
}