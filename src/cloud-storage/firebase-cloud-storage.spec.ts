/**
 * @jest-environment node
 */
import { FirebaseCloudStorage } from './firebase-cloud-storage'
import { FirebaseHelper } from '../firebase-helper'
import { FirebaseDatasource } from '../store/firebase-datasource'
import { CloudStorage, Model, Persistent, persistent, registerPersistentClass, Store, StoredFile } from 'entropic-bond'

// Note about tests leaking. I've been checking and looks like firebase.storage 
// methods are the responsible for the test leaking (as firebase v. 8.6.3).

class File {	
	data: Uint8Array
	name: string
	lastModified: any
	size: number
	type: any
	arrayBuffer: any
	slice: any
	stream: any
	text: any
}
global['File'] = File as any

@registerPersistentClass( 'Test' )
class Test extends Persistent {

	get file(): StoredFile {
		return this._file
	}
	
	@persistent private _file: StoredFile = new StoredFile()
}

describe( 'Firebase Cloud Storage', ()=>{
	const blobData1 = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x21]);
	const blobData2 = new Uint8Array([0x6c, 0x6c, 0x6f, 0x2c, 0x48, 0x65, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x21]);
	let file: StoredFile

	FirebaseHelper.setFirebaseConfig({
		projectId: 'demo-test',
		storageBucket: 'default-bucket'
	})
	FirebaseHelper.useEmulator({ firestorePort: 9080 })
	Store.useDataSource( new FirebaseDatasource() )

	beforeEach(()=>{
		CloudStorage.useCloudStorage( new FirebaseCloudStorage() )
		file = new StoredFile()
	})

	it( 'should save and get a url', async ()=>{
		await file.save({ data:blobData1 })

		expect( file.url ).toContain( file.id )
	})
	
	it( 'should report metadata', async ()=>{
		await file.save({ data: blobData1, fileName: 'test.dat' })

		expect( file.originalFileName ).toEqual( 'test.dat' )
		expect( file.provider.className ).toEqual( 'FirebaseCloudStorage' )
	})

	it( 'should delete file', async ()=>{
		await file.save({ data:blobData1 })

		await file.delete()
		expect( file.url ).not.toBeDefined()		
	})

	it( 'should overwrite file on subsequent writes', async ()=>{
		await file.save({ data:blobData1 })
		const firstUrl = file.url
		let resp = await fetch( file.url )
		expect( await resp.text() ).toEqual( 'Hello, world!')

		await file.save({ data:blobData2 })
		resp = await fetch( file.url )
		expect( 
			file.url.slice( 0, file.url.indexOf('token') ) 
		).toEqual( 
			firstUrl.slice( 0, firstUrl.indexOf('token') ) 
		)
		expect( await resp.text() ).toEqual( 'llo,He world!')
	})

	it( 'should trigger events', done=>{
		const cb = jest.fn()

		file.save({ data:blobData1 }).then( ()=>{
			expect( cb ).toHaveBeenCalledTimes( 2 )
			done()
		})
		
		file.uploadControl().onProgress( cb )
	})

	describe( 'Streaming', ()=>{
		let model: Model<Test>
		let testObj: Test

		beforeEach(()=>{
			testObj = new Test()
			model = Store.getModel<Test>( testObj )
		})

		it( 'should load object with StoredFile', async ()=>{
			await testObj.file.save({ data: blobData1, fileName: 'test.dat' })
			await model.save( testObj )

			const newTestObj = await model.findById( testObj.id )

			expect( newTestObj.file ).toBeInstanceOf( StoredFile )
			expect( newTestObj.file.url ).toContain( testObj.file.id )
		})

		it( 'should replace file on save after load', async ()=>{
			const deleteSpy = jest.spyOn( testObj.file, 'delete' )

			await testObj.file.save({ data: blobData1, fileName: 'test.dat' })
			await model.save( testObj )

			const newTestObj = await model.findById( testObj.id )

			expect( newTestObj.file ).toBeInstanceOf( StoredFile )
			expect( newTestObj.file.url ).toContain( testObj.file.id )
			expect( deleteSpy ).not.toHaveBeenCalled()

			testObj.file.setDataToStore( blobData2 )
			await testObj.file.save()

			expect( deleteSpy ).toHaveBeenCalled()
		})		

	})

})