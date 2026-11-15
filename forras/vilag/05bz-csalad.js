/* ==== AUTOMATIKUSAN GENERÁLT (forras/tools/csalad.py) – az ugyvedhez.hu család-figurái (family3d v2: arc-mimika, ötujjú kéz, tincses haj, szél) ==== */
const BGU = (() => {

const { 	BufferAttribute, 	BufferGeometry, 	Float32BufferAttribute, 	InstancedBufferAttribute, 	InterleavedBuffer, 	InterleavedBufferAttribute, 	TriangleFanDrawMode, 	TriangleStripDrawMode, 	TrianglesDrawMode, 	Vector3, } = THREE;

function computeMikkTSpaceTangents( geometry, MikkTSpace, negateSign = true ) {

	if ( ! MikkTSpace || ! MikkTSpace.isReady ) {

		throw new Error( 'BufferGeometryUtils: Initialized MikkTSpace library required.' );

	}

	if ( ! geometry.hasAttribute( 'position' ) || ! geometry.hasAttribute( 'normal' ) || ! geometry.hasAttribute( 'uv' ) ) {

		throw new Error( 'BufferGeometryUtils: Tangents require "position", "normal", and "uv" attributes.' );

	}

	function getAttributeArray( attribute ) {

		if ( attribute.normalized || attribute.isInterleavedBufferAttribute ) {

			const dstArray = new Float32Array( attribute.count * attribute.itemSize );

			for ( let i = 0, j = 0; i < attribute.count; i ++ ) {

				dstArray[ j ++ ] = attribute.getX( i );
				dstArray[ j ++ ] = attribute.getY( i );

				if ( attribute.itemSize > 2 ) {

					dstArray[ j ++ ] = attribute.getZ( i );

				}

			}

			return dstArray;

		}

		if ( attribute.array instanceof Float32Array ) {

			return attribute.array;

		}

		return new Float32Array( attribute.array );

	}

	// MikkTSpace algorithm requires non-indexed input.

	const _geometry = geometry.index ? geometry.toNonIndexed() : geometry;

	// Compute vertex tangents.

	const tangents = MikkTSpace.generateTangents(

		getAttributeArray( _geometry.attributes.position ),
		getAttributeArray( _geometry.attributes.normal ),
		getAttributeArray( _geometry.attributes.uv )

	);

	// Texture coordinate convention of glTF differs from the apparent
	// default of the MikkTSpace library; .w component must be flipped.

	if ( negateSign ) {

		for ( let i = 3; i < tangents.length; i += 4 ) {

			tangents[ i ] *= - 1;

		}

	}

	//

	_geometry.setAttribute( 'tangent', new BufferAttribute( tangents, 4 ) );

	if ( geometry !== _geometry ) {

		geometry.copy( _geometry );

	}

	return geometry;

}

/**
 * @param  {Array<BufferGeometry>} geometries
 * @param  {Boolean} useGroups
 * @return {BufferGeometry}
 */
function mergeGeometries( geometries, useGroups = false ) {

	const isIndexed = geometries[ 0 ].index !== null;

	const attributesUsed = new Set( Object.keys( geometries[ 0 ].attributes ) );
	const morphAttributesUsed = new Set( Object.keys( geometries[ 0 ].morphAttributes ) );

	const attributes = {};
	const morphAttributes = {};

	const morphTargetsRelative = geometries[ 0 ].morphTargetsRelative;

	const mergedGeometry = new BufferGeometry();

	let offset = 0;

	for ( let i = 0; i < geometries.length; ++ i ) {

		const geometry = geometries[ i ];
		let attributesCount = 0;

		// ensure that all geometries are indexed, or none

		if ( isIndexed !== ( geometry.index !== null ) ) {

			console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.' );
			return null;

		}

		// gather attributes, exit early if they're different

		for ( const name in geometry.attributes ) {

			if ( ! attributesUsed.has( name ) ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '. All geometries must have compatible attributes; make sure "' + name + '" attribute exists among all geometries, or in none of them.' );
				return null;

			}

			if ( attributes[ name ] === undefined ) attributes[ name ] = [];

			attributes[ name ].push( geometry.attributes[ name ] );

			attributesCount ++;

		}

		// ensure geometries have the same number of attributes

		if ( attributesCount !== attributesUsed.size ) {

			console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '. Make sure all geometries have the same number of attributes.' );
			return null;

		}

		// gather morph attributes, exit early if they're different

		if ( morphTargetsRelative !== geometry.morphTargetsRelative ) {

			console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '. .morphTargetsRelative must be consistent throughout all geometries.' );
			return null;

		}

		for ( const name in geometry.morphAttributes ) {

			if ( ! morphAttributesUsed.has( name ) ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '.  .morphAttributes must be consistent throughout all geometries.' );
				return null;

			}

			if ( morphAttributes[ name ] === undefined ) morphAttributes[ name ] = [];

			morphAttributes[ name ].push( geometry.morphAttributes[ name ] );

		}

		if ( useGroups ) {

			let count;

			if ( isIndexed ) {

				count = geometry.index.count;

			} else if ( geometry.attributes.position !== undefined ) {

				count = geometry.attributes.position.count;

			} else {

				console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '. The geometry must have either an index or a position attribute' );
				return null;

			}

			mergedGeometry.addGroup( offset, count, i );

			offset += count;

		}

	}

	// merge indices

	if ( isIndexed ) {

		let indexOffset = 0;
		const mergedIndex = [];

		for ( let i = 0; i < geometries.length; ++ i ) {

			const index = geometries[ i ].index;

			for ( let j = 0; j < index.count; ++ j ) {

				mergedIndex.push( index.getX( j ) + indexOffset );

			}

			indexOffset += geometries[ i ].attributes.position.count;

		}

		mergedGeometry.setIndex( mergedIndex );

	}

	// merge attributes

	for ( const name in attributes ) {

		const mergedAttribute = mergeAttributes( attributes[ name ] );

		if ( ! mergedAttribute ) {

			console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the ' + name + ' attribute.' );
			return null;

		}

		mergedGeometry.setAttribute( name, mergedAttribute );

	}

	// merge morph attributes

	for ( const name in morphAttributes ) {

		const numMorphTargets = morphAttributes[ name ][ 0 ].length;

		if ( numMorphTargets === 0 ) break;

		mergedGeometry.morphAttributes = mergedGeometry.morphAttributes || {};
		mergedGeometry.morphAttributes[ name ] = [];

		for ( let i = 0; i < numMorphTargets; ++ i ) {

			const morphAttributesToMerge = [];

			for ( let j = 0; j < morphAttributes[ name ].length; ++ j ) {

				morphAttributesToMerge.push( morphAttributes[ name ][ j ][ i ] );

			}

			const mergedMorphAttribute = mergeAttributes( morphAttributesToMerge );

			if ( ! mergedMorphAttribute ) {

				console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the ' + name + ' morphAttribute.' );
				return null;

			}

			mergedGeometry.morphAttributes[ name ].push( mergedMorphAttribute );

		}

	}

	return mergedGeometry;

}

/**
 * @param {Array<BufferAttribute>} attributes
 * @return {BufferAttribute}
 */
function mergeAttributes( attributes ) {

	let TypedArray;
	let itemSize;
	let normalized;
	let gpuType = - 1;
	let arrayLength = 0;

	for ( let i = 0; i < attributes.length; ++ i ) {

		const attribute = attributes[ i ];

		if ( TypedArray === undefined ) TypedArray = attribute.array.constructor;
		if ( TypedArray !== attribute.array.constructor ) {

			console.error( 'THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.' );
			return null;

		}

		if ( itemSize === undefined ) itemSize = attribute.itemSize;
		if ( itemSize !== attribute.itemSize ) {

			console.error( 'THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.' );
			return null;

		}

		if ( normalized === undefined ) normalized = attribute.normalized;
		if ( normalized !== attribute.normalized ) {

			console.error( 'THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.' );
			return null;

		}

		if ( gpuType === - 1 ) gpuType = attribute.gpuType;
		if ( gpuType !== attribute.gpuType ) {

			console.error( 'THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.' );
			return null;

		}

		arrayLength += attribute.count * itemSize;

	}

	const array = new TypedArray( arrayLength );
	const result = new BufferAttribute( array, itemSize, normalized );
	let offset = 0;

	for ( let i = 0; i < attributes.length; ++ i ) {

		const attribute = attributes[ i ];
		if ( attribute.isInterleavedBufferAttribute ) {

			const tupleOffset = offset / itemSize;
			for ( let j = 0, l = attribute.count; j < l; j ++ ) {

				for ( let c = 0; c < itemSize; c ++ ) {

					const value = attribute.getComponent( j, c );
					result.setComponent( j + tupleOffset, c, value );

				}

			}

		} else {

			array.set( attribute.array, offset );

		}

		offset += attribute.count * itemSize;

	}

	if ( gpuType !== undefined ) {

		result.gpuType = gpuType;

	}

	return result;

}

/**
 * @param {BufferAttribute}
 * @return {BufferAttribute}
 */
function deepCloneAttribute( attribute ) {

	if ( attribute.isInstancedInterleavedBufferAttribute || attribute.isInterleavedBufferAttribute ) {

		return deinterleaveAttribute( attribute );

	}

	if ( attribute.isInstancedBufferAttribute ) {

		return new InstancedBufferAttribute().copy( attribute );

	}

	return new BufferAttribute().copy( attribute );

}

/**
 * @param {Array<BufferAttribute>} attributes
 * @return {Array<InterleavedBufferAttribute>}
 */
function interleaveAttributes( attributes ) {

	// Interleaves the provided attributes into an InterleavedBuffer and returns
	// a set of InterleavedBufferAttributes for each attribute
	let TypedArray;
	let arrayLength = 0;
	let stride = 0;

	// calculate the length and type of the interleavedBuffer
	for ( let i = 0, l = attributes.length; i < l; ++ i ) {

		const attribute = attributes[ i ];

		if ( TypedArray === undefined ) TypedArray = attribute.array.constructor;
		if ( TypedArray !== attribute.array.constructor ) {

			console.error( 'AttributeBuffers of different types cannot be interleaved' );
			return null;

		}

		arrayLength += attribute.array.length;
		stride += attribute.itemSize;

	}

	// Create the set of buffer attributes
	const interleavedBuffer = new InterleavedBuffer( new TypedArray( arrayLength ), stride );
	let offset = 0;
	const res = [];
	const getters = [ 'getX', 'getY', 'getZ', 'getW' ];
	const setters = [ 'setX', 'setY', 'setZ', 'setW' ];

	for ( let j = 0, l = attributes.length; j < l; j ++ ) {

		const attribute = attributes[ j ];
		const itemSize = attribute.itemSize;
		const count = attribute.count;
		const iba = new InterleavedBufferAttribute( interleavedBuffer, itemSize, offset, attribute.normalized );
		res.push( iba );

		offset += itemSize;

		// Move the data for each attribute into the new interleavedBuffer
		// at the appropriate offset
		for ( let c = 0; c < count; c ++ ) {

			for ( let k = 0; k < itemSize; k ++ ) {

				iba[ setters[ k ] ]( c, attribute[ getters[ k ] ]( c ) );

			}

		}

	}

	return res;

}

// returns a new, non-interleaved version of the provided attribute
function deinterleaveAttribute( attribute ) {

	const cons = attribute.data.array.constructor;
	const count = attribute.count;
	const itemSize = attribute.itemSize;
	const normalized = attribute.normalized;

	const array = new cons( count * itemSize );
	let newAttribute;
	if ( attribute.isInstancedInterleavedBufferAttribute ) {

		newAttribute = new InstancedBufferAttribute( array, itemSize, normalized, attribute.meshPerAttribute );

	} else {

		newAttribute = new BufferAttribute( array, itemSize, normalized );

	}

	for ( let i = 0; i < count; i ++ ) {

		newAttribute.setX( i, attribute.getX( i ) );

		if ( itemSize >= 2 ) {

			newAttribute.setY( i, attribute.getY( i ) );

		}

		if ( itemSize >= 3 ) {

			newAttribute.setZ( i, attribute.getZ( i ) );

		}

		if ( itemSize >= 4 ) {

			newAttribute.setW( i, attribute.getW( i ) );

		}

	}

	return newAttribute;

}

// deinterleaves all attributes on the geometry
function deinterleaveGeometry( geometry ) {

	const attributes = geometry.attributes;
	const morphTargets = geometry.morphTargets;
	const attrMap = new Map();

	for ( const key in attributes ) {

		const attr = attributes[ key ];
		if ( attr.isInterleavedBufferAttribute ) {

			if ( ! attrMap.has( attr ) ) {

				attrMap.set( attr, deinterleaveAttribute( attr ) );

			}

			attributes[ key ] = attrMap.get( attr );

		}

	}

	for ( const key in morphTargets ) {

		const attr = morphTargets[ key ];
		if ( attr.isInterleavedBufferAttribute ) {

			if ( ! attrMap.has( attr ) ) {

				attrMap.set( attr, deinterleaveAttribute( attr ) );

			}

			morphTargets[ key ] = attrMap.get( attr );

		}

	}

}

/**
 * @param {BufferGeometry} geometry
 * @return {number}
 */
function estimateBytesUsed( geometry ) {

	// Return the estimated memory used by this geometry in bytes
	// Calculate using itemSize, count, and BYTES_PER_ELEMENT to account
	// for InterleavedBufferAttributes.
	let mem = 0;
	for ( const name in geometry.attributes ) {

		const attr = geometry.getAttribute( name );
		mem += attr.count * attr.itemSize * attr.array.BYTES_PER_ELEMENT;

	}

	const indices = geometry.getIndex();
	mem += indices ? indices.count * indices.itemSize * indices.array.BYTES_PER_ELEMENT : 0;
	return mem;

}

/**
 * @param {BufferGeometry} geometry
 * @param {number} tolerance
 * @return {BufferGeometry}
 */
function mergeVertices( geometry, tolerance = 1e-4 ) {

	tolerance = Math.max( tolerance, Number.EPSILON );

	// Generate an index buffer if the geometry doesn't have one, or optimize it
	// if it's already available.
	const hashToIndex = {};
	const indices = geometry.getIndex();
	const positions = geometry.getAttribute( 'position' );
	const vertexCount = indices ? indices.count : positions.count;

	// next value for triangle indices
	let nextIndex = 0;

	// attributes and new attribute arrays
	const attributeNames = Object.keys( geometry.attributes );
	const tmpAttributes = {};
	const tmpMorphAttributes = {};
	const newIndices = [];
	const getters = [ 'getX', 'getY', 'getZ', 'getW' ];
	const setters = [ 'setX', 'setY', 'setZ', 'setW' ];

	// Initialize the arrays, allocating space conservatively. Extra
	// space will be trimmed in the last step.
	for ( let i = 0, l = attributeNames.length; i < l; i ++ ) {

		const name = attributeNames[ i ];
		const attr = geometry.attributes[ name ];

		tmpAttributes[ name ] = new attr.constructor(
			new attr.array.constructor( attr.count * attr.itemSize ),
			attr.itemSize,
			attr.normalized
		);

		const morphAttributes = geometry.morphAttributes[ name ];
		if ( morphAttributes ) {

			if ( ! tmpMorphAttributes[ name ] ) tmpMorphAttributes[ name ] = [];
			morphAttributes.forEach( ( morphAttr, i ) => {

				const array = new morphAttr.array.constructor( morphAttr.count * morphAttr.itemSize );
				tmpMorphAttributes[ name ][ i ] = new morphAttr.constructor( array, morphAttr.itemSize, morphAttr.normalized );

			} );

		}

	}

	// convert the error tolerance to an amount of decimal places to truncate to
	const halfTolerance = tolerance * 0.5;
	const exponent = Math.log10( 1 / tolerance );
	const hashMultiplier = Math.pow( 10, exponent );
	const hashAdditive = halfTolerance * hashMultiplier;
	for ( let i = 0; i < vertexCount; i ++ ) {

		const index = indices ? indices.getX( i ) : i;

		// Generate a hash for the vertex attributes at the current index 'i'
		let hash = '';
		for ( let j = 0, l = attributeNames.length; j < l; j ++ ) {

			const name = attributeNames[ j ];
			const attribute = geometry.getAttribute( name );
			const itemSize = attribute.itemSize;

			for ( let k = 0; k < itemSize; k ++ ) {

				// double tilde truncates the decimal value
				hash += `${ ~ ~ ( attribute[ getters[ k ] ]( index ) * hashMultiplier + hashAdditive ) },`;

			}

		}

		// Add another reference to the vertex if it's already
		// used by another index
		if ( hash in hashToIndex ) {

			newIndices.push( hashToIndex[ hash ] );

		} else {

			// copy data to the new index in the temporary attributes
			for ( let j = 0, l = attributeNames.length; j < l; j ++ ) {

				const name = attributeNames[ j ];
				const attribute = geometry.getAttribute( name );
				const morphAttributes = geometry.morphAttributes[ name ];
				const itemSize = attribute.itemSize;
				const newArray = tmpAttributes[ name ];
				const newMorphArrays = tmpMorphAttributes[ name ];

				for ( let k = 0; k < itemSize; k ++ ) {

					const getterFunc = getters[ k ];
					const setterFunc = setters[ k ];
					newArray[ setterFunc ]( nextIndex, attribute[ getterFunc ]( index ) );

					if ( morphAttributes ) {

						for ( let m = 0, ml = morphAttributes.length; m < ml; m ++ ) {

							newMorphArrays[ m ][ setterFunc ]( nextIndex, morphAttributes[ m ][ getterFunc ]( index ) );

						}

					}

				}

			}

			hashToIndex[ hash ] = nextIndex;
			newIndices.push( nextIndex );
			nextIndex ++;

		}

	}

	// generate result BufferGeometry
	const result = geometry.clone();
	for ( const name in geometry.attributes ) {

		const tmpAttribute = tmpAttributes[ name ];

		result.setAttribute( name, new tmpAttribute.constructor(
			tmpAttribute.array.slice( 0, nextIndex * tmpAttribute.itemSize ),
			tmpAttribute.itemSize,
			tmpAttribute.normalized,
		) );

		if ( ! ( name in tmpMorphAttributes ) ) continue;

		for ( let j = 0; j < tmpMorphAttributes[ name ].length; j ++ ) {

			const tmpMorphAttribute = tmpMorphAttributes[ name ][ j ];

			result.morphAttributes[ name ][ j ] = new tmpMorphAttribute.constructor(
				tmpMorphAttribute.array.slice( 0, nextIndex * tmpMorphAttribute.itemSize ),
				tmpMorphAttribute.itemSize,
				tmpMorphAttribute.normalized,
			);

		}

	}

	// indices

	result.setIndex( newIndices );

	return result;

}

/**
 * @param {BufferGeometry} geometry
 * @param {number} drawMode
 * @return {BufferGeometry}
 */
