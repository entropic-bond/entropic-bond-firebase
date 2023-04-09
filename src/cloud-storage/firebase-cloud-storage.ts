import { registerCloudStorage, CloudStorage, UploadControl, UploadProgress } from 'entropic-bond'
import { deleteObject, getDownloadURL, ref, uploadBytesResumable, UploadTask, connectStorageEmulator } from 'firebase/storage'
import { EmulatorConfig, FirebaseHelper } from '../firebase-helper'

@registerCloudStorage( 'FirebaseCloudStorage', ()=> new FirebaseCloudStorage() )
export class FirebaseCloudStorage extends CloudStorage {
	constructor( emulator?: EmulatorConfig ) {
		super()
		if ( emulator ) FirebaseHelper.useEmulator( emulator )
		
		if ( FirebaseHelper.emulator?.emulate ) {
			const { host, storagePort } = FirebaseHelper.emulator
			if ( !host || !storagePort ) throw new Error( `You should define a host and a storage emulator port to use the emulator` )

			connectStorageEmulator( FirebaseHelper.instance.storage(), host, storagePort )
		}
	}

	save( id: string, data: Blob | Uint8Array | ArrayBuffer, progress?: UploadProgress ): Promise<string> {
		const storage = FirebaseHelper.instance.storage()

		return new Promise<string>(( resolve, reject ) => {
			this._uploadTask = uploadBytesResumable( ref( storage, id ), data )
			
			if ( progress ) {
				var unsubscribe = this._uploadTask.on( 'state_changed', 
					snapshot => {
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
		if ( !reference ) return Promise.reject( 'needs a reference' )

		const storage = FirebaseHelper.instance.storage()
		return getDownloadURL( ref( storage, reference ) )
	}

	uploadControl(): UploadControl {
		if ( !this._uploadTask ) throw new Error( `You should call save() before uploadControl()` )

		return {
			cancel: ()=>this._uploadTask?.cancel(),
			pause: ()=>this._uploadTask?.pause(),
			resume: ()=>this._uploadTask?.resume(),
			onProgress: ( callback )=> this._uploadTask?.on( 'state_changed', snapShot => {
				if ( callback ) {
					callback( snapShot.bytesTransferred, snapShot.totalBytes )
				}
			})
		}
	}

	delete( reference: string ): Promise<void> {
		const storage = FirebaseHelper.instance.storage()
		return deleteObject( ref( storage, reference ) )
	}

	private _uploadTask: UploadTask | undefined
}
