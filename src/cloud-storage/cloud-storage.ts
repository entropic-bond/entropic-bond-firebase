import { CloudStorage, UploadControl } from 'entropic-bond'

export class FirebaseCloudStorage extends CloudStorage {
	store( id: string, data: any ): Promise<string> {
		// TODO
		throw 'Not Implemented'	
	}

	getUrl( reference: string ): Promise<string> {
		// TODO
		throw 'Not Implemented'	
	}

	uploadControl(): UploadControl {
		// TODO
		throw 'Not Implemented'	
	}

	delete( reference: string ): Promise<void> {
		// TODO
		throw 'Not Implemented'	
	}


}