function toTrianglesDrawMode( geometry, drawMode ) {

	if ( drawMode === TrianglesDrawMode ) {

		console.warn( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles.' );
		return geometry;

	}

	if ( drawMode === TriangleFanDrawMode || drawMode === TriangleStripDrawMode ) {

		let index = geometry.getIndex();

		// generate index if not present

		if ( index === null ) {

			const indices = [];

			const position = geometry.getAttribute( 'position' );

			if ( position !== undefined ) {

				for ( let i = 0; i < position.count; i ++ ) {

					indices.push( i );

				}

				geometry.setIndex( indices );
				index = geometry.getIndex();

			} else {

				console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.' );
				return geometry;

			}

		}

		//

		const numberOfTriangles = index.count - 2;
		const newIndices = [];

		if ( drawMode === TriangleFanDrawMode ) {

			// gl.TRIANGLE_FAN

			for ( let i = 1; i <= numberOfTriangles; i ++ ) {

				newIndices.push( index.getX( 0 ) );
				newIndices.push( index.getX( i ) );
				newIndices.push( index.getX( i + 1 ) );

			}

		} else {

			// gl.TRIANGLE_STRIP

			for ( let i = 0; i < numberOfTriangles; i ++ ) {

				if ( i % 2 === 0 ) {

					newIndices.push( index.getX( i ) );
					newIndices.push( index.getX( i + 1 ) );
					newIndices.push( index.getX( i + 2 ) );

				} else {

					newIndices.push( index.getX( i + 2 ) );
					newIndices.push( index.getX( i + 1 ) );
					newIndices.push( index.getX( i ) );

				}

			}

		}

		if ( ( newIndices.length / 3 ) !== numberOfTriangles ) {

			console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.' );

		}

		// build final geometry

		const newGeometry = geometry.clone();
		newGeometry.setIndex( newIndices );
		newGeometry.clearGroups();

		return newGeometry;

	} else {

		console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:', drawMode );
		return geometry;

	}

}

/**
 * Calculates the morphed attributes of a morphed/skinned BufferGeometry.
 * Helpful for Raytracing or Decals.
 * @param {Mesh | Line | Points} object An instance of Mesh, Line or Points.
 * @return {Object} An Object with original position/normal attributes and morphed ones.
 */
function computeMorphedAttributes( object ) {

	const _vA = new Vector3();
	const _vB = new Vector3();
	const _vC = new Vector3();

	const _tempA = new Vector3();
	const _tempB = new Vector3();
	const _tempC = new Vector3();

	const _morphA = new Vector3();
	const _morphB = new Vector3();
	const _morphC = new Vector3();

	function _calculateMorphedAttributeData(
		object,
		attribute,
		morphAttribute,
		morphTargetsRelative,
		a,
		b,
		c,
		modifiedAttributeArray
	) {

		_vA.fromBufferAttribute( attribute, a );
		_vB.fromBufferAttribute( attribute, b );
		_vC.fromBufferAttribute( attribute, c );

		const morphInfluences = object.morphTargetInfluences;

		if ( morphAttribute && morphInfluences ) {

			_morphA.set( 0, 0, 0 );
			_morphB.set( 0, 0, 0 );
			_morphC.set( 0, 0, 0 );

			for ( let i = 0, il = morphAttribute.length; i < il; i ++ ) {

				const influence = morphInfluences[ i ];
				const morph = morphAttribute[ i ];

				if ( influence === 0 ) continue;

				_tempA.fromBufferAttribute( morph, a );
				_tempB.fromBufferAttribute( morph, b );
				_tempC.fromBufferAttribute( morph, c );

				if ( morphTargetsRelative ) {

					_morphA.addScaledVector( _tempA, influence );
					_morphB.addScaledVector( _tempB, influence );
					_morphC.addScaledVector( _tempC, influence );

				} else {

					_morphA.addScaledVector( _tempA.sub( _vA ), influence );
					_morphB.addScaledVector( _tempB.sub( _vB ), influence );
					_morphC.addScaledVector( _tempC.sub( _vC ), influence );

				}

			}

			_vA.add( _morphA );
			_vB.add( _morphB );
			_vC.add( _morphC );

		}

		if ( object.isSkinnedMesh ) {

			object.applyBoneTransform( a, _vA );
			object.applyBoneTransform( b, _vB );
			object.applyBoneTransform( c, _vC );

		}

		modifiedAttributeArray[ a * 3 + 0 ] = _vA.x;
		modifiedAttributeArray[ a * 3 + 1 ] = _vA.y;
		modifiedAttributeArray[ a * 3 + 2 ] = _vA.z;
		modifiedAttributeArray[ b * 3 + 0 ] = _vB.x;
		modifiedAttributeArray[ b * 3 + 1 ] = _vB.y;
		modifiedAttributeArray[ b * 3 + 2 ] = _vB.z;
		modifiedAttributeArray[ c * 3 + 0 ] = _vC.x;
		modifiedAttributeArray[ c * 3 + 1 ] = _vC.y;
		modifiedAttributeArray[ c * 3 + 2 ] = _vC.z;

	}

	const geometry = object.geometry;
	const material = object.material;

	let a, b, c;
	const index = geometry.index;
	const positionAttribute = geometry.attributes.position;
	const morphPosition = geometry.morphAttributes.position;
	const morphTargetsRelative = geometry.morphTargetsRelative;
	const normalAttribute = geometry.attributes.normal;
	const morphNormal = geometry.morphAttributes.position;

	const groups = geometry.groups;
	const drawRange = geometry.drawRange;
	let i, j, il, jl;
	let group;
	let start, end;

	const modifiedPosition = new Float32Array( positionAttribute.count * positionAttribute.itemSize );
	const modifiedNormal = new Float32Array( normalAttribute.count * normalAttribute.itemSize );

	if ( index !== null ) {

		// indexed buffer geometry

		if ( Array.isArray( material ) ) {

			for ( i = 0, il = groups.length; i < il; i ++ ) {

				group = groups[ i ];

				start = Math.max( group.start, drawRange.start );
				end = Math.min( ( group.start + group.count ), ( drawRange.start + drawRange.count ) );

				for ( j = start, jl = end; j < jl; j += 3 ) {

					a = index.getX( j );
					b = index.getX( j + 1 );
					c = index.getX( j + 2 );

					_calculateMorphedAttributeData(
						object,
						positionAttribute,
						morphPosition,
						morphTargetsRelative,
						a, b, c,
						modifiedPosition
					);

					_calculateMorphedAttributeData(
						object,
						normalAttribute,
						morphNormal,
						morphTargetsRelative,
						a, b, c,
						modifiedNormal
					);

				}

			}

		} else {

			start = Math.max( 0, drawRange.start );
			end = Math.min( index.count, ( drawRange.start + drawRange.count ) );

			for ( i = start, il = end; i < il; i += 3 ) {

				a = index.getX( i );
				b = index.getX( i + 1 );
				c = index.getX( i + 2 );

				_calculateMorphedAttributeData(
					object,
					positionAttribute,
					morphPosition,
					morphTargetsRelative,
					a, b, c,
					modifiedPosition
				);

				_calculateMorphedAttributeData(
					object,
					normalAttribute,
					morphNormal,
					morphTargetsRelative,
					a, b, c,
					modifiedNormal
				);

			}

		}

	} else {

		// non-indexed buffer geometry

		if ( Array.isArray( material ) ) {

			for ( i = 0, il = groups.length; i < il; i ++ ) {

				group = groups[ i ];

				start = Math.max( group.start, drawRange.start );
				end = Math.min( ( group.start + group.count ), ( drawRange.start + drawRange.count ) );

				for ( j = start, jl = end; j < jl; j += 3 ) {

					a = j;
					b = j + 1;
					c = j + 2;

					_calculateMorphedAttributeData(
						object,
						positionAttribute,
						morphPosition,
						morphTargetsRelative,
						a, b, c,
						modifiedPosition
					);

					_calculateMorphedAttributeData(
						object,
						normalAttribute,
						morphNormal,
						morphTargetsRelative,
						a, b, c,
						modifiedNormal
					);

				}

			}

		} else {

			start = Math.max( 0, drawRange.start );
			end = Math.min( positionAttribute.count, ( drawRange.start + drawRange.count ) );

			for ( i = start, il = end; i < il; i += 3 ) {

				a = i;
				b = i + 1;
				c = i + 2;

				_calculateMorphedAttributeData(
					object,
					positionAttribute,
					morphPosition,
					morphTargetsRelative,
					a, b, c,
					modifiedPosition
				);

				_calculateMorphedAttributeData(
					object,
					normalAttribute,
					morphNormal,
					morphTargetsRelative,
					a, b, c,
					modifiedNormal
				);

			}

		}

	}

	const morphedPositionAttribute = new Float32BufferAttribute( modifiedPosition, 3 );
	const morphedNormalAttribute = new Float32BufferAttribute( modifiedNormal, 3 );

	return {

		positionAttribute: positionAttribute,
		normalAttribute: normalAttribute,
		morphedPositionAttribute: morphedPositionAttribute,
		morphedNormalAttribute: morphedNormalAttribute

	};

}

function mergeGroups( geometry ) {

	if ( geometry.groups.length === 0 ) {

		console.warn( 'THREE.BufferGeometryUtils.mergeGroups(): No groups are defined. Nothing to merge.' );
		return geometry;

	}

	let groups = geometry.groups;

	// sort groups by material index

	groups = groups.sort( ( a, b ) => {

		if ( a.materialIndex !== b.materialIndex ) return a.materialIndex - b.materialIndex;

		return a.start - b.start;

	} );

	// create index for non-indexed geometries

	if ( geometry.getIndex() === null ) {

		const positionAttribute = geometry.getAttribute( 'position' );
		const indices = [];

		for ( let i = 0; i < positionAttribute.count; i += 3 ) {

			indices.push( i, i + 1, i + 2 );

		}

		geometry.setIndex( indices );

	}

	// sort index

	const index = geometry.getIndex();

	const newIndices = [];

	for ( let i = 0; i < groups.length; i ++ ) {

		const group = groups[ i ];

		const groupStart = group.start;
		const groupLength = groupStart + group.count;

		for ( let j = groupStart; j < groupLength; j ++ ) {

			newIndices.push( index.getX( j ) );

		}

	}

	geometry.dispose(); // Required to force buffer recreation
	geometry.setIndex( newIndices );

	// update groups indices

	let start = 0;

	for ( let i = 0; i < groups.length; i ++ ) {

		const group = groups[ i ];

		group.start = start;
		start += group.count;

	}

	// merge groups

	let currentGroup = groups[ 0 ];

	geometry.groups = [ currentGroup ];

	for ( let i = 1; i < groups.length; i ++ ) {

		const group = groups[ i ];

		if ( currentGroup.materialIndex === group.materialIndex ) {

			currentGroup.count += group.count;

		} else {

			currentGroup = group;
			geometry.groups.push( currentGroup );

		}

	}

	return geometry;

}


/**
 * Modifies the supplied geometry if it is non-indexed, otherwise creates a new,
 * non-indexed geometry. Returns the geometry with smooth normals everywhere except
 * faces that meet at an angle greater than the crease angle.
 *
 * @param {BufferGeometry} geometry
 * @param {number} [creaseAngle]
 * @return {BufferGeometry}
 */
function toCreasedNormals( geometry, creaseAngle = Math.PI / 3 /* 60 degrees */ ) {

	const creaseDot = Math.cos( creaseAngle );
	const hashMultiplier = ( 1 + 1e-10 ) * 1e2;

	// reusable vectors
	const verts = [ new Vector3(), new Vector3(), new Vector3() ];
	const tempVec1 = new Vector3();
	const tempVec2 = new Vector3();
	const tempNorm = new Vector3();
	const tempNorm2 = new Vector3();

	// hashes a vector
	function hashVertex( v ) {

		const x = ~ ~ ( v.x * hashMultiplier );
		const y = ~ ~ ( v.y * hashMultiplier );
		const z = ~ ~ ( v.z * hashMultiplier );
		return `${x},${y},${z}`;

	}

	// BufferGeometry.toNonIndexed() warns if the geometry is non-indexed
	// and returns the original geometry
	const resultGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
	const posAttr = resultGeometry.attributes.position;
	const vertexMap = {};

	// find all the normals shared by commonly located vertices
	for ( let i = 0, l = posAttr.count / 3; i < l; i ++ ) {

		const i3 = 3 * i;
		const a = verts[ 0 ].fromBufferAttribute( posAttr, i3 + 0 );
		const b = verts[ 1 ].fromBufferAttribute( posAttr, i3 + 1 );
		const c = verts[ 2 ].fromBufferAttribute( posAttr, i3 + 2 );

		tempVec1.subVectors( c, b );
		tempVec2.subVectors( a, b );

		// add the normal to the map for all vertices
		const normal = new Vector3().crossVectors( tempVec1, tempVec2 ).normalize();
		for ( let n = 0; n < 3; n ++ ) {

			const vert = verts[ n ];
			const hash = hashVertex( vert );
			if ( ! ( hash in vertexMap ) ) {

				vertexMap[ hash ] = [];

			}

			vertexMap[ hash ].push( normal );

		}

	}

	// average normals from all vertices that share a common location if they are within the
	// provided crease threshold
	const normalArray = new Float32Array( posAttr.count * 3 );
	const normAttr = new BufferAttribute( normalArray, 3, false );
	for ( let i = 0, l = posAttr.count / 3; i < l; i ++ ) {

		// get the face normal for this vertex
		const i3 = 3 * i;
		const a = verts[ 0 ].fromBufferAttribute( posAttr, i3 + 0 );
		const b = verts[ 1 ].fromBufferAttribute( posAttr, i3 + 1 );
		const c = verts[ 2 ].fromBufferAttribute( posAttr, i3 + 2 );

		tempVec1.subVectors( c, b );
		tempVec2.subVectors( a, b );

		tempNorm.crossVectors( tempVec1, tempVec2 ).normalize();

		// average all normals that meet the threshold and set the normal value
		for ( let n = 0; n < 3; n ++ ) {

			const vert = verts[ n ];
			const hash = hashVertex( vert );
			const otherNormals = vertexMap[ hash ];
			tempNorm2.set( 0, 0, 0 );

			for ( let k = 0, lk = otherNormals.length; k < lk; k ++ ) {

				const otherNorm = otherNormals[ k ];
				if ( tempNorm.dot( otherNorm ) > creaseDot ) {

					tempNorm2.add( otherNorm );

				}

			}

			tempNorm2.normalize();
			normAttr.setXYZ( i3 + n, tempNorm2.x, tempNorm2.y, tempNorm2.z );

		}

	}

	resultGeometry.setAttribute( 'normal', normAttr );
	return resultGeometry;

}



return { computeMikkTSpaceTangents, computeMorphedAttributes, deepCloneAttribute, deinterleaveAttribute, deinterleaveGeometry, estimateBytesUsed, interleaveAttributes, mergeAttributes, mergeGeometries, mergeGroups, mergeVertices, toCreasedNormals, toTrianglesDrawMode };
})();
const WINDM = (() => {

/* ==========================================================================
   wind.js – közös szél: haj és ruha mozgatása a vertex shaderben
   A szél világkoordinátában fúj; erősség, irány és széllökések állíthatók.
   ========================================================================== */


const WIND = {
  uniforms: {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector3(1, 0, .35).normalize() },
    uWindStr: { value: .45 },   // 0 = szélcsend, 1 = erős szél
    uGust: { value: 0 }
  },
  strength: .45,
  update(dt, t) {
    const u = this.uniforms;
    u.uTime.value = t;
    // lassú, természetes széllökések
    const g = Math.max(0, Math.sin(t * .37) * .6 + Math.sin(t * .91 + 1.3) * .3 + Math.sin(t * 2.3) * .1);
    u.uGust.value = g;
    u.uWindStr.value = this.strength;
    // az irány is lassan vándorol
    const a = Math.sin(t * .11) * .35;
    u.uWindDir.value.set(Math.cos(a), 0, Math.sin(a) * .6 + .25).normalize();
  }
};

/* Közös GLSL zajfüggvény (olcsó, sima) */
const NOISE = /* glsl */`
  float hsh(float n){ return fract(sin(n)*43758.5453123); }
  float vnoise(vec3 x){
    vec3 p=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    float n=p.x+p.y*57.0+113.0*p.z;
    return mix(mix(mix(hsh(n+0.0),hsh(n+1.0),f.x),mix(hsh(n+57.0),hsh(n+58.0),f.x),f.y),
               mix(mix(hsh(n+113.0),hsh(n+114.0),f.x),mix(hsh(n+170.0),hsh(n+171.0),f.x),f.y),f.z);
  }`;

/**
 * Szél hozzáadása egy anyaghoz.
 * kind: 'hair'  – aT attribútum (0 = gyökér, 1 = vég), aPhase (tincsenként), aLen (tincs hossza)
 *       'cloth' – aSway attribútum (0 = rögzített, 1 = szabad szél)
 * opts.amp: szorzó (pl. rövid haj kevesebbet mozog)
 */
function windify(material, kind = 'hair', opts = {}) {
  const amp = opts.amp ?? 1;
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIND.uniforms);
    sh.uniforms.uAmp = { value: amp };
    material.userData.shader = sh;
    const attrs = kind === 'hair' ? 'attribute float aT; attribute float aPhase; attribute float aLen;' : 'attribute float aSway;';
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      uniform float uTime; uniform vec3 uWindDir; uniform float uWindStr; uniform float uGust; uniform float uAmp;
      ${attrs}
      ${NOISE}`);
    const disp = kind === 'hair' ? /* glsl */`
        float w = aT*aT*(0.6+0.4*aT);
        float spd = 1.6 + 2.2*uWindStr;
        vec3 wp0 = (modelMatrix*vec4(transformed,1.0)).xyz;
        float n1 = vnoise(vec3(wp0.x*3.0 - uTime*spd, wp0.y*2.0, aPhase*7.0 + uTime*0.7));
        float n2 = vnoise(vec3(aPhase*13.0, uTime*(2.4+uWindStr*3.0), aT*3.0));
        float flutter = (n2-0.5)*2.0;
        float gust = 0.55 + 0.9*uGust;
        vec3 side = normalize(cross(uWindDir, vec3(0.0,1.0,0.0)) + 1e-4);
        vec3 d = uWindDir * (uWindStr*gust*(0.55+0.6*n1)) + side*flutter*(0.18+0.5*uWindStr) + vec3(0.0, flutter*0.12*uWindStr + 0.08*uWindStr*gust, 0.0);
        d += vec3(sin(uTime*1.3+aPhase*6.28), 0.0, cos(uTime*1.1+aPhase*5.0))*0.05;
        vec3 worldDisp = d * w * min(aLen, 0.5) * 0.16 * uAmp;`
      : /* glsl */`
        float w = aSway*aSway;
        vec3 wp0 = (modelMatrix*vec4(transformed,1.0)).xyz;
        float n1 = vnoise(vec3(wp0.x*4.0 - uTime*(1.2+uWindStr*2.0), wp0.y*3.0, wp0.z*4.0 + uTime*0.6));
        float n2 = vnoise(vec3(wp0.x*9.0, wp0.y*7.0 - uTime*3.0, wp0.z*9.0));
        float gust = 0.5 + 0.9*uGust;
        vec3 worldDisp = (uWindDir*(uWindStr*gust*(0.35+0.65*n1)) + vec3(0.0,(n2-0.5)*0.25*uWindStr,0.0) + normalize(cross(uWindDir,vec3(0,1,0))+1e-4)*(n2-0.5)*0.35*uWindStr) * w * 0.09 * uAmp;`;
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `
      ${disp}
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec4 wpos = modelMatrix * mvPosition;
      wpos.xyz += worldDisp;
      mvPosition = viewMatrix * wpos;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  material.customProgramCacheKey = () => 'wind-' + kind + '-' + amp;
  return material;
}

/* Árnyékhoz ugyanaz az elmozdulás (különben az árnyék nem lobogna) */
function windDepth(kind, amp = 1) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  windify(m, kind, { amp });
  return m;
}

return { WIND, windDepth, windify };
})();
const HAIRM = (() => {
const { mergeGeometries } = BGU;
const { windify, windDepth } = WINDM;
/* ==========================================================================
   hair.js – tincsekből épülő haj (több száz elvékonyodó tincs, egy rajzolási
   hívásba összefűzve), amelyet a szél shaderben mozgat.
   ========================================================================== */



const { lerp, clamp } = THREE.MathUtils;

/* determinisztikus véletlen, hogy minden betöltéskor ugyanolyan legyen a frizura */
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296; }

/**
 * Egy tincs geometriája egy pontsorból: elvékonyodó, enyhén lapított cső.
 * pts: Vector3[], w0: tövi szélesség, flat: lapítás (1 = kerek), taper: a vég vékonysága
 */
function lockGeometry(pts, w0, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const segs = opts.segs ?? Math.max(6, Math.min(18, Math.round(pts.length * 2.2)));
  const radial = opts.radial ?? 5;
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position, n = pos.count;
  const aT = new Float32Array(n), aPhase = new Float32Array(n), aLen = new Float32Array(n);
  const len = curve.getLength();
  const phase = opts.phase ?? Math.random();
  const frames = curve.computeFrenetFrames(segs, false);
  const tipW = opts.tip ?? .12, flat = opts.flat ?? .55;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, P = curve.getPointAt(t);
    const taper = (1 - t) * (1 - tipW) + tipW;
    const wt = w0 * taper * (t < .08 ? .75 + t * 3 : 1);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      const a = j / radial * Math.PI * 2;
      const N = frames.normals[i], B = frames.binormals[i];
      const x = Math.cos(a) * wt, y = Math.sin(a) * wt * flat;
      pos.setXYZ(k, P.x + N.x * x + B.x * y, P.y + N.y * x + B.y * y, P.z + N.z * x + B.z * y);
      aT[k] = opts.still ? .04 : t; aPhase[k] = phase; aLen[k] = len;
    }
  }
  g.computeVertexNormals();
  g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  g.setAttribute('aLen', new THREE.BufferAttribute(aLen, 1));
  g.deleteAttribute('uv');
  return g;
}

/* Pont a fejre illesztett ellipszoid felszínén (θ: a fejtetőtől mért szög, φ: elölről körbe) */
function scalp(H, th, ph, sc, k = 1) {
  return new THREE.Vector3(Math.sin(th) * Math.sin(ph) * H * sc[0] * k, Math.cos(th) * H * sc[1] * k, Math.sin(th) * Math.cos(ph) * H * sc[2] * k);
}

/* Tincs „növesztése”: a fejbőrről indul, a koponyát követve hullik lefelé */
function grow(H, sc, root, dir0, o, R) {
  const pts = [root.clone().multiplyScalar(.965)];
  let p = root.clone(), dir = dir0.clone().normalize();
  const steps = o.steps, step = o.len / steps, out = o.out ?? 1.05;
  pts.push(p.clone().addScaledVector(root.clone().normalize(), H * (o.lift ?? .04)));
  p = pts[1].clone();
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    dir.y -= (o.gravity ?? .35) * step / H * (o.gravCurve ? Math.pow(t, o.gravCurve) : 1);
    if (o.toward) dir.addScaledVector(o.toward.clone().sub(p).normalize(), o.towardK ?? .5);
    if (o.wave) { const w = Math.sin(t * Math.PI * o.wave + (o.wph ?? 0)) * (o.waveAmp ?? .5); const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(); dir.addScaledVector(side, w * .35); }
    if (o.curl) { dir.x += (R() - .5) * o.curl; dir.z += (R() - .5) * o.curl; dir.y += (R() - .5) * o.curl * .5; }
    dir.normalize();
    p = p.clone().addScaledVector(dir, step);
    // ne menjen a fejbe: a fej ellipszoidjából kitoljuk
    const q = new THREE.Vector3(p.x / sc[0], p.y / sc[1], p.z / sc[2]);
    const lim = H * (out + (o.thick ?? .03) * t);
    if (q.length() < lim && p.y > -H * (o.below ?? .35)) { q.setLength(lim); p.set(q.x * sc[0], q.y * sc[1], q.z * sc[2]); }
    // arc elé ne lógjon: ha az arc felé tartana, oldalra kormányozzuk (törés nélkül)
    if (o.noFace !== false && p.z > H * .2 && p.y < H * .45 && Math.abs(p.x) < H * .95) {
      const sx = Math.sign(p.x || root.x || 1);
      const prev = pts[pts.length - 1];
      dir.x += sx * .55; dir.z -= .35; dir.normalize();
      p = prev.clone().addScaledVector(dir, step);
    }
    if (o.backZ !== undefined && p.y < -H * .5 && p.z > o.backZ) p.z = o.backZ;
    pts.push(p);
  }
  return pts;
}

/**
 * Frizura felépítése. Visszaad egy Group-ot (alapsapka + tincsek egy hálóban).
 * style: 'hosszu-hullamos' | 'rovid-kocos' | 'copfos' | 'konty' | 'oldalt-ritkas' | 'antik-hosszu' | 'fursi'
 */
