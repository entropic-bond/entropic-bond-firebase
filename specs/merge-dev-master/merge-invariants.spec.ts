import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fromRoot = ( path: string ) => fileURLToPath( new URL( `../../${ path }`, import.meta.url ) )
const readJson = ( path: string ) => JSON.parse( readFileSync( fromRoot( path ), 'utf8' ) )

describe( 'Merge development into master', ()=>{

	it( 'keeps entropic-bond at the master release version REQ-1', ()=>{
		const manifest = readJson( 'package.json' )

		expect( manifest.dependencies['entropic-bond'] ).toBe( '^2.0.5' )
	} )

	it( 'keeps the lockfile consistent with the kept manifest REQ-2', ()=>{
		const manifest = readJson( 'package.json' )
		const lock = readJson( 'package-lock.json' )

		expect( lock.packages[''].dependencies ).toEqual( manifest.dependencies )
		expect( lock.packages[''].version ).toBe( manifest.version )
		expect( lock.packages['node_modules/entropic-bond'].version ).toMatch( /^2\./ )
	} )

	it( 'brings over the gh-issue-3 spec artifacts missing on master REQ-4', ()=>{
		expect( existsSync( fromRoot( 'src/store/specs/gh-issue-3/gh-issue-3.feature' ) ) ).toBe( true )
		expect( existsSync( fromRoot( 'src/store/specs/gh-issue-3/gh-issue-3-design.md' ) ) ).toBe( true )
	} )

} )
