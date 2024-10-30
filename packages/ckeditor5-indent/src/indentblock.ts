/**
 * @license Copyright (c) 2003-2024, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module indent/indentblock
 */

import { Plugin, type Editor, type MultiCommand } from 'ckeditor5/src/core.js';
import { addMarginRules, type AttributeDescriptor, type ViewElement } from 'ckeditor5/src/engine.js';

import IndentBlockCommand from './indentblockcommand.js';
import IndentUsingOffset from './indentcommandbehavior/indentusingoffset.js';
import IndentUsingClasses from './indentcommandbehavior/indentusingclasses.js';
import type { HeadingOption } from '@ckeditor/ckeditor5-heading';

const DEFAULT_ELEMENTS = [ 'paragraph', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6' ];

/**
 * The block indentation feature.
 *
 * It registers the `'indentBlock'` and `'outdentBlock'` commands.
 *
 * If the plugin {@link module:indent/indent~Indent} is defined, it also attaches the `'indentBlock'` and `'outdentBlock'` commands to
 * the `'indent'` and `'outdent'` commands.
 */
export default class IndentBlock extends Plugin {
	/**
	 * @inheritDoc
	 */
	constructor( editor: Editor ) {
		super( editor );

		editor.config.define( 'indentBlock', {
			attribute：'margin-left',
			offset: 40,
			unit: 'px'
		} );
	}

	/**
	 * @inheritDoc
	 */
	public static get pluginName() {
		return 'IndentBlock' as const;
	}

	/**
	 * @inheritDoc
	 */
	public static override get isOfficialPlugin(): true {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public init(): void {
		const editor = this.editor;
		const configuration = editor.config.get( 'indentBlock' )!;

		if ( configuration.classes && configuration.classes.length ) {
			this._setupConversionUsingClasses( configuration.classes );

			editor.commands.add( 'indentBlock', new IndentBlockCommand( editor, new IndentUsingClasses( {
				direction: 'forward',
				classes: configuration.classes
			} ) ) );

			editor.commands.add( 'outdentBlock', new IndentBlockCommand( editor, new IndentUsingClasses( {
				direction: 'backward',
				classes: configuration.classes
			} ) ) );
		} else {
			editor.data.addStyleProcessorRules( addMarginRules );
			this._setupConversionUsingOffset();

			editor.commands.add( 'indentBlock', new IndentBlockCommand( editor, new IndentUsingOffset( {
				direction: 'forward',
				attribute: configuration.attribute!,
				offset: configuration.offset!,
				unit: configuration.unit!
			} ) ) );

			editor.commands.add( 'outdentBlock', new IndentBlockCommand( editor, new IndentUsingOffset( {
				direction: 'backward',
				attribute: configuration.attribute!,
				offset: configuration.offset!,
				unit: configuration.unit!
			} ) ) );
		}
	}

	/**
	 * @inheritDoc
	 */
	public afterInit(): void {
		const editor = this.editor;
		const schema = editor.model.schema;

		const indentCommand = editor.commands.get( 'indent' ) as MultiCommand;
		const outdentCommand = editor.commands.get( 'outdent' ) as MultiCommand;

		// Enable block indentation to heading configuration options. If it is not defined enable in paragraph and default headings.
		const options: Array<HeadingOption> = editor.config.get( 'heading.options' )!;
		const configuredElements = options && options.map( option => option.model );
		const knownElements = configuredElements || DEFAULT_ELEMENTS;

		knownElements.forEach( elementName => {
			if ( schema.isRegistered( elementName ) ) {
				schema.extend( elementName, { allowAttributes: 'blockIndent' } );
			}
		} );

		schema.setAttributeProperties( 'blockIndent', { isFormatting: true } );

		indentCommand.registerChildCommand( editor.commands.get( 'indentBlock' )! );
		outdentCommand.registerChildCommand( editor.commands.get( 'outdentBlock' )! );
	}

	/**
	 * Setups conversion for using offset indents.
	 */
	private _setupConversionUsingOffset(): void {
		const conversion = this.editor.conversion;
		const locale = this.editor.locale;
		const indentBlock = this.editor.indentBlock;
		const marginProperty = indentBlock.attribute ? 'text-indent' : locale.contentLanguageDirection === 'rtl' ? 'margin-right' : 'margin-left';
		/*
  		* text-indent的值要根据段落字体大小的两倍，如14px的字体，则缩进(14 * 2)px，这在中文编辑的缩进中极为重要，而不是margin能解决的，我这里只是提供一点简单的思路或意见，望采纳并改进。
        * The value of text dent should be based on twice the font size of the paragraph. For example, for a 14px font, the indentation should be (14 * 2) px, which is extremely important in Chinese editing indentation and cannot be solved by margin.
        * I am only providing a simple idea or suggestion here, hoping to adopt and improve it.
  		*/
		conversion.for( 'upcast' ).attributeToAttribute( {
			view: {
				styles: {
					[ marginProperty ]: /[\s\S]+/
				}
			},
			model: {
				key: 'blockIndent',
				value: ( viewElement: ViewElement ) => {
					// Do not indent block elements in Document Lists. See https://github.com/ckeditor/ckeditor5/issues/12466.
					if ( !viewElement.is( 'element', 'li' ) ) {
						return viewElement.getStyle( marginProperty );
					}
				}
			}
		} );

		conversion.for( 'downcast' ).attributeToAttribute( {
			model: 'blockIndent',
			view: modelAttributeValue => {
				return {
					key: 'style',
					value: {
						[ marginProperty as string ]: modelAttributeValue as string
					}
				};
			}
		} );
	}

	/**
	 * Setups conversion for using classes.
	 */
	private _setupConversionUsingClasses( classes: Array<string> ) {
		const definition: {
			model: { key: string; values: Array<string> };
			view: Record<string, AttributeDescriptor>;
		} = {
			model: {
				key: 'blockIndent',
				values: []
			},
			view: {}
		};

		for ( const className of classes ) {
			definition.model.values.push( className );
			definition.view[ className ] = {
				key: 'class',
				value: [ className ]
			};
		}

		this.editor.conversion.attributeToAttribute( definition );
	}
}