function buildHair(style, H, color, opts = {}) {
  const R = rng(opts.seed ?? 7);
  const sc = opts.sc ?? [1, 1.06, .98];
  const group = new THREE.Group();
  const col = new THREE.Color(color);
  const geos = [];
  const capMat = new THREE.MeshPhysicalMaterial({ color: col.clone().multiplyScalar(.82), roughness: .7, sheen: .6, sheenColor: col.clone().lerp(new THREE.Color('#fff'), .3) });
  const hairMat = windify(new THREE.MeshPhysicalMaterial({ color: col, roughness: .42, metalness: 0, clearcoat: .25, clearcoatRoughness: .55, sheen: 1, sheenRoughness: .45, sheenColor: col.clone().lerp(new THREE.Color('#fff8e8'), .5), side: THREE.DoubleSide }), 'hair', { amp: opts.amp ?? 1 });
  // sapka: a fejbőrt fedő réteg, hajvonal szerint kivágva (elöl magasabb homlok, hátul a tarkóig)
  const cap = (thetaMax, front = .32, k = 1.0, back = null) => {
    const g = new THREE.SphereGeometry(H * k * 1.012, 64, 40);
    const p = g.attributes.position, keep = [];
    const lim = ph => { const c = Math.cos(ph); return c > 0 ? lerp(thetaMax, front, Math.pow(c, 1.5)) : lerp(thetaMax, back ?? thetaMax + .1, -c); };
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const th = Math.acos(clamp(y / (H * k * 1.012), -1, 1)), ph = Math.atan2(x, z); keep.push(th < lim(ph)); p.setXYZ(i, x * sc[0], y * sc[1], z * sc[2]); }
    const idx = g.index.array, ni = []; for (let i = 0; i < idx.length; i += 3) if (keep[idx[i]] && keep[idx[i + 1]] && keep[idx[i + 2]]) ni.push(idx[i], idx[i + 1], idx[i + 2]);
    g.setIndex(ni); g.computeVertexNormals();
    const m = new THREE.Mesh(g, capMat); m.receiveShadow = true; group.add(m); return m;
  };
  const add = (pts, w, o = {}) => geos.push(lockGeometry(pts, w, { phase: R(), ...o }));
  const hairline = (ph) => .32 + .18 * Math.pow(Math.cos(ph / 2), 2); // elöl alacsonyabb homlok-vonal: θ nagyobb oldalt

  if (style === 'hosszu-hullamos' || style === 'antik-hosszu') {
    const antik = style === 'antik-hosszu';
    cap(Math.PI * .58, Math.PI * .26, 1, Math.PI * .66);
    const N = opts.count ?? 230;
    for (let i = 0; i < N; i++) {
      const ph = (R() * 2 - 1) * Math.PI;
      const front = Math.abs(ph) < .9;
      let th = front ? .1 + R() * .42 : .08 + R() * (Math.PI * .5);
      const root = scalp(H, th, ph, sc);
      // választék: középen (antik) vagy oldalt
      const part = antik ? 0 : .22;
      const sideSign = Math.sign(Math.sin(ph) - part * .3) || 1;
      const nrm = root.clone().normalize();
      let dir = new THREE.Vector3(0, -1, 0).addScaledVector(nrm, nrm.y).normalize();   // lefelé a fejbőr mentén
      dir.addScaledVector(new THREE.Vector3(Math.sin(ph), 0, -.4), .25).addScaledVector(new THREE.Vector3(sideSign, 0, 0), front ? .35 : .05).normalize();
      const L = H * (antik ? 2.6 : 2.2) * (.75 + R() * .4) * (front ? .9 : 1);
      const pts = grow(H, sc, root, dir, { len: L, steps: 10, gravity: 1.6, gravCurve: .3, wave: antik ? 2.2 : 3.2, wph: R() * 6, waveAmp: antik ? .18 : .28, curl: .04, out: 1.035, thick: .1, below: .45, backZ: -H * .05 }, R);
      add(pts, H * (.065 + R() * .035), { tip: .15, segs: 14, flat: .5, radial: 5 });
    }
    // térfogat-héj: a tincsek mögötti sűrű hajtömeg (szélben enyhén mozog)
    {
      const prof = antik ? [[0, -H * 2.1], [H * .55, -H * 2.0], [H * .95, -H * 1.4], [H * 1.08, -H * .6], [H * 1.1, 0], [H * .95, H * .5], [0, H * .8]]
                         : [[0, -H * 1.75], [H * .6, -H * 1.7], [H * 1.0, -H * 1.15], [H * 1.1, -H * .5], [H * 1.1, 0], [H * .95, H * .5], [0, H * .8]];
      const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 48, Math.PI * .62, Math.PI * .76);
      const p = g.attributes.position, aT = new Float32Array(p.count), aP = new Float32Array(p.count), aL = new Float32Array(p.count);
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setXYZ(i, p.getX(i) * sc[0], y, p.getZ(i) * .85 - H * .12); aT[i] = THREE.MathUtils.clamp(-y / (H * 2), 0, 1); aP[i] = .5; aL[i] = H * 2; }
      g.setAttribute('aT', new THREE.BufferAttribute(aT, 1)); g.setAttribute('aPhase', new THREE.BufferAttribute(aP, 1)); g.setAttribute('aLen', new THREE.BufferAttribute(aL, 1));
      g.deleteAttribute('uv'); g.computeVertexNormals(); geos.push(g);
    }
    // arcot keretező tincsek
    for (let s of [-1, 1]) for (let i = 0; i < 9; i++) {
      const ph = s * (.75 + R() * .5), th = .38 + R() * .2;
      const pts = grow(H, sc, scalp(H, th, ph, sc), new THREE.Vector3(s * .25, -1, .25), { len: H * (1.5 + R() * .5), steps: 9, gravity: .5, wave: 3, wph: R() * 6, waveAmp: .5, noFace: true, out: 1.05, thick: .04, below: .2 }, R);
      add(pts, H * .085, { tip: .15, flat: .35 });
    }
    // oldalra fésült frufru (nem antik)
    if (!antik) for (let i = 0; i < 26; i++) {
      const ph = -.6 + R() * 1.1, th = .05 + R() * .25;
      const rt = scalp(H, th, ph, sc), nn = rt.clone().normalize();
      const d0 = new THREE.Vector3(1, -.35, .2).addScaledVector(nn, -nn.dot(new THREE.Vector3(1, -.35, .2))).normalize();
      const pts = grow(H, sc, rt, d0, { len: H * (.9 + R() * .4), steps: 8, gravity: .5, wave: 1.2, waveAmp: .2, out: 1.04, thick: .02, lift: .015 }, R);
      add(pts, H * .075, { tip: .25, flat: .4 });
    }
  }
  else if (style === 'rovid-kocos') { // apa: rövid, kócos
    cap(Math.PI * .5, Math.PI * .24, .995, Math.PI * .62);
    const N = opts.count ?? 360;
    for (let i = 0; i < N; i++) {
      const ph = (R() * 2 - 1) * Math.PI;
      const front = Math.abs(ph) < 1.0;
      const th = R() * (front ? .5 : (Math.abs(ph) < 2 ? 1.25 : 1.45));
      if (front && th > hairline(ph) + .12) continue;
      const root = scalp(H, th, ph, sc);
      const n = root.clone().normalize();
      const flow = new THREE.Vector3(.35, .05, front ? .55 : -.6);
      const fl = flow.clone().addScaledVector(n, -n.dot(flow)).normalize();
      const dir = n.clone().multiplyScalar(.35).add(fl).add(new THREE.Vector3(R() - .5, R() * .2, R() - .5).multiplyScalar(.35));
      const pts = grow(H, sc, root, dir, { len: H * (.3 + R() * .2) * (th > 1 ? .6 : 1), steps: 5, gravity: .6, curl: .25, out: 1.03, thick: .06, lift: .015 }, R);
      add(pts, H * (.06 + R() * .03), { tip: .2, segs: 7, radial: 4, flat: .5 });
    }
  }
  else if (style === 'copfos') { // gyerek: copfok
    cap(Math.PI * .54, Math.PI * .27, 1, Math.PI * .62);
    const ties = [-1, 1].map(s => new THREE.Vector3(s * H * 1.0, H * .22, -H * .18));
    const N = opts.count ?? 200;
    for (let i = 0; i < N; i++) {
      const ph = (R() * 2 - 1) * Math.PI, th = .08 + R() * 1.25;
      if (Math.abs(ph) < .95 && th > .48) continue;
      const s = Math.sin(ph) >= 0 ? 1 : -1;
      const root = scalp(H, th, ph, sc);
      const pts = grow(H, sc, root, ties[s > 0 ? 1 : 0].clone().sub(root), { len: root.distanceTo(ties[s > 0 ? 1 : 0]) * 1.05, steps: 6, gravity: .02, toward: ties[s > 0 ? 1 : 0], towardK: .7, out: 1.035, thick: .015 }, R);
      add(pts, H * .05, { tip: .5, segs: 8, radial: 4 });
    }
    // frufru
    for (let i = 0; i < 34; i++) {
      const ph = -.8 + R() * 1.6, th = .3 + R() * .18;
      const pts = grow(H, sc, scalp(H, th, ph, sc), new THREE.Vector3(Math.sin(ph) * .3, -.55, 1), { len: H * (.42 + R() * .12), steps: 5, gravity: .5, out: 1.05, thick: .02 }, R);
      add(pts, H * .065, { tip: .3, segs: 7 });
    }
    // a copfok külön csoportban: rugóznak
    group.userData.pigtails = [];
    [-1, 1].forEach((s, si) => {
      const pg = new THREE.Group(); pg.position.copy(ties[si]); group.add(pg);
      const tg = [];
      for (let i = 0; i < 46; i++) {
        const a = R() * Math.PI * 2, r0 = H * .06 * R();
        const root = new THREE.Vector3(Math.cos(a) * r0, Math.sin(a) * r0 * .6, Math.sin(a) * r0);
        const pts = [root];
        let p = root.clone(); const L = H * (1.05 + R() * .35);
        for (let k = 1; k <= 8; k++) { const t = k / 8; p = p.clone().add(new THREE.Vector3(s * H * .07 * (1 - t) + (R() - .5) * H * .03, -L / 8, (R() - .5) * H * .03 + Math.sin(t * 5 + a) * H * .01)); pts.push(p); }
        tg.push(lockGeometry(pts, H * .06, { phase: R(), tip: .15, segs: 10 }));
      }
      const m = new THREE.Mesh(mergeGeometries(tg), hairMat); m.castShadow = true; m.customDepthMaterial = windDepth('hair'); pg.add(m);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(H * .085, H * .04, 10, 22), new THREE.MeshPhysicalMaterial({ color: opts.tieColor ?? '#2E7565', roughness: .35, clearcoat: .6 }));
      tie.rotation.x = Math.PI / 2; tie.position.y = -H * .05; pg.add(tie);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(H * .07, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#E8B84A', roughness: .25, clearcoat: 1 })); bead.position.set(0, -H * .02, H * .08); pg.add(bead);
      group.userData.pigtails.push({ g: pg, s });
    });
  }
  else if (style === 'konty') { // nagymama: konty + elszabadult tincsek
    cap(Math.PI * .55, Math.PI * .24, 1, Math.PI * .62);
    const bun = new THREE.Vector3(0, H * .78, -H * .62);
    const N = opts.count ?? 220;
    for (let i = 0; i < N; i++) {
      const ph = (R() * 2 - 1) * Math.PI, th = .06 + R() * (Math.abs(ph) < 1 ? .45 : 1.35);
      const root = scalp(H, th, ph, sc);
      const pts = grow(H, sc, root, bun.clone().sub(root), { len: root.distanceTo(bun) * 1.1, steps: 7, gravity: -.05, toward: bun, towardK: .6, out: 1.03, thick: .02, curl: .05 }, R);
      add(pts, H * .05, { tip: .45, segs: 8, radial: 4 });
    }
    // a konty: körbe tekert tincsek
    for (let i = 0; i < 46; i++) {
      const pts = []; const r0 = H * (.16 + R() * .14), a0 = R() * Math.PI * 2, tilt = (R() - .5) * .8;
      for (let k = 0; k <= 10; k++) { const a = a0 + k / 10 * Math.PI * 1.6; pts.push(new THREE.Vector3(Math.cos(a) * r0, Math.sin(a) * r0 * .55 + tilt * r0 * Math.cos(a), Math.sin(a) * r0 * .8).add(bun)); }
      add(pts, H * .07, { tip: .4, segs: 14, still: true });
    }
    // laza, szélben lebegő tincsek a halántéknál és tarkón
    for (let i = 0; i < 14; i++) {
      const s = i % 2 ? 1 : -1, ph = s * (1.1 + R() * 1.4), th = .7 + R() * .6;
      const pts = grow(H, sc, scalp(H, th, ph, sc), new THREE.Vector3(s * .3, -1, -.1), { len: H * (.5 + R() * .45), steps: 6, gravity: .4, wave: 2.5, waveAmp: .6, out: 1.04, thick: .03, curl: .2 }, R);
      add(pts, H * .022, { tip: .1, segs: 10, radial: 4 });
    }
  }
  else if (style === 'oldalt-ritkas') { // nagypapa: kopasz fejtető, oldalt-hátul ősz koszorú
    const N = opts.count ?? 260;
    for (let i = 0; i < N; i++) {
      const ph = (R() * 2 - 1) * Math.PI;
      if (Math.abs(ph) < 1.15) continue;
      const th = .95 + R() * .7;
      const root = scalp(H, th, ph, sc);
      const n = root.clone().normalize();
      const dir = n.multiplyScalar(.6).add(new THREE.Vector3(0, -.6, -.25)).add(new THREE.Vector3(R() - .5, R() - .3, R() - .5).multiplyScalar(.8));
      const pts = grow(H, sc, root, dir, { len: H * (.18 + R() * .2), steps: 4, gravity: .2, curl: .9, out: 1.02, thick: .06 }, R);
      add(pts, H * (.04 + R() * .02), { tip: .25, segs: 6, radial: 4 });
    }
    // néhány szálas, szélben felálló szál a fejtetőn
    for (let i = 0; i < 9; i++) {
      const ph = (R() - .5) * 1.4, th = .1 + R() * .3;
      const root = scalp(H, th, ph, sc);
      const pts = grow(H, sc, root, root.clone().normalize().add(new THREE.Vector3(.2, .6, -.5)), { len: H * (.28 + R() * .2), steps: 5, gravity: .15, curl: .5, out: 1.0, lift: .0 }, R);
      add(pts, H * .012, { tip: .2, segs: 8, radial: 3 });
    }
  }
  else if (style === 'fursi') { // § figurák: kis tincs/kunkor a fej tetején
    for (let i = 0; i < 18; i++) {
      const pts = []; const a0 = R() * 6.28, r0 = H * (.25 + R() * .15);
      for (let k = 0; k <= 10; k++) { const t = k / 10, a = a0 + t * 4.2; pts.push(new THREE.Vector3(Math.cos(a) * r0 * (1 - t * .5) + (R() - .5) * .002, H * 1.0 + t * H * .55, Math.sin(a) * r0 * (1 - t * .5))); }
      add(pts, H * .06, { tip: .2, segs: 14 });
    }
  }

  if (geos.length) {
    const m = new THREE.Mesh(mergeGeometries(geos), hairMat);
    m.castShadow = true; m.receiveShadow = true;
    m.customDepthMaterial = windDepth('hair', opts.amp ?? 1);
    group.add(m); group.userData.locks = m;
  }
  group.userData.material = hairMat; group.userData.cap = capMat;
  return group;
}

return { buildHair, lockGeometry, rng };
})();
const HANDM = (() => {

/* ==========================================================================
   hands.js – ötujjú kéz ízületekkel (ujjanként 3 perc, hüvelykujj 3),
   körmökkel, tenyér-párnával és lágyan átúszó kéztartásokkal.
   ========================================================================== */


/* Kéztartások: ujjanként [tő, közép, vég] hajlítás (radián), szétterpesztés,
   hüvelykujj: [tő, közép, vég] + szembefordítás (opp) + távolítás (abd) */
const POSES = {
  laza:    { f: [[.22, .3, .2], [.28, .36, .24], [.34, .42, .28], [.42, .5, .32]], spread: .05, t: [.15, .2, .15], opp: .35, abd: .25 },
  nyitott: { f: [[.02, .04, .02], [.0, .03, .02], [.03, .05, .03], [.06, .08, .05]], spread: .2, t: [0, .02, .05], opp: .05, abd: .7 },
  mutat:   { f: [[0, .02, 0], [1.35, 1.55, 1.1], [1.4, 1.55, 1.1], [1.45, 1.5, 1.1]], spread: 0, t: [.5, .7, .5], opp: .8, abd: .2 },
  okol:    { f: [[1.45, 1.6, 1.15], [1.5, 1.6, 1.15], [1.5, 1.6, 1.15], [1.5, 1.55, 1.1]], spread: 0, t: [.6, .7, .6], opp: 1, abd: .1 },
  fog:     { f: [[1.05, 1.05, .7], [1.1, 1.05, .7], [1.15, 1.05, .7], [1.2, 1.0, .7]], spread: 0, t: [.35, .45, .35], opp: .9, abd: .35 },
  csippent:{ f: [[.65, .6, .35], [.8, .7, .4], [1.25, 1.3, .9], [1.35, 1.35, .95]], spread: 0, t: [.45, .4, .3], opp: 1.1, abd: .3 },
  lapos:   { f: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], spread: 0, t: [0, .05, .05], opp: .15, abd: .15 },
  tal:     { f: [[.15, .1, .05], [.12, .1, .05], [.15, .12, .06], [.2, .14, .08]], spread: .1, t: [.1, .1, .1], opp: .3, abd: .45 }
};

let NAIL_MAT = null;
class Hand {
  /**
   * s: -1 = a szereplő jobb keze (−x oldalon), +1 = bal keze (+x)
   * size: tenyérhossz (m), skin: anyag
   */
  constructor(s, size, skin, opts = {}) {
    this.s = s; this.group = new THREE.Group();
    this.cur = JSON.parse(JSON.stringify(POSES.laza)); this.tgt = POSES.laza;
    const L = size, W = size * .92, T = size * .36;
    const skinM = skin;
    NAIL_MAT = NAIL_MAT || new THREE.MeshPhysicalMaterial({ color: '#f6d6cc', roughness: .2, clearcoat: 1, clearcoatRoughness: .2 });
    const nailM = opts.nail ?? NAIL_MAT;
    const mk = (geo, mat, parent, p, sc) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; if (p) m.position.copy(p); if (sc) m.scale.set(...sc); parent.add(m); return m; };
    const SPH = new THREE.SphereGeometry(1, 24, 16);
    // csukló és tenyér
    mk(new THREE.CapsuleGeometry(T * .62, size * .16, 6, 14), skinM, this.group, new THREE.Vector3(0, -size * .05, 0), [1, 1, W / T * .5]);
    const palm = mk(SPH, skinM, this.group, new THREE.Vector3(0, -L * .46, 0), [T * .5, L * .52, W * .5]);
    // tenyér-párna és kézhát íve
    mk(SPH, skinM, this.group, new THREE.Vector3(-s * T * .12, -L * .62, -W * .12), [T * .34, L * .3, W * .32]);
    mk(SPH, skinM, this.group, new THREE.Vector3(-s * T * .1, -L * .45, W * .27), [T * .36, L * .28, W * .2]); // hüvelykpárna
    // ujjak: mutató, középső, gyűrűs, kis
    const lens = [.98, 1.08, 1.0, .8].map(k => k * L * .78);
    const rad = [.098, .104, .097, .085].map(k => k * L);
    const zs = [.33, .11, -.11, -.32].map(k => k * W);
    this.fingers = [];
    for (let i = 0; i < 4; i++) {
      const base = new THREE.Group(); base.position.set(0, -L * .9 + Math.abs(zs[i]) * .25, zs[i]); this.group.add(base);
      const segL = [.44, .31, .25].map(k => k * lens[i]);
      let parent = base; const joints = [];
      for (let k = 0; k < 3; k++) {
        const j = new THREE.Group(); if (k > 0) j.position.y = -segL[k - 1]; parent.add(j); joints.push(j);
        const r = rad[i] * (1 - k * .12);
        mk(new THREE.CapsuleGeometry(r, Math.max(.001, segL[k] - r * .6), 6, 12), skinM, j, new THREE.Vector3(0, -segL[k] / 2, 0), [k === 0 ? 1.05 : 1, 1, 1]);
        if (k === 2) mk(SPH, nailM, j, new THREE.Vector3(s * r * .78, -segL[k] * .62, 0), [r * .32, r * .75, r * .72]); // köröm (kézhát felől)
        parent = j;
      }
      this.fingers.push({ base, joints });
    }
    // hüvelykujj
    const tb = new THREE.Group(); tb.position.set(-s * T * .05, -L * .3, W * .44); this.group.add(tb);
    this.thumbBase = tb;
    const tl = [.42, .34, .28].map(k => k * L * .78), tr = L * .135;
    let parent = tb; const tj = [];
    for (let k = 0; k < 3; k++) {
      const j = new THREE.Group(); if (k > 0) j.position.y = -tl[k - 1]; parent.add(j); tj.push(j);
      const r = tr * (1 - k * .1);
      mk(new THREE.CapsuleGeometry(r, Math.max(.001, tl[k] - r * .6), 6, 12), skinM, j, new THREE.Vector3(0, -tl[k] / 2, 0), [k === 0 ? 1.25 : 1, 1, 1]);
      if (k === 2) mk(SPH, nailM, j, new THREE.Vector3(s * r * .75, -tl[k] * .6, r * .1), [r * .33, r * .75, r * .75]);
      parent = j;
    }
    this.thumb = tj;
    this.apply(1);
  }
  set(name) { this.tgt = POSES[name] || POSES.laza; this.poseName = name; return this; }
  apply(k) {
    const c = this.cur, t = this.tgt, s = this.s;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) c.f[i][j] += (t.f[i][j] - c.f[i][j]) * k;
    for (let j = 0; j < 3; j++) c.t[j] += (t.t[j] - c.t[j]) * k;
    c.spread += (t.spread - c.spread) * k; c.opp += (t.opp - c.opp) * k; c.abd += (t.abd - c.abd) * k;
    // ujjak: hajlítás a tenyér felé (−s·x), szétterpesztés z irányban
    this.fingers.forEach((F, i) => {
      F.base.rotation.x = (1.5 - i) * c.spread * .55;
      F.joints.forEach((j, k) => { j.rotation.z = -s * c.f[i][k]; });
    });
    // hüvelykujj: előre-lefelé áll, szembefordítás a tenyér elé
    const tb = this.thumbBase;
    tb.rotation.set(-.55 - c.abd * .65, -s * c.opp * .9, -s * (.25 + c.opp * .55));
    this.thumb.forEach((j, k) => { j.rotation.z = -s * c.t[k] * (k === 0 ? .6 : 1); });
  }
  update(dt, idleT = 0) {
    const k = 1 - Math.exp(-dt * 10);
    this.apply(k);
    // apró élő ujjmozgás
    if (this.poseName === 'laza' || !this.poseName) this.fingers.forEach((F, i) => { F.joints[0].rotation.z += -this.s * Math.sin(idleT * 1.3 + i * .8) * .025; });
  }
}

