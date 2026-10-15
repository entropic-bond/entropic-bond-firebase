import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fromRoot = ( path: string ) => fileURLToPath( new URL( `../../${ path }`, import.meta.url ) )
const readJson = ( path: string ) => JSON.parse( readFileSync( fromRoot( path ), 'utf8' ) )

describe( 'Bump firebase to ^13', ()=>{

	it( 'declares the firebase dependency as ^13 REQ-1', ()=>{
		const manifest = readJson( 'package.json' )

		expect( manifest.dependencies['firebase'] ).toBe( '^13.0.0' )
	} )

	it( 'resolves firebase to a v13 release from the lockfile REQ-2', ()=>{
		const manifest = readJson( 'package.json' )
		const lock = readJson( 'package-lock.json' )

		expect( lock.packages[''].dependencies ).toEqual( manifest.dependencies )
		expect( lock.packages['node_modules/firebase'].version ).toMatch( /^13\./ )
	} )

	it( 'leaves every other dependency untouched REQ-3', ()=>{
		const manifest = readJson( 'package.json' )

		expect( manifest.dependencies ).toEqual( {
			'entropic-bond': '^2.0.5',
			'firebase': '^13.0.0'
		} )
		expect( manifest.devDependencies ).toEqual( {
			'@semantic-release/changelog': '^7.0.0',
			'@semantic-release/git': '^11.0.1',
			'@types/node': '^26.4.1',
			'semantic-release': '^25.0.9',
			'typescript': '^7.0.2',
			'vite': '^8.3.0',
			'vitest': '^5.0.0'
		} )
	} )

} )
