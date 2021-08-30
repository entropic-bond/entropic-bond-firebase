import firebase from 'firebase'
import { registerCloudStorage, CloudStorage, UploadControl, UploadProgress } from 'entropic-bond'
import { EmulatorConfig, FirebaseHelper } from '../firebase-helper'

@registerCloudStorage( 'FirebaseCloudStorage', ()=> new FirebaseCloudStorage() )
export class FirebaseCloudStorage extends CloudStorage {
	constructor( emulator?: EmulatorConfig ) {
		super()
		if ( emulator ) FirebaseHelper.useEmulator( emulator )
		const { emulate, host, storagePort } = FirebaseHelper.emulator

		if ( emulate ) {
			FirebaseHelper.instance.storage().useEmulator( host, storagePort )
		}
	}

	save( id: string, data: Blob | Uint8Array | ArrayBuffer, progress?: UploadProgress ): Promise<string> {
		const storage = FirebaseHelper.instance.storage()

		return new Promise<string>(( resolve, reject ) => {
			this._uploadTask = storage.ref().child( id ).put( data )
			
			if ( progress ) {
				var unsubscribe = this._uploadTask.on(
					firebase.storage.TaskEvent.STATE_CHANGED, snapshot => {
						progress( snapshot.bytesTransferred, snapshot.totalBytes )
					},
					null, 
					()=>unsubscribe() 
				);
			}

			this._uploadTask
				.then( () => resolve( id ) )
				.catch( error => reject( error ))
		})
	}

	getUrl( reference: string ): Promise<string> {
		if ( !reference ) return Promise.resolve( undefined )

		const storage = FirebaseHelper.instance.storage()
		return storage.ref().child( reference ).getDownloadURL()
	}

	uploadControl(): UploadControl {
		return {
			cancel: ()=>this._uploadTask.cancel(),
			pause: ()=>this._uploadTask.pause(),
			resume: ()=>this._uploadTask.resume(),
			onProgress: ( callback )=> this._uploadTask.on( 'state_changed', snapShot => {
				if ( callback ) {
					callback( snapShot.bytesTransferred, snapShot.totalBytes )
				}
			})
		}
	}

	delete( reference: string ): Promise<void> {
		const storage = FirebaseHelper.instance.storage()
		return storage.ref().child( reference ).delete()
	}

	private _uploadTask: firebase.storage.UploadTask
}