return { Hand, POSES };
})();
const FACEM = (() => {

/* ==========================================================================
   face.js – kidolgozott arc: formázott koponya, szemek írisz-textúrával és
   szaruhártya-csillanással, fel- és alsó szemhéj szempillasorral, mozgó
   szemöldök (belső/külső vég), alakítható ajkak, fogak, nyelv, állkapocs,
   arcpofa-emelés, nasolabiális redő, szarkalábak, pír, guruló könnyek.
   ========================================================================== */


const V = (x, y, z) => new THREE.Vector3(x, y, z);
const damp = THREE.MathUtils.damp, clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;

/* ---------- Arckifejezések ---------- */
// bi: belső szemöldök fel(+)/le(−), bo: külső vég, bs: összehúzás (harag), lu: felső szemhéj (0 nyitott, 1 csukott),
// ld: alsó szemhéj emelés, ch: arcpofa emelés, sm: szájzug (+ mosoly), op: szájnyitás, wd: szélesség, tt: fogak,
// tear, blush, tilt, asym (egyoldalú szemöldök), pk: csücsörítés
const EXPR = {
  semleges:       { bi: 0, bo: 0, bs: 0, lu: .12, ld: .05, ch: 0, sm: .05, op: 0, wd: 1, tt: 0, tear: 0, blush: .25, tilt: 0, asym: 0, pk: 0 },
  vidam:          { bi: .06, bo: .02, bs: 0, lu: .1, ld: .3, ch: .6, sm: .75, op: .12, wd: 1.08, tt: .7, tear: 0, blush: .55, tilt: .02, asym: 0, pk: 0 },
  nevet:          { bi: .18, bo: .08, bs: 0, lu: .38, ld: .55, ch: 1, sm: 1, op: .75, wd: 1.18, tt: 1, tear: 0, blush: .85, tilt: .08, asym: 0, pk: 0 },
  megkonnyebbult: { bi: .12, bo: -.05, bs: 0, lu: .5, ld: .35, ch: .4, sm: .5, op: .04, wd: 1, tt: .2, tear: 0, blush: .45, tilt: -.06, asym: 0, pk: 0 },
  aggodo:         { bi: .45, bo: -.1, bs: .35, lu: .08, ld: .1, ch: 0, sm: -.25, op: .06, wd: .82, tt: 0, tear: 0, blush: .15, tilt: .05, asym: 0, pk: .25 },
  szomoru:        { bi: .55, bo: -.25, bs: .3, lu: .38, ld: .1, ch: 0, sm: -.75, op: .03, wd: .9, tt: 0, tear: 1, blush: .3, tilt: -.1, asym: 0, pk: .1 },
  meglepett:      { bi: .65, bo: .55, bs: 0, lu: -.18, ld: 0, ch: .1, sm: 0, op: .65, wd: .7, tt: .3, tear: 0, blush: .3, tilt: 0, asym: 0, pk: .45 },
  gondolkodo:     { bi: .15, bo: .2, bs: .1, lu: .3, ld: .2, ch: .1, sm: .1, op: 0, wd: .78, tt: 0, tear: 0, blush: .2, tilt: .12, asym: 1, pk: .3 },
  hatarozott:     { bi: -.22, bo: .05, bs: .4, lu: .25, ld: .25, ch: .1, sm: .12, op: 0, wd: .95, tt: 0, tear: 0, blush: .2, tilt: 0, asym: 0, pk: 0 },
  duhos:          { bi: -.5, bo: .2, bs: 1, lu: .3, ld: .4, ch: .25, sm: -.5, op: .2, wd: 1.05, tt: .9, tear: 0, blush: .7, tilt: -.04, asym: 0, pk: 0 },
  nyugodt:        { bi: .05, bo: 0, bs: 0, lu: .42, ld: .2, ch: .15, sm: .22, op: 0, wd: .95, tt: 0, tear: 0, blush: .25, tilt: .04, asym: 0, pk: 0 },
  egyutterzo:     { bi: .38, bo: -.08, bs: .15, lu: .28, ld: .25, ch: .3, sm: .32, op: 0, wd: .95, tt: 0, tear: 0, blush: .4, tilt: .14, asym: 0, pk: .1 }
};
const EXPR_NAMES = { nyugodt: 'Nyugodt', vidam: 'Vidám', nevet: 'Nevet', megkonnyebbult: 'Megkönnyebbült', egyutterzo: 'Együttérző', aggodo: 'Aggódó', szomoru: 'Szomorú', meglepett: 'Meglepett', gondolkodo: 'Gondolkodó', hatarozott: 'Határozott', duhos: 'Dühös', semleges: 'Semleges' };

/* ---------- Írisz textúra (radiális szálak, sötét peremgyűrű) ---------- */
const IRIS_CACHE = {};
function irisTexture(hex) {
  if (IRIS_CACHE[hex]) return IRIS_CACHE[hex];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const col = new THREE.Color(hex), dark = col.clone().multiplyScalar(.45), light = col.clone().lerp(new THREE.Color('#fff4d8'), .35);
  x.fillStyle = '#' + col.getHexString(); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 7); x.fill();
  // szálak
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2, r0 = S * (.12 + Math.random() * .08), r1 = S * (.36 + Math.random() * .12);
    x.strokeStyle = (Math.random() < .5 ? '#' + light.getHexString() : '#' + dark.getHexString()) + (Math.random() < .5 ? '88' : '55');
    x.lineWidth = .8 + Math.random() * 1.6; x.beginPath(); x.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0);
    x.quadraticCurveTo(S / 2 + Math.cos(a + .08) * (r0 + r1) / 2, S / 2 + Math.sin(a + .08) * (r0 + r1) / 2, S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1); x.stroke();
  }
  // belső arany gyűrű (heterokróm hatás)
  const g = x.createRadialGradient(S / 2, S / 2, S * .1, S / 2, S / 2, S * .26); g.addColorStop(0, 'rgba(201,150,70,.55)'); g.addColorStop(1, 'rgba(201,150,70,0)'); x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S * .3, 0, 7); x.fill();
  // pupilla és sötét peremgyűrű
  x.fillStyle = '#0d0b0a'; x.beginPath(); x.arc(S / 2, S / 2, S * .17, 0, 7); x.fill();
  const lg = x.createRadialGradient(S / 2, S / 2, S * .4, S / 2, S / 2, S * .5); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(10,12,14,.85)'); x.fillStyle = lg; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (IRIS_CACHE[hex] = t);
}

/* Elvékonyodó cső (ajak, szemöldök, redő): r(t) = r·(min + (1−min)·sin(πt)^p) */
function taperTube(pts, r, min = .3, p = .7, segs = 26, radial = 8, flat = 1) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position; const fr = curve.computeFrenetFrames(segs, false);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, P = curve.getPointAt(t), rr = r * (min + (1 - min) * Math.pow(Math.sin(Math.PI * t), p));
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, k = i * (radial + 1) + j, N = fr.normals[i], B = fr.binormals[i];
      const cx = Math.cos(a) * rr, cy = Math.sin(a) * rr * flat;
      pos.setXYZ(k, P.x + N.x * cx + B.x * cy, P.y + N.y * cx + B.y * cy, P.z + N.z * cx + B.z * cy);
    }
  }
  g.computeVertexNormals(); return g;
}


/* Felszíni dombormű: 2D körvonal (x,y) a bőrre vetítve, kis vastagsággal.
   Z(x,y): bőrfelszín; lift: emelés; th: vastagság (középen), a szélek simán a bőrbe futnak */
function surfaceShape(outline, Z, lift, th, holes) {
  const sh = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
  if (holes) holes.forEach(h => sh.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p.x, p.y)))));
  const g = new THREE.ShapeGeometry(sh, 6);
  // finomítás: minden háromszöget 4 részre bontunk kétszer, hogy a görbült bőrt kövesse
  let geo = g.toNonIndexed();
  for (let it = 0; it < 2; it++) {
    const p = geo.attributes.position, out = [];
    for (let i = 0; i < p.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, i), b = new THREE.Vector3().fromBufferAttribute(p, i + 1), c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
      const ab = a.clone().add(b).multiplyScalar(.5), bc = b.clone().add(c).multiplyScalar(.5), ca = c.clone().add(a).multiplyScalar(.5);
      [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]].forEach(t => t.forEach(v => out.push(v.x, v.y, 0)));
    }
    geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  }
  // távolság a körvonaltól → domborulat
  const p = geo.attributes.position, poly = outline;
  const distEdge = (x, y) => { let d = 1e9; for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i + 1) % poly.length]; const vx = B.x - A.x, vy = B.y - A.y, l = vx * vx + vy * vy || 1e-12; let t = ((x - A.x) * vx + (y - A.y) * vy) / l; t = Math.max(0, Math.min(1, t)); const dx = A.x + vx * t - x, dy = A.y + vy * t - y; d = Math.min(d, Math.hypot(dx, dy)); } return d; };
  let maxd = 1e-9; const ds = [];
  for (let i = 0; i < p.count; i++) { const d = distEdge(p.getX(i), p.getY(i)); ds.push(d); maxd = Math.max(maxd, d); }
  for (let i = 0; i < p.count; i++) { const k = Math.sqrt(Math.min(1, ds[i] / maxd)); p.setZ(i, Z(p.getX(i), p.getY(i)) + lift + th * k); }
  geo.computeVertexNormals(); return geo;
}
/* Vastag vonal körvonala (szemöldök, redő): középvonal + szélesség-profil */
function strokeOutline(pts, w0, min = .2) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, 0)));
  const N = 24, L = [], R = [];
  for (let i = 0; i <= N; i++) { const t = i / N, P = c.getPointAt(t), T = c.getTangentAt(t); const w = w0 * (min + (1 - min) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), .6)); L.push({ x: P.x - T.y * w, y: P.y + T.x * w }); R.push({ x: P.x + T.y * w, y: P.y - T.x * w }); }
  return L.concat(R.reverse());
}

/* Koponya: gömb, amelyet arc-formára gyúrunk (keskenyebb áll, telt arc, lapos oldal) */
function headGeometry(H, sc, child) {
  const g = new THREE.SphereGeometry(H, 72, 56); const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).divideScalar(H);
    let { x, y, z } = v;
    if (y < 0) { const k = Math.pow(-y, 1.6); x *= 1 - (child ? .1 : .2) * k; z *= 1 - .05 * k; if (z > 0) z += .06 * k * z; y *= 1 + (child ? 0 : .1) * k; }
    if (y > .2 && z < 0) { z *= 1.06; }                       // tarkó telt
    if (Math.abs(x) > .6 && y > -.2 && y < .4) x *= .96;     // halánték lapos
    if (z > .3 && y < .05 && y > -.55) { const c = Math.exp(-Math.pow((Math.abs(x) - .45) / .25, 2)) * .045; z += c; } // arccsont
    if (z > .7 && y > .1 && y < .45 && Math.abs(x) < .45) z -= .03; // szemgödör
    p.setXYZ(i, x * H * sc[0], y * H * sc[1], z * H * sc[2]);
  }
  g.computeVertexNormals(); return g;
}

