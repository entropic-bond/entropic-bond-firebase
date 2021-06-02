(global as any).XMLHttpRequest = require('xhr2')
import fetch from 'node-fetch'
import { CloudStorage, StoredFile } from 'entropic-bond'
import { FirebaseCloudStorage } from './firebase-cloud-storage'
import { FirebaseHelper } from '../firebase-helper'

// Note about tests leaking. I've been checking and looks like firebase.storage 
// methods are the responsible for the test leaking (as firebase v. 8.6.3).

describe( 'Firebase Cloud Storage', ()=>{
	const fileData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x21]);
	const fileData2 = new Uint8Array([0x6c, 0x6c, 0x6f, 0x2c, 0x48, 0x65, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x21]);
	let file: StoredFile

	FirebaseHelper.setFirebaseConfig({
		projectId: 'demo-test',
		storageBucket: 'default-bucket'
	})
	FirebaseHelper.useEmulator()
	
	beforeEach(()=>{
		CloudStorage.useCloudStorage( new FirebaseCloudStorage() )
		file = new StoredFile()
	})

	it( 'should save and get a url', async ()=>{
		await file.store( fileData )

		expect( file.url ).toContain( file.id )
	})
	
	it( 'should report metadata', async ()=>{
		await file.store( fileData, 'test.dat' )

		expect( file.originalFileName ).toEqual( 'test.dat' )
		expect( file.provider.className ).toEqual( 'FirebaseCloudStorage' )
	})

	it( 'should delete file', async ()=>{
		await file.store( fileData )

		await file.delete()
		expect( file.url ).not.toBeDefined()		
	})

	it( 'should overwrite file on subsequent writes', async ()=>{
		await file.store( fileData )
		const firstUrl = file.url
		let resp = await fetch( file.url )
		expect( await resp.text() ).toEqual( 'Hello, world!')

		await file.store( fileData2 )
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

		file.store( fileData ).then( ()=>{
			expect( cb ).toHaveBeenCalledTimes( 2 )
			done()
		})
		
		file.uploadControl().onProgress( cb )
	})
})