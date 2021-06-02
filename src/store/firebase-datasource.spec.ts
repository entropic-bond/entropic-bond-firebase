import fetch from 'node-fetch'
import { Model, Store } from 'entropic-bond'
import { FirebaseDatasource } from './firebase-datasource'
import { FirebaseHelper } from '../firebase-helper'
import { TestUser, DerivedUser, SubClass } from '../mocks/test-user'
import mockData from '../mocks/mock-data.json'

describe( 'Model', ()=>{
	let model: Model< TestUser >
	let testUser: TestUser

	FirebaseHelper.setFirebaseConfig({
		projectId: "demo-test",
	})
	FirebaseHelper.useEmulator({ firestorePort: 9080 })
	
	beforeEach( async ()=> {
		Store.useDataSource( new FirebaseDatasource() )
		
		testUser = new TestUser()
		testUser.name = {
			firstName: 'testUserFirstName',
			lastName: 'testUserLastName'
		}
		testUser.age = 35
		testUser.skills = [ 'lazy', 'dirty' ]
		
		model = Store.getModel<TestUser>( 'TestUser' )

		const users = mockData.TestUser

		for( const key in users ) {
			const user = new TestUser()
			user.fromObject( users[ key ] as any )
			await model.save( user )
		}
	})

	afterEach( async ()=>{
		FirebaseHelper.instance.firestore().terminate() 
		await fetch( 'http://localhost:9080/emulator/v1/projects/demo-test/databases/(default)/documents', {
			method: 'DELETE'
		})
	})

	it( 'should find document by id', async ()=>{
		await model.save( testUser )
		
		const user = await model.findById( testUser.id )

		expect( user ).toBeInstanceOf( TestUser )
		expect( user.id ).toEqual( testUser.id )
		expect( user.name.firstName ).toEqual( 'testUserFirstName' )
	})

	it( 'should write a document', async ()=>{
		await model.save( testUser )
		const newUser = await model.findById( testUser.id )

		expect( newUser.name ).toEqual({ 
			firstName: 'testUserFirstName',
			lastName: 'testUserLastName'
		})
	})	
	
	it( 'should delete a document by id', async ()=>{
		await model.save( testUser )
		
		const newUser = await model.findById( testUser.id )
		expect( newUser.age ).toBe( 35 )

		await model.delete( testUser.id )

		const deletedUser = await model.findById( testUser.id )
		expect( deletedUser ).toBeUndefined()
	})

	it( 'should not throw if a document id doesn\'t exists', ( done )=>{
		expect( ()=>{
			model.findById( 'nonExistingId' )
				.then( done )
				.catch( done )
		}).not.toThrow()
	})
	
	it( 'should return undefined if a document id doesn\'t exists', async ()=>{
		expect( await model.findById( 'nonExistingId' ) ).toBeUndefined()
	})

	it( 'should retrieve array fields', async ()=>{
		await model.save( testUser )
		const newUser = await model.findById( testUser.id )

		expect( Array.isArray( newUser.skills ) ).toBeTruthy()
		expect( newUser.skills ).toEqual( expect.arrayContaining([ 'lazy', 'dirty' ]))
	})

	it( 'should retrieve object fields', async ()=>{
		await model.save( testUser )
		const newUser = await model.findById( testUser.id )

		expect( newUser.name ).toEqual({
			firstName: 'testUserFirstName',
			lastName: 'testUserLastName'
		})
	})

	describe( 'Generic find', ()=>{
		it( 'should query all admins with query object', async ()=>{
			testUser.admin = true
			await model.save( testUser )

			const admins = await model.query({
				operations: {
					admin: {
						operator: '==',
						value: true
					}
				}
			})

			expect( admins.length ).toBeGreaterThanOrEqual( 1 )
			expect( admins[0] ).toBeInstanceOf( TestUser )
		})

		it( 'should find all admins with where methods', async ()=>{
			const admins = await model.find().where( 'admin', '==', true ).get()

			expect( admins.length ).toBeGreaterThanOrEqual( 1 )
			expect( admins[0] ).toBeInstanceOf( TestUser )
		})

		it( 'should find admins with age less than 56', async ()=>{
			const admins = await model.find()
				.where( 'admin', '==', true )
				.where( 'age', '<', 50 )
				.get()

			expect( admins.length ).toBeGreaterThanOrEqual( 1 )
			expect( admins[0].age ).toBeLessThan( 50 )
		})

		
	})

	describe( 'Derived classes should fit on parent collection', ()=>{

		it( 'should save derived object in parent collection', async ()=>{
			const derived = new DerivedUser()
			derived.name = { firstName: 'Fulanito', lastName: 'Derived' }
			derived.salary = 3900

			await model.save( derived )

			const newUser = await model.findById( derived.id ) as DerivedUser
			expect( newUser ).toBeInstanceOf( DerivedUser )
			expect( newUser.salary ).toBe( 3900 )
			expect( newUser.className ).toEqual( 'DerivedUser' )
		})
	})

	describe( 'References to documents', ()=>{
		let ref1: SubClass, ref2: SubClass

		beforeEach( async ()=>{
			testUser.documentRef = new SubClass()
			testUser.documentRef.year = 2045	
			ref1 = new SubClass(); ref1.year = 2081
			ref2 = new SubClass(); ref2.year = 2082
			testUser.manyRefs.push( ref1 )
			testUser.manyRefs.push( ref2 )

			await model.save( testUser )
		})

		it( 'should save a document as a reference', async ()=>{
			const subClassModel = Store.getModel( 'SubClass' )
			expect( subClassModel ).toBeDefined()
	
			const newDocument = await subClassModel.findById( testUser.documentRef.id ) as SubClass

			expect( newDocument ).toBeInstanceOf( SubClass )
			expect( newDocument.year ).toBe( 2045 )
		})

		it( 'should read a swallow document reference', async ()=>{
			const loadedUser = await model.findById( testUser.id )

			expect( loadedUser.documentRef ).toBeInstanceOf( SubClass )
			expect( loadedUser.documentRef.id ).toEqual( testUser.documentRef.id )
			expect( loadedUser.documentRef.year ).toBeUndefined()
			expect( loadedUser.documentRef.wasLoaded ).toBeFalsy()
		})

		it( 'should fill data of swallow document reference', async ()=>{
			const loadedUser = await model.findById( testUser.id )

			await Store.populate( loadedUser.documentRef )
			expect( loadedUser.documentRef.wasLoaded ).toBeTruthy()
			expect( loadedUser.documentRef.year ).toBe( 2045 )
		})


		it( 'should save and array of references', async ()=>{
			const subClassModel = Store.getModel( 'SubClass' )

			const newDocument = await subClassModel.findById( testUser.documentRef.id ) as SubClass

			expect( newDocument ).toBeInstanceOf( SubClass )
			expect( newDocument.year ).toBe( 2045 )
		})

		it( 'should read an array of references', async ()=>{
			const loadedUser = await model.findById( testUser.id )
			
			expect( loadedUser.manyRefs ).toHaveLength( 2 )
			expect( loadedUser.manyRefs[0] ).toBeInstanceOf( SubClass )
			expect( loadedUser.manyRefs ).toEqual( expect.arrayContaining([
				expect.objectContaining({ id: ref1.id }),
				expect.objectContaining({ id: ref2.id })
			]))
			expect( loadedUser.manyRefs[0].year ).toBeUndefined()
		})

		it( 'should fill array of refs', async ()=>{
			const loadedUser = await model.findById( testUser.id )
			await Store.populate( loadedUser.manyRefs )

			expect( loadedUser.manyRefs[0].year ).toBe( 2081 )
			expect( loadedUser.manyRefs[1].year ).toBe( 2082 )
		})

	})

	describe( 'Operations on queries', ()=>{
		it( 'should limit the result set', async ()=>{
			const unlimited = await model.find().get()
			const limited = await model.find().limit( 2 ).get()

			expect( unlimited.length ).not.toBe( limited.length )
			expect( limited ).toHaveLength( 2 )
		})

		it( 'should sort ascending the result set', async ()=>{
			const docs = await model.find().orderBy( 'age' ).get()

			expect( docs[0].id ).toEqual( 'user2' )
			expect( docs[1].id ).toEqual( 'user1' )
		})
		
		it( 'should sort descending the result set', async ()=>{
			const docs = await model.find().orderBy( 'age', 'desc' ).get()

			expect( docs[0].id ).toEqual( 'user3' )
			expect( docs[1].id ).toEqual( 'user4' )
		})

		it( 'should sort by deep property path', async ()=>{
			const docs = await model.find().orderByDeepProp( 'name.firstName', 'desc' ).get()

			expect( docs[0].id ).toEqual( 'user4' )
			expect( docs[1].id ).toEqual( 'user3' )
		})
		
		it( 'should sort by swallow property path', async ()=>{
			const docs = await model.find().orderByDeepProp( 'age' ).get()

			expect( docs[0].id ).toEqual( 'user2' )
			expect( docs[1].id ).toEqual( 'user1' )
		})		

		xdescribe( 'Data Cursors', ()=>{
			beforeEach( async ()=>{
				await model.find().get( 2 )
			})

			it( 'should get next result set', async ()=>{
				const docs = await model.next()
				expect( docs ).toHaveLength( 2 )
				expect( docs[0].id ).toEqual( 'user3' )
			})
			
			it( 'should get previous result set', async ()=>{
				await model.next()
				await model.next()
				const docs = await model.prev()
				expect( docs ).toHaveLength( 2 )
				expect( docs[0].id ).toEqual( 'user3' )
			})

			it( 'should not go lower than begining of result set', async ()=>{
				const docs = await model.prev()
				expect( docs ).toHaveLength( 0 )
			})
			
			it( 'should not go beyond the end of result set', async ()=>{
				await model.next()
				await model.next()
				const docs = await model.next()
				expect( docs ).toHaveLength( 0 )
			})
			
		})
	})

})