class Face {
  /**
   * parent: a fej csoport; H: fej sugár; sc: ellipszoid arány; o: { skin, lip, brow, iris, lashes, age, child, eyeR, wrinkles }
   */
  constructor(parent, H, sc, o) {
    this.H = H; this.sc = sc; this.o = o;
    this.g = new THREE.Group(); parent.add(this.g);
    this.cur = { ...EXPR.semleges }; this.tgt = { ...EXPR.vidam };
    this.blink = 0; this.blinkT = 1 + Math.random() * 2; this.sacc = new THREE.Vector2(); this.saccT = .5; this.browIdle = 0; this.talkT = 0; this.talkPh = 0;
    const skin = o.skin, H_ = H;
    const mk = (geo, mat, parent, p, sc_, rot) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; if (p) m.position.copy(p); if (sc_) m.scale.set(...sc_); if (rot) m.rotation.set(...rot); parent.add(m); return m; };
    const SPH = new THREE.SphereGeometry(1, 32, 24);
    this.M = {
      white: new THREE.MeshPhysicalMaterial({ color: '#fbf8f3', roughness: .25, clearcoat: .6 }),
      cornea: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, metalness: 0, transparent: true, opacity: .14, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1, depthWrite: false }),
      dark: new THREE.MeshStandardMaterial({ color: '#1b1412', roughness: .6 }),
      lip: new THREE.MeshPhysicalMaterial({ color: o.lip, roughness: .38, clearcoat: .45, clearcoatRoughness: .4, sheen: .5, sheenColor: new THREE.Color('#ffd0c8') }),
      mouth: new THREE.MeshStandardMaterial({ color: '#4a1a1e', roughness: .8 }),
      teeth: new THREE.MeshPhysicalMaterial({ color: '#f7f2e8', roughness: .25, clearcoat: .7 }),
      tongue: new THREE.MeshPhysicalMaterial({ color: '#d9737a', roughness: .45, clearcoat: .3 }),
      brow: new THREE.MeshStandardMaterial({ color: o.brow, roughness: .85 }),
      crease: new THREE.MeshBasicMaterial({ color: new THREE.Color(o.skinColor).multiplyScalar(.72), transparent: true, opacity: 0, depthWrite: false }),
      blush: new THREE.MeshBasicMaterial({ color: '#ec7d72', transparent: true, opacity: .3, depthWrite: false }),
      tear: new THREE.MeshPhysicalMaterial({ color: '#cfeaff', roughness: 0, transmission: .7, thickness: .01, transparent: true, opacity: .85, clearcoat: 1 })
    };
    const ell = (x, y) => { const xx = x / (H * sc[0]), yy = y / (H * sc[1]); const r = 1 - xx * xx - yy * yy; return (r > 0 ? Math.sqrt(r) : 0) * H * sc[2]; };
    // a valódi (gyúrt) arcfelszín z-je: a fej háromszögeit egyszer mélységrácsba raszterizáljuk
    let grid = null; const GN = 96, X0 = -H * 1.2, X1 = H * 1.2, Y0 = -H * 1.3, Y1 = H * 1.2;
    if (o.surface) {
      grid = new Float32Array(GN * GN).fill(-1e9);
      const g = o.surface.geometry, p = g.attributes.position, idx = g.index.array;
      const gx = x => (x - X0) / (X1 - X0) * (GN - 1), gy = y => (y - Y0) / (Y1 - Y0) * (GN - 1);
      for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t], b = idx[t + 1], c = idx[t + 2];
        const ax = gx(p.getX(a)), ay = gy(p.getY(a)), az = p.getZ(a), bx = gx(p.getX(b)), by = gy(p.getY(b)), bz = p.getZ(b), cx = gx(p.getX(c)), cy = gy(p.getY(c)), cz = p.getZ(c);
        if (az < -H * .3 && bz < -H * .3 && cz < -H * .3) continue;
        const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(GN - 1, Math.ceil(Math.max(ax, bx, cx)));
        const miny = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(GN - 1, Math.ceil(Math.max(ay, by, cy)));
        const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-9) continue;
        for (let j = miny; j <= maxy; j++) for (let i = minx; i <= maxx; i++) {
          const l1 = ((by - cy) * (i - cx) + (cx - bx) * (j - cy)) / d, l2 = ((cy - ay) * (i - cx) + (ax - cx) * (j - cy)) / d, l3 = 1 - l1 - l2;
          if (l1 < -.02 || l2 < -.02 || l3 < -.02) continue;
          const z = l1 * az + l2 * bz + l3 * cz, k = j * GN + i; if (z > grid[k]) grid[k] = z;
        }
      }
    }
    const Z = o.flatZ !== undefined ? ((x, y) => o.flatZ - (x * x) * .6 / H) : grid ? ((x, y) => {
      const fx = clamp((x - X0) / (X1 - X0) * (GN - 1), 0, GN - 1.001), fy = clamp((y - Y0) / (Y1 - Y0) * (GN - 1), 0, GN - 1.001);
      const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
      const q = (ii, jj) => { const z = grid[jj * GN + ii]; return z < -1e8 ? ell(x, y) : z; };
      return (q(i, j) * (1 - u) + q(i + 1, j) * u) * (1 - v) + (q(i, j + 1) * (1 - u) + q(i + 1, j + 1) * u) * v;
    }) : ell;
    this.Z = Z;

    // ---- szemek ----
    const er = o.eyeR ?? H * .16, ex = H * .37, ey = H * .08, ez = Z(ex, ey) - er * .55;
    this.eyes = [];
    [-1, 1].forEach(s => {
      const socket = new THREE.Group(); socket.position.set(s * ex, ey, ez); this.g.add(socket);
      const ball = new THREE.Group(); socket.add(ball);
      mk(SPH, this.M.white, ball, null, [er, er, er]);
      const iris = mk(new THREE.CircleGeometry(er * .58, 40), new THREE.MeshPhysicalMaterial({ map: irisTexture(o.iris), roughness: .3, clearcoat: 1 }), ball, V(0, 0, er * .965)); iris.castShadow = false;
      iris.geometry = new THREE.SphereGeometry(er * 1.0, 32, 16, 0, Math.PI * 2, 0, .62); iris.rotation.x = Math.PI / 2; iris.position.set(0, 0, -er * .0); iris.scale.setScalar(1.005);
      // gömbsüveg textúra-koordinátái: középen a pupilla
      const uv = iris.geometry.attributes.uv, pp = iris.geometry.attributes.position; for (let i = 0; i < uv.count; i++) { const x = pp.getX(i) / (er * Math.sin(.62)), z = pp.getZ(i) / (er * Math.sin(.62)); uv.setXY(i, .5 + x * .5, .5 - z * .5); }
      const cor = mk(new THREE.SphereGeometry(er * 1.04, 32, 16, 0, Math.PI * 2, 0, .75), this.M.cornea, ball, null, null, [Math.PI / 2, 0, 0]); cor.castShadow = false;
      const glint = mk(new THREE.SphereGeometry(er * .085, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), ball, V(er * .3, er * .3, er * .99)); glint.castShadow = false;
      // szemhéjak: bőr-félgömbhéj + szempillasor
      const lidU = new THREE.Group(); socket.add(lidU);
      mk(new THREE.SphereGeometry(er * 1.09, 40, 16, 0, Math.PI * 2, 0, Math.PI * .5), skin, lidU, null, [1, 1.05, 1.02]);
      const lg = new THREE.TorusGeometry(er * 1.075, er * (o.lashes ? .085 : .05), 6, 40, Math.PI * .92); lg.rotateZ(Math.PI * .04);
      const lash = mk(lg, this.M.dark, lidU, null, null, [Math.PI / 2, 0, 0]); lash.castShadow = false;
      if (o.lashes) [-.6, -.25, .15, .5, .8].forEach(a => { const l = mk(new THREE.ConeGeometry(er * .05, er * .32, 5), this.M.dark, lidU, V(Math.sin(a * 1.4) * er * 1.06 * s, 0, Math.cos(a * 1.4) * er * 1.06), null, [Math.PI / 2 + .5, 0, -s * a * .6]); l.castShadow = false; });
      const lidD = new THREE.Group(); socket.add(lidD);
      mk(new THREE.SphereGeometry(er * 1.075, 40, 12, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), skin, lidD, null, [1, 1.02, 1.01]);
      // szemhéj-redő a felső szemhéj fölött
      const fold = mk(taperTube([V(-er * 1.0, er * .55, er * .55), V(0, er * 1.0, er * .9), V(er * 1.0, er * .55, er * .55)], er * .06, .2, .8, 16, 5), this.M.crease, socket); fold.castShadow = false;
      // szarkalábak
      const crow = [0, 1, 2].map(k => { const m = mk(taperTube([V(s * er * 1.15, er * (.25 - k * .25), er * .2), V(s * er * 1.55, er * (.35 - k * .32), -er * .1)], er * .045, .15, .8, 8, 4), this.M.crease, socket); m.castShadow = false; return m; });
      this.eyes.push({ socket, ball, lidU, lidD, s, er, fold, crow });
    });
    this.er = er; this.ex = ex; this.ey = ey;

    // ---- szemöldök (újragenerált cső, belső/külső vég mozog) ----
    this.brows = [-1, 1].map(s => ({ s, mesh: null, key: '' }));
    this.browBase = { y: ey + er * 1.55, x0: ex - er * .95, x1: ex + er * 1.25 };

    // ---- orr ----
    const ny = -H * .12, nz = Z(0, ny);
    if (!o.mascot) {
    mk(new THREE.CapsuleGeometry(H * .045, H * .24, 6, 12), skin, this.g, V(0, ny + H * .13, nz - H * .045), [1, 1, .85], [-.3, 0, 0]);
    mk(SPH, skin, this.g, V(0, ny, nz + H * .02), [H * .075, H * .068, H * .07]);
    [-1, 1].forEach(s => mk(SPH, skin, this.g, V(s * H * .065, ny - H * .02, nz - H * .01), [H * .045, H * .04, H * .045]));
    [-1, 1].forEach(s => { const n = mk(SPH, this.M.mouth, this.g, V(s * H * .035, ny - H * .055, nz + H * .01), [H * .02, H * .01, H * .015]); n.castShadow = false; });

    }
    // ---- arcpofák (mosolynál felemelkednek) ----
    this.cheeks = o.mascot ? [] : [-1, 1].map(s => { const c = mk(SPH, skin, this.g, V(s * H * .44, -H * .2, Z(H * .44, -H * .2) - H * .115), [H * .24, H * .17, H * .08], [0, s * .55, 0]); c.userData.keep = 1; return { m: c, s, y0: -H * .2, z0: c.position.z - H * .03 }; });
    this.blushes = [-1, 1].map(s => { const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; pts.push({ x: s * H * .44 + Math.cos(a) * H * .15, y: -H * .2 + Math.sin(a) * H * .1 }); } const b = new THREE.Mesh(surfaceShape(pts, Z, H * .006, H * .002), this.M.blush); this.g.add(b); b.castShadow = false; b.renderOrder = 2; return b; });

    // ---- nasolabiális redők ----
    this.naso = o.mascot ? [] : [-1, 1].map(s => { const m = mk(taperTube([V(s * H * .13, -H * .15, Z(H * .13, -H * .15) - H * .005), V(s * H * .22, -H * .3, Z(H * .22, -H * .3) + H * .005), V(s * H * .25, -H * .44, Z(H * .25, -H * .44) - H * .005)], H * .016, .1, .9, 14, 5), this.M.crease, this.g); m.castShadow = false; return m; });

    // ---- száj ----
    this.mouthY = -H * .42; this.mouthZ = Z(0, this.mouthY);
    this.mouthG = new THREE.Group(); this.mouthG.position.set(0, this.mouthY, 0); this.g.add(this.mouthG);
    this.cavity = mk(SPH, this.M.mouth, this.mouthG, V(0, 0, this.mouthZ - H * .1), [H * .2, H * .05, H * .12]); this.cavity.castShadow = false;
    const teethArc = (r, y) => { const t = mk(new THREE.CylinderGeometry(r, r, H * .07, 28, 1, true, -Math.PI * .3, Math.PI * .6), this.M.teeth, this.mouthG, V(0, y, this.mouthZ - r - H * .03)); t.material.side = THREE.DoubleSide; t.castShadow = false; return t; };
    this.teethU = teethArc(H * .2, H * .01); this.teethD = teethArc(H * .19, -H * .05);
    this.tongue = mk(SPH, this.M.tongue, this.mouthG, V(0, -H * .06, this.mouthZ - H * .1), [H * .12, H * .04, H * .1]); this.tongue.castShadow = false;
    this.lipU = null; this.lipD = null; this._mkey = '';
    // áll (állkapocs nyitásnál lefelé mozdul)
    this.chin = mk(SPH, skin, this.g, V(0, -H * .66, Z(0, -H * .66) - H * .19), [H * .26, H * .16, H * .18]); this.chin.visible = !o.mascot;
    this.chinY0 = this.chin.position.y;
    // ---- könnyek ----
    this.tears = [-1, 1].map(s => { const t = mk(new THREE.SphereGeometry(1, 14, 10), this.M.tear, this.g); t.visible = false; t.castShadow = false; return { m: t, s, ph: Math.random() }; });
    // ---- fülek ----
    if (!o.mascot) [-1, 1].forEach(s => {
      const ear = new THREE.Group(); ear.position.set(s * H * sc[0] * .96, -H * .02, -H * .04); ear.rotation.y = s * .35; this.g.add(ear);
      mk(SPH, skin, ear, null, [H * .1, H * .2, H * .13]);
      mk(new THREE.TorusGeometry(H * .12, H * .035, 8, 20, Math.PI * 1.4), skin, ear, V(s * H * .03, 0, 0), null, [0, s * Math.PI / 2, Math.PI * .8]);
      if (o.earrings) { const e = mk(SPH, o.earrings, ear, V(s * H * .02, -H * .22, H * .02), [H * .045, H * .045, H * .045]); }
    });
    if (o.wrinkles) { // homlokráncok idősebbeknek
      [0, 1].forEach(k => { const m = mk(taperTube([V(-H * .32, H * (.48 + k * .09), Z(H * .32, H * (.48 + k * .09)) + H * .003), V(0, H * (.52 + k * .09), Z(0, H * (.52 + k * .09)) + H * .006), V(H * .32, H * (.48 + k * .09), Z(H * .32, H * (.48 + k * .09)) + H * .003)], H * .009, .1, .9, 16, 4), this.M.crease, this.g); m.material = this.M.crease.clone(); m.material.opacity = .45; m.castShadow = false; });
    }
    this.markKeep();
    this.set('vidam', true);
  }

  markKeep() { const k = m => m && (m.userData.keep = 1);
    [this.cavity, this.teethU, this.teethD, this.tongue, this.chin].forEach(k); this.blushes.forEach(k); this.naso.forEach(k); this.tears.forEach(t => k(t.m));
    this.eyes.forEach(e => { k(e.fold); e.crow.forEach(k); }); this.g.traverse(o => { if (o.material === this.M.crease || (o.material && o.material.opacity !== undefined && o.material.transparent)) k(o); }); }
  set(name, instant) { this.name = name; this.tgt = { ...EXPR.semleges, ...(EXPR[name] || {}) }; if (instant) this.cur = { ...this.tgt }; }
  talk(sec) { this.talkT = sec; }

  _brow(b, E) {
    const H = this.H, BB = this.browBase, s = b.s, er = this.er;
    const asy = E.asym ? (s < 0 ? .4 : -.15) : 0;
    const ib = (E.bi + asy * .6 + this.browIdle) * er * .9, ob = (E.bo + asy * .5 + this.browIdle * .6) * er * .7;
    const sq = E.bs * er * .35;
    const pts = [
      V(s * (BB.x0 - sq * .8), BB.y + ib - E.bs * er * .25, 0),
      V(s * (BB.x0 + (BB.x1 - BB.x0) * .4), BB.y + (ib + ob) * .5 + er * .22, 0),
      V(s * (BB.x0 + (BB.x1 - BB.x0) * .75), BB.y + ob + er * .16, 0),
      V(s * BB.x1, BB.y + ob - er * .12, 0)];
    const key = pts.map(p => (p.y / H).toFixed(2) + (p.x / H).toFixed(2)).join();
    if (key === b.key) return; b.key = key;
    const geo = surfaceShape(strokeOutline(s < 0 ? pts.slice().reverse() : pts, er * (this.o.browW ?? .2) * 1.1, .25), this.Z, H * .004, H * .018);
    if (b.mesh) { b.mesh.geometry.dispose(); b.mesh.geometry = geo; }
    else { b.mesh = new THREE.Mesh(geo, this.M.brow); b.mesh.castShadow = false; b.mesh.userData.keep = 1; this.g.add(b.mesh); }
  }

  _mouth(E, open) {
    const H = this.H, W = H * .25 * E.wd * (1 - E.pk * .25);
    const cy = E.sm * H * .17, upY = H * .032, pk = E.pk;
    const key = [W / H, cy / H, open, pk].map(v => v.toFixed(2)).join();
    if (key === this._mkey) return; this._mkey = key;
    const zf = (x, y) => this.Z(x, this.mouthY + y) + H * .03 + pk * H * .03 * (1 - Math.abs(x) / W);
    const ou = open * H * .03, od = open * H * .2;
    const up = [V(-W, cy, 0), V(-W * .55, upY + cy * .55 + ou, 0), V(-W * .12, upY * 1.25 + ou, 0), V(0, upY * .95 + ou, 0), V(W * .12, upY * 1.25 + ou, 0), V(W * .55, upY + cy * .55 + ou, 0), V(W, cy, 0)];
    const dn = [V(-W, cy - H * .004, 0), V(-W * .5, -H * .045 + cy * .35 - od * .85, 0), V(0, -H * .06 - od - Math.max(0, E.sm) * H * .02, 0), V(W * .5, -H * .045 + cy * .35 - od * .85, 0), V(W, cy - H * .004, 0)];
    // ajak-körvonalak (Cupido-ív felül, telt alsó ajak)
    const my = this.mouthY, Zm = (x, y) => this.Z(x, y);
    const seamU = up.map(p => ({ x: p.x, y: my + p.y - (Math.abs(p.x) < W * .9 ? ou * .0 : 0) }));
    const topU = [{ x: -W, y: my + cy }, { x: -W * .6, y: my + upY * 1.9 + cy * .55 + ou }, { x: -W * .2, y: my + upY * 2.6 + ou }, { x: 0, y: my + upY * 2.1 + ou }, { x: W * .2, y: my + upY * 2.6 + ou }, { x: W * .6, y: my + upY * 1.9 + cy * .55 + ou }, { x: W, y: my + cy }];
    const seamLine = [{ x: -W, y: my + cy }, { x: -W * .5, y: my + cy * .55 + ou * .5 }, { x: 0, y: my + ou * .6 }, { x: W * .5, y: my + cy * .55 + ou * .5 }, { x: W, y: my + cy }];
    const lowTop = [{ x: W, y: my + cy - H * .004 }, { x: W * .5, y: my + cy * .5 - od * .8 }, { x: 0, y: my - od }, { x: -W * .5, y: my + cy * .5 - od * .8 }, { x: -W, y: my + cy - H * .004 }];
    const lowBot = [{ x: -W * .92, y: my + cy - H * .01 }, { x: -W * .45, y: my - H * .07 + cy * .3 - od * .95 }, { x: 0, y: my - H * .085 - od - Math.max(0, E.sm) * H * .015 }, { x: W * .45, y: my - H * .07 + cy * .3 - od * .95 }, { x: W * .92, y: my + cy - H * .01 }];
    const smooth = (arr, n = 8) => { const c = new THREE.CatmullRomCurve3(arr.map(p => new THREE.Vector3(p.x, p.y, 0))); return c.getPoints(n * arr.length).map(v => ({ x: v.x, y: v.y })); };
    const upperOutline = smooth(topU).concat(smooth(seamLine).reverse());
    const lowerOutline = smooth(lowTop).concat(smooth(lowBot));
    const gU = surfaceShape(upperOutline.map(p => ({ x: p.x, y: p.y - my })), (x, y) => Zm(x, y + my), H * .004, H * .028);
    const gD = surfaceShape(lowerOutline.map(p => ({ x: p.x, y: p.y - my })), (x, y) => Zm(x, y + my), H * .004, H * .04);
    if (this.lipU) { this.lipU.geometry.dispose(); this.lipD.geometry.dispose(); this.lipU.geometry = gU; this.lipD.geometry = gD; }
    else { this.lipU = new THREE.Mesh(gU, this.M.lip); this.lipD = new THREE.Mesh(gD, this.M.lip); [this.lipU, this.lipD].forEach(m => { m.castShadow = false; m.userData.keep = 1; this.mouthG.add(m); }); }
    // szájrés (zárt szájnál vékony sötét vonal)
    const gapO = smooth(seamLine).concat(smooth(lowTop));
    const gG = surfaceShape(gapO.map(p => ({ x: p.x, y: p.y - my })), (x, y) => Zm(x, y + my), H * .002, H * .004);
    if (this.gap) { this.gap.geometry.dispose(); this.gap.geometry = gG; } else { this.gap = new THREE.Mesh(gG, this.M.mouth); this.gap.userData.keep = 1; this.mouthG.add(this.gap); }
    // üreg, fogak, nyelv
    const o2 = Math.max(open, 0);
    this.cavity.visible = false;
    const showT = E.tt * clamp(o2 * 4, 0, 1);
    this.teethU.visible = showT > .05; this.teethU.position.y = ou - H * .03 + cy * .3; this.teethU.position.z = this.mouthZ - H * .2 - H * .03 + H * .02; this.teethU.scale.set(E.wd * .9, 1, 1);
    this.teethD.visible = o2 > .35 && E.tt > .5; this.teethD.position.y = -od + H * .025; this.teethD.position.z = this.mouthZ - H * .19 - H * .03 + H * .02;
    this.tongue.visible = o2 > .3; this.tongue.position.y = -od * .75; this.tongue.position.z = this.mouthZ - H * .09;
  }

  update(dt, t, look) {
    const C = this.cur, T = this.tgt, H = this.H;
    for (const k in T) C[k] = damp(C[k] ?? 0, T[k], 6.5, dt);
    // pislogás + mikromozgások
    this.blinkT -= dt; if (this.blinkT < 0) { this.blink = 1; this.blinkT = 1.8 + Math.random() * 3.6; if (Math.random() < .18) this._dbl = .3; }
    if (this._dbl !== undefined) { this._dbl -= dt; if (this._dbl < 0) { this.blink = 1; delete this._dbl; } }
    this.blink = Math.max(0, this.blink - dt * 6.5);
    const bk = Math.sin(Math.min(1, this.blink) * Math.PI);
    this.saccT -= dt; if (this.saccT < 0) { this.sacc.set((Math.random() - .5) * .12, (Math.random() - .5) * .08); this.saccT = .4 + Math.random() * 1.8; }
    this.browIdle = Math.max(0, Math.sin(t * .23) * Math.sin(t * .71)) * .12;
    // beszéd: magánhangzó-szerű szájmozgás
    let talkO = 0; if (this.talkT > 0) { this.talkT -= dt; this.talkPh += dt * (9 + Math.sin(t * 3) * 3); talkO = (Math.abs(Math.sin(this.talkPh)) * .5 + Math.abs(Math.sin(this.talkPh * 1.7)) * .25) * clamp(this.talkT * 3, 0, 1); }
    const open = clamp(C.op + talkO, 0, 1);
    // szemek: tekintet + saccade
    const lx = (look?.x ?? 0) + this.sacc.x, ly = (look?.y ?? 0) + this.sacc.y;
    const lu = clamp(C.lu + bk * (1 - C.lu), -.25, 1), ld = clamp(C.ld, 0, 1);
    this.eyes.forEach(e => {
      e.ball.rotation.set(clamp(ly, -.4, .4), clamp(lx, -.5, .5), 0);
      const a = E => E;
      e.lidU.rotation.x = lerp(-.72, 1.45, Math.max(0, lu)) + Math.min(0, lu) * .9 + ly * .25 - (C.asym && e.s > 0 ? .18 : 0);
      e.lidD.rotation.x = lerp(1.0, .4, ld) + ly * .15;
      e.fold.material.opacity = .25 + C.ch * .2; e.fold.position.y = C.bi * this.er * .1;
      e.crow.forEach(c => c.material.opacity = Math.max(this.o.age ? .35 : 0, C.ch * .55));
    });
    this.brows.forEach(b => this._brow(b, C));
    this._mouth(C, open);
    // arcpofa emelés, pír, redők
    this.cheeks.forEach(c => { c.m.position.y = c.y0 + C.ch * H * .05; c.m.position.z = c.z0 + C.ch * H * .035; });
    this.blushes.forEach(b => b.material.opacity = .08 + C.blush * .38);
    this.naso.forEach(n => n.material.opacity = (this.o.age ? .35 : .08) + Math.max(0, C.sm) * .35 + C.bs * .1);
    this.chin.position.y = this.chinY0 - open * H * .12;
    // könnyek gördülése
    this.tears.forEach((tr, i) => {
      const on = C.tear > .5; tr.m.visible = on; if (!on) return;
      const ph = ((t * .45 + tr.ph) % 1);
      const x = tr.s * (this.ex + this.er * .2) * (1 - ph * .15), y = this.ey - this.er * 1.05 - ph * H * .55;
      tr.m.position.set(x, y, this.Z(x, y) + H * .02);
      const sz = this.er * (.18 + (ph < .1 ? ph * 2 : .2)) * (1 - ph * .3); tr.m.scale.set(sz, sz * 1.35, sz * .8);
    });
    return C;
  }
}

return { EXPR, EXPR_NAMES, Face, headGeometry };
})();
const FAMM = (() => {
const { mergeGeometries } = BGU;
const { WIND, windify, windDepth } = WINDM;
const { buildHair, lockGeometry, rng } = HAIRM;
const { Hand } = HANDM;
const { Face, EXPR, EXPR_NAMES, headGeometry } = FACEM;
/* ==========================================================================
   family3d.js (v2) – A család és a jog alakjai, procedurális 3D (Three.js)
   Bodnár Emese Ügyvédi Iroda · ugyvedhez.hu
   Szereplők: gyerek, anya, apa, nagymama, nagypapa, Justitia,
              § Bölcs, § Vidám, § Bíró
   Ötujjú kezek, tincsekből épülő, szélben lobogó haj, ráncolódó ruhák,
   kidolgozott mimika, kellékek (mackó, bot, mérleg, kard, kalapács, lúdtoll).
   ========================================================================== */








const V = (x, y, z) => new THREE.Vector3(x, y, z);
const { lerp, clamp, damp } = THREE.MathUtils;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const bell = (t, a, b) => (t <= a || t >= b) ? 0 : Math.sin(Math.PI * (t - a) / (b - a));

/* ---------- Anyagok ---------- */
function skinMat(hex) {
  return new THREE.MeshPhysicalMaterial({ color: hex, roughness: .52, metalness: 0, sheen: .25, sheenRoughness: .7, sheenColor: new THREE.Color('#ff9e86'), clearcoat: .08, clearcoatRoughness: .6, emissive: new THREE.Color('#b8502e'), emissiveIntensity: .045 });
}
function clothMat(hex, o = {}) { const c = new THREE.Color(hex); return new THREE.MeshPhysicalMaterial({ color: c, roughness: o.rough ?? .82, sheen: o.sheen ?? .7, sheenRoughness: .8, sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), .35), side: o.side ?? THREE.FrontSide, metalness: o.metal ?? 0, clearcoat: o.cc ?? 0 }); }
const GOLD = () => new THREE.MeshPhysicalMaterial({ color: '#D9B56A', metalness: .95, roughness: .26, clearcoat: .4 });
const SPH = new THREE.SphereGeometry(1, 32, 24);

function mesh(geo, mat, parent, pos, rot, scl, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true;
  if (pos) m.position.copy(pos); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); if (scl) m.scale.set(scl[0], scl[1], scl[2]);
  if (parent) parent.add(m); return m;
}
const ball = (r, mat, parent, pos, s = [1, 1, 1], sh = true) => mesh(SPH, mat, parent, pos, null, [r * s[0], r * s[1], r * s[2]], sh);
const capsule = (r, len, mat, parent, pos, rot, sh = true) => mesh(new THREE.CapsuleGeometry(r, Math.max(.001, len), 8, 20), mat, parent, pos, rot, null, sh);
function tube(pts, r, mat, parent, closed = false, segs = 40, radial = 10) { const c = new THREE.CatmullRomCurve3(pts.map(p => p.isVector3 ? p : V(...p)), closed); return mesh(new THREE.TubeGeometry(c, segs, r, radial, closed), mat, parent); }

/**
 * Ruha-esztergált test redőkkel és szél-attribútummal.
 * prof: [[r, y], ...] lentről felfelé; folds: { n, amp: y=>0..1 } ; sway: [yFix, yFree] (aSway 0→1)
 */
function clothLathe(prof, mat, parent, o = {}) {
  if (prof[0][1] > prof[prof.length - 1][1]) prof = prof.slice().reverse();   // lentről felfelé (helyes normálisok)
  const pts = prof.map(p => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(pts, o.segs ?? 72, o.phi0 ?? 0, o.phiLen ?? Math.PI * 2);
  const pos = g.attributes.position, n = pos.count, sway = new Float32Array(n);
  const ymin = Math.min(...prof.map(p => p[1])), ymax = Math.max(...prof.map(p => p[1]));
  for (let i = 0; i < n; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const th = Math.atan2(x, z), yn = (y - ymin) / (ymax - ymin || 1);
    if (o.folds) { const a = o.folds.amp(yn); const k = 1 + a * (Math.sin(th * o.folds.n + (o.folds.ph ?? 0)) * .7 + Math.sin(th * o.folds.n * 2.3 + 1.3) * .3); x *= k; z *= k; }
    z *= o.depth ?? .82;
    if (o.flatBack && z < 0) z *= .92;
    pos.setXYZ(i, x, y, z);
    if (o.sway) sway[i] = clamp((o.sway[0] - y) / (o.sway[0] - o.sway[1]), 0, 1);
  }
  g.computeVertexNormals();
  g.setAttribute('aSway', new THREE.BufferAttribute(sway, 1));
  let m = mat;
  if (o.sway) { m = windify(mat.clone(), 'cloth', { amp: o.amp ?? 1 }); }
  const me = mesh(g, m, parent, o.pos);
  if (o.sway) me.customDepthMaterial = windDepth('cloth', o.amp ?? 1);
  return me;
}

/* Változó vastagságú cső (antikva tollvonás: vastag törzs, vékony hajszálvonal) */
function varTube(pts, rFn, segs = 120, radial = 20) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false), pos = g.attributes.position, fr = curve.computeFrenetFrames(segs, false);
  for (let i = 0; i <= segs; i++) { const t = i / segs, P = curve.getPointAt(t), r = rFn(t);
    for (let j = 0; j <= radial; j++) { const a = j / radial * Math.PI * 2, k = i * (radial + 1) + j, N = fr.normals[i], B = fr.binormals[i]; const cx = Math.cos(a) * r, cy = Math.sin(a) * r * .72;
      pos.setXYZ(k, P.x + N.x * cx + B.x * cy, P.y + N.y * cx + B.y * cy, P.z + N.z * cx + B.z * cy); } }
  g.computeVertexNormals(); return g;
}

