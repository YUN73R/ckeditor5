/**
 * @license Copyright (c) 2003-2021, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import GoogleDocsNormalizer from '../../src/normalizers/googledocsnormalizer';

// `execute()` of the google docs normalizer is tested with autogenerated normalization tests.
describe( 'GoogleDocsNormalizer', () => {
	const normalizer = new GoogleDocsNormalizer();

	describe( 'isActive()', () => {
		it( 'should return true from google docs content', () => {
			expect( normalizer.isActive( '<p id="docs-internal-guid-12345678-1234-1234-1234-1234567890ab"></p>' ) ).to.be.true;
		} );

		it( 'should return false for microsoft word content', () => {
			expect( normalizer.isActive( '<meta name=Generator content="Microsoft Word 15"><p>Foo bar</p>' ) ).to.be.false;
		} );

		it( 'should return false for content form other sources', () => {
			expect( normalizer.isActive( '<p>foo</p>' ) ).to.be.false;
		} );
	} );
} );