/* ---------- Szereplők leírása ---------- */
const CAST = {
  gyerek:   { name: 'Gyerek', age: 'kb. 6 éves', kind: 'ember', height: 1.0, H: .215, sc: [1.04, 1, 1], skin: '#F0C3A2', lip: '#D88C83', hairC: '#8A5A2B', hair: 'copfos', iris: '#6B4A2F', brow: '#7A4E26', top: '#E8B84A', bottom: '#3B5B8C', shoes: '#C2554A', sole: '#F5F2EA', b: { sh: .125, hip: .105, torso: .27, leg: .26, arm: .26, belly: 1.06 }, child: true, eyeR: 1.18, lashes: true, prop: 'maci', star: true, hand: .062 },
  anya:     { name: 'Anya', age: 'kb. 35 éves', kind: 'ember', height: 1.55, H: .2, sc: [.98, 1.07, .98], skin: '#EDB894', lip: '#C46A68', hairC: '#9C4A2A', hair: 'hosszu-hullamos', iris: '#4E7A5C', brow: '#7A3A20', top: '#1E5A4F', bottom: '#2C3A47', shoes: '#7A3B2E', sole: '#3a2a22', b: { sh: .15, hip: .13, torso: .42, leg: .52, arm: .44, belly: .95 }, dress: true, earrings: true, lashes: true, necklace: true, hand: .078 },
  apa:      { name: 'Apa', age: 'kb. 38 éves', kind: 'ember', height: 1.68, H: .2, sc: [1, 1.06, .98], skin: '#ECBB98', lip: '#B9776E', hairC: '#3B2A20', hair: 'rovid-kocos', iris: '#5B7FA6', brow: '#2E2018', top: '#3E5C7A', bottom: '#3A3A40', shoes: '#5A3A26', sole: '#2a1d16', b: { sh: .2, hip: .15, torso: .46, leg: .56, arm: .48, belly: 1 }, shirt: true, stubble: true, belt: true, hand: .088, browW: .26 },
  nagymama: { name: 'Nagymama', age: 'kb. 68 éves', kind: 'ember', height: 1.47, H: .195, sc: [1, 1.04, .98], skin: '#EFCAAE', lip: '#B97A78', hairC: '#DCD8D2', hair: 'konty', iris: '#6B5A48', brow: '#A9A39A', top: '#8E3B4A', bottom: '#5B4E66', shoes: '#4B3A3A', sole: '#2b2020', b: { sh: .16, hip: .15, torso: .4, leg: .46, arm: .42, belly: 1.08 }, cardigan: true, skirt: true, glasses: 'kerek', pearls: true, lashes: true, age: true, wrinkles: true, hand: .076 },
  nagypapa: { name: 'Nagypapa', age: 'kb. 72 éves', kind: 'ember', height: 1.6, H: .198, sc: [1, 1.06, .98], skin: '#EDC5A8', lip: '#B57A72', hairC: '#E6E3DE', hair: 'oldalt-ritkas', iris: '#5B6E7E', brow: '#D8D4CE', top: '#E9E4D6', bottom: '#4A4A4F', shoes: '#3D2E24', sole: '#211812', b: { sh: .19, hip: .15, torso: .44, leg: .5, arm: .46, belly: 1.1 }, vest: true, glasses: 'szogletes', mustache: true, age: true, wrinkles: true, cane: true, hand: .086, browW: .3 },
  justitia: { name: 'Justitia', age: 'az igazságosság római istennője', kind: 'ember', height: 1.72, H: .19, sc: [.97, 1.08, .98], skin: '#F2CFB6', lip: '#C07A70', hairC: '#6B4226', hair: 'antik-hosszu', iris: '#5A6B7A', brow: '#5a3820', top: '#F4EEE2', bottom: '#F4EEE2', shoes: '#C9A55A', sole: '#8C6A30', b: { sh: .15, hip: .13, torso: .44, leg: .6, arm: .48, belly: .92 }, goddess: true, lashes: true, hand: .08 },
  parBolcs: { name: '§ Bölcs', age: 'tudós kalauz a kódexből', kind: 'para', variant: 'bolcs', height: 1.0, H: .16, glyph: '#C9A13B', iris: '#4B5E7A', brow: '#E9E5DD', lip: '#A6503F', hand: .06 },
  parOltalmazo: { name: '§ Oltalmazó', age: 'szelíd, oltalmazó kísérő', kind: 'para', variant: 'oltalmazo', height: .96, H: .165, glyph: '#7A1F2B', iris: '#5A4632', brow: '#3E0A1A', lip: '#9E4A45', hand: .058 },
  parBiro:  { name: '§ Bíró', age: 'méltóságteljes bíró', kind: 'para', variant: 'biro', height: 1.08, H: .16, glyph: '#C9A13B', iris: '#3B4A5A', brow: '#5a4a3a', lip: '#8E3B3B', hand: .062 }
};
const ORDER = ['nagypapa', 'nagymama', 'apa', 'anya', 'gyerek'];
const ALL = ['gyerek', 'anya', 'apa', 'nagymama', 'nagypapa', 'justitia', 'parBolcs', 'parOltalmazo', 'parBiro'];

const ACTIONS = {
  integet: 'Integet', bolint: 'Bólint', ugral: 'Ugrál', tapsol: 'Tapsol', mutat: 'Mutat', rax: 'Kitárja a karját', olel: 'Ölel',
  nevet: 'Nevet', sir: 'Sír', setal: 'Sétál', fordul: 'Körbefordul', kezetfog: 'Kezet fog', ir: 'Ír', meghajol: 'Meghajol',
  merlegel: 'Mérlegel', kalapacs: 'Kalapácsot üt'
};

/* ==========================================================================
   Szereplő
   ========================================================================== */
class Character {
  constructor(key, opts = {}) {
    const P = CAST[key]; if (!P) throw new Error('Ismeretlen szereplő: ' + key);
    this.key = key; this.P = P; this.name = P.name;
    this.root = new THREE.Group(); this.root.name = key;
    this.t = Math.random() * 10;
    this.lookTgt = V(0, 1.3, 4); this.look = new THREE.Vector2();
    this.action = null; this.actT = 0; this.actDur = 0;
    this.walkTo = null; this.walkSpeed = .8; this.walking = 0; this.facing = 0; this.facingTgt = 0;
    this.props = {};
    if (P.kind === 'para') this._buildPara(); else this._buildHuman();
    this._finish();
    this.setExpr(opts.expr || (P.goddess ? 'nyugodt' : P.kind === 'para' ? 'semleges' : 'vidam'), true);
  }

  /* ---------------- közös csontváz ---------------- */
  _skeleton(hipY, torsoH) {
    this.mover = new THREE.Group(); this.root.add(this.mover);
    this.squash = new THREE.Group(); this.mover.add(this.squash);
    this.pelvis = new THREE.Group(); this.pelvis.position.y = hipY; this.squash.add(this.pelvis);
    this.spine = new THREE.Group(); this.pelvis.add(this.spine);
    this.chest = new THREE.Group(); this.chest.position.y = torsoH * .55; this.spine.add(this.chest);
    this.neck = new THREE.Group(); this.neck.position.y = torsoH * .5; this.chest.add(this.neck);
  }

  _arm(s, shoulderPos, ua, fa, r, sleeveMat, skin, o = {}) {
    const sh = new THREE.Group(); sh.position.copy(shoulderPos); (o.parent ?? this.chest).add(sh);
    ball(r * 1.12, o.shoulderMat ?? sleeveMat, sh, V(0, -r * .1, 0), [1, 1, 1]);
    const upperMat = o.sleeve === 'rovid' || o.sleeve === 'nincs' ? skin : sleeveMat;
    capsule(r, ua - r, upperMat, sh, V(0, -ua / 2, 0));
    if (o.sleeve === 'rovid') { const sl = mesh(new THREE.CylinderGeometry(r * 1.22, r * 1.32, ua * .42, 24, 1, true), sleeveMat, sh, V(0, -ua * .18, 0)); sl.material.side = THREE.DoubleSide; mesh(new THREE.TorusGeometry(r * 1.3, r * .1, 8, 24), sleeveMat, sh, V(0, -ua * .39, 0), [Math.PI / 2, 0, 0]); }
    const elbow = new THREE.Group(); elbow.position.y = -ua; sh.add(elbow);
    ball(r * .95, upperMat === skin ? skin : (o.sleeve === 'feltur' ? skin : sleeveMat), elbow);
    const foreMat = (o.sleeve === 'rovid' || o.sleeve === 'feltur' || o.sleeve === 'nincs') ? skin : sleeveMat;
    const fr = mesh(new THREE.CylinderGeometry(r * .78, r * .92, fa, 20), foreMat, elbow, V(0, -fa / 2, 0));
    if (o.sleeve === 'feltur') { mesh(new THREE.TorusGeometry(r * 1.02, r * .38, 10, 24), sleeveMat, elbow, V(0, -fa * .08, 0), [Math.PI / 2, 0, 0]); mesh(new THREE.TorusGeometry(r * 1.0, r * .3, 10, 24), sleeveMat, elbow, V(0, -fa * .2, 0), [Math.PI / 2, 0, 0]); }
    if (o.cuff) mesh(new THREE.TorusGeometry(r * .88, r * .16, 8, 22), o.cuff, elbow, V(0, -fa * .9, 0), [Math.PI / 2, 0, 0]);
    if (o.bracelet) mesh(new THREE.TorusGeometry(r * .86, r * .12, 8, 22), o.bracelet, elbow, V(0, -fa * .82, 0), [Math.PI / 2, 0, 0]);
    const wrist = new THREE.Group(); wrist.position.y = -fa; elbow.add(wrist);
    const hand = new Hand(s, this.P.hand, skin); wrist.add(hand.group);
    hand.group.traverse(o2 => { if (o2.isMesh && o2.geometry.type === 'CapsuleGeometry') o2.castShadow = false; });
    return { sh, elbow, wrist, hand, s, ua, fa };
  }

  _legs(hip, Lg, r, mat, P, o = {}) {
    this.legs = [];
    [-1, 1].forEach(s => {
      const h = new THREE.Group(); h.position.set(s * hip * .5, 0, 0); this.pelvis.add(h);
      if (!o.noThigh) capsule(r, Lg * .48 - r, mat, h, V(0, -Lg * .25, 0));
      const knee = new THREE.Group(); knee.position.y = -Lg * .52; h.add(knee);
      ball(r * .9, o.shinMat ?? mat, knee);
      mesh(new THREE.CylinderGeometry(r * .78, r * .9, Lg * .44, 18), o.shinMat ?? mat, knee, V(0, -Lg * .22, 0));
      if (o.socks) mesh(new THREE.CylinderGeometry(r * .8, r * .8, Lg * .1, 16), o.socks, knee, V(0, -Lg * .4, 0));
      const foot = new THREE.Group(); foot.position.y = -Lg * .46; knee.add(foot);
      this._shoe(foot, r, P, s, o);
      this.legs.push({ hip: h, knee, foot, s });
    });
  }
  _shoe(foot, r, P, s, o) {
    const up = new THREE.MeshPhysicalMaterial({ color: P.shoes, roughness: .38, clearcoat: .7, clearcoatRoughness: .3 });
    const sole = new THREE.MeshStandardMaterial({ color: P.sole, roughness: .8 });
    if (o.sandal) {
      mesh(new THREE.BoxGeometry(r * 2.1, r * .28, r * 3.6), sole, foot, V(0, -r * .62, r * .7));
      ball(r * 1.0, o.skin, foot, V(0, -r * .25, r * .75), [.95, .55, 1.6]);
      for (let k = 0; k < 3; k++) mesh(new THREE.TorusGeometry(r * .98, r * .09, 6, 20, Math.PI), up, foot, V(0, -r * .2, r * (.2 + k * .55)), [0, Math.PI / 2, Math.PI / 2]);
      mesh(new THREE.TorusGeometry(r * .9, r * .09, 6, 20), up, foot, V(0, r * .3, 0), [Math.PI / 2, 0, 0]);
      return;
    }
    ball(r * 1.12, up, foot, V(0, -r * .28, r * .62), [1, .72, 1.7]);
    ball(r * .95, up, foot, V(0, -r * .05, -r * .1), [1, .9, 1]);
    const so = mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.12, r * .26, 24), sole, foot, V(0, -r * .7, r * .55)); so.scale.set(1, 1, 1.75);
    if (o.laces) for (let k = 0; k < 3; k++) mesh(new THREE.BoxGeometry(r * .9, r * .06, r * .1), new THREE.MeshStandardMaterial({ color: '#fbfbf7' }), foot, V(0, r * (.12 - k * .1), r * (.55 + k * .28)), [-.6, 0, 0], null, false);
  }

  /* ---------------- ember ---------------- */
  _buildHuman() {
    const P = this.P, B = P.b, H = P.H;
    const skin = skinMat(P.skin); this.skin = skin;
    const top = clothMat(P.top), bottom = clothMat(P.bottom);
    const Lg = B.leg, hipY = Lg + .07, T = B.torso, w = B.sh, hw = B.hip;
    this._skeleton(hipY, T);
    const legR = hw * .36;
    // ---- lábak ----
    if (P.goddess) this._legs(hw, Lg, legR * .85, skin, P, { sandal: true, skin, noThigh: true });
    else if (P.dress || P.skirt) this._legs(hw, Lg, legR * .8, skin, P, { socks: P.skirt ? new THREE.MeshStandardMaterial({ color: '#c9b9a8', roughness: .6 }) : null, noThigh: P.dress });
    else this._legs(hw, Lg, legR, bottom, P, { laces: P.child, shinMat: P.bareLegs ? skin : null });
    // ---- törzs és ruha ----
    if (P.goddess) this._goddessDress(T, w, hw, Lg, skin);
    else if (P.dress) {
      clothLathe([[.0, T * 1.04], [w * .62, T * 1.03], [w * .95, T * .82], [w * .84, T * .55], [hw * 1.0, T * .1], [hw * 1.05, -.02]], top, this.spine, { folds: { n: 9, amp: y => .02 }, depth: .8 });
      clothLathe([[hw * 1.05, 0], [hw * 1.25, -Lg * .2], [hw * 1.6, -Lg * .52], [hw * 1.82, -Lg * .64], [hw * 1.78, -Lg * .66], [.0, -Lg * .66]], top, this.spine, { folds: { n: 11, amp: y => (1 - y) * .09 }, sway: [0, -Lg * .66], amp: 1, depth: .86 });
      mesh(new THREE.TorusGeometry(hw * 1.02, .011, 10, 64), GOLD(), this.spine, V(0, T * .14, 0), [Math.PI / 2, 0, 0]).scale.set(1, .8, 1);
      // nyakkivágás szegély
      mesh(new THREE.TorusGeometry(w * .45, .006, 8, 48, Math.PI), clothMat('#174a41'), this.spine, V(0, T * .98, w * .2), [Math.PI * .62, 0, Math.PI]);
    } else {
      const bulge = P.b.belly;
      clothLathe([[0, -.03], [hw * 1.08, -.02], [hw * 1.15 * bulge, T * .25], [w * .86 * bulge, T * .56], [w * 1.0, T * .82], [w * .78, T * .99], [.05, T * 1.05], [0, T * 1.05]], top, this.spine, { folds: { n: 7, amp: y => .012 + (1 - y) * .015 }, depth: .8 });
      if (!P.skirt) clothLathe([[0, -.07], [hw * 1.13, -.07], [hw * 1.14, .05], [0, .05]], bottom, this.spine, { depth: .82 });
      if (P.skirt) clothLathe([[hw * 1.12, .04], [hw * 1.3, -Lg * .25], [hw * 1.62, -Lg * .6], [hw * 1.7, -Lg * .66], [0, -Lg * .66]], bottom, this.spine, { folds: { n: 13, amp: y => (1 - y) * .08 }, sway: [0, -Lg * .66], amp: .9, depth: .86 });
    }
    const fz = (y, k = 1) => V(0, y, (P.dress ? w * .84 : hw * 1.15 * B.belly) * .8 * k);
    if (P.shirt) {
      const collar = clothMat('#F1EDE4');
      [-1, 1].forEach(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s * .07, .012); sh.lineTo(s * .06, -.05); sh.lineTo(s * .012, -.03); sh.lineTo(0, 0); mesh(new THREE.ExtrudeGeometry(sh, { depth: .006, bevelEnabled: true, bevelSize: .003, bevelThickness: .003 }), collar, this.spine, V(s * .02, T * 1.02, w * .5), [-.5, 0, 0]); });
      mesh(new THREE.BoxGeometry(.028, T * .9, .006), clothMat('#36536f'), this.spine, V(0, T * .5, w * .79));
      for (let i = 0; i < 5; i++) ball(.008, new THREE.MeshPhysicalMaterial({ color: '#f5f1e8', roughness: .3, clearcoat: 1 }), this.spine, V(0, T * (.9 - i * .2), w * .8 + .004));
      // zseb
      mesh(new THREE.BoxGeometry(.09, .1, .006), clothMat('#3a5672'), this.spine, V(w * .45, T * .7, w * .73), [0, .45, 0]);
    }
    if (P.belt) { mesh(new THREE.TorusGeometry(hw * 1.15, .016, 8, 64), new THREE.MeshPhysicalMaterial({ color: '#3b2618', roughness: .5, clearcoat: .5 }), this.spine, V(0, .0, 0), [Math.PI / 2, 0, 0]).scale.set(1, .82, 1); mesh(new THREE.BoxGeometry(.05, .036, .012), GOLD(), this.spine, V(0, 0, hw * 1.15 * .82 + .004)); }
    if (P.cardigan) {
      const cm = clothMat('#7a2e3c');
      clothLathe([[0, T * .02], [hw * 1.24 * B.belly, T * .0], [hw * 1.24 * B.belly, T * .3], [w * .93 * B.belly, T * .58], [w * 1.04, T * .82], [w * .8, T * .98], [0, T * 1.0]], cm, this.spine, { folds: { n: 6, amp: y => .02 }, depth: .82 });
      const blouse = clothMat('#F6F0E6');
      [-1, 1].forEach(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(s * .06, .01, s * .065, -.045); sh.quadraticCurveTo(s * .02, -.04, 0, -.012); mesh(new THREE.ExtrudeGeometry(sh, { depth: .005, bevelEnabled: true, bevelSize: .003, bevelThickness: .002 }), blouse, this.spine, V(s * .006, T * 1.0, w * .48), [-.55, 0, 0]); });
      for (let i = 0; i < 4; i++) ball(.012, GOLD(), this.spine, V(-.005, T * (.78 - i * .18), w * .8 * B.belly + .03));
      mesh(new THREE.BoxGeometry(.012, T * .95, .004), new THREE.MeshStandardMaterial({ color: '#5c2230' }), this.spine, V(.008, T * .5, w * .82 * B.belly + .03));
    }
    if (P.vest) {
      const vm = clothMat('#46442F');
      clothLathe([[0, T * .02], [hw * 1.24 * B.belly, T * .0], [hw * 1.25 * B.belly, T * .3], [w * .92 * B.belly, T * .58], [w * .98, T * .8], [0, T * .8]], vm, this.spine, { depth: .83, folds: { n: 5, amp: y => .01 } });
      for (let i = 0; i < 4; i++) ball(.011, GOLD(), this.spine, V(0, T * (.7 - i * .15), w * .82 * B.belly + .028 - i * .002));
      tube([V(-.015, T * .5, w * .86), V(-.07, T * .44, w * .84), V(-.12, T * .49, w * .76)], .0035, GOLD(), this.spine);
      // ing gallér a mellény fölött
      const collar = clothMat('#F6F2E8');
      [-1, 1].forEach(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s * .065, .01); sh.lineTo(s * .055, -.045); sh.lineTo(0, -.02); mesh(new THREE.ExtrudeGeometry(sh, { depth: .005, bevelEnabled: true, bevelSize: .003, bevelThickness: .002 }), collar, this.spine, V(s * .015, T * 1.02, w * .5), [-.5, 0, 0]); });
    }
    if (P.star) { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .022 : .05; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } mesh(new THREE.ExtrudeGeometry(sh, { depth: .006, bevelEnabled: true, bevelSize: .004, bevelThickness: .003, bevelSegments: 2 }), new THREE.MeshPhysicalMaterial({ color: '#FFF3D0', roughness: .35, clearcoat: .5 }), this.spine, fz(T * .52, 1.12)); }
    if (P.pearls) for (let i = 0; i < 21; i++) { const a = Math.PI * .1 + i * (Math.PI * .8 / 20); ball(.0115, new THREE.MeshPhysicalMaterial({ color: '#FBF5EA', roughness: .12, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color('#ffd9e8'), iridescence: .4 }), this.chest, V(Math.cos(a) * .078, T * .44 - Math.sin(a) * .03, Math.sin(a) * .065 + .012)); }
    if (P.necklace) { tube([V(-.06, T * .47, .04), V(0, T * .38, .1), V(.06, T * .47, .04)], .0025, GOLD(), this.chest); ball(.014, new THREE.MeshPhysicalMaterial({ color: '#2E7565', roughness: .05, clearcoat: 1, transmission: .3 }), this.chest, V(0, T * .36, .1)); }
    // nyak
    capsule(H * .25, .05, skin, this.neck, V(0, .025, 0));
    // ---- karok ----
    const ar = w * .3 * (P.child ? 1.12 : 1);
    const sleeve = P.sleeve ? P.sleeve : P.dress ? 'rovid' : P.child ? 'rovid' : P.shirt ? 'feltur' : P.goddess ? 'nincs' : P.vest ? 'hosszu' : 'hosszu';
    const sleeveMat = P.cardigan ? clothMat('#7a2e3c') : (P.vest ? clothMat('#E9E4D6') : top);
    this.arms = [-1, 1].map(s => this._arm(s, V(s * w * .98, T * .38, 0), B.arm * .48, B.arm * .42, ar, sleeveMat, skin, { sleeve, cuff: (sleeve === 'hosszu') ? sleeveMat : null, bracelet: P.goddess ? GOLD() : null, shoulderMat: P.goddess ? skin : sleeveMat }));
    // ---- fej ----
    this.headG = new THREE.Group(); this.headG.position.y = .055 + H * .95; this.neck.add(this.headG);
    const head = new THREE.Group(); this.headG.add(head); this.head = head;
    const headMesh = mesh(headGeometry(H, P.sc, P.child), skin, head); headMesh.updateMatrixWorld(true);
    if (P.stubble) { const st = mesh(headGeometry(H * 1.004, P.sc, false), new THREE.MeshStandardMaterial({ color: '#4d3a2e', transparent: true, opacity: .16, depthWrite: false }), head); st.castShadow = false; st.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n'); }; st.renderOrder = 1; this._stubble = st; st.geometry = headGeometry(H * 1.004, P.sc, false); const g = st.geometry, p = g.attributes.position; /* csak az állra/arcra */ const keep = []; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / H, z = p.getZ(i) / H; keep.push(y < -.12 && z > -.2 ? 1 : 0); } const idx = g.index.array, ni = []; for (let i = 0; i < idx.length; i += 3) if (keep[idx[i]] && keep[idx[i + 1]] && keep[idx[i + 2]]) ni.push(idx[i], idx[i + 1], idx[i + 2]); g.setIndex(ni); }
    this.face = new Face(head, H, P.sc, { surface: headMesh, skin, skinColor: P.skin, lip: P.lip, brow: P.brow, iris: P.iris, lashes: P.lashes, age: P.age, wrinkles: P.wrinkles, child: P.child, eyeR: H * .16 * (P.eyeR ?? 1), earrings: P.earrings ? GOLD() : null, browW: P.browW });
    this.hair = buildHair(P.hair, H, P.hairC, { sc: P.sc, seed: [...this.key].reduce((a, c) => a + c.charCodeAt(0), 0), amp: P.hairAmp ?? (P.hair === 'rovid-kocos' ? .7 : 1), count: P.hairCount });
    head.add(this.hair);
    if (P.mustache) this._mustache(head, H, P);
    if (P.glasses) this._glasses(head, H, P.glasses);
    if (P.goddess) this._goddessHead(head, H);
    // ---- kellékek ----
    if (P.prop === 'maci') this._teddy();
    if (P.cane) this._cane();
    if (P.goddess) { this._scales(); this._sword(); }
  }

  _mustache(head, H, P) {
    const R = rng(91), geos = [];
    for (let i = 0; i < 70; i++) {
      const s = i % 2 ? 1 : -1, x0 = s * H * (.02 + R() * .18), y0 = -H * .3 + R() * H * .03;
      const z0 = this.face.Z(x0, y0) + H * .01;
      const pts = [V(x0, y0, z0)]; let p = pts[0].clone();
      for (let k = 1; k <= 4; k++) { p = p.clone().add(V(s * H * .045, -H * .025 * k * .6, -H * .01 * k)); pts.push(p); }
      geos.push(lockGeometry(pts, H * .028, { tip: .2, segs: 6, radial: 4, phase: R() }));
    }
    const m = mesh(mergeGeometries(geos), windify(new THREE.MeshPhysicalMaterial({ color: P.hairC, roughness: .5, sheen: 1, sheenColor: new THREE.Color('#ffffff') }), 'hair', { amp: .15 }), head);
  }
  _glasses(head, H, type) {
    const f = this.face, er = f.er;
    const gm = type === 'kerek' ? GOLD() : new THREE.MeshPhysicalMaterial({ color: '#2b2b2b', roughness: .25, clearcoat: 1 });
    const lens = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, transmission: 1, thickness: .002, transparent: true, opacity: .3, depthWrite: false, clearcoat: 1 });
    [-1, 1].forEach(s => {
      const z = f.Z(s * f.ex, f.ey) + er * .85;
      const rim = mesh(new THREE.TorusGeometry(er * 1.55, er * (type === 'kerek' ? .09 : .13), 10, type === 'kerek' ? 48 : 4), gm, head, V(s * f.ex, f.ey, z), [0, 0, type === 'kerek' ? 0 : Math.PI / 4]);
      if (type !== 'kerek') rim.scale.set(1.2, .82, 1);
      mesh(new THREE.CircleGeometry(er * 1.5, 32), lens, head, V(s * f.ex, f.ey, z - .001), null, null, false);
      tube([V(s * (f.ex + er * 1.55), f.ey + er * .2, z), V(s * H * .93, f.ey + er * .35, H * .25), V(s * H * .97, f.ey + er * .1, -H * .15)], er * .07, gm, head);
    });
    tube([V(-f.ex + er * 1.5, f.ey + er * .2, f.Z(0, f.ey) + er * .75), V(0, f.ey + er * .5, f.Z(0, f.ey) + er * 1.0), V(f.ex - er * 1.5, f.ey + er * .2, f.Z(0, f.ey) + er * .75)], er * .08, gm, head);
    if (type === 'kerek') tube([V(-H * .93, f.ey, -H * .05), V(-H * 1.05, -H * .6, -H * .1), V(-H * .7, -H * 1.3, .02), V(0, -H * 1.55, H * .5), V(H * .7, -H * 1.3, .02), V(H * 1.05, -H * .6, -H * .1), V(H * .93, f.ey, -H * .05)], .0018, GOLD(), head, false, 60, 5); // szemüveglánc
  }

  /* ---- Justitia: redős khitón, átvetett himation, aranyöv, szembekötő, babérkoszorú ---- */
  _goddessDress(T, w, hw, Lg, skin) {
    const marble = clothMat('#F4EEE2', { sheen: .9, rough: .7 }), trim = GOLD();
    // vállak és kar bőr
    ball(w * .5, skin, this.chest, V(0, T * .42, 0), [1.8, .7, 1.1]);
    // mellrész + szoknya egy darabban, mély redőkkel
    clothLathe([[0, T * 1.0], [w * .55, T * .98], [w * .92, T * .78], [w * .82, T * .55], [hw * 1.05, T * .2], [hw * 1.2, 0], [hw * 1.5, -Lg * .35], [hw * 1.95, -Lg * .9], [hw * 2.15, -Lg * 1.06], [hw * 2.1, -Lg * 1.08], [0, -Lg * 1.08]], marble, this.spine, { folds: { n: 15, amp: y => .02 + Math.pow(1 - y, 1.5) * .12 }, sway: [T * .15, -Lg * 1.08], amp: 1.3, depth: .84 });
    // aranyszegély az alján
    mesh(new THREE.TorusGeometry(hw * 2.12, .009, 8, 96), trim, this.spine, V(0, -Lg * 1.03, 0), [Math.PI / 2, 0, 0]).scale.set(1, .84, 1);
    // öv a mell alatt, keresztpánt
    mesh(new THREE.TorusGeometry(w * .86, .013, 10, 64), trim, this.spine, V(0, T * .6, 0), [Math.PI / 2, 0, 0]).scale.set(1, .8, 1);
    tube([V(-w * .8, T * .98, .02), V(-w * .2, T * .78, w * .75), V(w * .45, T * .62, w * .68), V(w * .8, T * .58, .0)], .009, trim, this.spine);
    // himation: átvetett palást a bal vállról a jobb csípőn át lelógva (szélben lobog)
    const R = rng(5), geos = [];
    for (let i = 0; i < 26; i++) {
      const o = (i / 25 - .5) * .09;
      const pts = [V(w * .95, T * 1.0 + o * .3, -.04), V(w * .5, T * .75 + o, w * .74), V(-w * .2, T * .3 + o, hw * 1.2), V(-hw * 1.15, -T * .05 + o, hw * .7), V(-hw * 1.35, -Lg * .3 + o, .02), V(-hw * 1.2 + R() * .02, -Lg * .62 + o * 2, -hw * .4)];
      geos.push(lockGeometry(pts, .028, { tip: .6, flat: .25, segs: 22, radial: 5, phase: .3 + R() * .2 }));
    }
    const him = new THREE.MeshPhysicalMaterial({ color: '#8E2A2A', roughness: .75, sheen: 1, sheenColor: new THREE.Color('#ffb0a0'), side: THREE.DoubleSide });
    const hm = mesh(mergeGeometries(geos), windify(him, 'hair', { amp: .35 }), this.spine); hm.customDepthMaterial = windDepth('hair', .35);
    tube([V(w * .95, T * 1.0, -.02), V(w * .5, T * .77, w * .78), V(-w * .2, T * .32, hw * 1.25), V(-hw * 1.18, -T * .05, hw * .72)], .007, trim, this.spine);
    // fibula a vállon
    const fib = mesh(new THREE.CylinderGeometry(.022, .022, .01, 24), trim, this.chest, V(w * .85, T * .47, .03), [Math.PI / 2, 0, 0]);
    ball(.01, new THREE.MeshPhysicalMaterial({ color: '#2B4C7E', roughness: .05, clearcoat: 1 }), this.chest, V(w * .85, T * .47, .04));
  }
  _goddessHead(head, H) {
    const f = this.face;
    // a tulajdonos döntése: kendő nélkül – szabad, nyugodt, lesütött tekintet (korhű ábrázolás)
    const band = GOLD();
    const bandG = mesh(new THREE.TorusGeometry(H * 1.06, H * .018, 8, 64), band, head, V(0, f.ey + H * .45, -H * .02), [Math.PI / 2 - .25, 0, 0]); bandG.scale.set(this.P.sc[0], this.P.sc[2] * 1.02, 1);
    // aranyozott babérkoszorú
    const leaf = new THREE.SphereGeometry(1, 10, 6); const lm = GOLD(); lm.color.set('#d6b05e');
    const wreath = new THREE.InstancedMesh(leaf, lm, 64); wreath.castShadow = true;
    const dummy = new THREE.Object3D(); let n = 0;
    for (let i = 0; i < 32; i++) {
      const a = Math.PI * .08 + i / 31 * Math.PI * 1.84, r = H * 1.1;
      for (const side of [-1, 1]) {
        dummy.position.set(Math.sin(a) * r * this.P.sc[0], f.ey + H * .48 + Math.cos(a) * H * .12 - Math.abs(Math.cos(a)) * H * .02, Math.cos(a) * r * this.P.sc[2]);
        dummy.rotation.set(0, a, side * .7 + (i % 2) * .2); dummy.rotateX(-.25);
        dummy.scale.set(H * .035, H * .1, H * .016); dummy.updateMatrix(); wreath.setMatrixAt(n++, dummy.matrix);
      }
    }
    wreath.position.set(0, -H * .02, 0); wreath.rotation.x = -.18; head.add(wreath);
    const ring = mesh(new THREE.TorusGeometry(H * 1.1, H * .012, 6, 64, Math.PI * 1.84), lm, head, V(0, f.ey + H * .46, 0), [Math.PI / 2 - .18, 0, Math.PI * .58]);
    ring.scale.set(this.P.sc[0], this.P.sc[2], 1);
  }

  /* ---------------- § emberke ---------------- */
  _buildPara() {
    const P = this.P, v = P.variant, H = P.H;
    const G = P.height * .74;               // a § jel magassága
    const legL = P.height * .2;
    const enamel = v === 'oltalmazo'
      ? new THREE.MeshPhysicalMaterial({ color: P.glyph, roughness: .38, clearcoat: .5, clearcoatRoughness: .35, metalness: .15 })
      : new THREE.MeshPhysicalMaterial({ color: P.glyph, roughness: .24, metalness: .92, clearcoat: .6 });
    this.skin = enamel;
    this._skeleton(legL + .04, G * .5);
    const glyphG = new THREE.Group(); glyphG.position.y = G * .5; this.spine.add(glyphG); this.glyph = glyphG;
    // a § középvonala két összefonódó S-ből
    const S1 = [[.17, .4], [.07, .495], [-.09, .49], [-.19, .39], [-.16, .27], [-.02, .19], [.16, .09], [.205, -.03], [.12, -.12], [-.04, -.15]];
    const S2 = [[.04, .15], [-.12, .12], [-.205, .03], [-.16, -.09], [.02, -.19], [.16, -.27], [.19, -.39], [.09, -.49], [-.07, -.495], [-.17, -.4]];
    const thick = .05 * G;
    const sx = 1;
    [S1, S2].forEach(S => {
      const pts = S.map(p => V(p[0] * G * sx, p[1] * G, 0));
      // antikva-vonás: a középső ív vastag, a végek hajszálvékonyak, a végeken csepp
      const g = varTube(pts, t => thick * (.32 + .68 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (t - .08) / .84))), 1.3)));
      mesh(g, enamel, glyphG);
      ball(thick * .95, enamel, glyphG, pts[0], [1, 1, .72]); ball(thick * .35, enamel, glyphG, pts[pts.length - 1]);
    });
    // arc a felső íven (kabala-arc)
    const faceG = new THREE.Group(); faceG.position.set(-G * .01, G * .33, thick * .9); glyphG.add(faceG); this.head = faceG; this.headG = faceG;
    const er = H * (v === 'oltalmazo' ? .3 : .26);
    this.face = new Face(faceG, H, [1, 1, 1], { skin: enamel, skinColor: v === 'oltalmazo' ? '#2B4C7E' : '#C9A050', lip: P.lip, brow: P.brow, iris: P.iris, lashes: v === 'oltalmazo', mascot: true, flatZ: H * .12, eyeR: er, browW: .28 });
    // a kabala-arc elemeit a jel elé hozzuk
    this.face.g.position.set(0, -H * .05, 0);
    // fehér „arcmező” a szemek mögé, hogy a szemek ne lebegjenek
    const plate = mesh(new THREE.SphereGeometry(1, 32, 16), enamel, faceG, V(0, H * .02, -H * .02), null, [H * .78, H * .58, H * .2]);
    // haj-kunkor
    this.hair = buildHair('fursi', H * .9, v === 'bolcs' ? '#ECE8E0' : v === 'oltalmazo' ? '#E8B84A' : '#3b2c22', { seed: 3 });
    this.hair.position.set(G * .02, G * .33, 0); this.hair.scale.setScalar(.8); glyphG.add(this.hair);
    // karok a jel közepéből
    const arm = .26 * P.height, r = .022 * P.height;
    const armMat = v === 'oltalmazo' ? enamel : (v === 'biro' ? clothMat('#141a19') : clothMat('#1c2a28'));
    this.arms = [-1, 1].map(s => this._arm(s, V(s * G * .22 * sx, G * .02, 0), arm * .5, arm * .44, r, armMat, new THREE.MeshPhysicalMaterial({ color: '#f1d2b8', roughness: .5, sheen: .3 }), { parent: glyphG, sleeve: 'hosszu', cuff: v === 'bolcs' || v === 'biro' ? clothMat('#F6F2E8') : null }));
    // lábak
    const legMat = v === 'oltalmazo' ? enamel : clothMat('#1d2423');
    this._legs(G * .16, legL * 1.05, .028 * P.height, legMat, { shoes: v === 'oltalmazo' ? '#C2554A' : '#1a1410', sole: v === 'oltalmazo' ? '#F5F2EA' : '#0c0a08' }, { laces: v === 'oltalmazo' });
    // változatok
    if (v === 'bolcs') {
      // kis talár (köpeny) hátul + fehér zsabó
      const cape = clothMat('#1c2a28', { side: THREE.DoubleSide });
      const cg = new THREE.CylinderGeometry(G * .22, G * .34, G * .58, 40, 6, true, Math.PI * .55, Math.PI * .9);
      const cp = cg.attributes.position, sw = new Float32Array(cp.count);
      for (let i = 0; i < cp.count; i++) { const y = cp.getY(i), a = Math.atan2(cp.getX(i), cp.getZ(i)); const k = 1 + Math.sin(a * 9) * .05 * (.5 - y / (G * .58)); cp.setX(i, cp.getX(i) * k); cp.setZ(i, cp.getZ(i) * k); sw[i] = clamp((G * .29 - y) / (G * .58), 0, 1); }
      cg.computeVertexNormals(); cg.setAttribute('aSway', new THREE.BufferAttribute(sw, 1));
      const cm = mesh(cg, windify(cape.clone(), 'cloth', { amp: 1.5 }), glyphG, V(0, -G * .06, -thick * .2)); cm.customDepthMaterial = windDepth('cloth', 1.5);
      mesh(new THREE.TorusGeometry(G * .23, G * .018, 8, 40, Math.PI * 1.1), clothMat('#123D38'), glyphG, V(0, G * .23, -thick * .1), [Math.PI / 2 - .2, 0, Math.PI * -.05]);
      this._jabot(glyphG, V(0, G * .16, thick * 1.4), G * .9);
      this._pincenez();
      this._book();
    }
    if (v === 'oltalmazo') {
      // arany szegély-gyöngyök és piros szív a kezében
      [S1[2], S1[4], S2[5], S2[7]].forEach(p => ball(thick * .32, GOLD(), glyphG, V(p[0] * G * sx, p[1] * G, thick * .95)));
      this._handOnHeart = true;
    }
    if (v === 'biro') {
      // hosszú bírói talár zöld bársony gallérral, fehér zsabó, arany lánc
      const robe = clothMat('#121716', { sheen: .5 });
      const rob = clothLathe([[G * .2, G * .14], [G * .29, -G * .05], [G * .36, -G * .4], [G * .43, -G * .62], [G * .42, -G * .64]], new THREE.MeshPhysicalMaterial({ color: '#121716', roughness: .85, sheen: .5, side: THREE.DoubleSide }), glyphG, { folds: { n: 12, amp: y => (1 - y) * .08 }, sway: [G * .1, -G * .64], amp: 1.1, depth: .8, phi0: Math.PI * .28, phiLen: Math.PI * 1.44 });   // elöl nyitott talár: a § látszik
      mesh(new THREE.TorusGeometry(G * .19, G * .035, 10, 48), clothMat('#123D38', { sheen: 1 }), glyphG, V(0, G * .12, 0), [Math.PI / 2 - .1, 0, 0]).scale.set(1, .8, 1);
      this._jabot(glyphG, V(0, G * .07, G * .17), G * 1.1);
      tube([V(-G * .16, G * .12, G * .08), V(-G * .06, -G * .05, G * .2), V(G * .06, -G * .05, G * .2), V(G * .16, G * .12, G * .08)], .004, GOLD(), glyphG);
      ball(.016, GOLD(), glyphG, V(0, -G * .07, G * .21));
      this.legs.forEach(L => L.hip.visible = true);
      this._gavel();
    }
  }
  _jabot(parent, pos, s) {
    const wm = clothMat('#FBF8F1');
    [-1, 1].forEach(k => mesh(new THREE.BoxGeometry(.028 * s, .07 * s, .006 * s), wm, parent, pos.clone().add(V(k * .016 * s, -.03 * s, 0)), [0, 0, k * .08]));
    ball(.016 * s, wm, parent, pos, [1.4, .8, .6]);
  }
  _pincenez() {
    const f = this.face, er = f.er, gm = GOLD();
    const lens = new THREE.MeshPhysicalMaterial({ color: '#fff', transmission: 1, transparent: true, opacity: .25, roughness: 0, depthWrite: false });
    [-1, 1].forEach(s => { const z = f.Z(s * f.ex, f.ey) + er * .95; mesh(new THREE.TorusGeometry(er * 1.2, er * .07, 8, 40), gm, f.g, V(s * f.ex, f.ey - er * .3, z)); mesh(new THREE.CircleGeometry(er * 1.15, 28), lens, f.g, V(s * f.ex, f.ey - er * .3, z - .001), null, null, false); });
    tube([V(-f.ex + er * 1.15, f.ey - er * .1, f.Z(0, 0) + er * .95), V(0, f.ey + er * .2, f.Z(0, 0) + er * 1.05), V(f.ex - er * 1.15, f.ey - er * .1, f.Z(0, 0) + er * .95)], er * .06, gm, f.g);
    tube([V(f.ex + er * 1.2, f.ey - er * .3, f.Z(0, 0) + er * .9), V(f.ex + er * 2.2, f.ey - er * 2.8, f.Z(0, 0) + er * .2), V(f.ex + er * 1.6, f.ey - er * 5, 0)], .0012, gm, f.g, false, 30, 4);
  }

  /* ---------------- kellékek ---------------- */
  _palm(arm) { const g = new THREE.Group(); g.position.set(-arm.s * this.P.hand * .1, -this.P.hand * .78, 0); arm.hand.group.add(g); return g; }
  _teddy() {
    const A = this.arms[0], g = this._palm(A); this.props.teddy = g; A.hand.set('fog'); this._holdL = 'fog';
    const fur = clothMat('#A8713F', { sheen: 1, rough: .95 }), lt = clothMat('#E4C39A'), dk = new THREE.MeshStandardMaterial({ color: '#1b1412', roughness: .3 });
    const t = new THREE.Group(); t.position.set(A.s * .02, -.06, .08); t.rotation.y = -A.s * .4; g.add(t);
    ball(.075, fur, t, V(0, 0, 0), [1, 1.12, .9]); ball(.04, lt, t, V(0, -.005, .055), [1, 1.2, .6]);
    ball(.062, fur, t, V(0, .115, 0));
    [-1, 1].forEach(s => { ball(.024, fur, t, V(s * .045, .165, 0)); ball(.013, lt, t, V(s * .045, .165, .012)); ball(.026, fur, t, V(s * .07, -.062, .02), [1, 1.2, 1]); ball(.028, fur, t, V(s * .045, .015, .055)); ball(.0075, dk, t, V(s * .022, .128, .055)); });
    ball(.026, lt, t, V(0, .1, .052), [1.1, .8, .8]); ball(.01, dk, t, V(0, .108, .074));
    tube([V(-.035, .06, .035), V(0, .045, .06), V(.035, .06, .035)], .008, clothMat('#2E7565'), t);
  }
  _cane() {
    const A = this.arms[0], g = this._palm(A); A.hand.set('fog'); this._holdL = 'fog';
    const c = new THREE.Group(); g.add(c); this.props.cane = c;
    const cm = new THREE.MeshPhysicalMaterial({ color: '#5E3D24', roughness: .35, clearcoat: .8 });
    mesh(new THREE.CylinderGeometry(.012, .012, .86, 14), cm, c, V(0, -.43, 0));
    tube([V(0, 0, 0), V(0, .05, 0), V(.04, .085, 0), V(.09, .07, 0), V(.1, .04, 0)], .016, cm, c);
    mesh(new THREE.CylinderGeometry(.015, .013, .03, 14), new THREE.MeshStandardMaterial({ color: '#1a1a1a' }), c, V(0, -.86, 0));
    mesh(new THREE.TorusGeometry(.0135, .004, 6, 16), GOLD(), c, V(0, -.02, 0), [Math.PI / 2, 0, 0]);
  }
  _scales() {
    const A = this.arms[1], g = this._palm(A); A.hand.set('fog'); this._holdR = 'fog';
    const gm = GOLD(); const s = new THREE.Group(); g.add(s); this.props.scales = s;
    mesh(new THREE.CylinderGeometry(.008, .008, .12, 12), gm, s, V(0, .03, 0));
    ball(.014, gm, s, V(0, .095, 0));
    const beam = new THREE.Group(); beam.position.y = .09; s.add(beam); this.props.beam = beam;
    mesh(new THREE.CylinderGeometry(.006, .006, .44, 12), gm, beam, null, [0, 0, Math.PI / 2]);
    [-1, 1].forEach(k => ball(.01, gm, beam, V(k * .22, 0, 0)));
    this.props.pans = [-1, 1].map(k => {
      const p = new THREE.Group(); p.position.x = k * .22; beam.add(p);
      [0, 2.09, 4.19].forEach(a => { const ch = mesh(new THREE.CylinderGeometry(.0018, .0018, .2, 5), gm, p, V(Math.cos(a) * .03, -.1, Math.sin(a) * .03), [Math.sin(a) * .15, 0, -Math.cos(a) * .15]); ch.castShadow = false; });
      const pan = mesh(new THREE.SphereGeometry(.075, 32, 10, 0, Math.PI * 2, Math.PI * .62, Math.PI * .38), gm, p, V(0, -.16, 0)); pan.material.side = THREE.DoubleSide;
      return p;
    });
  }
  _sword() {
    const A = this.arms[0], g = this._palm(A); A.hand.set('fog'); this._holdL = 'fog';
    const s = new THREE.Group(); g.add(s); this.props.sword = s; s.rotation.x = Math.PI;
    const steel = new THREE.MeshPhysicalMaterial({ color: '#e8ebee', metalness: 1, roughness: .12, clearcoat: 1 });
    const bl = new THREE.Shape(); bl.moveTo(-.022, 0); bl.lineTo(-.018, .62); bl.lineTo(0, .7); bl.lineTo(.018, .62); bl.lineTo(.022, 0); bl.lineTo(-.022, 0);
    const bg = new THREE.ExtrudeGeometry(bl, { depth: .004, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2 }); bg.translate(0, 0, -.002);
    mesh(bg, steel, s, V(0, .07, 0));
    mesh(new THREE.BoxGeometry(.14, .016, .022), GOLD(), s, V(0, .065, 0));
    [-1, 1].forEach(k => ball(.013, GOLD(), s, V(k * .072, .065, 0)));
    mesh(new THREE.CylinderGeometry(.012, .012, .1, 12), new THREE.MeshPhysicalMaterial({ color: '#4a2a18', roughness: .5 }), s, V(0, .01, 0));
    ball(.02, GOLD(), s, V(0, -.045, 0));
  }
  _gavel() {
    const A = this.arms[1], g = this._palm(A); A.hand.set('fog'); this._holdR = 'fog';
    const wood = new THREE.MeshPhysicalMaterial({ color: '#4A2A16', roughness: .3, clearcoat: 1 });
    const gv = new THREE.Group(); g.add(gv); this.props.gavel = gv;
    mesh(new THREE.CylinderGeometry(.008, .01, .2, 14), wood, gv, V(0, -.02, 0));
    const head = new THREE.Group(); head.position.y = -.12; gv.add(head);
    mesh(new THREE.CylinderGeometry(.03, .03, .1, 24), wood, head, null, [0, 0, Math.PI / 2]);
    [-1, 1].forEach(k => mesh(new THREE.TorusGeometry(.03, .004, 8, 24), GOLD(), head, V(k * .035, 0, 0), [0, Math.PI / 2, 0]));
  }
  _quill() {
    const A = this.arms[1], g = this._palm(A); this.props.quill = g;
    const q = new THREE.Group(); q.visible = false; g.add(q); this.props.quillG = q; q.rotation.set(.3, 0, A.s * .5);
    const vane = new THREE.Shape(); vane.moveTo(0, 0); vane.quadraticCurveTo(.03, .1, .008, .22); vane.quadraticCurveTo(-.01, .12, 0, 0);
    mesh(new THREE.ShapeGeometry(vane, 12), new THREE.MeshPhysicalMaterial({ color: '#F6F2E8', side: THREE.DoubleSide, roughness: .6, sheen: 1 }), q, V(0, .02, 0));
    mesh(new THREE.CylinderGeometry(.002, .003, .26, 6), new THREE.MeshStandardMaterial({ color: '#d8cfb8' }), q, V(.004, .1, 0));
    mesh(new THREE.ConeGeometry(.003, .02, 6), new THREE.MeshStandardMaterial({ color: '#2a2018' }), q, V(.0, -.035, 0), [Math.PI, 0, 0]);
  }
  _book() {
    const A = this.arms[0], g = this._palm(A); A.hand.set('tal'); this._holdL = 'tal';
    const b = new THREE.Group(); b.position.set(A.s * .01, -.02, .05); b.rotation.set(-1.0, 0, 0); g.add(b); this.props.book = b;
    const cover = new THREE.MeshPhysicalMaterial({ color: '#6B1230', roughness: .5, sheen: .8, sheenColor: new THREE.Color('#c9577a') });
    const page = new THREE.MeshStandardMaterial({ color: '#F3EAD3', roughness: .9 });
    const W = .11, Hh = .15;
    [-1, 1].forEach(k => { const half = new THREE.Group(); half.rotation.y = k * .35; b.add(half);
      mesh(new THREE.BoxGeometry(W, Hh, .006), cover, half, V(k * W / 2, 0, -.004));
      mesh(new THREE.BoxGeometry(W * .94, Hh * .94, .012), page, half, V(k * W * .48, 0, .006));
      mesh(new THREE.BoxGeometry(W * .3, .004, .002), GOLD(), half, V(k * W * .5, Hh * .38, -.008)); });
    const leaf = new THREE.Group(); b.add(leaf); this.props.leaf = leaf;
    mesh(new THREE.BoxGeometry(W * .92, Hh * .92, .0015), page, leaf, V(W * .46, 0, .014));
  }
  _heart() {
    const A = this.arms[1], g = this._palm(A); A.hand.set('fog'); this._holdR = 'fog';
    const s = new THREE.Shape(); s.moveTo(0, -.05); s.bezierCurveTo(-.1, .01, -.05, .075, 0, .032); s.bezierCurveTo(.05, .075, .1, .01, 0, -.05);
    const geo = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: true, bevelSize: .01, bevelThickness: .01, bevelSegments: 4, curveSegments: 20 }); geo.center();
    const h = mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#C8333E', roughness: .2, clearcoat: 1 }), g, V(0, -.03, .06)); this.props.heart = h;
  }

  /* azonos anyagú, mozdulatlan gyerekhálók összevonása csoportonként → kevesebb rajzolási hívás */
  _bake(group) {
    const kids = group.children.slice();
    kids.forEach(c => { if (c.isGroup || c.isObject3D && !c.isMesh) this._bake(c); });
    const buckets = new Map();
    kids.forEach(m => {
      if (!m.isMesh || m.isInstancedMesh || m.userData.keep || m.children.length || !m.geometry.attributes.normal) return;
      if (m.material.transparent) return;
      const key = m.material.uuid + '|' + Object.keys(m.geometry.attributes).sort().join(',') + '|' + !!m.geometry.index + '|' + m.castShadow + '|' + (m.customDepthMaterial ? m.customDepthMaterial.uuid : '');
      if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(m);
    });
    buckets.forEach(list => {
      if (list.length < 2) return;
      const geos = list.map(m => { m.updateMatrix(); const g = m.geometry.clone().applyMatrix4(m.matrix); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'aSway', 'aT', 'aPhase', 'aLen'].includes(k)) g.deleteAttribute(k); return g; });
      let merged; try { merged = mergeGeometries(geos); } catch (e) { merged = null; }
      if (!merged) return;
      const nm = new THREE.Mesh(merged, list[0].material); nm.castShadow = list[0].castShadow; nm.receiveShadow = true; nm.customDepthMaterial = list[0].customDepthMaterial;
      list.forEach(m => group.remove(m)); group.add(nm);
    });
  }
  _finish() {
    this.root.traverse(o => { if (o.isMesh && (o.material.map || o.material === this.face?.M.lip)) o.userData.keep = 1; });
    this._bake(this.root);
    const shTex = Character.shadowTexture();
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: .5 }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = .003; this.blob.scale.setScalar(this.P.height * .55); this.root.add(this.blob);
    this.root.traverse(o => { if (o.isMesh && o.material && o.material.transparent && o !== this.blob) o.castShadow = false; });
    this.hips = this.legs;
  }
  static shadowTexture() {
    if (Character._sh) return Character._sh;
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(30,24,12,.5)'); g.addColorStop(1, 'rgba(30,24,12,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return (Character._sh = new THREE.CanvasTexture(c));
  }

  /* ---------------- nyilvános API ---------------- */
  setExpr(name, instant) { this.exprName = name; this.face.set(name, instant); return this; }
  say(sec) { this.face.talk(sec); return this; }
  act(name) {
    const dignified = this.P.kind === 'para' || this.P.goddess;
    if (dignified && (name === 'integet' || name === 'ugral' || name === 'tapsol' || name === 'nevet' || name === 'sir')) name = name === 'integet' ? 'meghajol' : 'bolint';
    if (name && name === this.action && name === 'olel') name = null;
    this.action = name; this.actT = 0;
    this.actDur = { integet: 2.8, bolint: 1.6, ugral: 2.2, tapsol: 2.4, mutat: 2.8, rax: 2.8, olel: 1e9, nevet: 2.4, sir: 3.2, setal: 3, fordul: 2.2, kezetfog: 2.8, ir: 3.6, meghajol: 2.4, merlegel: 4, kalapacs: 2.6 }[name] || 0;
    if (name === 'nevet') { this._prevExpr = this.exprName; this.face.set('nevet'); }
    if (name === 'sir') { this._prevExpr = this.exprName; this.face.set('szomoru'); }
    if (name === 'setal' && !this.walkTo) this._walkDemo = true;
    if (this.props.quillG) this.props.quillG.visible = name === 'ir';
    return this;
  }
  lookAt(v) { this.lookTgt.copy(v); return this; }
  moveTo(x, z = this.root.position.z, speed = .75) { this.walkTo = V(x, 0, z); this.walkSpeed = speed; this._walkDemo = false; return this; }

  /* ---------------- képkocka ---------------- */
  update(dt, time) {
    this.t += dt; const t = this.t, P = this.P, para = P.kind === 'para';
    let a = this.action, at = 0;
    if (a) { this.actT += dt; at = this.actT / this.actDur; if (at >= 1) { if (a === 'nevet' || a === 'sir') this.face.set(this._prevExpr || 'vidam'); if (this.props.quillG) this.props.quillG.visible = false; this.action = a = null; at = 0; } }
    const k = a ? Math.min(1, Math.min(at, 1 - at) * 7) : 0;   // be/ki úsztatás
    // ---- séta ----
    let walkAmt = 0;
    if (this._walkDemo) { walkAmt = a === 'setal' ? 1 : 0; this.facingTgt = Math.sin(this.actT * 1.1) * .6; if (!a) { this._walkDemo = false; this.facingTgt = 0; } }
    else if (this.walkTo) { const d = this.walkTo.clone().sub(this.root.position); d.y = 0; const dist = d.length(); if (dist > .02) { this.root.position.addScaledVector(d.normalize(), Math.min(dist, this.walkSpeed * dt)); this.facingTgt = Math.atan2(d.x, d.z); walkAmt = 1; } else { this.walkTo = null; this.facingTgt = 0; } }
    this.walking = damp(this.walking, walkAmt, 6, dt);
    this.facing = damp(this.facing, this.facingTgt + (a === 'fordul' ? ease(at) * Math.PI * 2 : 0), a === 'fordul' ? 30 : 5, dt);
    this.mover.rotation.y = this.facing;
    const W = this.walking, wph = t * 7;
    // ---- törzs ----
    const breathe = Math.sin(t * 1.65) * .5 + .5;
    let jumpY = 0, sq = 1;
    if (a === 'ugral') { const ph = (this.actT % .72) / .72, air = bell(ph, .2, .9); jumpY = air * .2 * P.height * .55; sq = ph < .2 ? 1 - bell(ph, 0, .2) * .12 : ph > .9 ? 1 - bell(ph, .9, 1) * .1 : 1 + air * .05; }
    if (a === 'nevet') jumpY = Math.abs(Math.sin(this.actT * 13)) * .01;
    this.mover.position.y = jumpY + Math.abs(Math.sin(wph)) * .018 * W;
    this.squash.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.spine.scale.set(1 + breathe * .01, 1 + breathe * .018, 1 + breathe * .016);
    let bow = 0; if (a === 'meghajol') bow = bell(at, .1, .9) * .55;
    this.spine.rotation.x = (P.age ? .05 : 0) + W * .06 + bow + (a === 'sir' ? .1 : 0) + (a === 'kalapacs' ? bell(at, .45, .75) * .12 : 0);
    this.spine.rotation.z = Math.sin(t * .75) * .02 + Math.sin(wph) * .035 * W + (a === 'merlegel' ? Math.sin(this.actT * 1.6) * .05 : 0);
    this.spine.rotation.y = Math.sin(wph) * .08 * W;
    if (para) this.glyph.rotation.z = Math.sin(t * 1.2) * .03 + (a === 'ugral' ? Math.sin(this.actT * 9) * .06 : 0);
    // ---- lábak ----
    this.legs.forEach(L => {
      const ph = wph + (L.s > 0 ? Math.PI : 0);
      const jb = a === 'ugral' ? bell((this.actT % .72) / .72, 0, .25) * .6 + bell((this.actT % .72) / .72, .85, 1) * .5 : 0;
      L.hip.rotation.x = -Math.sin(ph) * .5 * W - jb * .55 - bow * .2;
      L.knee.rotation.x = Math.max(0, Math.sin(ph + 1.25)) * .85 * W + jb + bow * .25;
      L.foot.rotation.x = -L.knee.rotation.x * .35 + Math.max(0, -Math.sin(ph)) * .2 * W;
    });
    // ---- fej és tekintet ----
    this.headG.updateWorldMatrix(true, false);
    const hp = new THREE.Vector3(); this.headG.getWorldPosition(hp);
    const dir = this.lookTgt.clone().sub(hp);
    const yaw = clamp(Math.atan2(dir.x, dir.z) - this.facing, -.75, .75), pitch = clamp(-Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -.45, .45);
    this.look.x = damp(this.look.x, yaw, 4.5, dt); this.look.y = damp(this.look.y, pitch, 4.5, dt);
    const C = this.face.cur;
    let nod = 0; if (a === 'bolint') nod = Math.sin(this.actT * 11) * .18 * k;
    const sob = a === 'sir' ? Math.sin(this.actT * 15) * .025 + .22 : 0;
    const headK = para ? .35 : .6;
    if (!para) this.headG.rotation.set(this.look.y * headK + nod + sob + Math.sin(t * 1.65) * .015 + bow * .3, this.look.x * headK, (C.tilt ?? 0) + Math.sin(t * .55) * .025);
    else this.headG.rotation.set(this.look.y * .2 + nod * .5, this.look.x * .35, (C.tilt ?? 0) * .6);
    this.face.update(dt, t, { x: this.look.x * (para ? .9 : .55), y: this.look.y * .5 });
    // copfok rugózása
    if (this.hair?.userData.pigtails) this.hair.userData.pigtails.forEach(p => { p.g.rotation.z = p.s * (.12 + jumpY * 3 + Math.sin(t * 4.2 + p.s) * .04) + Math.sin(wph) * .1 * W; p.g.rotation.x = Math.sin(t * 2.7 + p.s) * .05 - jumpY * 2; });
    // ---- karok és kezek ----
    const [L, R] = this.arms;             // L: s = −1 (a szereplő jobb keze), R: s = +1
    const idle = Math.sin(t * 1.65) * .035;
    const lr = { z: -.1 - idle, x: 0, ey: 0, e: -.18, wy: 0, wz: 0, wx: 0, pose: this._holdL || 'laza' };
    const rr = { z: .1 + idle, x: 0, ey: 0, e: -.18, wy: 0, wz: 0, wx: 0, pose: this._holdR || 'laza' };
    lr.x = Math.sin(wph) * .45 * W; rr.x = -Math.sin(wph) * .45 * W;
    if (para) { lr.z = -.5 - idle; rr.z = .5 + idle; }
    if (this.props.teddy) { lr.x = -.75; lr.e = -1.25; lr.z = -.05; lr.wx = .2; }
    if (this.props.cane) { lr.x = -.32; lr.e = -.32; lr.z = -.16; }
    if (this.props.scales) { rr.z = 1.05; rr.x = -.5; rr.e = -1.25; rr.wx = .1; rr.wz = -.2; }
    if (this.props.sword) { lr.z = -.28; lr.x = -.25; lr.e = -.25; }
    if (this.props.gavel) { rr.x = -.5; rr.e = -.9; rr.z = .25; }
    if (this.props.heart) { rr.x = -.7; rr.e = -.9; rr.z = .2; }
    if (this._handOnHeart && !a) { rr.x = -.55; rr.z = -.35; rr.e = -1.35; rr.wy = -.4; rr.pose = 'tal'; lr.x = -.55; lr.z = .35; lr.e = -1.35; lr.wy = .4; lr.pose = 'tal'; }   // összekulcsolt, oltalmazó kéztartás
    if (this.props.leaf) { const ph = (t % 9) / 9; this.props.leaf.rotation.y = -Math.PI * ease(clamp((ph - .55) / .35, 0, 1)) * .9; }
    const right = R; // a gesztusokat a +x oldali kar végzi (a nézőnek bal oldalon)
    const G = rr;
    if (a === 'integet') { G.z = lerp(G.z, 2.55, k); G.x = lerp(G.x, -.25, k); G.e = lerp(G.e, -.55, k); G.ey = Math.sin(this.actT * 10) * .5 * k; G.wy = lerp(0, -1.4 * G === rr ? 1 : 1, k) * -1.5; G.pose = 'nyitott'; }
    if (a === 'mutat') { G.z = lerp(G.z, 1.25, k); G.x = lerp(G.x, -1.0, k); G.e = lerp(G.e, -.05, k); G.wy = -1.2 * k; G.pose = k > .3 ? 'mutat' : G.pose; }
    if (a === 'rax' || a === 'olel') { const kk = a === 'olel' ? Math.min(1, this.actT * 2.5) : k; lr.z = lerp(lr.z, -1.2, kk); rr.z = lerp(rr.z, 1.2, kk); lr.x = rr.x = lerp(0, -.8, kk); lr.e = rr.e = lerp(-.18, -.55, kk); lr.wy = 1.2 * kk; rr.wy = -1.2 * kk; if (kk > .3) { if (!this._holdL) lr.pose = 'nyitott'; if (!this._holdR) rr.pose = 'nyitott'; } }
    if (a === 'tapsol') { const c = Math.abs(Math.sin(this.actT * 8.5)); lr.x = rr.x = lerp(0, -1.15, k); lr.z = lerp(lr.z, -.12 - c * .32, k); rr.z = lerp(rr.z, .12 + c * .32, k); lr.e = rr.e = lerp(-.18, -1.05, k); lr.wy = .9 * k; rr.wy = -.9 * k; if (!this._holdL) lr.pose = 'lapos'; if (!this._holdR) rr.pose = 'lapos'; }
    if (a === 'ugral') { const air = bell((this.actT % .72) / .72, .1, .95); lr.z = lerp(lr.z, -2.5, air * k); rr.z = lerp(rr.z, 2.5, air * k); if (!this._holdL) lr.pose = 'nyitott'; if (!this._holdR) rr.pose = 'nyitott'; }
    if (a === 'nevet') { lr.x = rr.x = -.35 * k; lr.e = rr.e = -1.5 * k; lr.z = -.35 * k - .1; rr.z = .35 * k + .1; }
    if (a === 'sir') { lr.x = rr.x = lerp(0, -1.45, k); lr.e = rr.e = lerp(-.18, -2.15, k); lr.z = lerp(lr.z, .3, k); rr.z = lerp(rr.z, -.3, k); if (!this._holdL) lr.pose = 'lapos'; if (!this._holdR) rr.pose = 'lapos'; }
    if (a === 'kezetfog') { G.x = lerp(G.x, -1.05, k); G.z = lerp(G.z, .2, k); G.e = lerp(G.e, -.35, k) + Math.sin(this.actT * 9) * .12 * bell(at, .2, .85); G.wy = -1.5 * k; G.pose = 'fog'; }
    if (a === 'ir') { G.x = lerp(G.x, -.95, k); G.z = lerp(G.z, .25, k); G.e = lerp(G.e, -1.25, k); G.wx = .5 * k; G.wz = Math.sin(this.actT * 12) * .12 * k; G.ey = Math.sin(this.actT * 3) * .08 * k; G.pose = 'csippent'; lr.x = lerp(lr.x, -.8, k); lr.e = lerp(lr.e, -1.3, k); if (!this._holdL) lr.pose = 'tal'; }
    if (a === 'meghajol') { G.x = lerp(G.x, -.75, k); G.z = lerp(G.z, -.15, k); G.e = lerp(G.e, -1.7, k); G.pose = 'lapos'; lr.z = lerp(lr.z, -.25, k); }
    if (a === 'merlegel' && this.props.beam) { rr.z = 1.15 + Math.sin(this.actT * 1.4) * .05; }
    if (a === 'kalapacs') { const up = bell(at, .05, .55) * .55; rr.x = lerp(-.5, -1.1, up); rr.e = lerp(-.9, -1.2, up); }   // egyetlen, nyugodt koppintás
    [[L, lr], [R, rr]].forEach(([A, r]) => {
      A.sh.rotation.z = damp(A.sh.rotation.z, r.z, 10, dt); A.sh.rotation.x = damp(A.sh.rotation.x, r.x, 10, dt);
      A.elbow.rotation.x = damp(A.elbow.rotation.x, r.e, 10, dt); A.elbow.rotation.z = r.ey;
      A.wrist.rotation.y = damp(A.wrist.rotation.y, r.wy, 8, dt); A.wrist.rotation.z = damp(A.wrist.rotation.z, r.wz, 10, dt); A.wrist.rotation.x = damp(A.wrist.rotation.x, r.wx, 10, dt);
      A.hand.set(r.pose); A.hand.update(dt, t + A.s);
    });
    // ---- kellékek ----
    this.root.updateMatrixWorld(true);
    const keepUpright = (obj, extra) => { const q = new THREE.Quaternion(); obj.parent.getWorldQuaternion(q); const qr = new THREE.Quaternion(); this.mover.getWorldQuaternion(qr); obj.quaternion.copy(q.invert().multiply(qr)); if (extra) obj.quaternion.multiply(extra); };
    if (this.props.cane) keepUpright(this.props.cane);
    if (this.props.scales) {
      keepUpright(this.props.scales);
      const tilt = a === 'merlegel' ? Math.sin(this.actT * 1.7) * .3 * Math.exp(-this.actT * .35) : Math.sin(t * .9) * .04;
      this.props.beam.rotation.z = damp(this.props.beam.rotation.z, tilt, 6, dt);
      this.props.pans.forEach(p => { p.rotation.z = -this.props.beam.rotation.z + Math.sin(t * 1.3 + p.position.x * 20) * .03; p.rotation.x = Math.sin(t * 1.1 + p.position.x * 9) * .03; });
    }
    if (this.props.sword) keepUpright(this.props.sword, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, .08)));
    if (this.props.gavel) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)); this.props.gavel.quaternion.copy(q); }
    // ---- árnyék ----
    this.blob.scale.setScalar(P.height * .55 * (1 - jumpY * 1.5)); this.blob.material.opacity = .5 * (1 - jumpY * 2);
  }
}

return { ACTIONS, ALL, CAST, Character, EXPR_NAMES, ORDER, WIND, clothMat, skinMat };
})();
const FAM = { Character: FAMM.Character, CAST: FAMM.CAST, WIND: WINDM.WIND, lockGeometry: HAIRM.lockGeometry, windify: WINDM.windify, windDepth: WINDM.windDepth, mergeGeometries: BGU.mergeGeometries, rng: HAIRM.rng };
